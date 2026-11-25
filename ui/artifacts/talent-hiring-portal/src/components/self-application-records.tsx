import type { HiringPosition, RoleApplicant } from "./job-portal-pages";
import { candidateApplicationsForEmail } from "../lib/self-application";

export function ApplicantSubmittedDetails({ applicant, hasResumeFile, onOpenResume }: {
  applicant: RoleApplicant;
  hasResumeFile(id: string): boolean;
  onOpenResume(id: string): void;
}) {
  if (!applicant.resumeVersions?.length) return null;
  return <div className="mt-3 space-y-2 text-[11px] text-[#526a60]">
    <strong>Submitted resume versions</strong>
    {applicant.resumeVersions.map((resume, index) => <div key={resume.id}>
      <button type="button" disabled={!hasResumeFile(resume.id)} onClick={() => onOpenResume(resume.id)}
        className="max-w-full break-all text-left underline underline-offset-2 disabled:text-[#89948d] disabled:no-underline">
        Version {index + 1}: {resume.name}
      </button>
      {!hasResumeFile(resume.id) && <span className="block text-[10px]">File unavailable after reload; metadata only.</span>}
    </div>)}
    {applicant.profile && <details>
      <summary className="cursor-pointer font-semibold">Submitted profile</summary>
      <dl className="mt-2 space-y-1">
         {(["phone", "address", "nonCompeteResponse", "location", "profileUrl", "summary"] as const).map((key) => <div key={key}>
          <dt className="font-semibold">{{phone:"Phone", address:"Address", nonCompeteResponse:"Non-compete response", location:"Location", profileUrl:"Profile URL", summary:"Summary"}[key]}</dt>
          <dd className="whitespace-pre-wrap break-words">{applicant.profile?.[key] || "Not provided"}</dd>
        </div>)}
        <div>
          <dt className="font-semibold">SMS updates</dt>
          <dd>{applicant.smsOptIn ? "Opted in" : "Not opted in"}</dd>
        </div>
      </dl>
    </details>}
  </div>;
}

export function SelfApplicationRecords({ positions, email, hasResumeFile, onOpenResume, onBrowse, onEmailChange }: {
  positions: HiringPosition[];
  email: string;
  hasResumeFile(id: string): boolean;
  onOpenResume(id: string): void;
  onBrowse(): void;
  onEmailChange(email: string): void;
}) {
  const applications = candidateApplicationsForEmail(positions, email);
  return <main className="mx-auto min-h-screen max-w-4xl space-y-5 px-5 py-10 text-[#344d4d]">
    <button type="button" onClick={onBrowse} className="text-sm font-semibold underline">Browse open roles</button>
    <h1 className="serif text-4xl font-bold">Your submitted applications</h1>
    <p className="text-sm leading-6">Browser-only demo, not a secure account. Records are only in this browser; anyone using this browser can view demo records by email. Use fictitious details. Resume files disappear on page reload.</p>
    <label className="block text-sm font-semibold">Application email
      <input type="email" value={email} onChange={(event) => onEmailChange(event.target.value)}
        className="mt-2 block w-full rounded-xl border border-[#dfe1d8] bg-white p-3" />
    </label>
    {!applications.length && <p role="status">No self-applications found for this email in this browser.</p>}
    {applications.map(({position, applicant}) => <article key={applicant.id} className="rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-5">
      <h2 className="text-xl font-bold">{position.position}</h2>
      <p className="mt-1 text-sm">{position.requisitionId} · {position.location}</p>
      <p className="mt-3 text-sm">Application received · Submitted {applicant.appliedAt}</p>
      <p className="mt-1 text-sm">{applicant.name} · {applicant.email}</p>
      <p className="mt-1 text-xs">Reference: {applicant.id}. Role currently: {position.status}. No action needed unless the team contacts you.</p>
      <ApplicantSubmittedDetails applicant={applicant} hasResumeFile={hasResumeFile} onOpenResume={onOpenResume} />
    </article>)}
  </main>;
}
