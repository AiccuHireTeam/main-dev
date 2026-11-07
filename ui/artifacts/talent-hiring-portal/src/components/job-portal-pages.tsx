import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CirclePlus,
  ClipboardList,
  Copy,
  MapPin,
  Users,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

export type RoleApplicant = {
  id: string;
  name: string;
  email: string;
  appliedAt: string;
  rank: number;
  resumeName: string;
  selectedForInterview: boolean;
  interviewConfirmed?: boolean;
  interviewed?: boolean;
  interviewedAt?: string;
  preferredForFinalInterview?: boolean;
  selectedForFinalInterview?: boolean;
  finalInterviewScheduled?: boolean;
  finalInterviewCompleted?: boolean;
  selectedForOffer?: boolean;
  offerRank?: 1 | 2 | 3;
  offerStatus?: 'Pending' | 'Accepted' | 'Withdrawn';
  interviewSummary?: string;
  interviewScores?: {
    roleFit: number;
    problemSolving: number;
    communication: number;
    collaboration: number;
    overall: number;
  };
  assessmentDetails?: {
    transcriptQa: string;
    personalityOCEAN: string;
    enneagramObject: string;
    aOrBObject: string;
    skillAnalysisObject: string;
    conjugateSkillObject: string;
    conversationalResponsiveness: string;
    conversationAssimilation: string;
    roleplayAnalysis: string;
    mathematicalReasoning: string;
    spatialReasoning: string;
    languageReasoning: string;
    outlierRanking: string;
    challengeResponseRanking: string;
    noisyThinking: string;
    organizationalAwareness: string;
    roleAwareness: string;
    teamRoleplay: string;
    curiosity: string;
  };
};

export type HiringPosition = {
  id: string;
  requisitionId: string;
  position: string;
  hiringManager: string;
  positionType: 'New' | 'Replacement';
  department: string;
  priority: string;
  salaryGrade: string;
  location: string;
  stakeholders: string[];
  jobPostingDeadline: string;
  recruitmentDeadline: string;
  job: string;
  skill: string;
  capability: string;
  additionalRole: string;
  verticalGrowth: string;
  otherDetails: string;
  status: 'Open' | 'Ready for Interview' | 'Ready for Final Interview' | 'Final Interview scheduled' | 'Final interviews completed' | 'Process Offer' | 'Closed' | 'Draft' | 'On Hold' | 'Removed';
  statusBeforeHold?: 'Open' | 'Ready for Interview' | 'Ready for Final Interview' | 'Final Interview scheduled' | 'Final interviews completed' | 'Process Offer' | 'Closed' | 'Draft';
  createdAt: string;
  applicantCount: number;
  ownerEmail: string;
  applicants?: RoleApplicant[];
};

export type PositionFormValues = {
  title: string;
  department: string;
  location: string;
  employmentType: string;
  workplace: string;
  description: string;
  responsibilities: string;
  requirements: string;
  salaryRange: string;
};

type JobPortalPageProps = {
  positions: HiringPosition[];
  onCreate(): void;
  onDuplicate(requisitionId: string): boolean;
  onOpenPosition(position: HiringPosition): void;
  onBackToDashboard(): void;
};

type CreatePositionPageProps = {
  initialValues: PositionFormValues | null;
  isDuplicate: boolean;
  error?: string;
  onCancel(): void;
  onSave(values: PositionFormValues, status: 'Open' | 'Draft'): void;
};

const emptyValues: PositionFormValues = {
  title: '',
  department: '',
  location: '',
  employmentType: '',
  workplace: '',
  description: '',
  responsibilities: '',
  requirements: '',
  salaryRange: '',
};

const controlClass =
  'w-full rounded-xl border border-[#dfe1d8] bg-[#fffefa] px-3.5 py-3 text-[12px] text-[#3f5550] outline-none placeholder:text-[#a0aaa6] focus:border-[#438274] focus:ring-4 focus:ring-[#438274]/10';
