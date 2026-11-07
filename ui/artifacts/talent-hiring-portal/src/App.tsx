import { type FormEvent, type ReactNode, useState } from "react";
import aiccuhireLogo from "./assets/aiccuhire-logo.jpg";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Route, Switch, useLocation, useRoute, Router as WouterRouter } from "wouter";
import { CandidateInterviewRoom } from "@/components/candidate-interview-room";
import { CandidateApplicationChat } from "@/components/candidate-application-chat";
import { applyOfferAction, canManagePosition, type OfferAction } from "@/lib/offer-workflow";
import {
  getRoleLandingPath,
  hasAdminAccess,
  hasDashboardAccess,
  hasHiringManagerAccess,
  hasViewerOnlyAccess,
  type WorkspaceRole,
} from "@/lib/internal-access";
import {
  CreatePositionPage,
  createRequisitionId,
  type PositionFormValues,
} from "@/components/create-position-form";
import {
  JobPortalPage,
  type HiringPosition,
  type RoleApplicant,
} from "@/components/job-portal-pages";
import {
  RoleDetailsPage,
  type NewRoleApplicant,
} from "@/components/role-details-page";
import {
  StakeholderFeedbackWorkspace,
  type StakeholderAnswerSet,
  type StakeholderJob,
} from "@/components/stakeholder-feedback-workspace";
import {
  AdminPanelPage,
  type AdminPanelSettings,
  type AdminUserRecord,
  type NewAdminUser,
} from "@/components/admin-panel-page";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CircleHelp,
  Clock3,
  FileText,
  KeyRound,
  LogOut,
  Mail,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  X,
  Building2,
  LockKeyhole,
  CheckCircle2,
  ClipboardCheck,
} from "lucide-react";

const queryClient = new QueryClient();
type Role =
  | "Candidate"
  | "Stakeholder"
  | "Admin"
  | "Hiring Manager"
  | "Admin + Hiring Manager / HR"
  | "Viewer";
type AccountKind = "candidate" | "stakeholder" | "internal" | null;
type UserSession = { role: Role; email: string; roles: WorkspaceRole[] };
type StakeholderFeedbackState = {
  answers: Record<string, StakeholderAnswerSet>;
  submittedJobIds: string[];
};
type UploadedResume = {
  id: string;
  name: string;
  updated: string;
  current: boolean;
};
type CandidateFollowUpState = {
  answers: Record<string, string>;
  submitted: boolean;
  resumeName?: string;
};
const candidateDemo = "maya.chen@demo.talent";
const stakeholderDemo = "alex.morgan@demo.talent";
const candidateFollowUpStoragePrefix = "aiccuhire-candidate-follow-up:";
const adminUsersStorageKey = "aiccuhire-admin-user-directory";
const adminSettingsStorageKey = "aiccuhire-admin-settings";
const defaultAdminUsers: AdminUserRecord[] = [
  {
    id: "demo-admin",
    firstName: "AiccuHire",
    lastName: "Admin",
    email: "admin@demo.talent",
    roles: ["Admin"],
  },
  {
    id: "demo-hiring-manager",
    firstName: "Priya",
    lastName: "Nair",
    email: "hiring.manager@demo.talent",
    roles: ["Hiring Manager"],
  },
  {
    id: "demo-hr",
    firstName: "Taylor",
    lastName: "Reed",
    email: "hr@demo.talent",
    roles: ["Hiring Manager"],
  },
];
const demoHiringManagerEmails = defaultAdminUsers
  .filter((user) => user.roles.includes("Hiring Manager"))
  .map((user) => user.email);
const defaultAdminSettings: AdminPanelSettings = {
  requireSsoForInternal: false,
  requireOtpForExternal: true,
  allowViewerDashboard: true,
};
const demoPassword = "welcome123";
const demoOtp = "246810";
const candidateFollowUpQuestions = [
  {
    id: "design-systems",
    focus: "Skills",
    prompt:
      "Your resume highlights design-system work. Which skill from that experience would you bring to this role, and why?",
  },
  {
    id: "end-to-end",
    focus: "Capabilities",
    prompt:
      "Describe a complex product-design problem you owned from discovery through launch. What changed because of your work?",
  },
  {
    id: "feedback",
    focus: "Collaboration",
    prompt:
      "Tell us about a time you received challenging feedback on a design. How did you respond, and what did you change?",
  },
  {
    id: "work-style",
    focus: "Personality & work style",
    prompt:
      "What kind of team environment helps you do your best work, and how do you typically respond when priorities change?",
  },
];

function candidateFollowUpStorageKey(email: string) {
  return `${candidateFollowUpStoragePrefix}${email.trim().toLowerCase()}`;
}

function loadCandidateFollowUp(email: string): CandidateFollowUpState {
  try {
    const saved = localStorage.getItem(candidateFollowUpStorageKey(email));
    if (!saved) return { answers: {}, submitted: false };
    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object") {
      return { answers: {}, submitted: false };
    }
    const value = parsed as Partial<CandidateFollowUpState>;
    const answers =
      value.answers && typeof value.answers === "object"
        ? Object.fromEntries(
            Object.entries(value.answers).filter(
              ([, answer]) => typeof answer === "string",
            ),
          )
        : {};
    return {
      answers,
      submitted: value.submitted === true,
      resumeName:
        typeof value.resumeName === "string" ? value.resumeName : undefined,
    };
  } catch {
    return { answers: {}, submitted: false };
  }
}

function persistCandidateFollowUp(
  email: string,
  followUp: CandidateFollowUpState,
) {
  try {
    localStorage.setItem(
      candidateFollowUpStorageKey(email),
      JSON.stringify(followUp),
    );
  } catch (error) {
    console.error("Unable to save the candidate follow-up in this browser.", error);
  }
}

function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return value === "Admin" || value === "Hiring Manager" || value === "Viewer";
}

function legacyUserTypeRoles(value: unknown): WorkspaceRole[] {
  if (value === "Admin") return ["Admin"];
  if (value === "Hiring Manager / HR" || value === "Hiring Manager") {
    return ["Hiring Manager"];
  }
  if (value === "Viewer") return ["Viewer"];
  if (value === "Admin + Hiring Manager / HR") {
    return ["Admin", "Hiring Manager"];
  }
  return [];
}

function rolesFromLegacySession(role: string): WorkspaceRole[] {
  return legacyUserTypeRoles(role);
}

function loadAdminUsers(): AdminUserRecord[] {
  try {
    const saved = localStorage.getItem(adminUsersStorageKey);
    if (!saved) return defaultAdminUsers;
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return defaultAdminUsers;
    const usersByEmail = new Map(
      defaultAdminUsers.map((user) => [user.email, user]),
    );
    for (const value of parsed) {
      if (
        !value ||
        typeof value !== "object" ||
        !("id" in value) ||
        !("firstName" in value) ||
        !("lastName" in value) ||
        !("email" in value) ||
        typeof value.id !== "string" ||
        typeof value.firstName !== "string" ||
        typeof value.lastName !== "string" ||
        typeof value.email !== "string"
      ) {
        continue;
      }
      const email = value.email.trim().toLowerCase();
      if (!email || usersByEmail.has(email)) continue;
      const userRoles: WorkspaceRole[] =
        "roles" in value && Array.isArray(value.roles)
          ? value.roles.filter(isWorkspaceRole)
          : legacyUserTypeRoles("userType" in value ? value.userType : undefined);
      const roles: WorkspaceRole[] = [...new Set(userRoles)];
      if (roles.length === 0) continue;
      usersByEmail.set(email, {
        id: value.id,
        firstName: value.firstName,
        lastName: value.lastName,
        email,
        roles,
      });
    }
    return [...usersByEmail.values()];
  } catch (error) {
    console.error("Unable to load the browser demo user directory.", error);
    return defaultAdminUsers;
  }
}

function loadAdminSettings(): AdminPanelSettings {
  try {
    const saved = localStorage.getItem(adminSettingsStorageKey);
    if (!saved) return defaultAdminSettings;
    const parsed = JSON.parse(saved) as Partial<AdminPanelSettings>;
    return {
      requireSsoForInternal:
        typeof parsed.requireSsoForInternal === "boolean"
          ? parsed.requireSsoForInternal
          : defaultAdminSettings.requireSsoForInternal,
      requireOtpForExternal:
        typeof parsed.requireOtpForExternal === "boolean"
          ? parsed.requireOtpForExternal
          : defaultAdminSettings.requireOtpForExternal,
      allowViewerDashboard:
        typeof parsed.allowViewerDashboard === "boolean"
          ? parsed.allowViewerDashboard
          : defaultAdminSettings.allowViewerDashboard,
    };
  } catch (error) {
    console.error("Unable to load browser demo configuration.", error);
    return defaultAdminSettings;
  }
}

const seedJobs = [
  {
    id: "product-lead",
    title: "Senior Product Designer",
    company: "Northstar Studio",
    location: "Remote · US",
    date: "Applied May 14",
    status: "In review",
    detail:
      "Your portfolio is with the design team. They’re reviewing your approach to systems thinking and product craft.",
    next: "We’ll share an update by May 28.",
  },
  {
    id: "researcher",
    title: "UX Researcher",
    company: "Fieldnote",
    location: "Brooklyn, NY",
    date: "Applied May 09",
    status: "Interviewing",
    detail:
      "Your first conversation went well. The team would like to meet again for a research case discussion.",
    next: "Next up: 45-minute conversation with the research lead.",
  },
  {
    id: "brand-designer",
    title: "Brand Designer",
    company: "Common Ground",
    location: "New York, NY",
    date: "Applied Apr 27",
    status: "Application received",
    detail:
      "Your application is in. The hiring team is reviewing applications and will be in touch soon.",
    next: "No action needed right now.",
  },
  {
    id: "future-consideration",
    title: "Product Design Lead",
    company: "Common Ground",
    location: "New York, NY",
    date: "Applied Apr 18",
    status: "For future consideration",
    detail:
      "The team sees potential alignment and may reach out when a suitable opening becomes available.",
    next: "No action is needed right now.",
  },
  {
    id: "product-follow-up",
    title: "Senior Product Designer",
    company: "Northstar Studio",
    location: "Remote · US",
    date: "Applied May 12",
    status: "Follow-up Requested",
    detail:
      "The design team would like an updated resume and a little more context about your design-system experience, end-to-end ownership, collaboration, and work style.",
    next: "Update your resume and respond to four short questions for this position.",
  },
];
const stakeholderQuestionBank: Record<string, { id: string; prompt: string }[]> = {
  "REQ-2026-3IU87C13": [
    { id: "product-q1", prompt: "What should success look like in the first six months?" },
    { id: "product-q2", prompt: "Which cross-functional partnerships are most important for this role?" },
    { id: "product-q3", prompt: "What risks should the hiring team consider for this position?" },
  ],
  "REQ-2026-8ZM41P6Q": [
    { id: "research-q1", prompt: "Which research methods are most critical for this role?" },
    { id: "research-q2", prompt: "How should research findings reach product decision-makers?" },
    { id: "research-q3", prompt: "What would make this person successful on your team?" },
  ],
};
const genericStakeholderQuestions = [
  { id: "role-q1", prompt: "What should success look like in the first six months?" },
  { id: "role-q2", prompt: "Which skills are most important for this position?" },
  { id: "role-q3", prompt: "What additional context should the hiring team consider?" },
];
const people = [
  {
    initials: "PN",
    name: "Priya Nair",
    role: "Product Design Lead",
    stage: "Team review",
    age: "2 days",
  },
  {
    initials: "TW",
    name: "Theo Williams",
    role: "Senior UX Researcher",
    stage: "Interview",
    age: "4 days",
  },
  {
    initials: "JL",
    name: "Jordan Lee",
    role: "People Operations Partner",
    stage: "Offer",
    age: "1 day",
  },
  {
    initials: "MC",
    name: "Maya Chen",
    role: "Senior Product Designer",
    stage: "Application review",
    age: "3 days",
  },
];
const candidateExperience = [
  {
    title: "Senior Product Designer",
    company: "Northstar Studio",
    dates: "2022–Present",
    detail:
      "Leads product design across discovery, prototyping, and design-system improvements for core workflows.",
  },
  {
    title: "Product Designer",
    company: "Harborline",
    dates: "2019–2022",
    detail:
      "Partnered with research and engineering to simplify onboarding and improve customer self-service.",
  },
];
const candidateSkills = [
  "Product design",
  "UX research",
  "Design systems",
  "Figma",
  "Prototyping",
  "Accessibility",
  "Workshop facilitation",
];
const positionsStorageKey = "aiccuhire-hiring-positions";
const demoApplicantFirstNames = [
  "Avery", "Jordan", "Riley", "Morgan", "Taylor", "Casey",
  "Jamie", "Cameron", "Quinn", "Drew", "Parker", "Reese",
  "Skyler", "Rowan", "Emery", "Dakota", "Robin", "Alex",
];
const demoApplicantLastNames = [
  "Chen", "Patel", "Brooks", "Kim", "Rivera", "Singh",
  "Park", "Morgan", "Bennett", "Reyes", "Nguyen", "Shah",
  "Carter", "Lee", "Wilson", "Diaz", "Foster", "Price",
];

function createDemoApplicants(positionId: string, count: number): RoleApplicant[] {
  return Array.from({ length: count }, (_, index) => {
    const firstName = demoApplicantFirstNames[index % demoApplicantFirstNames.length];
    const lastName =
      demoApplicantLastNames[(index + positionId.length) % demoApplicantLastNames.length];
    const appliedAt = new Date(Date.UTC(2026, 9, 31 - index * 2))
      .toISOString()
      .slice(0, 10);
    return {
      id: `${positionId}-applicant-${String(index + 1).padStart(2, "0")}`,
      name: `${firstName} ${lastName}`,
      email: `${firstName}.${lastName}@example.com`.toLowerCase(),
      appliedAt,
      rank: index + 1,
      resumeName: `${firstName}_${lastName}_Resume.pdf`,
      selectedForInterview: false,
    };
  });
}

