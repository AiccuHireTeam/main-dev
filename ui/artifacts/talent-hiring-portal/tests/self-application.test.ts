import assert from "node:assert/strict";
import test from "node:test";
import { answerPublishedRoleQuestion, candidateApplicationsForEmail, consentedSelfIdentification, createSelfApplicant, emptyApplication, isAcceptingApplications, prepareSelfApplication, validateApplication } from "../src/lib/self-application.ts";
import { applicationGuideIntent, guidedProfileError } from "../src/lib/application-guide.ts";
import type { HiringPosition } from "../src/components/job-portal-pages.tsx";

const role: HiringPosition = {
  id: "test-open", requisitionId: "REQ-2026-TEST1234", position: "Researcher",
  hiringManager: "Private Manager", ownerEmail: "private@example.test", stakeholders: ["private-stakeholder@example.test"],
  positionType: "New", department: "Research", priority: "High", salaryGrade: "L5",
  location: "Remote", jobPostingDeadline: "", recruitmentDeadline: "", job: "Research customer needs.",
  skill: "Interviewing", capability: "Synthesis", additionalRole: "", verticalGrowth: "", otherDetails: "",
  status: "Open", createdAt: "2026-11-01", applicantCount: 0, applicants: [],
};
function validDraft() {
  const draft = emptyApplication();
  draft.profile = { ...draft.profile, name: " Test Candidate ", email: " TEST@example.test ", phone: "123", address: "1 Example Street", nonCompeteResponse: "No", summary: "Research experience" };
  draft.files = [
    new File(["resume one"], "general.pdf", { type: "application/pdf" }),
    new File(["resume two"], "research.docx"),
  ];
  return draft;
}

test("only Open published roles accept applications, including status transitions", () => {
  for (const status of ["Draft", "Ready for approval", "On Hold", "Removed", "Closed", "Ready for Interview", "Ready for Final Interview", "Final Interview scheduled", "Final interviews completed", "Process Offer"] as const) {
    assert.equal(isAcceptingApplications({ status }), false);
    assert.throws(() => prepareSelfApplication([{...role, status}], role.id, validDraft(), "id"), /no longer accepting/);
  }
  assert.equal(isAcceptingApplications(role), true);
  assert.throws(() => prepareSelfApplication([], role.id, validDraft(), "id"), /no longer accepting/);
});

test("name, contact details, non-compete response and resumes are required; SMS opt-in is optional", () => {
  assert.equal(validateApplication(emptyApplication()).length, 6);
  const draft = validDraft();
  assert.deepEqual(validateApplication(draft), []);
  draft.smsOptIn = true;
  assert.deepEqual(validateApplication(draft), []);
  draft.profile.profileUrl = "javascript:alert(1)";
  assert.match(validateApplication(draft).join(), /http or https/);
  draft.profile.profileUrl = "";
  draft.profile.name = " ";
  draft.profile.email = "not-email";
  assert.equal(validateApplication(draft).length, 2);
});

test("resume validation rejects unsupported, empty, oversized or too many versions", () => {
  const draft = validDraft();
  draft.files = [new File(["x"], "wrong.exe"), new File([], "empty.pdf")];
  assert.equal(validateApplication(draft).length, 2);
  draft.files = Array(6).fill(new File(["x"], "resume.pdf"));
  assert.match(validateApplication(draft).join(), /no more than five/);
  draft.files = [{name: "big.pdf", size: 15 * 1024 * 1024 + 1}] as File[];
  assert.match(validateApplication(draft).join(), /15 MB/);
});

