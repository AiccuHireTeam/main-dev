import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Flag,
  MapPin,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

export type PositionFormValues = {
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
};

type CreatePositionPageProps = {
  initialValues: PositionFormValues | null;
  isDuplicate: boolean;
  error?: string;
  onCancel(): void;
  onSave(values: PositionFormValues): void;
};

type TextFormField = Exclude<
  keyof PositionFormValues,
  'requisitionId' | 'positionType' | 'stakeholders'
>;

export function createRequisitionId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  const randomPart = uuid
    ? uuid.replaceAll('-', '').slice(0, 8).toUpperCase()
    : Date.now().toString(36).slice(-8).toUpperCase();
  return `REQ-${new Date().getFullYear()}-${randomPart}`;
}

function createEmptyValues(): PositionFormValues {
  return {
    requisitionId: createRequisitionId(),
    position: '',
    hiringManager: '',
    positionType: 'New',
    department: 'General',
    priority: 'Medium',
    salaryGrade: '',
    location: '',
    stakeholders: [],
    jobPostingDeadline: '',
    recruitmentDeadline: '',
    job: '',
    skill: '',
    capability: '',
    additionalRole: '',
    verticalGrowth: '',
    otherDetails: '',
  };
}

const controlClass =
  'w-full rounded-xl border border-[#dfe1d8] bg-[#fffefa] px-3.5 py-3 text-[12px] text-[#3f5550] outline-none placeholder:text-[#a0aaa6] focus:border-[#438274] focus:ring-4 focus:ring-[#438274]/10';
const labelClass = 'mb-1.5 block text-[11px] font-semibold text-[#50635d]';
const sectionClass =
  'rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-5 shadow-[0_8px_22px_rgba(31,59,54,.045)] sm:p-7';
const descriptionFields = [
  {
    key: 'job',
    label: 'Job',
    helper: 'Responsibilities and scope of the role.',
    placeholder: 'Describe the day-to-day responsibilities...',
  },
  {
    key: 'skill',
    label: 'Skill',
    helper: 'Technical or functional skills required.',
    placeholder: 'List the required skills...',
  },
  {
    key: 'capability',
    label: 'Capability',
    helper: 'Behavioral or leadership capabilities expected.',
    placeholder: 'Describe expected capabilities...',
  },
  {
    key: 'additionalRole',
    label: 'Additional Role',
    helper: 'Optional — include any secondary responsibilities or role coverage.',
    placeholder: 'Describe any additional role responsibilities...',
  },
  {
    key: 'verticalGrowth',
    label: 'Vertical Growth',
    helper: 'Optional — describe growth opportunities and progression for this role.',
    placeholder: 'Describe the expected growth path...',
  },
  {
    key: 'otherDetails',
    label: 'Other Details',
    helper: 'Optional — add any other context hiring managers should review.',
    placeholder: 'Add any other details about this position...',
  },
] as const;
const departments = [
  'General',
  'Engineering',
  'Product',
  'Design',
  'Data',
  'Research',
  'Marketing',
  'Sales',
  'People',
  'Finance',
  'Operations',
  'Other',
];