function stableSeed(value: string) {
  return Array.from(value).reduce(
    (seed, character) => seed + character.charCodeAt(0),
    0,
  );
}

function createMockInterviewRecord(
  seed: number,
  cohortSize = 5,
): Pick<
  RoleApplicant,
  | "interviewed"
  | "interviewedAt"
  | "interviewSummary"
  | "interviewScores"
  | "assessmentDetails"
> {
  const scoreSets = [
    { roleFit: 4.7, problemSolving: 4.5, communication: 4.6, collaboration: 4.8, overall: 4.7 },
    { roleFit: 4.3, problemSolving: 4.7, communication: 4.2, collaboration: 4.4, overall: 4.4 },
    { roleFit: 4.5, problemSolving: 4.2, communication: 4.6, collaboration: 4.3, overall: 4.4 },
    { roleFit: 4.1, problemSolving: 4.4, communication: 4.5, collaboration: 4.2, overall: 4.3 },
    { roleFit: 4.6, problemSolving: 4.1, communication: 4.3, collaboration: 4.5, overall: 4.4 },
  ];
  const index = Math.abs(seed) % scoreSets.length;
  const scores = scoreSets[index];
  const rating = (base: number, shift = 0) =>
    `${Math.max(1, Math.min(5, base + shift)).toFixed(1)} / 5`;
  return {
    interviewed: true,
    interviewedAt: new Date(Date.UTC(2026, 9, 30 - (index % 6)))
      .toISOString()
      .slice(0, 10),
    interviewSummary:
      index === 0
        ? "Strong product judgment, clear prioritization, and a practical approach to cross-functional delivery."
        : "Demonstrated solid role knowledge and thoughtful collaboration during the interview.",
    interviewScores: scores,
    assessmentDetails: {
      transcriptQa:
        "Q1 — How would you prioritize a portfolio with competing requests?\nA1 — I would align teams on shared outcomes, compare impact and effort, and make trade-offs visible.\n\nQ2 — Describe a process improvement you led.\nA2 — I introduced a lightweight planning cadence and reviewed delivery signals with partner teams.",
      personalityOCEAN:
        `Openness: ${rating(4.2, index % 2 ? -0.2 : 0.2)} · Conscientiousness: ${rating(4.4, index % 2 ? -0.1 : 0.2)} · Extraversion: ${rating(3.8, index % 2 ? -0.2 : 0.2)} · Agreeableness: ${rating(4.1, index % 2 ? -0.1 : 0.2)} · Neuroticism: ${rating(2.3, index % 2 ? 0.2 : -0.2)}`,
      enneagramObject:
        `Type ${index % 2 ? "1 — The Reformer" : "3 — The Achiever"}\nMotivation: deliver meaningful outcomes and help teams make progress.`,
      aOrBObject:
        `A — structured planning: ${rating(4.3, index % 2 ? -0.1 : 0.2)}\nB — adaptive iteration: ${rating(4.2, index % 2 ? 0.2 : -0.1)}\nProfile: balances planning with adjustment as new evidence appears.`,
      skillAnalysisObject: `Portfolio planning: ${rating(scores.roleFit)} · Product operations: ${rating(scores.problemSolving)} · Analytics: ${rating(scores.communication)} · Executive communication: ${rating(scores.collaboration)}`,
      conjugateSkillObject:
        "Pairs portfolio prioritization with clear stakeholder communication; demonstrated in the planning scenario.",
      conversationalResponsiveness: rating(scores.communication),
      conversationAssimilation: rating(scores.collaboration),
      roleplayAnalysis:
        "Handled a simulated cross-team planning discussion with clear trade-offs and collaborative follow-up.",
      mathematicalReasoning: rating(scores.problemSolving),
      spatialReasoning: rating(3.8, index % 2 ? 0.3 : 0.1),
      languageReasoning: rating(scores.communication),
      outlierRanking: `Top ${10 + index * 5}% in this demo cohort`,
      challengeResponseRanking: `#${index + 1} of ${Math.max(cohortSize, 1)} demo candidates`,
      noisyThinking: `Low · ${rating(1.6, index % 3 ? 0.2 : 0)}`,
      organizationalAwareness: rating(scores.collaboration),
      roleAwareness: rating(scores.roleFit),
      teamRoleplay: rating(scores.collaboration),
      curiosity: rating(4.2, index % 2 ? -0.1 : 0.2),
    },
  };
}

function createDemoInterviewedApplicants(
  positionId: string,
  count: number,
): RoleApplicant[] {
  return createDemoApplicants(positionId, count).map((applicant, index) => ({
    ...applicant,
    ...createMockInterviewRecord(index, count),
  }));
}

function createDemoFinalists(positionId: string, count: number): RoleApplicant[] {
  return createDemoInterviewedApplicants(positionId, count).map(
    (applicant) => ({
      ...applicant,
      selectedForFinalInterview: true,
      finalInterviewScheduled: true,
      finalInterviewCompleted: true,
    }),
  );
}

function createDemoOfferCandidates(
  positionId: string,
  accepted: boolean,
): RoleApplicant[] {
  return createDemoInterviewedApplicants(positionId, 3).map(
    (applicant, index) => {
      const selectedForOffer = index < 2;
      return {
        ...applicant,
        selectedForFinalInterview: selectedForOffer,
        finalInterviewScheduled: selectedForOffer,
        finalInterviewCompleted: selectedForOffer,
        selectedForOffer,
        ...(selectedForOffer
          ? {
              offerRank: (index + 1) as 1 | 2,
              offerStatus: accepted
                ? index === 0
                  ? ("Accepted" as const)
                  : ("Withdrawn" as const)
                : ("Pending" as const),
            }
          : {}),
      };
    },
  );
}

const demoHiringPositions: HiringPosition[] = [
  {
    id: "AH-2491",
    requisitionId: "REQ-2026-3IU87C13",
    position: "Senior Product Manager",
    hiringManager: "Priya Nair",
    positionType: "New",
    department: "Product",
    priority: "High",
    salaryGrade: "L6",
    location: "New York, NY · Hybrid",
    stakeholders: ["alex.morgan@demo.talent"],
    jobPostingDeadline: "2026-11-15",
    recruitmentDeadline: "2026-12-15",
    job: "Lead product strategy for the core platform and deliver measurable customer outcomes.",
    skill: "Product strategy, discovery, roadmap planning, and analytics.",
    capability: "Build alignment across design, engineering, and business teams.",
    additionalRole: "",
    verticalGrowth: "Opportunity to grow into a group product leadership role.",
    otherDetails: "Partner closely with the Northstar Studio leadership team.",
    status: "Open",
    createdAt: "2026-10-20",
    applicantCount: 18,
    ownerEmail: "hiring.manager@demo.talent",
    applicants: createDemoApplicants("AH-2491", 18),
  },
  {
    id: "AH-2473",
    requisitionId: "REQ-2026-8ZM41P6Q",
    position: "Senior UX Researcher",
    hiringManager: "Jordan Lee",
    positionType: "New",
    department: "Research",
    priority: "Medium",
    salaryGrade: "L5",
    location: "Brooklyn, NY",
    stakeholders: ["alex.morgan@demo.talent"],
    jobPostingDeadline: "",
    recruitmentDeadline: "",
    job: "Lead research across discovery, concept testing, and product iteration.",
    skill: "Qualitative research, usability testing, and research synthesis.",
    capability: "Translate customer evidence into clear product recommendations.",
    additionalRole: "",
    verticalGrowth: "",
    otherDetails: "",
    status: "Open",
    createdAt: "2026-09-18",
    applicantCount: 12,
    ownerEmail: "hiring.manager@demo.talent",
    applicants: createDemoApplicants("AH-2473", 12),
  },
  {
    id: "AH-2468",
    requisitionId: "REQ-2026-6NK20D4R",
    position: "Product Design Manager",
    hiringManager: "Priya Nair",
    positionType: "Replacement",
    department: "Design",
    priority: "Medium",
    salaryGrade: "L6",
    location: "Remote · US",
    stakeholders: [],
    jobPostingDeadline: "",
    recruitmentDeadline: "",
    job: "Guide a product design team delivering accessible, research-led experiences.",
    skill: "Product design, design systems, and prototyping.",
    capability: "Coach designers and align partners around a clear product vision.",
    additionalRole: "",
    verticalGrowth: "",
    otherDetails: "",
    status: "Draft",
    createdAt: "2026-09-02",
    applicantCount: 0,
    ownerEmail: "hiring.manager@demo.talent",
    applicants: [],
  },
  {
    id: "AH-2514",
    requisitionId: "REQ-2026-5RT84L2M",
    position: "Product Operations Lead",
    hiringManager: "Priya Nair",
    positionType: "New",
    department: "Product",
    priority: "High",
    salaryGrade: "L5",
    location: "Remote · US",
    stakeholders: [],
    jobPostingDeadline: "",
    recruitmentDeadline: "2026-11-30",
    job: "Build the operating rhythm that helps product teams plan, deliver, and learn effectively.",
    skill: "Product operations, planning, process design, and clear written communication.",
    capability: "Bring teams together and turn complex work into practical next steps.",
    additionalRole: "",
    verticalGrowth: "Room to grow into broader product operations leadership.",
    otherDetails: "Partner across Product, Design, and Engineering.",
    status: "Ready for Interview",
    createdAt: "2026-10-28",
    applicantCount: 4,
    ownerEmail: "hiring.manager@demo.talent",
    applicants: createDemoApplicants("AH-2514", 4),
  },
  {
    id: "AH-2520",
    requisitionId: "REQ-2026-8KZ31M6P",
    position: "Director of Product Operations",
    hiringManager: "Priya Nair",
    positionType: "New",
    department: "Product",
    priority: "High",
    salaryGrade: "L7",
    location: "New York, NY · Hybrid",
    stakeholders: [],
    jobPostingDeadline: "2026-10-20",
    recruitmentDeadline: "2026-12-20",
    job: "Lead operating strategy across product teams and improve how the organization plans, prioritizes, and delivers.",
    skill: "Product operations, portfolio planning, analytics, and executive communication.",
    capability: "Align leaders around clear decisions and scalable operating practices.",
    additionalRole: "",
    verticalGrowth: "",
    otherDetails: "",
    status: "Ready for Final Interview",
    createdAt: "2026-09-24",
    applicantCount: 5,
    ownerEmail: "hiring.manager@demo.talent",
    applicants: createDemoInterviewedApplicants("AH-2520", 5),
  },
  {
    id: "AH-2518",
    requisitionId: "REQ-2026-7QF29N4C",
    position: "Group Product Manager",
    hiringManager: "Priya Nair",
    positionType: "New",
    department: "Product",
    priority: "High",
    salaryGrade: "L7",
    location: "New York, NY · Hybrid",
    stakeholders: ["alex.morgan@demo.talent"],
    jobPostingDeadline: "2026-10-20",
    recruitmentDeadline: "2026-12-10",
    job: "Lead a product group focused on improving customer onboarding and activation.",
    skill: "Product strategy, people leadership, experimentation, and analytics.",
    capability: "Coach product managers and align teams around measurable outcomes.",
    additionalRole: "",
    verticalGrowth: "",
    otherDetails: "Final interviews are in progress for the top-ranked applicants.",
    status: "Final interviews completed",
    createdAt: "2026-09-22",
    applicantCount: 3,
    ownerEmail: "hiring.manager@demo.talent",
    applicants: createDemoFinalists("AH-2518", 3),
  },
  {
    id: "AH-2524",
    requisitionId: "REQ-2026-4HD82M7K",
    position: "Principal Product Designer",
    hiringManager: "Jordan Lee",
    positionType: "Replacement",
    department: "Design",
    priority: "High",
    salaryGrade: "L7",
    location: "Remote · US",
    stakeholders: ["alex.morgan@demo.talent"],
    jobPostingDeadline: "2026-10-10",
    recruitmentDeadline: "2026-11-30",
    job: "Set design direction for complex customer workflows across the product suite.",
    skill: "Product design, prototyping, accessibility, and design systems.",
    capability: "Influence product strategy and mentor designers across teams.",
    additionalRole: "",
    verticalGrowth: "",
    otherDetails: "Two finalists have completed their final interviews.",
    status: "Process Offer",
    createdAt: "2026-09-12",
    applicantCount: 3,
    ownerEmail: "hiring.manager@demo.talent",
    applicants: createDemoOfferCandidates("AH-2524", false),
  },
  {
    id: "AH-2488",
    requisitionId: "REQ-2026-9KC17W3B",
    position: "Product Analyst",
    hiringManager: "Priya Nair",
    positionType: "New",
    department: "Product",
    priority: "Medium",
    salaryGrade: "L4",
    location: "Brooklyn, NY · Hybrid",
    stakeholders: [],
    jobPostingDeadline: "2026-08-15",
    recruitmentDeadline: "2026-10-01",
    job: "Turn product usage data into clear recommendations that improve customer outcomes.",
    skill: "SQL, product analytics, experimentation, and data storytelling.",
    capability: "Explain findings clearly and partner across product and engineering.",
    additionalRole: "",
    verticalGrowth: "",
    otherDetails: "Position filled; hiring records are retained for reference.",
    status: "Closed",
    createdAt: "2026-07-20",
    applicantCount: 3,
    ownerEmail: "hiring.manager@demo.talent",
    applicants: createDemoOfferCandidates("AH-2488", true),
  },
  {
    id: "AH-2501",
    requisitionId: "REQ-2026-2JM64S8D",
    position: "Product Marketing Manager",
    hiringManager: "Jordan Lee",
    positionType: "Replacement",
    department: "Marketing",
    priority: "Medium",
    salaryGrade: "L5",
    location: "Remote · US",
    stakeholders: [],
    jobPostingDeadline: "",
    recruitmentDeadline: "2026-12-01",
    job: "Translate product launches into clear positioning, enablement, and customer stories.",
    skill: "Product marketing, messaging, launch planning, and market research.",
    capability: "Coordinate cross-functional launches with clear ownership and timelines.",
    additionalRole: "",
    verticalGrowth: "",
    otherDetails: "Hiring is paused while the team reviews next-quarter priorities.",
    status: "On Hold",
    statusBeforeHold: "Open",
    createdAt: "2026-10-01",
    applicantCount: 4,
    ownerEmail: "hiring.manager@demo.talent",
    applicants: createDemoApplicants("AH-2501", 4),
  },
  {
    id: "AH-2504",
    requisitionId: "REQ-2026-3LR58T6V",
    position: "Content Designer",
    hiringManager: "Priya Nair",
    positionType: "New",
    department: "Design",
    priority: "Low",
    salaryGrade: "L4",
    location: "New York, NY · Hybrid",
    stakeholders: [],
    jobPostingDeadline: "",
    recruitmentDeadline: "",
    job: "Create concise, accessible content that helps customers complete key tasks.",
    skill: "UX writing, content systems, accessibility, and editing.",
    capability: "Collaborate with designers and researchers to improve end-to-end experiences.",
    additionalRole: "",
    verticalGrowth: "",
    otherDetails: "This requisition was removed from the active hiring plan.",
    status: "Removed",
    createdAt: "2026-08-28",
    applicantCount: 0,
    ownerEmail: "hiring.manager@demo.talent",
    applicants: [],
  },
];

