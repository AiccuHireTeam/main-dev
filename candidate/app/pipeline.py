import hashlib
import json
import re
from uuid import uuid4

from sqlalchemy import select

from app.config import ROOT
from app.errors import ServiceError
from app.models import JobCounter, RepositoryAssociation, VectorChunk, now

QUESTION_TEXT = {
    "skill": "Which skills or tools have you used, and can you describe a task where you used them?",
    "personality_merge": "Can you describe a work, study, or project situation where you collaborated, communicated, or responded to feedback?",
    "outlier_skill": "Do you have any additional capabilities or experiences you would like to highlight beyond those already described?",
    "conjugate_skill": "Can you describe a task where you used two different skills together and explain how they helped each other?",
    "management_skill": "Have you planned work, coordinated tasks, or managed resources or people? If so, describe your responsibility and scope.",
}


def digest(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()


def extract_chunks(text, size=12000, overlap=300):
    start = 0
    while start < len(text):
        end = min(start + size, len(text))
        yield start, end, text[start:end]
        if end == len(text):
            break
        start = end - overlap


def make_questions(missing, extracted, resume_text):
    evidence = extracted.get("evidence", [])
    anchor = evidence[0]["quote"] if evidence else resume_text.strip().splitlines()[0]
    anchor = anchor[:180]
    return [
        {
            "id": str(uuid4()),
            "field": field,
            "question": f"Your resume mentions “{anchor}”. {QUESTION_TEXT[field]} You may answer “none” or “not applicable”.",
            "context_quote": anchor,
            "answer": None,
        }
        for field in missing[:5]
    ]


def extract_application(application, provider, config):
    facts, other, identity_details, seen = [], [], [], set()
    for start, end, chunk in extract_chunks(application.resume_text):
        result = provider.extract(chunk, application.rubric)
        for key, destination in [
            ("evidence", facts),
            ("other_details", other),
            ("identity_details", identity_details),
        ]:
            for item in result.get(key, []):
                if item["quote"] not in chunk:
                    raise ServiceError("invalid_extraction_output", 503)
                identity = digest(item)
                if identity not in seen:
                    seen.add(identity)
                    destination.append(
                        {**item, "source": {"type": "resume", "start": start, "end": end}}
                    )
    application.extracted = {
        "evidence": facts,
        "other_details": other,
        "identity_details": identity_details,
        "model": config.extraction_model,
        "prompt_hash": hashlib.sha256(
            (ROOT / "prompts/resume_extraction.md").read_bytes()
        ).hexdigest(),
    }
    present = {item["category"] for item in facts}
    missing = [c["id"] for c in application.rubric["categories"] if c["id"] not in present]
    application.missing_fields = missing
    application.questions = make_questions(missing, application.extracted, application.resume_text)
    application.status = "awaiting_answers" if missing else "ready_for_vectorization"
    application.error_code = None


def vector_source(application):
    # Preserve all professional evidence and final answers, including unresolved gaps.
    source = json.dumps(
        {
            "rubric": application.rubric,
            "resume_evidence": {
                key: value
                for key, value in application.extracted.items()
                if key != "identity_details"
            },
            "follow_up": [
                {"field": q["field"], "answer": q["answer"], "question_id": q["id"]}
                for q in application.questions
            ],
            "remaining_missing_fields": application.missing_fields,
        },
        sort_keys=True,
        ensure_ascii=False,
    )
    # Data minimization; free-text answers can still contain personal information.
    for value in [
        application.email,
        application.candidate["full_name"],
        application.candidate.get("phone"),
    ]:
        if value:
            source = source.replace(value, "[redacted]")
    source = re.sub(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "[email]", source)
    return source


def embedding_chunks(source, max_bytes=6000):
    # UTF-8 bytes are an upper bound on byte-level token counts. Split at character boundaries.
    result, current, length = [], [], 0
    for character in source:
        width = len(character.encode("utf-8"))
        if length + width > max_bytes:
            result.append("".join(current))
            current, length = [], 0
        current.append(character)
        length += width
    if current:
        result.append("".join(current))
    return result


def vectorize_application(session, application, provider, config):
    if application.counted:
        return
    if application.status not in ("vectorization_queued", "ready_for_vectorization"):
        raise ServiceError("application_not_ready", 409)
    source = vector_source(application)
    chunks = embedding_chunks(source)
    vectors = provider.embed(chunks)
    if len(vectors) != len(chunks):
        raise ServiceError("incomplete_embeddings", 503)
    for ordinal, (chunk, vector) in enumerate(zip(chunks, vectors)):
        session.add(
            VectorChunk(
                application=application.id,
                ordinal=ordinal,
                source=chunk,
                source_hash=digest(source),
                model=config.embedding_model,
                embedding=vector,
            )
        )
    # Counter rows are created during intake. Serialize applications for the same job.
    counter = session.scalar(
        select(JobCounter)
        .where(JobCounter.tenant == application.tenant, JobCounter.job_id == application.job_id)
        .with_for_update()
    )
    counter.processed_applications += 1
    identity = (application.tenant, application.resume_id, application.job_id)
    if session.get(RepositoryAssociation, identity) is None:
        session.add(
            RepositoryAssociation(tenant=identity[0], resume_id=identity[1], job_id=identity[2])
        )
    application.counted = True
    application.status = "completed"
    application.completed_at = now()
    application.error_code = None
