import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  LoaderCircle,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  createRequisitionId,
  type PositionFormValues,
} from "@/components/create-position-form";
import { readJobDescriptionDocument } from "@/lib/read-job-description-document";
import {
  generatePositionJobDescription,
  getMissingRequiredPositionFields,
  type RequiredPositionField,
} from "@/lib/position-intake";

type CreatePositionFlowProps = {
  initialValues: PositionFormValues | null;
  isDuplicate: boolean;
  error?: string;
  onCancel(): void;
  onSave(values: PositionFormValues): void;
};

type IntakeField = RequiredPositionField;

type IntakeQuestion = {
  field: IntakeField;
  label: string;
  prompt: string;
  placeholder?: string;
};

type IntakeAnswer = {
  id: string;
  prompt: string;
  answer: string;
};

type ReviewField =
  | "position"
  | "hiringManager"
  | "positionType"
  | "jobType"
  | "contractDurationMonths"
  | "department"
  | "priority"
  | "salaryGrade"
  | "salaryRange"
  | "location"
  | "jobPostingDeadline"
  | "recruitmentDeadline"
  | "stakeholders"
  | "job"
  | "skill"
  | "capability"
  | "personality"
  | "additionalRole"
  | "verticalGrowth"
  | "otherDetails";

const benefitOptions = [
  "Health insurance",
  "Dental coverage",
  "Vision coverage",
  "401(k) retirement plan",
  "Paid time off",
  "Paid parental leave",
  "Life insurance",
  "Disability coverage",
  "Flexible work arrangement",
];

const departmentOptions = [
  "General",
  "Engineering",
  "Product",
  "Design",
  "Data",
  "Research",
  "Marketing",
  "Sales",
  "People",
  "Finance",
  "Operations",
  "Other",
];

const contractDurations = ["3", "6", "12", "18"] as const;
const maxJobDescriptionFileBytes = 1024 * 1024;
const controlClass =
  "w-full rounded-xl border border-[#dfe1d8] bg-[#fffefa] px-3.5 py-3 text-[12px] text-[#3f5550] outline-none placeholder:text-[#a0aaa6] focus:border-[#438274] focus:ring-4 focus:ring-[#438274]/10";

const intakeQuestions: IntakeQuestion[] = [
  {
    field: "position",
    label: "Position title",
    prompt: "What is the position title?",
    placeholder: "e.g. Senior Product Designer",
  },
  {
    field: "hiringManager",
    label: "Hiring manager",
    prompt: "Who is the hiring manager?",
    placeholder: "Name of the hiring manager",
  },
  {
    field: "positionType",
    label: "Role type",
    prompt: "Is this a new position or a replacement?",
  },
  {
    field: "jobType",
    label: "Job type",
    prompt: "Is this role full time or contract?",
  },
  {
    field: "contractDurationMonths",
    label: "Contract duration",
    prompt: "How many months will the contract last?",
    placeholder: "Number of months",
  },
  {
    field: "job",
    label: "Detailed job description",
    prompt: "Add the detailed job description and key responsibilities.",
    placeholder: "Describe the role and what success looks like...",
  },
  {
    field: "department",
    label: "Department",
    prompt: "Which department does this position belong to?",
  },
  {
    field: "salaryRange",
    label: "Salary range",
    prompt: "What salary range should appear on the posting?",
    placeholder: "e.g. $110,000–$145,000 per year",
  },
  {
    field: "location",
    label: "Location",
    prompt: "Where will this role be based?",
    placeholder: "City, region, or Remote",
  },
  {
    field: "jobPostingDeadline",
    label: "Posting deadline",
    prompt: "When should the job posting close?",
  },
  {
    field: "recruitmentDeadline",
    label: "Recruitment deadline",
    prompt: "What is the target recruitment completion date?",
  },
];

const requiredLabels = new Map<RequiredPositionField, string>([
  ["position", "Position title"],
  ["hiringManager", "Hiring manager"],
  ["positionType", "Role type"],
  ["jobType", "Job type"],
  ["job", "Detailed job description"],
  ["department", "Department"],
  ["salaryRange", "Salary range"],
  ["location", "Location"],
  ["jobPostingDeadline", "Posting deadline"],
  ["recruitmentDeadline", "Recruitment deadline"],
  ["contractDurationMonths", "Contract duration"],
]);

function createInitialValues(
  initialValues: PositionFormValues | null,
): PositionFormValues {
  return {
    requisitionId: initialValues?.requisitionId ?? createRequisitionId(),
    position: initialValues?.position ?? "",
    hiringManager: initialValues?.hiringManager ?? "",
    positionType: initialValues?.positionType ?? "",
    jobType: initialValues?.jobType ?? "",
    contractDurationMonths: initialValues?.contractDurationMonths ?? "",
    benefits: initialValues?.benefits?.length
      ? [...initialValues.benefits]
      : [...benefitOptions],
    department: initialValues?.department ?? "",
    priority: initialValues?.priority ?? "Medium",
    salaryGrade: initialValues?.salaryGrade ?? "",
    salaryRange: initialValues?.salaryRange ?? "",
    location: initialValues?.location ?? "",
    stakeholders: [...(initialValues?.stakeholders ?? [])],
    jobPostingDeadline: initialValues?.jobPostingDeadline ?? "",
    recruitmentDeadline: initialValues?.recruitmentDeadline ?? "",
    job: initialValues?.job ?? "",
    jobDescriptionFileName: initialValues?.jobDescriptionFileName ?? "",
    jobDescriptionDocumentData:
      initialValues?.jobDescriptionDocumentData ?? "",
    skill: initialValues?.skill ?? "",
    capability: initialValues?.capability ?? "",
    personality: initialValues?.personality ?? "",
    additionalRole: initialValues?.additionalRole ?? "",
    verticalGrowth: initialValues?.verticalGrowth ?? "",
    otherDetails: initialValues?.otherDetails ?? "",
  };
}

