import assert from "node:assert/strict";
import test from "node:test";
import type { PositionFormValues } from "../src/components/create-position-form.tsx";
import {
  generatePositionJobDescription,
  getMissingRequiredPositionFields,
} from "../src/lib/position-intake.ts";

function makeValues(
  overrides: Partial<PositionFormValues> = {},
): PositionFormValues {
  return {
    requisitionId: "REQ-2026-TEST1234",
    position: "Senior Product Designer",
    hiringManager: "Maya Chen",
    positionType: "New",
    jobType: "Full Time",
    contractDurationMonths: "",
    benefits: [],
    department: "Design",
    priority: "Medium",
    salaryGrade: "",
    salaryRange: "$110,000–$145,000",
    location: "Remote",
    stakeholders: ["alex@example.com"],
    jobPostingDeadline: "2026-12-01",
    recruitmentDeadline: "2027-01-15",
    job: "Lead product design for accessible customer experiences.",
    jobDescriptionFileName: "",
    jobDescriptionDocumentData: "",
    skill: "Research, prototyping",
    capability: "Cross-functional leadership",
    personality: "Curious and collaborative",
    additionalRole: "",
    verticalGrowth: "",
    otherDetails: "",
    ...overrides,
  };
}

test("required intake fields determine whether the user can continue", () => {
  assert.deepEqual(getMissingRequiredPositionFields(makeValues()), []);
  assert.deepEqual(
    getMissingRequiredPositionFields(makeValues({ stakeholders: [] })),
    [],
  );

  const missing = getMissingRequiredPositionFields(
    makeValues({ salaryRange: "", location: "" }),
  );
  assert.deepEqual(
    missing.map(({ field }) => field),
    ["salaryRange", "location"],
  );
});

test("contract positions require a positive duration before continuing", () => {
  assert.deepEqual(
    getMissingRequiredPositionFields(
      makeValues({ jobType: "Contract", contractDurationMonths: "" }),
    ).map(({ field }) => field),
    ["contractDurationMonths"],
  );
  assert.deepEqual(
    getMissingRequiredPositionFields(
      makeValues({ jobType: "Contract", contractDurationMonths: "6" }),
    ),
    [],
  );
});

test("generated job descriptions include the supplied optional information", () => {
  const description = generatePositionJobDescription(
    makeValues(),
    "Lead product design for accessible customer experiences.",
  );
  assert.match(description, /Salary range: \$110,000–\$145,000/);
  assert.match(description, /Skills\nResearch, prototyping/);
  assert.match(description, /Capabilities\nCross-functional leadership/);
  assert.match(description, /Personality\nCurious and collaborative/);
});

test("generated job descriptions include edited details and selected benefits", () => {
  const description = generatePositionJobDescription(
    makeValues({
      salaryGrade: "G7",
      priority: "High",
      benefits: ["Health insurance", "Paid time off"],
      additionalRole: "Mentor junior designers",
      verticalGrowth: "Progress to design director",
      otherDetails: "Occasional travel required",
    }),
    "Updated role description.",
  );

  assert.match(description, /Salary grade: G7/);
  assert.match(description, /Priority: High/);
  assert.match(description, /Benefits\nHealth insurance, Paid time off/);
  assert.match(description, /Additional role responsibilities\nMentor junior designers/);
  assert.match(description, /Vertical growth\nProgress to design director/);
  assert.match(description, /Other details\nOccasional travel required/);
});
