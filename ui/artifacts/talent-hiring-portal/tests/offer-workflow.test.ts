import assert from "node:assert/strict";
import test from "node:test";
import { applyOfferAction, canManagePosition, offerSelectionError } from "../src/lib/offer-workflow.ts";
import type { HiringPosition, RoleApplicant } from "../src/components/job-portal-pages.tsx";

function fixture(): HiringPosition {
  return {
    id: "test", ownerEmail: "hiring.manager@demo.talent",
    status: "Final interviews completed",
    applicants: Array.from({ length: 4 }, (_, index) => ({
      id: String(index), name: `Finalist ${index}`, email: `f${index}@example.com`,
      appliedAt: "2026-11-01", rank: index + 1, resumeName: "sample.pdf",
      selectedForInterview: true, finalInterviewScheduled: true,
      finalInterviewCompleted: true,
    })),
  } as HiringPosition;
}
function select(position: HiringPosition, id: string, selected = true) {
  const result = applyOfferAction(position, { type: "select", applicantId: id, selected }, true);
  assert.equal(result.error, undefined);
  return result.position;
}
function processed() {
  let position = fixture();
  for (const id of ["0", "1", "2"]) position = select(position, id);
  return applyOfferAction(position, { type: "process" }, true).position;
}

test("scheduled, absent and false completion flags are not eligibility", () => {
  for (const flag of [undefined, false]) {
    const position = fixture();
    position.status = "Final Interview scheduled";
    position.applicants![0].finalInterviewCompleted = flag;
    assert.ok(applyOfferAction(position, { type: "select", applicantId: "0", selected: true }, true).error);
    assert.equal(position.applicants![0].finalInterviewCompleted, flag);
    const complete = applyOfferAction(position, { type: "complete", applicantId: "0" }, true);
    assert.equal(complete.position.applicants![0].finalInterviewCompleted, true);
  }
  const position = fixture();
  position.status = "Final Interview scheduled";
  position.applicants![0].finalInterviewScheduled = false;
  assert.ok(applyOfferAction(position, { type: "complete", applicantId: "0" }, true).error);
});

test("the role moves to Final interviews completed after every scheduled finalist is done", () => {
  const position = fixture();
  position.status = "Final Interview scheduled";
  position.applicants![0].finalInterviewCompleted = false;
  position.applicants![1].finalInterviewCompleted = false;

  const firstComplete = applyOfferAction(
    position,
    { type: "complete", applicantId: "0" },
    true,
  ).position;
  assert.equal(firstComplete.status, "Final Interview scheduled");

  const allComplete = applyOfferAction(
    firstComplete,
    { type: "complete", applicantId: "1" },
    true,
  ).position;
  assert.equal(allComplete.status, "Final interviews completed");
  assert.equal(position.status, "Final Interview scheduled", "completion leaves the old value unchanged");
});

test("zero, four, incomplete, missing and duplicate ranks cannot process", () => {
  assert.ok(applyOfferAction(fixture(), { type: "process" }, true).error);
  const invalidSelections: Partial<RoleApplicant>[][] = [
    [1, 2, 3, 4].map((rank) => ({ offerRank: rank as 1 })),
    [{ offerRank: 1 }, { offerRank: 1 }],
    [{ offerRank: undefined }],
    [{ offerRank: 2 }],
    [{ offerRank: 1 }, { offerRank: 3 }],
    [{ offerRank: 1, finalInterviewCompleted: false }],
  ];
  for (const selection of invalidSelections) {
    const position = fixture();
    position.applicants = selection.map((values, index) => ({
      ...position.applicants![index], selectedForOffer: true, ...values,
    }));
    assert.ok(offerSelectionError(position.applicants));
    assert.equal(applyOfferAction(position, { type: "process" }, true).position, position);
  }
});

test("selection caps at three; checkbox selection assigns the next free rank", () => {
  let position = fixture();
  for (const id of ["0", "1", "2"]) position = select(position, id);
  assert.ok(applyOfferAction(position, { type: "select", applicantId: "3", selected: true }, true).error);
  assert.deepEqual(position.applicants!.map((a) => a.offerRank), [1, 2, 3, undefined]);
  assert.ok(applyOfferAction(position, { type: "rank", applicantId: "2", rank: 1 }, true).error);
  position = select(position, "0", false);
  assert.deepEqual(position.applicants!.map((a) => a.offerRank), [undefined, 2, 3, undefined]);
  assert.ok(offerSelectionError(position.applicants!), "two finalists are not enough to process");
  position = applyOfferAction(position, { type: "rank", applicantId: "3", rank: 1 }, true).position;
  assert.deepEqual(position.applicants!.map((a) => a.offerRank), [undefined, 2, 3, 1]);
  assert.equal(offerSelectionError(position.applicants!), null);
  position = select(position, "2", false);
  assert.equal(position.applicants![1].offerRank, 2);
  assert.ok(offerSelectionError(position.applicants!), "deselection returns the role to an incomplete state");
  assert.ok(applyOfferAction(position, { type: "rank", applicantId: "0", rank: 2 }, true).error);
  assert.deepEqual(position.applicants!.map((a) => a.rank), [1, 2, 3, 4]);
});

