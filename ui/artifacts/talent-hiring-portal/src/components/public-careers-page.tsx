import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, FileText, Linkedin, MapPin, Search, ShieldCheck, Trash2, Upload } from "lucide-react";
import type { HiringPosition } from "./job-portal-pages";
import { GuidedApplicationChat } from "./guided-application-chat";
import {
  candidateApplicationsForEmail, emptyApplication, isAcceptingApplications, validateApplication, validateResumeFiles,
  type ApplicationDraft, type SubmissionResult,
} from "@/lib/self-application";
import { readJobDescriptionDocument } from "@/lib/read-job-description-document";

export type PublicCareersPageProps = {
  positions: HiringPosition[];
  initialEmail?: string;
  resumeFiles?: Record<string, File>;
  onSubmit(positionId: string, draft: ApplicationDraft): SubmissionResult;
  onBack(): void;
  onViewApplications(email: string): void;
};

const control = "w-full rounded-xl border border-[#dfe1d8] bg-[#fffefa] px-3.5 py-3 text-[12px] text-[#3f5550] outline-none placeholder:text-[#a0aaa6] focus:border-[#438274] focus:ring-4 focus:ring-[#438274]/10";
const card = "rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-5 shadow-[0_8px_22px_rgba(31,59,54,.045)] sm:p-6";
const primaryBtn = "inline-flex items-center gap-2 rounded-xl bg-[#205e53] px-4 py-3 text-[11px] font-bold text-[#fffdf7] hover:bg-[#184d44] disabled:bg-[#a7b6ad] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274] focus-visible:ring-offset-2";
const ghostBtn = "inline-flex items-center gap-2 rounded-xl border border-[#d9e0d6] bg-[#f1f4ed] px-4 py-2.5 text-[11px] font-bold text-[#42665a] hover:bg-[#e7eee6]";
const fmtSize = (n: number) => n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
const applicationSteps = ["Resume versions", "My Information", "Review", "Submit"] as const;

