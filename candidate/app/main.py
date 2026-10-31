import hmac
import json
from contextlib import asynccontextmanager
from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import ROOT, settings
from app.db import db
from app.documents import parse_resume_isolated
from app.errors import ServiceError
from app.models import Application, JobCounter, Task, now
from app.pipeline import digest
from app.schemas import AnswerInput, ApplicationInput


@asynccontextmanager
async def lifespan(app):
    if not settings().api_keys:
        raise RuntimeError("Configure API_KEYS before starting the service")
    yield


app = FastAPI(title="Aiccuhire Resume Intake", version="1.0.0", lifespan=lifespan)
DB = Annotated[Session, Depends(db)]


@app.middleware("http")
async def limit_request(request: Request, call_next):
    # Enforce while streaming, even when Content-Length is absent or dishonest.
    if request.method in {"POST", "PUT", "PATCH"}:
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > 14_100_000:
                return JSONResponse(
                    status_code=413, content={"error": {"code": "request_too_large"}}
                )
        request._body = bytes(body)
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


def tenant(authorization: Annotated[str | None, Header()] = None):
    supplied = authorization[7:] if authorization and authorization.startswith("Bearer ") else ""
    for key, owner in settings().api_keys.items():
        if hmac.compare_digest(supplied.encode(), key.encode()):
            return owner
    raise ServiceError("unauthorized", 401)


Tenant = Annotated[str, Depends(tenant)]


@app.exception_handler(ServiceError)
async def service_error(request, error):
    return JSONResponse(status_code=error.status, content={"error": {"code": error.code}})


@app.exception_handler(RequestValidationError)
async def validation_error(request, error):
    # Pydantic's raw input can contain a complete resume or sensitive answers; never echo it.
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "validation_error",
                "fields": [{"location": list(e["loc"]), "type": e["type"]} for e in error.errors()],
            }
        },
    )


@app.exception_handler(SQLAlchemyError)
async def database_error(request, error):
    return JSONResponse(status_code=503, content={"error": {"code": "database_unavailable"}})


@app.exception_handler(Exception)
async def unexpected_error(request, error):
    return JSONResponse(status_code=500, content={"error": {"code": "internal_error"}})


def insert_ignore(session, model, values):
    if session.bind.dialect.name == "postgresql":
        from sqlalchemy.dialects.postgresql import insert
    else:  # SQLite is supported only as a test double, not for deployment.
        from sqlalchemy.dialects.sqlite import insert
    session.execute(insert(model).values(**values).on_conflict_do_nothing())


def owned(session, owner, candidate_key, lock=False):
    statement = select(Application).where(
        Application.id == str(candidate_key), Application.tenant == owner
    )
    if lock:
        statement = statement.with_for_update()
    application = session.scalar(statement)
    if application is None:
        raise ServiceError("application_not_found", 404)
    return application


def result(application):
    return {
        "candidate_key": application.id,
        "application_id": application.application_id,
        "job_id": application.job_id,
        "status": application.status,
        "questions": application.questions,
        "missing_fields": application.missing_fields,
        "rubric_version": application.rubric["version"],
        "error_code": application.error_code,
        "counted": application.counted,
        "status_url": f"/v1/applications/{application.id}",
    }


@app.get("/health/live")
def live():
    return {"status": "ok"}


@app.get("/health/ready")
def ready(session: DB):
    session.execute(select(Task.id).limit(1))
    return {"status": "ok"}


@app.post("/v1/applications", status_code=202)
def intake(
    payload: ApplicationInput,
    session: DB,
    owner: Tenant,
    idempotency_key: Annotated[str, Header(min_length=8, max_length=128)],
):
    request_hash = digest(payload.model_dump(mode="json"))
    existing = session.scalar(
        select(Application).where(
            Application.tenant == owner,
            or_(
                Application.application_id == payload.application_id,
                Application.idempotency_key == idempotency_key,
            ),
        )
    )
    if existing:
        if existing.request_hash != request_hash or existing.idempotency_key != idempotency_key:
            raise ServiceError("idempotency_conflict", 409)
        return result(existing)
    resume_text = parse_resume_isolated(payload.resume, settings())
    candidate = payload.model_dump(mode="json", exclude={"resume"})
    rubric = json.loads((ROOT / "rubrics/default.json").read_text())
    # ON CONFLICT handles simultaneous intake requests; re-read the persisted winner.
    insert_ignore(
        session,
        Application,
        {
            "tenant": owner,
            "application_id": payload.application_id,
            "job_id": payload.job_id,
            "resume_id": payload.resume_id,
            "idempotency_key": idempotency_key,
            "request_hash": request_hash,
            "email": str(payload.email).casefold(),
            "candidate": candidate,
            "resume_text": resume_text,
            "rubric": rubric,
        },
    )
    application = session.scalar(
        select(Application).where(
            Application.tenant == owner,
            or_(
                Application.application_id == payload.application_id,
                Application.idempotency_key == idempotency_key,
            ),
        )
    )
    if application.request_hash != request_hash or application.idempotency_key != idempotency_key:
        session.rollback()
        raise ServiceError("idempotency_conflict", 409)
    insert_ignore(
        session,
        JobCounter,
        {"tenant": owner, "job_id": payload.job_id, "processed_applications": 0},
    )
    insert_ignore(session, Task, {"application": application.id, "operation": "extract"})
    session.commit()
    return result(application)


