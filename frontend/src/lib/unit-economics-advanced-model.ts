// ========================================================
// UNIT ECONOMICS ADVANCED MODEL – INVESTOR GRADE
// Exact match to "6.Unit Economics -Advanced Model.xlsx"
// Full MRR tracking, GRR, NRR, Rule of 40, Contribution
// Margin, CAC Payback, cohort metrics
// ========================================================

export const MONTHS_ORDER = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export type MonthName = (typeof MONTHS_ORDER)[number];

export interface UEAdvancedMonthInputs {
  [key: string]: number;
  "Beginning Customers": number;
  "New Customers Acquired": number;
  "Customers Churned": number;
  "ARPU (Monthly)": number;
  "Variable Cost per Customer": number;
  "Marketing Spend": number;
  "Fixed Costs": number;
}

export const INPUT_FIELDS: { key: string; label: string; category: string; prefix: string }[] = [
  // Customers
  { key: "Beginning Customers", label: "Beginning Customers", category: "Customers", prefix: "#" },
  { key: "New Customers Acquired", label: "New Customers Acquired", category: "Customers", prefix: "#" },
  { key: "Customers Churned", label: "Customers Churned", category: "Customers", prefix: "#" },
  // Revenue & Costs
  { key: "ARPU (Monthly)", label: "ARPU (Monthly)", category: "Revenue & Costs", prefix: "$" },
  { key: "Variable Cost per Customer", label: "Variable Cost / Customer", category: "Revenue & Costs", prefix: "$" },
  { key: "Marketing Spend", label: "Marketing Spend", category: "Revenue & Costs", prefix: "$" },
  { key: "Fixed Costs", label: "Fixed Costs", category: "Revenue & Costs", prefix: "$" },
];

export function createEmptyInputs(): Record<string, number> {
  const empty: Record<string, number> = {};
  INPUT_FIELDS.forEach((f) => { empty[f.key] = 0; });
  return empty;
}

// ================== COMPUTED FIELDS ==================

export interface ComputedUEAdvancedMonth {
  [key: string]: number | string;
  // Inputs (carried forward)
  "Beginning Customers": number;
  "New Customers Acquired": number;
  "Customers Churned": number;
  "ARPU (Monthly)": number;
  "Variable Cost per Customer": number;
  "Marketing Spend": number;
  "Fixed Costs": number;
  // Customer metrics
  "Ending Customers": number;
  "Customer Growth %": number;
  // Revenue
  "Gross Revenue": number;
  "Variable Cost": number;
  "Contribution Margin": number;
  "Contribution Margin %": number;
  // Unit economics
  "CAC": number;
  "Churn Rate": number;
  "Retention %": number;
  "LTV": number;
  "LTV/CAC Ratio": number;
  "CAC Payback (Months)": number;
  // MRR tracking
  "Beginning MRR": number;
  "New MRR": number;
  "Churned MRR": number;
  "Ending MRR": number;
  "MRR Growth %": number;
  // Retention metrics
  "Gross Revenue Retention (GRR)": number;
  "Net Revenue Retention (NRR)": number;
  "Revenue Growth %": number;
  // Composite
  "Rule of 40": number;
  // RAG
  "RAG Status": string;
}

export type RAGStatus = "GREEN" | "AMBER" | "RED";

export interface MonthStatus {
  month: string;
  rag: RAGStatus;
  ltvCacRatio: number;
  churnRate: number;
  growthRate: number;
  nrr: number;
  ruleOf40: number;
}

export interface UEAdvancedResults {
  monthlyData: Record<string, ComputedUEAdvancedMonth>;
  status: MonthStatus[];
  monthsAdded: string[];
  summary: {
    avgCAC: number;
    avgLTV: number;
    avgLTVCAC: number;
    avgChurnRate: number;
    avgGrowthRate: number;
    avgNRR: number;
    avgGRR: number;
    avgContributionMargin: number;
    avgRuleOf40: number;
    totalRevenue: number;
    totalContributionMargin: number;
    endingCustomers: number;
    endingMRR: number;
  };
}

// ================== RAG ==================

