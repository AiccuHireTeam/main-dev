import assert from "node:assert/strict";
import test from "node:test";
import { extractPositionFieldsFromText } from "../src/lib/position-document-fields.ts";

test("extracts salary range, skills, capabilities, and personality", () => {
  const fields = extractPositionFieldsFromText(`
Salary range: $120,000–$150,000
Skills: SQL, data storytelling
Capabilities:
Lead cross-functional teams
Personality: Curious and collaborative
`);

  assert.equal(fields.salaryRange, "$120,000–$150,000");
  assert.equal(fields.skill, "SQL, data storytelling");
  assert.equal(fields.capability, "Lead cross-functional teams");
  assert.equal(fields.personality, "Curious and collaborative");
});
