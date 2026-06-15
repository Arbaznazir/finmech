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
  { id: "cf_q1", section: "Cash Flow", text: "I know exact cash available today", weight: 3 },
  { id: "cf_q2", section: "Cash Flow", text: "I know my monthly burn rate", weight: 3 },
  { id: "cf_q3", section: "Cash Flow", text: "I know my runway in months", weight: 3 },
  { id: "cf_q4", section: "Cash Flow", text: "Cash review is done monthly", weight: 3 },
  // Revenue (weight 2)
  { id: "rv_q1", section: "Revenue", text: "I track receivables & ageing", weight: 2 },
  { id: "rv_q2", section: "Revenue", text: "I know the % of one-time vs recurring revenue", weight: 2 },
  { id: "rv_q3", section: "Revenue", text: "Collection cycle is predictable", weight: 2 },
  // Costs (weight 2)
  { id: "co_q1", section: "Costs", text: "Fixed vs variable costs identified", weight: 2 },
  { id: "co_q2", section: "Costs", text: "Costs are reviewed before expansion", weight: 2 },
  { id: "co_q3", section: "Costs", text: "I can reduce burn within 30 days", weight: 2 },
  // Unit Economics (weight 3)
  { id: "ue_q1", section: "Unit Economics", text: "Gross margin is known", weight: 3 },
  { id: "ue_q2", section: "Unit Economics", text: "CAC and LTV are tracked", weight: 3 },
  { id: "ue_q3", section: "Unit Economics", text: "Pricing covers all costs", weight: 3 },
  // Forecasting (weight 2)
  { id: "fc_q1", section: "Forecasting", text: "12–24 month forecast exists", weight: 2 },
  { id: "fc_q2", section: "Forecasting", text: "Best/Base/Worst cases modeled", weight: 2 },
  { id: "fc_q3", section: "Forecasting", text: "Break-even point is clear", weight: 2 },
  // Compliance (weight 2)
  { id: "cm_q1", section: "Compliance", text: "GST/TDS/IT is tracked on calendar", weight: 2 },
  { id: "cm_q2", section: "Compliance", text: "Tax provisions are planned", weight: 2 },
  { id: "cm_q3", section: "Compliance", text: "Books updated monthly", weight: 2 },
  // Fundraising (weight 2)
  { id: "fr_q1", section: "Fundraising", text: "Cap Table is clean", weight: 2 },
  { id: "fr_q2", section: "Fundraising", text: "Dilution logic is understood", weight: 2 },
  { id: "fr_q3", section: "Fundraising", text: "Ready for Term Sheet", weight: 2 },
  // Controls (weight 2)
  { id: "ct_q1", section: "Controls", text: "Personal & business money separated", weight: 2 },
  { id: "ct_q2", section: "Controls", text: "Expense approvals exist", weight: 2 },
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