function getRAG(m: ComputedUEAdvancedMonth): RAGStatus {
  const ltvCac = Number(m["LTV/CAC Ratio"]) || 0;
  const churn = Number(m["Churn Rate"]) || 0;
  const nrr = Number(m["Net Revenue Retention (NRR)"]) || 0;
  const ruleOf40 = Number(m["Rule of 40"]) || 0;

  if (ltvCac >= 3 && churn < 0.05 && nrr >= 1.0 && ruleOf40 >= 0.40) return "GREEN";
  if (ltvCac >= 1.5 && churn < 0.10 && nrr >= 0.85) return "AMBER";
  return "RED";
}

// ================== CALCULATION ENGINE ==================

export function calculateUnitEconomicsAdvanced(
  monthsData: Record<string, Record<string, number>>
): UEAdvancedResults {
  const computed: Record<string, ComputedUEAdvancedMonth> = {};
  const addedMonths: string[] = [];

  MONTHS_ORDER.forEach((month) => {
    if (!monthsData[month]) return;
    addedMonths.push(month);

    const raw = monthsData[month];
    const m: Record<string, number | string> = { ...raw };

    const beginCust = Number(raw["Beginning Customers"]) || 0;
    const newCust = Number(raw["New Customers Acquired"]) || 0;
    const churned = Number(raw["Customers Churned"]) || 0;
    const arpu = Number(raw["ARPU (Monthly)"]) || 0;
    const varCostPerCust = Number(raw["Variable Cost per Customer"]) || 0;
    const marketingSpend = Number(raw["Marketing Spend"]) || 0;
    const fixedCosts = Number(raw["Fixed Costs"]) || 0;

    // === CUSTOMER METRICS ===
    const endingCust = beginCust + newCust - churned;
    m["Ending Customers"] = endingCust;
    m["Customer Growth %"] = beginCust > 0
      ? (endingCust - beginCust) / beginCust
      : 0;

    // === REVENUE & CONTRIBUTION ===
    m["Gross Revenue"] = endingCust * arpu;
    m["Variable Cost"] = endingCust * varCostPerCust;
    m["Contribution Margin"] = Number(m["Gross Revenue"]) - Number(m["Variable Cost"]);
    m["Contribution Margin %"] = Number(m["Gross Revenue"]) > 0
      ? Number(m["Contribution Margin"]) / Number(m["Gross Revenue"])
      : 0;

    // === UNIT ECONOMICS ===
    m["CAC"] = newCust > 0 ? marketingSpend / newCust : 0;

    m["Churn Rate"] = beginCust > 0 ? churned / beginCust : 0;
    m["Retention %"] = 1 - Number(m["Churn Rate"]);

    m["LTV"] = Number(m["Churn Rate"]) > 0 ? arpu / Number(m["Churn Rate"]) : 0;
    m["LTV/CAC Ratio"] = Number(m["CAC"]) > 0 ? Number(m["LTV"]) / Number(m["CAC"]) : 0;

    // CAC Payback = CAC / (Contribution per customer per month)
    const contribPerCust = arpu - varCostPerCust;
    m["CAC Payback (Months)"] = contribPerCust > 0 ? Number(m["CAC"]) / contribPerCust : 0;

    // === MRR TRACKING ===
    m["Beginning MRR"] = beginCust * arpu;
    m["New MRR"] = newCust * arpu;
    m["Churned MRR"] = churned * arpu;
    m["Ending MRR"] = endingCust * arpu;

    m["MRR Growth %"] = Number(m["Beginning MRR"]) > 0
      ? (Number(m["Ending MRR"]) - Number(m["Beginning MRR"])) / Number(m["Beginning MRR"])
      : 0;

    // === RETENTION METRICS ===
    m["Gross Revenue Retention (GRR)"] = Number(m["Beginning MRR"]) > 0
      ? (Number(m["Ending MRR"]) - Number(m["New MRR"])) / Number(m["Beginning MRR"])
      : 0;

    m["Net Revenue Retention (NRR)"] = Number(m["Beginning MRR"]) > 0
      ? Number(m["Ending MRR"]) / Number(m["Beginning MRR"])
      : 0;

    m["Revenue Growth %"] = Number(m["Beginning MRR"]) > 0
      ? (Number(m["Ending MRR"]) - Number(m["Beginning MRR"])) / Number(m["Beginning MRR"])
      : 0;

    // === RULE OF 40 ===
    m["Rule of 40"] = Number(m["Revenue Growth %"]) + Number(m["Contribution Margin %"]);

    // === RAG ===
    m["RAG Status"] = getRAG(m as unknown as ComputedUEAdvancedMonth);

    // Carry forward fixed costs for reference
    m["Fixed Costs"] = fixedCosts;

    computed[month] = m as unknown as ComputedUEAdvancedMonth;
  });

  // Status array
  const status: MonthStatus[] = addedMonths.map((month) => {
    const c = computed[month];
    return {
      month,
      rag: c["RAG Status"] as RAGStatus,
      ltvCacRatio: Number(c["LTV/CAC Ratio"]) || 0,
      churnRate: Number(c["Churn Rate"]) || 0,
      growthRate: Number(c["Customer Growth %"]) || 0,
      nrr: Number(c["Net Revenue Retention (NRR)"]) || 0,
      ruleOf40: Number(c["Rule of 40"]) || 0,
    };
  });

  // Summary
  const avg = (field: string) => {
    if (addedMonths.length === 0) return 0;
    return addedMonths.reduce((sum, m) => sum + (Number(computed[m][field]) || 0), 0) / addedMonths.length;
  };
  const sum = (field: string) => {
    return addedMonths.reduce((s, m) => s + (Number(computed[m][field]) || 0), 0);
  };
  const lastMonth = addedMonths.length > 0 ? computed[addedMonths[addedMonths.length - 1]] : null;

  const summary = {
    avgCAC: avg("CAC"),
    avgLTV: avg("LTV"),
    avgLTVCAC: avg("LTV/CAC Ratio"),
    avgChurnRate: avg("Churn Rate"),
    avgGrowthRate: avg("Customer Growth %"),
    avgNRR: avg("Net Revenue Retention (NRR)"),
    avgGRR: avg("Gross Revenue Retention (GRR)"),
    avgContributionMargin: avg("Contribution Margin %"),
    avgRuleOf40: avg("Rule of 40"),
    totalRevenue: sum("Gross Revenue"),
    totalContributionMargin: sum("Contribution Margin"),
    endingCustomers: lastMonth ? Number(lastMonth["Ending Customers"]) : 0,
    endingMRR: lastMonth ? Number(lastMonth["Ending MRR"]) : 0,
  };

  return { monthlyData: computed, status, monthsAdded: addedMonths, summary };
}