function isHiringPosition(value: unknown): value is HiringPosition {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<HiringPosition>;
  return (
    typeof item.id === "string" &&
    typeof item.requisitionId === "string" &&
    typeof item.position === "string" &&
    typeof item.hiringManager === "string" &&
    Array.isArray(item.stakeholders) &&
    (item.applicants === undefined ||
      (Array.isArray(item.applicants) &&
        item.applicants.every(isRoleApplicant))) &&
    typeof item.ownerEmail === "string"
  );
}

function isRoleApplicant(value: unknown): value is RoleApplicant {
  if (!value || typeof value !== "object") return false;
  const applicant = value as Partial<RoleApplicant>;
  return (
    typeof applicant.id === "string" &&
    typeof applicant.name === "string" &&
    typeof applicant.email === "string" &&
    typeof applicant.appliedAt === "string" &&
    typeof applicant.rank === "number" &&
    typeof applicant.resumeName === "string" &&
    typeof applicant.selectedForInterview === "boolean" &&
    (applicant.interviewed === undefined ||
      typeof applicant.interviewed === "boolean") &&
    (applicant.interviewScores === undefined ||
      (!!applicant.interviewScores &&
        typeof applicant.interviewScores.roleFit === "number" &&
        typeof applicant.interviewScores.problemSolving === "number" &&
        typeof applicant.interviewScores.communication === "number" &&
        typeof applicant.interviewScores.collaboration === "number" &&
        typeof applicant.interviewScores.overall === "number")) &&
    (applicant.assessmentDetails === undefined ||
      (!!applicant.assessmentDetails &&
        Object.values(applicant.assessmentDetails).every(
          (detail) => typeof detail === "string",
        )))
  );
}

function loadHiringPositions(): HiringPosition[] {
  try {
    const saved = localStorage.getItem(positionsStorageKey);
    if (!saved) return demoHiringPositions;
    const parsed: unknown = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.every(isHiringPosition)) {
      const savedPositions = parsed.map((position) => {
        const sample = demoHiringPositions.find(
          (demoPosition) => demoPosition.id === position.id,
        );
        const savedApplicants =
          position.applicants ?? sample?.applicants ?? [];
        const isFinalInterviewPosition =
          position.status === "Ready for Final Interview" ||
          position.status === "Final Interview scheduled" ||
          position.status === "Final interviews completed";
        return {
          ...position,
          applicants: savedApplicants.map((applicant) => {
            const sampleApplicant = sample?.applicants?.find(
              (demoApplicant) => demoApplicant.id === applicant.id,
            );
            const mergedApplicant = sampleApplicant
              ? {
                  ...sampleApplicant,
                  ...applicant,
                  interviewedAt:
                    applicant.interviewedAt ??
                    sampleApplicant.interviewedAt,
                  interviewSummary:
                    applicant.interviewSummary ??
                    sampleApplicant.interviewSummary,
                  interviewScores:
                    applicant.interviewScores ??
                    sampleApplicant.interviewScores,
                  assessmentDetails:
                    applicant.assessmentDetails ??
                    sampleApplicant.assessmentDetails,
                }
              : applicant;
            if (!isFinalInterviewPosition) return mergedApplicant;
            const mockRecord = createMockInterviewRecord(
              stableSeed(applicant.id),
              savedApplicants.length,
            );
            return {
              ...mergedApplicant,
              ...mockRecord,
              interviewed: true,
              interviewedAt:
                mergedApplicant.interviewedAt ?? mockRecord.interviewedAt,
              interviewSummary:
                mergedApplicant.interviewSummary ?? mockRecord.interviewSummary,
              interviewScores:
                mergedApplicant.interviewScores ?? mockRecord.interviewScores,
              assessmentDetails:
                mergedApplicant.assessmentDetails ??
                mockRecord.assessmentDetails,
            };
          }),
        };
      });
      const migratedPositions = savedPositions
        .filter((position) => position.id !== "AH-2508")
        .map((position) => {
        const previousStatus = position.statusBeforeHold as string | undefined;
        const normalizedPosition =
          (position.status as string) === "Paused"
            ? {
                ...position,
                status: "On Hold" as const,
                statusBeforeHold:
                  previousStatus && previousStatus !== "Paused"
                    ? position.statusBeforeHold
                    : "Open" as const,
              }
            : position;
        if (normalizedPosition.status !== "Final Interview scheduled") {
          return normalizedPosition;
        }
        const scheduledFinalists = (normalizedPosition.applicants ?? []).filter(
          (applicant) => applicant.finalInterviewScheduled,
        );
        return scheduledFinalists.length > 0 &&
          scheduledFinalists.every(
            (applicant) => applicant.finalInterviewCompleted === true,
          )
          ? { ...normalizedPosition, status: "Final interviews completed" as const }
          : normalizedPosition;
      });
      const savedIds = new Set(migratedPositions.map((position) => position.id));
      const missingDemoPositions = demoHiringPositions.filter(
        (sample) => !savedIds.has(sample.id),
      );
      return [...migratedPositions, ...missingDemoPositions];
    }
    throw new Error("Saved position data has an unexpected shape.");
  } catch (error) {
    console.error("Unable to load saved hiring positions.", error);
    return demoHiringPositions;
  }
}

function loadStakeholderFeedback(email: string): StakeholderFeedbackState {
  const emptyState: StakeholderFeedbackState = {
    answers: {},
    submittedJobIds: [],
  };
  if (!email) return emptyState;
  try {
    const saved = localStorage.getItem(
      `aiccuhire-stakeholder-feedback:${email.toLowerCase()}`,
    );
    if (!saved) return emptyState;
    const parsed = JSON.parse(saved) as Partial<StakeholderFeedbackState>;
    return {
      answers:
        parsed.answers && typeof parsed.answers === "object"
          ? parsed.answers
          : {},
      submittedJobIds: Array.isArray(parsed.submittedJobIds)
        ? parsed.submittedJobIds.filter(
            (jobId): jobId is string => typeof jobId === "string",
          )
        : [],
    };
  } catch (error) {
    console.error("Unable to load saved stakeholder feedback.", error);
    return emptyState;
  }
}