@app.get("/v1/applications/{candidate_key}")
def status(candidate_key: UUID, session: DB, owner: Tenant):
    application = owned(session, owner, candidate_key)
    return {
        **result(application),
        "candidate": application.candidate,
        "extracted": application.extracted,
        "follow_up": application.response,
    }


@app.post("/v1/applications/{candidate_key}/answers")
def answer(candidate_key: UUID, payload: AnswerInput, session: DB, owner: Tenant):
    application = owned(session, owner, candidate_key, lock=True)
    if not hmac.compare_digest(str(payload.email).casefold().encode(), application.email.encode()):
        raise ServiceError("application_not_found", 404)
    normalized = payload.model_dump(mode="json")
    normalized["email"] = application.email
    normalized["answers"] = sorted(normalized["answers"], key=lambda a: a["question_id"])
    response_hash = digest(normalized)
    if application.response_hash:
        if application.response_hash != response_hash:
            raise ServiceError("answers_already_submitted", 409)
        return {
            "message": "Thank you. Your answers have been saved.",
            "candidate_key": application.id,
        }
    if application.status != "awaiting_answers":
        raise ServiceError("application_not_awaiting_answers", 409)
    questions = {q["id"]: dict(q) for q in application.questions}
    for item in payload.answers:
        if str(item.question_id) not in questions:
            raise ServiceError("unknown_question_id", 422)
        questions[str(item.question_id)]["answer"] = item.answer
    application.questions = list(questions.values())
    application.missing_fields = [q["field"] for q in questions.values() if q["answer"] is None]
    application.response = {
        **normalized,
        "submitted_at": now().isoformat(),
        "source": "candidate_reported_unverified",
    }
    application.response_hash = response_hash
    application.status = "ready_for_vectorization"
    session.commit()
    return {"message": "Thank you. Your answers have been saved.", "candidate_key": application.id}


@app.post("/v1/applications/{candidate_key}/vectors", status_code=202)
def vectors(candidate_key: UUID, session: DB, owner: Tenant):
    application = owned(session, owner, candidate_key, lock=True)
    if application.status in {"completed", "vectorization_queued"}:
        return result(application)
    if application.status != "ready_for_vectorization":
        raise ServiceError("application_not_ready", 409)
    insert_ignore(session, Task, {"application": application.id, "operation": "vectorize"})
    application.status = "vectorization_queued"
    session.commit()
    return result(application)


@app.post("/v1/applications/{candidate_key}/retry", status_code=202)
def retry(candidate_key: UUID, session: DB, owner: Tenant):
    # Lock task before application, matching the worker's lock ordering.
    task = session.scalar(
        select(Task)
        .join(Application, Task.application == Application.id)
        .where(
            Application.tenant == owner,
            Application.id == str(candidate_key),
            Task.status == "failed",
        )
        .with_for_update(of=Task)
    )
    if task is None:
        raise ServiceError("no_failed_operation", 409)
    application = owned(session, owner, candidate_key, lock=True)
    task.status, task.attempts, task.available_at, task.error_code = "pending", 0, now(), None
    application.error_code = None
    application.status = "received" if task.operation == "extract" else "vectorization_queued"
    session.commit()
    return result(application)


@app.get("/v1/jobs/{job_id}/counter")
def counter(job_id: str, session: DB, owner: Tenant):
    counter = session.get(JobCounter, (owner, job_id))
    if counter is None:
        raise ServiceError("job_not_found", 404)
    return {"job_id": job_id, "processed_applications": counter.processed_applications}
