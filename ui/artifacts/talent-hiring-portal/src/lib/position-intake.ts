import type { PositionFormValues } from "@/components/create-position-form";

export type RequiredPositionField =
  | "position"
  | "hiringManager"
  | "positionType"
  | "jobType"
  | "job"
  | "department"
  | "salaryRange"
  | "location"
  | "jobPostingDeadline"
  | "recruitmentDeadline"
  | "contractDurationMonths";

const requiredPositionFields: Array<{
  field: RequiredPositionField;
  label: string;
}> = [
  { field: "position", label: "Position title" },
  { field: "hiringManager", label: "Hiring manager" },
  { field: "positionType", label: "Role type" },
  { field: "jobType", label: "Job type" },
  { field: "job", label: "Detailed job description" },
  { field: "department", label: "Department" },
  { field: "salaryRange", label: "Salary range" },
  { field: "location", label: "Location" },
  { field: "jobPostingDeadline", label: "Posting deadline" },
  { field: "recruitmentDeadline", label: "Recruitment deadline" },
];

export function getMissingRequiredPositionFields(
  values: PositionFormValues,
): Array<{ field: RequiredPositionField; label: string }> {
  const missing = requiredPositionFields.filter(({ field }) =>
    !String(values[field]).trim(),
  );
  if (
    values.jobType === "Contract" &&
    !values.contractDurationMonths.trim()
  ) {
    missing.push({
      field: "contractDurationMonths",
      label: "Contract duration",
    });
  }
  return missing;
}

export function generatePositionJobDescription(
  values: PositionFormValues,
  sourceDescription: string,
): string {
  const roleDetails = [
    `Department: ${values.department}`,
    `Role type: ${values.positionType}`,
    `Job type: ${values.jobType}${
      values.jobType === "Contract" && values.contractDurationMonths
        ? ` (${values.contractDurationMonths} months)`
        : ""
    }`,
    `Location: ${values.location}`,
    `Salary range: ${values.salaryRange}`,
    values.salaryGrade ? `Salary grade: ${values.salaryGrade}` : "",
    values.priority ? `Priority: ${values.priority}` : "",
  ].filter(Boolean);

  const sections = [
    `${values.position}\n\n${sourceDescription.trim()}`,
    roleDetails.join("\n"),
    values.skill.trim() ? `Skills\n${values.skill.trim()}` : "",
    values.capability.trim()
      ? `Capabilities\n${values.capability.trim()}`
      : "",
    values.personality.trim()
      ? `Personality\n${values.personality.trim()}`
      : "",
    values.additionalRole.trim()
      ? `Additional role responsibilities\n${values.additionalRole.trim()}`
      : "",
    values.verticalGrowth.trim()
      ? `Vertical growth\n${values.verticalGrowth.trim()}`
      : "",
    values.otherDetails.trim()
      ? `Other details\n${values.otherDetails.trim()}`
      : "",
    values.benefits.length
      ? `Benefits\n${values.benefits.join(", ")}`
      : "",
  ].filter(Boolean);

  return sections.join("\n\n");
}
