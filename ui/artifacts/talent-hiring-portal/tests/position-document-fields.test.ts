import assert from "node:assert/strict";
import test from "node:test";
import { extractPositionFieldsFromText } from "../src/lib/position-document-fields.ts";

test("extracts labeled position details and multiline job descriptions", () => {
  const fields = extractPositionFieldsFromText(`
Job Title: Senior Product Designer
Hiring Manager: Maya Chen
Department: Design
Job Type: Contract
Contract Duration: 6 months
Location: New York, NY
Salary Grade: P4
Priority: High
Stakeholders: Alex Morgan <alex@example.com>, alex@example.com
Job Posting Deadline: 11/20/2026
Recruitment Deadline: 2026-12-15
Job Description:
Lead research-led product design.
Partner with engineering and product teams.
`);

  assert.equal(fields.position, "Senior Product Designer");
  assert.equal(fields.hiringManager, "Maya Chen");
  assert.equal(fields.department, "Design");
  assert.equal(fields.jobType, "Contract");
  assert.equal(fields.contractDurationMonths, "6");
  assert.equal(fields.location, "New York, NY");
  assert.equal(fields.salaryGrade, "P4");
  assert.equal(fields.priority, "High");
  assert.deepEqual(fields.stakeholders, ["alex@example.com"]);
  assert.equal(fields.jobPostingDeadline, "2026-11-20");
  assert.equal(fields.recruitmentDeadline, "2026-12-15");
  assert.equal(
    fields.job,
    "Lead research-led product design.\nPartner with engineering and product teams.",
  );
});

test("leaves missing details empty and uses unlabelled text as the description", () => {
  const fields = extractPositionFieldsFromText(
    "Build accessible onboarding experiences.\nWork closely with researchers.",
  );

  assert.deepEqual(fields, {
    job: "Build accessible onboarding experiences.\nWork closely with researchers.",
  });
});

test("does not infer a date when the document only gives a month", () => {
  const fields = extractPositionFieldsFromText(
    "Job Posting Deadline: November 2026",
  );

  assert.equal(fields.jobPostingDeadline, undefined);
});
