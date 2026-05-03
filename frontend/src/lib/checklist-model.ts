// ========================================================
// KNOW YOUR BUSINESS NUMBERS – CHECKLIST MODEL
// Exact Excel match: 8 sections, weighted scoring,
// RAG readiness status
// ========================================================

export interface ChecklistQuestion {
  id: string;
  section: string;
  text: string;
  weight: number;
}

export type ChecklistResponse = "Yes" | "Partial" | "No";

export interface ChecklistAnswer {
  questionId: string;
  response: ChecklistResponse;
  score: number;
  weightedScore: number;
}

export interface SectionScore {
  section: string;
  score: number;
  maxPossible: number;
  percentage: number;
}

export interface ChecklistResults {
  totalScore: number;
  maxPossible: number;
  readinessPercentage: number;
  readinessStatus: string;
  statusColor: "green" | "amber" | "red";
  sectionScores: SectionScore[];
  advisorySummary: string;
}

export const QUESTIONS: ChecklistQuestion[] = [
  // Cash Flow (weight 3)
  { id: "cf_q1", section: "Cash Flow", text: "Do you track your cash flow weekly or monthly?", weight: 3 },
  { id: "cf_q2", section: "Cash Flow", text: "Do you know your current cash runway in months?", weight: 3 },
  { id: "cf_q3", section: "Cash Flow", text: "Do you have a cash reserve for at least 3 months of expenses?", weight: 3 },
  { id: "cf_q4", section: "Cash Flow", text: "Do you forecast cash flow for the next 6–12 months?", weight: 3 },
  // Revenue (weight 2)
  { id: "rv_q1", section: "Revenue", text: "Do you know your monthly recurring revenue (MRR)?", weight: 2 },
  { id: "rv_q2", section: "Revenue", text: "Do you track revenue by product/service line?", weight: 2 },
  { id: "rv_q3", section: "Revenue", text: "Do you know your revenue growth rate month-on-month?", weight: 2 },
  // Costs (weight 2)
  { id: "co_q1", section: "Costs", text: "Do you know your total fixed costs per month?", weight: 2 },
  { id: "co_q2", section: "Costs", text: "Do you know your variable cost per unit?", weight: 2 },
  { id: "co_q3", section: "Costs", text: "Do you review costs quarterly to find savings?", weight: 2 },
  // Unit Economics (weight 3)
  { id: "ue_q1", section: "Unit Economics", text: "Do you know your Customer Acquisition Cost (CAC)?", weight: 3 },
  { id: "ue_q2", section: "Unit Economics", text: "Do you know your Customer Lifetime Value (LTV)?", weight: 3 },
  { id: "ue_q3", section: "Unit Economics", text: "Is your LTV/CAC ratio above 3?", weight: 3 },
  // Forecasting (weight 2)
  { id: "fc_q1", section: "Forecasting", text: "Do you have a 12-month revenue forecast?", weight: 2 },
  { id: "fc_q2", section: "Forecasting", text: "Do you update your financial model regularly?", weight: 2 },
  { id: "fc_q3", section: "Forecasting", text: "Do you scenario-plan (best/worst/base case)?", weight: 2 },
  // Compliance (weight 2)
  { id: "cm_q1", section: "Compliance", text: "Are your books up to date (within 30 days)?", weight: 2 },
  { id: "cm_q2", section: "Compliance", text: "Do you file taxes on time?", weight: 2 },
  { id: "cm_q3", section: "Compliance", text: "Do you have a qualified accountant or CFO?", weight: 2 },
  // Fundraising (weight 2)
  { id: "fr_q1", section: "Fundraising", text: "Do you have a pitch deck with financial projections?", weight: 2 },
  { id: "fr_q2", section: "Fundraising", text: "Do you know how much funding you need and why?", weight: 2 },
  { id: "fr_q3", section: "Fundraising", text: "Can you articulate your unit economics to investors?", weight: 2 },
  // Controls (weight 2)
  { id: "ct_q1", section: "Controls", text: "Do you have approval workflows for expenses?", weight: 2 },
  { id: "ct_q2", section: "Controls", text: "Do you reconcile bank statements monthly?", weight: 2 },
  { id: "ct_q3", section: "Controls", text: "Do you have clear financial KPIs and dashboards?", weight: 2 },
];

export const SECTIONS = [...new Set(QUESTIONS.map((q) => q.section))];

export const MAX_POSSIBLE = QUESTIONS.reduce((sum, q) => sum + q.weight * 2, 0); // 2 = max score per question

function getResponseScore(response: ChecklistResponse): number {
  return response === "Yes" ? 2 : response === "Partial" ? 1 : 0;
}

export function calculateChecklist(
  answers: Record<string, ChecklistResponse>,
): ChecklistResults {
  let totalScore = 0;

  const sectionMap: Record<string, { score: number; max: number }> = {};
  SECTIONS.forEach((s) => { sectionMap[s] = { score: 0, max: 0 }; });

  QUESTIONS.forEach((q) => {
    const response = answers[q.id];
    const raw = response ? getResponseScore(response) : 0;
    const weighted = raw * q.weight;
    totalScore += weighted;

    sectionMap[q.section].score += weighted;
    sectionMap[q.section].max += q.weight * 2;
  });

  const readinessPercentage = MAX_POSSIBLE > 0 ? (totalScore / MAX_POSSIBLE) * 100 : 0;

  let readinessStatus: string;
  let statusColor: "green" | "amber" | "red";
  let advisorySummary: string;

  if (readinessPercentage >= 80) {
    readinessStatus = "FINANCE-READY";
    statusColor = "green";
    advisorySummary = "Strong financial foundation. Focus on optimisation and growth acceleration.";
  } else if (readinessPercentage >= 50) {
    readinessStatus = "GROWTH RISK";
    statusColor = "amber";
    advisorySummary = "Key gaps identified. Prioritise cash flow discipline, unit economics tracking, and compliance.";
  } else {
    readinessStatus = "SURVIVAL RISK";
    statusColor = "red";
    advisorySummary = "Urgent corrective action required: cash, compliance and cost discipline.";
  }

  const sectionScores: SectionScore[] = SECTIONS.map((section) => ({
    section,
    score: sectionMap[section].score,
    maxPossible: sectionMap[section].max,
    percentage: sectionMap[section].max > 0 ? (sectionMap[section].score / sectionMap[section].max) * 100 : 0,
  }));

  return {
    totalScore,
    maxPossible: MAX_POSSIBLE,
    readinessPercentage: Math.round(readinessPercentage * 100) / 100,
    readinessStatus,
    statusColor,
    sectionScores,
    advisorySummary,
  };
}