test("priority dropdown selects completed candidates and prevents duplicate priorities", () => {
  let position = fixture();
  position = applyOfferAction(position, { type: "rank", applicantId: "0", rank: 1 }, true).position;
  position = applyOfferAction(position, { type: "rank", applicantId: "1", rank: 2 }, true).position;
  assert.equal(position.applicants![0].selectedForOffer, true);
  assert.equal(position.applicants![1].selectedForOffer, true);
  assert.ok(applyOfferAction(position, { type: "rank", applicantId: "2", rank: 1 }, true).error);
  position = applyOfferAction(position, { type: "rank", applicantId: "2", rank: 3 }, true).position;
  assert.equal(offerSelectionError(position.applicants!), null);
  assert.ok(applyOfferAction(position, { type: "rank", applicantId: "3", rank: 1 }, true).error);
});

test("processing records pending offers; acceptance neither closes nor withdraws", () => {
  const position = processed();
  assert.equal(position.status, "Process Offer");
  assert.deepEqual(position.applicants!.map((a) => a.offerStatus), ["Pending", "Pending", "Pending", undefined]);
  const accepted = applyOfferAction(position, { type: "accept", applicantId: "1" }, true).position;
  assert.equal(accepted.status, "Process Offer");
  assert.deepEqual(accepted.applicants!.map((a) => a.offerStatus), ["Pending", "Accepted", "Pending", undefined]);
  assert.deepEqual(position.applicants![1].offerStatus, "Pending", "mutations must not alter old state");
});

test("manual closure accepts any acceptance count, retains facts and blocks every offer action", () => {
  for (const accept of [false, true]) {
    let position = processed();
    if (accept) position = applyOfferAction(position, { type: "accept", applicantId: "0" }, true).position;
    const closed = applyOfferAction(position, { type: "close" }, true).position;
    assert.equal(closed.status, "Closed");
    assert.deepEqual(closed.applicants, position.applicants);
    for (const action of [
      { type: "process" }, { type: "close" }, { type: "accept", applicantId: "1" },
      { type: "complete", applicantId: "1" }, { type: "rank", applicantId: "1", rank: 1 },
      { type: "select", applicantId: "1", selected: false },
    ] as const) {
      assert.equal(applyOfferAction(closed, action, true).position, closed);
    }
    const restored: HiringPosition = JSON.parse(JSON.stringify(closed));
    assert.equal(restored.status, "Closed");
    assert.deepEqual(
      restored.applicants!.map(({ id, offerRank, selectedForOffer, finalInterviewCompleted, offerStatus }) =>
        ({ id, offerRank, selectedForOffer, finalInterviewCompleted, offerStatus })),
      closed.applicants!.map(({ id, offerRank, selectedForOffer, finalInterviewCompleted, offerStatus }) =>
        ({ id, offerRank, selectedForOffer, finalInterviewCompleted, offerStatus })),
      "browser JSON persistence retains offer facts",
    );
  }
  assert.ok(applyOfferAction(fixture(), { type: "close" }, true).error);
});

test("internal shared HR/manager pool only; unauthorized actions cannot mutate", () => {
  const position = fixture();
  for (const email of ["hr@demo.talent", "hiring.manager@demo.talent"]) {
    assert.equal(canManagePosition("Hiring Manager", email, position), true);
  }
  assert.equal(
    canManagePosition(
      "Admin + Hiring Manager / HR",
      position.ownerEmail,
      position,
    ),
    true,
  );
  for (const role of ["Candidate", "Stakeholder", "Admin", undefined]) {
    assert.equal(canManagePosition(role, position.ownerEmail, position), false);
  }
  assert.equal(canManagePosition("Hiring Manager", "other@example.com", position), false);
  for (const action of [
    { type: "complete", applicantId: "0" }, { type: "select", applicantId: "0", selected: true },
    { type: "rank", applicantId: "0", rank: 1 }, { type: "process" },
    { type: "accept", applicantId: "0" }, { type: "close" },
  ] as const) assert.equal(applyOfferAction(position, action, false).position, position);
});