test("submission adds every resume version to the selected staff record and candidate view only", () => {
  const draft = validDraft();
  draft.smsOptIn = true;
  const other = {...role, id: "other"};
  const {applicant, nextPositions} = prepareSelfApplication([role, other], role.id, draft, "self-id");
  assert.equal(nextPositions[0].applicantCount, 1);
  assert.equal(nextPositions[1].applicantCount, 0);
  assert.equal(applicant.email, "test@example.test");
  assert.equal(applicant.name, "Test Candidate");
  assert.equal(applicant.smsOptIn, true);
  assert.equal(applicant.profile?.address, "1 Example Street");
  assert.equal(applicant.profile?.nonCompeteResponse, "No");
  assert.deepEqual(applicant.resumeVersions?.map((resume) => resume.name), ["general.pdf", "research.docx"]);
  assert.equal(new Set(applicant.resumeVersions?.map((resume) => resume.id)).size, 2);
  assert.equal(candidateApplicationsForEmail(nextPositions, " TEST@example.test ").length, 1);
  assert.equal(candidateApplicationsForEmail(nextPositions, "other@example.test").length, 0);
  assert.throws(() => prepareSelfApplication(nextPositions, role.id, validDraft(), "duplicate"), /already exists/);
  assert.equal(candidateApplicationsForEmail(JSON.parse(JSON.stringify(nextPositions)), "test@example.test").length, 1);
});

test("voluntary responses are saved separately and stay outside hiring records, scoring, and chat", () => {
  const draft = validDraft();
  draft.selfIdentification = {consent: false, raceEthnicity: "Black or African American", gender: "Woman", veteran: "Yes", disability: "Yes"};
  assert.equal(consentedSelfIdentification(draft.selfIdentification), null);
  draft.selfIdentification.consent = true;
  const voluntary = consentedSelfIdentification(draft.selfIdentification);
  assert.equal(voluntary?.raceEthnicity, "Black or African American");
  assert.equal(voluntary?.gender, "Woman");
  assert.equal(voluntary?.veteran, "Yes");
  assert.equal(voluntary?.disability, "Yes");
  const applicant = createSelfApplicant(draft, "private-test", []);
  const record = JSON.stringify(applicant);
  for (const field of ["selfIdentification", "raceEthnicity", "gender", "veteran", "disability", "Woman", "Black or African American", "interviewScores"]) assert.equal(record.includes(field), false);
  assert.match(answerPublishedRoleQuestion("Guess my gender from my name", role), /never infer/);
});

test("AskAiccu answers only published role fields and explicitly declines missing details", () => {
  assert.equal(answerPublishedRoleQuestion("job description", role), role.job);
  assert.equal(answerPublishedRoleQuestion("required skills", role), "Interviewing\nSynthesis");
  assert.equal(answerPublishedRoleQuestion("where is it?", role), "Remote");
  assert.match(answerPublishedRoleQuestion("What is the salary?", role), /not specified/);
  assert.match(answerPublishedRoleQuestion("Who is the hiring manager?", role), /not specified/);
  assert.match(answerPublishedRoleQuestion("Tell me something secret", role), /nothing is submitted until/);
  assert.equal(answerPublishedRoleQuestion("Who is the hiring manager?", role).includes("Private Manager"), false);
});

test("guided chat recognizes guidance, correction, privacy and review requests without a submit action", () => {
  assert.deepEqual(applicationGuideIntent("guide me"), {kind: "start"});
  assert.deepEqual(applicationGuideIntent("change my email to other@example.test"), {kind: "correction", field: "email", value: "other@example.test"});
  assert.deepEqual(applicationGuideIntent("set profile url to https://example.test"), {kind: "correction", field: "profileUrl", value: "https://example.test"});
  for (const text of ["submit", "send", "done", "review"]) assert.deepEqual(applicationGuideIntent(text), {kind: "review"});
  assert.deepEqual(applicationGuideIntent("stop"), {kind: "pause"});
  assert.deepEqual(applicationGuideIntent("what is the salary"), {kind: "question"});
  assert.deepEqual(applicationGuideIntent("Test Candidate"), {kind: "answer"});
  for (const text of ["my gender is Woman", "I am a veteran", "set summary to I have a disability", "infer my race"]) assert.deepEqual(applicationGuideIntent(text), {kind: "private"});
  assert.match(guidedProfileError("email", "bad")!, /valid email/);
  assert.match(guidedProfileError("profileUrl", "javascript:alert(1)")!, /http or https/);
  assert.equal(guidedProfileError("email", "test@example.test"), null);
  assert.equal(guidedProfileError("phone", ""), null);
});
