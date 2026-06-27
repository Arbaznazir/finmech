// ========================================================
// PITCH DECK KPIs – Excel sheet "Growth Stage"
// FINMECH-UPGRADED/2.Stand alone models/8.Pitchdeck KPIs.xlsx
// ========================================================

import { PITCHDECK_EXACT } from "@/lib/excel-model-content";

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
  monthlyChurnRate: number;
}

export type RAGStatus = "GREEN" | "AMBER" | "RED";
export type PitchTier = "BEST-IN-CLASS" | "IMPROVING" | "WEAK";

export interface MetricClassification {
  tier: PitchTier;
  rag: RAGStatus;
  message: string;
}

export interface MentoringTips {
  grossMargin: string;
  contribution: string;
  cac: string;
  ltv: string;
  ltvCac: string;
  recurring: string;
  netBurn: string;
  runway: string;
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
  monthlyChurnRate: number;
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
  revenuePerCustomer: number;
  servicingCostPerCustomer: number;
  churnAdjustedLtv: number;
  grossMarginStatus: RAGStatus;
  contributionStatus: RAGStatus;
  cacStatus: RAGStatus;
  ltvStatus: RAGStatus;
  ltvCacStatus: RAGStatus;
  recurringRatioStatus: RAGStatus;
  burnStatus: RAGStatus;
  runwayStatus: RAGStatus;
  classifications: Record<string, MetricClassification>;
  mentoringTips: MentoringTips;
  summary: SummaryFlags;
  insights: PitchDeckInsights;
}

export const INPUT_FIELDS: { key: keyof PitchDeckInputs; label: string; category: string; prefix: string }[] = [
  { key: "grossMonthlyRevenue", label: "Gross Monthly Revenue (net of refunds and discounts)", category: "Revenue", prefix: "₹" },
  { key: "recurringRevenue", label: "Recurring Revenue (Included in Gross revenue)", category: "Revenue", prefix: "₹" },
  { key: "cogs", label: "Cost of Goods Cost (COGS)", category: "Costs", prefix: "₹" },
  { key: "monthlyMarketingSpend", label: "Monthly Marketing Spend", category: "Costs", prefix: "₹" },
  { key: "variableCosts", label: "Variable Costs (includes COGS & Marketing spend)", category: "Costs", prefix: "₹" },
  { key: "fixedCosts", label: "Fixed Costs", category: "Costs", prefix: "₹" },
  { key: "customersAddedMonthly", label: "Customers Added (Monthly)", category: "Customers", prefix: "#" },
  { key: "activeCustomers", label: "Active Customers", category: "Customers", prefix: "#" },
  { key: "arpu", label: "Avg Price Per Customer (monthly) ARPU", category: "Customers", prefix: "₹" },
  { key: "averageCustomerLifetime", label: "Average Customers Lifetime (months)", category: "Customers", prefix: "#" },
  { key: "monthlyChurnRate", label: "Monthly Churn Rate (%)", category: "Customers", prefix: "%" },
  { key: "cashAvailable", label: "Cash Available", category: "Cash", prefix: "₹" },
  { key: "monthlyDebt", label: "Monthly Debt (Obligations if any)", category: "Cash", prefix: "₹" },
];

export function createEmptyInputs(): PitchDeckInputs {
  return {
    grossMonthlyRevenue: 0,
    recurringRevenue: 0,
    cogs: 0,
    monthlyMarketingSpend: 0,
    variableCosts: 0,
    fixedCosts: 0,
    customersAddedMonthly: 0,
    activeCustomers: 0,
    cashAvailable: 0,
    monthlyDebt: 0,
    averageCustomerLifetime: 0,
    arpu: 0,
    monthlyChurnRate: 0,
  };
}

function tierToRag(tier: PitchTier): RAGStatus {
  if (tier === "BEST-IN-CLASS") return "GREEN";
  if (tier === "IMPROVING") return "AMBER";
  return "RED";
}

function classifyGrossMargin(gm: number): MetricClassification {
  if (gm >= 0.6) {
    return { tier: "BEST-IN-CLASS", rag: "GREEN", message: "BEST-IN-CLASS: Strong gross margins indicate scalable unit economics." };
  }
  if (gm >= 0.4) {
    return { tier: "IMPROVING", rag: "AMBER", message: "IMPROVING: Margins acceptable but cost optimisation required." };
  }
  return { tier: "WEAK", rag: "RED", message: "WEAK: Low margins constrain profitable growth." };
}

function classifyContribution(cm: number): MetricClassification {
  if (cm >= 0.3) {
    return { tier: "BEST-IN-CLASS", rag: "GREEN", message: "BEST-IN-CLASS: Contribution economics support aggressive scaling." };
  }
  if (cm >= 0.15) {
    return { tier: "IMPROVING", rag: "AMBER", message: "IMPROVING: Positive contribution but CAC efficiency must improve." };
  }
  return { tier: "WEAK", rag: "RED", message: "WEAK: Contribution insufficient to fund growth." };
}