function ApplicationProgress({ activeStep }: { activeStep: number }) {
  return (
    <nav aria-label="Application progress" className="mb-6" data-testid="application-progress">
      <ol className="grid grid-cols-3">
        {applicationSteps.map((step, index) => {
          const complete = index < activeStep;
          const active = index === activeStep;
          return (
            <li key={step} aria-current={active ? "step" : undefined} className="relative flex flex-col items-center px-1 text-center">
              {index > 0 && <span aria-hidden="true" className={`absolute right-1/2 top-3.5 h-px w-full ${complete || active ? "bg-[#79a18d]" : "bg-[#d8ddd6]"}`} />}
              <span className={`relative z-10 grid h-7 w-7 place-items-center rounded-full border text-[10px] font-bold ${active ? "border-[#205e53] bg-[#205e53] text-white" : complete ? "border-[#79a18d] bg-[#e5eee5] text-[#42665a]" : "border-[#d8ddd6] bg-[#f3f2ec] text-[#929b95]"}`}>
                {complete ? <CheckCircle2 size={14} aria-hidden="true" /> : index + 1}
              </span>
              <span className={`mt-2 text-[9px] font-semibold sm:text-[10px] ${active ? "text-[#365e50]" : "text-[#87938c]"}`}>{step}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function guessNameFromResume(text: string, email: string) {
  const emailName = email.split("@")[0]?.replace(/[._-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? "";
  const lines = text.split(/\r?\n/).slice(0, 12).map((line) =>
    line.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig, "")
      .replace(/https?:\/\/\S+/ig, "")
      .replace(/(?:\+?\d[\d ().-]{7,}\d)/g, "")
      .replace(/\b(resume|curriculum vitae|contact|profile|objective|experience|education|skills)\b/ig, "")
      .replace(/[|•,:;]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
  const name = lines.find((line) =>
    line.length >= 3 &&
    line.length <= 60 &&
    /^[\p{L}][\p{L} .'-]+$/u.test(line) &&
    line.split(/\s+/).length <= 5,
  );
  return name || emailName;
}

function explainApplicationErrors(errors: string[]) {
  return errors.map((error) => {
    if (error === "Enter your full name.") return "Enter your full name to continue.";
    if (error === "Enter a valid email address.") return "Enter a valid email address to continue.";
    if (error === "Enter your phone number.") return "Enter a phone number to continue.";
    if (error === "Enter your address.") return "Enter your mailing address to continue.";
    if (error === "Answer the non-compete question.") return "Choose an answer for the non-compete question.";
    if (error === "Select at least one resume.") return "Upload at least one resume version to continue.";
    return error;
  });
}

function PublishedRole({ role }: { role: HiringPosition }) {
  const rows: [string, string | undefined][] = [
    ["Department", role.department], ["Location", role.location],
    ["Job type", role.jobType ? `${role.jobType}${role.jobType === "Contract" && role.contractDurationMonths ? ` · ${role.contractDurationMonths} months` : ""}` : undefined],
    ["Salary range", role.salaryRange], ["Benefits", role.benefits?.join(", ")], ["Posting deadline", role.jobPostingDeadline],
  ];
  return (
    <section className={card} data-testid="section-role-details">
      <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#68857a]">Published role</div>
      <h2 className="serif mt-1 text-[24px] font-bold text-[#2d4446]" data-testid="text-role-title">{role.position}</h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k}><dt className="text-[9px] font-bold uppercase tracking-[.12em] text-[#87938c]">{k}</dt><dd className="mt-0.5 text-[12px] text-[#3f5550]">{v}</dd></div>
        ))}
      </dl>
      {[["About the work", role.job], ["Skills", role.skill], ["Capabilities", role.capability]].filter(([, v]) => v?.trim()).map(([k, v]) => (
        <div key={k} className="mt-5"><h3 className="text-[11px] font-bold text-[#344d4d]">{k}</h3><p className="mt-1 whitespace-pre-wrap text-[12px] leading-6 text-[#5d6f69]">{v}</p></div>
      ))}
    </section>
  );
}

export function PublicCareersPage({ positions, initialEmail = "", resumeFiles = {}, onSubmit, onBack, onViewApplications }: PublicCareersPageProps) {
  const open = useMemo(() => positions.filter(isAcceptingApplications), [positions]);
  const [query, setQuery] = useState("");
  const [roleId, setRoleId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ApplicationDraft>(() => {
    const initial = emptyApplication(initialEmail);
    initial.profile.name = guessNameFromResume("", initialEmail);
    return initial;
  });
  const [applicationMethod, setApplicationMethod] = useState<"resume" | "manual" | "last" | "linkedin" | null>(null);
  const [applicationNotice, setApplicationNotice] = useState("");
  const [isReadingResume, setIsReadingResume] = useState(false);
  const [stage, setStage] = useState<"resume" | "information" | "review" | "done">("resume");
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [submitted, setSubmitted] = useState<ApplicationDraft | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const role = open.find((p) => p.id === roleId) ?? null;

  const filtered = open.filter((p) => {
    const q = query.trim().toLowerCase();
    return !q || [p.position, p.location, p.department].some((v) => v?.toLowerCase().includes(q));
  });

  const autofillFromResume = async (file: File) => {
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) {
      setDraft((current) => ({
        ...current,
        profile: {
          ...current.profile,
          name: current.profile.name || guessNameFromResume("", current.profile.email || initialEmail),
        },
      }));
      setApplicationNotice("This file is attached, but automatic contact reading supports PDF, DOCX, or TXT. You can enter or correct your contact details on the next step.");
      return;
    }
    setIsReadingResume(true);
    try {
      const { text } = await readJobDescriptionDocument(file);
      const foundEmail = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
      const foundPhone = text.match(/(?:\+?\d[\d ().-]{7,}\d)/)?.[0]?.trim() ?? "";
      const foundProfile = text.match(/https?:\/\/(?:www\.)?(?:linkedin\.com\/in\/)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?/i)?.[0]?.replace(/[),.;]+$/, "") ?? "";
      setDraft((current) => ({
        ...current,
        profile: {
          ...current.profile,
          name: current.profile.name || guessNameFromResume(text, current.profile.email || foundEmail || initialEmail),
          email: current.profile.email || foundEmail,
          phone: current.profile.phone || foundPhone,
          profileUrl: current.profile.profileUrl || foundProfile,
        },
      }));
      setApplicationNotice("Resume attached. We’ll use your candidate sign-in email when available and read name and contact details from the resume. Upload multiple versions if you’d like.");
    } catch {
      setApplicationNotice("Resume attached, but its text could not be read automatically. You can enter or correct your contact details on the next step.");
    } finally {
      setIsReadingResume(false);
    }
  };
  const addFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    setDraft((d) => ({ ...d, files: [...d.files, ...picked] }));
    e.target.value = "";
    setErrors([]);
    if (picked[0]) void autofillFromResume(picked[0]);
  };
  const removeFile = (i: number) => setDraft((d) => ({ ...d, files: d.files.filter((_, idx) => idx !== i) }));

  const updateProfile = (key: keyof ApplicationDraft["profile"], value: string) => {
    setDraft((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
    setErrors([]);
  };
  const updateSelfIdentification = (key: "raceEthnicity" | "gender" | "veteran" | "disability", value: string) => {
    setDraft((current) => {
      const selfIdentification = { ...current.selfIdentification, [key]: value };
      const hasResponse = [selfIdentification.raceEthnicity, selfIdentification.gender, selfIdentification.veteran, selfIdentification.disability].some(Boolean);
      return { ...current, selfIdentification: { ...selfIdentification, consent: hasResponse } };
    });
  };
  const continueToInformation = () => {
    const resumeErrors = validateResumeFiles(draft.files);
    setErrors(resumeErrors);
    if (!resumeErrors.length && !isReadingResume) setStage("information");
    if (isReadingResume) setErrors(["Please wait while we read the resume you just uploaded."]);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return !resumeErrors.length && !isReadingResume;
  };
  const review = () => {
    if (isReadingResume) {
      setErrors(["Please wait while we read the resume you just uploaded."]);
      return false;
    }
    const errs = explainApplicationErrors(validateApplication(draft));
    setErrors(errs);
    setResult(null);
    if (!errs.length) setStage("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return errs.length === 0;
  };
  const confirm = () => {
    if (!role) return;
    if (isReadingResume) {
      setErrors(["Please wait while we read the resume you just uploaded."]);
      setStage("resume");
      return;
    }
    const errs = explainApplicationErrors(validateApplication(draft));
    if (errs.length) { setErrors(errs); setStage("information"); return; }
    const res = onSubmit(role.id, draft);
    setResult(res);
    if (res.id) { setSubmitted(draft); setStage("done"); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const pickRole = (id: string | null) => {
    setRoleId(id); setStage("resume"); setErrors([]); setResult(null); setApplicationMethod(null); setApplicationNotice("");
    if (id === null) {
      setDraft((d) => {
        const next = emptyApplication(d.profile.email || initialEmail);
        next.profile.name = d.profile.name || guessNameFromResume("", next.profile.email);
        return next;
      });
      setSubmitted(null);
    }
  };
  const startManual = () => {
    setApplicationMethod("manual");
    setApplicationNotice("");
  };
  const startWithResume = () => {
    setApplicationMethod("resume");
    setApplicationNotice("Choose one or more resume versions. We’ll prefill contact details where readable; you can confirm or edit them on the next step.");
    window.setTimeout(() => fileRef.current?.click(), 50);
  };
  const useLastApplication = () => {
    const email = (initialEmail || draft.profile.email).trim().toLowerCase();
    if (!email) {
      setApplicationNotice("Sign in or use the email address from your previous application to find it.");
      return;
    }
    const previous = candidateApplicationsForEmail(positions, email)
      .sort((a, b) => b.applicant.appliedAt.localeCompare(a.applicant.appliedAt))[0];
    if (!previous) {
      setApplicationNotice(`No previous application was found for ${email}. You can apply manually or autofill with a resume.`);
      return;
    }
    const savedFiles = (previous.applicant.resumeVersions ?? [])
      .map((resume) => resumeFiles[resume.id])
      .filter((file): file is File => Boolean(file));
    if (!savedFiles.length && resumeFiles[previous.applicant.id]) {
      savedFiles.push(resumeFiles[previous.applicant.id]);
    }
    setDraft({
      profile: {
        ...emptyApplication(email).profile,
        ...previous.applicant.profile,
        name: previous.applicant.profile?.name || previous.applicant.name,
        email: previous.applicant.email,
        nonCompeteResponse: "",
      },
      files: savedFiles,
      smsOptIn: false,
      selfIdentification: emptyApplication().selfIdentification,
    });
    setApplicationMethod("last");
    setApplicationNotice(savedFiles.length
      ? "Your most recent resume versions are ready. Review them and add or remove files before submitting."
      : "Your most recent application is remembered, but its resume files are not retained after reload. Attach current resume versions to continue.");
  };
  const startWithLinkedIn = () => {
    setApplicationMethod("linkedin");
    setApplicationNotice("LinkedIn sign-in is not connected in this demo. Include your LinkedIn profile link in a resume if you want it considered.");
  };

  const notice = (
    <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-[#87928a]" data-testid="text-demo-notice">
      <ShieldCheck size={12} className="mt-0.5 shrink-0" />
      Demo only: applications are saved in this browser, not the cloud. Resume files stay available only in this open page until reload. A shared browser is not secure, so use fictitious information.
    </p>
  );

  return (
    <div className="page-enter mx-auto w-full max-w-[1180px] px-4 pb-24 pt-5 sm:px-6 lg:px-8">
      <button type="button" data-testid="button-careers-back" onClick={role ? () => pickRole(null) : onBack} className="mb-5 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-semibold text-[#557068] hover:bg-[#e9eee7]">
        <ArrowLeft size={15} /> {role ? "All open roles" : "Back"}
      </button>

      {!role && (
        <>
          <header className="relative mb-6 overflow-hidden rounded-[24px] border border-[#e1e3d9] bg-[#f4f2e9] px-5 py-6 sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-[#d9e0d3] sm:right-8" />
            <div className="relative max-w-2xl">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[.17em] text-[#68857a]">AiccuHire / Careers</div>
              <h1 className="serif text-[clamp(28px,4vw,40px)] font-bold leading-tight text-[#2d4446]">Apply on your terms.</h1>
              <p className="mt-2 max-w-xl text-[12px] leading-5 text-[#71817a]">You choose what to share, review everything before it is sent, and can see each application afterwards.</p>
              {notice}
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#dfe4d9] bg-[#faf9f3] px-3 py-1.5 text-[10px] font-semibold text-[#587269]">{open.length} open {open.length === 1 ? "role" : "roles"}</span>
                <button type="button" data-testid="button-view-my-applications" onClick={() => onViewApplications(draft.profile.email.trim())} className="rounded-full border border-[#cfe0d3] bg-[#edf3ec] px-3 py-1.5 text-[10px] font-bold text-[#34715f] hover:bg-[#e2ece1]">View my applications</button>
              </div>
            </div>
          </header>
          <div className="relative mb-4">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b958e]" />
            <label htmlFor="careers-search" className="sr-only">Search open roles</label>
            <input id="careers-search" data-testid="input-careers-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by role, team, or location" className={`${control} pl-10`} />
          </div>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d7ded5] bg-[#f8f7f1] px-5 py-10 text-center" data-testid="empty-careers">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf0e8] text-[#648777]"><BriefcaseBusiness size={20} /></div>
              <h3 className="serif mt-3 text-[18px] font-bold text-[#435a55]">{open.length ? "No roles match that search" : "No roles are open right now"}</h3>
              <p className="mt-1 text-[11px] text-[#7a8981]">{open.length ? "Try a different title or place." : "Check back soon. New openings appear here as soon as they are published."}</p>
              {query && <button type="button" onClick={() => setQuery("")} className={`${ghostBtn} mt-4`}>Clear search</button>}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] divide-y divide-[#ece9e1]">
              {filtered.map((p) => (
                <button key={p.id} type="button" data-testid={`button-careers-role-${p.id}`} onClick={() => pickRole(p.id)} className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#f4f3ec]">
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-[#344d4d] group-hover:text-[#205e53]">{p.position}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[10px] text-[#7c8982]">
                      <span className="inline-flex items-center gap-1"><MapPin size={12} />{p.location}</span>
                      {p.department && <><span aria-hidden>·</span><span>{p.department}</span></>}
                      {p.jobType && <><span aria-hidden>·</span><span>{p.jobType}</span></>}
                    </div>
                  </div>
                  <ArrowRight size={15} className="shrink-0 text-[#7b9888] transition group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {role && stage === "done" && submitted && (
        <section className={`${card} mx-auto max-w-2xl`} data-testid="section-application-confirmation">
          <ApplicationProgress activeStep={3} />
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#e8f1e9] text-[#34715f]"><CheckCircle2 size={20} /></div>
          <h1 className="serif mt-3 text-[28px] font-bold text-[#2d4446]">Application received.</h1>
          <p className="mt-1 text-[12px] text-[#71817a]">For {role.position}. Reference <span className="font-bold text-[#344d4d]" data-testid="text-application-id">{result?.id}</span></p>
          {result?.warning && <div role="status" className="mt-4 flex gap-2 rounded-xl border border-[#ecd8b8] bg-[#fbf3e5] px-4 py-3 text-[11px] text-[#8a6430]" data-testid="text-submit-warning"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{result.warning}</div>}
          <ReviewSummary draft={submitted} />
          {notice}
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" className={primaryBtn} data-testid="button-confirmation-view-applications" onClick={() => onViewApplications(submitted.profile.email.trim().toLowerCase())}>View my applications <ArrowRight size={14} /></button>
            <button type="button" className={ghostBtn} onClick={() => pickRole(null)}>Browse more roles</button>
          </div>
        </section>
      )}

      {role && stage !== "done" && !applicationMethod && (
        <section className={`${card} mx-auto max-w-[520px]`} data-testid="section-application-start">
          <ApplicationProgress activeStep={0} />
          <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#68857a]">Start your application</div>
          <h1 className="serif mt-1 text-[25px] font-bold text-[#2d4446]">{role.position}</h1>
          <p className="mt-2 text-[12px] leading-5 text-[#71817a]">Choose how you’d like to provide your resume versions. You’ll review the files before submitting.</p>
          {applicationNotice && <p role="status" className="mt-4 rounded-xl border border-[#dfe4d9] bg-[#f2f5ee] px-3.5 py-3 text-[11px] leading-5 text-[#5e7568]">{applicationNotice}</p>}
          <div className="mt-5 space-y-3">
            <button type="button" data-testid="button-apply-autofill" onClick={startWithResume} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#205e53] px-4 py-3 text-[12px] font-bold text-white transition hover:bg-[#184d44] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#438274]/20">
              <Upload size={15} aria-hidden="true" /> Autofill with Resume
            </button>
            <button type="button" data-testid="button-apply-manually" onClick={startManual} className="min-h-12 w-full rounded-full border border-[#d9e0d6] bg-[#f1f4ed] px-4 py-3 text-[12px] font-bold text-[#42665a] transition hover:bg-[#e7eee6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]">
              Apply Manually
            </button>
            <div className="border-t border-[#ece9e1] pt-3">
              <button type="button" data-testid="button-apply-last" onClick={useLastApplication} className="min-h-12 w-full rounded-full border border-[#d9e0d6] bg-[#f1f4ed] px-4 py-3 text-[12px] font-bold text-[#42665a] transition hover:bg-[#e7eee6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]">
                Use My Last Application
              </button>
            </div>
            <div className="border-t border-[#ece9e1] pt-4">
              <button type="button" data-testid="button-apply-linkedin" onClick={startWithLinkedIn} className="mx-auto flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#414141] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#303030] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]">
                <Linkedin size={17} aria-hidden="true" /> Apply With LinkedIn
              </button>
            </div>
          </div>
        </section>
      )}

      {role && stage !== "done" && applicationMethod && (
        <>
        <ApplicationProgress activeStep={stage === "resume" ? 0 : stage === "information" ? 1 : 2} />
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-4">
            {result?.error && <div role="alert" data-testid="text-submit-error" className="rounded-xl border border-[#e8c9be] bg-[#fbefea] px-4 py-3 text-[11px] text-[#954c3f]">{result.error}</div>}
            {applicationNotice && <p role="status" className="rounded-xl border border-[#dfe4d9] bg-[#f2f5ee] px-3.5 py-3 text-[11px] leading-5 text-[#5e7568]">{applicationNotice}</p>}
            {errors.length > 0 && (
              <div role="alert" data-testid="list-validation-errors" className="rounded-xl border border-[#e8c9be] bg-[#fbefea] px-4 py-3 text-[11px] leading-5 text-[#954c3f]">
                <div className="font-bold">Please correct the following:</div>
                <ul className="mt-1 list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
              </div>
            )}
            {stage === "review" ? (
              <section className={card} data-testid="section-application-review">
                <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#68857a]">Step 3 · Review</div>
                <h2 className="serif mt-1 text-[22px] font-bold text-[#344d4d]">Check before you send</h2>
                <p className="mt-1 text-[11px] text-[#71817a]">Confirm your contact details, non-compete answer, and resume versions. Nothing has been submitted yet.</p>
                <ReviewSummary draft={draft} />
                <div className="mt-5 flex flex-wrap gap-2">
                  <button type="button" className={ghostBtn} data-testid="button-edit-resume-versions" onClick={() => setStage("resume")}><ArrowLeft size={14} /> Edit resume versions</button>
                  <button type="button" className={ghostBtn} data-testid="button-edit-my-information" onClick={() => setStage("information")}>Edit my information</button>
                  <button type="button" className={primaryBtn} data-testid="button-confirm-submit" onClick={confirm}>Confirm and submit</button>
                </div>
              </section>
            ) : stage === "information" ? (
              <section className={card} data-testid="section-application-information">
                <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#68857a]">Step 2 · My Information</div>
                <h2 className="serif mt-1 text-[22px] font-bold text-[#344d4d]">Contact details</h2>
                <p className="mt-1 text-[11px] leading-5 text-[#71817a]">Confirm the best way to reach you about this application.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-[11px] font-semibold text-[#50635d]" htmlFor="apply-name">Full name <span className="text-[#b36b4f]">*</span></label>
                    <input id="apply-name" data-testid="input-apply-name" type="text" required value={draft.profile.name} onChange={(event) => updateProfile("name", event.target.value)} placeholder="Your full name" className={control} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-[#50635d]" htmlFor="apply-email">Email <span className="text-[#b36b4f]">*</span></label>
                    <input id="apply-email" data-testid="input-apply-email" type="email" required value={draft.profile.email} onChange={(event) => updateProfile("email", event.target.value)} placeholder="you@example.com" className={control} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-[#50635d]" htmlFor="apply-phone">Phone <span className="text-[#b36b4f]">*</span></label>
                    <input id="apply-phone" data-testid="input-apply-phone" type="tel" required value={draft.profile.phone} onChange={(event) => updateProfile("phone", event.target.value)} placeholder="Your phone number" className={control} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-[11px] font-semibold text-[#50635d]" htmlFor="apply-address">Address <span className="text-[#b36b4f]">*</span></label>
                    <textarea id="apply-address" data-testid="input-apply-address" required rows={3} value={draft.profile.address} onChange={(event) => updateProfile("address", event.target.value)} placeholder="Street, city, state or province, postal code, country" className={`${control} resize-y leading-5`} />
                  </div>
                </div>
                <fieldset className="mt-5">
                  <legend className="text-[11px] font-semibold leading-5 text-[#50635d]">
                    Are you subject to a non-compete agreement that could affect your ability to accept this role? <span className="text-[#b36b4f">*</span>
                  </legend>
                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                    {["Yes", "No", "Not sure"].map((answer) => (
                      <label key={answer} className="inline-flex items-center gap-2 text-[11px] text-[#53675f]">
                        <input type="radio" name="non-compete-response" required checked={draft.profile.nonCompeteResponse === answer} onChange={() => updateProfile("nonCompeteResponse", answer)} className="h-4 w-4 accent-[#205e53]" />
                        {answer}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#e4e2d9] bg-[#f8f7f2] p-3.5 text-[10px] leading-5 text-[#596d64]">
                  <input type="checkbox" data-testid="checkbox-apply-sms-opt-in" checked={draft.smsOptIn} onChange={(event) => setDraft((current) => ({ ...current, smsOptIn: event.target.checked }))} className="mt-1 h-4 w-4 shrink-0 accent-[#205e53]" />
                  <span>I agree to receive application updates by SMS. Message and data rates may apply. This is optional and is not required to apply.</span>
                </label>
                <section className="mt-5 rounded-xl border border-[#e4e2d9] bg-[#f8f7f2] p-4" aria-labelledby="voluntary-disclosure-title" data-testid="section-voluntary-disclosure">
                  <h3 id="voluntary-disclosure-title" className="text-[11px] font-semibold text-[#405a52]">Voluntary demographic, veteran, and disability information</h3>
                  <p className="mt-2 text-[10px] leading-5 text-[#65776f]">
                    Some employers, including federal contractors, may request race or ethnicity, gender, veteran status, and disability status for applicable reporting obligations such as EEOC and OFCCP reporting, and for workforce analytics. Requirements vary by employer and contract. These questions are voluntary: answer any, all, or none, and choose “Prefer not to answer” where offered. Your choices do not affect your candidacy and are kept separate from application evaluation. In this demo, selected responses stay in this browser session only; they are not included in your application record, ranking, chatbot context, or actual government reporting.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block text-[10px] font-semibold text-[#50635d]">
                      Race or ethnicity
                      <select data-testid="select-self-identification-race-ethnicity" value={draft.selfIdentification.raceEthnicity} onChange={(event) => updateSelfIdentification("raceEthnicity", event.target.value)} className={`${control} mt-1.5`}>
                        <option value="">Select an option (optional)</option>
                        <option>Hispanic or Latino</option>
                        <option>American Indian or Alaska Native</option>
                        <option>Asian</option>
                        <option>Black or African American</option>
                        <option>Native Hawaiian or Other Pacific Islander</option>
                        <option>White</option>
                        <option>Two or more races</option>
                        <option>Another identity</option>
                        <option>Prefer not to answer</option>
                      </select>
                    </label>
                    <label className="block text-[10px] font-semibold text-[#50635d]">
                      Gender
                      <select data-testid="select-self-identification-gender" value={draft.selfIdentification.gender} onChange={(event) => updateSelfIdentification("gender", event.target.value)} className={`${control} mt-1.5`}>
                        <option value="">Select an option (optional)</option>
                        <option>Woman</option>
                        <option>Man</option>
                        <option>Non-binary</option>
                        <option>Another identity</option>
                        <option>Prefer not to answer</option>
                      </select>
                    </label>
                    <label className="block text-[10px] font-semibold text-[#50635d]">
                      Veteran status
                      <select data-testid="select-self-identification-veteran" value={draft.selfIdentification.veteran} onChange={(event) => updateSelfIdentification("veteran", event.target.value)} className={`${control} mt-1.5`}>
                        <option value="">Select an option (optional)</option>
                        <option>Yes</option>
                        <option>No</option>
                        <option>Prefer not to answer</option>
                      </select>
                    </label>
                    <label className="block text-[10px] font-semibold text-[#50635d]">
                      Disability status
                      <select data-testid="select-self-identification-disability" value={draft.selfIdentification.disability} onChange={(event) => updateSelfIdentification("disability", event.target.value)} className={`${control} mt-1.5`}>
                        <option value="">Select an option (optional)</option>
                        <option>Yes</option>
                        <option>No</option>
                        <option>Prefer not to answer</option>
                      </select>
                    </label>
                  </div>
                </section>
                <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-[#ece9e1] pt-4">
                  <button type="button" className={ghostBtn} data-testid="button-back-to-resume" onClick={() => setStage("resume")}><ArrowLeft size={14} /> Back to resume versions</button>
                  <button type="button" className={primaryBtn} data-testid="button-review-application" onClick={review}>Continue to review <ArrowRight size={14} /></button>
                </div>
              </section>
            ) : (
              <>
                <section className={card} data-testid="section-application-resumes">
                  <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#68857a]">Step 1 · Resume versions</div>
                  <h2 className="serif mt-1 text-[22px] font-bold text-[#344d4d]">Upload your resume versions</h2>
                  <p className="mt-1 text-[11px] leading-5 text-[#71817a]">Add one or more versions of your resume (up to five). You’ll provide contact details and answer one short question on the next step.</p>
                  <p className="mt-2 text-[10px] leading-4 text-[#84918b]">We’ll prefill contact details from your candidate sign-in or resume when available. Confirm or edit them on the next step.</p>
                  <label htmlFor="apply-resume" className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#c9d8cc] bg-[#f5f7f1] px-4 py-5 text-[11px] font-bold text-[#42665a] hover:bg-[#edf3eb] focus-within:ring-2 focus-within:ring-[#438274]">
                    <Upload size={15} /> Add resume versions
                    <input ref={fileRef} id="apply-resume" data-testid="input-apply-resume" type="file" multiple accept=".pdf,.doc,.docx" onChange={addFiles} className="sr-only" />
                  </label>
                  {draft.files.length > 0 && (
                    <ul className="mt-3 space-y-2" data-testid="list-resume-files">
                      {draft.files.map((f, i) => (
                        <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#e4e2d9] bg-[#fffefa] px-3 py-2.5">
                          <span className="flex min-w-0 items-center gap-2 text-[11px] text-[#3f5550]"><FileText size={14} className="shrink-0 text-[#6c8e7d]" /><span className="truncate" data-testid={`text-resume-${i}`}>Version {i + 1}: {f.name}</span><span className="shrink-0 text-[#89948d]">{fmtSize(f.size)}</span></span>
                          <button type="button" aria-label={`Remove ${f.name}`} data-testid={`button-remove-resume-${i}`} onClick={() => removeFile(i)} className="grid h-8 w-8 place-items-center rounded-lg text-[#9a5548] hover:bg-[#f5e9e5]"><Trash2 size={14} /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <div className="flex justify-end">
                  <button type="button" className={primaryBtn} data-testid="button-continue-to-information" onClick={continueToInformation} disabled={!draft.files.length || isReadingResume}>Continue to My Information <ArrowRight size={14} /></button>
                </div>
              </>
            )}
          </div>
          <aside className="lg:sticky lg:top-5"><PublishedRole role={role} /></aside>
        </div>
        </>
      )}

      {role && stage === "resume" && applicationMethod && (
        <GuidedApplicationChat
          key={role.id}
          role={role}
          draft={{ files: draft.files }}
          onFocusResume={() => { setStage("resume"); setTimeout(() => { fileRef.current?.closest("label")?.scrollIntoView({ behavior: "smooth", block: "center" }); fileRef.current?.focus(); }, 50); }}
          onRequestReview={continueToInformation}
        />
      )}
    </div>
  );
}

function ReviewSummary({ draft }: { draft: ApplicationDraft }) {
  return (
    <dl className="mt-4 divide-y divide-[#ece9e1] rounded-xl border border-[#e4e2d9] bg-[#fffefa]" data-testid="list-review-summary">
      <div className="grid grid-cols-[120px_1fr] gap-3 px-4 py-2.5 text-[11px]"><dt className="text-[#87938c]">Name</dt><dd className="break-words text-[#3f5550]">{draft.profile.name || "Not detected"}</dd></div>
      <div className="grid grid-cols-[120px_1fr] gap-3 px-4 py-2.5 text-[11px]"><dt className="text-[#87938c]">Email</dt><dd className="break-words text-[#3f5550]">{draft.profile.email || "Not detected"}</dd></div>
      <div className="grid grid-cols-[120px_1fr] gap-3 px-4 py-2.5 text-[11px]"><dt className="text-[#87938c]">Phone</dt><dd className="break-words text-[#3f5550]">{draft.profile.phone || "Not provided"}</dd></div>
      <div className="grid grid-cols-[120px_1fr] gap-3 px-4 py-2.5 text-[11px]"><dt className="text-[#87938c]">Address</dt><dd className="whitespace-pre-wrap break-words text-[#3f5550]">{draft.profile.address || "Not provided"}</dd></div>
      <div className="grid grid-cols-[120px_1fr] gap-3 px-4 py-2.5 text-[11px]"><dt className="text-[#87938c]">Non-compete</dt><dd className="break-words text-[#3f5550]">{draft.profile.nonCompeteResponse || "Not answered"}</dd></div>
      <div className="grid grid-cols-[120px_1fr] gap-3 px-4 py-2.5 text-[11px]"><dt className="text-[#87938c]">SMS updates</dt><dd className="break-words text-[#3f5550]">{draft.smsOptIn ? "Opted in" : "Not opted in"}</dd></div>
      {draft.selfIdentification.consent && (
        <div className="grid grid-cols-[120px_1fr] gap-3 px-4 py-2.5 text-[11px]" data-testid="summary-voluntary-disclosure">
          <dt className="text-[#87938c]">Voluntary disclosure</dt>
          <dd className="break-words text-[#3f5550]">
            <ul className="space-y-1">
              {draft.selfIdentification.raceEthnicity && <li>Race or ethnicity: {draft.selfIdentification.raceEthnicity}</li>}
              {draft.selfIdentification.gender && <li>Gender: {draft.selfIdentification.gender}</li>}
              {draft.selfIdentification.veteran && <li>Veteran status: {draft.selfIdentification.veteran}</li>}
              {draft.selfIdentification.disability && <li>Disability status: {draft.selfIdentification.disability}</li>}
            </ul>
            <span className="mt-1 block text-[9px] text-[#87938c]">Stored separately from your application record.</span>
          </dd>
        </div>
      )}
      <div className="grid grid-cols-[120px_1fr] gap-3 px-4 py-2.5 text-[11px]"><dt className="text-[#87938c]">Resume versions</dt><dd className="text-[#3f5550]"><ul>{draft.files.map((f, i) => <li key={i} data-testid={`text-review-resume-${i}`}>Version {i + 1}: {f.name} ({fmtSize(f.size)})</li>)}</ul></dd></div>
    </dl>
  );
}