function valueIsPresent(values: PositionFormValues, field: IntakeField) {
  return Boolean(String(values[field]).trim());
}

function splitStakeholderEmails(value: string) {
  return value
    .split(/[,;\n]+/)
    .map((email) => email.trim())
    .filter(Boolean);
}

export function CreatePositionFlow({
  initialValues,
  isDuplicate,
  error,
  onCancel,
  onSave,
}: CreatePositionFlowProps) {
  const [values, setValues] = useState(() =>
    createInitialValues(initialValues),
  );
  const [step, setStep] = useState<"intake" | "review">("intake");
  const [answers, setAnswers] = useState<IntakeAnswer[]>([]);
  const [answerDraft, setAnswerDraft] = useState("");
  const [answerError, setAnswerError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [extractionNotice, setExtractionNotice] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [sourceDescription, setSourceDescription] = useState(
    initialValues?.job ?? "",
  );
  const [reviewSnapshot, setReviewSnapshot] =
    useState<PositionFormValues | null>(null);
  const [isEditingJobRequirement, setIsEditingJobRequirement] = useState(false);
  const [reviewNeedsGenerate, setReviewNeedsGenerate] = useState(false);
  const [generatedNotice, setGeneratedNotice] = useState("");
  const [stakeholderReviewDraft, setStakeholderReviewDraft] = useState(
    initialValues?.stakeholders?.join(", ") ?? "",
  );
  const [contractDurationOpen, setContractDurationOpen] = useState(
    () =>
      initialValues?.jobType === "Contract" &&
      !initialValues.contractDurationMonths,
  );
  const [contractDurationChoice, setContractDurationChoice] = useState(() => {
    const duration = initialValues?.contractDurationMonths ?? "";
    return contractDurations.includes(
      duration as (typeof contractDurations)[number],
    )
      ? duration
      : duration
        ? "other"
        : "";
  });
  const [contractDurationDraft, setContractDurationDraft] = useState(
    initialValues?.contractDurationMonths ?? "",
  );
  const [contractDurationError, setContractDurationError] = useState("");

  const missingRequiredFields = useMemo(
    () => getMissingRequiredPositionFields(values),
    [values],
  );
  const canContinue = missingRequiredFields.length === 0 && !isExtracting;
  const hasValidContractDuration =
    values.jobType !== "Contract" || /^[1-9]\d*$/.test(values.contractDurationMonths);
  const currentQuestion = intakeQuestions
    .filter(
      (question) =>
        question.field !== "contractDurationMonths" ||
        values.jobType === "Contract",
    )
    .find((question) => !valueIsPresent(values, question.field));
  const reviewPositionFields: Array<{
    field: ReviewField;
    label: string;
    placeholder: string;
  }> = [
    { field: "position", label: "Position title", placeholder: "Position title" },
    {
      field: "hiringManager",
      label: "Hiring manager",
      placeholder: "Hiring manager",
    },
    { field: "positionType", label: "Role type", placeholder: "" },
    { field: "jobType", label: "Job type", placeholder: "" },
    { field: "department", label: "Department", placeholder: "" },
    { field: "priority", label: "Priority", placeholder: "" },
    {
      field: "contractDurationMonths",
      label: "Contract duration (months)",
      placeholder: "Months",
    },
    {
      field: "salaryGrade",
      label: "Salary grade",
      placeholder: "Optional salary grade or band",
    },
    {
      field: "salaryRange",
      label: "Salary range",
      placeholder: "e.g. $110,000–$145,000 per year",
    },
    { field: "location", label: "Location", placeholder: "City or Remote" },
    {
      field: "jobPostingDeadline",
      label: "Posting deadline",
      placeholder: "",
    },
    {
      field: "recruitmentDeadline",
      label: "Recruitment deadline",
      placeholder: "",
    },
  ];
  const reviewAdditionalFields: Array<{
    field: ReviewField;
    label: string;
    placeholder: string;
  }> = [
    {
      field: "stakeholders",
      label: "Stakeholders",
      placeholder: "Emails, separated by commas",
    },
    { field: "skill", label: "Skills", placeholder: "Add relevant skills" },
    {
      field: "capability",
      label: "Capabilities",
      placeholder: "Add role capabilities",
    },
    {
      field: "personality",
      label: "Personality",
      placeholder: "Add relevant traits or working style",
    },
    {
      field: "additionalRole",
      label: "Additional role responsibilities",
      placeholder: "Optional additional responsibilities",
    },
    {
      field: "verticalGrowth",
      label: "Vertical growth",
      placeholder: "Optional growth path",
    },
    {
      field: "otherDetails",
      label: "Other details",
      placeholder: "Optional context",
    },
  ];
  const reviewValues = reviewSnapshot ?? values;

  const attachJobDescription = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) {
      setUploadError("Choose a searchable PDF, DOCX, or plain text document.");
      return;
    }
    if (file.size > maxJobDescriptionFileBytes) {
      setUploadError("The document must be 1 MB or smaller.");
      return;
    }

    setIsExtracting(true);
    setUploadError("");
    setExtractionNotice("");
    try {
      const [document, dataUrl] = await Promise.all([
        readJobDescriptionDocument(file),
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            typeof reader.result === "string"
              ? resolve(reader.result)
              : reject(new Error("The document could not be saved."));
          reader.onerror = () =>
            reject(new Error("The document could not be saved."));
          reader.readAsDataURL(file);
        }),
      ]);
      const { fields } = document;
      setValues((current) => ({
        ...current,
        position: fields.position ?? "",
        hiringManager: fields.hiringManager ?? "",
        positionType: fields.positionType ?? "",
        jobType: fields.jobType ?? "",
        contractDurationMonths: fields.contractDurationMonths ?? "",
        department: fields.department ?? "",
        salaryGrade: fields.salaryGrade ?? "",
        salaryRange: fields.salaryRange ?? "",
        priority: fields.priority ?? "Medium",
        location: fields.location ?? "",
        stakeholders: fields.stakeholders ?? [],
        jobPostingDeadline: fields.jobPostingDeadline ?? "",
        recruitmentDeadline: fields.recruitmentDeadline ?? "",
        job: fields.job ?? "",
        skill: fields.skill ?? "",
        capability: fields.capability ?? "",
        personality: fields.personality ?? "",
        jobDescriptionFileName: file.name,
        jobDescriptionDocumentData: dataUrl.replace(
          /^[^,]*,/,
          "data:application/octet-stream;base64,",
        ),
        additionalRole: "",
        verticalGrowth: "",
        otherDetails: "",
      }));
      if (reviewSnapshot) setReviewNeedsGenerate(true);
      setSourceDescription(fields.job ?? "");
      setAnswers([]);
      setAnswerDraft("");
      const duration = fields.contractDurationMonths ?? "";
      setContractDurationDraft(duration);
      setContractDurationChoice(
        contractDurations.includes(
          duration as (typeof contractDurations)[number],
        )
          ? duration
          : duration
            ? "other"
            : "",
      );
      setContractDurationOpen(fields.jobType === "Contract" && !duration);
      const matchedCount = Object.values(fields).filter((value) =>
        Array.isArray(value) ? value.length > 0 : Boolean(value),
      ).length;
      setExtractionNotice(
        `${matchedCount} details extracted. I’ll ask only for information that is still missing.`,
      );
    } catch (readError) {
      setUploadError(
        readError instanceof Error
          ? readError.message
          : "This document could not be read. Try another file.",
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const setStringValue = (
    field: Exclude<IntakeField, "positionType" | "jobType">,
    value: string,
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (field === "job") setSourceDescription(value);
    if (reviewSnapshot) setReviewNeedsGenerate(true);
    setAnswerError("");
  };

  const submitAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentQuestion) return;
    const answer = answerDraft.trim();
    if (!answer) {
      setAnswerError("Enter a response to continue.");
      return;
    }
    if (reviewSnapshot) setReviewNeedsGenerate(true);

    if (currentQuestion.field === "positionType") {
      if (answer !== "New" && answer !== "Replacement") {
        setAnswerError("Choose New or Replacement.");
        return;
      }
      setValues((current) => ({
        ...current,
        positionType: answer,
      }));
    } else if (currentQuestion.field === "contractDurationMonths") {
      if (!/^[1-9]\d*$/.test(answer)) {
        setAnswerError("Enter a whole number of months greater than zero.");
        return;
      }
      setValues((current) => ({
        ...current,
        contractDurationMonths: answer,
      }));
      setContractDurationDraft(answer);
      setContractDurationChoice(
        contractDurations.includes(
          answer as (typeof contractDurations)[number],
        )
          ? answer
          : "other",
      );
    } else if (currentQuestion.field === "jobType") {
      if (answer !== "Full Time" && answer !== "Contract") {
        setAnswerError("Choose Full Time or Contract.");
        return;
      }
      setValues((current) => ({
        ...current,
        jobType: answer,
        contractDurationMonths:
          answer === "Contract" ? current.contractDurationMonths : "",
      }));
      if (answer === "Contract") {
        setContractDurationDraft(values.contractDurationMonths);
        setContractDurationChoice(
          values.contractDurationMonths
            ? contractDurations.includes(
                values.contractDurationMonths as
                  (typeof contractDurations)[number],
              )
              ? values.contractDurationMonths
              : "other"
            : "",
        );
        setContractDurationOpen(true);
      } else {
        setContractDurationOpen(false);
      }
    } else {
      setStringValue(currentQuestion.field, answer);
    }

    setAnswers((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length}`,
        prompt: currentQuestion.prompt,
        answer,
      },
    ]);
    setAnswerDraft("");
    setAnswerError("");
  };

  const submitPosition = () => {
    if (!canContinue) {
      setStep("intake");
      return;
    }
    if (!hasValidContractDuration) {
      setAnswerError("Contract duration must be a whole number of months greater than zero.");
      return;
    }
    if (reviewNeedsGenerate) {
      setAnswerError("Click Generate to apply your edits to the job posting before creating it.");
      return;
    }
    onSave({
      ...values,
      position: values.position.trim(),
      hiringManager: values.hiringManager.trim(),
      positionType:
        values.positionType === "Replacement" ? "Replacement" : "New",
      department: values.department.trim(),
      salaryRange: values.salaryRange.trim(),
      location: values.location.trim(),
      priority: values.priority || "Medium",
    });
  };

  const setReviewValue = (field: ReviewField, value: string) => {
    setReviewNeedsGenerate(true);
    setAnswerError("");
    if (field === "stakeholders") {
      setStakeholderReviewDraft(value);
      const emails = splitStakeholderEmails(value).filter((email) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      );
      setValues((current) => ({ ...current, stakeholders: emails }));
      return;
    }
    if (field === "job") {
      setSourceDescription(value);
      return;
    }
    if (field === "positionType") {
      setValues((current) => ({
        ...current,
        positionType: value as PositionFormValues["positionType"],
      }));
      return;
    }
    if (field === "jobType") {
      const jobType = value as PositionFormValues["jobType"];
      setValues((current) => ({
        ...current,
        jobType,
        contractDurationMonths:
          jobType === "Contract" ? current.contractDurationMonths : "",
      }));
      return;
    }
    setValues((current) => ({ ...current, [field]: value }));
  };

  const toggleBenefit = (benefit: string) => {
    setValues((current) => ({
      ...current,
      benefits: current.benefits.includes(benefit)
        ? current.benefits.filter((item) => item !== benefit)
        : [...current.benefits, benefit],
    }));
    setReviewNeedsGenerate(true);
    setAnswerError("");
  };

  const handleGenerate = () => {
    if (!canContinue) {
      setAnswerError("Complete the required position details before generating the posting.");
      return;
    }
    if (!hasValidContractDuration) {
      setAnswerError("Contract duration must be a whole number of months greater than zero.");
      return;
    }
    const generated = generatePositionJobDescription(values, sourceDescription);
    const refreshedPosting = { ...values, job: generated };
    setValues(refreshedPosting);
    setReviewSnapshot(refreshedPosting);
    setIsEditingJobRequirement(false);
    setReviewNeedsGenerate(false);
    setGeneratedNotice(
      "Job description refreshed using the position details and any added skills, capabilities, or personality notes.",
    );
  };

  const handleContractDuration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const duration = contractDurationDraft.trim();
    if (!/^[1-9]\d*$/.test(duration)) {
      setContractDurationError(
        "Enter a whole number greater than zero. The value is in months.",
      );
      return;
    }
    setValues((current) => ({
      ...current,
      contractDurationMonths: duration,
    }));
    if (reviewSnapshot) setReviewNeedsGenerate(true);
    setContractDurationOpen(false);
    setContractDurationError("");
  };

  const renderAnswerControl = () => {
    if (!currentQuestion) return null;
    const { field, placeholder } = currentQuestion;
    if (field === "positionType") {
      return (
        <select
          value={answerDraft}
          onChange={(event) => setAnswerDraft(event.target.value)}
          className={controlClass}
        >
          <option value="">Choose role type</option>
          <option value="New">New</option>
          <option value="Replacement">Replacement</option>
        </select>
      );
    }
    if (field === "jobType") {
      return (
        <select
          value={answerDraft}
          onChange={(event) => setAnswerDraft(event.target.value)}
          className={controlClass}
        >
          <option value="">Choose job type</option>
          <option value="Full Time">Full Time</option>
          <option value="Contract">Contract</option>
        </select>
      );
    }
    if (field === "department") {
      return (
        <select
          value={answerDraft}
          onChange={(event) => setAnswerDraft(event.target.value)}
          className={controlClass}
        >
          <option value="">Choose department</option>
          {answerDraft &&
            !departmentOptions.includes(answerDraft) && (
              <option value={answerDraft}>{answerDraft}</option>
            )}
          {departmentOptions.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
      );
    }
    if (field === "job") {
      return (
        <textarea
          value={answerDraft}
          onChange={(event) => setAnswerDraft(event.target.value)}
          rows={5}
          placeholder={placeholder}
          className={`${controlClass} resize-y leading-5`}
        />
      );
    }
    if (field === "jobPostingDeadline" || field === "recruitmentDeadline") {
      return (
        <input
          type="date"
          value={answerDraft}
          onChange={(event) => setAnswerDraft(event.target.value)}
          className={controlClass}
        />
      );
    }
    if (field === "contractDurationMonths") {
      return (
        <input
          type="number"
          min="1"
          step="1"
          value={answerDraft}
          onChange={(event) => setAnswerDraft(event.target.value)}
          placeholder={placeholder}
          className={controlClass}
        />
      );
    }
    return (
      <input
        type="text"
        value={answerDraft}
        onChange={(event) => setAnswerDraft(event.target.value)}
        placeholder={placeholder}
        maxLength={field === "position" ? 120 : undefined}
        className={controlClass}
      />
    );
  };

  const renderReviewInput = (field: ReviewField, placeholder: string) => {
    if (field === "positionType") {
      return (
        <select
          value={values.positionType}
          onChange={(event) => setReviewValue(field, event.target.value)}
          className={`${controlClass} text-[10px]`}
        >
          <option value="">Choose role type</option>
          <option value="New">New</option>
          <option value="Replacement">Replacement</option>
        </select>
      );
    }
    if (field === "jobType") {
      return (
        <select
          value={values.jobType}
          onChange={(event) => setReviewValue(field, event.target.value)}
          className={`${controlClass} text-[10px]`}
        >
          <option value="">Choose job type</option>
          <option value="Full Time">Full Time</option>
          <option value="Contract">Contract</option>
        </select>
      );
    }
    if (field === "department") {
      return (
        <select
          value={values.department}
          onChange={(event) => setReviewValue(field, event.target.value)}
          className={`${controlClass} text-[10px]`}
        >
          <option value="">Choose department</option>
          {values.department &&
            !departmentOptions.includes(values.department) && (
              <option value={values.department}>{values.department}</option>
            )}
          {departmentOptions.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
      );
    }
    if (field === "priority") {
      return (
        <select
          value={values.priority}
          onChange={(event) => setReviewValue(field, event.target.value)}
          className={`${controlClass} text-[10px]`}
        >
          {["Low", "Medium", "High", "Urgent"].map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
      );
    }
    if (field === "contractDurationMonths") {
      return (
        <input
          type="number"
          min="1"
          step="1"
          value={values.contractDurationMonths}
          onChange={(event) => setReviewValue(field, event.target.value)}
          placeholder={placeholder}
          className={`${controlClass} text-[10px]`}
        />
      );
    }
    if (field === "stakeholders") {
      return (
        <textarea
          value={stakeholderReviewDraft}
          onChange={(event) => setReviewValue(field, event.target.value)}
          rows={2}
          placeholder={placeholder}
          className={`${controlClass} resize-y text-[10px]`}
        />
      );
    }
    if (field === "job") {
      return (
        <textarea
          value={sourceDescription}
          onChange={(event) => setReviewValue(field, event.target.value)}
          rows={6}
          placeholder="Enter the job responsibilities and requirements"
          className={`${controlClass} resize-y text-[10px]`}
        />
      );
    }
    const isMultiline = [
      "skill",
      "capability",
      "personality",
      "additionalRole",
      "verticalGrowth",
      "otherDetails",
    ].includes(field);
    if (isMultiline) {
      return (
        <textarea
          value={values[field] as string}
          onChange={(event) => setReviewValue(field, event.target.value)}
          rows={2}
          placeholder={placeholder}
          className={`${controlClass} resize-y text-[10px]`}
        />
      );
    }
    if (field === "jobPostingDeadline" || field === "recruitmentDeadline") {
      return (
        <input
          type="date"
          value={values[field]}
          onChange={(event) => setReviewValue(field, event.target.value)}
          className={`${controlClass} text-[10px]`}
        />
      );
    }
    return (
      <input
        value={values[field] as string}
        onChange={(event) => setReviewValue(field, event.target.value)}
        placeholder={placeholder}
        maxLength={field === "position" ? 120 : undefined}
        className={`${controlClass} text-[10px]`}
      />
    );
  };

  const renderReviewField = (item: {
    field: ReviewField;
    label: string;
    placeholder: string;
  }) => {
    if (
      item.field === "contractDurationMonths" &&
      values.jobType !== "Contract"
    ) {
      return null;
    }
    return (
      <div key={item.field}>
        <label className="block text-[10px] font-semibold text-[#50635d]">
          {item.label}
          <div className="mt-1.5">
            {renderReviewInput(item.field, item.placeholder)}
          </div>
        </label>
      </div>
    );
  };

  return (
    <div className="page-enter mx-auto w-full max-w-[1180px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onCancel}
        className="mb-4 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-[11px] font-semibold text-[#557068] hover:bg-[#e9eee7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#438274]"
      >
        <ArrowLeft size={15} /> Back to jobs
      </button>

      <header className="mb-6">
        <div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#68857a]">
          AiccuHire / {isDuplicate ? "Duplicate requisition" : "Hiring workspace"}
        </div>
        <h1 className="serif mt-1 text-[clamp(28px,4vw,38px)] font-bold leading-tight tracking-[-.05em] text-[#2d4446]">
          Create Position
        </h1>
        <p className="mt-1.5 max-w-2xl text-[12px] leading-5 text-[#71817a]">
          {step === "intake"
            ? "Share a job document or answer the required questions to prepare the posting."
            : "Review and edit all position details. Generate applies your changes to the posting preview."}
        </p>
        <div className="mt-4 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.1em] text-[#77877e]">
          <span
            className={`rounded-full px-3 py-1.5 ${step === "intake" ? "bg-[#e8efe7] text-[#397462]" : "bg-[#f0f0e9]"}`}
          >
            1 · Job details
          </span>
          <ArrowRight size={13} />
          <span
            className={`rounded-full px-3 py-1.5 ${step === "review" ? "bg-[#e8efe7] text-[#397462]" : "bg-[#f0f0e9]"}`}
          >
            2 · Review posting
          </span>
        </div>
      </header>

      {(error || answerError || uploadError) && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-[#e8c9be] bg-[#fbefea] px-4 py-3 text-[11px] leading-5 text-[#954c3f]"
        >
          {error || answerError || uploadError}
        </div>
      )}

      {step === "intake" ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-5 shadow-[0_8px_22px_rgba(31,59,54,.045)] sm:p-6">
            <div className="mb-4 flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e8efe7] text-[#397462]">
                <Upload size={17} />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-[#344d4d]">
                  Upload Job Requirement
                </h2>
                <p className="mt-1 text-[11px] leading-5 text-[#84918b]">
                  Optional. I’ll fill in details I can find and ask only for
                  what’s missing.
                </p>
              </div>
            </div>
            <label
              htmlFor="job-description-document"
              className={`flex min-h-12 cursor-pointer flex-wrap items-center gap-2 rounded-xl border border-dashed border-[#cbd6cb] bg-[#f6f7f1] px-4 py-3 text-[11px] font-semibold text-[#557068] hover:bg-[#eff3ec] focus-within:border-[#438274] focus-within:ring-4 focus-within:ring-[#438274]/20 ${isExtracting ? "cursor-wait opacity-70" : ""}`}
            >
              {isExtracting ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Upload size={15} />
              )}
              {isExtracting ? "Reading document…" : "Choose a document"}
              <input
                id="job-description-document"
                type="file"
                accept=".pdf,.docx,.txt"
                disabled={isExtracting}
                className="sr-only"
                autoFocus
                onChange={(event) => {
                  void attachJobDescription(event.currentTarget.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              {values.jobDescriptionFileName && (
                <span className="ml-auto inline-flex max-w-full items-center gap-1.5 truncate font-normal text-[#74827b]">
                  <FileText size={13} />
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
                  <FileText size={13} />
                  Download attached document
                </a>
              )}
            <p className="mt-2 text-[10px] leading-4 text-[#8b958e]">
              PDF, DOCX, or TXT · up to 1 MB. Scanned PDFs are not supported.
            </p>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] shadow-[0_8px_22px_rgba(31,59,54,.045)]">
            <header className="flex items-center gap-3 border-b border-[#e8e5dd] px-5 py-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f4eadb] text-[#a9753f]">
                <Sparkles size={17} />
              </span>
              <div>
                <h2 className="text-[14px] font-bold text-[#344d4d]">
                  Position details
                </h2>
                <p className="mt-0.5 text-[10px] text-[#829087]">
                  Answer only the required details that are missing.
                </p>
              </div>
            </header>
            <div
              role="log"
              aria-live="polite"
              aria-label="Position intake conversation"
              className="max-h-[420px] min-h-[220px] space-y-3 overflow-y-auto bg-[#f7f6f0] px-4 py-4 sm:px-5"
            >
              <div className="flex justify-start">
                <p className="max-w-[90%] rounded-2xl rounded-bl-md border border-[#e5e5dc] bg-white px-3.5 py-2.5 text-[11px] leading-5 text-[#52655f]">
                  {values.jobDescriptionFileName
                    ? `I’ve reviewed ${values.jobDescriptionFileName}. I’ll ask only for details that are still missing.`
                    : "Let’s prepare the job posting. I’ll ask only for required details."}
                </p>
              </div>
              {answers.map((entry) => (
                <div key={entry.id} className="space-y-2.5">
                  <div className="flex justify-start">
                    <p className="max-w-[90%] rounded-2xl rounded-bl-md border border-[#e5e5dc] bg-white px-3.5 py-2.5 text-[11px] leading-5 text-[#52655f]">
                      {entry.prompt}
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <p className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-[#205e53] px-3.5 py-2.5 text-[11px] leading-5 text-white">
                      {entry.answer}
                    </p>
                  </div>
                </div>
              ))}
              {currentQuestion ? (
                <div className="flex justify-start">
                  <p className="max-w-[90%] rounded-2xl rounded-bl-md border border-[#e5e5dc] bg-white px-3.5 py-2.5 text-[11px] leading-5 text-[#52655f]">
                    {currentQuestion.prompt}
                  </p>
                </div>
              ) : (
                <div className="flex justify-start">
                  <p className="rounded-2xl rounded-bl-md border border-[#dce5dc] bg-[#edf3ec] px-3.5 py-2.5 text-[11px] leading-5 text-[#42665a]">
                    {canContinue
                      ? "All required details are ready. You can continue to the posting preview."
                      : "Please complete the required position details to continue."}
                  </p>
                </div>
              )}
            </div>
            {currentQuestion && (
              <form
                onSubmit={submitAnswer}
                className="space-y-2 border-t border-[#e8e7df] bg-[#fcfbf7] p-4 sm:p-5"
              >
                <label className="block text-[10px] font-semibold text-[#50635d]">
                  {currentQuestion.label}
                  <span className="ml-1 text-[#b36b4f]">*</span>
                  <div className="mt-2">{renderAnswerControl()}</div>
                </label>
                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={!answerDraft.trim() || isExtracting}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#205e53] px-4 py-2.5 text-[10px] font-bold text-white hover:bg-[#184d44] disabled:cursor-not-allowed disabled:bg-[#a7b6ad]"
                  >
                    Add answer <ArrowRight size={13} />
                  </button>
                </div>
              </form>
            )}
          </section>

          <div className="flex flex-col-reverse gap-2 border-t border-[#e4e2d9] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] leading-4 text-[#84918b]">
              {canContinue
                ? "Required details are complete. Continue to review optional fields."
                : `${missingRequiredFields.length} required detail${missingRequiredFields.length === 1 ? "" : "s"} remaining: ${missingRequiredFields.map(({ field }) => requiredLabels.get(field)).join(", ")}`}
            </p>
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => {
                if (!reviewSnapshot || !reviewNeedsGenerate) {
                  setReviewSnapshot({ ...values });
                  setReviewNeedsGenerate(false);
                }
                setIsEditingJobRequirement(false);
                setStep("review");
                setGeneratedNotice("");
              }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#3478dc] px-5 py-3 text-[11px] font-bold text-white shadow-[0_5px_12px_rgba(32,94,83,.12)] hover:bg-[#2869c6] disabled:cursor-not-allowed disabled:bg-[#a7b6ad]"
            >
              Next <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,1fr)]">
            <section className="overflow-hidden rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] shadow-[0_8px_22px_rgba(31,59,54,.045)]">
              <header className="border-b border-[#e8e5dd] px-5 py-4">
                <div className="flex items-center gap-2 text-[12px] font-bold text-[#344d4d]">
                  <BriefcaseBusiness size={15} className="text-[#688b79]" />
                  Job posting preview
                </div>
                <p className="mt-1 text-[10px] text-[#829087]">
                  This position will be created as a Draft.
                </p>
              </header>
              <article className="space-y-5 p-5 sm:p-6">
                <div>
                  <div className="font-mono text-[9px] font-semibold uppercase tracking-[.1em] text-[#829087]">
                    {reviewValues.requisitionId} · Draft
                  </div>
                  <h2 className="serif mt-2 text-[25px] font-bold leading-tight text-[#2d4446]">
                    {reviewValues.position}
                  </h2>
                  <p className="mt-2 text-[11px] text-[#71817a]">
                    {reviewValues.department} · {reviewValues.location} · {reviewValues.jobType}
                    {reviewValues.jobType === "Contract" &&
                      reviewValues.contractDurationMonths &&
                      ` · ${reviewValues.contractDurationMonths} months`}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-[#397462]">
                    Salary range: {reviewValues.salaryRange}
                  </p>
                  {reviewValues.salaryGrade && (
                    <p className="mt-1 text-[10px] text-[#71817a]">
                      Salary grade: {reviewValues.salaryGrade}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-[#71817a]">
                    Priority: {reviewValues.priority || "Medium"}
                  </p>
                </div>
                <div className="grid gap-3 rounded-xl bg-[#f5f5ee] p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[.08em] text-[#829087]">
                      Hiring manager
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-[#425953]">
                      {reviewValues.hiringManager}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[.08em] text-[#829087]">
                      Role type
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-[#425953]">
                      {reviewValues.positionType}
                    </p>
                  </div>
                  {reviewValues.jobPostingDeadline && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[.08em] text-[#829087]">
                        Posting deadline
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-[#425953]">
                        {reviewValues.jobPostingDeadline}
                      </p>
                    </div>
                  )}
                  {reviewValues.recruitmentDeadline && (
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[.08em] text-[#829087]">
                        Recruitment deadline
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-[#425953]">
                        {reviewValues.recruitmentDeadline}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[11px] font-bold text-[#435c56]">
                      Job requirement
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setIsEditingJobRequirement((editing) => !editing)
                      }
                      className="rounded-lg px-2 py-1 text-[10px] font-semibold text-[#34715f] hover:bg-[#edf3ec]"
                    >
                      {isEditingJobRequirement ? "Close edit" : "Edit"}
                    </button>
                  </div>
                  {isEditingJobRequirement ? (
                    <>
                      <p className="mt-2 text-[10px] leading-4 text-[#829087]">
                        Finish editing, then click Generate to apply the changes
                        to this posting.
                      </p>
                      <textarea
                        value={sourceDescription}
                        onChange={(event) =>
                          setReviewValue("job", event.target.value)
                        }
                        rows={10}
                        aria-label="Edit job requirement"
                        className={`${controlClass} mt-2 resize-y leading-5`}
                      />
                    </>
                  ) : (
                    <p className="mt-2 whitespace-pre-wrap text-[11px] leading-5 text-[#60736c]">
                      {reviewValues.job}
                    </p>
                  )}
                </div>
                {reviewValues.skill.trim() && (
                  <div>
                    <h3 className="text-[11px] font-bold text-[#435c56]">
                      Skills
                    </h3>
                    <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-[#60736c]">
                      {reviewValues.skill}
                    </p>
                  </div>
                )}
                {reviewValues.capability.trim() && (
                  <div>
                    <h3 className="text-[11px] font-bold text-[#435c56]">
                      Capabilities
                    </h3>
                    <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-[#60736c]">
                      {reviewValues.capability}
                    </p>
                  </div>
                )}
                {reviewValues.personality.trim() && (
                  <div>
                    <h3 className="text-[11px] font-bold text-[#435c56]">
                      Personality
                    </h3>
                    <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-[#60736c]">
                      {reviewValues.personality}
                    </p>
                  </div>
                )}
                {reviewValues.stakeholders.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-bold text-[#435c56]">
                      Stakeholders
                    </h3>
                    <p className="mt-1 break-words text-[11px] leading-5 text-[#60736c]">
                      {reviewValues.stakeholders.join(", ")}
                    </p>
                  </div>
                )}
                {reviewValues.benefits.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-bold text-[#435c56]">
                      Benefits
                    </h3>
                    <p className="mt-1 text-[10px] leading-5 text-[#60736c]">
                      {reviewValues.benefits.join(" · ")}
                    </p>
                  </div>
                )}
              </article>
              {reviewValues.jobDescriptionFileName &&
                reviewValues.jobDescriptionDocumentData && (
                  <a
                    href={reviewValues.jobDescriptionDocumentData}
                    download={reviewValues.jobDescriptionFileName}
                    className="mx-5 mb-5 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#34715f] underline underline-offset-2 sm:mx-6"
                  >
                    <FileText size={13} />
                    Download source job document
                  </a>
                )}
            </section>

            <section className="rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-5 shadow-[0_8px_22px_rgba(31,59,54,.045)] sm:p-6">
              <div className="mb-4 flex items-start gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f4eadb] text-[#a9753f]">
                  <CalendarDays size={15} />
                </div>
                <div>
                  <h2 className="text-[13px] font-bold text-[#344d4d]">
                    Edit position details
                  </h2>
                  <p className="mt-1 text-[10px] leading-4 text-[#84918b]">
                    Update any field here. Click Generate to apply changes to the posting preview.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {reviewPositionFields.map(renderReviewField)}
              </div>
              <div className="mt-5 space-y-3 border-t border-[#ecebe3] pt-4">
                <h3 className="text-[10px] font-bold text-[#50635d]">
                  Additional requirements
                </h3>
                {reviewAdditionalFields.map(renderReviewField)}
              </div>
              <fieldset className="mt-5 border-t border-[#ecebe3] pt-4">
                <legend className="mb-2 text-[10px] font-bold text-[#50635d]">
                  Benefits
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {benefitOptions.map((benefit) => (
                    <label
                      key={benefit}
                      className="flex min-h-9 items-center gap-2 rounded-lg border border-[#e4e3dc] bg-[#f8f8f2] px-3 text-[10px] text-[#52655f]"
                    >
                      <input
                        type="checkbox"
                        checked={values.benefits.includes(benefit)}
                        onChange={() => toggleBenefit(benefit)}
                        className="h-4 w-4 accent-[#397462]"
                      />
                      {benefit}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="mt-5 border-t border-[#ecebe3] pt-4">
                <label
                  htmlFor="review-job-description-document"
                  className="mb-2 block text-[10px] font-semibold text-[#50635d]"
                >
                  Source job document
                </label>
                <label
                  htmlFor="review-job-description-document"
                  className={`flex min-h-10 cursor-pointer flex-wrap items-center gap-2 rounded-xl border border-dashed border-[#cbd6cb] bg-[#f6f7f1] px-3 py-2 text-[10px] font-semibold text-[#557068] hover:bg-[#eff3ec] ${isExtracting ? "cursor-wait opacity-70" : ""}`}
                >
                  <Upload size={14} />
                  {isExtracting ? "Reading document…" : "Replace source document"}
                  <input
                    id="review-job-description-document"
                    type="file"
                    accept=".pdf,.docx,.txt"
                    disabled={isExtracting}
                    className="sr-only"
                    onChange={(event) => {
                      void attachJobDescription(event.currentTarget.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                  {values.jobDescriptionFileName && (
                    <span className="ml-auto max-w-full truncate font-normal text-[#74827b]">
                      {values.jobDescriptionFileName}
                    </span>
                  )}
                </label>
                <p className="mt-1.5 text-[9px] leading-4 text-[#84918b]">
                  Replacing this file re-extracts its details. Click Generate to refresh the preview.
                </p>
              </div>
            </section>
          </div>

          {generatedNotice && (
            <p
              role="status"
              className="rounded-xl border border-[#dce5dc] bg-[#edf3ec] px-4 py-3 text-[10px] leading-4 text-[#42665a]"
            >
              {generatedNotice}
            </p>
          )}
          {reviewNeedsGenerate && (
            <p
              role="status"
              className="rounded-xl border border-[#ead9b9] bg-[#fbf5e8] px-4 py-3 text-[10px] leading-4 text-[#7a6030]"
            >
              Your edits are not in the posting preview yet. Click Generate to apply them.
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 border-t border-[#e4e2d9] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setStep("intake")}
              className="rounded-xl px-4 py-3 text-[10px] font-semibold text-[#61766d] hover:bg-[#e9eee7]"
            >
              <ArrowLeft size={13} className="mr-1 inline" />
              Back to details
            </button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canContinue || !hasValidContractDuration}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d8e2d7] bg-[#f4f6f0] px-4 py-3 text-[10px] font-bold text-[#42665a] hover:bg-[#eaf0e8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles size={13} /> Generate
              </button>
              <button
                type="button"
                onClick={submitPosition}
                disabled={!canContinue || !hasValidContractDuration || reviewNeedsGenerate}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3478dc] px-5 py-3 text-[10px] font-bold text-white shadow-[0_5px_12px_rgba(32,94,83,.12)] hover:bg-[#2869c6] disabled:cursor-not-allowed disabled:bg-[#a7b6ad]"
              >
                Create <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {contractDurationOpen && values.jobType === "Contract" && (
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
            className="w-full max-w-[560px] rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-5 shadow-[0_24px_80px_rgba(22,47,42,.24)] sm:p-7"
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
                    setContractDurationDraft(duration);
                    setContractDurationError("");
                  }}
                  className={`rounded-full border px-4 py-2 text-[11px] font-semibold transition ${
                    contractDurationChoice === duration
                      ? "border-[#203b56] bg-[#203b56] text-white"
                      : "border-[#dce2da] bg-white text-[#5e716b] hover:border-[#9ab7a7]"
                  }`}
                >
                  {duration} months
                </button>
              ))}
              <button
                type="button"
                aria-pressed={contractDurationChoice === "other"}
                onClick={() => {
                  setContractDurationChoice("other");
                  setContractDurationDraft("");
                  setContractDurationError("");
                }}
                className={`rounded-full border px-4 py-2 text-[11px] font-semibold transition ${
                  contractDurationChoice === "other"
                    ? "border-[#203b56] bg-[#203b56] text-white"
                    : "border-[#dce2da] bg-white text-[#5e716b] hover:border-[#9ab7a7]"
                }`}
              >
                Other
              </button>
            </div>
            {contractDurationChoice === "other" && (
              <div className="mt-4 max-w-[220px]">
                <label
                  htmlFor="contract-duration-months"
                  className="mb-1.5 block text-[10px] font-semibold text-[#50635d]"
                >
                  Duration in months
                </label>
                <input
                  id="contract-duration-months"
                  type="number"
                  min="1"
                  step="1"
                  value={contractDurationDraft}
                  onChange={(event) =>
                    setContractDurationDraft(event.target.value)
                  }
                  className={controlClass}
                />
              </div>
            )}
            {contractDurationError && (
              <p role="alert" className="mt-3 text-[10px] text-[#a2493f]">
                {contractDurationError}
              </p>
            )}
            <form
              onSubmit={handleContractDuration}
              className="mt-6 flex justify-end gap-2"
            >
              <button
                type="button"
                onClick={() => setContractDurationOpen(false)}
                className="rounded-xl px-4 py-2.5 text-[10px] font-semibold text-[#61766d] hover:bg-[#e9eee7]"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={!contractDurationChoice}
                className="rounded-xl bg-[#3478dc] px-4 py-2.5 text-[10px] font-bold text-white hover:bg-[#2869c6] disabled:cursor-not-allowed disabled:bg-[#a7b6ad]"
              >
                Apply duration
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
