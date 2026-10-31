"""Run from the project root: python -m examples.run_flow [--offline]."""

import argparse
import json
import os
import time
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import httpx

HERE = Path(__file__).resolve().parent


class FlowError(Exception):
    pass


def require(condition, message):
    if not condition:
        raise FlowError(message)


def request(client, method, path, expected=200, **kwargs):
    response = client.request(method, path, **kwargs)
    if response.status_code != expected:
        # Do not print request headers or bodies (including credentials).
        try:
            code = response.json().get("error", {}).get("code", "unexpected_response")
        except ValueError:
            code = "non_json_response"
        raise FlowError(f"{method} {path}: HTTP {response.status_code} ({code})")
    return response.json()


def wait_for(client, path, targets, timeout, tick=None):
    deadline = time.monotonic() + timeout
    while True:
        if tick:
            tick()
        state = request(client, "GET", path)
        if state["status"] in targets:
            return state
        if state["status"].endswith("_failed"):
            raise FlowError(
                f"Processing failed: {state.get('error_code')}; inspect the worker and retry endpoint"
            )
        if time.monotonic() >= deadline:
            raise FlowError(
                f"Timed out in {state['status']}; ensure the worker is running. Candidate key: {state['candidate_key']}"
            )
        time.sleep(0.01 if tick else 2)


def run_flow(client, timeout=600, tick=None, emit=print):
    run_id = uuid4().hex
    payload = json.loads((HERE / "application.json").read_text())
    payload.update(
        application_id=f"demo-app-{run_id}",
        job_id=f"demo-job-{run_id}",
        resume_id=f"demo-resume-{run_id}",
        application_date=datetime.now(UTC).isoformat(),
    )
    answer_bank = json.loads((HERE / "answers.json").read_text())
    headers = {"Idempotency-Key": f"demo-intake-{run_id}"}
    created = request(client, "POST", "/v1/applications", 202, json=payload, headers=headers)
    key = created["candidate_key"]
    path = f"/v1/applications/{key}"
    emit(f"1. Submitted synthetic application; candidate_key={key}")
    repeated = request(client, "POST", "/v1/applications", 202, json=payload, headers=headers)
    require(repeated["candidate_key"] == key, "Intake retry created a second application")
    state = wait_for(client, path, {"awaiting_answers", "ready_for_vectorization"}, timeout, tick)
    questions = state["questions"]
    require(len(questions) <= 5, "More than five follow-up questions")
    before = request(client, "GET", f"/v1/jobs/{payload['job_id']}/counter")
    require(before["processed_applications"] == 0, "Application counted before vectorization")
    emit(f"2. Extraction complete; {len(questions)} follow-up questions stored")
    answer_payload = None
    if state["status"] == "awaiting_answers":
        require(bool(questions), "Awaiting answers without any questions")
        answers = []
        for question in questions:
            require(question["field"] in answer_bank, "No sample answer for returned category")
            emit(f"   [{question['field']}] {question['question']}")
            answer = answer_bank[question["field"]]
            emit(f"   Sample answer: {answer}")
            answers.append({"question_id": question["id"], "answer": answer})
        answer_payload = {"email": payload["email"], "answers": answers}
        thank_you = request(client, "POST", path + "/answers", json=answer_payload)
        require("Thank you" in thank_you["message"], "Missing thank-you message")
        repeated = request(client, "POST", path + "/answers", json=answer_payload)
        require(repeated == thank_you, "Answer retry changed the response")
        state = request(client, "GET", path)
        expected = {a["question_id"]: a["answer"] for a in answers}
        require(
            all(q["answer"] == expected[q["id"]] for q in state["questions"]),
            "Answers were not persisted beside questions",
        )
        require(state["follow_up"] is not None, "Final response was not stored")
        emit(f"3. Answers persisted: {thank_you['message']}")
    else:
        emit(
            "3. Model found all categories; no answers are needed (use --offline to exercise follow-up deterministically)"
        )
    request(client, "POST", path + "/vectors", 202)
    state = wait_for(client, path, {"completed"}, timeout, tick)
    require(state["counted"], "Completed application is not marked counted")
    emit("4. Vectorization completed")
    # Repeat all write calls after completion; no new questions or count may appear.
    request(client, "POST", "/v1/applications", 202, json=payload, headers=headers)
    if answer_payload:
        request(client, "POST", path + "/answers", json=answer_payload)
    request(client, "POST", path + "/vectors", 202)
    if tick:
        tick()
    counter = request(client, "GET", f"/v1/jobs/{payload['job_id']}/counter")
    require(counter["processed_applications"] == 1, "Expected exactly one processed application")
    final = request(client, "GET", path)
    require(
        [q["id"] for q in final["questions"]] == [q["id"] for q in questions],
        "Retry created another question round",
    )
    emit("5. Retry checks passed; processed application counter = 1")
    return {
        "candidate_key": key,
        "job_id": payload["job_id"],
        "status": final["status"],
        "questions": len(questions),
        "processed_applications": counter["processed_applications"],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Run with in-memory SQLite and simulated model calls; no credentials needed",
    )
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument(
        "--timeout", type=float, default=600, help="Seconds allowed for each background stage"
    )
    args = parser.parse_args()
    if args.timeout <= 0:
        parser.error("--timeout must be positive")
    try:
        if args.offline:
            from examples.offline import offline_client

            print(
                "OFFLINE DEMO: real API flow; simulated extraction/embeddings; temporary SQLite database."
            )
            with offline_client() as (client, tick, count):
                summary = run_flow(client, args.timeout, tick)
                summary["simulated_vector_rows"] = count()
                require(summary["simulated_vector_rows"] > 0, "No vector rows persisted")
        else:
            api_key = os.environ.get("PLATFORM_KEY")
            if not api_key:
                parser.error("Set PLATFORM_KEY to a key configured in the running API's API_KEYS")
            url = httpx.URL(args.base_url)
            if url.scheme != "https" and not (
                url.scheme == "http" and url.host in {"localhost", "127.0.0.1", "::1"}
            ):
                parser.error("Use HTTPS for remote servers")
            print(
                "LIVE DEMO: creates synthetic records and makes billable model/embedding calls through your running service."
            )
            with httpx.Client(
                base_url=args.base_url, headers={"Authorization": "Bearer " + api_key}, timeout=60
            ) as client:
                summary = run_flow(client, args.timeout)
        print(json.dumps(summary, indent=2))
    except (FlowError, httpx.HTTPError) as error:
        raise SystemExit(f"Sample failed: {error}") from None


if __name__ == "__main__":
    main()
