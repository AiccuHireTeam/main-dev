# Extraction contract

The worker applies resume_extraction.md to every text chunk, with the snapshotted generic rubric and
Pydantic JSON schema. It checks exact quotes against the corresponding chunk before storing results.
Each fact retains chunk offsets and a quote; the full extracted document text is stored separately.
The prompt SHA-256, extraction model, and rubric snapshot are recorded per application.
Model output is evidence reported by the candidate, not independently verified truth.

Question wording is deterministic in app/pipeline.py, using a short exact quote from the candidate's
existing evidence (or resume text). This avoids invented qualifications and guarantees no more than
five questions, exactly one per missing category, in one round. All questions permit none/not applicable.
Answers are stored verbatim as candidate-reported additions, with source question IDs; they do not
silently overwrite original claims. A partial response is final and remaining gaps stay visible.