// Output fields for monthly results display
export const OUTPUT_FIELDS: { key: string; label: string; format: "currency" | "number" | "percent" | "ratio" | "months" | "rag" }[] = [
  // Customers
  { key: "Ending Customers", label: "Ending Customers", format: "number" },
  { key: "Customer Growth %", label: "Customer Growth", format: "percent" },
  // Revenue
  { key: "Gross Revenue", label: "Gross Revenue", format: "currency" },
  { key: "Variable Cost", label: "Variable Cost", format: "currency" },
  { key: "Contribution Margin", label: "Contribution Margin", format: "currency" },
  { key: "Contribution Margin %", label: "Contribution Margin %", format: "percent" },
  // Unit Economics
  { key: "CAC", label: "CAC", format: "currency" },
  { key: "LTV", label: "LTV", format: "currency" },
  { key: "LTV/CAC Ratio", label: "LTV/CAC Ratio", format: "ratio" },
  { key: "Churn Rate", label: "Churn Rate", format: "percent" },
  { key: "Retention %", label: "Retention", format: "percent" },
  { key: "CAC Payback (Months)", label: "CAC Payback", format: "months" },
  // MRR
  { key: "Beginning MRR", label: "Beginning MRR", format: "currency" },
  { key: "New MRR", label: "New MRR", format: "currency" },
  { key: "Churned MRR", label: "Churned MRR", format: "currency" },
  { key: "Ending MRR", label: "Ending MRR", format: "currency" },
  { key: "MRR Growth %", label: "MRR Growth", format: "percent" },
  // Retention
  { key: "Gross Revenue Retention (GRR)", label: "GRR", format: "percent" },
  { key: "Net Revenue Retention (NRR)", label: "NRR", format: "percent" },
  // Composite
  { key: "Revenue Growth %", label: "Revenue Growth", format: "percent" },
  { key: "Rule of 40", label: "Rule of 40", format: "percent" },
  // RAG
  { key: "RAG Status", label: "Status", format: "rag" },
];
