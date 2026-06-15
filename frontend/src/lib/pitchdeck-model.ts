// ========================================================
// PITCH DECK KPIs MODEL – FULL EXCEL MATCH
// All inputs → Gross Margin, Contribution, CAC, LTV,
// Runway, Burn Multiple, RAG status + mentoring tips
// ========================================================

export interface PitchDeckInputs {
  grossMonthlyRevenue: number;
  recurringRevenue: number;
  cogs: number;
  monthlyMarketingSpend: number;
  variableCosts: number;
  fixedCosts: number;
  customersAddedMonthly: number;
  activeCustomers: number;
  cashAvailable: number;
  monthlyDebt: number;
  averageCustomerLifetime: number;
  arpu: number;
}

export type RAGStatus = "GREEN" | "AMBER" | "RED";

export interface MentoringTips {
  grossMargin: string;
  ltvCac: string;
  runway: string;
  recurring: string;
}

export interface SummaryFlags {
  isUnitEconomicsPositive: boolean;
  isCACRecoverable: boolean;
  isBurnControlled: boolean;
  canScaleImproveMargins: boolean;
}

export interface PitchDeckInsights {
  overall: string;
  overallColor: string;
  guidance: string[];
  healthScore: number;
  investorReadiness: "excellent" | "good" | "needs-work" | "not-ready";
}

export interface PitchDeckResults {
  // Echoed inputs
  grossMonthlyRevenue: number;
  recurringRevenue: number;
  cogs: number;
  monthlyMarketingSpend: number;
  variableCosts: number;
  fixedCosts: number;
  customersAddedMonthly: number;
  activeCustomers: number;
  cashAvailable: number;
  monthlyDebt: number;
  arpu: number;
  // Computed
  grossMargin: number;
  contributionMarginAfterCAC: number;
  cac: number;
  ltv: number;
  ltvCacRatio: number;
  recurringRevenueRatio: number;
  netBurn: number;
  runwayMonths: number;
  burnMultiple: number;
  cashEfficiencyRatio: number;
  cacPaybackMonths: number;
  // RAG
  grossMarginStatus: RAGStatus;
  ltvCacStatus: RAGStatus;
  runwayStatus: RAGStatus;
  recurringRatioStatus: RAGStatus;
  burnStatus: RAGStatus;
  contributionStatus: RAGStatus;
  // Tips & summary
  mentoringTips: MentoringTips;
  summary: SummaryFlags;
  insights: PitchDeckInsights;
}

export const INPUT_FIELDS: { key: keyof PitchDeckInputs; label: string; category: string; prefix: string }[] = [
  { key: "grossMonthlyRevenue", label: "Gross Monthly Revenue", category: "Revenue", prefix: "$" },
  { key: "recurringRevenue", label: "Recurring Revenue", category: "Revenue", prefix: "$" },
  { key: "cogs", label: "COGS", category: "Costs", prefix: "$" },
  { key: "monthlyMarketingSpend", label: "Monthly Marketing Spend", category: "Costs", prefix: "$" },
  { key: "variableCosts", label: "Variable Costs", category: "Costs", prefix: "$" },
  { key: "fixedCosts", label: "Fixed Costs", category: "Costs", prefix: "$" },
  { key: "customersAddedMonthly", label: "Customers Added (Monthly)", category: "Customers", prefix: "#" },
  { key: "activeCustomers", label: "Active Customers", category: "Customers", prefix: "#" },
  { key: "arpu", label: "Avg Revenue per Customer", category: "Customers", prefix: "$" },
  { key: "averageCustomerLifetime", label: "Avg Customer Lifetime (months)", category: "Customers", prefix: "#" },
  { key: "cashAvailable", label: "Cash Available", category: "Cash", prefix: "$" },
  { key: "monthlyDebt", label: "Monthly Debt", category: "Cash", prefix: "$" },
];

export function createEmptyInputs(): PitchDeckInputs {
  return {
    grossMonthlyRevenue: 0, recurringRevenue: 0, cogs: 0,
    monthlyMarketingSpend: 0, variableCosts: 0, fixedCosts: 0,
    customersAddedMonthly: 0, activeCustomers: 0, cashAvailable: 0,
    monthlyDebt: 0, averageCustomerLifetime: 0, arpu: 0,
  };
}

