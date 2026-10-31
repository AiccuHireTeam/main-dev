# Default resume match rubric

The machine-readable equivalent is [default.json](default.json). This is a reusable configuration template, not a published job rubric or an executable scoring implementation.

- Rubric ID: `default_resume_match`
- Version: `1.0.0`
- Status: `template`

Actual requirements come from the applied position. This template deliberately contains no job-specific criteria. Equal weighting is a configurable starting point, not an empirically validated predictor of hiring success.

## Categories

| ID | Position field | Definition and activation |
|---|---|---|
| `skill` | Skill | A learned or developed ability to apply knowledge, methods, or tools to perform a task or achieve an outcome. Enable when job-specific criteria exist. |
| `personality_merge` | Personality Merge | Personality generally means characteristic patterns of thinking, feeling, and behaving. In this rubric, assess only demonstrated work behaviors relevant to the role, such as collaboration, communication, or response to feedback. Enable when observable, job-specific criteria exist; do not infer personality traits from a resume. |
| `outlier_skill` | Outlier Skill | A distinctive capability beyond a role’s core requirements that can provide additional, relevant value. Enable when job-specific criteria identify the capability and its value; do not assume rarity or award credit merely for being unusual. |
| `conjugate_skill` | Conjugate Skill | A complementary ability that strengthens the practical use or effectiveness of another skill when the two are used together. Enable when job-specific criteria identify the paired skills and the value of their combined use. |
| `management_skill` | Management Skill | Evaluate listed management requirements using concrete responsibility or project evidence; enable when job-specific criteria exist. |

“Outlier skill” and “conjugate skill” are working definitions for this rubric. An outlier skill adds distinctive value beyond core requirements; a conjugate skill adds value through its relationship with another skill. These definitions alone do not activate scoring categories.

Undefined or empty categories are excluded and reported as `unconfigured`. Their scores are `null` and their criteria contribute no denominator weight. Categories can also be explicitly disabled, with the same exclusion from scoring. A missing skill in a candidate's resume does **not** disable an otherwise configured category.

## Generic examples and resume extraction

The examples below are illustrative resume statements, not default job requirements. A resume supplies reported evidence; it does not independently verify proficiency, outcomes, or personality. Extract the evidence first, then map it to the position's configured criteria.

| Category | Example resume statement | What can be extracted | What makes it different |
|---|---|---|---|
| Skill | “Used spreadsheets to reconcile monthly expenses and produce budget reports.” | Spreadsheet use, expense reconciliation, and reporting, with the stated work context. | An ability applied to a task: **what the candidate can do**. The statement alone does not establish advanced proficiency. |
| Personality / Personality Merge | “Collected feedback from colleagues and revised the handover checklist to address recurring questions.” | Evidence of seeking feedback and adjusting a work process. | **How the candidate acted in a particular work situation**. This supports observable behavior, not a conclusion that the candidate has a particular personality type or is always adaptable. |
| Outlier Skill | “Created scripts that automated recurring report preparation.” | Scripting and report automation experience. For a role centered on manual coordination, this could be an additional valuable capability if the rubric specifies it. | **An additional capability beyond the role's core requirements**. For an automation developer role, the same capability would usually be a core skill. The resume alone cannot establish that it is rare among applicants. |
| Conjugate Skill | “Analyzed customer survey results and presented the findings in plain language so the service team could prioritize improvements.” | Evidence of analysis and communication used together toward a shared outcome. | **Skills whose combined use adds value**: communication helps others act on the analysis. Listing “analysis” and “communication” separately does not establish that they were used together. |

For the existing Management Skill category, “Assigned project tasks, tracked milestones, and coordinated delivery across four colleagues” supplies evidence of task allocation and delivery coordination. It does not by itself establish formal people management or direct reports.

### How to extract evidence from a resume

1. **Read the available content and preserve its source.** Process skills, experience, projects, education, and other relevant sections. Retain exact supporting text and its location, such as the section, role or project, and page when available. Flag unreadable or missing content as a processing limitation.
2. **Identify claims and demonstrated actions.** Extract named abilities, tools, methods, responsibilities, actions, and stated outcomes. Distinguish a self-description such as “excellent communicator” from an example such as “presented monthly findings to the operations team.” Retain both as claims, but assess each only against the evidence it actually provides.
3. **Preserve context and limits.** Record the task, the candidate's stated contribution, and any explicit scope, dates, or results. Do not assign a team's entire achievement to the candidate or treat the duration of a job as the duration of every skill listed under it.
4. **Map evidence using the category definitions.** For Skill, identify the ability applied. For Personality Merge, identify the observable action without inferring an underlying trait. For Outlier Skill, compare the ability with the role's core requirements and configured additional-value criterion. For Conjugate Skill, identify the paired abilities and evidence connecting their use to the same task or outcome.
5. **Evaluate against the published criterion.** Apply the evidence statuses below using the criterion's acceptance conditions. A keyword alone does not establish proficiency; an unsupported personality adjective does not establish work behavior. If a configured requirement has no supporting evidence in a completely processed resume, mark it `not_evidenced`. If the category has no configured criteria, keep it `unconfigured` with a `null` score.
6. **Keep the assessment traceable and avoid duplicate credit.** Retain the criterion ID, category, exact quote, source location, extracted claim or behavior, relevant context, evidence status, and a brief rationale explaining both support and limitations. A quote may support distinct criteria, but the same canonical requirement must not be counted again under another category. For a conjugate criterion, assess the combined use rather than awarding duplicate credit for its component skills.

