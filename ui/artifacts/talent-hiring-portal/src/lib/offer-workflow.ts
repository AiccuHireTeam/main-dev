import type { HiringPosition, RoleApplicant } from "../components/job-portal-pages.tsx";
import { hasHiringManagerAccess } from "./internal-access.ts";

export type OfferAction =
  | { type: "complete"; applicantId: string }
  | { type: "select"; applicantId: string; selected: boolean }
  | { type: "rank"; applicantId: string; rank: number }
  | { type: "process" }
  | { type: "accept"; applicantId: string }
  | { type: "close" };

export function offerSelectionError(applicants: RoleApplicant[]): string | null {
  const selected = applicants.filter((applicant) => applicant.selectedForOffer);
  if (selected.length !== 3) return "Select exactly three completed finalists.";
  if (selected.some((applicant) => applicant.finalInterviewCompleted !== true)) {
    return "Only candidates with a recorded completed final interview are eligible.";
  }
  const ranks = selected.map((applicant) => applicant.offerRank).sort();
  if (ranks.some((rank, index) => rank !== index + 1)) {
    return "Assign unique, consecutive offer ranks starting at 1.";
  }
  return null;
}

export function canManagePosition(
  role: string | undefined,
  email: string | undefined,
  position: HiringPosition,
): boolean {
  const sharedEmails = ["hiring.manager@demo.talent", "hr@demo.talent"];
  return hasHiringManagerAccess(role) && !!email &&
    (position.ownerEmail === email ||
      (sharedEmails.includes(email) && sharedEmails.includes(position.ownerEmail)));
}

function firstAvailableOfferRank(
  applicants: RoleApplicant[],
): 1 | 2 | 3 | undefined {
  const assignedRanks = new Set(
    applicants
      .filter((applicant) => applicant.selectedForOffer)
      .map((applicant) => applicant.offerRank),
  );
  return ([1, 2, 3] as const).find((rank) => !assignedRanks.has(rank));
}

export function applyOfferAction(
  position: HiringPosition,
  action: OfferAction,
  authorized: boolean,
): { position: HiringPosition; error?: string } {
  const reject = (error: string) => ({ position, error });
  if (!authorized) return reject("Only the position’s Hiring Manager or HR can manage offers.");
  if (position.status === "Closed") return reject("Closed jobs cannot be changed.");
  const applicants = position.applicants ?? [];
  if (action.type === "close") {
    return position.status === "Process Offer"
      ? { position: { ...position, status: "Closed" } }
      : reject("Process offers before closing the job.");
  }
  if (action.type === "accept") {
    if (position.status !== "Process Offer") return reject("Offers are not being processed.");
    const target = applicants.find((applicant) => applicant.id === action.applicantId);
    if (!target?.selectedForOffer || target.offerStatus !== "Pending") return reject("Select a pending offer.");
    return { position: { ...position, applicants: applicants.map((applicant) =>
      applicant.id === target.id ? { ...applicant, offerStatus: "Accepted" } : applicant,
    ) } };
  }
  if (action.type === "complete") {
    if (position.status !== "Final Interview scheduled") {
      return reject("Only scheduled final interviews can be completed.");
    }
    const target = applicants.find((applicant) => applicant.id === action.applicantId);
    if (!target?.finalInterviewScheduled) return reject("Only scheduled final interviews can be completed.");
    const nextApplicants = applicants.map((applicant) =>
      applicant.id === target.id
        ? { ...applicant, finalInterviewCompleted: true }
        : applicant,
    );
    const scheduledFinalists = nextApplicants.filter(
      (applicant) => applicant.finalInterviewScheduled,
    );
    const allFinalInterviewsCompleted =
      scheduledFinalists.length > 0 &&
      scheduledFinalists.every(
        (applicant) => applicant.finalInterviewCompleted === true,
      );
    return {
      position: {
        ...position,
        ...(allFinalInterviewsCompleted
          ? { status: "Final interviews completed" as const }
          : {}),
        applicants: nextApplicants,
      },
    };
  }
  if (position.status !== "Final interviews completed") return reject("Complete all scheduled final interviews first.");
  if (action.type === "process") {
    const error = offerSelectionError(applicants);
    if (error) return reject(error);
    return { position: { ...position, status: "Process Offer", applicants: applicants.map((applicant) =>
      applicant.selectedForOffer ? { ...applicant, offerStatus: "Pending" } : applicant,
    ) } };
  }
  const target = applicants.find((applicant) => applicant.id === action.applicantId);
  if (!target) return reject("Candidate not found.");
  if (target.finalInterviewCompleted !== true) return reject("Record final interview completion first.");
  if (action.type === "select") {
    if (action.selected && !target.selectedForOffer) {
      if (applicants.filter((applicant) => applicant.selectedForOffer).length >= 3) {
        return reject("A maximum of three finalists may be selected.");
      }
      const offerRank = firstAvailableOfferRank(applicants);
      if (!offerRank) return reject("No offer priority is available.");
      return {
        position: {
          ...position,
          applicants: applicants.map((applicant) =>
            applicant.id === target.id
              ? { ...applicant, selectedForOffer: true, offerRank }
              : applicant,
          ),
        },
      };
    }
    if (!action.selected) {
      return {
        position: {
          ...position,
          applicants: applicants.map((applicant) =>
            applicant.id === target.id
              ? { ...applicant, selectedForOffer: false, offerRank: undefined }
              : applicant,
          ),
        },
      };
    }
    return { position };
  }
  if (!Number.isInteger(action.rank) || action.rank < 1 || action.rank > 3) {
    return reject("Choose a priority from 1 to 3.");
  }
  if (
    !target.selectedForOffer &&
    applicants.filter((applicant) => applicant.selectedForOffer).length >= 3
  ) {
    return reject("A maximum of three finalists may be selected.");
  }
  if (
    applicants.some(
      (applicant) =>
        applicant.id !== target.id &&
        applicant.selectedForOffer &&
        applicant.offerRank === action.rank,
    )
  ) {
    return reject("That priority is already assigned to another finalist.");
  }
  return {
    position: {
      ...position,
      applicants: applicants.map((applicant) =>
        applicant.id === target.id
          ? {
              ...applicant,
              selectedForOffer: true,
              offerRank: action.rank as 1 | 2 | 3,
            }
          : applicant,
      ),
    },
  };
}
