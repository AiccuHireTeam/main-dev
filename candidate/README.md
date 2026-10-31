# Aiccuhire resume intake API

A backend service for application-triggered resume extraction, one contextual follow-up round,
and durable vector indexing. No candidate UI or email delivery is included. The platform calls
these APIs and displays/delivers the returned questions. Intake and vectorization return `202`;
a separate worker processes the durable PostgreSQL task queue. Poll the status endpoint for results.

## Implemented workflow

1. The platform submits candidate metadata and a resume. The service validates it, snapshots
   `rubrics/default.json`, stores the application, and queues extraction in the same transaction.
2. The worker processes every extracted-text chunk, validates the model output and supporting
   quotes, saves categorized evidence and other professional details, and checks category coverage.
3. Missing categories produce **at most five questions in one round**, each anchored in the resume.
   Questions and their stable IDs are stored in PostgreSQL. Complete resumes need no follow-up.
4. The platform submits the candidate key, email, and question-ID/answer pairs. Answers are saved
   alongside the questions and a thank-you message is returned. Identical retries succeed; a different
   second submission returns `409`. Partial answers or an explicit skip are final; remaining gaps persist.
5. A separate API call queues vectorization. The worker embeds the rubric, extracted professional
   details, and answers in complete chunks and stores them in pgvector. Vector rows, the job/resume
   association, the application's counted flag, and **counter +1** commit atomically. The total is
   incremented, never reset to 1. Retries do not count again.

The generic rubric is a template with no published job criteria. This implementation checks whether
information is supplied for its five categories; it **does not calculate candidate/job match scores**.
An absent category prompts clarification, not a claim that the candidate lacks an ability. Personality
means reported work behavior. Additional capabilities are recorded without asserting statistical rarity
or job-specific advantage. Explicit “none/not applicable” is valid supplied information.

## API contract

All `/v1` endpoints are server-to-server and require `Authorization: Bearer <platform-key>`.
Keys are mapped to tenants in configuration. The candidate key is an application-scoped UUID returned
by intake; it is not an authentication credential. The platform must authenticate the candidate and
check ownership before forwarding answers. Email is an additional consistency check, not proof of identity.

| Method and path | Purpose |
|---|---|
| `POST /v1/applications` | Validate, persist, queue extraction; returns `202` and candidate key |
| `GET /v1/applications/{candidate_key}` | Read status, questions/answers, evidence and remaining gaps |
| `POST /v1/applications/{candidate_key}/answers` | Submit one final answer set or skip; returns `200` thank-you |
| `POST /v1/applications/{candidate_key}/vectors` | Queue embeddings; returns `202`; safe to repeat |
| `POST /v1/applications/{candidate_key}/retry` | Requeue an exhausted failed operation; never opens another question round |
| `GET /v1/jobs/{job_id}/counter` | Read this service's processed-application count |
| `GET /health/live`, `GET /health/ready` | Process and database readiness |

OpenAPI is at `/openapi.json`; generated API reference is at `/docs`.

Required intake fields: `application_id`, `job_id`, `resume_id`, `full_name`, `email`,
`application_date` (timezone-aware, not in the future), and `resume.format`/`resume.content`.
`phone` is optional. All unknown fields are rejected. Intake additionally requires an
`Idempotency-Key` header, 8–128 characters. Reuse the same key and identical payload on retry.
Unique tenant/application IDs prevent replay under another key; conflicting reuse returns `409`.

Example `application.json`:

```json
{
  "application_id": "app-1001",
  "job_id": "job-42",
  "resume_id": "resume-88",
  "full_name": "Alex Example",
  "email": "alex@example.com",
  "application_date": "2026-01-01T10:00:00Z",
  "resume": {
    "format": "text",
    "content": "Built spreadsheet reports for a university project. Collected team feedback and revised the reporting process."
  }
}
```

```sh
curl -X POST http://localhost:8000/v1/applications \
  -H "Authorization: Bearer $PLATFORM_KEY" \
  -H 'Content-Type: application/json' -H 'Idempotency-Key: app-1001-intake' \
  --data-binary @application.json
```

For PDF/DOCX, use `format: "pdf"` or `"docx"` and strict base64 file bytes in `content`.
For dictated resumes, supply the already-transcribed text. The service does not transcribe audio.
Files are capped at 10 MiB, request bodies at 14.1 MB, PDFs at 100 pages, extracted text at 250,000
characters, and DOCX expanded contents at 30 MB. Binary parsing runs in a subprocess with a 45-second
wall-time limit and Linux CPU/memory limits. Password-protected PDFs, empty/scanned pages requiring
OCR, legacy DOC, macros and embedded documents are rejected explicitly. DOCX extraction includes
paragraphs, tables, headers, footers, footnotes and endnotes. Text embedded only in images is not OCRed;
provide an upstream OCR transcript for image-based resumes. No arbitrary URLs are fetched.

After `GET` shows `awaiting_answers`, send this body to the answers endpoint using actual stored IDs:

```json
{
  "email": "alex@example.com",
  "answers": [
    {"question_id": "9eaad57f-c688-4255-bab5-51f0a3de5318", "answer": "I combined spreadsheet analysis with presentations for our research project."}
  ]
}
```

Alternatively use `{"email":"alex@example.com","skip":true}`. Empty submissions, duplicate IDs,
foreign/unknown IDs, blank answers, and more than five answers fail validation. Each answer is limited
to 5,000 characters. Original resume evidence is retained; answers remain explicitly candidate-reported
and do not silently replace contradictory claims. No second question round is generated.

