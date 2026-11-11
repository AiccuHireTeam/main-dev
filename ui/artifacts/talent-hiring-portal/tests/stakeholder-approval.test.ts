import assert from "node:assert/strict";
import test from "node:test";
import {
  allStakeholdersSubmitted,
  mergeRelevantStakeholderInputs,
  type StakeholderInputResponse,
} from "../src/lib/stakeholder-approval.ts";

test("approval readiness requires every assigned stakeholder to submit", () => {
  assert.equal(
    allStakeholdersSubmitted(
      ["one@example.com", "TWO@example.com"],
      { "one@example.com": true, "two@example.com": true },
    ),
    true,
  );
  assert.equal(
    allStakeholdersSubmitted(
      ["one@example.com", "two@example.com"],
      { "one@example.com": true, "two@example.com": false },
    ),
    false,
  );
  assert.equal(allStakeholdersSubmitted([], {}), false);
});

test("only relevant answers are merged, without stakeholder identity", () => {
  const base = {
    job: "Lead the product strategy.",
    skill: "Product design and prototyping.",
    capability: "Partner across Product and Engineering.",
    personality: "",
    additionalRole: "",
    verticalGrowth: "",
    otherDetails: "",
  };
  const responses: StakeholderInputResponse[] = [
    {
      key: "person-a|q1",
      stakeholderEmail: "person-a@example.com",
      question: "Which skills are most important?",
      answer: "Accessibility and design systems",
      decision: "relevant",
    },
    {
      key: "person-b|q1",
      stakeholderEmail: "person-b@example.com",
      question: "What additional context should be considered?",
      answer: "The answer should not be included.",
      decision: "not-relevant",
    },
    {
      key: "person-c|q1",
      stakeholderEmail: "person-c@example.com",
      question: "What should success look like?",
      answer: "Deliver a clear launch plan.",
      decision: "relevant",
    },
  ];
  const merged = mergeRelevantStakeholderInputs(base, responses);

  assert.equal(merged.job, base.job);
  assert.equal(merged.skill, "Product design and prototyping. Accessibility and design systems.");
  assert.equal(
    merged.capability,
    "Partner across Product and Engineering. Deliver a clear launch plan.",
  );
  assert.doesNotMatch(JSON.stringify(merged), /Which skills are most important/);
  assert.doesNotMatch(JSON.stringify(merged), /not be included/);
  assert.doesNotMatch(JSON.stringify(merged), /person-a@example\.com/);
});

test("rebuilding the posting from its base removes answers no longer relevant", () => {
  const base = {
    job: "Original role requirement.",
    skill: "",
    capability: "",
    personality: "",
    additionalRole: "",
    verticalGrowth: "",
    otherDetails: "",
  };
  const response: StakeholderInputResponse = {
    key: "person-a|q1",
    stakeholderEmail: "person-a@example.com",
    question: "What is important?",
    answer: "Clear ownership.",
    decision: "relevant",
  };

  assert.match(
    mergeRelevantStakeholderInputs(base, [response]).capability,
    /Clear ownership\./,
  );
  assert.equal(
    mergeRelevantStakeholderInputs(base, [
      { ...response, decision: "not-relevant" },
    ]).capability,
    base.capability,
  );
  assert.deepEqual(
    mergeRelevantStakeholderInputs(base, [
      { ...response, decision: "not-relevant" },
    ]),
    base,
  );
});