function App() {
  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("talent-demo-session") || "null",
      ) as { role?: string; email?: string; roles?: unknown } | null;
      if (!saved || typeof saved.email !== "string") return null;
      const oldRole = saved.role;
      const savedRole =
        oldRole === "Human Resources" ? "Hiring Manager" : oldRole;
      if (
        savedRole !== "Candidate" &&
        savedRole !== "Stakeholder" &&
        savedRole !== "Admin" &&
        savedRole !== "Hiring Manager" &&
        savedRole !== "Admin + Hiring Manager / HR" &&
        savedRole !== "Viewer"
      ) {
        return null;
      }
      const savedEmail =
        saved.email === "team@demo.talent"
          ? oldRole === "Admin"
            ? "admin@demo.talent"
            : oldRole === "Human Resources"
              ? "hr@demo.talent"
              : "hiring.manager@demo.talent"
          : saved.email;
      const savedRoles = Array.isArray(saved.roles)
        ? saved.roles.filter(isWorkspaceRole)
        : [];
      return {
        role: savedRole,
        email: savedEmail,
        roles: savedRoles.length
          ? [...new Set(savedRoles)]
          : rolesFromLegacySession(savedRole),
      };
    } catch {
      return null;
    }
  });
  const [, setLocation] = useLocation();
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>(loadAdminUsers);
  const [adminSettings, setAdminSettings] =
    useState<AdminPanelSettings>(loadAdminSettings);
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [accountKind, setAccountKind] = useState<AccountKind>(null);
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"credentials" | "otp">("credentials");
  const [authError, setAuthError] = useState("");
  const [dialog, setDialog] = useState<{ kind: string; id?: string } | null>(
    null,
  );
  const [candidateFollowUp, setCandidateFollowUp] =
    useState<CandidateFollowUpState>(() =>
      loadCandidateFollowUp(session?.email ?? candidateDemo),
    );
  const [candidateFollowUpError, setCandidateFollowUpError] = useState("");
  const [resumeName, setResumeName] = useState(
    candidateFollowUp.resumeName ?? "Maya_Chen_Resume.pdf",
  );
  const [resumeSaved, setResumeSaved] = useState(false);
  const [uploadedResumes, setUploadedResumes] = useState<UploadedResume[]>([
    {
      id: "resume-current",
      name: candidateFollowUp.resumeName ?? "Maya_Chen_Resume.pdf",
      updated: candidateFollowUp.resumeName ? "Previously updated" : "May 09",
      current: true,
    },
    {
      id: "resume-product",
      name: "Maya_Chen_Product_Design_Resume.pdf",
      updated: "Apr 22",
      current: false,
    },
  ]);
  const [interviewConsentGiven, setInterviewConsentGiven] = useState(false);
  const [interviewJobId, setInterviewJobId] = useState<string | null>(null);
  const [stakeholderWorkflow, setStakeholderWorkflow] = useState<string | null>(
    null,
  );
  const [jobDetailsOpen, setJobDetailsOpen] = useState<string | null>(null);
  const [stakeholderFeedback, setStakeholderFeedback] =
    useState<StakeholderFeedbackState>(() =>
      loadStakeholderFeedback(session?.email ?? ""),
    );
  const [stakeholderSaveError, setStakeholderSaveError] = useState("");
  const stakeholderAnswers = stakeholderFeedback.answers;
  const submitted = stakeholderFeedback.submittedJobIds;
  const [positions, setPositions] = useState<HiringPosition[]>(loadHiringPositions);
  const [candidateResumeFiles, setCandidateResumeFiles] = useState<
    Record<string, File>
  >({});
  const [positionForm, setPositionForm] = useState<PositionFormValues | null>(
    null,
  );
  const [isPositionDuplicate, setIsPositionDuplicate] = useState(false);
  const [positionSaveError, setPositionSaveError] = useState("");
  const stakeholderJobs: StakeholderJob[] = positions
    .filter(
      (position) =>
        (position.status === "Draft" || position.status === "Open") &&
        !!session?.email &&
        position.stakeholders.some(
          (email) => email.toLowerCase() === session.email.toLowerCase(),
        ),
    )
    .map((position) => ({
      id: `stakeholder-${position.id}`,
      jobId: position.requisitionId,
      title: position.position,
      team: `${position.department} · AiccuHire`,
      time: "Requested by the hiring team",
      jobDetails:
        position.job.trim() || "The hiring team has not added a role summary yet.",
      requirements: [
        position.skill,
        position.capability,
        position.additionalRole,
        position.verticalGrowth,
        position.otherDetails,
      ].filter((requirement) => requirement.trim().length > 0),
      questions: (
        stakeholderQuestionBank[position.requisitionId] ??
        genericStakeholderQuestions
      ).map((question) => ({
        ...question,
        id: `${position.id}-${question.id}`,
      })),
    }));

  const isInternal = (value: Role | null) => hasDashboardAccess(value);
  const internalRoleForEmail = (value: string): Role | null => {
    const user = adminUsers.find(
      (account) => account.email.toLowerCase() === value.trim().toLowerCase(),
    );
    if (!user) return null;
    const isAdmin = user.roles.includes("Admin");
    const isHiringManager = user.roles.includes("Hiring Manager");
    if (isAdmin && isHiringManager) return "Admin + Hiring Manager / HR";
    if (isAdmin) return "Admin";
    if (isHiringManager) return "Hiring Manager";
    return user.roles.includes("Viewer") ? "Viewer" : null;
  };
  const persistHiringPositions = (nextPositions: HiringPosition[]) => {
    setPositions(nextPositions);
    try {
      localStorage.setItem(positionsStorageKey, JSON.stringify(nextPositions));
      setPositionSaveError("");
    } catch (error) {
      console.error("Unable to save hiring positions in this browser.", error);
      setPositionSaveError(
        "Changes remain available in this session, but could not be saved in this browser.",
      );
    }
  };
  const saveStakeholderFeedback = (next: StakeholderFeedbackState) => {
    setStakeholderFeedback(next);
    if (!session?.email) return;
    try {
      localStorage.setItem(
        `aiccuhire-stakeholder-feedback:${session.email.toLowerCase()}`,
        JSON.stringify(next),
      );
      setStakeholderSaveError("");
    } catch (error) {
      console.error("Unable to save stakeholder feedback in this browser.", error);
      setStakeholderSaveError(
        "Your answers remain available in this session, but could not be saved in this browser.",
      );
    }
  };
  const addAdminUser = (user: NewAdminUser): string | undefined => {
    if (!session || !hasAdminAccess(session.role)) {
      return "Only Admin accounts can add users.";
    }
    if (user.roles.length === 0) {
      return "Select at least one role for this user.";
    }
    const normalizedEmail = user.email.trim().toLowerCase();
    if (
      adminUsers.some(
        (existing) => existing.email.toLowerCase() === normalizedEmail,
      )
    ) {
      return "A user with this email address is already in the directory.";
    }
    const nextUsers: AdminUserRecord[] = [
      ...adminUsers,
      {
        ...user,
        roles: [...new Set(user.roles)],
        email: normalizedEmail,
        id: `demo-user-${Date.now()}`,
      },
    ];
    try {
      localStorage.setItem(adminUsersStorageKey, JSON.stringify(nextUsers));
    } catch (error) {
      console.error("Unable to save the browser demo user directory.", error);
      return "The browser could not save this user. No changes were made.";
    }
    setAdminUsers(nextUsers);
    return undefined;
  };
  const saveAdminSettings = (
    nextSettings: AdminPanelSettings,
  ): string | undefined => {
    if (!session || !hasAdminAccess(session.role)) {
      return "Only Admin accounts can change configuration.";
    }
    try {
      localStorage.setItem(
        adminSettingsStorageKey,
        JSON.stringify(nextSettings),
      );
    } catch (error) {
      console.error("Unable to save browser demo configuration.", error);
      return "The browser could not save these settings. No changes were made.";
    }
    setAdminSettings(nextSettings);
    return undefined;
  };
  const pathFor = (value: Role) => getRoleLandingPath(value);
  const signIn = (value: Role, userEmail: string) => {
    const account = adminUsers.find(
      (user) => user.email.toLowerCase() === userEmail.trim().toLowerCase(),
    );
    const next: UserSession = {
      role: value,
      email: userEmail,
      roles: account ? [...account.roles] : [],
    };
    setSession(next);
    if (value === "Stakeholder") {
      setStakeholderFeedback(loadStakeholderFeedback(userEmail));
      setStakeholderSaveError("");
    }
    if (value === "Candidate") {
      const savedFollowUp = loadCandidateFollowUp(userEmail);
      setCandidateFollowUp(savedFollowUp);
      setResumeName(savedFollowUp.resumeName ?? "Maya_Chen_Resume.pdf");
      if (savedFollowUp.resumeName) {
        setUploadedResumes((current) => [
          {
            id: "resume-current",
            name: savedFollowUp.resumeName!,
            updated: "Previously updated",
            current: true,
          },
          ...current
            .filter((resume) => resume.name !== savedFollowUp.resumeName)
            .map((resume) => ({ ...resume, current: false })),
        ].slice(0, 5));
      }
    }
    sessionStorage.setItem("talent-demo-session", JSON.stringify(next));
    setAuthError("");
    setLocation(pathFor(value));
  };
  const signOut = () => {
    setSession(null);
    sessionStorage.removeItem("talent-demo-session");
    setDialog(null);
    setStage("credentials");
    setInterviewConsentGiven(false);
    setInterviewJobId(null);
    setStakeholderWorkflow(null);
    setStakeholderFeedback({ answers: {}, submittedJobIds: [] });
    setStakeholderSaveError("");
    setLocation("/");
  };
  const handleEmailChange = (value: string) => {
    const normalized = value.trim().toLowerCase();
    setEmail(value);
    setRole(null);
    setPassword("");
    setOtp("");
    setStage("credentials");
    setAuthError("");
    if (normalized === candidateDemo) {
      setAccountKind("candidate");
      setRole("Candidate");
    } else if (normalized === stakeholderDemo) {
      setAccountKind("stakeholder");
      setRole("Stakeholder");
    } else if (internalRoleForEmail(normalized)) {
      setAccountKind("internal");
      setRole(internalRoleForEmail(normalized));
    } else {
      setAccountKind(null);
    }
  };
  const handleDemoSso = () => {
    const ssoEmail = email.trim().toLowerCase();
    const ssoRole = internalRoleForEmail(ssoEmail);
    if (!ssoRole) {
      setAuthError("That account could not be verified by demo SSO.");
      return;
    }
    if (
      hasViewerOnlyAccess(
        ssoRole,
        adminUsers.find((user) => user.email.toLowerCase() === ssoEmail)?.roles,
      ) &&
      !adminSettings.allowViewerDashboard
    ) {
      setAuthError("Viewer access to Reports & Analytics is disabled.");
      return;
    }
    signIn(ssoRole, ssoEmail);
  };
  const handleAuth = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    if (!role) {
      setAuthError(
        "Enter a demo email to reveal the available sign-in options.",
      );
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const emailRole = internalRoleForEmail(normalizedEmail);
    const validEmail =
      role === "Candidate"
        ? normalizedEmail === candidateDemo
        : role === "Stakeholder"
          ? normalizedEmail === stakeholderDemo
          : emailRole === role;
    if (!validEmail) {
      setAuthError(
        "That email isn’t part of this demo. Enter one of the sample emails below.",
      );
      return;
    }
    if (isInternal(role)) {
      if (
        hasViewerOnlyAccess(
          role,
          adminUsers.find((user) => user.email.toLowerCase() === normalizedEmail)
            ?.roles,
        ) &&
        !adminSettings.allowViewerDashboard
      ) {
        setAuthError("Viewer access to Reports & Analytics is disabled.");
        return;
      }
      if (adminSettings.requireSsoForInternal) {
        setAuthError("This workspace requires demo SSO for internal users.");
        return;
      }
      if (password !== demoPassword) {
        setAuthError(
          "That password doesn’t match this demo account. Use the password shown below.",
        );
        return;
      }
      signIn(role, normalizedEmail);
      return;
    }
    if (stage === "credentials" && adminSettings.requireOtpForExternal) {
      setStage("otp");
      return;
    }
    if (adminSettings.requireOtpForExternal && otp !== demoOtp) {
      setAuthError(
        "That code didn’t match. Use the demo code 246810 and try again.",
      );
      return;
    }
    signIn(role, normalizedEmail);
  };
  const openDialog = (kind: string, id?: string) => {
    setDialog({ kind, id });
    setResumeSaved(false);
    setCandidateFollowUpError("");
  };
  const saveResume = () => {
    setUploadedResumes((current) =>
      [
        {
          id: `${Date.now()}`,
          name: resumeName,
          updated: "Just now",
          current: true,
        },
        ...current
          .filter((resume) => resume.name !== resumeName)
          .map((resume) => ({ ...resume, current: false })),
      ].slice(0, 5),
    );
    const nextFollowUp = {
      ...candidateFollowUp,
      submitted: false,
      resumeName,
    };
    setCandidateFollowUp(nextFollowUp);
    persistCandidateFollowUp(session?.email ?? candidateDemo, nextFollowUp);
    setResumeSaved(true);
  };
  const saveCandidateFollowUpAnswers = () => {
    const hasUnansweredQuestion = candidateFollowUpQuestions.some(
      (question) => !candidateFollowUp.answers[question.id]?.trim(),
    );
    if (hasUnansweredQuestion) {
      setCandidateFollowUpError(
        "Please answer all four questions before submitting.",
      );
      return;
    }
    const nextFollowUp = {
      ...candidateFollowUp,
      submitted: true,
      resumeName,
    };
    setCandidateFollowUp(nextFollowUp);
    persistCandidateFollowUp(session?.email ?? candidateDemo, nextFollowUp);
    setCandidateFollowUpError("");
    setDialog(null);
  };
  const updateCandidateFollowUpAnswer = (questionId: string, answer: string) => {
    const nextFollowUp = {
      ...candidateFollowUp,
      answers: { ...candidateFollowUp.answers, [questionId]: answer },
      submitted: false,
      resumeName,
    };
    setCandidateFollowUp(nextFollowUp);
    persistCandidateFollowUp(session?.email ?? candidateDemo, nextFollowUp);
    setCandidateFollowUpError("");
  };
  const currentJob = seedJobs.find((job) => job.id === dialog?.id);
  const resetAuth = () => {
    setStage("credentials");
    setOtp("");
    setAuthError("");
  };
  const resetEmail = () => {
    setEmail("");
    setRole(null);
    setAccountKind(null);
    setPassword("");
    resetAuth();
  };
  const startCreatePosition = () => {
    setPositionForm(null);
    setIsPositionDuplicate(false);
    setPositionSaveError("");
    setLocation("/positions/create");
  };
  const startDuplicatePosition = (requisitionId: string) => {
    const normalizedId = requisitionId.trim().toUpperCase();
    const source = positions.find(
      (position) =>
        position.requisitionId.toUpperCase() === normalizedId &&
        (position.ownerEmail.toLowerCase() === session?.email.toLowerCase() ||
          (demoHiringManagerEmails.includes(session?.email ?? "") &&
            demoHiringManagerEmails.includes(position.ownerEmail))),
    );
    if (!source) return false;

    setPositionForm({
      requisitionId: createRequisitionId(),
      position: source.position,
      hiringManager: source.hiringManager,
      positionType: source.positionType,
      department: source.department,
      priority: source.priority,
      salaryGrade: source.salaryGrade,
      location: source.location,
      stakeholders: [...source.stakeholders],
      jobPostingDeadline: source.jobPostingDeadline,
      recruitmentDeadline: source.recruitmentDeadline,
      job: source.job,
      skill: source.skill,
      capability: source.capability,
      additionalRole: source.additionalRole,
      verticalGrowth: source.verticalGrowth,
      otherDetails: source.otherDetails,
    });
    setIsPositionDuplicate(true);
    setPositionSaveError("");
    setLocation("/positions/create");
    return true;
  };
  const savePosition = (values: PositionFormValues) => {
    if (!session || !hasHiringManagerAccess(session.role)) return;
    const nextPosition: HiringPosition = {
      id: `AH-${Date.now()}`,
      ...values,
      status: "Draft",
      createdAt: new Date().toISOString().slice(0, 10),
      applicantCount: 0,
      ownerEmail: session.email,
    };
    const nextPositions = [nextPosition, ...positions];
    persistHiringPositions(nextPositions);
    setPositionForm(null);
    setIsPositionDuplicate(false);
    setLocation("/job-portal");
  };
  const holdPosition = (positionId: string) => {
    const target = positions.find((position) => position.id === positionId);
    if (!target || !canManagePosition(session?.role, session?.email, target) || target.status === "Closed") return;
    const nextPositions = positions.map((position) =>
      position.id !== positionId ||
      position.status === "On Hold" ||
      position.status === "Removed"
        ? position
        : {
            ...position,
            statusBeforeHold: position.status,
            status: "On Hold" as const,
          },
    );
    persistHiringPositions(nextPositions);
  };
  const resumePosition = (positionId: string) => {
    const target = positions.find((position) => position.id === positionId);
    if (!target || !canManagePosition(session?.role, session?.email, target)) return;
    const nextPositions = positions.map((position) => {
      if (position.id !== positionId || position.status !== "On Hold") {
        return position;
      }
      const { statusBeforeHold, ...positionWithoutPreviousStatus } = position;
      return {
        ...positionWithoutPreviousStatus,
        status: statusBeforeHold ?? "Draft",
      };
    });
    persistHiringPositions(nextPositions);
  };
  const removePosition = (positionId: string) => {
    const target = positions.find((position) => position.id === positionId);
    if (!target || !canManagePosition(session?.role, session?.email, target) || target.status === "Closed") return;
    const nextPositions = positions.map((position) =>
      position.id !== positionId || position.status === "Removed"
        ? position
        : { ...position, status: "Removed" as const },
    );
    persistHiringPositions(nextPositions);
  };
  const addPreferredApplicant = (
    positionId: string,
    candidate: NewRoleApplicant,
  ) => {
    const target = positions.find((position) => position.id === positionId);
    if (!target || !canManagePosition(session?.role, session?.email, target) ||
      !["Open", "Ready for Interview", "Ready for Final Interview", "Draft"].includes(target.status)) return;
    const applicantId = `app-${positionId}-${Date.now()}`;
    const targetPosition = positions.find(
      (position) => position.id === positionId,
    );
    const isFinalInterviewStage =
      targetPosition?.status === "Ready for Final Interview";
    const mockInterviewRecord = isFinalInterviewStage
      ? createMockInterviewRecord(
          stableSeed(applicantId),
          targetPosition.applicants?.length ?? 5,
        )
      : undefined;
    const applicant: RoleApplicant = {
      id: applicantId,
      name: candidate.name,
      email: candidate.email,
      appliedAt: new Date().toISOString().slice(0, 10),
      rank: 1,
      resumeName: candidate.resumeName,
      selectedForInterview: false,
      ...(isFinalInterviewStage
        ? {
            ...mockInterviewRecord,
            interviewed: true,
            preferredForFinalInterview: true,
            selectedForFinalInterview: false,
          }
        : {}),
    };
    const nextPositions = positions.map((position) => {
      if (position.id !== positionId) return position;
      const bumpedApplicants = (position.applicants ?? []).map((existing) => ({
        ...existing,
        rank: existing.rank + 1,
      }));
      const applicants = [applicant, ...bumpedApplicants];
      return {
        ...position,
        applicants,
        applicantCount: applicants.length,
      };
    });
    persistHiringPositions(nextPositions);
    setCandidateResumeFiles((current) => ({
      ...current,
      [applicantId]: candidate.resumeFile,
    }));
  };
  const toggleApplicantInterview = (
    positionId: string,
    applicantId: string,
    selected: boolean,
  ) => {
    const target = positions.find((position) => position.id === positionId);
    if (!target || !canManagePosition(session?.role, session?.email, target) ||
      !["Open", "Ready for Interview", "Draft"].includes(target.status)) return;
    const nextPositions = positions.map((position) =>
      position.id !== positionId
        ? position
        : {
            ...position,
            applicants: (position.applicants ?? []).map((applicant) =>
              applicant.id === applicantId
                ? {
                    ...applicant,
                    selectedForInterview: selected,
                    interviewConfirmed: false,
                  }
                : applicant,
            ),
          },
    );
    persistHiringPositions(nextPositions);
  };
  const confirmInterviewSelection = (positionId: string) => {
    const target = positions.find((position) => position.id === positionId);
    if (!target || !canManagePosition(session?.role, session?.email, target) ||
      !["Open", "Ready for Interview", "Draft"].includes(target.status)) return;
    const nextPositions = positions.map((position) =>
      position.id !== positionId
        ? position
        : {
            ...position,
            applicants: (position.applicants ?? []).map((applicant) => ({
              ...applicant,
              interviewConfirmed: applicant.selectedForInterview,
            })),
          },
    );
    persistHiringPositions(nextPositions);
  };
  const toggleFinalInterviewSelection = (
    positionId: string,
    applicantId: string,
    selected: boolean,
  ) => {
    const target = positions.find((position) => position.id === positionId);
    if (!target || !canManagePosition(session?.role, session?.email, target)) return;
    const nextPositions = positions.map((position) =>
      position.id !== positionId ||
      position.status !== "Ready for Final Interview"
        ? position
        : {
            ...position,
            applicants: (position.applicants ?? []).map((applicant) =>
              applicant.id === applicantId
                ? { ...applicant, selectedForFinalInterview: selected }
                : applicant,
            ),
          },
    );
    persistHiringPositions(nextPositions);
  };
  const scheduleFinalInterview = (positionId: string) => {
    const target = positions.find((position) => position.id === positionId);
    if (!target || !canManagePosition(session?.role, session?.email, target) ||
      !target.applicants?.some((applicant) => applicant.selectedForFinalInterview)) return;
    const nextPositions = positions.map((position) =>
      position.id !== positionId ||
      position.status !== "Ready for Final Interview"
        ? position
        : {
            ...position,
            status: "Final Interview scheduled" as const,
            applicants: (position.applicants ?? []).map((applicant) => ({
              ...applicant,
              finalInterviewScheduled:
                applicant.selectedForFinalInterview === true,
            })),
          },
    );
    persistHiringPositions(nextPositions);
  };
  const updateOffer = (positionId: string, action: OfferAction) => {
    const target = positions.find((position) => position.id === positionId);
    if (!target) return;
    const result = applyOfferAction(target, action, canManagePosition(session?.role, session?.email, target));
    if (result.error) {
      setPositionSaveError(result.error);
      return;
    }
    persistHiringPositions(positions.map((position) => position.id === positionId ? result.position : position));
  };
  const toggleOfferCandidate = (
    positionId: string,
    applicantId: string,
    selected: boolean,
  ) => {
    updateOffer(positionId, { type: "select", applicantId, selected });
  };
  const rankOfferCandidate = (
    positionId: string,
    applicantId: string,
    rank: 1 | 2 | 3,
  ) => {
    updateOffer(positionId, { type: "rank", applicantId, rank });
  };
  const processOffer = (positionId: string) => {
    updateOffer(positionId, { type: "process" });
  };
  const acceptOffer = (positionId: string, applicantId: string) => {
    updateOffer(positionId, { type: "accept", applicantId });
  };
  const openApplicantResume = (applicantId: string) => {
    const file = candidateResumeFiles[applicantId];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const resumeLink = document.createElement("a");
    resumeLink.href = objectUrl;
    resumeLink.target = "_blank";
    resumeLink.rel = "noopener noreferrer";
    resumeLink.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  };
  const cancelPositionForm = () => {
    setPositionForm(null);
    setIsPositionDuplicate(false);
    setPositionSaveError("");
    setLocation("/job-portal");
  };

  const AuthPage = () => (
    <main className="grain min-h-[100dvh] bg-[#f5f3ec] text-[#243942]">
      <div className="mx-auto grid min-h-[100dvh] max-w-[1440px] lg:grid-cols-[1.04fr_.96fr]">
        <section className="relative flex min-h-[350px] flex-col justify-between overflow-hidden bg-[#174b43] px-7 py-8 text-[#f7f4eb] sm:px-12 lg:min-h-[100dvh] lg:px-[9%] lg:py-11">
          <div
            aria-hidden="true"
            className="absolute -right-36 top-[18%] h-[430px] w-[430px] rounded-full border border-white/10 sm:h-[600px] sm:w-[600px]"
          >
            <div className="absolute inset-12 rounded-full border border-white/10" />
            <div className="absolute inset-28 rounded-full border border-white/10" />
            <div className="absolute right-[14%] top-[20%] h-3 w-3 rounded-full bg-[#e8a568]" />
          </div>
          <header className="relative z-10 flex items-center">
            <img
              src={aiccuhireLogo}
              alt="AiccuHire"
              className="h-[42px] w-[186px] rounded-md object-contain"
            />
          </header>
          <div className="relative z-10 max-w-[510px] py-10 lg:py-0">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.15em] text-[#d5e3d8]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e8a568]" /> Hiring
              for the Future
            </div>
            <h1 className="serif max-w-[520px] text-[clamp(42px,6.4vw,76px)] font-semibold leading-[1.02]">
              Good work starts
              <br />
              with good people.
            </h1>
            <p className="mt-6 max-w-[400px] text-[15px] leading-7 text-[#d5e3d8]">
              One thoughtful place for candidates, collaborators, and hiring
              teams to move forward together.
            </p>
            <div className="mt-11 flex items-center gap-4">
              <div className="flex -space-x-2">
                {["M", "A", "P", "T"].map((v, i) => (
                  <span
                    key={v}
                    className={`grid h-9 w-9 place-items-center rounded-full border-2 border-[#174b43] text-[11px] font-bold ${["bg-[#d8e6d8] text-[#174b43]", "bg-[#e8a568] text-[#243942]", "bg-[#d9c9b3] text-[#243942]", "bg-[#b8ccc1] text-[#174b43]"][i]}`}
                  >
                    {v}
                  </span>
                ))}
              </div>
              <span className="text-[12px] text-[#d5e3d8]">
                A clearer process, for everyone.
              </span>
            </div>
          </div>
          <div className="relative z-10 flex justify-between text-[11px] text-[#c5d7ce]">
            <span>Thoughtful hiring, together.</span>
            <span>Demo workspace</span>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-14">
          <div className="w-full max-w-[460px] page-enter">
            <div className="mb-8">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[.17em] text-[#668078]">
                Welcome to AiccuHire
              </div>
              <h2 className="serif text-[34px] font-bold tracking-[-.05em]">
                Sign in to your workspace
              </h2>
              <p className="mt-2 text-[14px] text-[#687a7c]">
                Enter your email and we’ll find the right way in.
              </p>
            </div>
            <form
              onSubmit={handleAuth}
              className="rounded-2xl border border-[#e7e3d9] bg-[#fcfbf7] p-5 shadow-[0_18px_60px_-40px_rgba(32,65,59,.24)] sm:p-7"
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <div className="text-[14px] font-bold text-[#263d43]">
                    {role
                      ? `${role} sign in`
                      : accountKind === "internal"
                        ? "Internal sign in"
                        : "Email sign in"}
                  </div>
                  <div className="mt-1 text-[12px] text-[#798789]">
                    {role && isInternal(role)
                      ? "Use your team credentials."
                      : stage === "otp"
                        ? "Enter the one-time code we sent you."
                        : role
                          ? "This email matches your account."
                          : accountKind === "internal"
                            ? "Your email matches an internal account."
                            : "Your email determines your sign-in options."}
                  </div>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf3ed] text-[#347162]">
                  {stage === "otp" ? (
                    <KeyRound size={17} />
                  ) : (
                    <ShieldCheck size={17} />
                  )}
                </div>
              </div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-[12px] font-semibold text-[#44595b]"
              >
                Email address
              </label>
              <div className="relative mb-4">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#869594]"
                  size={16}
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  readOnly={!!role && !isInternal(role) && stage === "otp"}
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  data-testid="input-email"
                  placeholder="you@company.com"
                  className={`h-12 w-full rounded-xl border border-[#dedfd6] pl-10 pr-3 text-[13px] outline-none placeholder:text-[#a0aaa6] focus:border-[#438274] focus:ring-4 focus:ring-[#438274]/10 ${role && !isInternal(role) && stage === "otp" ? "bg-[#eeeee8] text-[#87918d]" : "bg-[#fffefa]"}`}
                />
              </div>
              {accountKind === null &&
                email.includes("@") &&
                email.trim().length > 5 && (
                  <div
                    role="status"
                    data-testid="status-email-unrecognized"
                    className="mb-4 rounded-xl border border-[#ebdfc8] bg-[#fff9ec] px-3 py-2.5 text-[11px] leading-5 text-[#75634c]"
                  >
                    We couldn’t match that email to a demo account. Try one of
                    the sample addresses below.
                  </div>
                )}
              {isInternal(role) && (
                <>
                  <label
                    htmlFor="password"
                    className="mb-1.5 block text-[12px] font-semibold text-[#44595b]"
                  >
                    Password
                  </label>
                  <div className="relative mb-4">
                    <LockKeyhole
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#869594]"
                      size={16}
                    />
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="input-password"
                      placeholder="Enter your password"
                      className="h-12 w-full rounded-xl border border-[#dedfd6] bg-[#fffefa] pl-10 pr-3 text-[13px] outline-none placeholder:text-[#a0aaa6] focus:border-[#438274] focus:ring-4 focus:ring-[#438274]/10"
                    />
                  </div>
                </>
              )}
              {!isInternal(role) && stage === "otp" && (
                <>
                  <label
                    htmlFor="otp"
                    className="mb-1.5 block text-[12px] font-semibold text-[#44595b]"
                  >
                    One-time code
                  </label>
                  <input
                    id="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    data-testid="input-otp"
                    placeholder="6-digit code"
                    className="mb-4 h-12 w-full rounded-xl border border-[#dedfd6] bg-[#fffefa] px-4 text-[15px] tracking-[.3em] outline-none placeholder:text-[#a0aaa6] placeholder:tracking-normal focus:border-[#438274] focus:ring-4 focus:ring-[#438274]/10"
                  />
                  <div className="mb-4 flex items-center justify-between text-[11px] text-[#758381]">
                    <span>
                      Demo code:{" "}
                      <strong className="font-semibold text-[#315f54]">
                        246810
                      </strong>
                    </span>
                    <button
                      type="button"
                      data-testid="button-change-email"
                      onClick={resetAuth}
                      className="font-semibold text-[#327364] hover:underline"
                    >
                      Change email
                    </button>
                  </div>
                </>
              )}
              {authError && (
                <div
                  role="alert"
                  data-testid="status-auth-error"
                  className="mb-4 rounded-xl border border-[#ebc6bd] bg-[#fff1ed] px-3 py-2.5 text-[12px] leading-5 text-[#9e4637]"
                >
                  {authError}
                </div>
              )}
              {role && (
                <button
                  type="submit"
                  data-testid="button-continue-signin"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#205e53] text-[13px] font-bold text-white hover:bg-[#184d44] active:translate-y-px"
                >
                  {stage === "otp"
                    ? "Verify and continue"
                    : isInternal(role)
                      ? "Sign in to team workspace"
                      : "Continue with email"}
                  <ArrowRight size={16} />
                </button>
              )}
              {isInternal(role) && (
                <button
                  type="button"
                  data-testid="button-demo-sso"
                  onClick={handleDemoSso}
                  className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#dfe3d9] bg-transparent text-[12px] font-semibold text-[#476260] hover:bg-[#f2f4ed]"
                >
                  <Building2 size={15} />
                  Continue with demo SSO
                </button>
              )}
              <p className="mt-4 text-center text-[10px] leading-4 text-[#87918d]">
                Demo prototype only · No real account or authentication is used.
              </p>
            </form>
            <div className="mt-5 rounded-2xl border border-[#e5e1d7] bg-[#f9f7f0] p-4 sm:p-5">
              <div className="mb-2 flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#e8a568]/25 text-[#80552e]">
                  <Sparkles size={14} />
                </div>
                <div className="text-[12px] font-bold text-[#3c5050]">
                  Demo sign-in details
                </div>
              </div>
              <p className="text-[10px] leading-5 text-[#86918c]">
                Candidate: maya.chen@demo.talent · Stakeholder:
                alex.morgan@demo.talent · Admin: admin@demo.talent · Hiring
                Manager / HR: hiring.manager@demo.talent or hr@demo.talent.
                Password: welcome123 · OTP: 246810
              </p>
            </div>
            <div className="mt-5 flex justify-center gap-1.5 text-[10px] text-[#929a94]">
              <CircleHelp size={13} /> Demo only. Sign-in lasts for this browser
              session; portal changes are temporary.
            </div>
          </div>
        </section>
      </div>
    </main>
  );

  const AppShell = ({
    children,
    active,
  }: {
    children: ReactNode;
    active: string;
  }) => (
    <div className="min-h-[100dvh] bg-[#f5f3ec] text-[#243942]">
      <header className="sticky top-0 z-20 border-b border-[#e5e2d8] bg-[#fbfaf5]/95 backdrop-blur">
        <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between px-4 sm:px-7">
          <div className="flex items-center gap-3">
            <img
              src={aiccuhireLogo}
              alt="AiccuHire"
              className="h-9 w-[158px] rounded-md object-contain"
            />
            <span className="ml-2 hidden h-6 w-px bg-[#dedfd6] sm:block" />
            <span className="hidden text-[11px] font-medium text-[#758481] sm:block">
              {active === "candidate"
                ? "Candidate portal"
                : active === "stakeholder"
                  ? "Team input"
                  : "Hiring workspace"}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden text-[11px] font-semibold text-[#536765] sm:inline">
              {session?.role} view
            </span>
            <span
              data-testid="text-session-email"
              className="hidden max-w-[180px] truncate text-[11px] text-[#84908d] md:inline"
            >
              {session?.email}
            </span>
            <button
              type="button"
              onClick={signOut}
              data-testid="button-sign-out"
              className="flex items-center gap-2 rounded-lg border border-[#e5e1d7] px-3 py-2 text-[11px] font-semibold text-[#526664] hover:bg-[#f1efe7]"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1240px] px-4 pb-16 pt-8 sm:px-7 sm:pt-11 page-enter">
        {children}
      </main>
      <footer className="border-t border-[#e6e2d9] py-5 text-center text-[10px] text-[#929b95]">
        AiccuHire · A demo workspace for thoughtful hiring
      </footer>
      {dialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#173b35]/35 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDialog(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            className={`w-full max-h-[88vh] overflow-y-auto ${dialog.kind === "comprehensive-resume" ? "max-w-[880px]" : dialog.kind === "candidate-follow-up" ? "max-w-[760px]" : "max-w-[520px]"} rounded-2xl border border-[#e4e2d8] bg-[#fcfbf7] p-5 shadow-[0_30px_100px_-35px_rgba(25,53,48,.45)] sm:p-7`}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-[.15em] text-[#6a897d]">
                  {dialog.kind === "comprehensive-resume"
                    ? "Demo candidate profile"
                    : dialog.kind === "interview-consent"
                      ? "Before you continue"
                      : dialog.kind === "candidate-follow-up"
                        ? "A little more about your application"
                      : "Your hiring journey"}
                </div>
                <h2
                  id="dialog-title"
                  className="serif text-[23px] font-bold tracking-[-.04em]"
                >
                  {dialog.kind === "comprehensive-resume"
                    ? "Comprehensive resume"
                    : dialog.kind === "status"
                      ? "Application status"
                      : dialog.kind === "resume"
                        ? "Update your resume"
                        : dialog.kind === "candidate-follow-up"
                          ? "Follow-up questions"
                          : dialog.kind === "interview-consent"
                            ? "Recording consent"
                          : "Share your perspective"}
                </h2>
              </div>
              <button
                aria-label="Close dialog"
                type="button"
                data-testid="button-close-dialog"
                onClick={() => setDialog(null)}
                className="grid h-8 w-8 place-items-center rounded-lg text-[#75837f] hover:bg-[#efeee7]"
              >
                <X size={17} />
              </button>
            </div>
            {dialog.kind === "comprehensive-resume" && (
              <div
                data-testid="panel-comprehensive-resume"
                className="space-y-5"
              >
                <section className="grid gap-4 rounded-2xl bg-[#edf3ec] p-5 sm:grid-cols-[220px_minmax(0,1fr)] sm:p-6">
                  <div>
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[.14em] text-[#6b877a]">
                      Candidate-provided profile
                    </div>
                    <h3 className="serif text-[28px] font-bold tracking-[-.05em] text-[#263e42]">
                      Maya Chen
                    </h3>
                    <p className="mt-1 text-[13px] font-semibold text-[#4c6961]">
                      Senior Product Designer · Brooklyn, NY
                    </p>
                    <p className="mt-2 text-[11px] text-[#74847c]">
                      maya.chen@demo.talent · 7 years of experience
                    </p>
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-[12px] font-bold text-[#344d4d]">
                        Sample resume preview
                      </h3>
                      <div className="flex gap-3 text-[10px] font-semibold text-[#39715d]">
                        <a
                          href={`${import.meta.env.BASE_URL}sample_resume.pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                        >
                          Open PDF
                        </a>
                        <a
                          href={`${import.meta.env.BASE_URL}sample_resume.pdf`}
                          download="sample_resume.pdf"
                          className="hover:underline"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                    <iframe
                      data-testid="iframe-sample-resume"
                      title="Scrollable sample resume PDF"
                      src={`${import.meta.env.BASE_URL}sample_resume.pdf`}
                      className="h-[58vh] min-h-[400px] max-h-[640px] w-full rounded-xl border border-[#dbe5da] bg-white"
                    />
                  </div>
                </section>
                <div className="hidden">
                  <section
                    className="rounded-2xl border border-[#e4e2d9] bg-white/60 p-5"
                    aria-labelledby="resume-files-heading"
                  >
                    <h3
                      id="resume-files-heading"
                      className="mb-3 text-[13px] font-bold text-[#344d4d]"
                    >
                      Uploaded resumes
                    </h3>
                    <div className="space-y-2">
                      {uploadedResumes.map((resume) => (
                        <div
                          key={resume.id}
                          data-testid={`resume-file-${resume.id}`}
                          className="flex items-center justify-between gap-3 rounded-xl bg-[#f3f3ec] px-3 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <FileText
                              size={16}
                              className="shrink-0 text-[#4a7a68]"
                            />
                            <div className="min-w-0">
                              <div className="truncate text-[11px] font-semibold text-[#425957]">
                                {resume.name}
                              </div>
                              <div className="mt-0.5 text-[10px] text-[#8a9790]">
                                Updated {resume.updated}
                              </div>
                            </div>
                          </div>
                          {resume.current && (
                            <span className="shrink-0 rounded-full bg-[#dfebe0] px-2.5 py-1 text-[9px] font-bold text-[#39715d]">
                              Current
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[10px] leading-4 text-[#89958e]">
                      Files and profile details are sample data in this demo.
                    </p>
                  </section>
                  <section
                    className="rounded-2xl border border-[#e4e2d9] bg-white/60 p-5"
                    aria-labelledby="resume-preferences-heading"
                  >
                    <h3
                      id="resume-preferences-heading"
                      className="mb-3 text-[13px] font-bold text-[#344d4d]"
                    >
                      Career preferences
                    </h3>
                    <dl className="space-y-2 text-[11px]">
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#84918b]">Interested in</dt>
                        <dd className="text-right font-semibold text-[#4d625c]">
                          Senior product design roles
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#84918b]">Work style</dt>
                        <dd className="text-right font-semibold text-[#4d625c]">
                          Remote or hybrid
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#84918b]">Location</dt>
                        <dd className="text-right font-semibold text-[#4d625c]">
                          New York, NY
                        </dd>
                      </div>
                    </dl>
                  </section>
                  <section
                    className="rounded-2xl border border-[#e4e2d9] bg-white/60 p-5 lg:col-span-2"
                    aria-labelledby="resume-experience-heading"
                  >
                    <h3
                      id="resume-experience-heading"
                      className="mb-4 text-[13px] font-bold text-[#344d4d]"
                    >
                      Experience
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {candidateExperience.map((item) => (
                        <div
                          key={item.company}
                          className="border-l-2 border-[#bdd0c0] pl-3.5"
                        >
                          <div className="text-[12px] font-bold text-[#344d4d]">
                            {item.title}
                          </div>
                          <div className="mt-1 text-[11px] text-[#5d756c]">
                            {item.company} · {item.dates}
                          </div>
                          <p className="mt-2 text-[11px] leading-5 text-[#7a8982]">
                            {item.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section
                    className="rounded-2xl border border-[#e4e2d9] bg-white/60 p-5"
                    aria-labelledby="resume-education-heading"
                  >
                    <h3
                      id="resume-education-heading"
                      className="mb-2 text-[13px] font-bold text-[#344d4d]"
                    >
                      Education
                    </h3>
                    <p className="text-[12px] font-semibold text-[#4d625c]">
                      BFA, Communication Design
                    </p>
                    <p className="mt-1 text-[11px] text-[#7c8983]">
                      Parsons School of Design · 2019
                    </p>
                  </section>
                  <section
                    className="rounded-2xl border border-[#e4e2d9] bg-white/60 p-5"
                    aria-labelledby="resume-skills-heading"
                  >
                    <h3
                      id="resume-skills-heading"
                      className="mb-3 text-[13px] font-bold text-[#344d4d]"
                    >
                      Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {candidateSkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-[#edf2ea] px-2.5 py-1.5 text-[10px] font-semibold text-[#587166]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            )}
            {currentJob && dialog.kind === "status" && (
              <div data-testid={`status-details-${currentJob.id}`}>
                <div className="rounded-xl bg-[#f1f3ec] p-4">
                  <div className="text-[12px] font-bold">
                    {currentJob.title}
                  </div>
                  <div className="mt-1 text-[11px] text-[#778580]">
                    {currentJob.company} · {currentJob.date}
                  </div>
                  <p className="mt-4 text-[13px] leading-6 text-[#536766]">
                    {currentJob.detail}
                  </p>
                </div>
                <div className="mt-4 flex gap-3 rounded-xl border border-[#e9e3d6] bg-[#fff9ec] p-3.5">
                  <Clock3
                    size={16}
                    className="mt-0.5 shrink-0 text-[#ad783f]"
                  />
                  <p className="text-[12px] leading-5 text-[#6b6253]">
                    {currentJob.next}
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="button-close-status"
                  onClick={() => setDialog(null)}
                  className="mt-5 w-full rounded-xl bg-[#205e53] py-3 text-[12px] font-bold text-white"
                >
                  Got it
                </button>
              </div>
            )}
            {currentJob && dialog.kind === "candidate-follow-up" && (
              <form
                data-testid="form-candidate-follow-up"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveCandidateFollowUpAnswers();
                }}
                className="space-y-4"
              >
                <section className="rounded-xl bg-[#edf3ec] p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[.13em] text-[#668176]">
                    {currentJob.title} · {currentJob.company}
                  </div>
                  <p className="mt-2 text-[12px] leading-5 text-[#5e736a]">
                    {currentJob.detail}
                  </p>
                  <p className="mt-2 text-[10px] leading-5 text-[#7b8b82]">
                    These questions are tailored to the product-design skills
                    and experience on your resume.
                  </p>
                </section>
                {candidateFollowUp.submitted && (
                  <div
                    role="status"
                    data-testid="status-follow-up-submitted"
                    className="rounded-xl border border-[#d7e6d9] bg-[#f1f7ef] px-4 py-3 text-[11px] font-semibold text-[#39715d]"
                  >
                    Your responses were submitted. You can update them while
                    this follow-up request is open.
                  </div>
                )}
                <div className="space-y-4">
                  {candidateFollowUpQuestions.map((question, index) => (
                    <div
                      key={question.id}
                      className="rounded-xl border border-[#e5e5dc] bg-white/70 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label
                          htmlFor={`candidate-follow-up-${question.id}`}
                          className="text-[11px] font-bold text-[#405752]"
                        >
                          Question {index + 1}
                        </label>
                        <span className="rounded-full bg-[#edf2ea] px-2.5 py-1 text-[9px] font-bold text-[#5e786b]">
                          {question.focus}
                        </span>
                      </div>
                      <p className="mb-3 text-[12px] leading-5 text-[#5f726b]">
                        {question.prompt}
                      </p>
                      <textarea
                        id={`candidate-follow-up-${question.id}`}
                        data-testid={`input-follow-up-${question.id}`}
                        value={candidateFollowUp.answers[question.id] ?? ""}
                        onChange={(event) =>
                          updateCandidateFollowUpAnswer(
                            question.id,
                            event.target.value,
                          )
                        }
                        rows={3}
                        required
                        maxLength={1200}
                        placeholder="Share a brief example..."
                        className="w-full resize-y rounded-lg border border-[#dfe5dc] bg-[#fffefa] px-3 py-2.5 text-[11px] leading-5 text-[#4f655e] outline-none placeholder:text-[#a1aaa3] focus:border-[#438274] focus:ring-4 focus:ring-[#438274]/10"
                      />
                    </div>
                  ))}
                </div>
                {candidateFollowUpError && (
                  <p role="alert" className="text-[11px] font-semibold text-[#a14f42]">
                    {candidateFollowUpError}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eeece4] pt-4">
                  <span
                    data-testid="text-follow-up-progress"
                    className="text-[10px] text-[#788780]"
                  >
                    {candidateFollowUpQuestions.filter(
                      (question) =>
                        candidateFollowUp.answers[question.id]?.trim(),
                    ).length}{" "}
                    of {candidateFollowUpQuestions.length} answered
                  </span>
                  <button
                    type="submit"
                    data-testid="button-submit-follow-up"
                    disabled={candidateFollowUpQuestions.some(
                      (question) =>
                        !candidateFollowUp.answers[question.id]?.trim(),
                    )}
                    className="rounded-xl bg-[#205e53] px-5 py-3 text-[11px] font-bold text-white transition hover:bg-[#184d44] disabled:cursor-not-allowed disabled:bg-[#a7b6ad]"
                  >
                    {candidateFollowUp.submitted
                      ? "Update answers"
                      : "Submit answers"}
                  </button>
                </div>
              </form>
            )}
            {dialog.kind === "resume" && (
              <div>
                <p className="mb-4 text-[13px] leading-6 text-[#687976]">
                  Choose a resume to attach to your applications. This demo
                  updates your selected file locally.
                </p>
                <label
                  htmlFor="resume-file"
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#b8c9bc] bg-[#f5f7ef] p-4 hover:border-[#508574]"
                >
                  <Upload size={18} className="text-[#357364]" />
                  <span>
                    <span className="block text-[12px] font-bold text-[#3e5653]">
                      Choose a resume file
                    </span>
                    <span className="mt-1 block text-[10px] text-[#8b9790]">
                      PDF or DOCX · select from your device
                    </span>
                  </span>
                  <input
                    id="resume-file"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    data-testid="input-resume-file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setResumeName(file.name);
                        setResumeSaved(false);
                      }
                    }}
                    className="sr-only"
                  />
                </label>
                <div
                  data-testid="text-selected-resume"
                  className="mt-3 flex items-center gap-2 rounded-lg bg-[#efeee7] px-3 py-2 text-[11px] text-[#5d706b]"
                >
                  <FileText size={14} />
                  {resumeName}
                </div>
                {resumeSaved && (
                  <div
                    role="status"
                    data-testid="status-resume-saved"
                    className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-[#2c7866]"
                  >
                    <CheckCircle2 size={16} />
                    Resume updated for your applications.
                  </div>
                )}
                <button
                  type="button"
                  data-testid="button-save-resume"
                  onClick={saveResume}
                  className="mt-5 w-full rounded-xl bg-[#205e53] py-3 text-[12px] font-bold text-white hover:bg-[#184d44]"
                >
                  {resumeSaved ? "Resume saved" : "Save resume"}
                </button>
              </div>
            )}
            {currentJob && dialog.kind === "interview-consent" && (
              <div>
                <div
                  role="alert"
                  data-testid="warning-recording-consent"
                  className="rounded-xl border border-[#ead7bf] bg-[#fff8ec] p-4 text-[13px] leading-6 text-[#685944]"
                >
                  Your session will be recorded. Please provide consent to
                  record to continue or press Exit to abort the session.
                </div>
                <div className="mt-4 rounded-xl bg-[#f1f3ec] p-4">
                  <div className="text-[12px] font-bold text-[#344d4d]">
                    {currentJob.title}
                  </div>
                  <p className="mt-1 text-[11px] text-[#75827e]">
                    Maximum interview time: 90 minutes.
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    data-testid="button-consent-recording"
                    onClick={() => {
                      setInterviewConsentGiven(true);
                      setInterviewJobId(currentJob.id);
                      setDialog(null);
                      setLocation("/candidate/interview");
                    }}
                    className="rounded-xl bg-[#205e53] px-4 py-3 text-[12px] font-bold text-white hover:bg-[#184d44]"
                  >
                    I Consent
                  </button>
                  <button
                    type="button"
                    data-testid="button-exit-interview"
                    onClick={() => {
                      setInterviewConsentGiven(false);
                      setInterviewJobId(null);
                      setDialog(null);
                    }}
                    className="rounded-xl border border-[#dfd8cc] bg-[#f5f3ec] px-4 py-3 text-[12px] font-bold text-[#5e6c67] hover:bg-[#ece9e0]"
                  >
                    Exit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const JobPortalAccessNotice = () =>
    AppShell({
      active: "job-portal",
      children: (
        <section className="mx-auto max-w-[580px] rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e8efe7] text-[#397462]">
            <ShieldCheck size={21} />
          </div>
          <h1 className="serif mt-4 text-[25px] font-bold text-[#344d4d]">
            Job Portal access is limited.
          </h1>
          <p className="mt-2 text-[12px] leading-5 text-[#74817b]">
            This workspace is available to Hiring Manager accounts.
          </p>
          <button
            type="button"
            onClick={() => setLocation("/dashboard")}
            className="mt-5 rounded-xl bg-[#205e53] px-4 py-2.5 text-[11px] font-bold text-white"
          >
            Back to dashboard
          </button>
        </section>
      ),
    });

  const HiringManagerRoleDetails = () => {
    const [matches, params] = useRoute("/job-portal/:positionId");
    if (!session) return AuthPage();
    if (!hasHiringManagerAccess(session.role)) return JobPortalAccessNotice();
    if (!matches || !params) return <NotFound />;
    const selectedPosition = positions.find(
      (position) => position.id === params.positionId,
    );
    if (!selectedPosition) {
      return AppShell({
        active: "job-portal",
        children: (
          <section className="mx-auto max-w-xl rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-6 text-center">
            <h1 className="serif text-2xl font-bold text-[#344d4d]">
              Role not found
            </h1>
            <p className="mt-2 text-[11px] text-[#71817a]">
              This role may have been removed from the hiring workspace.
            </p>
            <button
              type="button"
              onClick={() => setLocation("/job-portal")}
              className="mt-4 rounded-xl bg-[#205e53] px-4 py-2.5 text-[11px] font-bold text-white"
            >
              Back to jobs
            </button>
          </section>
        ),
      });
    }
    return AppShell({
      active: "job-portal",
      children: (
        <RoleDetailsPage
          position={selectedPosition}
          stakeholderInputStatuses={selectedPosition.stakeholders.map(
            (stakeholderEmail) => ({
              email: stakeholderEmail,
              completed: loadStakeholderFeedback(stakeholderEmail)
                .submittedJobIds.includes(
                  `stakeholder-${selectedPosition.id}`,
                ),
            }),
          )}
          saveError={positionSaveError}
          hasResumeFile={(applicantId) =>
            Boolean(candidateResumeFiles[applicantId])
          }
          onBack={() => setLocation("/job-portal")}
          onAddApplicant={(candidate) =>
            addPreferredApplicant(selectedPosition.id, candidate)
          }
          onToggleInterview={(applicantId, selected) =>
            toggleApplicantInterview(
              selectedPosition.id,
              applicantId,
              selected,
            )
          }
          onConfirmInterview={() =>
            confirmInterviewSelection(selectedPosition.id)
          }
          onOpenResume={openApplicantResume}
          onToggleFinalInterview={(applicantId, selected) =>
            toggleFinalInterviewSelection(
              selectedPosition.id,
              applicantId,
              selected,
            )
          }
          onScheduleFinalInterview={() =>
            scheduleFinalInterview(selectedPosition.id)
          }
          onCompleteFinalInterview={(applicantId) =>
            updateOffer(selectedPosition.id, { type: "complete", applicantId })
          }
          onCloseJob={() => updateOffer(selectedPosition.id, { type: "close" })}
          onToggleOfferCandidate={(applicantId, selected) =>
            toggleOfferCandidate(
              selectedPosition.id,
              applicantId,
              selected,
            )
          }
          onRankOfferCandidate={(applicantId, rank) =>
            rankOfferCandidate(selectedPosition.id, applicantId, rank)
          }
          onProcessOffer={() => processOffer(selectedPosition.id)}
          onAcceptOffer={(applicantId) =>
            acceptOffer(selectedPosition.id, applicantId)
          }
          onHoldPosition={() => holdPosition(selectedPosition.id)}
          onRemovePosition={() => removePosition(selectedPosition.id)}
          onResumePosition={() => resumePosition(selectedPosition.id)}
        />
      ),
    });
  };

  const HiringManagerJobPortal = () => {
    if (!session) return AuthPage();
    if (!hasHiringManagerAccess(session.role)) return JobPortalAccessNotice();
    const sharedPositions = positions.filter((position) =>
      position.ownerEmail.toLowerCase() === session.email.toLowerCase() ||
      (demoHiringManagerEmails.includes(session.email.toLowerCase()) &&
        demoHiringManagerEmails.includes(position.ownerEmail.toLowerCase())),
    );
    return AppShell({
      active: "job-portal",
      children: (
        <>
          {positionSaveError && (
            <div
              role="status"
              className="mb-4 rounded-xl border border-[#ead7bf] bg-[#fff8ec] px-4 py-3 text-[11px] text-[#685944]"
            >
              {positionSaveError}
            </div>
          )}
          <JobPortalPage
            positions={sharedPositions}
            onCreate={startCreatePosition}
            onDuplicate={startDuplicatePosition}
            onOpenPosition={(position) =>
              setLocation(`/job-portal/${position.id}`)
            }
            onBackToDashboard={() => setLocation("/dashboard")}
          />
        </>
      ),
    });
  };

  const PositionCreateRoute = () => {
    if (!session) return AuthPage();
    if (!hasHiringManagerAccess(session.role)) return JobPortalAccessNotice();
    return AppShell({
      active: "job-portal",
      children: (
        <CreatePositionPage
          initialValues={positionForm}
          isDuplicate={isPositionDuplicate}
          onCancel={cancelPositionForm}
          onSave={savePosition}
        />
      ),
    });
  };

  const CandidatePortal = () => {
    if (!session || session.role !== "Candidate") return AuthPage();
    const candidateApplications = [...seedJobs].sort(
      (a, b) =>
        Number(b.status === "Follow-up Requested") -
        Number(a.status === "Follow-up Requested"),
    );
    return AppShell({
      active: "candidate",
      children: (
        <>
          <div className="mb-8">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#68857a]">
              Your candidate portal
            </div>
            <h1 className="serif text-[clamp(30px,4vw,43px)] font-bold tracking-[-.055em]">
              Good morning, Maya.
            </h1>
            <p className="mt-2 text-[13px] text-[#75827e]">
              Here’s where things stand with your applications.
            </p>
          </div>
          <div className="mb-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#e5e2d8] bg-[#fbfaf5] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[.12em] text-[#89938c]">
                Applications
              </div>
              <div
                data-testid="text-application-count"
                className="serif mt-2 text-[26px] font-bold"
              >
                05
              </div>
              <div className="mt-1 text-[11px] text-[#7b8781]">
                You’re in the running
              </div>
            </div>
            <div className="rounded-2xl border border-[#e5e2d8] bg-[#fbfaf5] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[.12em] text-[#89938c]">
                In progress
              </div>
              <div
                data-testid="text-in-progress-count"
                className="serif mt-2 text-[26px] font-bold"
              >
                03
              </div>
              <div className="mt-1 text-[11px] text-[#7b8781]">
                Being reviewed or interviewed
              </div>
            </div>
            <button
              type="button"
              data-testid="button-view-comprehensive-resume"
              onClick={() => openDialog("comprehensive-resume")}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[#dfe5d9] bg-[#eaf0e8] p-4 text-left hover:border-[#adc3b2] hover:bg-[#e3ede2]"
            >
              <span className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#d7e6d8] text-[#397462]">
                  <FileText size={18} />
                </span>
                <span>
                  <span className="block text-[11px] font-bold text-[#35574e]">
                    View Comprehensive Resume
                  </span>
                  <span className="mt-1 block text-[10px] text-[#70827b]">
                    Resume files, experience and profile
                  </span>
                </span>
              </span>
              <ArrowRight size={16} className="shrink-0 text-[#53776a]" />
            </button>
          </div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="serif text-[21px] font-bold tracking-[-.035em]">
              Your applications
            </h2>
            <span className="text-[10px] text-[#8b9690]">Updated just now</span>
          </div>
          <div className="space-y-3">
            {candidateApplications.map((job, index) => (
              <article
                key={job.id}
                data-testid={`card-application-${job.id}`}
                className="rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-4 shadow-[0_6px_25px_-22px_rgba(31,59,54,.3)] sm:p-5"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex gap-3">
                    <div
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[12px] font-bold ${["bg-[#e7ece2] text-[#4a6e5c]", "bg-[#f4e9d8] text-[#8a6337]", "bg-[#e9e6df] text-[#6f7770]"][index % 3]}`}
                    >
                      {job.company
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-[#2d4446]">
                        {job.title}
                      </h3>
                      <div className="mt-1 text-[11px] text-[#73817d]">
                        {job.company}
                        <span className="px-1.5 text-[#c0c5bb]">·</span>
                        {job.location}
                      </div>
                      <div className="mt-2 text-[10px] text-[#9aa19b]">
                        {job.date}
                      </div>
                    </div>
                  </div>
                  <span
                    data-testid={`status-application-${job.id}`}
                    className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${job.status === "Interviewing" || job.status === "Follow-up Requested" ? "bg-[#f8ead5] text-[#8a602e]" : job.status === "In review" ? "bg-[#e3eee6] text-[#3c735f]" : "bg-[#eeeee7] text-[#65746e]"}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                    {job.status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#eeece4] pt-3">
                  {(job.status === "Application received" ||
                    job.status === "Follow-up Requested") && (
                    <button
                      type="button"
                      data-testid={`button-resume-${job.id}`}
                      onClick={() => openDialog("resume", job.id)}
                      className="rounded-lg px-3 py-2 text-[11px] font-semibold text-[#47615b] hover:bg-[#edf1e9]"
                    >
                      Update resume
                    </button>
                  )}
                  {job.status === "Follow-up Requested" && (
                    <button
                      type="button"
                      data-testid={`button-follow-up-${job.id}`}
                      onClick={() => openDialog("candidate-follow-up", job.id)}
                      className="rounded-lg bg-[#205e53] px-3 py-2 text-[11px] font-semibold text-white hover:bg-[#184d44]"
                    >
                      {candidateFollowUp.submitted
                        ? "Review answers"
                        : "Answer questions"}
                    </button>
                  )}
                  {job.status === "Follow-up Requested" &&
                    candidateFollowUp.submitted && (
                      <span
                        role="status"
                        data-testid="text-follow-up-complete"
                        className="ml-auto self-center text-[10px] font-semibold text-[#39715d]"
                      >
                        Follow-up submitted
                      </span>
                    )}
                  {job.status === "Interviewing" && (
                    <button
                      type="button"
                      data-testid={`button-interview-${job.id}`}
                      onClick={() => openDialog("interview-consent", job.id)}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[#dce3d9] px-3 py-2 text-[11px] font-semibold text-[#35685a] hover:bg-[#edf3eb]"
                    >
                      <CalendarDays size={13} />
                      Interview
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          <div className="mt-7 flex items-start gap-3 rounded-xl border border-[#e6e3d9] bg-[#f8f6ef] p-4">
            <MessageSquareText
              size={16}
              className="mt-0.5 shrink-0 text-[#a97843]"
            />
            <p className="text-[11px] leading-5 text-[#73807a]">
              <strong className="font-semibold text-[#536660]">
                Need a hand?
              </strong>{" "}
              Your hiring contacts will reach out if they need anything else.
              You can reply directly to any email update.
            </p>
          </div>
          <CandidateApplicationChat
            applications={candidateApplications}
            followUpSubmitted={candidateFollowUp.submitted}
          />
        </>
      ),
    });
  };

  const CandidateInterviewPage = () => {
    if (!session || session.role !== "Candidate") return AuthPage();
    const interviewJob = seedJobs.find((job) => job.id === interviewJobId);
    if (!interviewConsentGiven || !interviewJob) return CandidatePortal();
    return AppShell({
      active: "candidate",
      children: (
        <CandidateInterviewRoom
          jobTitle={interviewJob.title}
          onReturnToApplications={() => {
            setInterviewConsentGiven(false);
            setInterviewJobId(null);
            setLocation("/candidate");
          }}
        />
      ),
    });
  };

  const StakeholderPortal = () => {
    if (!session || session.role !== "Stakeholder") return AuthPage();
    const selectedJob = stakeholderJobs.find(
      (job) => job.id === stakeholderWorkflow,
    );
    const pending = stakeholderJobs.filter(
      (job) => !submitted.includes(job.id),
    );
    return AppShell({
      active: "stakeholder",
      children: (
        selectedJob ? (
          <StakeholderFeedbackWorkspace
            job={selectedJob}
            initialAnswers={stakeholderAnswers[selectedJob.id] ?? {}}
            onBack={(draft) => {
              saveStakeholderFeedback({
                ...stakeholderFeedback,
                answers: {
                  ...stakeholderFeedback.answers,
                  [selectedJob.id]: draft,
                },
              });
              setStakeholderWorkflow(null);
            }}
            onSubmit={(answers) => {
              saveStakeholderFeedback({
                answers: {
                  ...stakeholderFeedback.answers,
                  [selectedJob.id]: answers,
                },
                submittedJobIds: stakeholderFeedback.submittedJobIds.includes(
                  selectedJob.id,
                )
                  ? stakeholderFeedback.submittedJobIds
                  : [...stakeholderFeedback.submittedJobIds, selectedJob.id],
              });
              setStakeholderWorkflow(null);
            }}
          />
        ) : (
          <>
            <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#68857a]">
                  A note from the hiring team
                </div>
                <h1 className="serif text-[clamp(30px,4vw,43px)] font-bold tracking-[-.055em]">
                  Your perspective matters.
                </h1>
                <p className="mt-2 max-w-[520px] text-[13px] leading-6 text-[#75827e]">
                  Review the role details and share input on the positions
                  waiting for your perspective.
                </p>
              </div>
              <div className="flex w-fit items-center gap-2 rounded-xl bg-[#e9efe7] px-3.5 py-2.5 text-[11px] font-semibold text-[#41695c]">
                <ClipboardCheck size={15} />
                {pending.length} jobs awaiting your input
              </div>
            </div>
            {stakeholderSaveError && (
              <div role="alert" className="mb-4 rounded-xl border border-[#ead7bf] bg-[#fff8ec] px-4 py-3 text-[11px] text-[#685944]">
                {stakeholderSaveError}
              </div>
            )}
            {pending.length === 0 ? (
              <div className="rounded-2xl border border-[#dce5db] bg-[#f2f6ee] px-6 py-14 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#dfebdf] text-[#397462]">
                  <Check size={22} />
                </div>
                <h2 className="serif mt-4 text-[22px] font-bold">
                  You’re all caught up.
                </h2>
                <p className="mt-2 text-[12px] text-[#7d8982]">
                  There are no open requests for your input right now.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pending.map((job) => (
                  <article
                    key={job.id}
                    data-testid={`card-feedback-request-${job.id}`}
                    className="rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-5 sm:p-6"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[.12em] text-[#71867c]">
                          {job.jobId}
                        </div>
                        <h2 className="serif text-[20px] font-bold text-[#344d4d]">
                          {job.title}
                        </h2>
                        <div className="mt-1 text-[11px] text-[#74817b]">
                          {job.team}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[#989f99]">
                          <Clock3 size={12} />
                          {job.time}
                        </div>
                      </div>
                      <span className="w-fit rounded-full bg-[#f5ead9] px-2.5 py-1 text-[10px] font-bold text-[#8c6537]">
                        Input requested
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[#eeece4] pt-3">
                      <button
                        type="button"
                        data-testid={`button-job-details-${job.id}`}
                        aria-expanded={jobDetailsOpen === job.id}
                        onClick={() =>
                          setJobDetailsOpen((current) =>
                            current === job.id ? null : job.id,
                          )
                        }
                        className="rounded-lg border border-[#dfe4d9] px-3 py-2 text-[11px] font-semibold text-[#47615b] hover:bg-[#edf1e9]"
                      >
                        {jobDetailsOpen === job.id
                          ? "Hide Job Details"
                          : "Show Job Details"}
                      </button>
                      <button
                        type="button"
                        data-testid={`button-open-feedback-${job.id}`}
                        onClick={() => setStakeholderWorkflow(job.id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#205e53] px-4 py-2.5 text-[11px] font-bold text-white hover:bg-[#184d44]"
                      >
                        Share your input
                        <ArrowRight size={14} />
                      </button>
                    </div>
                    {jobDetailsOpen === job.id && (
                      <div
                        data-testid={`details-feedback-request-${job.id}`}
                        className="mt-4 grid gap-4 rounded-xl bg-[#f3f3ec] p-4 sm:grid-cols-2"
                      >
                        <div>
                          <h3 className="text-[11px] font-bold text-[#435c56]">
                            Job details
                          </h3>
                          <p className="mt-1 whitespace-pre-line text-[11px] leading-5 text-[#60736c]">
                            {job.jobDetails}
                          </p>
                        </div>
                        <div>
                          <h3 className="text-[11px] font-bold text-[#435c56]">
                            Requirements
                          </h3>
                          <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-5 text-[#60736c]">
                            {job.requirements.map((requirement) => (
                              <li key={requirement}>{requirement}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
            <div className="mt-7 rounded-xl border border-[#e6e3d9] bg-[#f8f6ef] p-4 text-[11px] leading-5 text-[#78847d]">
              <strong className="font-semibold text-[#50645f]">
                A quick note:
              </strong>{" "}
              Feedback is shared privately with the hiring team. Candidate
              identities are not displayed in this workspace.
            </div>
          </>
        )
      ),
    });
  };

  const Dashboard = () => {
    if (!session || !isInternal(session.role)) return AuthPage();
    if (
      hasViewerOnlyAccess(session.role, session.roles) &&
      !adminSettings.allowViewerDashboard
    ) {
      return AppShell({
        active: "dashboard",
        children: (
          <section className="rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-6">
            <h1 className="serif text-2xl font-bold text-[#2d4446]">
              Viewer access is disabled
            </h1>
            <p className="mt-2 text-sm text-[#75827e]">
              An Admin has disabled access to Reports &amp; Analytics for Viewer accounts.
            </p>
          </section>
        ),
      });
    }
    const activity = [
      { month: "Jan 2025", opened: 5, filled: 3, applied: 82, hired: 3 },
      { month: "Feb 2025", opened: 7, filled: 4, applied: 115, hired: 4 },
      { month: "Mar 2025", opened: 6, filled: 5, applied: 134, hired: 5 },
      { month: "Apr 2025", opened: 9, filled: 6, applied: 189, hired: 6 },
      { month: "May 2025", opened: 8, filled: 7, applied: 201, hired: 7 },
      { month: "Jun 2025", opened: 10, filled: 8, applied: 240, hired: 8 },
      { month: "Jul 2025", opened: 11, filled: 5, applied: 278, hired: 5 },
      { month: "Aug 2025", opened: 4, filled: 0, applied: 47, hired: 0 },
    ];
    const isAdmin = hasAdminAccess(session.role);
    const canManageJobs = hasHiringManagerAccess(session.role);
    const chartX = (index: number) => 64 + index * 86;
    const applicationY = (value: number) => 242 - (value / 300) * 190;
    const positionY = (value: number) => 242 - (value / 12) * 190;
    const linePoints = (key: "opened" | "filled" | "hired") =>
      activity
        .map((row, index) => `${chartX(index)},${positionY(row[key])}`)
        .join(" ");
    return AppShell({
      active: "dashboard",
      children: (
        <div className="space-y-6">
          <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#68857a]">
                AiccuHire · Internal workspace
              </div>
              <h1 className="serif text-[clamp(28px,4vw,38px)] font-bold tracking-[-.05em] text-[#2d4446]">
                Reports &amp; Analytics
              </h1>
              <p className="mt-1 text-[12px] text-[#75827e]">
                Comprehensive insights into your hiring pipeline and operations.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => setLocation("/admin")}
                title={isAdmin ? undefined : "Admin Page is available to Admin accounts"}
                className={`rounded-xl px-3.5 py-2.5 text-[10px] font-bold ${isAdmin ? "bg-[#205e53] text-white hover:bg-[#184d44]" : "cursor-not-allowed border border-[#dfe4d9] bg-[#eeeee7] text-[#929b95]"}`}
              >
                Admin Page
              </button>
              <button
                type="button"
                disabled={!canManageJobs}
                onClick={() => setLocation("/job-portal")}
                title={canManageJobs ? undefined : "Job Portal is available to Hiring Manager accounts"}
                className={`rounded-xl px-3.5 py-2.5 text-[10px] font-bold ${canManageJobs ? "bg-[#205e53] text-white hover:bg-[#184d44]" : "cursor-not-allowed border border-[#dfe4d9] bg-[#eeeee7] text-[#929b95]"}`}
              >
                Job Portal
              </button>
            </div>
          </header>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Open Positions", value: "7", note: "5 positions filled", icon: BriefcaseBusiness },
              { label: "Avg Days to Hire", value: "32", note: "Across all departments", icon: Clock3 },
              { label: "Offer Acceptance", value: "67%", note: "3 offers extended", icon: CheckCircle2 },
              { label: "Avg AI Match Score", value: "82", note: "Active candidates", icon: Sparkles },
            ].map((metric) => (
              <section key={metric.label} className="rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-4 shadow-[0_8px_22px_rgba(31,59,54,.04)]">
                <div className="flex items-center justify-between text-[10px] font-semibold text-[#76847d]">
                  {metric.label}
                  <metric.icon size={15} className="text-[#688b79]" />
                </div>
                <div className="serif mt-3 text-[29px] font-bold text-[#2d4446]">{metric.value}</div>
                <div className="mt-1 text-[9px] text-[#89958e]">{metric.note}</div>
              </section>
            ))}
          </div>

          <section className="overflow-hidden rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] shadow-[0_8px_22px_rgba(31,59,54,.04)]">
            <div className="border-b border-[#e8e5dd] px-5 py-4">
              <div className="flex items-center gap-2 text-[12px] font-bold text-[#344d4d]">
                <CalendarDays size={15} className="text-[#688b79]" />
                Hiring Activity &amp; Volume
              </div>
              <p className="mt-1 text-[10px] text-[#829087]">
                Monthly trends comparing requisitions and application volume.
              </p>
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,.85fr)] sm:p-5">
              <div className="min-w-0">
                <div className="overflow-x-auto">
                  <svg
                    role="img"
                    aria-label="Hiring activity chart for January through August 2025"
                    viewBox="0 0 760 300"
                    className="min-w-[620px] w-full"
                  >
                    {[0, 1, 2, 3, 4].map((step) => {
                      const y = 242 - step * 47.5;
                      return (
                        <g key={step}>
                          <line x1="48" y1={y} x2="710" y2={y} stroke="#e9e9df" strokeWidth="1" />
                          <text x="35" y={y + 3} textAnchor="end" fill="#89958e" fontSize="9">
                            {step * 70}
                          </text>
                          <text x="720" y={y + 3} fill="#89958e" fontSize="9">
                            {step * 3}
                          </text>
                        </g>
                      );
                    })}
                    {activity.map((row, index) => {
                      const x = chartX(index);
                      const y = applicationY(row.applied);
                      return (
                        <g key={row.month}>
                          <rect x={x - 13} y={y} width="26" height={242 - y} rx="4" fill="#8eae95" />
                          <text x={x} y="262" textAnchor="middle" fill="#78867f" fontSize="8">
                            {row.month.slice(0, 3)}
                          </text>
                        </g>
                      );
                    })}
                    <polyline points={linePoints("opened")} fill="none" stroke="#d99152" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points={linePoints("filled")} fill="none" stroke="#537c72" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points={linePoints("hired")} fill="none" stroke="#7184a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 4" />
                    {activity.map((row, index) => (
                      <g key={`points-${row.month}`}>
                        <circle cx={chartX(index)} cy={positionY(row.opened)} r="3.2" fill="#d99152" />
                        <circle cx={chartX(index)} cy={positionY(row.filled)} r="3.2" fill="#537c72" />
                        <circle cx={chartX(index)} cy={positionY(row.hired)} r="2.7" fill="#7184a6" />
                      </g>
                    ))}
                  </svg>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[9px] font-medium text-[#71817a]">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#8eae95]" />Applied</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 bg-[#d99152]" />Opened</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 bg-[#537c72]" />Filled</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 border-t border-dashed border-[#7184a6]" />Hired</span>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[#e8e5dd]">
                <table className="w-full min-w-[400px] text-left text-[9px]">
                  <thead className="bg-[#f3f2eb] text-[8px] font-bold uppercase tracking-[.08em] text-[#7e8b83]">
                    <tr>
                      <th className="px-2 py-2.5">Month</th>
                      <th className="px-2 py-2.5 text-right">Opened</th>
                      <th className="px-2 py-2.5 text-right">Filled</th>
                      <th className="px-2 py-2.5 text-right">Applied</th>
                      <th className="px-2 py-2.5 text-right">Hired</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eeece4] text-[#566b63]">
                    {activity.map((row) => (
                      <tr key={`table-${row.month}`}>
                        <td className="whitespace-nowrap px-2 py-2 font-medium">{row.month}</td>
                        <td className="px-2 py-2 text-right">{row.opened}</td>
                        <td className="px-2 py-2 text-right">{row.filled}</td>
                        <td className="px-2 py-2 text-right">{row.applied}</td>
                        <td className="px-2 py-2 text-right font-semibold text-[#397462]">{row.hired}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      ),
    });
  };

  const AdminPanelRoute = () => {
    if (!session) return AuthPage();
    if (!hasAdminAccess(session.role)) {
      return AppShell({
        active: "admin",
        children: (
          <section className="rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-6">
            <h1 className="serif text-2xl font-bold text-[#2d4446]">
              Admin access required
            </h1>
            <p className="mt-2 text-sm text-[#75827e]">
              Only Admin accounts can open workspace administration.
            </p>
            <button
              type="button"
              onClick={() => setLocation("/dashboard")}
              className="mt-4 rounded-xl bg-[#205e53] px-4 py-2.5 text-[11px] font-bold text-white hover:bg-[#184d44]"
            >
              Return to dashboard
            </button>
          </section>
        ),
      });
    }
    return (
      <AdminPanelPage
        adminEmail={session.email}
        users={adminUsers}
        settings={adminSettings}
        onAddUser={addAdminUser}
        onSaveSettings={saveAdminSettings}
        onBackToDashboard={() => setLocation("/dashboard")}
        onSignOut={signOut}
      />
    );
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ErrorBoundary resetKey={window.location.pathname}>
            <Switch>
              <Route path="/">{AuthPage()}</Route>
              <Route path="/candidate/interview">
                {CandidateInterviewPage()}
              </Route>
              <Route path="/candidate">{CandidatePortal()}</Route>
              <Route path="/stakeholder">{StakeholderPortal()}</Route>
              <Route path="/admin">{AdminPanelRoute()}</Route>
              <Route path="/dashboard">{Dashboard()}</Route>
              <Route
                path="/job-portal/:positionId"
                component={HiringManagerRoleDetails}
              />
              <Route path="/job-portal">{HiringManagerJobPortal()}</Route>
              <Route path="/positions/create">{PositionCreateRoute()}</Route>
              <Route component={NotFound} />
            </Switch>
          </ErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
