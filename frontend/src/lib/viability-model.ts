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

function getRAG(metrics: {
  contributionMarginPct: number;
  netProfitLoss: number;
  breakEvenUtilisationPct: number;
  marginOfSafetyPct: number;
}): {
  contributionStatus: RAGStatus;
  netProfitStatus: RAGStatus;
  breakevenStatus: RAGStatus;
  marginSafetyStatus: RAGStatus;
  insights: ViabilityInsights;
} {
  const { contributionMarginPct, netProfitLoss, breakEvenUtilisationPct, marginOfSafetyPct } = metrics;

  // === CORRECTED RAG Logic (Matched to Excel) ===
  
  // Contribution Margin: > 25% GREEN, > 10% AMBER, else RED
  let contributionStatus: RAGStatus = "RED";
  if (contributionMarginPct > 25) contributionStatus = "GREEN";
  else if (contributionMarginPct > 10) contributionStatus = "AMBER";

  // Net Profit: > 0 GREEN, > -10000 AMBER, else RED
  let netProfitStatus: RAGStatus = "RED";
  if (netProfitLoss > 0) netProfitStatus = "GREEN";
  else if (netProfitLoss > -10000) netProfitStatus = "AMBER";

  // Break-even Utilization: < 70% GREEN, < 100% AMBER, else RED
  let breakevenStatus: RAGStatus = "RED";
  if (breakEvenUtilisationPct < 70) breakevenStatus = "GREEN";
  else if (breakEvenUtilisationPct < 100) breakevenStatus = "AMBER";

  // Margin of Safety: > 20% GREEN, > 0% AMBER, else RED
  let marginSafetyStatus: RAGStatus = "RED";
  if (marginOfSafetyPct > 20) marginSafetyStatus = "GREEN";
  else if (marginOfSafetyPct > 0) marginSafetyStatus = "AMBER";

  // Generate comprehensive insights
  const insights = generateInsights(metrics, {
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
  metrics: {
    contributionMarginPct: number;
    netProfitLoss: number;
    breakEvenUtilisationPct: number;
    marginOfSafetyPct: number;
  },
  status: {
    contributionStatus: RAGStatus;
    netProfitStatus: RAGStatus;
    breakevenStatus: RAGStatus;
    marginSafetyStatus: RAGStatus;
  }
): ViabilityInsights {
  const { contributionMarginPct, netProfitLoss, breakEvenUtilisationPct, marginOfSafetyPct } = metrics;
  const guidance: string[] = [];
  let healthScore = 100;
  let viabilityLevel: "strong" | "moderate" | "weak" | "critical" = "strong";

  // Contribution Margin Analysis
  if (status.contributionStatus === "RED") {
    healthScore -= 35;
    viabilityLevel = "critical";
    guidance.push("🚨 Critical Contribution Margin — Each unit contributes very little toward fixed costs. Immediate price increase or cost reduction required.");
  } else if (status.contributionStatus === "AMBER") {
    healthScore -= 15;
    viabilityLevel = "weak";
    guidance.push("⚠️ Low Contribution Margin — Unit profitability is weak. Consider premium pricing or reducing variable costs.");
  } else {
    guidance.push("✓ Healthy Contribution Margin — Each sale makes a meaningful contribution to covering fixed costs.");
  }

  // Net Profit Analysis
  if (status.netProfitStatus === "RED") {
    healthScore -= 30;
    viabilityLevel = viabilityLevel === "critical" ? "critical" : "weak";
    guidance.push("🚨 Significant Losses — Monthly losses exceed ₹10,000. Urgent cost control or revenue boost needed.");
  } else if (status.netProfitStatus === "AMBER") {
    healthScore -= 10;
    if (viabilityLevel === "strong") viabilityLevel = "moderate";
    guidance.push("⚠️ Marginal Losses — Small monthly losses. Monitor closely and take corrective action.");
  } else {
    guidance.push("✓ Profitable — Business is generating positive monthly profit.");
  }

  // Break-even Utilization Analysis
  if (status.breakevenStatus === "RED") {
    healthScore -= 25;
    viabilityLevel = viabilityLevel === "critical" ? "critical" : "weak";
    guidance.push("🚨 High Break-even Burden — You need to sell more than current capacity just to break even. Critical issue.");
  } else if (status.breakevenStatus === "AMBER") {
    healthScore -= 10;
    if (viabilityLevel === "strong") viabilityLevel = "moderate";
    guidance.push("⚠️ Elevated Break-even — Most of your sales capacity goes to covering costs. Limited room for error.");
  } else {
    guidance.push("✓ Comfortable Break-even — You have substantial capacity above break-even for profit generation.");
  }

  // Margin of Safety Analysis
  if (status.marginSafetyStatus === "RED") {
    healthScore -= 20;
    viabilityLevel = viabilityLevel === "critical" ? "critical" : "weak";
    guidance.push("🚨 Negative Margin of Safety — You're already below break-even. Any sales drop worsens losses.");
  } else if (status.marginSafetyStatus === "AMBER") {
    healthScore -= 10;
    if (viabilityLevel === "strong") viabilityLevel = "moderate";
    guidance.push("⚠️ Thin Safety Margin — Sales can only drop slightly before hitting losses. Build buffer.");
  } else {
    guidance.push("✓ Good Safety Margin — Sales can drop significantly before you start losing money.");
  }

  // Specific recommendations based on metrics
  if (contributionMarginPct < 5 && contributionMarginPct > 0) {
    guidance.push("💡 Action: With such low contribution per unit, focus on either 20%+ price increase or 15%+ variable cost reduction.");
  }

  if (breakEvenUtilisationPct > 100) {
    const extraUnitsNeeded = Math.ceil((breakEvenUtilisationPct - 100) / 100 * 100); // approximate
    guidance.push(`💡 Action: You need to increase sales capacity or units sold by ${(breakEvenUtilisationPct - 100).toFixed(1)}% just to break even.`);
  }

  if (marginOfSafetyPct < 0 && marginOfSafetyPct > -20) {
    guidance.push("💡 Action: You're slightly below break-even. A small sales increase or modest cost cut can turn this around.");
  }

  // Determine overall status
  let overall: string;
  let overallColor: string;

  if (healthScore >= 80) {
    overall = "Strong business viability! Healthy margins and comfortable break-even position.";
    overallColor = "text-success";
  } else if (healthScore >= 60) {
    overall = "Moderate viability. Some metrics need attention but fundamentals are okay.";
    overallColor = "text-amber-400";
  } else if (healthScore >= 40) {
    overall = "Weak viability. Multiple warning signs require immediate action.";
    overallColor = "text-orange-400";
  } else {
    overall = "Critical viability issues. Business model needs fundamental restructuring.";
    overallColor = "text-danger";
  }

  // Add health score to guidance
  guidance.unshift(`📊 Viability Health Score: ${Math.max(0, healthScore)}/100`);

  return {
    overall,
    overallColor,
    guidance,
    healthScore: Math.max(0, healthScore),
    viabilityLevel,
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

  const rag = getRAG({ contributionMarginPct, netProfitLoss, breakEvenUtilisationPct, marginOfSafetyPct });

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
