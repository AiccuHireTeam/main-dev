import {
  Archive,
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CirclePlus,
  FileText,
  Mail,
  MapPin,
  Pause,
  Play,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import type { HiringPosition, RoleApplicant } from "@/components/job-portal-pages";
import { offerSelectionError } from "@/lib/offer-workflow";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export type NewRoleApplicant = {
  name: string;
  email: string;
  resumeName: string;
  resumeFile: File;
};

type CandidateFormValues = {
  name: string;
  email: string;
  resume: FileList;
};

type StakeholderInputStatus = {
  email: string;
  completed: boolean;
};

type RoleDetailsPageProps = {
  position: HiringPosition;
  stakeholderInputStatuses: StakeholderInputStatus[];
  saveError?: string;
  hasResumeFile(applicantId: string): boolean;
  onBack(): void;
  onAddApplicant(applicant: NewRoleApplicant): void;
  onToggleInterview(applicantId: string, selected: boolean): void;
  onConfirmInterview(): void;
  onOpenResume(applicantId: string): void;
  onHoldPosition(): void;
  onRemovePosition(): void;
  onResumePosition(): void;
  onToggleFinalInterview(applicantId: string, selected: boolean): void;
  onScheduleFinalInterview(): void;
  onCompleteFinalInterview(applicantId: string): void;
  onCloseJob(): void;
  onToggleOfferCandidate(applicantId: string, selected: boolean): void;
  onRankOfferCandidate(applicantId: string, rank: 1 | 2 | 3): void;
  onProcessOffer(): void;
  onAcceptOffer(applicantId: string): void;
};

const detailClass =
  "rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-4 shadow-[0_8px_22px_rgba(31,59,54,.045)] sm:p-6";
const inputClass =
  "w-full rounded-xl border border-[#dfe1d8] bg-[#fffefa] px-3.5 py-3 text-[13px] text-[#3f5550] outline-none placeholder:text-[#a0aaa6] focus:border-[#438274] focus:ring-4 focus:ring-[#438274]/10";
const labelClass = "mb-1.5 block text-[11px] font-semibold text-[#50635d]";

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value || "Date not available";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9px] font-bold uppercase tracking-[.12em] text-[#87928a]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-[12px] font-semibold text-[#445b53]">
        {value || "Not specified"}
      </dd>
    </div>
  );
}

