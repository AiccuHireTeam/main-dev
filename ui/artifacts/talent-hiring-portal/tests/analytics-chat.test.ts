import assert from "node:assert/strict";
import test from "node:test";
import {
  answerAnalyticsQuestion,
  type AnalyticsActivityRow,
  type AnalyticsReportData,
} from "../src/lib/analytics-chat.ts";

const report: AnalyticsReportData = {
  totalOpenPositions: 7,
  positionsFilled: 5,
  averageDaysToHire: 32,
  offerAcceptanceRate: 67,
  offersExtended: 3,
  averageAiMatchScore: 82,
};

const activity: AnalyticsActivityRow[] = [
  { month: "Jan 2025", opened: 5, filled: 3, applied: 82, hired: 3 },
  { month: "Jun 2025", opened: 10, filled: 8, applied: 240, hired: 8 },
  { month: "Jul 2025", opened: 11, filled: 5, applied: 278, hired: 5 },
  { month: "Aug 2025", opened: 4, filled: 0, applied: 47, hired: 0 },
];

test("answers questions with the report's summary metrics", () => {
  assert.match(answerAnalyticsQuestion("How many open positions?", report, activity), /7 total open positions/);
  assert.match(answerAnalyticsQuestion("Average time to hire?", report, activity), /32 days/);
  assert.match(answerAnalyticsQuestion("How are offers doing?", report, activity), /67%/);
  assert.match(answerAnalyticsQuestion("What is the AI match score?", report, activity), /82/);
});

test("answers month-specific and trend questions from activity rows", () => {
  assert.match(answerAnalyticsQuestion("What happened in July?", report, activity), /278 applications/);
  assert.match(answerAnalyticsQuestion("Summarize application trends", report, activity), /647 applications/);
  assert.match(answerAnalyticsQuestion("Which month had the least applications?", report, activity), /Aug 2025 \(47\)/);
});

test("does not invent information outside the report", () => {
  assert.match(
    answerAnalyticsQuestion("Who is our best recruiter?", report, activity),
    /figures shown on this report/,
  );
});
