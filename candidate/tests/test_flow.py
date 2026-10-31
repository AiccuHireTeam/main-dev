import os
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from conftest import OTHER_KEY, FakeProvider
from sqlalchemy import func, select

from app.models import Application, JobCounter, Task, VectorChunk
from app.worker import run_once


def submit(client, payload):
    response = client.post(
        "/v1/applications", json=payload, headers={"Idempotency-Key": "submit-001"}
    )
    assert response.status_code == 202, response.text
    return response.json()["candidate_key"]


def test_full_followup_and_exactly_once_count(setup, payload):
    client, factory, config = setup
    key = submit(client, payload)
    assert submit(client, payload) == key
    assert client.post(f"/v1/applications/{key}/vectors").status_code == 409
    assert run_once(factory, FakeProvider(), config)
    state = client.get(f"/v1/applications/{key}").json()
    assert state["status"] == "awaiting_answers"
    assert len(state["questions"]) == 4
    assert all("Built spreadsheet" in q["question"] for q in state["questions"])
    answers = {
        "email": payload["email"],
        "answers": [
            {"question_id": q["id"], "answer": "Not applicable"} for q in state["questions"]
        ],
    }
    response = client.post(f"/v1/applications/{key}/answers", json=answers)
    assert response.status_code == 200
    assert "Thank you" in response.json()["message"]
    assert client.post(f"/v1/applications/{key}/answers", json=answers).status_code == 200
    for _ in range(2):
        assert client.post(f"/v1/applications/{key}/vectors").status_code == 202
    assert run_once(factory, FakeProvider(), config)
    assert not run_once(factory, FakeProvider(), config)
    assert client.post(f"/v1/applications/{key}/vectors").status_code == 202
    state = client.get(f"/v1/applications/{key}").json()
    assert state["status"] == "completed" and state["counted"]
    assert state["missing_fields"] == []
    assert all(q["answer"] == "Not applicable" for q in state["questions"])
    assert client.get("/v1/jobs/job-1/counter").json()["processed_applications"] == 1
    with factory() as session:
        assert session.scalar(select(func.count()).select_from(VectorChunk)) > 0


def test_complete_resume_requires_no_answers(setup, payload):
    client, factory, config = setup
    key = submit(client, payload)
    run_once(factory, FakeProvider(complete=True), config)
    state = client.get(f"/v1/applications/{key}").json()
    assert state["questions"] == [] and state["status"] == "ready_for_vectorization"
    client.post(f"/v1/applications/{key}/vectors")
    run_once(factory, FakeProvider(), config)
    assert client.get("/v1/jobs/job-1/counter").json()["processed_applications"] == 1


def test_partial_response_is_final(setup, payload):
    client, factory, config = setup
    key = submit(client, payload)
    run_once(factory, FakeProvider(), config)
    questions = client.get(f"/v1/applications/{key}").json()["questions"]
    answer = {
        "email": payload["email"],
        "answers": [{"question_id": questions[0]["id"], "answer": "None"}],
    }
    assert client.post(f"/v1/applications/{key}/answers", json=answer).status_code == 200
    assert len(client.get(f"/v1/applications/{key}").json()["missing_fields"]) == 3
    answer["answers"][0]["answer"] = "Changed response"
    assert client.post(f"/v1/applications/{key}/answers", json=answer).status_code == 409
    client.post(f"/v1/applications/{key}/vectors")
    run_once(factory, FakeProvider(), config)
    assert client.get(f"/v1/applications/{key}").json()["status"] == "completed"


def test_wrong_email_unknown_question_and_tenant(setup, payload):
    client, factory, config = setup
    key = submit(client, payload)
    run_once(factory, FakeProvider(), config)
    assert (
        client.post(
            f"/v1/applications/{key}/answers", json={"email": "wrong@example.com", "skip": True}
        ).status_code
        == 404
    )
    assert (
        client.post(
            f"/v1/applications/{key}/answers",
            json={
                "email": payload["email"],
                "answers": [{"question_id": str(uuid4()), "answer": "hello"}],
            },
        ).status_code
        == 422
    )
    client.headers["Authorization"] = "Bearer " + OTHER_KEY
    assert client.get(f"/v1/applications/{key}").status_code == 404
    assert client.post(f"/v1/applications/{key}/vectors").status_code == 404
    client.headers.pop("Authorization")
    assert client.get(f"/v1/applications/{key}").status_code == 401


def test_extraction_failure_does_not_generate_questions(setup, payload):
    client, factory, config = setup
    key = submit(client, payload)
    run_once(factory, FakeProvider(fail=True), config)
    state = client.get(f"/v1/applications/{key}").json()
    assert state["status"] == "extract_failed" and not state["questions"]
    assert client.post(f"/v1/applications/{key}/retry").status_code == 202
    run_once(factory, FakeProvider(), config)
    assert client.get(f"/v1/applications/{key}").json()["status"] == "awaiting_answers"


def test_embedding_failure_rolls_back_and_recovers(setup, payload):
    client, factory, config = setup
    key = submit(client, payload)
    run_once(factory, FakeProvider(complete=True), config)
    client.post(f"/v1/applications/{key}/vectors")
    run_once(factory, FakeProvider(fail=True), config)
    with factory() as session:
        assert session.scalar(select(func.count()).select_from(VectorChunk)) == 0
        assert session.get(JobCounter, ("tenant-a", "job-1")).processed_applications == 0
        assert not session.get(Application, key).counted
    assert client.post(f"/v1/applications/{key}/retry").status_code == 202
    run_once(factory, FakeProvider(), config)
    assert client.get(f"/v1/applications/{key}").json()["status"] == "completed"