const labelClass = 'mb-1.5 block text-[11px] font-semibold text-[#50635d]';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'Date not set';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function StatusBadge({ status }: { status: HiringPosition['status'] }) {
  const styles = {
    Open: 'bg-[#e8f1e9] text-[#34715f]',
    'Ready for Interview': 'bg-[#e8efe9] text-[#2f6b5a]',
    'Ready for Final Interview': 'bg-[#e7edf7] text-[#455f8a]',
    'Final Interview scheduled': 'bg-[#e9e9f4] text-[#62558b]',
    'Final interviews completed': 'bg-[#e9e9f4] text-[#62558b]',
    'Process Offer': 'bg-[#e8efe9] text-[#2f6b5a]',
    Closed: 'bg-[#e8f1e9] text-[#34715f]',
    Draft: 'bg-[#f3eee2] text-[#9a7139]',
    'On Hold': 'bg-[#f4eadb] text-[#986f3c]',
    Removed: 'bg-[#f5e9e5] text-[#9a5548]',
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${styles[status]}`}><span className={`h-1.5 w-1.5 rounded-full ${status === 'Open' || status === 'Ready for Interview' || status === 'Process Offer' || status === 'Closed' ? 'bg-[#4d8a70]' : status === 'Ready for Final Interview' || status === 'Final Interview scheduled' || status === 'Final interviews completed' ? 'bg-[#677cab]' : status === 'Draft' ? 'bg-[#c38b45]' : status === 'On Hold' ? 'bg-[#c38b45]' : status === 'Removed' ? 'bg-[#b36b5f]' : 'bg-[#89948d]'}`} />{status}</span>;
}

export function JobPortalPage({ positions, onCreate, onDuplicate, onOpenPosition, onBackToDashboard }: JobPortalPageProps) {
  const [duplicateJobId, setDuplicateJobId] = useState('');
  const [duplicateError, setDuplicateError] = useState('');
  const [statusFilter, setStatusFilter] = useState<HiringPosition['status'] | 'All'>('All');
  const [nameFilter, setNameFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const openCount = positions.filter((position) => position.status === 'Open').length;
  const applicantCount = positions.reduce((total, position) => total + position.applicantCount, 0);
  const filteredPositions = useMemo(() => {
    const normalizedName = nameFilter.trim().toLowerCase();
    const normalizedLocation = locationFilter.trim().toLowerCase();
    return positions.filter((position) =>
      (statusFilter === 'All' || position.status === statusFilter) &&
      (!normalizedName || position.position.toLowerCase().includes(normalizedName)) &&
      (!normalizedLocation || position.location.toLowerCase().includes(normalizedLocation)),
    );
  }, [locationFilter, nameFilter, positions, statusFilter]);

  const submitDuplicate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requisitionId = duplicateJobId.trim().toUpperCase();
    if (!/^REQ-\d{4}-[A-Z0-9]{8}$/.test(requisitionId)) {
      setDuplicateError('Enter a valid requisition ID, such as REQ-2026-3IU87C13.');
      return;
    }
    if (!onDuplicate(requisitionId)) {
      setDuplicateError(`No job with ID ${requisitionId} was found in your jobs.`);
      return;
    }
  };

  return (
    <div className="page-enter mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <button type="button" onClick={onBackToDashboard} className="mb-5 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-semibold text-[#557068] hover:bg-[#e9eee7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]">
        <ArrowLeft size={15} /> Back to dashboard
      </button>

      <header className="relative mb-6 overflow-hidden rounded-[24px] border border-[#e1e3d9] bg-[#f4f2e9] px-5 py-6 sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border-[1px] border-[#d9e0d3] sm:right-8" />
        <div className="pointer-events-none absolute -right-2 -top-10 h-48 w-48 rounded-full border-[1px] border-[#e0e4d8] sm:right-14" />
        <div className="relative max-w-2xl">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.17em] text-[#68857a]">AiccuHire / Hiring workspace</div>
          <h1 className="serif text-[clamp(28px,4vw,40px)] font-bold leading-tight tracking-[-.05em] text-[#2d4446]">Your next great hire starts here.</h1>
          <p className="mt-2 max-w-xl text-[12px] leading-5 text-[#71817a]">Shape the role, bring your team along, and keep every open position moving.</p>
          <p className="mt-2 text-[10px] text-[#87928a]">Demo positions and new jobs are saved in this browser.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#dfe4d9] bg-[#faf9f3] px-3 py-1.5 text-[10px] font-semibold text-[#587269]">{openCount} open {openCount === 1 ? 'role' : 'roles'}</span>
            <span className="rounded-full border border-[#dfe4d9] bg-[#faf9f3] px-3 py-1.5 text-[10px] font-semibold text-[#587269]">{applicantCount} applicants across your jobs</span>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="group flex flex-col justify-between rounded-2xl border border-[#dbe4d9] bg-[#edf3ec] p-5 sm:p-6">
          <div>
            <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[#dce9dc] text-[#34715f]"><CirclePlus size={19} /></div>
            <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#68857a]">Start fresh</div>
            <h2 className="serif mt-1 text-[22px] font-bold tracking-[-.04em] text-[#344d4d]">Create a Job</h2>
            <p className="mt-1.5 max-w-sm text-[11px] leading-5 text-[#71817a]">Write a thoughtful brief and publish a new opportunity for your team.</p>
          </div>
          <button type="button" onClick={onCreate} className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-[#205e53] px-4 py-3 text-[11px] font-bold text-[#fffdf7] shadow-[0_5px_12px_rgba(32,94,83,.12)] hover:-translate-y-0.5 hover:bg-[#184d44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274] focus-visible:ring-offset-2">
            Create a Job <ArrowRight size={14} />
          </button>
        </section>

        <section className="rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-5 shadow-[0_8px_22px_rgba(31,59,54,.045)] sm:p-6">
          <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[#f4eadb] text-[#a9753f]"><Copy size={17} /></div>
          <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#8c806e]">Build on a good brief</div>
          <h2 className="serif mt-1 text-[22px] font-bold tracking-[-.04em] text-[#344d4d]">Duplicate a Job</h2>
          <p className="mt-1.5 max-w-sm text-[11px] leading-5 text-[#71817a]">Enter an existing requisition ID to prefill a new position with its job details.</p>
          <form onSubmit={submitDuplicate} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor="duplicate-position-id">Existing job requisition ID</label>
              <input
                id="duplicate-position-id"
                value={duplicateJobId}
                onChange={(event) => {
                  setDuplicateJobId(event.target.value);
                  setDuplicateError('');
                }}
                placeholder="REQ-2026-3IU87C13"
                autoCapitalize="characters"
                autoComplete="off"
                className={`${controlClass} h-[42px] py-2`}
              />
            </div>
            <button type="submit" className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl border border-[#d9e0d6] bg-[#f1f4ed] px-4 text-[11px] font-bold text-[#42665a] hover:bg-[#e7eee6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]">
              <Copy size={14} /> Load job
            </button>
          </form>
          {duplicateError && <p role="alert" className="mt-2 text-[10px] leading-4 text-[#a2493f]">{duplicateError}</p>}
        </section>
      </div>

      <section className="mt-7">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#7c8b82]">Hiring overview</div>
            <h2 className="serif mt-1 text-[24px] font-bold tracking-[-.04em] text-[#344d4d]">Your jobs</h2>
          </div>
          {positions.length > 0 && <span className="text-[10px] font-medium text-[#829087]">{filteredPositions.length} of {positions.length} {positions.length === 1 ? 'position' : 'positions'}</span>}
        </div>

        {positions.length > 0 && (
          <div className="mb-4 grid gap-3 rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="filter-role-status">Status</label>
              <select
                id="filter-role-status"
                data-testid="filter-role-status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as HiringPosition['status'] | 'All')}
                className={controlClass}
              >
                <option value="All">All statuses</option>
                <option value="Draft">Draft</option>
                <option value="Open">Open</option>
                <option value="Ready for Interview">Ready for Interview</option>
                <option value="Ready for Final Interview">Ready for Final Interview</option>
                <option value="Final Interview scheduled">Final Interview scheduled</option>
                <option value="Final interviews completed">Final interviews completed</option>
                <option value="Process Offer">Process Offer</option>
                <option value="Closed">Closed</option>
                <option value="On Hold">On Hold</option>
                <option value="Removed">Removed</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="filter-role-name">Role name</label>
              <input
                id="filter-role-name"
                data-testid="filter-role-name"
                value={nameFilter}
                onChange={(event) => setNameFilter(event.target.value)}
                placeholder="Search role names"
                className={controlClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="filter-role-location">Location</label>
              <input
                id="filter-role-location"
                data-testid="filter-role-location"
                value={locationFilter}
                onChange={(event) => setLocationFilter(event.target.value)}
                placeholder="Search locations"
                className={controlClass}
              />
            </div>
          </div>
        )}

        {positions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d7ded5] bg-[#f8f7f1] px-5 py-10 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf0e8] text-[#648777]"><BriefcaseBusiness size={20} /></div>
            <h3 className="serif mt-3 text-[18px] font-bold text-[#435a55]">Your first role is waiting</h3>
            <p className="mx-auto mt-1 max-w-sm text-[11px] leading-5 text-[#7a8981]">Create a job to start building your hiring pipeline. It will appear here once it’s ready.</p>
            <button type="button" onClick={onCreate} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#205e53] px-4 py-2.5 text-[11px] font-bold text-white hover:bg-[#184d44]"><CirclePlus size={14} /> Create a Job</button>
          </div>
        ) : filteredPositions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d7ded5] bg-[#f8f7f1] px-5 py-10 text-center">
            <h3 className="serif text-[18px] font-bold text-[#435a55]">No matching positions</h3>
            <p className="mt-1 text-[11px] text-[#7a8981]">Try a different status, role name, or location.</p>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('All');
                setNameFilter('');
                setLocationFilter('');
              }}
              className="mt-4 rounded-xl border border-[#d9e0d6] px-4 py-2.5 text-[11px] font-semibold text-[#42665a] hover:bg-[#e7eee6]"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] shadow-[0_8px_22px_rgba(31,59,54,.045)]">
            <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(120px,.8fr)_minmax(100px,.7fr)_minmax(90px,.65fr)] gap-4 border-b border-[#e8e5dd] bg-[#f4f3ec] px-5 py-3 text-[9px] font-bold uppercase tracking-[.12em] text-[#829087] sm:grid">
              <span>Role</span><span>Location &amp; type</span><span>Applicants</span><span>Status</span>
            </div>
            <div className="divide-y divide-[#ece9e1]">
              {filteredPositions.map((position) => (
                <article key={position.id} data-testid={`row-role-${position.id}`} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.6fr)_minmax(120px,.8fr)_minmax(100px,.7fr)_minmax(90px,.65fr)] sm:items-center sm:gap-4 sm:px-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenPosition(position)}
                        data-testid={`button-open-role-${position.id}`}
                        className="text-left text-[13px] font-bold text-[#344d4d] underline decoration-transparent underline-offset-4 hover:text-[#205e53] hover:decoration-[#9db9a7] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]"
                        aria-label={`View ${position.position} details`}
                      >
                        {position.position}
                      </button>
                      <span className="sm:hidden"><StatusBadge status={position.status} /></span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[#7c8982]">
                      <span className="inline-flex items-center gap-1"><Building2 size={12} />{position.requisitionId}</span>
                      <span aria-hidden="true">·</span><span>{position.department}</span>
                      <span aria-hidden="true">·</span><span>Created {formatDate(position.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[#667a72]">
                    <span className="inline-flex items-center gap-1"><MapPin size={12} />{position.location}</span>
                    <span className="hidden text-[#a2aaa3] sm:inline">·</span>
                    <span>{position.positionType} · {position.priority} priority{position.salaryGrade ? ` · Grade ${position.salaryGrade}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#526b62]"><Users size={14} className="text-[#7b9888]" /><span>{position.applicantCount}</span><span className="font-normal text-[#89948d]">{position.applicantCount === 1 ? 'applicant' : 'applicants'}</span></div>
                  <div className="hidden sm:block"><StatusBadge status={position.status} /></div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export function CreatePositionPage({ initialValues, isDuplicate, error, onCancel, onSave }: CreatePositionPageProps) {
  const [values, setValues] = useState<PositionFormValues>(() => ({ ...emptyValues, ...(initialValues ?? {}) }));
  const [validationMessage, setValidationMessage] = useState('');
  const completionCount = useMemo(() => Object.values(values).filter((value) => value.trim()).length, [values]);

  const updateValue = (key: keyof PositionFormValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setValidationMessage('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const status = submitter?.value === 'Draft' ? 'Draft' : 'Open';
    const required: (keyof PositionFormValues)[] = status === 'Draft'
      ? ['title']
      : [
          'title', 'department', 'location', 'employmentType', 'workplace',
          'description', 'responsibilities', 'requirements',
        ];
    const missing = required.filter((key) => !values[key].trim());
    if (missing.length) {
      setValidationMessage(status === 'Draft'
        ? 'Add a job title before saving this draft.'
        : 'Complete each required field before publishing. Your work remains in this form.');
      document.getElementById(`position-${missing[0]}`)?.focus();
      return;
    }
    onSave({ ...values, title: values.title.trim(), department: values.department.trim(), location: values.location.trim() }, status);
  };

  return (
    <div className="page-enter mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-semibold text-[#557068] hover:bg-[#e9eee7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]"><ArrowLeft size={15} /> Back to jobs</button>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-[#788781]"><ClipboardList size={13} className="text-[#6c8e7d]" />Job details · {completionCount} fields started</span>
      </div>

      <header className="mb-5 rounded-2xl border border-[#e1e3d9] bg-[#f4f2e9] px-5 py-5 sm:px-7">
        <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#68857a]">AiccuHire / {isDuplicate ? 'New copy' : 'New position'}</div>
        <h1 className="serif mt-1 text-[clamp(26px,4vw,36px)] font-bold leading-tight tracking-[-.05em] text-[#2d4446]">{isDuplicate ? 'Make this role your own.' : 'Create a Job'}</h1>
        <p className="mt-1.5 max-w-2xl text-[11px] leading-5 text-[#71817a]">{isDuplicate ? 'Review the copied details and adjust anything that has changed before saving.' : 'A clear, specific brief helps the right people see themselves in this role.'}</p>
      </header>

      {(error || validationMessage) && <div role="alert" className="mb-4 rounded-xl border border-[#e8c9be] bg-[#fbefea] px-4 py-3 text-[11px] leading-5 text-[#954c3f]">{error || validationMessage}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_290px]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-5 shadow-[0_8px_22px_rgba(31,59,54,.045)] sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e8efe7] text-[#397462]"><BriefcaseBusiness size={17} /></div>
                <div><h2 className="text-[13px] font-bold text-[#344d4d]">Role essentials</h2><p className="mt-1 text-[10px] text-[#84918b]">Set the foundations candidates will scan first.</p></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="position-title">Job title <span className="text-[#b36b4f]">*</span></label>
                  <input id="position-title" value={values.title} onChange={(event) => updateValue('title', event.target.value)} required maxLength={120} placeholder="e.g. Senior Product Designer" className={controlClass} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="position-department">Department <span className="text-[#b36b4f]">*</span></label>
                  <input id="position-department" value={values.department} onChange={(event) => updateValue('department', event.target.value)} required maxLength={100} placeholder="e.g. Product & Design" className={controlClass} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="position-location">Location <span className="text-[#b36b4f]">*</span></label>
                  <input id="position-location" value={values.location} onChange={(event) => updateValue('location', event.target.value)} required maxLength={120} placeholder="e.g. San Francisco, CA" className={controlClass} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="position-employmentType">Employment type <span className="text-[#b36b4f]">*</span></label>
                  <select id="position-employmentType" value={values.employmentType} onChange={(event) => updateValue('employmentType', event.target.value)} required className={`${controlClass} appearance-none`}>
                    <option value="">Select employment type</option><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Temporary</option><option>Internship</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="position-workplace">Workplace <span className="text-[#b36b4f]">*</span></label>
                  <select id="position-workplace" value={values.workplace} onChange={(event) => updateValue('workplace', event.target.value)} required className={`${controlClass} appearance-none`}>
                    <option value="">Select workplace</option><option>On-site</option><option>Hybrid</option><option>Remote</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass} htmlFor="position-salaryRange">Salary range <span className="font-normal text-[#89948d]">(optional)</span></label>
                  <input id="position-salaryRange" value={values.salaryRange} onChange={(event) => updateValue('salaryRange', event.target.value)} maxLength={100} placeholder="e.g. $118,000 – $146,000 annually" className={controlClass} />
                  <p className="mt-1.5 text-[10px] leading-4 text-[#8b958e]">Sharing a range helps candidates decide if the role is right for them.</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-5 shadow-[0_8px_22px_rgba(31,59,54,.045)] sm:p-6">
              <div className="mb-5">
                <div className="text-[10px] font-bold uppercase tracking-[.13em] text-[#68857a]">The opportunity</div>
                <h2 className="serif mt-1 text-[19px] font-bold tracking-[-.03em] text-[#344d4d]">Tell the story of this role</h2>
                <p className="mt-1 text-[10px] leading-4 text-[#84918b]">Keep it human, concrete, and focused on the work ahead.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelClass} htmlFor="position-description">Job description <span className="text-[#b36b4f]">*</span></label>
                  <textarea id="position-description" value={values.description} onChange={(event) => updateValue('description', event.target.value)} required rows={5} maxLength={5000} placeholder="What will this person work on, and why does it matter?" className={`${controlClass} resize-y leading-5`} />
                  <div className="mt-1 text-right text-[9px] text-[#9aa39d]">{values.description.length}/5000</div>
                </div>
                <div>
                  <label className={labelClass} htmlFor="position-responsibilities">Responsibilities <span className="text-[#b36b4f]">*</span></label>
                  <textarea id="position-responsibilities" value={values.responsibilities} onChange={(event) => updateValue('responsibilities', event.target.value)} required rows={4} maxLength={4000} placeholder="List the work and outcomes this person will own. One item per line works well." className={`${controlClass} resize-y leading-5`} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="position-requirements">Requirements <span className="text-[#b36b4f]">*</span></label>
                  <textarea id="position-requirements" value={values.requirements} onChange={(event) => updateValue('requirements', event.target.value)} required rows={4} maxLength={4000} placeholder="What experience, skills, or perspective will help someone thrive?" className={`${controlClass} resize-y leading-5`} />
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-3 lg:sticky lg:top-5">
            <section className="rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-5 shadow-[0_8px_22px_rgba(31,59,54,.045)]">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#71867c]"><CalendarDays size={14} /> At a glance</div>
              <h2 className="serif mt-3 text-[18px] font-bold leading-6 text-[#344d4d]">{values.title.trim() || 'Your job title'}</h2>
              <p className="mt-1 text-[11px] text-[#71817a]">{[values.department, values.location].filter(Boolean).join(' · ') || 'Department · Location'}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {values.employmentType && <span className="rounded-full bg-[#edf1e9] px-2.5 py-1 text-[9px] font-semibold text-[#557166]">{values.employmentType}</span>}
                {values.workplace && <span className="rounded-full bg-[#edf1e9] px-2.5 py-1 text-[9px] font-semibold text-[#557166]">{values.workplace}</span>}
                {values.salaryRange && <span className="rounded-full bg-[#f4eadb] px-2.5 py-1 text-[9px] font-semibold text-[#986f3c]">{values.salaryRange}</span>}
              </div>
              {values.description && <p className="mt-4 line-clamp-5 whitespace-pre-line border-t border-[#ece9e1] pt-3 text-[10px] leading-5 text-[#687a72]">{values.description}</p>}
              <p className="mt-4 flex items-center gap-1.5 border-t border-[#ece9e1] pt-3 text-[9px] leading-4 text-[#87928a]"><Check size={12} className="shrink-0 text-[#6f987e]" />You can save a draft and return to it later.</p>
            </section>
            <div className="rounded-xl border border-[#e8e5dd] bg-[#f4f3ec] px-4 py-3 text-[10px] leading-5 text-[#78867e]">
              <span className="font-semibold text-[#526a60]">A good brief starts with clarity.</span> Describe the work, name the essentials, and let candidates know what success looks like.
            </div>
          </aside>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[#e4e2d9] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={onCancel} className="rounded-xl px-4 py-3 text-[11px] font-semibold text-[#61766d] hover:bg-[#e9eee7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]">Cancel</button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button type="submit" name="status" value="Draft" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d5dfd6] bg-[#f3f5ef] px-5 py-3 text-[11px] font-bold text-[#41685a] hover:bg-[#e9efe7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]">
              Save as draft
            </button>
            <button type="submit" name="status" value="Open" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#205e53] px-5 py-3 text-[11px] font-bold text-white shadow-[0_5px_12px_rgba(32,94,83,.12)] hover:bg-[#184d44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274] focus-visible:ring-offset-2">
              Publish job <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
