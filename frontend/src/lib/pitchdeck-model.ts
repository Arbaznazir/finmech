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
  // RAG
  grossMarginStatus: RAGStatus;
  ltvCacStatus: RAGStatus;
  runwayStatus: RAGStatus;
  recurringRatioStatus: RAGStatus;
  burnStatus: RAGStatus;
  // Tips & summary
  mentoringTips: MentoringTips;
  summary: SummaryFlags;
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

  const grossMarginRaw = grossMonthlyRevenue > 0 ? (grossMonthlyRevenue - cogs) / grossMonthlyRevenue : 0;
  const totalVariableCost = variableCosts || (cogs + monthlyMarketingSpend);
  const contributionRaw = grossMonthlyRevenue > 0
    ? (grossMonthlyRevenue - totalVariableCost - monthlyMarketingSpend) / grossMonthlyRevenue
    : 0;

  const cac = customersAddedMonthly > 0 ? monthlyMarketingSpend / customersAddedMonthly : 0;
  const ltv = averageCustomerLifetime > 0 ? arpu * averageCustomerLifetime : 0;
  const ltvCacRatio = cac > 0 ? ltv / cac : 0;

  const recurringRatioRaw = grossMonthlyRevenue > 0 ? recurringRevenue / grossMonthlyRevenue : 0;

  const netBurn = totalVariableCost + fixedCosts - grossMonthlyRevenue;
  const runwayMonths = netBurn <= 0 ? Infinity : cashAvailable / Math.abs(netBurn);

  const burnMultiple = grossMonthlyRevenue > 0 ? netBurn / grossMonthlyRevenue : 0;
  const totalCosts = totalVariableCost + fixedCosts;
  const cashEfficiencyRatio = totalCosts > 0 ? grossMonthlyRevenue / totalCosts : 0;

  // RAG
  const grossMarginStatus: RAGStatus = grossMarginRaw > 0.4 ? "GREEN" : grossMarginRaw > 0.2 ? "AMBER" : "RED";
  const ltvCacStatus: RAGStatus = ltvCacRatio > 3 ? "GREEN" : ltvCacRatio > 1 ? "AMBER" : "RED";
  const runwayStatus: RAGStatus = runwayMonths === Infinity || runwayMonths > 12 ? "GREEN" : runwayMonths > 6 ? "AMBER" : "RED";
  const recurringRatioStatus: RAGStatus = recurringRatioRaw * 100 > 70 ? "GREEN" : recurringRatioRaw * 100 > 40 ? "AMBER" : "RED";
  const burnStatus: RAGStatus = netBurn < 0 ? "GREEN" : "RED";

  const mentoringTips: MentoringTips = {
    grossMargin: grossMarginRaw > 0.4 ? "Strong unit economics. Focus on scaling." : "Low margins. Review pricing or costs.",
    ltvCac: ltvCacRatio > 3 ? "Excellent unit economics." : "LTV/CAC too low. Improve retention or reduce CAC.",
    runway: runwayMonths === Infinity || runwayMonths > 12 ? "Strong survival runway." : "Runway is short. Focus on cash preservation.",
    recurring: recurringRatioRaw > 0.7 ? "High revenue predictability." : "Improve recurring revenue share.",
  };

  const summary: SummaryFlags = {
    isUnitEconomicsPositive: ltvCacRatio > 1 && grossMarginRaw > 0.2,
    isCACRecoverable: ltvCacRatio > 1,
    isBurnControlled: netBurn < 0 || runwayMonths > 6,
    canScaleImproveMargins: contributionRaw > 0.3,
  };

  return {
    grossMonthlyRevenue, recurringRevenue, cogs,
    monthlyMarketingSpend, variableCosts, fixedCosts,
    customersAddedMonthly, activeCustomers, cashAvailable,
    monthlyDebt, arpu,
    grossMargin: grossMarginRaw * 100,
    contributionMarginAfterCAC: contributionRaw * 100,
    cac, ltv, ltvCacRatio,
    recurringRevenueRatio: recurringRatioRaw * 100,
    netBurn, runwayMonths, burnMultiple, cashEfficiencyRatio,
    grossMarginStatus, ltvCacStatus, runwayStatus, recurringRatioStatus, burnStatus,
    mentoringTips, summary,
  };
}