export function RoleDetailsPage({
  position,
  stakeholderInputStatuses,
  saveError,
  hasResumeFile,
  onBack,
  onAddApplicant,
  onToggleInterview,
  onConfirmInterview,
  onOpenResume,
  onHoldPosition,
  onRemovePosition,
  onResumePosition,
  onToggleFinalInterview,
  onScheduleFinalInterview,
  onCompleteFinalInterview,
  onCloseJob,
  onToggleOfferCandidate,
  onRankOfferCandidate,
  onProcessOffer,
  onAcceptOffer,
}: RoleDetailsPageProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedApplicant, setSelectedApplicant] =
    useState<RoleApplicant | null>(null);
  const candidateForm = useForm<CandidateFormValues>({
    defaultValues: { name: "", email: "" },
  });
  const [formError, setFormError] = useState("");
  const resumeFile = candidateForm.watch("resume")?.[0] ?? null;
  const applicants = [...(position.applicants ?? [])].sort(
    (first, second) => first.rank - second.rank,
  );
  const isFinalInterviewStage =
    position.status === "Ready for Final Interview" ||
    position.status === "Final Interview scheduled" ||
    position.status === "Final interviews completed";
  const isFinalInterviewScheduled =
    position.status === "Final Interview scheduled";
  const isOfferSelectionStage =
    position.status === "Final interviews completed";
  const isOfferProcessingStage = position.status === "Process Offer";
  const isPositionClosed = position.status === "Closed";
  const isScorecardStage =
    isFinalInterviewStage || isOfferProcessingStage || isPositionClosed;
  const isCandidateListLocked =
    isFinalInterviewScheduled ||
    isOfferSelectionStage ||
    isOfferProcessingStage ||
    isPositionClosed;
  const completedFinalInterviewApplicants = applicants.filter(
    (applicant) => applicant.finalInterviewCompleted === true,
  );
  const visibleApplicants =
    isOfferProcessingStage || isPositionClosed
      ? applicants.filter(
          (applicant) => applicant.selectedForOffer,
        )
      : isOfferSelectionStage
        ? completedFinalInterviewApplicants
        : isFinalInterviewStage
          ? applicants.filter(
        (applicant) =>
          applicant.interviewed !== false ||
          applicant.preferredForFinalInterview === true,
          )
          : applicants;
  const selectedCount = applicants.filter(
    (applicant) => applicant.selectedForInterview,
  ).length;
  const selectedFinalInterviewCount = visibleApplicants.filter(
    (applicant) => applicant.selectedForFinalInterview,
  ).length;
  const confirmedCount = applicants.filter(
    (applicant) =>
      applicant.selectedForInterview && applicant.interviewConfirmed,
  ).length;
  const scheduledFinalInterviewCount = applicants.filter(
    (applicant) => applicant.finalInterviewScheduled,
  ).length;
  const selectedOfferCount = applicants.filter(
    (applicant) => applicant.selectedForOffer,
  ).length;
  const selectionError = offerSelectionError(applicants);
  const incompleteFinalists = applicants.filter(
    (applicant) => applicant.finalInterviewScheduled && applicant.finalInterviewCompleted !== true,
  );
  const statusStyles =
    position.status === "On Hold"
      ? {
          badge: "border-[#e3d5bd] bg-[#fbf6ed] text-[#87643a]",
          dot: "bg-[#c38b45]",
        }
      : position.status === "Removed"
        ? {
            badge: "border-[#e6d4ce] bg-[#fbf3f0] text-[#985548]",
            dot: "bg-[#b36b5f]",
          }
        : position.status === "Draft"
          ? {
              badge: "border-[#e6dbc7] bg-[#f8f1e6] text-[#936b36]",
              dot: "bg-[#c38b45]",
            }
          : position.status === "Ready for Final Interview" ||
                position.status === "Final Interview scheduled" ||
                position.status === "Final interviews completed"
            ? {
                badge: "border-[#d8dfef] bg-[#edf1fa] text-[#4e638d]",
                dot: "bg-[#677cab]",
              }
            : position.status === "Process Offer"
              ? {
                  badge: "border-[#d4e4d5] bg-[#e8f1e9] text-[#34715f]",
                  dot: "bg-[#4d8a70]",
                }
              : position.status === "Closed"
                ? {
                    badge: "border-[#d4e4d5] bg-[#e8f1e9] text-[#34715f]",
                    dot: "bg-[#4d8a70]",
                  }
            : {
                badge: "border-[#d4e4d5] bg-[#e8f1e9] text-[#34715f]",
                dot: "bg-[#4d8a70]",
              };

  const submitCandidate = candidateForm.handleSubmit((values) => {
    setFormError("");
    const selectedFile = values.resume?.[0];
    if (!selectedFile) {
      setFormError("Select the preferred candidate’s resume to continue.");
      return;
    }
    if (!/\.(pdf|doc|docx)$/i.test(selectedFile.name)) {
      setFormError("Choose a PDF, DOC, or DOCX resume.");
      return;
    }
    if (selectedFile.size > 15 * 1024 * 1024) {
      setFormError("Resume files must be 15 MB or smaller.");
      return;
    }
    onAddApplicant({
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      resumeName: selectedFile.name,
      resumeFile: selectedFile,
    });
    candidateForm.reset();
    setShowAddForm(false);
  });

  return (
    <main className="page-enter mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onBack}
        data-testid="button-back-to-jobs"
        className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 py-2 text-[12px] font-semibold text-[#557068] hover:bg-[#e9eee7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Back to jobs
      </button>

      <header className="relative mb-5 overflow-hidden rounded-[22px] border border-[#e1e3d9] bg-[#f4f2e9] px-5 py-6 sm:px-8 sm:py-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border border-[#d9e0d3]" />
        <div className="relative">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#68857a]">
            <span>AiccuHire / Hiring workspace</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tracking-[.06em]" data-testid="text-requisition-id">{position.requisitionId}</span>
          </div>
          <h1 className="serif text-[clamp(26px,4vw,38px)] font-bold leading-tight tracking-[-.05em] text-[#2d4446]">
            {position.position}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-[#71817a]">
            <span className="font-semibold text-[#526a60]">{position.department}</span>
            <span aria-hidden="true" className="hidden text-[#a6afa7] sm:inline">·</span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} aria-hidden="true" /> {position.location}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles.badge}`} data-testid="status-role">
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot}`} />
              {position.status}
            </span>
          </div>
        </div>
      </header>

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[12px] font-bold text-[#344d4d]">Position controls</h2>
          <p className="mt-1 text-[10px] leading-4 text-[#84918b]">
            {isPositionClosed ? "This job is closed. Candidate ranks and recorded offer decisions are retained." : "Removing a position changes its status; the record is retained."}
          </p>
        </div>
        {isPositionClosed ? (
          <span className="text-[11px] font-semibold text-[#34715f]">Closed · Read only</span>
        ) : position.status === "Removed" ? (
          <span className="text-[11px] font-semibold text-[#9a5548]">
            This position is removed from active hiring.
          </span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {isOfferProcessingStage && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button type="button" data-testid="button-close-job" className="min-h-10 rounded-xl bg-[#205e53] px-4 py-2.5 text-[11px] font-bold text-white">Close Job</button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close this job?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently ends hiring for this position. Finalists, ranks, and recorded offer decisions will be retained unchanged, including pending offers. This job cannot be reopened.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onCloseJob} data-testid="button-confirm-close-job">Close Job</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {position.status === "On Hold" ? (
              <button
                type="button"
                onClick={onResumePosition}
                data-testid="button-resume-position"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#205e53] px-4 py-2.5 text-[11px] font-bold text-white hover:bg-[#184d44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274] focus-visible:ring-offset-2"
              >
                <Play size={14} aria-hidden="true" /> Resume Position
              </button>
            ) : (
              <button
                type="button"
                onClick={onHoldPosition}
                data-testid="button-hold-position"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#e3d5bd] bg-[#fbf6ed] px-4 py-2.5 text-[11px] font-bold text-[#87643a] hover:bg-[#f4eadb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b49157] focus-visible:ring-offset-2"
              >
                <Pause size={14} aria-hidden="true" /> Hold
              </button>
            )}
            <button
              type="button"
              onClick={onRemovePosition}
              data-testid="button-remove-position"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#e6d4ce] bg-[#fbf3f0] px-4 py-2.5 text-[11px] font-bold text-[#985548] hover:bg-[#f5e9e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b36b5f] focus-visible:ring-offset-2"
            >
              <Archive size={14} aria-hidden="true" /> Remove
            </button>
          </div>
        )}
      </div>

      {saveError && (
        <div
          role="alert"
          data-testid="status-save-error"
          className="mb-4 rounded-xl border border-[#ead7bf] bg-[#fff8ec] px-4 py-3 text-[12px] leading-5 text-[#685944]"
        >
          {saveError}
        </div>
      )}

      <section className={detailClass} aria-labelledby="role-details-heading">
        <div className="mb-5 flex items-start gap-3">
          <div aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8efe7] text-[#397462]">
            <BriefcaseBusiness size={18} />
          </div>
          <div>
            <h2
              id="role-details-heading"
              className="text-[15px] font-bold text-[#344d4d]"
            >
              Role details
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-[#84918b]">
              Requisition and requirements entered by the hiring manager.
            </p>
          </div>
        </div>

        <dl className="grid gap-x-5 gap-y-5 border-b border-[#ece9e1] pb-5 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Requisition ID" value={position.requisitionId} />
          <DetailItem label="Hiring manager" value={position.hiringManager} />
          <DetailItem label="Department" value={position.department} />
          <DetailItem label="Location" value={position.location} />
          <DetailItem label="Role type" value={position.positionType} />
          <DetailItem label="Priority" value={position.priority} />
          <DetailItem label="Salary grade" value={position.salaryGrade} />
          <DetailItem label="Created" value={formatDate(position.createdAt)} />
          <DetailItem
            label="Job posting deadline"
            value={
              position.jobPostingDeadline
                ? formatDate(position.jobPostingDeadline)
                : ""
            }
          />
          <DetailItem
            label="Final date for completion"
            value={
              position.recruitmentDeadline
                ? formatDate(position.recruitmentDeadline)
                : ""
            }
          />
        </dl>

        {position.status === "Draft" && (
          <section
            aria-labelledby="stakeholder-input-heading"
            data-testid="section-stakeholder-input-status"
            className="mt-5 rounded-xl border border-[#e4e2d9] bg-[#faf9f3] p-4 sm:p-5"
          >
            <div className="mb-3">
              <h3
                id="stakeholder-input-heading"
                className="text-[12px] font-bold text-[#344d4d]"
              >
                Stakeholder input
              </h3>
              <p className="mt-1 text-[10px] leading-4 text-[#84918b]">
                See who has completed their input for this position.
              </p>
            </div>
            {stakeholderInputStatuses.length === 0 ? (
              <p className="rounded-lg bg-white/70 px-3 py-3 text-[11px] text-[#75837b]">
                No stakeholders have been assigned.
              </p>
            ) : (
              <ul className="divide-y divide-[#e9e7df]">
                {stakeholderInputStatuses.map((stakeholder) => (
                  <li
                    key={stakeholder.email}
                    data-testid={`stakeholder-input-${stakeholder.completed ? "complete" : "pending"}-${stakeholder.email}`}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="break-all text-[11px] font-medium text-[#526a60]">
                      {stakeholder.email}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold ${
                        stakeholder.completed
                          ? "bg-[#e8f1e9] text-[#34715f]"
                          : "bg-[#f5eee2] text-[#936b36]"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${
                          stakeholder.completed
                            ? "bg-[#4d8a70]"
                            : "bg-[#c38b45]"
                        }`}
                      />
                      {stakeholder.completed ? "Completed" : "Not completed"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            ["Job", position.job],
            ["Additional role", position.additionalRole],
          ]
            .filter(([, value]) => value.trim())
            .map(([label, value]) => (
              <article
                key={label}
                className="rounded-xl border border-[#ece9e1] bg-[#faf9f3] p-4 sm:p-5"
              >
                <h3 className="text-[10px] font-bold uppercase tracking-[.12em] text-[#68857a]">
                  {label}
                </h3>
                <p className="mt-2 whitespace-pre-line text-[12px] leading-[1.7] text-[#596e65]">
                  {value}
                </p>
              </article>
            ))}
        </div>
      </section>

      {isFinalInterviewScheduled && (
        <section className={`${detailClass} mt-5`} aria-labelledby="completion-heading">
          <h2 id="completion-heading" className="text-[15px] font-bold text-[#344d4d]">Record final interview completion</h2>
          <p className="mt-2 text-[11px] text-[#84918b]">Scheduling is not completion. After an interview finishes, record it here to make the candidate eligible for offer selection.</p>
          {incompleteFinalists.length === 0 ? (
            <p className="mt-3 text-[12px] text-[#526a60]">No scheduled final interviews are awaiting completion.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[#ece9e1]">
              {incompleteFinalists.map((applicant) => (
                <li key={applicant.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[12px] font-semibold text-[#344d4d]">{applicant.name} · Scheduled, not completed</span>
                  <button type="button" onClick={() => onCompleteFinalInterview(applicant.id)} data-testid={`button-complete-final-interview-${applicant.id}`} className="min-h-11 rounded-xl bg-[#205e53] px-4 py-2 text-[11px] font-bold text-white">Mark final interview completed</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className={`${detailClass} mt-5`} aria-labelledby="applicants-heading">
        {isOfferProcessingStage || isPositionClosed ? (
          <div data-testid="section-offer-candidates">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#68857a]">
                  <Users size={14} aria-hidden="true" /> Hiring pipeline
                </div>
                <h2
                  id="applicants-heading"
                  className="serif text-[24px] font-bold tracking-[-.04em] text-[#344d4d]"
                >
                  {isPositionClosed ? "Finalists and offer decisions" : "Process offer"}
                </h2>
                <p className="mt-1.5 text-[11px] text-[#84918b]">
                  {isPositionClosed
                    ? "This job was manually closed. Recorded decisions and pending offers are retained unchanged."
                    : "Record individual offer acceptances here. The job stays in Process Offer until you use Close Job."}
                </p>
              </div>
              <span className="rounded-full bg-[#edf3ec] px-3 py-1.5 text-[10px] font-bold text-[#397462]">
                {visibleApplicants.length} finalist{visibleApplicants.length === 1 ? "" : "s"}
              </span>
            </div>
            {visibleApplicants.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#d7ded5] bg-[#f8f7f1] px-4 py-8 text-center text-[12px] text-[#75837b]">
                No ranked candidates are attached to this offer process.
              </p>
            ) : (
              <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {visibleApplicants
                  .sort((first, second) => (first.offerRank ?? 4) - (second.offerRank ?? 4))
                  .map((applicant) => (
                    <article
                      key={applicant.id}
                      data-testid={`offer-candidate-${applicant.id}`}
                      className="flex flex-col gap-4 rounded-xl border border-[#e4e2d9] bg-[#fffefa] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setSelectedApplicant(applicant)}
                          data-testid={`button-offer-candidate-details-${applicant.id}`}
                          className="break-words text-left text-[13px] font-bold text-[#344d4d] underline decoration-[#b9cbbd] underline-offset-2 hover:text-[#205e53]"
                        >
                          {applicant.name}
                        </button>
                        <p className="mt-1 break-all text-[10px] text-[#829087]">
                          {applicant.email}
                        </p>
                        <p className="mt-2 text-[10px] text-[#61776d]">
                          Rank #{applicant.offerRank ?? "—"} · Interview score{" "}
                          {applicant.interviewScores
                            ? `${applicant.interviewScores.overall.toFixed(1)} / 5`
                            : "not available"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          data-testid={`offer-status-${applicant.id}`}
                          className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${
                            applicant.offerStatus === "Accepted"
                              ? "bg-[#e8f1e9] text-[#34715f]"
                              : applicant.offerStatus === "Withdrawn"
                                ? "bg-[#f1f2ef] text-[#697872]"
                                : "bg-[#f4eadb] text-[#986f3c]"
                          }`}
                        >
                          {applicant.offerStatus ?? "Not recorded"}
                        </span>
                        {isOfferProcessingStage &&
                          applicant.offerStatus === "Pending" && (
                            <button
                              type="button"
                              onClick={() => onAcceptOffer(applicant.id)}
                              data-testid={`button-accept-offer-${applicant.id}`}
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#205e53] px-4 py-2 text-[11px] font-bold text-white hover:bg-[#184d44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274] focus-visible:ring-offset-2"
                            >
                              <Check size={14} aria-hidden="true" />
                              Mark offer accepted
                            </button>
                          )}
                      </div>
                    </article>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <>
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#68857a]">
              <Users size={14} aria-hidden="true" /> Hiring pipeline
            </div>
            <h2
              id="applicants-heading"
              className="serif text-[24px] font-bold tracking-[-.04em] text-[#344d4d]"
            >
              {isOfferProcessingStage
                ? "Candidates with offers"
                : isPositionClosed
                  ? "Offer decision"
                  : isOfferSelectionStage
                    ? "Final interviews completed"
                    : isFinalInterviewStage
                      ? "Final interview candidates"
                      : "Applications"}
            </h2>
            <p className="mt-1.5 text-[11px] text-[#84918b]">
              <span data-testid="text-applicant-count">{visibleApplicants.length} {visibleApplicants.length === 1 ? "candidate" : "candidates"}</span>
              <span aria-hidden="true"> · </span>
              {isOfferProcessingStage
                ? "Selected final-interview candidates, ranked for offer."
                : isPositionClosed
                  ? "This position was manually closed."
                  : isOfferSelectionStage
                    ? "Select up to three completed candidates and assign each a unique offer rank."
                    : isFinalInterviewStage
                      ? "Interviewed candidates and preferred candidates, ranked for final interview."
                      : "ranked by resume · Showing up to 10 at a time; scroll to review all"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowAddForm((current) => !current);
              setFormError("");
            }}
            aria-expanded={showAddForm}
            aria-controls="add-candidate-form"
            data-testid="button-add-candidate"
            disabled={isCandidateListLocked}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#205e53] px-4 py-2.5 text-[12px] font-bold text-white hover:bg-[#184d44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274] focus-visible:ring-offset-2 sm:w-auto"
          >
            <CirclePlus size={15} aria-hidden="true" /> {showAddForm ? "Close candidate form" : isFinalInterviewStage ? "Add preferred candidate" : "Add candidate"}
          </button>
        </div>

        {showAddForm && (
          <Form {...candidateForm}>
            <form
              id="add-candidate-form"
              onSubmit={submitCandidate}
              noValidate
              className="mb-5 rounded-2xl border border-[#dbe4d9] bg-[#f5f7f1] p-4 sm:p-5"
            >
            <div className="mb-4">
              <h3 className="text-[14px] font-bold text-[#344d4d]">
                {isFinalInterviewStage
                  ? "Add a preferred candidate for final interview"
                  : "Add a preferred candidate"}
              </h3>
              <p className="mt-1 text-[11px] leading-5 text-[#78867e]">
                {isFinalInterviewStage
                  ? "This candidate will be marked as preferred and ranked #1; current candidates move down one rank."
                  : "This candidate will be ranked #1; current candidates move down one rank."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="preferred-candidate-name">
                  Candidate name
                </label>
                <input
                  id="preferred-candidate-name"
                  className={inputClass}
                  {...candidateForm.register("name", {
                    required: "Enter the candidate’s name.",
                  })}
                  maxLength={120}
                  autoComplete="name"
                  data-testid="input-candidate-name"
                  placeholder="e.g. Jordan Rivera"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="preferred-candidate-email">
                  Candidate email
                </label>
                <input
                  id="preferred-candidate-email"
                  className={inputClass}
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  data-testid="input-candidate-email"
                  placeholder="jordan@example.com"
                  {...candidateForm.register("email", {
                    required: "Enter the candidate’s email.",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email address.",
                    },
                  })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="preferred-candidate-resume">
                  Resume file
                </label>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#cdd9ce] bg-[#fffefa] px-3.5 py-3 text-[12px] text-[#5e746a] hover:border-[#438274] focus-within:ring-2 focus-within:ring-[#438274]">
                  <Upload size={16} aria-hidden="true" className="shrink-0 text-[#52816d]" />
                  <span className="min-w-0 flex-1 truncate">
                    {resumeFile?.name ?? "Choose a PDF, DOC, or DOCX resume"}
                  </span>
                  <input
                    id="preferred-candidate-resume"
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="sr-only"
                    data-testid="input-candidate-resume"
                    {...candidateForm.register("resume", {
                      required: "Select the preferred candidate’s resume.",
                    })}
                  />
                </label>
                <p id="resume-storage-note" className="mt-1.5 text-[10px] leading-5 text-[#8b958e]">
                  Maximum file size: 15 MB. Resume files stay in this browser session; candidate details are saved in this browser.
                </p>
              </div>
            </div>
            {formError && (
              <p role="alert" className="mt-3 rounded-lg border border-[#e8c9be] bg-[#fbefea] px-3 py-2 text-[11px] leading-5 text-[#954c3f]">
                {formError}
              </p>
            )}
            {Object.values(candidateForm.formState.errors).map((error, index) =>
              error?.message ? (
                <p
                  key={`${error.message}-${index}`}
                  role="alert"
                  className="mt-2 text-[10px] text-[#a2493f]"
                >
                  {error.message}
                </p>
              ) : null,
            )}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormError("");
                }}
                className="min-h-11 rounded-xl px-4 py-2.5 text-[12px] font-semibold text-[#61766d] hover:bg-[#e9eee7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="button-submit-candidate"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#205e53] px-4 py-2.5 text-[12px] font-bold text-white hover:bg-[#184d44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274] focus-visible:ring-offset-2"
              >
                <Check size={14} /> {isFinalInterviewStage ? "Add for final interview · rank #1" : "Add and rank #1"}
              </button>
            </div>
            </form>
          </Form>
        )}

        {visibleApplicants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#d7ded5] bg-[#f8f7f1] px-4 py-10 text-center">
            <FileText size={22} aria-hidden="true" className="mx-auto text-[#7b9888]" />
            <p className="mt-2 text-[13px] font-semibold text-[#526a60]">
              {isOfferProcessingStage
                ? "No candidates are being considered for an offer"
                : isPositionClosed
                  ? "No accepted offer is recorded"
                  : isOfferSelectionStage
                    ? "No completed final interviews yet"
                    : isFinalInterviewStage
                      ? "No interviewed candidates yet"
                      : "No applications yet"}
            </p>
            <p className="mt-1 text-[11px] text-[#829087]">
              {isOfferProcessingStage
                ? "Return to the completed interview list and select candidates before processing offers."
                : isPositionClosed
                  ? "Offer details will appear here when a candidate is selected."
                  : isOfferSelectionStage
                    ? "Completed candidates will appear here once their final interview is recorded."
                    : isFinalInterviewStage
                      ? "Add a preferred candidate to include them in the final interview review."
                      : "Add a preferred candidate to start the list."}
            </p>
          </div>
        ) : (
          <>
          <div className="hidden max-h-[640px] overflow-auto rounded-xl border border-[#e4e2d9] lg:block">
            <table className={`w-full ${isOfferSelectionStage ? "min-w-[920px] table-fixed" : isScorecardStage ? "min-w-[900px]" : "min-w-[760px]"} border-collapse text-left`}>
              <thead className="sticky top-0 z-10 bg-[#f4f3ec] text-[9px] font-bold uppercase tracking-[.1em] text-[#829087]">
                <tr>
                  <th scope="col" className="px-4 py-3">Candidate</th>
                  <th scope="col" className="px-4 py-3">{isScorecardStage ? "Interview date" : "Application date"}</th>
                  <th scope="col" className="px-4 py-3">{isScorecardStage ? "Interview rank" : "Resume rank"}</th>
                  <th scope="col" className="px-4 py-3">Resume</th>
                  {isScorecardStage && <th scope="col" className="px-4 py-3">Overall score</th>}
                  {isOfferSelectionStage && <th scope="col" className="px-4 py-3">Offer rank</th>}
                  <th scope="col" className="px-4 py-3 text-center">
                    {isOfferSelectionStage
                      ? "Select for offer"
                      : isFinalInterviewStage
                        ? "Select for final interview"
                        : "Select for interview"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ece9e1] bg-[#fffefa]">
                {visibleApplicants.map((applicant: RoleApplicant) => (
                    <tr key={applicant.id} data-testid={`row-applicant-${applicant.id}`} className="h-[58px] text-[12px] text-[#526a60] transition-colors hover:bg-[#faf9f3]">
                    <td className="px-4 py-3">
                      {isScorecardStage ? (
                        <button
                          type="button"
                          onClick={() => setSelectedApplicant(applicant)}
                          aria-label={`View full interview details for ${applicant.name}`}
                          data-testid={`button-candidate-details-${applicant.id}`}
                          className="max-w-[220px] truncate text-left font-semibold text-[#344d4d] underline decoration-[#b9cbbd] underline-offset-2 hover:text-[#205e53] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]"
                        >
                          {applicant.name}
                        </button>
                      ) : (
                        <div className="max-w-[220px] truncate font-semibold text-[#344d4d]">
                          {applicant.name}
                        </div>
                      )}
                      <div className="mt-1 inline-flex max-w-[220px] items-center gap-1.5 truncate whitespace-nowrap text-[10px] text-[#829087]">
                        <Mail size={11} aria-hidden="true" />
                        {applicant.email}
                      </div>
                      {isScorecardStage && (
                        <div className="mt-1 text-[9px] font-semibold text-[#8b795c]">
                          {isOfferSelectionStage
                            ? "Final interview completed"
                            : applicant.preferredForFinalInterview
                              ? "Preferred candidate"
                              : "Interviewed"}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDate(
                        isScorecardStage
                          ? applicant.interviewedAt || applicant.appliedAt
                          : applicant.appliedAt,
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-[#edf3ec] px-2.5 py-1 font-bold text-[#397462]">
                        #{applicant.rank}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onOpenResume(applicant.id)}
                        disabled={!hasResumeFile(applicant.id)}
                        className="inline-flex max-w-full items-center gap-1.5 truncate text-left text-[10px] font-semibold text-[#466e60] underline decoration-[#b9cbbd] underline-offset-2 disabled:cursor-default disabled:text-[#89948d] disabled:no-underline"
                        data-testid={`button-open-resume-${applicant.id}`}
                        title={
                          hasResumeFile(applicant.id)
                            ? "Open uploaded resume"
                            : `${applicant.resumeName} (sample resume file not attached)`
                        }
                      >
                        <FileText size={13} className="shrink-0" />
                        <span className="truncate">{applicant.resumeName}</span>
                      </button>
                    </td>
                    {isScorecardStage && (
                      <td className="whitespace-nowrap px-4 py-3">
                        {applicant.interviewScores
                          ? `${applicant.interviewScores.overall.toFixed(1)} / 5`
                          : "No scorecard"}
                      </td>
                    )}
                    {isOfferSelectionStage && (
                      <td className="px-4 py-3">
                        <select
                          value={applicant.offerRank ?? ""}
                          disabled={
                            !applicant.finalInterviewCompleted ||
                            (!applicant.selectedForOffer &&
                              selectedOfferCount >= 3)
                          }
                          onChange={(event) =>
                            onRankOfferCandidate(
                              applicant.id,
                              Number(event.target.value) as 1 | 2 | 3,
                            )
                          }
                          aria-label={`Offer rank for ${applicant.name}`}
                          data-testid={`select-offer-rank-${applicant.id}`}
                          className="min-h-9 rounded-lg border border-[#dfe1d8] bg-[#fffefa] px-3 text-[11px] font-semibold text-[#405b51] focus:border-[#438274] focus:outline-none focus:ring-2 focus:ring-[#438274]/15 disabled:cursor-not-allowed disabled:bg-[#f4f3ec] disabled:text-[#a0aaa6]"
                        >
                          <option value="" disabled>Rank</option>
                          {[1, 2, 3].map((rank) => (
                            <option
                              key={rank}
                              value={rank}
                              disabled={applicants.some(
                                (other) =>
                                  other.id !== applicant.id &&
                                  other.selectedForOffer &&
                                  other.offerRank === rank,
                              )}
                            >
                              {rank}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={
                          isOfferSelectionStage
                            ? Boolean(applicant.selectedForOffer)
                            : isFinalInterviewStage
                              ? Boolean(applicant.selectedForFinalInterview)
                              : applicant.selectedForInterview
                        }
                        disabled={
                          isOfferSelectionStage
                            ? !applicant.finalInterviewCompleted ||
                              (!applicant.selectedForOffer &&
                                selectedOfferCount >= 3)
                            : isFinalInterviewScheduled
                        }
                        onChange={(event) =>
                          isOfferSelectionStage
                            ? onToggleOfferCandidate(applicant.id, event.target.checked)
                            : isFinalInterviewStage
                              ? onToggleFinalInterview(applicant.id, event.target.checked)
                              : onToggleInterview(applicant.id, event.target.checked)
                        }
                        aria-label={`Select ${applicant.name} for ${isOfferSelectionStage ? "offer" : isFinalInterviewStage ? "final interview" : "interview"}`}
                        data-testid={`${isOfferSelectionStage ? "checkbox-offer" : isFinalInterviewStage ? "checkbox-final-interview" : "checkbox-interview"}-${applicant.id}`}
                        className="h-6 w-6 cursor-pointer accent-[#205e53] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274] focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="max-h-[640px] space-y-2.5 overflow-y-auto pr-1 lg:hidden">
            {visibleApplicants.map((applicant: RoleApplicant) => (
              <article key={applicant.id} data-testid={`card-applicant-${applicant.id}`} className="rounded-xl border border-[#e4e2d9] bg-[#fffefa] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {isScorecardStage ? (
                      <button
                        type="button"
                        onClick={() => setSelectedApplicant(applicant)}
                        data-testid={`button-candidate-details-mobile-${applicant.id}`}
                        className="break-words text-left text-[13px] font-bold text-[#344d4d] underline decoration-[#b9cbbd] underline-offset-2"
                      >
                        {applicant.name}
                      </button>
                    ) : (
                      <h3 className="break-words text-[13px] font-bold text-[#344d4d]">{applicant.name}</h3>
                    )}
                    {isScorecardStage && (
                      <p className="mt-1 text-[9px] font-semibold text-[#8b795c]">
                        {isOfferSelectionStage
                          ? "Final interview completed"
                          : applicant.preferredForFinalInterview
                            ? "Preferred candidate"
                            : "Interviewed"}
                        {" · "}
                        {applicant.interviewScores
                          ? `${applicant.interviewScores.overall.toFixed(1)} / 5 overall`
                          : "No scorecard"}
                      </p>
                    )}
                    <p className="mt-1 flex min-w-0 items-center gap-1.5 break-all text-[10px] text-[#829087]">
                      <Mail size={12} aria-hidden="true" className="shrink-0" />{applicant.email}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#edf3ec] px-2.5 py-1 text-[11px] font-bold text-[#397462]">
                    {isOfferSelectionStage
                      ? applicant.selectedForOffer
                        ? `Offer #${applicant.offerRank ?? "—"}`
                        : "Not selected"
                      : `#${applicant.rank}`}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#ece9e1] pt-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#89948d]">{isScorecardStage ? "Interview date" : "Applied"}</p>
                    <p className="mt-1 text-[11px] text-[#526a60]">{formatDate(isScorecardStage ? applicant.interviewedAt || applicant.appliedAt : applicant.appliedAt)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenResume(applicant.id)}
                    disabled={!hasResumeFile(applicant.id)}
                    data-testid={`button-open-resume-mobile-${applicant.id}`}
                    className="inline-flex min-h-10 max-w-[62%] items-center gap-1.5 truncate rounded-lg px-2 text-[11px] font-semibold text-[#466e60] underline decoration-[#b9cbbd] underline-offset-2 hover:bg-[#f1f4ed] disabled:cursor-default disabled:text-[#89948d] disabled:no-underline"
                    title={hasResumeFile(applicant.id) ? "Open uploaded resume" : `${applicant.resumeName} (sample resume file not attached)`}
                  >
                    <FileText size={13} aria-hidden="true" className="shrink-0" />
                    <span className="truncate">{applicant.resumeName}</span>
                  </button>
                </div>
                {isOfferSelectionStage ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#ece9e1] pt-3">
                    <label className="flex min-h-11 items-center gap-2 text-[11px] font-semibold text-[#526a60]">
                      <input
                        type="checkbox"
                        checked={Boolean(applicant.selectedForOffer)}
                        disabled={
                          !applicant.finalInterviewCompleted ||
                          (!applicant.selectedForOffer && selectedOfferCount >= 3)
                        }
                        onChange={(event) =>
                          onToggleOfferCandidate(applicant.id, event.target.checked)
                        }
                        aria-label={`Select ${applicant.name} for offer`}
                        data-testid={`checkbox-offer-mobile-${applicant.id}`}
                        className="h-5 w-5 cursor-pointer accent-[#205e53] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274] focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                      />
                      Select for offer
                    </label>
                    <label className="flex items-center gap-2 text-[10px] font-semibold text-[#526a60]">
                      Offer rank
                      <select
                        value={applicant.offerRank ?? ""}
                        disabled={
                          !applicant.finalInterviewCompleted ||
                          (!applicant.selectedForOffer &&
                            selectedOfferCount >= 3)
                        }
                        onChange={(event) =>
                          onRankOfferCandidate(
                            applicant.id,
                            Number(event.target.value) as 1 | 2 | 3,
                          )
                        }
                        aria-label={`Offer rank for ${applicant.name}`}
                        data-testid={`select-offer-rank-mobile-${applicant.id}`}
                        className="min-h-9 rounded-lg border border-[#dfe1d8] bg-[#fffefa] px-3 text-[11px] focus:border-[#438274] focus:outline-none focus:ring-2 focus:ring-[#438274]/15 disabled:cursor-not-allowed disabled:bg-[#f4f3ec] disabled:text-[#a0aaa6]"
                      >
                        <option value="" disabled>Rank</option>
                        {[1, 2, 3].map((rank) => (
                          <option
                            key={rank}
                            value={rank}
                            disabled={applicants.some(
                              (other) =>
                                other.id !== applicant.id &&
                                other.selectedForOffer &&
                                other.offerRank === rank,
                            )}
                          >
                            {rank}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : (
                  <label className={`mt-3 flex min-h-11 items-center gap-2 border-t border-[#ece9e1] pt-3 text-[11px] font-semibold text-[#526a60] ${isFinalInterviewScheduled ? "cursor-default" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={isFinalInterviewStage ? Boolean(applicant.selectedForFinalInterview) : applicant.selectedForInterview}
                      disabled={isFinalInterviewScheduled}
                      onChange={(event) => isFinalInterviewStage
                        ? onToggleFinalInterview(applicant.id, event.target.checked)
                        : onToggleInterview(applicant.id, event.target.checked)}
                      aria-label={`Select ${applicant.name} for ${isFinalInterviewStage ? "final interview" : "interview"}`}
                      data-testid={`${isFinalInterviewStage ? "checkbox-final-interview" : "checkbox-interview"}-mobile-${applicant.id}`}
                      className="h-5 w-5 cursor-pointer accent-[#205e53] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274] focus-visible:ring-offset-2"
                    />
                    {isFinalInterviewStage ? "Select for final interview" : "Select for interview"}
                  </label>
                )}
              </article>
            ))}
          </div>
          </>
        )}

        {!isFinalInterviewStage && confirmedCount > 0 && (
          <p
            role="status"
            data-testid="status-interview-confirmed"
            className="mt-4 rounded-xl border border-[#d3e3d3] bg-[#edf5ec] px-4 py-3 text-[11px] font-semibold text-[#426b57]"
          >
            Interview selection confirmed for {confirmedCount}{" "}
            {confirmedCount === 1 ? "candidate" : "candidates"}. No invitation has been sent.
          </p>
        )}
        {isFinalInterviewStage && isFinalInterviewScheduled && (
          <p
            role="status"
            data-testid="status-final-interview-scheduled"
            className="mt-4 rounded-xl border border-[#d8dfef] bg-[#edf1fa] px-4 py-3 text-[11px] font-semibold text-[#4e638d]"
          >
            Final interview scheduled for {scheduledFinalInterviewCount}{" "}
            {scheduledFinalInterviewCount === 1 ? "candidate" : "candidates"}.
          </p>
        )}

        <p className="mt-4 flex items-start gap-2 text-[10px] leading-5 text-[#89948d]">
          <CalendarDays size={13} aria-hidden="true" className="mt-1 shrink-0" />
          {isOfferSelectionStage
            ? "Select exactly three completed candidates and assign unique priorities. Choosing an assigned rank reorders the finalists."
            : isFinalInterviewStage
              ? "Select one or more candidates, then schedule their final interview."
              : "Select candidates for interview consideration, then confirm the selection below."}
        </p>

        <div className="mt-4 flex justify-end border-t border-[#ece9e1] pt-4">
          {isOfferSelectionStage && selectionError && (
            <p role="status" className="mr-3 self-center text-[11px] text-[#87643a]">{selectionError}</p>
          )}
          {isOfferSelectionStage ? (
            <button
              type="button"
              onClick={onProcessOffer}
              disabled={selectionError !== null}
              data-testid="button-process-offer"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#205e53] px-5 py-3 text-[12px] font-bold text-white shadow-[0_5px_12px_rgba(32,94,83,.12)] hover:bg-[#184d44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#dfe6dd] disabled:text-[#8a958c] disabled:shadow-none sm:w-auto"
            >
              <Check size={15} aria-hidden="true" />
              Process Offer
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px]">
                {selectedOfferCount}
              </span>
            </button>
          ) : isFinalInterviewStage ? (
            <button
              type="button"
              onClick={onScheduleFinalInterview}
              disabled={
                isFinalInterviewScheduled || selectedFinalInterviewCount === 0
              }
              data-testid="button-schedule-final-interview"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#205e53] px-5 py-3 text-[12px] font-bold text-white shadow-[0_5px_12px_rgba(32,94,83,.12)] hover:bg-[#184d44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#dfe6dd] disabled:text-[#8a958c] disabled:shadow-none sm:w-auto"
            >
              <Check size={15} aria-hidden="true" />
              {isFinalInterviewScheduled
                ? "Final Interview Scheduled"
                : "Schedule Final Interview"}
              {selectedFinalInterviewCount > 0 && (
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px]">
                  {selectedFinalInterviewCount}
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onConfirmInterview}
              disabled={selectedCount === 0}
              data-testid="button-confirm-interview"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#205e53] px-5 py-3 text-[12px] font-bold text-white shadow-[0_5px_12px_rgba(32,94,83,.12)] hover:bg-[#184d44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#dfe6dd] disabled:text-[#8a958c] disabled:shadow-none sm:w-auto"
            >
              <Check size={15} aria-hidden="true" /> Confirm Interview
              {selectedCount > 0 && (
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px]">
                  {selectedCount}
                </span>
              )}
            </button>
          )}
        </div>
          </>
        )}
      </section>
      {selectedApplicant && (
        <CandidateInterviewDetails
          applicant={selectedApplicant}
          jobId={position.requisitionId}
          hasResumeFile={hasResumeFile(selectedApplicant.id)}
          onOpenResume={() => onOpenResume(selectedApplicant.id)}
          onClose={() => setSelectedApplicant(null)}
        />
      )}
    </main>
  );
}

function CandidateInterviewDetails({
  applicant,
  jobId,
  hasResumeFile,
  onOpenResume,
  onClose,
}: {
  applicant: RoleApplicant;
  jobId: string;
  hasResumeFile: boolean;
  onOpenResume(): void;
  onClose(): void;
}) {
  const scoreRows = [
    ["Role fit", applicant.interviewScores?.roleFit],
    ["Problem solving", applicant.interviewScores?.problemSolving],
    ["Communication", applicant.interviewScores?.communication],
    ["Collaboration", applicant.interviewScores?.collaboration],
  ] as const;
  const assessmentDetails = applicant.assessmentDetails;
  const unavailable = "Not available";
  const assessmentRows: [string, string][] = [
    ["Personality OCEAN", assessmentDetails?.personalityOCEAN || unavailable],
    ["Enneagram object", assessmentDetails?.enneagramObject || unavailable],
    ["AorB object", assessmentDetails?.aOrBObject || unavailable],
    ["Skill analysis object", assessmentDetails?.skillAnalysisObject || unavailable],
    ["Conjugate skill object", assessmentDetails?.conjugateSkillObject || unavailable],
    ["Conversational responsiveness", assessmentDetails?.conversationalResponsiveness || unavailable],
    ["Conversation assimilation", assessmentDetails?.conversationAssimilation || unavailable],
    ["Roleplay analysis", assessmentDetails?.roleplayAnalysis || unavailable],
    ["Mathematical reasoning", assessmentDetails?.mathematicalReasoning || unavailable],
    ["Spatial reasoning", assessmentDetails?.spatialReasoning || unavailable],
    ["Language reasoning", assessmentDetails?.languageReasoning || unavailable],
    ["Outlier ranking", assessmentDetails?.outlierRanking || unavailable],
    ["Challenge response ranking", assessmentDetails?.challengeResponseRanking || unavailable],
    ["Noisy thinking", assessmentDetails?.noisyThinking || unavailable],
    ["Organizational awareness", assessmentDetails?.organizationalAwareness || unavailable],
    ["Role awareness", assessmentDetails?.roleAwareness || unavailable],
    ["Team role play", assessmentDetails?.teamRoleplay || unavailable],
    ["Curiosity", assessmentDetails?.curiosity || unavailable],
  ];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#172923]/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="candidate-interview-details-heading"
        data-testid="dialog-candidate-interview-details"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[.14em] text-[#68857a]">
              Candidate scorecard and interview details
            </div>
            <h2
              id="candidate-interview-details-heading"
              className="serif mt-1 text-[24px] font-bold text-[#344d4d]"
            >
              {applicant.name}
            </h2>
            <p className="mt-1 break-all text-[11px] text-[#71817a]">
              {applicant.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close candidate details"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#667a72] hover:bg-[#e9eee7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <dl className="mt-5 grid gap-4 rounded-xl border border-[#e4e2d9] bg-white/70 p-4 sm:grid-cols-2">
          <DetailItem label="Job ID" value={jobId} />
          <DetailItem label="Candidate ID" value={applicant.id} />
          <DetailItem label="Candidate status" value={applicant.preferredForFinalInterview ? "Preferred for final interview" : "Interviewed"} />
          <DetailItem label="Current interview rank" value={`#${applicant.rank}`} />
          <DetailItem label="Application date" value={formatDate(applicant.appliedAt)} />
          <DetailItem label="Interview date" value={applicant.interviewedAt ? formatDate(applicant.interviewedAt) : "Not recorded"} />
          <div className="sm:col-span-2">
            <dt className="text-[9px] font-bold uppercase tracking-[.12em] text-[#87928a]">
              Resume
            </dt>
            <dd className="mt-1">
              <button
                type="button"
                onClick={onOpenResume}
                disabled={!hasResumeFile}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-[11px] font-semibold text-[#466e60] underline decoration-[#b9cbbd] underline-offset-2 hover:bg-[#f1f4ed] disabled:cursor-default disabled:text-[#89948d] disabled:no-underline"
                title={hasResumeFile ? "Open uploaded resume" : "The sample resume file is not attached."}
              >
                <FileText size={14} aria-hidden="true" />
                {applicant.resumeName}
              </button>
            </dd>
          </div>
        </dl>

        <section className="mt-5 rounded-xl border border-[#dbe4d9] bg-[#f5f7f1] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[13px] font-bold text-[#344d4d]">
                Interview scorecard
              </h3>
              <p className="mt-1 text-[10px] text-[#84918b]">
                Scores are out of 5.
              </p>
            </div>
            {applicant.interviewScores && (
              <div className="rounded-xl bg-[#e8efe7] px-3 py-2 text-right">
                <div className="text-[9px] font-bold uppercase tracking-[.1em] text-[#68857a]">
                  Overall
                </div>
                <div className="text-[19px] font-bold text-[#397462]">
                  {applicant.interviewScores.overall.toFixed(1)}
                  <span className="text-[10px] font-semibold text-[#829087]"> / 5</span>
                </div>
              </div>
            )}
          </div>
          {applicant.interviewScores ? (
            <>
              <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                {scoreRows.map(([label, score]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2.5"
                  >
                    <dt className="text-[11px] text-[#526a60]">{label}</dt>
                    <dd className="text-[11px] font-bold text-[#397462]">
                      {score?.toFixed(1)} / 5
                    </dd>
                  </div>
                ))}
              </dl>
              {applicant.interviewSummary && (
                <p className="mt-4 rounded-lg border border-[#e5e9df] bg-white/70 p-3 text-[11px] leading-5 text-[#596e65]">
                  {applicant.interviewSummary}
                </p>
              )}
            </>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-[#d7ded5] bg-white/70 p-4 text-[11px] text-[#7a8981]">
              No interview scores are attached to this candidate yet.
            </p>
          )}
        </section>

        <section className="mt-5 rounded-xl border border-[#e4e2d9] bg-white/70 p-4 sm:p-5">
            <div className="mb-4">
              <h3 className="text-[13px] font-bold text-[#344d4d]">
                Assessment details
              </h3>
              <p className="mt-1 text-[10px] text-[#84918b]">
                {assessmentDetails
                  ? "Illustrative demo assessment data."
                  : "No assessment data is attached yet; requested fields are listed below."}
              </p>
            </div>
            <article className="rounded-xl border border-[#e5e9df] bg-[#faf9f3] p-3 sm:p-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[.1em] text-[#68857a]">
                Interview transcript doc · Q&amp;A
              </h4>
              <p className="mt-2 whitespace-pre-line text-[11px] leading-5 text-[#596e65]">
                {assessmentDetails?.transcriptQa || "Not available"}
              </p>
            </article>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {assessmentRows.map(([label, value]) => (
                <article
                  key={label}
                  className="min-w-0 rounded-xl border border-[#e9e7df] bg-[#fcfbf7] p-3"
                >
                  <h4 className="text-[9px] font-bold uppercase tracking-[.1em] text-[#68857a]">
                    {label}
                  </h4>
                  <p className="mt-1.5 whitespace-pre-line break-words text-[10px] leading-[1.6] text-[#596e65]">
                    {value}
                  </p>
                </article>
              ))}
            </div>
          </section>
      </section>
    </div>
  );
}
