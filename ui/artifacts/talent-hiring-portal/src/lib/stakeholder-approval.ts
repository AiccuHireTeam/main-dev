export type StakeholderReviewDecision = "relevant" | "not-relevant";

export type StakeholderInputResponse = {
  key: string;
  stakeholderEmail: string;
  question: string;
  answer: string;
  decision?: StakeholderReviewDecision;
};

export type StakeholderRequirementFields = {
  job: string;
  skill: string;
  capability: string;
  personality: string;
  additionalRole: string;
  verticalGrowth: string;
  otherDetails: string;
};

export function allStakeholdersSubmitted(
  stakeholderEmails: string[],
  submittedByEmail: Record<string, boolean>,
): boolean {
  return (
    stakeholderEmails.length > 0 &&
    stakeholderEmails.every(
      (email) => submittedByEmail[email.toLowerCase()] === true,
    )
  );
}

export function mergeRelevantStakeholderInputs(
  baseRequirements: StakeholderRequirementFields,
  responses: StakeholderInputResponse[],
): StakeholderRequirementFields {
  const requirements = { ...baseRequirements };

  for (const response of responses) {
    if (response.decision !== "relevant" || !response.answer.trim()) continue;
    const prompt = response.question.toLowerCase();
    const field: keyof StakeholderRequirementFields =
      /\b(skill|skills|method|methods|tool|tools|experience|expertise)\b/.test(
        prompt,
      )
        ? "skill"
        : /\b(personality|work style|workstyle|culture)\b/.test(prompt)
          ? "personality"
          : /\b(risk|risks|context|constraint|constraints|challenge|challenges)\b/.test(
                prompt,
              )
            ? "otherDetails"
            : /\b(growth|career path|progression)\b/.test(prompt)
              ? "verticalGrowth"
              : /\b(additional role|secondary responsibility)\b/.test(prompt)
                ? "additionalRole"
                : /\b(responsibilit|day-to-day|scope|deliverable)\b/.test(
                      prompt,
                    )
                  ? "job"
                  : "capability";
    const answer = response.answer
      .trim()
      .replace(/^[•*-]\s*/, "")
      .replace(/\s+/g, " ")
      .replace(/[.?!;]+\s*$/, "");
    if (!answer) continue;

    const current = requirements[field].trim().replace(/[.?!;]+\s*$/, "");
    const combined = [current, answer].filter(Boolean).join(". ");
    requirements[field] = /[.?!]$/.test(combined) ? combined : `${combined}.`;
  }

  return requirements;
}
