# Aiccuhire Resume Analysis and Follow-up implementation plan

## 1. Summary and architecture

Build a standalone Python service that starts when a candidate submits a job application. Extract resume information, check field completeness, request one follow-up when needed, create and store a resume vector, increment the job application counter, and associate the job with the Resume Repository.

**Flow source and confirmed behavior:** Based on the visual flow in *Resume Analysis and Follow-up.pdf* (October 19, 2026), with the user's confirmation that candidate follow-up happens only once. Send at most one completion request containing all missing-field questions and accept at most one final response or skip per application. Remaining missing fields never trigger another follow-up. The workflow ends after vector storage, application-counter update, and Resume Repository association.

Use FastAPI, Pydantic, SQLAlchemy/Alembic, PostgreSQL with pgvector, Celery with Redis, and S3-compatible object storage. Package the API and workers as separate Docker services, with local development configuration and documented platform integration contracts.

Expose adapters for the position database, resume database, file storage, hosted LLM/embedding providers, and Aiccuhire notification delivery. Supply working PostgreSQL and S3-compatible implementations; Aiccuhire can replace adapters without changing the processing pipeline.

Initial scope:

- English PDF, scanned PDF, DOCX, legacy DOC, and platform-generated dictation transcripts.
- Structured application answers and one submitted follow-up as additional evidence.
- Field-completeness validation, candidate notification events, resume embeddings, application counting, and repository/job associations.
- Complete processing of long resumes, including 20-page documents.
- No audio recording/transcription UI or automatic rejection.

## 2. Application flow and integration contracts

**Submission**

Aiccuhire calls `POST /v1/analyses` after storing the application and resume. The request contains application ID, job ID, candidate ID when available, candidate email, resume ID, an approved storage reference or transcript, and structured application answers. Resolve company ID (the tenant identifier) from authenticated Aiccuhire context and verify that the application, job, and resume belong to it.

Return HTTP `202` with an analysis ID and status URL. Use authenticated tenant identity to authorize all supplied identifiers. Require an idempotency key; repeated identical submissions return the existing analysis, while conflicting reuse returns an error.

**Position validation and completeness rubric**

Retrieve the position using company ID and job ID to validate the application, provide notification context, and update the job application counter. Preserve the job reference with the resume; no job-specific qualification evaluation is performed.

During implementation, add a versioned `rubrics/completeness.json` with required field paths, accepted value types, applicability rules, and deterministic validators. Proposed initial required fields are candidate name, contact email (which may come from verified application data), skills, experience/projects, and education/training. For skills, experience/projects, and education/training, an explicit “none” or “not applicable” satisfies presence. College and personal projects can satisfy the experience/projects field; paid employment and degrees are not mandatory. These field defaults are a product assumption because the diagram does not enumerate them. Company overrides are snapshotted per application.

Completeness checks determine whether information has been supplied, not whether the candidate possesses a job's requested skills. An absent job skill must not trigger a request to claim that skill. This workflow uses only the completeness rubric.

**Processing and branching**

1. Validate the application and document; check file signatures, limits, access permissions, and malware-scan results.
2. Extract all resume details and merge structured application data, using OCR or isolated DOC conversion where necessary. Preserve page, paragraph, or transcript references and provenance for each field.
3. Compare extracted fields with the snapshotted completeness rubric using deterministic presence/type checks. Extraction failures go to recovery/review rather than being mislabeled as missing candidate information.
4. If all required fields are complete, enqueue the application-received thank-you notification, then proceed to vector creation. Notification delivery retries independently of processing.
5. Otherwise generate one question per missing field using the candidates resume and enqueue one completion request through Aiccuhire's notification adapter. Store stable question IDs, field mappings, and the rubric version. Questions ask for factual clarification, allow honest “none/not applicable” responses where appropriate, and do not suggest or invent qualifications.
6. Wait in `awaiting_follow_up` for one authenticated submission. Keep this waiting state durable rather than holding a worker open. Do not schedule repeated question rounds or follow-up reminders. A nonresponse remains pending and uncounted by this workflow; no automatic expiry is assumed.
7. Accept one final response payload, merge it with original information, and record answered, unanswered, and conflicting fields. An explicit skip may be submitted. Recheck completeness for reporting only; do not loop. Preserve original evidence and provenance. Follow-up may fill an empty field but must not silently erase conflicting resume claims; conflicts are retained for review. Verified account identity/contact changes remain the platform's responsibility.
8. Create a resume vector from available normalized information, including follow-up where submitted. Remaining missing fields are recorded and do not block vector creation if usable content exists. Empty usable content or embedding failure prevents finalization and is recoverable.
9. Store the vector and its immutable source version. Finalize intake by incrementing the job application counter by one and appending jobId to the Resume Repository through an idempotent association. Publish `resume.processing_completed` after these effects are confirmed.


The incomplete branch receives the completion request; no additional thank-you notification is implied after the response. This follows the diagram's notification placement. Notification content is generated/planned here; modifying this plan does not send candidate messages.