function classifyCac(cac: number, revenuePerCustomer: number): MetricClassification {
  if (revenuePerCustomer <= 0) {
    return { tier: "WEAK", rag: "RED", message: "WEAK: High CAC threatens growth sustainability." };
  }
  if (cac <= 0.25 * revenuePerCustomer) {
    return { tier: "BEST-IN-CLASS", rag: "GREEN", message: "BEST-IN-CLASS: Customer acquisition highly efficient." };
  }
  if (cac <= 0.5 * revenuePerCustomer) {
    return { tier: "IMPROVING", rag: "AMBER", message: "IMPROVING: CAC manageable but optimisation required." };
  }
  return { tier: "WEAK", rag: "RED", message: "WEAK: High CAC threatens growth sustainability." };
}

function classifyLtv(ltv: number, cac: number): MetricClassification {
  if (ltv >= 5 * cac) {
    return { tier: "BEST-IN-CLASS", rag: "GREEN", message: "BEST-IN-CLASS: Strong lifetime value supports capital efficiency" };
  }
  if (ltv >= 3 * cac) {
    return { tier: "IMPROVING", rag: "AMBER", message: "IMPROVING: LTV acceptable but retention upside exists." };
  }
  return { tier: "WEAK", rag: "RED", message: "WEAK: Limited value extraction from customers." };
}

function classifyLtvCac(ratio: number): MetricClassification {
  if (ratio >= 5) {
    return { tier: "BEST-IN-CLASS", rag: "GREEN", message: "BEST-IN-CLASS: Exceptional unit economics." };
  }
  if (ratio >= 3) {
    return { tier: "IMPROVING", rag: "AMBER", message: "IMPROVING: Healthy but not investor-grade yet." };
  }
  return { tier: "WEAK", rag: "RED", message: "WEAK: Unit economics unattractive for growth capital." };
}

function classifyRecurring(ratio: number): MetricClassification {
  if (ratio >= 0.6) {
    return { tier: "BEST-IN-CLASS", rag: "GREEN", message: "BEST-IN-CLASS: High revenue predictability and visibility." };
  }
  if (ratio >= 0.3) {
    return { tier: "IMPROVING", rag: "AMBER", message: "IMPROVING: Partial revenue stability achieved." };
  }
  return { tier: "WEAK", rag: "RED", message: "WEAK: Revenue volatility increases risk." };
}

function classifyNetBurn(netBurn: number, variableCosts: number, fixedCosts: number): MetricClassification {
  if (netBurn <= 0) {
    return {
      tier: "BEST-IN-CLASS",
      rag: "GREEN",
      message: "Efficient cash flow management: Business is self-sustaining and on a growth curve.",
    };
  }
  if (netBurn <= variableCosts + fixedCosts) {
    return { tier: "BEST-IN-CLASS", rag: "GREEN", message: "BEST-IN-CLASS: Burn tightly controlled. Try generating more cash." };
  }
  return { tier: "WEAK", rag: "RED", message: "WEAK: Excessive burn relative to scale. Dangerous signs. Improve your cash flow." };
}

function classifyRunway(runwayMonths: number): MetricClassification {
  if (runwayMonths >= 18) {
    return { tier: "BEST-IN-CLASS", rag: "GREEN", message: "BEST-IN-CLASS: Comfortable runway enabling strategic growth." };
  }
  if (runwayMonths >= 9) {
    return { tier: "IMPROVING", rag: "AMBER", message: "IMPROVING: Adequate but execution-sensitive runway." };
  }
  return { tier: "WEAK", rag: "RED", message: "WEAK: Funding risk within short horizon." };
}