def test_idempotency_conflict(setup, payload):
    client, _, _ = setup
    submit(client, payload)
    payload["full_name"] = "Another Name"
    assert (
        client.post(
            "/v1/applications", json=payload, headers={"Idempotency-Key": "submit-001"}
        ).status_code
        == 409
    )


@pytest.mark.parametrize(
    "field,value",
    [
        ("email", "invalid"),
        ("full_name", " "),
        ("application_date", "2026-01-01"),
        ("application_date", "2999-01-01T00:00:00Z"),
        ("job_id", ""),
    ],
)
def test_validation(setup, payload, field, value):
    client, _, _ = setup
    payload[field] = value
    response = client.post(
        "/v1/applications", json=payload, headers={"Idempotency-Key": "submit-001"}
    )
    assert response.status_code == 422
    assert "Built spreadsheet" not in response.text


@pytest.mark.skipif(not os.getenv("TEST_DATABASE_URL"), reason="Requires real PostgreSQL row locks")
def test_concurrent_intake_and_workers(setup, payload):
    client, factory, config = setup
    with ThreadPoolExecutor(max_workers=4) as pool:
        keys = list(pool.map(lambda _: submit(client, payload), range(4)))
    assert len(set(keys)) == 1
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda _: run_once(factory, FakeProvider(complete=True), config), range(4)))
    key = keys[0]
    with ThreadPoolExecutor(max_workers=4) as pool:
        responses = list(
            pool.map(lambda _: client.post(f"/v1/applications/{key}/vectors"), range(4))
        )
    assert all(r.status_code == 202 for r in responses)
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda _: run_once(factory, FakeProvider(), config), range(4)))
    assert client.get("/v1/jobs/job-1/counter").json()["processed_applications"] == 1
    with factory() as session:
        assert session.scalar(select(func.count()).select_from(Task)) == 2


def test_database_failure_after_vectors_does_not_count(setup, payload):
    from sqlalchemy import event
    from sqlalchemy.orm import Session

    client, factory, config = setup
    key = submit(client, payload)
    run_once(factory, FakeProvider(complete=True), config)
    client.post(f"/v1/applications/{key}/vectors")

    def fail_finalization(session, *args):
        if any(isinstance(item, VectorChunk) for item in session.new):
            raise RuntimeError("Simulated vector persistence failure")

    event.listen(Session, "before_flush", fail_finalization)
    try:
        run_once(factory, FakeProvider(), config)
    finally:
        event.remove(Session, "before_flush", fail_finalization)
    with factory() as session:
        assert session.scalar(select(func.count()).select_from(VectorChunk)) == 0
        assert session.get(JobCounter, ("tenant-a", "job-1")).processed_applications == 0
        assert not session.get(Application, key).counted
    client.post(f"/v1/applications/{key}/retry")
    run_once(factory, FakeProvider(), config)
    assert client.get("/v1/jobs/job-1/counter").json()["processed_applications"] == 1


def test_skip_preserves_missing_fields(setup, payload):
    client, factory, config = setup
    key = submit(client, payload)
    run_once(factory, FakeProvider(), config)
    assert (
        client.post(
            f"/v1/applications/{key}/answers", json={"email": payload["email"], "skip": True}
        ).status_code
        == 200
    )
    state = client.get(f"/v1/applications/{key}").json()
    assert len(state["missing_fields"]) == 4
    assert state["status"] == "ready_for_vectorization"


@pytest.mark.skipif(not os.getenv("TEST_DATABASE_URL"), reason="Requires real PostgreSQL row locks")
def test_concurrent_distinct_answers_accepts_only_one(setup, payload):
    client, factory, config = setup
    key = submit(client, payload)
    run_once(factory, FakeProvider(), config)
    qid = client.get(f"/v1/applications/{key}").json()["questions"][0]["id"]

    def send(value):
        return client.post(
            f"/v1/applications/{key}/answers",
            json={"email": payload["email"], "answers": [{"question_id": qid, "answer": value}]},
        ).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        codes = list(pool.map(send, ["First answer", "Different answer"]))
    assert sorted(codes) == [200, 409]


@pytest.mark.skipif(not os.getenv("TEST_DATABASE_URL"), reason="Requires real PostgreSQL row locks")
def test_concurrent_applications_increment_same_job(setup, payload):
    client, factory, config = setup
    keys = []
    for index in range(3):
        item = dict(payload, application_id=f"app-{index}")
        response = client.post(
            "/v1/applications", json=item, headers={"Idempotency-Key": f"submit-{index}"}
        )
        assert response.status_code == 202
        keys.append(response.json()["candidate_key"])
    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(lambda _: run_once(factory, FakeProvider(complete=True), config), keys))
    for key in keys:
        assert client.post(f"/v1/applications/{key}/vectors").status_code == 202
    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(lambda _: run_once(factory, FakeProvider(), config), keys))
    assert client.get("/v1/jobs/job-1/counter").json()["processed_applications"] == 3
