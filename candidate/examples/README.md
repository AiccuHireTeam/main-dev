# Complete-flow sample

All candidate details here are fictional. The resume deliberately describes Excel work but omits
examples for the other generic categories. The answer bank supplies synthetic follow-up details.

## Run immediately without credentials

From the project root, using the installed Python environment:

```sh
.venv311/bin/python -m examples.run_flow --offline
```

If you created `.venv` following the main README, use `.venv/bin/python` instead.

This exercises the actual FastAPI endpoints, worker pipeline and persistence logic using a temporary
in-memory SQLite database and simulated extraction/embedding responses. It deterministically produces
four questions, saves the answers, returns the thank-you message, stores simulated vector rows, and
checks that retries leave the counter at one. It does not call an LLM, produce semantic embeddings,
or validate PostgreSQL/pgvector behavior. The temporary database disappears when the process exits.
The offline provider lives only in `examples/`; production does not import it.

## Run against the real service

1. Configure `.env` using the main README, including `API_KEYS` and `PROVIDER_API_KEY`.
2. Start PostgreSQL, migrations, API and worker: `docker compose up --build -d`.
3. Set `PLATFORM_KEY` to one of the configured platform API keys, then run:

```sh
export PLATFORM_KEY='your-configured-platform-api-key'
.venv311/bin/python -m examples.run_flow --base-url http://127.0.0.1:8000 --timeout 600
```

This mode uses the real configured extraction and embedding providers and stores data in your running
service. Provider calls may incur charges. Use a development tenant/database. Each run creates unique
application, resume and job IDs to avoid collisions; the final output identifies the records. It does
not delete these records. A rerun starts a new sample application; retries *within* a run reuse its IDs.
Remote service URLs must use HTTPS. Do not put platform keys in source files or command-line arguments.

The live LLM may classify the synthetic resume differently. The runner answers the actual returned
question IDs, with a maximum of five, rather than hard-coding IDs or the number of questions. If all
categories are found, it follows the no-question branch. Use offline mode to guarantee the answer branch.

## Requests and checks performed

| Step | Request | Check |
|---|---|---|
| 1 | `POST /v1/applications` with `application.json` | `202`, candidate key; duplicate intake returns same key |
| 2 | Poll `GET /v1/applications/{key}` | Extraction ready, no more than five stored questions, counter still zero |
| 3 | `POST /v1/applications/{key}/answers` | Answers from `answers.json` mapped to actual question IDs; thank-you response |
| 4 | Read application again | Answers are stored alongside questions; identical submission is accepted |
| 5 | `POST /v1/applications/{key}/vectors`, then poll | Background processing reaches `completed` and `counted=true` |
| 6 | Repeat intake, answer and vector requests | Same question IDs; job counter remains exactly one |

`application.json` can also be used manually with curl or `/docs`. The runner replaces its IDs and
application date with fresh values. `answers.json` is an answer bank keyed by rubric category, **not**
the answers API payload. The runner builds the required `{email, answers: [{question_id, answer}]}` body.

Expected offline output ends with:

```json
{
  "candidate_key": "<generated UUID>",
  "job_id": "demo-job-<generated ID>",
  "status": "completed",
  "questions": 4,
  "processed_applications": 1,
  "simulated_vector_rows": 2
}
```

The number of vector chunks can change with the rubric or sample content; only a positive count is
required. Live mode reports completion through the API and does not directly inspect vector rows.
To inspect live persistence separately, connect to the development database and use the returned UUID:

```sql
SELECT application, ordinal, model, vector_dims(embedding) AS dimensions
FROM resume_vectors
WHERE application = '<candidate_key>'
ORDER BY ordinal;
```

Failures exit nonzero. A timeout suggests a stopped worker or slow provider; a failed processing state
prints its error code. Fix provider/database configuration, then use the application's retry endpoint
as described in the main README. The sample never automatically skips failed processing or resets counts.