For example, the survey statement above can be recorded as a claim of **analysis used together with communication**, supported by the exact quoted bullet and its resume location. It supports a criterion requiring evidence of communicating analysis to guide team decisions, but it does not establish a particular analysis tool, presentation frequency, or measured improvement unless the resume supplies those details.

These instructions describe an extraction approach; they do not implement a resume parser or add scoring criteria to the template.

## Job-specific criteria

Each criterion must contain:

| Field | Type | Rule |
|---|---|---|
| `id` | string | Nonempty and unique within the published rubric. |
| `category` | string | One of the category IDs above; category must be configured and enabled. |
| `description` | string | Nonempty requirement derived from the position. |
| `acceptance_criteria` | array of strings | At least one nonempty, observable condition defining full support. |
| `designation` | string | `required` or `preferred`; default to `preferred` unless explicitly required by the position. |
| `aliases` | array of strings | Default `[]`; equivalent terms, not additional requirements. |
| `weight` | number | Finite and greater than zero; default `1`. |

Deduplicate equivalent requirements before publication. Each canonical criterion belongs to one scoring category and is counted once overall. Category scores are breakdowns, not additional contributions to the overall score. Recruiters may override weights before publication.

## Evidence and credit

| Status | Credit | Rule |
|---|---:|---|
| `supported` | 1.0 | Cited evidence satisfies all acceptance conditions. |
| `partially_supported` | 0.5 | Cited evidence satisfies only part of the acceptance conditions. |
| `not_evidenced` | 0.0 | Successfully processed application material supplies no supporting evidence. |
| `conflicting_or_unresolved` | `null` | Material ambiguity requires review; assessment is excluded from ranking until resolved. |

Explicit and indirect evidence can earn equal credit. Indirect evidence must describe relevant actions, responsibilities, projects, or outcomes. Keyword repetition earns no extra credit. A simple skill claim can establish a knowledge criterion but cannot establish proficiency or experience duration without supporting evidence. Validate supporting quotes and source references against the application material. Do not fabricate citations or infer personality, health, protected characteristics, or cultural fit.

Missing evidence means “not evidenced in the application,” not “the candidate lacks the skill.” Processing failures or incomplete parsing must not be converted to `not_evidenced`.

## Calculation and result states

For a published job rubric and a completely processed application with resolved evidence:

`score = 100 × sum(weight × credit) / sum(weight)`

Apply this formula to all enabled canonical criteria for the overall score, and separately within each enabled category. Missing evidence stays in the denominator. Use unrounded scores for ranking; display scores rounded to two decimal places. There is no additional category multiplier.

- Template or draft rubric, or no scorable criteria: `waiting_for_rubric`, overall score `null`, not eligible for ranking.
- Published rubric with any unresolved criterion or incomplete parsing: `needs_review`, overall score `null`, not eligible for ranking. An affected category score is also `null`; retain resolved criterion results for review without renormalizing away unresolved criteria.
- Published rubric with scorable criteria and complete, resolved evidence: `completed`, score in `[0, 100]`, eligible for ranking.
- Extraction/processing failure: use the service's failure state, overall score `null`, not eligible for ranking.

Report required criteria that are not fully supported separately as gaps or unresolved requirements. They do not automatically reject candidates or introduce an extra score penalty.

### Worked calculation

Four enabled criteria with weights `[1, 1, 1, 1]` and credits `[1, 1, 0.5, 0]` produce:

`100 × (1 + 1 + 0.5 + 0) / 4 = 62.5`

The zero-credit criterion remains in the denominator. Adding any criterion in a disabled category does not change **62.5/100**. Changing an enabled criterion to `conflicting_or_unresolved` makes the overall score `null` and blocks ranking rather than recalculating over the remaining evidence.

## Application and validation

1. Instantiate a job-specific draft from this template and the position's requirements. Use these generic definitions and supply observable job-specific criteria before enabling categories.
2. Validate positive finite weights, unique IDs, nonempty descriptions and acceptance conditions, supported designations, and configured enabled categories. Deduplicate equivalent requirements.
3. Require recruiter publication before ranking. Freeze the published rubric; changes create a new version.
4. Record the template ID/version, published rubric ID/version, job snapshot, assessment configuration, and criterion-level evidence with every assessment.
5. Compare assessments only within the same company, job snapshot, published rubric, and assessment configuration (including model, prompt, and scoring versions).

Verification scenarios for the future scoring implementation:

- The worked example returns `62.5`; changing one full-credit criterion to missing evidence returns `37.5`.
- Unresolved evidence blocks ranking and returns no final overall score.
- Disabled and unconfigured categories contribute neither numerator nor denominator; their scores are `null`.
- Empty criteria and unpublished rubrics return `waiting_for_rubric`.
- Invalid weights, duplicate IDs, undefined enabled categories, and empty acceptance conditions fail validation.
- Required-skill gaps are surfaced without automatic rejection.
