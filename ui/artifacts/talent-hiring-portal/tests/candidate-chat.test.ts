import assert from "node:assert/strict";
import test from "node:test";
import {
  answerCandidateApplicationQuestion,
  type CandidateChatApplication,
} from "../src/lib/candidate-chat.ts";

const applications: CandidateChatApplication[] = [
  {
    id: "product-follow-up",
    title: "Senior Product Designer",
    company: "Northstar Studio",
    location: "Remote · US",
    date: "Applied May 12",
    status: "Follow-up Requested",
    detail: "The team requested an updated resume and four questions.",
    next: "Update your resume and answer four short questions.",
  },
  {
    id: "researcher",
    title: "UX Researcher",
    company: "Fieldnote",
    location: "Brooklyn, NY",
    date: "Applied May 09",
    status: "Interviewing",
    detail: "The team would like a research case discussion.",
    next: "Select Interview to continue.",
  },
];

test("AskAiccu answers application-specific status questions from the provided records", () => {
  const answer = answerCandidateApplicationQuestion(
    "What is the status of my Senior Product Designer application?",
    applications,
  );

  assert.match(answer, /Northstar Studio/);
  assert.match(answer, /Follow-up Requested/);
  assert.match(answer, /four questions/);
});

test("AskAiccu explains follow-up actions and submitted responses", () => {
  const pending = answerCandidateApplicationQuestion(
    "What do I need to do for follow-up?",
    applications,
  );
  const submitted = answerCandidateApplicationQuestion(
    "What do I need to do for follow-up?",
    applications,
    true,
  );

  assert.match(pending, /updated resume/);
  assert.match(pending, /four role-specific questions/);
  assert.match(submitted, /has been submitted/);
});

test("AskAiccu does not invent a follow-up due date", () => {
  const answer = answerCandidateApplicationQuestion(
    "When is the follow-up due?",
    applications,
  );

  assert.match(answer, /doesn’t show a follow-up due date/);
});

test("AskAiccu gives interview guidance from the current application stage", () => {
  const answer = answerCandidateApplicationQuestion(
    "What is my interview status?",
    applications,
  );

  assert.match(answer, /UX Researcher/);
  assert.match(answer, /marked Interviewing/);
  assert.match(answer, /recording consent/);
});

test("AskAiccu stays within the supplied application data for unknown requests", () => {
  const answer = answerCandidateApplicationQuestion(
    "Can you tell me the interviewer's name?",
    applications,
  );

  assert.match(answer, /don’t include interviewer or recruiter names/);
});
