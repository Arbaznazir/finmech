// ========================================================
// BUSINESS VIABILITY DASHBOARD PRO – FULL EXCEL MATCH
// 4 inputs → Contribution, Margins, Break-even,
// Margin of Safety + RAG status + mentoring tips
// ========================================================

import { viabilityExcelCommentary } from "@/lib/excel-model-content";

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
  // Insights
  insights: ViabilityInsights;
}

export interface ViabilityInsights {
  overall: string;
  overallColor: string;
  guidance: string[];
  healthScore: number;
  viabilityLevel: "strong" | "moderate" | "weak" | "critical";
}

function excelViabilityRag(metricValue: number): RAGStatus {
  return metricValue < 0.2 ? "RED" : "GREEN";
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
  insights: ViabilityInsights;
} {
  const {
    contributionMarginPct,
    netProfitMarginPct,
    breakEvenUtilisationPct,
    marginOfSafetyPct,
  } = metrics;

  // Excel: =IF(B<0.2,"RED","GREEN") on each metric row (no AMBER)
  const contributionStatus = excelViabilityRag(contributionMarginPct);
  const netProfitStatus = excelViabilityRag(netProfitMarginPct);
  const breakevenStatus = excelViabilityRag(breakEvenUtilisationPct);
  const marginSafetyStatus = excelViabilityRag(marginOfSafetyPct);

  // Generate comprehensive insights
  const insights = generateInsights({
    contributionStatus,
    netProfitStatus,
    breakevenStatus,
    marginSafetyStatus,
  });

  return {
    contributionStatus,
    netProfitStatus,
    breakevenStatus,
    marginSafetyStatus,
    insights,
  };
}

function generateInsights(
  status: {
    contributionStatus: RAGStatus;
    netProfitStatus: RAGStatus;
    breakevenStatus: RAGStatus;
    marginSafetyStatus: RAGStatus;
  }
): ViabilityInsights {
  const guidance: string[] = [];

  const ragRows: { metric: string; rag: RAGStatus }[] = [
    { metric: "Contribution Margin %", rag: status.contributionStatus },
    { metric: "Net Profit Margin %", rag: status.netProfitStatus },
    { metric: "Break-even Utilisation %", rag: status.breakevenStatus },
    { metric: "Margin of Safety %", rag: status.marginSafetyStatus },
  ];

  for (const { metric, rag } of ragRows) {
    guidance.push(...viabilityExcelCommentary(metric, rag));
  }

  const worst =
    ragRows.find((r) => r.rag === "RED") ??
    ragRows.find((r) => r.rag === "AMBER") ??
    ragRows[0];
  const worstMsgs = viabilityExcelCommentary(worst.metric, worst.rag);
  const overall = worstMsgs[0]?.replace(/^(GREEN|AMBER|RED): /, "") ?? "";
  const overallColor =
    worst.rag === "GREEN"
      ? "text-success"
      : worst.rag === "AMBER"
        ? "text-amber-400"
        : "text-danger";

  return {
    overall,
    overallColor,
    guidance,
    healthScore: 0,
    viabilityLevel: worst.rag === "GREEN" ? "strong" : worst.rag === "AMBER" ? "moderate" : "critical",
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

  const breakEvenUnits = contributionPerUnit > 0 ? fixed / contributionPerUnit : Infinity;
  const breakEvenRevenue = breakEvenUnits === Infinity ? Infinity : breakEvenUnits * price;

  const marginOfSafetyPct =
    units > 0 ? ((units - (breakEvenUnits === Infinity ? units * 2 : breakEvenUnits)) / units) * 100 : -100;

  const netProfitMarginPct = totalRevenue > 0 ? (netProfitLoss / totalRevenue) * 100 : 0;

  const breakEvenUtilisationPct =
    units > 0 ? (breakEvenUnits === Infinity ? 999 : (breakEvenUnits / units) * 100) : 0;

  const rag = getRAG({
    contributionMarginPct,
    netProfitMarginPct,
    breakEvenUtilisationPct,
    marginOfSafetyPct,
  });

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