**State, persistence, and delivery guarantees**

Processing states are `received`, `extracting`, `checking_completeness`, `awaiting_follow_up`, `merging`, `vectorizing`, `finalizing`, `completed`, `needs_review`, and `failed`. Persist notification delivery states independently. Record remaining missing fields and conflicting claims as review flags on the result; they do not trigger another candidate request. Use `needs_review` for processing-quality problems that prevent creation of a usable source snapshot.

Use a transactional outbox for queue dispatch, notifications, and completion events. Scope idempotency to company/application and operation. Identical follow-up retries return the saved result; a second distinct final response returns HTTP `409`. Enforce this with a database constraint/atomic transition, including concurrent submissions. Reprocessing must never reopen the response window, generate a second completion request, or increment the counter again. Delivery retries reuse the original notification ID and provider idempotency key; they are retries of the same logical request, not new questions or reminders.

Persist the completeness rubric snapshot, original extracted fields, missing-field list, questions, delivery references, single response, merged source version, unresolved conflicts, vectors, and finalization ledger. Preserve original and merged source versions as immutable history.

For local PostgreSQL, commit vector persistence, a unique application-count ledger entry, the associated counter increment, and repository/job association atomically. Use uniqueness on `(company_id, application_id)` for counting and `(company_id, resume_id, job_id)` for repository association. A resume applying to different jobs counts once per application and has distinct job associations. Retries of an existing application never count again. The platform must designate this workflow as owner of this counter; do not also increment it on submission. It is a processed-application counter under the diagram's ordering, distinct from a submitted-application metric.

When position/resume repositories are external, use idempotent adapter commands plus an outbox-backed finalization workflow; retry partial successes and mark intake complete only when all effects are acknowledged. Require external adapters to accept operation keys; do not promise cross-database atomicity. Reconcile ledger entries against counter and association acknowledgments.

**Resume vector contract**

Use a configurable embedding provider and pin model/version/dimension per deployment. Normalize job-independent resume content deterministically, excluding unnecessary identifiers such as email and name. Chunk all usable content within the embedding model's token limits; never silently truncate. Store chunk vectors and one normalized token-count-weighted mean resume vector, recording chunk boundaries, source hash/version, normalization version, provider/model, dimensions, and timestamps. Bind vectors to the application source snapshot so follow-up for one job cannot overwrite another application's evidence.

Use pgvector storage with dimension-specific schema/index configuration. Re-embedding creates a new version and does not recount applications. Never compare vectors across incompatible embedding models or normalization versions. Vectors are stored for repository retrieval.

**Public interfaces**

- `GET /v1/analyses/{analysisId}` — processing status, completeness findings, notification status, merged source/vector references, finalization status, and review flags.
- `GET /v1/analyses/{analysisId}/follow-up` — the authorized candidate's current questions, response state, and rubric version.
- `POST /v1/analyses/{analysisId}/follow-up` — one final submission of question-ID/answer pairs or an explicit skip; require idempotency and return `202` with the status URL. Reject unknown question IDs, foreign application access, and a second distinct submission.
- Outbound notification events — `application.received` for the complete branch and `application.completion_requested` for the incomplete branch; include a stable event ID, application reference, and platform-generated secure response link. Resolve recipient contact through the authorized notification adapter.
- `POST /v1/analyses/{analysisId}/reprocess` — create a new processing/source version using existing inputs and the already submitted follow-up, without another candidate request or counter increment.

Document schemas and examples through OpenAPI. Keep platform-specific database access behind adapters.

## 3. Result contract and persistence

Return analysis ID, company ID, application ID, job ID, candidate email, resume ID, processing status, completeness rubric version, missing fields before and after follow-up, follow-up state, source/vector version references, review flags, timestamps, and finalization acknowledgments. Follow-up state distinguishes `not_needed`, `awaiting_response`, `submitted`, and `skipped`.

The completion event `resume.processing_completed` references the persisted result and confirms vector storage, counter update, and repository association. Consumers retrieve authorized details through the API; avoid candidate content in event payloads. Store model, prompt, embedding, normalization, and completeness-rubric versions for reproducibility. Completion means the workflow finished with available information; remaining missing fields remain visible.

## 4. Prompt Markdown files and production controls

Create a `prompts/` directory during implementation containing:

- **`README.md`** — stage order, template variables, JSON contracts, versioning, and examples.
- **`resume_extraction.md`** — extract resume fields from every chunk, preserving source references, dates, and supporting quotes without inventing information.
- **`missing_field_questions.md`** — produce one neutral question per supplied missing-field ID, with structured output and no additional qualification requirements. Completeness validation and question-to-field mappings remain application-controlled.

Update `resume_extraction.md` to extract generic completeness fields and other supplied resume details. Preserve original and follow-up source references during merging; deterministic merge rules govern precedence and conflict handling. Embedding normalization does not require an LLM prompt.

