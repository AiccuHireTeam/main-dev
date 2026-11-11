import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  Flag,
  LoaderCircle,
  MapPin,
  Plus,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { readJobDescriptionDocument } from '@/lib/read-job-description-document';

export type PositionFormValues = {
  requisitionId: string;
  position: string;
  hiringManager: string;
  positionType: 'New' | 'Replacement' | '';
  jobType: 'Full Time' | 'Contract' | '';
  contractDurationMonths: string;
  benefits: string[];
  department: string;
  priority: string;
  salaryGrade: string;
  salaryRange: string;
  location: string;
  stakeholders: string[];
  jobPostingDeadline: string;
  recruitmentDeadline: string;
  job: string;
  jobDescriptionFileName: string;
  jobDescriptionDocumentData: string;
  skill: string;
  capability: string;
  personality: string;
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
  | 'requisitionId'
  | 'positionType'
  | 'jobType'
  | 'benefits'
  | 'jobDescriptionDocumentData'
  | 'stakeholders'
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
    positionType: '',
    jobType: '',
    contractDurationMonths: '',
    benefits: [...benefitOptions],
    department: '',
    priority: 'Medium',
    salaryGrade: '',
    salaryRange: '',
    location: '',
    stakeholders: [],
    jobPostingDeadline: '',
    recruitmentDeadline: '',
    job: '',
    jobDescriptionFileName: '',
    jobDescriptionDocumentData: '',
    skill: '',
    capability: '',
    personality: '',
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
const contractDurations = ['3', '6', '12', '18'] as const;
const maxJobDescriptionFileBytes = 1024 * 1024;
const benefitOptions = [
  'Health insurance',
  'Dental coverage',
  'Vision coverage',
  '401(k) retirement plan',
  'Paid time off',
  'Paid parental leave',
  'Life insurance',
  'Disability coverage',
  'Flexible work arrangement',
];
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
    jobType: initialValues?.jobType ?? 'Full Time',
    contractDurationMonths: initialValues?.contractDurationMonths ?? '',
    benefits: [
      ...(initialValues?.benefits?.length
        ? initialValues.benefits
        : benefitOptions),
    ],
    jobDescriptionFileName: initialValues?.jobDescriptionFileName ?? '',
    jobDescriptionDocumentData:
      initialValues?.jobDescriptionDocumentData ?? '',
    stakeholders: [...(initialValues?.stakeholders ?? [])],
  }));
  const [validationMessage, setValidationMessage] = useState('');
  const [stakeholderEntry, setStakeholderEntry] = useState('');
  const [stakeholderError, setStakeholderError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [extractionNotice, setExtractionNotice] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [contractDurationOpen, setContractDurationOpen] = useState(
    () => values.jobType === 'Contract' && !values.contractDurationMonths,
  );
  const [contractDurationChoice, setContractDurationChoice] = useState(() =>
    contractDurations.includes(
      values.contractDurationMonths as (typeof contractDurations)[number],
    )
      ? values.contractDurationMonths
      : values.contractDurationMonths
        ? 'other'
        : '',
  );
  const [contractDurationError, setContractDurationError] = useState('');

  const updateText = (key: TextFormField, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setValidationMessage('');
  };

  const updateJobType = (jobType: PositionFormValues['jobType']) => {
    setValues((current) => ({
      ...current,
      jobType,
      contractDurationMonths:
        jobType === 'Contract' ? current.contractDurationMonths : '',
    }));
    setValidationMessage('');
    if (jobType === 'Contract') {
      setContractDurationChoice((current) => current || '');
      setContractDurationError('');
      setContractDurationOpen(true);
    } else {
      setContractDurationChoice('');
      setContractDurationError('');
      setContractDurationOpen(false);
    }
  };

  const applyContractDuration = () => {
    const duration = values.contractDurationMonths.trim();
    if (!/^[1-9]\d*$/.test(duration)) {
      setContractDurationError(
        'Enter a whole number greater than zero. The value is in months.',
      );
      return;
    }
    setContractDurationError('');
    setContractDurationOpen(false);
    setValidationMessage('');
  };

  const attachJobDescription = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) {
      setUploadError('Choose a searchable PDF, DOCX, or plain text document.');
      return;
    }
    if (file.size > maxJobDescriptionFileBytes) {
      setUploadError('The document must be 1 MB or smaller.');
      return;
    }

    setIsExtracting(true);
    setUploadError('');
    setExtractionNotice('');
    try {
      const [document, dataUrl] = await Promise.all([
        readJobDescriptionDocument(file),
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            typeof reader.result === 'string'
              ? resolve(reader.result)
              : reject(new Error('The document could not be saved.'));
          reader.onerror = () =>
            reject(new Error('The document could not be saved.'));
          reader.readAsDataURL(file);
        }),
      ]);
      const { fields } = document;
      setValues((current) => ({
        ...current,
        position: fields.position ?? '',
        hiringManager: fields.hiringManager ?? '',
        positionType: fields.positionType ?? 'New',
        jobType: fields.jobType ?? '',
        contractDurationMonths: fields.contractDurationMonths ?? '',
        department: fields.department ?? '',
        priority: fields.priority ?? '',
        salaryGrade: fields.salaryGrade ?? '',
        location: fields.location ?? '',
        stakeholders: fields.stakeholders ?? [],
        jobPostingDeadline: fields.jobPostingDeadline ?? '',
        recruitmentDeadline: fields.recruitmentDeadline ?? '',
        job: fields.job ?? '',
        jobDescriptionFileName: file.name,
        jobDescriptionDocumentData: dataUrl.replace(
          /^[^,]*,/,
          'data:application/octet-stream;base64,',
        ),
        skill: '',
        capability: '',
        additionalRole: '',
        verticalGrowth: '',
        otherDetails: '',
      }));
      const duration = fields.contractDurationMonths ?? '';
      const durationChoice = contractDurations.includes(
        duration as (typeof contractDurations)[number],
      )
        ? duration
        : duration
          ? 'other'
          : '';
      setContractDurationChoice(durationChoice);
      setContractDurationOpen(fields.jobType === 'Contract' && !duration);
      setContractDurationError('');
      setUploadError('');
      setValidationMessage('');
      const matchedCount = Object.values(fields).filter((value) =>
        Array.isArray(value) ? value.length > 0 : Boolean(value),
      ).length;
      setExtractionNotice(
        `${matchedCount} detail${matchedCount === 1 ? '' : 's'} extracted. Review and edit the form before creating the position; unmatched details were left blank.`,
      );
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : 'This document could not be read. Try another file.',
      );
    } finally {
      setIsExtracting(false);
    }
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
    if (!values.jobType) {
      setValidationMessage('Select a job type before creating this position.');
      document.getElementById('job-type')?.focus();
      return;
    }
    if (
      values.jobType === 'Contract' &&
      !/^[1-9]\d*$/.test(values.contractDurationMonths.trim())
    ) {
      setValidationMessage(
        'Enter a whole number of months for the contract duration.',
      );
      setContractDurationOpen(true);
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
          <div className="mb-4 flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e8efe7] text-[#397462]">
              <Upload size={17} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-[#344d4d]">
                Upload Job Description
              </h2>
              <p className="mt-1 text-[11px] leading-5 text-[#84918b]">
                Upload a text-based PDF, DOCX, or TXT document to prefill matching
                fields. You can review and edit everything before creating the
                position.
              </p>
            </div>
          </div>
          <label
            htmlFor="job-description-document"
            aria-disabled={isExtracting}
            className={`flex min-h-14 cursor-pointer flex-wrap items-center gap-2 rounded-xl border border-dashed border-[#cbd6cb] bg-[#f6f7f1] px-4 py-3 text-[11px] font-semibold text-[#557068] hover:bg-[#eff3ec] ${
              isExtracting ? 'cursor-wait opacity-70' : ''
            }`}
          >
            {isExtracting ? (
              <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Upload size={15} aria-hidden="true" />
            )}
            {isExtracting ? 'Extracting document details…' : 'Choose a document'}
            <input
              id="job-description-document"
              type="file"
              accept=".pdf,.docx,.txt"
              disabled={isExtracting}
              className="sr-only"
              onChange={(event) => {
                void attachJobDescription(event.currentTarget.files?.[0]);
                event.currentTarget.value = '';
              }}
            />
            {values.jobDescriptionFileName && (
              <span className="ml-auto inline-flex max-w-full items-center gap-1.5 truncate font-normal text-[#74827b]">
                <FileText size={13} aria-hidden="true" />
                {values.jobDescriptionFileName}
              </span>
            )}
          </label>
          {uploadError && (
            <p role="alert" className="mt-2 text-[10px] text-[#a2493f]">
              {uploadError}
            </p>
          )}
          {extractionNotice && (
            <p
              role="status"
              aria-live="polite"
              className="mt-2 rounded-lg border border-[#dce5dc] bg-[#edf3ec] px-3 py-2 text-[10px] leading-4 text-[#42665a]"
            >
              {extractionNotice}
            </p>
          )}
          {values.jobDescriptionFileName &&
            values.jobDescriptionDocumentData && (
              <a
                href={values.jobDescriptionDocumentData}
                download={values.jobDescriptionFileName}
                className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#34715f] underline underline-offset-2"
              >
                <FileText size={13} aria-hidden="true" />
                Download attached document
              </a>
            )}
          <p className="mt-2 text-[10px] leading-4 text-[#8b958e]">
            Files up to 1 MB. Scanned PDFs without selectable text are not
            supported. Details not found in the document will be blank.
          </p>
        </section>

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
              <legend className={labelClass}>Position type</legend>
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

            <div>
              <label className={labelClass} htmlFor="job-type">
                Job type
              </label>
              <select
                id="job-type"
                value={values.jobType}
                onChange={(event) =>
                  updateJobType(
                    event.target.value as PositionFormValues['jobType'],
                  )
                }
                className={`${controlClass} appearance-none`}
              >
                <option value="">Select job type</option>
                <option value="Full Time">Full Time</option>
                <option value="Contract">Contract</option>
              </select>
              {values.jobType === 'Contract' && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#71817a]">
                  <span>
                    Contract duration:{' '}
                    {values.contractDurationMonths
                      ? `${values.contractDurationMonths} months`
                      : 'Choose a duration'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setContractDurationError('');
                      setContractDurationOpen(true);
                    }}
                    className="font-semibold text-[#34715f] underline underline-offset-2"
                  >
                    {values.contractDurationMonths ? 'Change' : 'Select'}
                  </button>
                </div>
              )}
            </div>

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
                  <option value="">Select department</option>
                  {values.department &&
                    !departments.includes(values.department) && (
                      <option value={values.department}>
                        {values.department}
                      </option>
                    )}
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
                  <option value="">Select priority</option>
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

            <fieldset
              disabled
              className="rounded-xl border border-[#e8e7e0] bg-[#eeede7] p-3.5"
            >
              <legend className={`${labelClass} mb-0 px-1`}>Benefits</legend>
              <p className="mb-3 text-[10px] leading-4 text-[#8b918b]">
                Available benefits for this role. All are included and
                read-only.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {benefitOptions.map((benefit) => (
                  <label
                    key={benefit}
                    className="flex min-h-10 cursor-not-allowed items-center gap-2.5 rounded-lg border border-[#e4e3dc] bg-[#f3f2ec] px-3 text-[11px] font-medium text-[#8b918b]"
                  >
                    <input
                      type="checkbox"
                      checked={values.benefits.includes(benefit)}
                      readOnly
                      className="h-4 w-4 accent-[#829187]"
                      aria-label={benefit}
                    />
                    {benefit}
                  </label>
                ))}
              </div>
            </fieldset>

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
                Job Description
              </h2>
              <p className="mt-1 text-[11px] text-[#84918b]">
                Add the role details candidates and reviewers should see.
              </p>
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="description-job">
              Job description
            </label>
            <textarea
              id="description-job"
              value={values.job}
              onChange={(event) => updateText('job', event.target.value)}
              rows={8}
              maxLength={12000}
              placeholder="Describe the role, responsibilities, and what success looks like..."
              className={`${controlClass} resize-y leading-5`}
            />
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
      {contractDurationOpen && values.jobType === 'Contract' && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#1c302f]/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setContractDurationOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="contract-duration-title"
            className="w-full max-w-[620px] rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-5 shadow-[0_24px_80px_rgba(22,47,42,.24)] sm:p-7"
          >
            <div className="text-[9px] font-bold uppercase tracking-[.15em] text-[#829187]">
              Job type · Contract
            </div>
            <h2
              id="contract-duration-title"
              className="serif mt-1 text-[23px] font-bold tracking-[-.04em] text-[#30484a]"
            >
              Select contract duration
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-[#819089]">
              Choose a preset or enter a custom number of months.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {contractDurations.map((duration) => (
                <button
                  key={duration}
                  type="button"
                  aria-pressed={contractDurationChoice === duration}
                  onClick={() => {
                    setContractDurationChoice(duration);
                    setValues((current) => ({
                      ...current,
                      contractDurationMonths: duration,
                    }));
                    setContractDurationError('');
                  }}
                  className={`rounded-full border px-4 py-2 text-[11px] font-semibold transition ${
                    contractDurationChoice === duration
                      ? 'border-[#203b56] bg-[#203b56] text-white'
                      : 'border-[#dfe1d8] bg-white text-[#62716b] hover:bg-[#f0f3ed]'
                  }`}
                >
                  {duration} months
                </button>
              ))}
              <button
                type="button"
                aria-pressed={contractDurationChoice === 'other'}
                onClick={() => {
                  setContractDurationChoice('other');
                  if (
                    contractDurations.includes(
                      values.contractDurationMonths as (typeof contractDurations)[number],
                    )
                  ) {
                    setValues((current) => ({
                      ...current,
                      contractDurationMonths: '',
                    }));
                  }
                  setContractDurationError('');
                }}
                className={`rounded-full border px-4 py-2 text-[11px] font-semibold transition ${
                  contractDurationChoice === 'other'
                    ? 'border-[#203b56] bg-[#203b56] text-white'
                    : 'border-[#dfe1d8] bg-white text-[#62716b] hover:bg-[#f0f3ed]'
                }`}
              >
                Other
              </button>
            </div>
            {contractDurationChoice === 'other' && (
              <div className="mt-5">
                <label
                  className={labelClass}
                  htmlFor="custom-contract-duration"
                >
                  Custom duration in months
                </label>
                <input
                  id="custom-contract-duration"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={
                    contractDurations.includes(
                      values.contractDurationMonths as (typeof contractDurations)[number],
                    )
                      ? ''
                      : values.contractDurationMonths
                  }
                  onChange={(event) => {
                    updateText('contractDurationMonths', event.target.value);
                    setContractDurationError('');
                  }}
                  placeholder="Enter a whole number of months"
                  className={controlClass}
                  aria-invalid={!!contractDurationError}
                  aria-describedby={
                    contractDurationError ? 'contract-duration-error' : undefined
                  }
                />
              </div>
            )}
            {contractDurationError && (
              <p
                id="contract-duration-error"
                role="alert"
                className="mt-3 text-[10px] font-medium text-[#a2493f]"
              >
                {contractDurationError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2 border-t border-[#ece9df] pt-4">
              <button
                type="button"
                onClick={() => setContractDurationOpen(false)}
                className="rounded-xl px-4 py-2.5 text-[11px] font-semibold text-[#61766d] hover:bg-[#e9eee7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyContractDuration}
                className="rounded-xl bg-[#3478dc] px-4 py-2.5 text-[11px] font-bold text-white hover:bg-[#2869c6]"
              >
                Apply duration
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