export function calculatePitchDeck(inputs: PitchDeckInputs): PitchDeckResults {
  const {
    grossMonthlyRevenue, recurringRevenue, cogs,
    monthlyMarketingSpend, variableCosts, fixedCosts,
    customersAddedMonthly, activeCustomers, cashAvailable,
    monthlyDebt, averageCustomerLifetime, arpu,
  } = inputs;

  // FIXED: Accurate formulas matching Excel
  const grossMarginRaw = grossMonthlyRevenue > 0 ? (grossMonthlyRevenue - cogs) / grossMonthlyRevenue : 0;
  
  // Contribution Margin After CAC = (Revenue - Variable Costs - Marketing) / Revenue
  const totalVariableCost = variableCosts || cogs;
  const contributionAfterCAC = grossMonthlyRevenue - totalVariableCost - monthlyMarketingSpend;
  const contributionRaw = grossMonthlyRevenue > 0 ? contributionAfterCAC / grossMonthlyRevenue : 0;

  // CAC and LTV
  const cac = customersAddedMonthly > 0 ? monthlyMarketingSpend / customersAddedMonthly : 0;
  const ltv = averageCustomerLifetime > 0 && arpu > 0 ? arpu * averageCustomerLifetime : 0;
  const ltvCacRatio = cac > 0 ? ltv / cac : 0;
  const cacPaybackMonths = arpu > 0 ? cac / arpu : 0;

  const recurringRatioRaw = grossMonthlyRevenue > 0 ? recurringRevenue / grossMonthlyRevenue : 0;

  // Burn and Runway
  const totalOpEx = totalVariableCost + fixedCosts + monthlyMarketingSpend;
  const netBurn = totalOpEx - grossMonthlyRevenue;
  const runwayMonths = netBurn <= 0 ? Infinity : cashAvailable / netBurn;

  const burnMultiple = grossMonthlyRevenue > 0 ? Math.abs(netBurn) / grossMonthlyRevenue : 0;
  const cashEfficiencyRatio = totalOpEx > 0 ? grossMonthlyRevenue / totalOpEx : 0;

  // RAG Status
  const grossMarginStatus: RAGStatus = grossMarginRaw > 0.4 ? "GREEN" : grossMarginRaw > 0.2 ? "AMBER" : "RED";
  const ltvCacStatus: RAGStatus = ltvCacRatio > 3 ? "GREEN" : ltvCacRatio > 1 ? "AMBER" : "RED";
  const runwayStatus: RAGStatus = runwayMonths === Infinity || runwayMonths > 12 ? "GREEN" : runwayMonths > 6 ? "AMBER" : "RED";
  const recurringRatioStatus: RAGStatus = recurringRatioRaw * 100 > 70 ? "GREEN" : recurringRatioRaw * 100 > 40 ? "AMBER" : "RED";
  const burnStatus: RAGStatus = netBurn <= 0 ? "GREEN" : netBurn < 50000 ? "AMBER" : "RED";
  const contributionStatus: RAGStatus = contributionRaw > 0.3 ? "GREEN" : contributionRaw > 0 ? "AMBER" : "RED";

  // Enhanced mentoring tips
  const mentoringTips: MentoringTips = {
    grossMargin: grossMarginRaw > 0.4 
      ? "Strong gross margins indicate pricing power." 
      : grossMarginRaw > 0.2 
        ? "Margins need improvement. Consider premium pricing." 
        : "Low margins threaten sustainability. Reduce COGS or increase prices.",
    ltvCac: ltvCacRatio > 3 
      ? "Excellent unit economics — highly investable." 
      : ltvCacRatio > 1 
        ? "Unit economics are viable but need optimization." 
        : "LTV/CAC below 1 means losing money per customer. Fix immediately.",
    runway: runwayMonths === Infinity || runwayMonths > 12 
      ? "Comfortable runway — focus on growth." 
      : runwayMonths > 6 
        ? "Moderate runway — monitor burn carefully." 
        : "Critical runway — fundraise urgently or cut costs.",
    recurring: recurringRatioRaw > 0.7 
      ? "Strong recurring base provides predictability." 
      : recurringRatioRaw > 0.4 
        ? "Growing recurring share — good for investor confidence." 
        : "Low recurring revenue increases risk. Build subscriptions.",
  };

  const summary: SummaryFlags = {
    isUnitEconomicsPositive: ltvCacRatio > 1 && grossMarginRaw > 0.2 && contributionRaw > 0,
    isCACRecoverable: ltvCacRatio > 1 && cacPaybackMonths < 12,
    isBurnControlled: netBurn <= 0 || runwayMonths > 6,
    canScaleImproveMargins: contributionRaw > 0.3 && grossMarginRaw > 0.4,
  };

  // Generate comprehensive insights
  const insights = generateInsights({
    grossMargin: grossMarginRaw * 100,
    contributionMargin: contributionRaw * 100,
    ltvCacRatio,
    cacPaybackMonths,
    runwayMonths,
    recurringRatio: recurringRatioRaw * 100,
    netBurn,
    burnMultiple,
    ltv,
    cac,
    arpu,
  });

  return {
    grossMonthlyRevenue, recurringRevenue, cogs,
    monthlyMarketingSpend, variableCosts, fixedCosts,
    customersAddedMonthly, activeCustomers, cashAvailable,
    monthlyDebt, arpu,
    grossMargin: grossMarginRaw * 100,
    contributionMarginAfterCAC: contributionRaw * 100,
    cac, ltv, ltvCacRatio,
    recurringRevenueRatio: recurringRatioRaw * 100,
    netBurn, runwayMonths, burnMultiple, cashEfficiencyRatio, cacPaybackMonths,
    grossMarginStatus, ltvCacStatus, runwayStatus, recurringRatioStatus, burnStatus, contributionStatus,
    mentoringTips, summary, insights,
  };
}

