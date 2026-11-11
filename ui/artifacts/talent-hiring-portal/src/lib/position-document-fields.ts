export type ExtractedPositionFields = {
  position?: string;
  hiringManager?: string;
  positionType?: "New" | "Replacement";
  jobType?: "Full Time" | "Contract";
  contractDurationMonths?: string;
  department?: string;
  priority?: string;
  salaryGrade?: string;
  salaryRange?: string;
  location?: string;
  stakeholders?: string[];
  jobPostingDeadline?: string;
  recruitmentDeadline?: string;
  job?: string;
  skill?: string;
  capability?: string;
  personality?: string;
};

type ExtractableField = keyof Omit<ExtractedPositionFields, "stakeholders">;

const fieldAliases: Array<{ field: ExtractableField | "stakeholders"; labels: string[] }> = [
  { field: "position", labels: ["job title", "position title", "role title", "position", "title"] },
  { field: "hiringManager", labels: ["hiring manager", "hiring lead", "manager"] },
  { field: "positionType", labels: ["position type", "role type", "requisition type"] },
  { field: "jobType", labels: ["job type", "employment type", "employment"] },
  { field: "contractDurationMonths", labels: ["contract duration", "duration"] },
  { field: "department", labels: ["department", "team"] },
  { field: "priority", labels: ["priority"] },
  { field: "salaryGrade", labels: ["salary grade", "pay grade", "salary band"] },
  { field: "salaryRange", labels: ["salary range", "compensation range", "pay range"] },
  { field: "location", labels: ["work location", "location"] },
  { field: "stakeholders", labels: ["stakeholder emails", "stakeholders"] },
  { field: "jobPostingDeadline", labels: ["job posting deadline", "posting deadline"] },
  { field: "recruitmentDeadline", labels: ["recruitment deadline", "final date for completion"] },
  { field: "skill", labels: ["skills", "skill"] },
  { field: "capability", labels: ["capabilities", "capability"] },
  { field: "personality", labels: ["personality", "personality profile", "personality type"] },
  {
    field: "job",
    labels: [
      "job description",
      "role description",
      "job summary",
      "responsibilities",
      "description",
      "job",
    ],
  },
];

const labelMatchers = fieldAliases
  .flatMap(({ field, labels }) =>
    labels.map((label) => ({ field, label, normalizedLabel: normalizeLabel(label) })),
  )
  .sort((a, b) => b.label.length - a.label.length);

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchLabeledLine(line: string) {
  const normalizedLine = normalizeLabel(line);
  for (const matcher of labelMatchers) {
    const exact = normalizedLine === matcher.normalizedLabel;
    if (exact) return { field: matcher.field, value: "" };

    const escapedLabel = matcher.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = line.match(
      new RegExp(`^\\s*${escapedLabel}\\s*(?::|=|[-–—])\\s*(.*?)\\s*$`, "i"),
    );
    if (match) return { field: matcher.field, value: match[1].trim() };

    const withWhitespace = line.match(
      new RegExp(`^\\s*${escapedLabel}\\s+(.+?)\\s*$`, "i"),
    );
    if (withWhitespace) {
      return { field: matcher.field, value: withWhitespace[1].trim() };
    }
  }
  return null;
}

function normalizeDate(value: string) {
  const isoDate = value.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoDate) return isoDate[1];
  const explicitDate =
    /\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b/.test(value) ||
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,)?\s+\d{4}\b/i.test(
      value,
    );
  if (!explicitDate) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function normalizePriority(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("urgent")) return "Urgent";
  if (normalized.includes("high")) return "High";
  if (normalized.includes("medium")) return "Medium";
  if (normalized.includes("low")) return "Low";
  return "";
}

export function extractPositionFieldsFromText(
  text: string,
): ExtractedPositionFields {
  const values: Partial<Record<ExtractableField | "stakeholders", string>> = {};
  const unassignedLines: string[] = [];
  let activeField: ExtractableField | "stakeholders" | null = null;
  let pendingField: ExtractableField | "stakeholders" | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^\s*(?:[•*▪-]\s*)?/, "").trim();
    if (!line) {
      if (activeField === "job") unassignedLines.push("");
      continue;
    }

    const label = matchLabeledLine(line);
    if (label) {
      activeField = ["job", "skill", "capability", "personality"].includes(
        label.field,
      )
        ? label.field
        : null;
      pendingField = label.value ? null : label.field;
      if (label.value) {
        values[label.field] = label.value;
      }
      continue;
    }

    if (pendingField) {
      values[pendingField] = line;
      activeField = ["job", "skill", "capability", "personality"].includes(
        pendingField,
      )
        ? pendingField
        : null;
      pendingField = null;
      continue;
    }

    if (activeField) {
      const previous = values[activeField] ?? "";
      values[activeField] = previous ? `${previous}\n${line}` : line;
    } else {
      unassignedLines.push(line);
    }
  }

  const result: ExtractedPositionFields = {};
  const setIfPresent = (
    field: Exclude<ExtractableField, "jobType" | "positionType" | "priority" | "jobPostingDeadline" | "recruitmentDeadline" | "contractDurationMonths">,
  ) => {
    const value = values[field]?.trim();
    if (value) Object.assign(result, { [field]: value });
  };

  setIfPresent("position");
  setIfPresent("hiringManager");
  setIfPresent("department");
  setIfPresent("salaryGrade");
  setIfPresent("salaryRange");
  setIfPresent("location");
  setIfPresent("skill");
  setIfPresent("capability");
  setIfPresent("personality");

  const rawPositionType = values.positionType?.toLowerCase() ?? "";
  if (rawPositionType.includes("replacement")) result.positionType = "Replacement";
  else if (rawPositionType.includes("new")) result.positionType = "New";

  const rawJobType = values.jobType?.toLowerCase() ?? "";
  if (/contract|fixed[\s-]?term/.test(rawJobType)) result.jobType = "Contract";
  else if (/full[\s-]?time|permanent/.test(rawJobType)) result.jobType = "Full Time";

  const rawDuration = values.contractDurationMonths?.trim() ?? "";
  const duration = rawDuration.match(/\b(\d+)\s*(?:months?|mos?)?\b/i);
  if (duration) {
    result.contractDurationMonths = duration[1];
    result.jobType ??= "Contract";
  }

  const priority = values.priority?.trim();
  if (priority) result.priority = normalizePriority(priority);

  const postingDeadline = values.jobPostingDeadline?.trim();
  if (postingDeadline) {
    const normalized = normalizeDate(postingDeadline);
    if (normalized) result.jobPostingDeadline = normalized;
  }
  const recruitmentDeadline = values.recruitmentDeadline?.trim();
  if (recruitmentDeadline) {
    const normalized = normalizeDate(recruitmentDeadline);
    if (normalized) result.recruitmentDeadline = normalized;
  }

  const stakeholders = values.stakeholders?.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  );
  if (stakeholders?.length) {
    result.stakeholders = [...new Set(stakeholders.map((email) => email.toLowerCase()))];
  }

  const description = values.job?.trim();
  const fallbackDescription = unassignedLines.join("\n").trim();
  if (description || fallbackDescription) {
    result.job = description || fallbackDescription;
  }

  return result;
}
