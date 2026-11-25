import type { HiringPosition, RoleApplicant } from "../components/job-portal-pages";

export type ApplicationProfile = {
  name: string;
  email: string;
  phone: string;
  address: string;
  location: string;
  profileUrl: string;
  summary: string;
  nonCompeteResponse: string;
};
export type ResumeVersion = { id: string; name: string; size: number; type: string };
export type SelfIdentification = {
  consent: boolean;
  raceEthnicity: string;
  gender: string;
  veteran: string;
  disability: string;
};
export type ApplicationDraft = {
  profile: ApplicationProfile;
  files: File[];
  smsOptIn: boolean;
  selfIdentification: SelfIdentification;
};
export type SubmissionResult = { id?: string; error?: string; warning?: string };
export const emptyApplication = (email = ""): ApplicationDraft => ({
  profile: { name: "", email, phone: "", address: "", location: "", profileUrl: "", summary: "", nonCompeteResponse: "" },
  files: [],
  smsOptIn: false,
  selfIdentification: { consent: false, raceEthnicity: "", gender: "", veteran: "", disability: "" },
});
// Open is the portal's published, accepting-applications state. Later pipeline
// stages do not accept new public applicants.
export function isAcceptingApplications(position: Pick<HiringPosition, "status">) {
  return position.status === "Open";
}
export function validateApplication(draft: ApplicationDraft): string[] {
  const errors: string[] = [];
  if (!draft.profile.name.trim()) errors.push("Enter your full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.profile.email.trim())) errors.push("Enter a valid email address.");
  if (!draft.profile.phone.trim()) errors.push("Enter your phone number.");
  if (!draft.profile.address.trim()) errors.push("Enter your address.");
  if (!["Yes", "No", "Not sure"].includes(draft.profile.nonCompeteResponse)) errors.push("Answer the non-compete question.");
  if (draft.profile.profileUrl.trim()) {
    try {
      const url = new URL(draft.profile.profileUrl);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch { errors.push("Enter an http or https profile URL, or leave it blank."); }
  }
  return [...errors, ...validateResumeFiles(draft.files)];
}

export function validateResumeFiles(files: File[]): string[] {
  const errors: string[] = [];
  if (!files.length) errors.push("Select at least one resume.");
  if (files.length > 5) errors.push("Select no more than five resume versions.");
  for (const file of files) {
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) errors.push(`${file.name}: choose a PDF, DOC, or DOCX resume.`);
    if (file.size === 0 || file.size > 15 * 1024 * 1024) errors.push(`${file.name}: files must be nonempty and 15 MB or smaller.`);
  }
  return errors;
}
export function createSelfApplicant(draft: ApplicationDraft, id: string, applicants: RoleApplicant[], now = new Date()): RoleApplicant {
  const errors = validateApplication(draft);
  if (errors.length) throw new Error(errors.join(" "));
  const profile = Object.fromEntries(Object.entries(draft.profile).map(([key, value]) => [key, value.trim()])) as ApplicationProfile;
  profile.email = profile.email.toLowerCase();
  return {
    id, name: profile.name, email: profile.email, profile,
    appliedAt: now.toISOString().slice(0, 10),
    rank: Math.max(0, ...applicants.map((applicant) => applicant.rank)) + 1,
    resumeName: draft.files[0].name,
    resumeVersions: draft.files.map((file, index) => ({ id: `${id}-resume-${index + 1}`, name: file.name, size: file.size, type: file.type })),
    selectedForInterview: false, source: "self-application", smsOptIn: draft.smsOptIn,
  };
}
export function candidateApplicationsForEmail(positions: HiringPosition[], email: string) {
  return positions.flatMap((position) => (position.applicants ?? [])
    .filter((applicant) => applicant.source === "self-application" && applicant.email === email.trim().toLowerCase())
    .map((applicant) => ({ position, applicant })));
}

export function prepareSelfApplication(positions: HiringPosition[], positionId: string, draft: ApplicationDraft, id: string) {
  const position = positions.find((item) => item.id === positionId);
  if (!position || !isAcceptingApplications(position)) throw new Error("This role is no longer accepting applications. Browse another open role.");
  if ((position.applicants ?? []).some((applicant) => applicant.email.toLowerCase() === draft.profile.email.trim().toLowerCase()))
    throw new Error("An application with this email already exists for this role. View your applications instead.");
  const applicant = createSelfApplicant(draft, id, position.applicants ?? []);
  const nextPositions = positions.map((item) => item.id === positionId ? {
    ...item,
    applicants: [...(item.applicants ?? []), applicant],
    applicantCount: Math.max(item.applicantCount, item.applicants?.length ?? 0) + 1,
  } : item);
  return { applicant, nextPositions };
}

export function consentedSelfIdentification(value: SelfIdentification) {
  return value.consent ? {
    consent: true,
    raceEthnicity: value.raceEthnicity,
    gender: value.gender,
    veteran: value.veteran,
    disability: value.disability,
  } : null;
}

export function answerPublishedRoleQuestion(question: string, role: HiringPosition): string {
  const q = question.toLowerCase();
  if (/\b(gender|veteran|disability|demographic|race|ethnicity|infer|protected)\b/.test(q))
    return "Self-identification is entirely voluntary. Use the separate optional section or skip it. I never infer demographic attributes or use them to evaluate you.";
  if (/\b(salary|pay|compensation)\b/.test(q)) return role.salaryRange || "A salary range is not specified in this published role.";
  if (/\b(benefit|benefits)\b/.test(q)) return role.benefits?.join(", ") || "Benefits are not specified in this published role.";
  if (/\b(location|remote|where)\b/.test(q)) return role.location || "Location is not specified in this published role.";
  if (/\b(deadline|closing|due)\b/.test(q)) return role.jobPostingDeadline ? `Published posting deadline: ${role.jobPostingDeadline}. Applications are accepted while the role is Open in this demo.` : "A posting deadline is not specified in this published role.";
  if (/\b(skill|skills|requirement|requirements|qualifications)\b/.test(q)) return [role.skill, role.capability].filter(Boolean).join("\n") || "Requirements are not specified in this published role.";
  if (/\b(description|responsibilities|role|job|work)\b/.test(q)) return role.job || "A description is not specified in this published role.";
  return "That information is not specified in the published details I can use. Ask about the description, skills, location, salary, benefits, or deadline. Say “guide me” for help uploading resume versions; nothing is submitted until you review and explicitly confirm.";
}
