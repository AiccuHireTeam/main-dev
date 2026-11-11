export type AnalyticsActivityRow = {
  month: string;
  opened: number;
  filled: number;
  applied: number;
  hired: number;
};

export type AnalyticsReportData = {
  totalOpenPositions: number;
  positionsFilled: number;
  averageDaysToHire: number;
  offerAcceptanceRate: number;
  offersExtended: number;
  averageAiMatchScore: number;
};

const monthAliases: Record<string, string[]> = {
  jan: ["jan", "january"],
  feb: ["feb", "february"],
  mar: ["mar", "march"],
  apr: ["apr", "april"],
  may: ["may"],
  jun: ["jun", "june"],
  jul: ["jul", "july"],
  aug: ["aug", "august"],
  sep: ["sep", "september"],
  oct: ["oct", "october"],
  nov: ["nov", "november"],
  dec: ["dec", "december"],
};

export function answerAnalyticsQuestion(
  question: string,
  report: AnalyticsReportData,
  activity: AnalyticsActivityRow[],
): string {
  const query = question.trim().toLowerCase();
  if (!query) {
    return "Ask about open positions, time to hire, offers, match scores, monthly activity, or trends in this report.";
  }

  const matchingMonth = activity.find((row) => {
    const key = row.month.slice(0, 3).toLowerCase();
    return monthAliases[key]?.some((alias) =>
      new RegExp(`\\b${alias}\\b`, "i").test(query),
    );
  });
  if (matchingMonth) {
    return `${matchingMonth.month}: ${matchingMonth.opened} positions opened, ${matchingMonth.filled} filled, ${matchingMonth.applied} applications, and ${matchingMonth.hired} hires.`;
  }

  if (/\b(open (?:positions?|jobs?|roles?)|requisitions?)\b/.test(query)) {
    return `The report shows ${report.totalOpenPositions} total open positions and ${report.positionsFilled} positions filled.`;
  }

  if (/\b(days? to hire|time to hire|hiring speed|how long)\b/.test(query)) {
    return `The average time to hire shown in the report is ${report.averageDaysToHire} days.`;
  }

  if (/\b(offers?|acceptance rate|offers accepted)\b/.test(query)) {
    return `Offer acceptance is ${report.offerAcceptanceRate}% in this report, with ${report.offersExtended} offers extended.`;
  }

  if (/\b(ai match|match score|matching score)\b/.test(query)) {
    return `The average AI match score shown is ${report.averageAiMatchScore} for active candidates.`;
  }

  if (
    /\b(trends?|summariz\w*|highest|peak|most|lowest|least|total|overall|summary|activity|volume|applications?|opened|filled|hires?)\b/.test(
      query,
    )
  ) {
    const totalOpened = activity.reduce((sum, row) => sum + row.opened, 0);
    const totalFilled = activity.reduce((sum, row) => sum + row.filled, 0);
    const totalApplied = activity.reduce((sum, row) => sum + row.applied, 0);
    const totalHired = activity.reduce((sum, row) => sum + row.hired, 0);
    const peakApplications = activity.reduce((best, row) =>
      row.applied > best.applied ? row : best,
    );
    const lowestApplications = activity.reduce((lowest, row) =>
      row.applied < lowest.applied ? row : lowest,
    );
    return `Across ${activity.length} months in the report, there were ${totalOpened} positions opened, ${totalFilled} filled, ${totalApplied} applications, and ${totalHired} hires. Applications peaked in ${peakApplications.month} (${peakApplications.applied}) and were lowest in ${lowestApplications.month} (${lowestApplications.applied}).`;
  }

  return "I can answer from the figures shown on this report. Try asking about a month, open positions, days to hire, offer acceptance, AI match score, or application trends.";
}