function generateInsights(metrics: {
  grossMargin: number;
  contributionMargin: number;
  ltvCacRatio: number;
  cacPaybackMonths: number;
  runwayMonths: number;
  recurringRatio: number;
  netBurn: number;
  burnMultiple: number;
  ltv: number;
  cac: number;
  arpu: number;
}): PitchDeckInsights {
  const { grossMargin, contributionMargin, ltvCacRatio, cacPaybackMonths, runwayMonths, recurringRatio, netBurn, burnMultiple, ltv, cac, arpu } = metrics;
  const guidance: string[] = [];
  let healthScore = 100;
  let investorReadiness: "excellent" | "good" | "needs-work" | "not-ready" = "excellent";
  
  // Helper to safely downgrade readiness without type errors
  const downgradeReadiness = (target: "good" | "needs-work" | "not-ready") => {
    if (investorReadiness === "excellent" || 
        (investorReadiness === "good" && target !== "good") ||
        (investorReadiness === "needs-work" && target === "not-ready")) {
      investorReadiness = target;
    }
  };

  // Gross Margin Analysis
  if (grossMargin > 60) {
    guidance.push("✓ Excellent Gross Margin (> 60%) — Strong pricing power and scalable business model.");
  } else if (grossMargin > 40) {
    healthScore -= 5;
    guidance.push("✓ Good Gross Margin (40-60%) — Healthy unit economics with room for optimization.");
  } else if (grossMargin > 20) {
    healthScore -= 15;
    downgradeReadiness("good");
    guidance.push("⚠️ Moderate Gross Margin (20-40%) — Margins need improvement. Review pricing strategy.");
  } else {
    healthScore -= 30;
    downgradeReadiness("needs-work");
    guidance.push("🚨 Low Gross Margin (< 20%) — Critical issue. Either reduce COGS or increase prices significantly.");
  }

  // Contribution Margin After CAC Analysis
  if (contributionMargin > 30) {
    guidance.push("✓ Strong Contribution After CAC (> 30%) — Plenty of room for fixed costs and profit.");
  } else if (contributionMargin > 0) {
    healthScore -= 10;
    downgradeReadiness("good");
    guidance.push("⚠️ Thin Contribution After CAC (0-30%) — Limited room for fixed costs. Optimize variable costs or CAC.");
  } else {
    healthScore -= 35;
    downgradeReadiness("needs-work");
    guidance.push("🚨 Negative Contribution After CAC — Each sale loses money after acquisition costs. Unsustainable!");
  }

  // LTV/CAC Analysis
  if (ltvCacRatio > 3) {
    guidance.push("✓ Excellent LTV/CAC (> 3x) — Highly investable unit economics. Investors love this ratio.");
  } else if (ltvCacRatio > 1.5) {
    healthScore -= 10;
    downgradeReadiness("good");
    guidance.push("📊 Good LTV/CAC (1.5-3x) — Unit economics work. Push toward 3x+ for Series A readiness.");
  } else if (ltvCacRatio >= 1) {
    healthScore -= 25;
    downgradeReadiness("needs-work");
    guidance.push("⚠️ Marginal LTV/CAC (1-1.5x) — Barely breaking even per customer. Needs improvement before scaling.");
  } else {
    healthScore -= 50;
    investorReadiness = "not-ready";
    guidance.push("🚨 Critical LTV/CAC (< 1x) — Losing money on every customer! Stop marketing, fix product first.");
  }

  // CAC Payback Analysis
  if (cacPaybackMonths < 6) {
    guidance.push("✓ Fast CAC Payback (< 6 months) — Capital-efficient growth. Great for bootstrapping or lean funding.");
  } else if (cacPaybackMonths < 12) {
    healthScore -= 5;
    guidance.push("📊 Reasonable CAC Payback (6-12 months) — Standard for SaaS. Ensure funding covers this period.");
  } else if (cacPaybackMonths < 18) {
    healthScore -= 15;
    downgradeReadiness("good");
    guidance.push("⚠️ Slow CAC Payback (12-18 months) — Requires significant working capital. Ensure strong runway.");
  } else {
    healthScore -= 25;
    downgradeReadiness("needs-work");
    guidance.push("🚨 Very Slow CAC Payback (> 18 months) — Capital-intensive model. Needs strong VC backing.");
  }

  // Runway Analysis
  if (runwayMonths === Infinity || runwayMonths > 18) {
    guidance.push("✓ Excellent Runway (> 18 months) — Strong financial position. Focus on growth milestones.");
  } else if (runwayMonths > 12) {
    healthScore -= 5;
    guidance.push("✓ Good Runway (12-18 months) — Comfortable position. Plan next funding round proactively.");
  } else if (runwayMonths > 6) {
    healthScore -= 15;
    downgradeReadiness("good");
    guidance.push("⚠️ Limited Runway (6-12 months) — Start fundraising now. Optimize burn rate.");
  } else {
    healthScore -= 40;
    downgradeReadiness("needs-work");
    guidance.push("🚨 Critical Runway (< 6 months) — Urgent fundraising or severe cost-cutting required.");
  }

  // Recurring Revenue Analysis
  if (recurringRatio > 80) {
    guidance.push("✓ High Recurring Revenue (> 80%) — Predictable revenue model. Premium SaaS valuation multiples.");
  } else if (recurringRatio > 60) {
    guidance.push("✓ Good Recurring Base (60-80%) — Strong subscription model with some variable component.");
  } else if (recurringRatio > 40) {
    healthScore -= 10;
    guidance.push("⚠️ Mixed Revenue (40-60% recurring) — Work on converting one-time to recurring revenue.");
  } else {
    healthScore -= 20;
    if (investorReadiness !== "not-ready") investorReadiness = "needs-work";
    guidance.push("🚨 Low Recurring Revenue (< 40%) — Heavy reliance on new sales. Build subscription offerings.");
  }

  // Burn Analysis
  if (netBurn <= 0) {
    guidance.push("✓ Cash Flow Positive — Revenue covers all costs. Exceptional for early-stage.");
  } else if (netBurn < 50000) {
    healthScore -= 10;
    guidance.push("📊 Controlled Burn (< ₹50k/month) — Manageable burn rate with proper funding.");
  } else if (netBurn < 200000) {
    healthScore -= 20;
    downgradeReadiness("good");
    guidance.push("⚠️ High Burn (₹50k-200k/month) — Requires significant capital. Ensure strong metrics to justify.");
  } else {
    healthScore -= 35;
    downgradeReadiness("needs-work");
    guidance.push("🚨 Very High Burn (> ₹200k/month) — Capital-intensive. Need exceptional growth to justify.");
  }

  // Specific recommendations
  if (ltvCacRatio < 3 && cac > 0) {
    const cacReductionTarget = Math.round((1 - (ltvCacRatio / 3)) * 100);
    guidance.push(`💡 Action: To reach 3x LTV/CAC, reduce CAC by ${cacReductionTarget}% or increase LTV by ${Math.round((3/ltvCacRatio - 1) * 100)}%.`);
  }

  if (contributionMargin < 20 && contributionMargin > 0) {
    guidance.push("💡 Action: Low contribution margin after CAC limits scalability. Focus on upsells or cost reduction.");
  }

  if (ltvCacRatio < 1.5 && cacPaybackMonths > 12) {
    guidance.push("🚨 Double Warning: Weak unit economics + slow payback = major fundraising challenge. Fix fundamentals first.");
  }

  // Determine overall status
  let overall: string;
  let overallColor: string;

  if (healthScore >= 80) {
    overall = "Excellent investor readiness! Strong metrics across all key dimensions.";
    overallColor = "text-success";
  } else if (healthScore >= 60) {
    overall = "Good foundation with some metrics needing improvement.";
    overallColor = "text-amber-400";
  } else if (healthScore >= 40) {
    overall = "Needs significant work on fundamentals before investor conversations.";
    overallColor = "text-orange-400";
  } else {
    overall = "Not ready for fundraising. Fix critical issues in unit economics and cash position.";
    overallColor = "text-danger";
  }

  // Add health score to guidance
  guidance.unshift(`📊 Investor Readiness Score: ${Math.max(0, healthScore)}/100`);

  return {
    overall,
    overallColor,
    guidance,
    healthScore: Math.max(0, healthScore),
    investorReadiness,
  };
}