export function CreatePositionPage({
  initialValues,
  isDuplicate,
  error,
  onCancel,
  onSave,
}: CreatePositionPageProps) {
  const [values, setValues] = useState<PositionFormValues>(() => ({
    ...createEmptyValues(),
    ...(initialValues ?? {}),
    stakeholders: [...(initialValues?.stakeholders ?? [])],
  }));
  const [validationMessage, setValidationMessage] = useState('');
  const [stakeholderEntry, setStakeholderEntry] = useState('');
  const [stakeholderError, setStakeholderError] = useState('');

  const updateText = (key: TextFormField, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setValidationMessage('');
  };

  const addStakeholders = (rawValue = stakeholderEntry) => {
    const emails = rawValue
      .split(/[,;\n]+/)
      .map((email) => email.trim())
      .filter(Boolean);
    if (!emails.length) return;

    const invalidEmail = emails.find(
      (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    );
    if (invalidEmail) {
      setStakeholderError(`Enter a valid email address for ${invalidEmail}.`);
      return;
    }

    setValues((current) => {
      const existing = new Set(
        current.stakeholders.map((email) => email.toLowerCase()),
      );
      const additions = emails.filter(
        (email) => !existing.has(email.toLowerCase()),
      );
      return { ...current, stakeholders: [...current.stakeholders, ...additions] };
    });
    setStakeholderEntry('');
    setStakeholderError('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const missing = !values.position.trim()
      ? 'position'
      : !values.hiringManager.trim()
        ? 'hiring-manager'
        : null;
    if (missing) {
      setValidationMessage(
        'Enter a position and hiring manager to create this requisition.',
      );
      document.getElementById(missing)?.focus();
      return;
    }

    onSave({
      ...values,
      position: values.position.trim(),
      hiringManager: values.hiringManager.trim(),
      department: values.department.trim() || 'General',
      priority: values.priority || 'Medium',
      location: values.location.trim() || 'Remote',
    });
  };

  return (
    <div className="page-enter mx-auto w-full max-w-[1080px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onCancel}
        className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-semibold text-[#557068] hover:bg-[#e9eee7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]"
      >
        <ArrowLeft size={15} /> Back to jobs
      </button>

      <header className="mb-6">
        <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#68857a]">
          AiccuHire / {isDuplicate ? 'Duplicate requisition' : 'Hiring workspace'}
        </div>
        <h1 className="serif mt-1 text-[clamp(28px,4vw,38px)] font-bold leading-tight tracking-[-.05em] text-[#2d4446]">
          Create Position
        </h1>
        <p className="mt-1.5 max-w-2xl text-[12px] leading-5 text-[#71817a]">
          Open a new requisition and route it into the AiccuHire pipeline.
        </p>
      </header>

      {(error || validationMessage) && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-[#e8c9be] bg-[#fbefea] px-4 py-3 text-[11px] leading-5 text-[#954c3f]"
        >
          {error || validationMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <section className={sectionClass}>
          <div className="mb-5 flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e8efe7] text-[#397462]">
              <BriefcaseBusiness size={17} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#344d4d]">
                Requisition Details
              </h2>
              <p className="mt-1 text-[11px] text-[#84918b]">
                Core information for the new position.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="requisition-id">
                # Requisition ID
              </label>
              <input
                id="requisition-id"
                value={values.requisitionId}
                readOnly
                className={`${controlClass} bg-[#f2f2ec] font-mono tracking-wide text-[#71817a]`}
              />
              <p className="mt-1.5 text-[10px] text-[#8b958e]">
                Automatically assigned — cannot be edited.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="position">
                  Position <span className="text-[#b36b4f]">*</span>
                </label>
                <input
                  id="position"
                  value={values.position}
                  onChange={(event) => updateText('position', event.target.value)}
                  required
                  maxLength={120}
                  placeholder="e.g. Senior Frontend Engineer"
                  className={controlClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="hiring-manager">
                  Hiring Manager <span className="text-[#b36b4f]">*</span>
                </label>
                <input
                  id="hiring-manager"
                  value={values.hiringManager}
                  onChange={(event) =>
                    updateText('hiringManager', event.target.value)
                  }
                  required
                  maxLength={120}
                  placeholder="e.g. Priya Nair"
                  className={controlClass}
                />
              </div>
            </div>

            <fieldset>
              <legend className={labelClass}>Type</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(['New', 'Replacement'] as const).map((type) => (
                  <label
                    key={type}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-3 text-[12px] font-semibold transition-colors ${
                      values.positionType === type
                        ? 'border-[#9ab7a7] bg-[#edf3ec] text-[#365e51]'
                        : 'border-[#e5e6dd] bg-[#f8f7f1] text-[#667a72]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="position-type"
                      value={type}
                      checked={values.positionType === type}
                      onChange={() =>
                        setValues((current) => ({
                          ...current,
                          positionType: type,
                        }))
                      }
                      className="h-4 w-4 accent-[#34715f]"
                    />
                    {type}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="department">
                  Department
                </label>
                <select
                  id="department"
                  value={values.department}
                  onChange={(event) =>
                    updateText('department', event.target.value)
                  }
                  className={`${controlClass} appearance-none`}
                >
                  {departments.map((department) => (
                    <option key={department} value={department}>
                      {department}
                      {department === 'General' ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className={`${labelClass} flex items-center gap-1.5`}
                  htmlFor="priority"
                >
                  <Flag size={12} /> Priority
                </label>
                <select
                  id="priority"
                  value={values.priority}
                  onChange={(event) =>
                    updateText('priority', event.target.value)
                  }
                  className={`${controlClass} appearance-none`}
                >
                  {['Low', 'Medium', 'High', 'Urgent'].map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                      {priority === 'Medium' ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="salary-grade">
                Salary Grade
              </label>
              <input
                id="salary-grade"
                value={values.salaryGrade}
                onChange={(event) =>
                  updateText('salaryGrade', event.target.value)
                }
                maxLength={80}
                placeholder="e.g. Grade 8 / L5"
                className={controlClass}
              />
            </div>

            <div>
              <label
                className={`${labelClass} flex items-center gap-1.5`}
                htmlFor="location"
              >
                <MapPin size={12} /> Location
              </label>
              <input
                id="location"
                value={values.location}
                onChange={(event) => updateText('location', event.target.value)}
                maxLength={160}
                placeholder="e.g. San Francisco, CA (defaults to Remote)"
                className={controlClass}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="stakeholder-entry">
                Stakeholders
              </label>
              <p className="mb-2 text-[10px] leading-4 text-[#84918b]">
                Optional — add stakeholder emails. Press Enter or Add; paste
                lists separated by commas, semicolons, or newlines.
              </p>
              <div className="flex gap-2">
                <input
                  id="stakeholder-entry"
                  value={stakeholderEntry}
                  onChange={(event) => {
                    setStakeholderEntry(event.target.value);
                    setStakeholderError('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addStakeholders();
                    }
                  }}
                  placeholder="name@example.com"
                  className={controlClass}
                  aria-describedby="stakeholder-hint"
                />
                <button
                  type="button"
                  onClick={() => addStakeholders()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#d9e0d6] bg-[#f1f4ed] px-4 text-[11px] font-bold text-[#42665a] hover:bg-[#e7eee6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <p id="stakeholder-hint" className="sr-only">
                Enter one or more email addresses, then press Enter or Add.
              </p>
              {stakeholderError && (
                <p role="alert" className="mt-1.5 text-[10px] text-[#a2493f]">
                  {stakeholderError}
                </p>
              )}
              {values.stakeholders.length > 0 && (
                <ul
                  className="mt-3 flex flex-wrap gap-2"
                  aria-label="Added stakeholders"
                >
                  {values.stakeholders.map((email) => (
                    <li
                      key={email}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#dce5dc] bg-[#edf3ec] py-1 pl-3 pr-1.5 text-[10px] font-medium text-[#42665a]"
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() =>
                          setValues((current) => ({
                            ...current,
                            stakeholders: current.stakeholders.filter(
                              (item) => item !== email,
                            ),
                          }))
                        }
                        aria-label={`Remove ${email}`}
                        className="grid h-5 w-5 place-items-center rounded-full hover:bg-[#dce9dc]"
                      >
                        <X size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="mb-4 flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f4eadb] text-[#a9753f]">
              <CalendarDays size={17} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#344d4d]">Deadlines</h2>
              <p className="mt-1 text-[11px] text-[#84918b]">
                Optional — choose the job posting and recruitment dates independently.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="job-posting-deadline">
                Job Posting Deadline
              </label>
              <input
                id="job-posting-deadline"
                type="date"
                value={values.jobPostingDeadline}
                onChange={(event) =>
                  updateText('jobPostingDeadline', event.target.value)
                }
                className={controlClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="recruitment-deadline">
                Recruitment Deadline
              </label>
              <input
                id="recruitment-deadline"
                type="date"
                value={values.recruitmentDeadline}
                onChange={(event) =>
                  updateText('recruitmentDeadline', event.target.value)
                }
                className={controlClass}
              />
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="mb-5 flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e8efe7] text-[#397462]">
              <Sparkles size={17} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#344d4d]">
                Description
              </h2>
              <p className="mt-1 text-[11px] text-[#84918b]">
                Optional — break the role down into job, skill, and capability sections.
              </p>
            </div>
          </div>
          <div className="space-y-5">
            {descriptionFields.map(({ key, label, helper, placeholder }) => (
              <div key={key}>
                <label className={labelClass} htmlFor={`description-${key}`}>
                  {label}
                  {!['job', 'skill', 'capability'].includes(key) && (
                    <span className="font-normal text-[#89948d]"> (optional)</span>
                  )}
                </label>
                <p className="mb-2 text-[10px] leading-4 text-[#84918b]">
                  {helper}
                </p>
                <textarea
                  id={`description-${key}`}
                  value={values[key]}
                  onChange={(event) => updateText(key, event.target.value)}
                  rows={3}
                  maxLength={4000}
                  placeholder={placeholder}
                  className={`${controlClass} resize-y leading-5`}
                />
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col-reverse gap-2 border-t border-[#e4e2d9] pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-5 py-3 text-[11px] font-semibold text-[#61766d] hover:bg-[#e9eee7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3478dc] px-5 py-3 text-[11px] font-bold text-white shadow-[0_5px_12px_rgba(32,94,83,.12)] hover:bg-[#2869c6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274] focus-visible:ring-offset-2"
          >
            Create Position <ArrowRight size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