export function calculatePitchDeck(inputs: PitchDeckInputs): PitchDeckResults {
  const {
    grossMonthlyRevenue: rev,
    recurringRevenue,
    cogs,
    monthlyMarketingSpend,
    variableCosts,
    fixedCosts,
    customersAddedMonthly,
    activeCustomers,
    cashAvailable,
    monthlyDebt,
    arpu,
    monthlyChurnRate,
  } = inputs;

  const grossMarginRaw = rev > 0 ? (rev - cogs) / rev : 0;
  const contributionRaw = rev > 0 ? (rev - variableCosts) / rev : 0;
  const cac = customersAddedMonthly > 0 ? monthlyMarketingSpend / customersAddedMonthly : 0;
  const ltv =
    monthlyChurnRate > 0 ? (arpu * grossMarginRaw) / monthlyChurnRate : 0;
  const ltvCacRatio = cac > 0 ? ltv / cac : 0;
  const recurringRatioRaw = rev > 0 ? recurringRevenue / rev : 0;

  const netBurn = rev >= variableCosts + fixedCosts ? 0 : variableCosts + fixedCosts - rev;
  const runwayMonths = netBurn > 0 ? cashAvailable / netBurn : Infinity;

  const revenuePerCustomer = activeCustomers > 0 ? rev / activeCustomers : 0;
  const servicingCostPerCustomer = activeCustomers > 0 ? cogs / activeCustomers : 0;
  const churnAdjustedLtv = monthlyChurnRate > 0 ? arpu / (monthlyChurnRate / 100) : 0;
  const burnMultiple = rev > 0 ? netBurn / rev : 0;
  const cashEfficiencyRatio = variableCosts + fixedCosts > 0 ? rev / (variableCosts + fixedCosts) : 0;
  const cacPaybackMonths = revenuePerCustomer > 0 ? cac / revenuePerCustomer : 0;

  const classifications = {
    "Gross Margin": classifyGrossMargin(grossMarginRaw),
    "Contribution Margin": classifyContribution(contributionRaw),
    CAC: classifyCac(cac, revenuePerCustomer),
    LTV: classifyLtv(ltv, cac),
    "LTV/CAC": classifyLtvCac(ltvCacRatio),
    "Recurring Revenue Ratio": classifyRecurring(recurringRatioRaw),
    "Net Burn": classifyNetBurn(netBurn, variableCosts, fixedCosts),
    "Runway (Months)": classifyRunway(runwayMonths === Infinity ? 99 : runwayMonths),
  };

  const mentoringTips: MentoringTips = {
    grossMargin: classifications["Gross Margin"].message,
    contribution: classifications["Contribution Margin"].message,
    cac: classifications.CAC.message,
    ltv: classifications.LTV.message,
    ltvCac: classifications["LTV/CAC"].message,
    recurring: classifications["Recurring Revenue Ratio"].message,
    netBurn: classifications["Net Burn"].message,
    runway: classifications["Runway (Months)"].message,
  };

  const summary: SummaryFlags = {
    isUnitEconomicsPositive: ltvCacRatio >= 3 && grossMarginRaw >= 0.4 && contributionRaw >= 0.15,
    isCACRecoverable: ltvCacRatio >= 3 && cacPaybackMonths < 12,
    isBurnControlled: netBurn <= 0 || runwayMonths >= 9,
    canScaleImproveMargins: contributionRaw >= 0.3 && grossMarginRaw >= 0.6,
  };

  const ragStatuses = Object.values(classifications).map((c) => c.rag);
  const greenCount = ragStatuses.filter((s) => s === "GREEN").length;
  const healthScore = Math.round((greenCount / ragStatuses.length) * 100);

  const worst = Object.values(classifications).find((c) => c.rag === "RED")
    ?? Object.values(classifications).find((c) => c.rag === "AMBER")
    ?? classifications["Gross Margin"];

  const guidance = Object.entries(classifications).map(
    ([metric, c]) => `${metric}: ${c.message}`,
  );

  const insights: PitchDeckInsights = {
    overall: worst.message,
    overallColor: worst.rag === "GREEN" ? "text-success" : worst.rag === "AMBER" ? "text-amber-400" : "text-danger",
    guidance: guidance.length > 0 ? guidance : [...PITCHDECK_EXACT.smartReportLines],
    healthScore,
    investorReadiness:
      healthScore >= 75 ? "excellent" : healthScore >= 50 ? "good" : healthScore >= 25 ? "needs-work" : "not-ready",
  };

  return {
    grossMonthlyRevenue: rev,
    recurringRevenue,
    cogs,
    monthlyMarketingSpend,
    variableCosts,
    fixedCosts,
    customersAddedMonthly,
    activeCustomers,
    cashAvailable,
    monthlyDebt,
    arpu,
    monthlyChurnRate,
    grossMargin: grossMarginRaw * 100,
    contributionMarginAfterCAC: contributionRaw * 100,
    cac,
    ltv,
    ltvCacRatio,
    recurringRevenueRatio: recurringRatioRaw * 100,
    netBurn,
    runwayMonths,
    burnMultiple,
    cashEfficiencyRatio,
    cacPaybackMonths,
    revenuePerCustomer,
    servicingCostPerCustomer,
    churnAdjustedLtv,
    grossMarginStatus: classifications["Gross Margin"].rag,
    contributionStatus: classifications["Contribution Margin"].rag,
    cacStatus: classifications.CAC.rag,
    ltvStatus: classifications.LTV.rag,
    ltvCacStatus: classifications["LTV/CAC"].rag,
    recurringRatioStatus: classifications["Recurring Revenue Ratio"].rag,
    burnStatus: classifications["Net Burn"].rag,
    runwayStatus: classifications["Runway (Months)"].rag,
    classifications,
    mentoringTips,
    summary,
    insights,
  };
}
