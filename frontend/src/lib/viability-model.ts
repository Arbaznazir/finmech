// ========================================================
// BUSINESS VIABILITY DASHBOARD PRO – FULL EXCEL MATCH
// 4 inputs → Contribution, Margins, Break-even,
// Margin of Safety + RAG status + mentoring tips
// ========================================================

export interface ViabilityInputs {
  averagePricePerUnit: number;
  variableCostPerUnit: number;
  monthlyFixedCosts: number;
  unitsSoldPerMonth: number;
}

export type RAGStatus = "GREEN" | "AMBER" | "RED";

export interface MentoringTips {
  contribution: string;
  netProfit: string;
  breakeven: string;
  marginSafety: string;
}

export interface ViabilityResults {
  // Inputs echoed back
  averagePricePerUnit: number;
  variableCostPerUnit: number;
  monthlyFixedCosts: number;
  unitsSoldPerMonth: number;
  // Core metrics
  contributionPerUnit: number;
  contributionMarginPct: number;
  totalRevenue: number;
  totalVariableCost: number;
  totalContribution: number;
  netProfitLoss: number;
  netProfitMarginPct: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  marginOfSafetyPct: number;
  breakEvenUtilisationPct: number;
  // RAG
  contributionStatus: RAGStatus;
  netProfitStatus: RAGStatus;
  breakevenStatus: RAGStatus;
  marginSafetyStatus: RAGStatus;
  // Tips
  mentoringTips: MentoringTips;
}

function getRAG(metrics: {
  contributionMarginPct: number;
  netProfitMarginPct: number;
  breakEvenUtilisationPct: number;
  marginOfSafetyPct: number;
}): {
  contributionStatus: RAGStatus;
  netProfitStatus: RAGStatus;
  breakevenStatus: RAGStatus;
  marginSafetyStatus: RAGStatus;
  mentoringTips: MentoringTips;
} {
  const { contributionMarginPct, netProfitMarginPct, breakEvenUtilisationPct, marginOfSafetyPct } = metrics;

  // Contribution Margin
  let contributionStatus: RAGStatus = "RED";
  if (contributionMarginPct > 20) contributionStatus = "GREEN";
  else if (contributionMarginPct > 10) contributionStatus = "AMBER";

  // Net Profit Margin
  let netProfitStatus: RAGStatus = "RED";
  if (netProfitMarginPct > 0) netProfitStatus = "GREEN";
  else if (netProfitMarginPct > -10) netProfitStatus = "AMBER";

  // Break-even Utilisation
  let breakevenStatus: RAGStatus = "RED";
  if (breakEvenUtilisationPct < 80) breakevenStatus = "GREEN";
  else if (breakEvenUtilisationPct < 100) breakevenStatus = "AMBER";

  // Margin of Safety
  let marginSafetyStatus: RAGStatus = "RED";
  if (marginOfSafetyPct > 20) marginSafetyStatus = "GREEN";
  else if (marginOfSafetyPct > 0) marginSafetyStatus = "AMBER";

  return {
    contributionStatus,
    netProfitStatus,
    breakevenStatus,
    marginSafetyStatus,
    mentoringTips: {
      contribution: contributionStatus === "GREEN"
        ? "Strong unit economics. Focus on scaling sales."
        : "Unit profitability is weak. Review pricing or variable costs.",
      netProfit: netProfitStatus === "GREEN"
        ? "Business is profitable. Focus on growth."
        : "Loss-making. Immediate cost control or revenue boost needed.",
      breakeven: breakevenStatus === "GREEN"
        ? "Strong operating leverage. Scale confidently."
        : "High break-even point. Improve contribution margin.",
      marginSafety: marginSafetyStatus === "GREEN"
        ? "Healthy buffer against sales drop."
        : "Very low safety margin. Strengthen sales pipeline.",
    },
  };
}

export function calculateViability(inputs: ViabilityInputs): ViabilityResults {
  const { averagePricePerUnit: price, variableCostPerUnit: varCost, monthlyFixedCosts: fixed, unitsSoldPerMonth: units } = inputs;

  const contributionPerUnit = price - varCost;
  const contributionMarginPct = price > 0 ? (contributionPerUnit / price) * 100 : 0;

  const totalRevenue = price * units;
  const totalVariableCost = varCost * units;
  const totalContribution = totalRevenue - totalVariableCost;

  const netProfitLoss = totalContribution - fixed;

  const breakEvenUnits = contributionPerUnit > 0 ? Math.ceil(fixed / contributionPerUnit) : Infinity;
  const breakEvenRevenue = breakEvenUnits === Infinity ? Infinity : breakEvenUnits * price;

  const marginOfSafetyPct = totalRevenue > 0
    ? ((totalRevenue - (breakEvenRevenue === Infinity ? totalRevenue * 2 : breakEvenRevenue)) / totalRevenue) * 100
    : -100;

  const netProfitMarginPct = totalRevenue > 0 ? (netProfitLoss / totalRevenue) * 100 : 0;

  const breakEvenUtilisationPct = units > 0 ? (breakEvenUnits === Infinity ? 999 : (breakEvenUnits / units) * 100) : 0;

  const rag = getRAG({ contributionMarginPct, netProfitMarginPct, breakEvenUtilisationPct, marginOfSafetyPct });

  return {
    averagePricePerUnit: price,
    variableCostPerUnit: varCost,
    monthlyFixedCosts: fixed,
    unitsSoldPerMonth: units,
    contributionPerUnit,
    contributionMarginPct,
    totalRevenue,
    totalVariableCost,
    totalContribution,
    netProfitLoss,
    netProfitMarginPct,
    breakEvenUnits,
    breakEvenRevenue,
    marginOfSafetyPct,
    breakEvenUtilisationPct,
    ...rag,
  };
}