Successful response:

```json
{"message":"Thank you. Your answers have been saved.","candidate_key":"<application UUID>"}
```

Once status is `ready_for_vectorization`, POST to `/v1/applications/{candidate_key}/vectors` with no
body. Poll until `completed` or a failed status. Nonresponses stay pending and uncounted indefinitely.

## Local deployment

Requires Docker Compose, or Python 3.11+ and PostgreSQL with pgvector. Provider credentials and model
access are required for real extraction/embedding. A hosted OpenAI-compatible provider is configurable.
The embedding schema is fixed at 1536 dimensions; changing dimensions requires a new schema migration.

```sh
cp .env.example .env
# Edit .env: random database password, tenant API key, provider key and accessible model IDs.
docker compose up --build -d
```

The migration container installs schema version 1 before API/worker startup. PostgreSQL data lives in
a persistent volume; it is not exposed on a host port. The API binds to loopback port 8000. For production,
use managed secrets, TLS termination, per-tenant rate limits, and separate least-privilege runtime and
migration database roles. The compose database account is a local-development account, not a production
least-privilege role. The platform must validate job/application/resume ownership against its own records
and malware-scan uploads before submission. This service's counter belongs to its local database; it does
not mutate an existing external position database. Make it the authoritative processed-application counter
or integrate it explicitly before launch. Do not also increment it at application submission.

Without Docker:

```sh
python3.11 -m venv .venv
.venv/bin/pip install -r requirements.lock
# Configure .env with a reachable PostgreSQL database and provider credentials.
.venv/bin/python -m app.migrate
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-access-log
# In a separate process:
.venv/bin/python -m app.worker
```

## Storage, reliability and operations

- `applications`: tenant-scoped identity, original extracted document text, supplied metadata, rubric
  snapshot, extraction model/prompt hash, facts with quote/offset provenance, separately retained resume identity/contact claims, questions/answers and status.
- `tasks`: durable queue and retry history. `FOR UPDATE SKIP LOCKED` allows multiple workers. Enqueueing
  and intake are one transaction, so a committed application cannot lose its extraction task.
- `resume_vectors`: each complete source chunk, SHA-256 source hash, model, normalization version and
  pgvector embedding. Identity/contact metadata is excluded, and known names/emails/phone are redacted.
  Free text may still contain personal information; apply the same access/retention controls to vectors.
- `job_counters` and `repository_jobs`: atomically finalized counts and resume/job associations.

The worker holds a task/application transaction during bounded provider calls; a crash releases locks
and rolls back partial work. Duplicate provider charges are possible after crashes, but duplicate database
finalization is prevented. This conservative design trades long transactions for simple crash recovery;
monitor transaction duration and database pool capacity when increasing throughput. Each worker handles
one task at a time. Scale workers within provider quotas. Network/provider failures retry with backoff
up to `MAX_ATTEMPTS`; exhausted operations become `extract_failed` or `vectorize_failed`. Fix the cause,
then call `/retry`. Extraction failure never becomes missing-field questions. Failed vectorization never
increments the counter. An embedding model change must use a versioned reindexing migration/workflow;
the current API deliberately does not overwrite completed vectors.

Errors use `{"error":{"code":"..."}}` with `401` authentication, `404` inaccessible identity,
`409` workflow/idempotency conflicts, `413` size limits, `422` invalid input/document, or `503` database
unavailability. Validation responses omit submitted values; worker logs omit candidate content and raw
provider errors. Persisted `error_code` explains asynchronous failures. Disable proxy request-body logging.
Monitor pending-task age, failure counts, provider latency and database/worker availability. Back up and
test restore of PostgreSQL. Set a retention/deletion policy covering source text, answers, vectors and
backups; automated retention and candidate self-service deletion are not included.

## Validation and release boundaries

```sh
.venv/bin/pytest -q
.venv/bin/ruff check app tests
# Real PostgreSQL/pgvector integration and concurrency tests:
TEST_DATABASE_URL=postgresql+psycopg://test:test@localhost:5432/resume_test .venv/bin/pytest -q
```

Tests use deterministic fake model responses; production always uses the configured hosted provider.
Without `TEST_DATABASE_URL`, SQLite is only a test double and concurrency tests are skipped. PostgreSQL
tests use a fresh isolated schema per test and delete that schema afterward. Use a dedicated test database
and a role allowed to create schemas/extensions. The included CI workflow runs the suite against pgvector.

Before production rollout, run the PostgreSQL suite, exercise the configured provider with de-identified
resumes, evaluate extraction recall and factual accuracy, and load-test your expected traffic. No claim of
perfect “all details” extraction is made: the entire source text is retained and processed without truncation,
but model extraction and document reading need quality evaluation. There is no live provider validation,
OCR, S3 adapter, email integration, external position-database adapter, or measured load benchmark bundled
with this delivery. These are explicit integration/release boundaries, not silent fallback behavior.

Implementation references: [SQLAlchemy transaction/locking API](https://docs.sqlalchemy.org/en/20/orm/session_api.html)
and [pgvector Python/SQLAlchemy integration](https://github.com/pgvector/pgvector-python).

## Runnable complete-flow example

See [examples/README.md](examples/README.md) for a synthetic resume, contextual sample answers, and a
runner that verifies intake, answer persistence, vectorization, and counting under duplicate requests.
Run `python -m examples.run_flow --offline` for a credential-free demonstration, or use the documented
live mode against your running API and worker with actual extraction/embedding credentials.