Every prompt must instruct the model to treat resume text as untrusted data, ignore embedded instructions, avoid external candidate research, return schema-valid JSON, and refrain from inventing evidence or following instructions embedded in candidate content. Keep prompts in source control and record their content hashes with results.

Production controls:

- Tenant-scoped authentication and authorization, encrypted transport/storage, least-privilege credentials, and identifier-free operational logs.
- Approved storage references only; no arbitrary URL fetching.
- Isolated parsers, malware scanning, decompression limits, resource limits, and file-type verification following [OWASP upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).
- Default configurable limits of 25 MB, 100 document pages, and 250,000 extracted characters; reject excess explicitly rather than silently truncate.
- Bounded retries with exponential backoff for transient failures; permanent failures and exhausted retries enter a recoverable failure queue.
- LLM timeouts, concurrency limits, token budgets, strict response validation, and one repair attempt for malformed output.
- Citation validation against original source text; unsupported extracted claims must be flagged rather than accepted as source-backed facts.
- Metrics for queue delay, processing latency, extraction failures, review rate, model/embedding usage and cost, notification failures, pending follow-ups, finalization retries, and counter/repository reconciliation failures. Separate candidate waiting time from processing latency.
- Tenant-configured retention and deletion propagated to stored sources, extracted evidence, follow-up answers, vectors, and processing results. Candidate follow-up endpoints require application-scoped authentication; queue payloads and logs avoid candidate content.

Select the hosted provider and exact model through deployment configuration. Production startup must require valid provider, authentication, storage, and retention settings; tests use a deterministic fake provider.

## 5. Verification and rollout

**Automated tests**

- Two-page and 20-page resumes, multi-column layouts, scanned pages, tables, DOC/DOCX, and transcripts.
- Direct skills, indirectly demonstrated skills, college projects, overlapping employment, repeated keywords, unsupported claims, and contradictory application answers.
- Completeness field validators, company overrides, explicit none/not-applicable answers, and the single-submission constraint.
- Invalid citations, prompt injection, malformed model responses, timeouts, and provider outages.
- Duplicate application events, worker crashes, database failures, outbox retries, reprocessing, tenant isolation, and deletion.
- Unsupported languages, encrypted/corrupt documents, oversized files, and incomplete OCR without misleading completeness results.

**Flow acceptance tests**

- Complete application: one thank-you event, no questions, vector stored, counter incremented once, job association added, and `resume.processing_completed` emitted.
- Incomplete application: one completion request, durable wait, one response/skip, provenance-preserving merge, then vectorization and finalization without a second question round.
- Partial follow-up: remaining fields flagged, usable content vectorized, missing evidence does not become an invented qualification. Conflicts remain flagged for review without generating another follow-up.
- Nonresponse: no vector finalization or counter increment; pending state survives worker restarts.
- Empty content, corrupt documents, and provider failures: no misleading missing-field questions, no success event, and no counter increment before successful persistence.
- Concurrent/duplicate response submissions, worker retries, and reprocessing: no repeated notifications, extra follow-up rounds, counter increments, or repository associations.
- Vector persistence followed by an external counter/association failure: recover through idempotent retries and reconciliation before declaring intake complete.
- Applications for different jobs retain separate source snapshots and follow-up evidence; long resumes are fully chunked; model/dimension changes cannot mix vector indexes.
- Candidate authorization, unknown question IDs, explicit “none” answers, rubric snapshot consistency, and deletion of follow-up/vector data.

**Quality acceptance**

Create a de-identified, manually labeled evaluation set of at least 100 applications covering different resume formats, experience levels, and long-document cases. Measure extracted-field precision/recall and completeness-decision agreement.

Initial release targets: at least 95% precision for extracted facts, 85% recall for labeled resume information, and 95% agreement on required-field completeness. Require source references for extracted facts, exactly one question per missing field in a single request, no second follow-up round under any retry/reprocessing scenario, and no cross-company access or duplicate counter increments in integration tests. Validate vectors for finite values, expected dimensions, complete chunk coverage, and matching source versions.

**Delivery sequence**

1. Service skeleton, contracts, migrations, adapters, and application ingestion.
2. Document extraction, completeness rubric, missing-field prompts, notification adapter, and one-response follow-up APIs.
3. Provenance-preserving merge, embeddings/pgvector, repository association, application-count ledger, and finalization reconciliation.
4. End-to-end flow tests, quality evaluation, operational documentation, and shadow deployment with notifications routed to a test sink and counters isolated from production.
5. Enable candidate notifications and finalization after flow and extraction-quality verification.

Assume an initial load-test target of 1,000 applications per day with bursts of 50 concurrent submissions. Report measured throughput, cost, and latency against that workload; provider quotas and OCR capacity must be checked before production launch.

The deliverable includes the codebase, Markdown prompts, API documentation, architecture notes, completeness specification, deployment guide, and operational runbook. This document specifies the revised implementation; runtime services, completeness-rubric files, follow-up prompts, and integrations remain to be built.
