// ========================================================
// UNIT ECONOMICS BASICS – FULL EXCEL MATCH
// Month-by-month → CAC, LTV, ARPU, Payback, Churn,
// Growth Rate + RAG classification
// ========================================================

import { excelRagCommentary } from "@/lib/excel-model-content";

export const MONTHS_ORDER = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

/** Excel assumptions (Q8 gross margin, Q9 avg lifespan, Q11 baseline ARPU). */
export const UE_ASSUMPTIONS = {
  grossMarginRate: 0.08,
  avgLifespanMonths: 3,
  baselineArpu: 5000,
} as const;

export type MonthName = (typeof MONTHS_ORDER)[number];

export interface UEMonthInputs {
  [key: string]: number | string;
  "Sales Revenue": number;
  "Marketing Spend": number;
  "Customers at the beginning": number;
  "New Customers": number;
  "Churned Customers": number;
}

export const INPUT_FIELDS: { key: string; label: string; category: string; prefix: string }[] = [
  { key: "Sales Revenue", label: "Sales Revenue", category: "Revenue", prefix: "₹" },
  { key: "Marketing Spend", label: "Marketing Spend", category: "Revenue", prefix: "₹" },
  { key: "Customers at the beginning", label: "Customers at Beginning", category: "Customers", prefix: "#" },
  { key: "New Customers", label: "New Customers", category: "Customers", prefix: "#" },
  { key: "Churned Customers", label: "Churned Customers", category: "Customers", prefix: "#" },
];

export function createEmptyInputs(): Record<string, number> {
  const empty: Record<string, number> = {};
  INPUT_FIELDS.forEach((f) => { empty[f.key] = 0; });
  return empty;
}

export interface ComputedUEMonth {
  [key: string]: number | string;
  "Sales Revenue": number;
  "Marketing Spend": number;
  "Customers at the beginning": number;
  "New Customers": number;
  "Churned Customers": number;
  "Total Customers": number;
  "Total Active Customers (Monthly)": number;
  "CAC": number;
  "ARPU": number;
  "Churn Rate %": number;
  "LTV": number;
  "CAC Payback Period (Months)": number;
  "Growth Rate %": number;
  "KPI Summary Dashboard": string;
}

export type RAGStatus = "GREEN" | "AMBER" | "RED";

export interface MonthStatus {
  month: string;
  rag: RAGStatus;
  ltvCacRatio: number;
  churnRate: number;
  growthRate: number;
}

export interface UEInsights {
  overall: string;
  overallColor: string;
  guidance: string[];
  healthScore: number;
  unitEconomicsGrade: "excellent" | "good" | "weak" | "critical";
}

export interface MonthStatusWithInsights extends MonthStatus {
  insights: UEInsights;
}

export interface UnitEconomicsResults {
  monthlyData: Record<string, ComputedUEMonth>;
  status: MonthStatusWithInsights[];
  monthsAdded: string[];
}

// ================== RAG & INSIGHTS ==================

export function computeLtvCacRatio(
  ltv: number,
  cac: number,
): number {
  if (cac > 0) return ltv / cac;
  return 0;
}

function ragForCacExcel(cac: number, arpu: number): RAGStatus {
  if (arpu <= 0) return "RED";
  if (cac <= 0.5 * arpu) return "GREEN";
  if (cac <= arpu) return "AMBER";
  return "RED";
}

function ragForLtvExcel(ltv: number, cac: number): RAGStatus {
  if (cac <= 0 && ltv > 0) return "GREEN";
  if (ltv >= 3 * cac) return "GREEN";
  if (ltv >= 1.5 * cac) return "AMBER";
  return "RED";
}

function ragForArpuExcel(arpu: number, priorArpu: number): RAGStatus {
  if (arpu >= priorArpu) return "GREEN";
  if (arpu >= 0.9 * priorArpu) return "AMBER";
  return "RED";
}

function ragForPaybackExcel(months: number): RAGStatus {
  if (months <= 3) return "GREEN";
  if (months <= 6) return "AMBER";
  return "RED";
}

function ragForChurnExcel(churnDecimal: number): RAGStatus {
  if (churnDecimal <= 0.03) return "GREEN";
  if (churnDecimal <= 0.06) return "AMBER";
  return "RED";
}

function ragForGrowthExcel(growthDecimal: number): RAGStatus {
  if (growthDecimal >= 0.1) return "GREEN";
  if (growthDecimal >= 0.05) return "AMBER";
  return "RED";
}

function worstRag(...statuses: RAGStatus[]): RAGStatus {
  if (statuses.includes("RED")) return "RED";
  if (statuses.includes("AMBER")) return "AMBER";
  return "GREEN";
}

/** KPI Summary — worst of six Excel mentoring metrics. */
export function getRAG(m: Record<string, number | string>, priorArpu: number): RAGStatus {
  const cac = Number(m["CAC"]) || 0;
  const ltv = Number(m["LTV"]) || 0;
  const arpu = Number(m["ARPU"]) || 0;
  const payback = Number(m["CAC Payback Period (Months)"]) || 0;
  const churnDecimal = (Number(m["Churn Rate %"]) || 0) / 100;
  const growthDecimal = (Number(m["Growth Rate %"]) || 0) / 100;

  return worstRag(
    ragForCacExcel(cac, arpu),
    ragForLtvExcel(ltv, cac),
    ragForArpuExcel(arpu, priorArpu),
    ragForPaybackExcel(payback),
    ragForChurnExcel(churnDecimal),
    ragForGrowthExcel(growthDecimal),
  );
}

function generateInsights(metrics: {
  ltv: number;
  cac: number;
  ltvCacRatio: number;
  churnRate: number;
  arpu: number;
  cacPaybackMonths: number;
  growthRate: number;
}): UEInsights {
  const { ltv, cac, ltvCacRatio, churnRate, cacPaybackMonths, growthRate, arpu } = metrics;
  const guidance: string[] = [];
  const churnDecimal = churnRate / 100;
  const growthDecimal = growthRate / 100;

  const metricRags: { metric: string; rag: RAGStatus }[] = [
    { metric: "CAC", rag: ragForCacExcel(cac, arpu) },
    { metric: "LTV", rag: ragForLtvExcel(ltv, cac) },
    { metric: "CAC Payback Period (Months)", rag: ragForPaybackExcel(cacPaybackMonths) },
    { metric: "Churn Rate %", rag: ragForChurnExcel(churnDecimal) },
    { metric: "Growth Rate %", rag: ragForGrowthExcel(growthDecimal) },
  ];

  for (const { metric, rag } of metricRags) {
    const msg = excelRagCommentary(metric, rag);
    if (msg) guidance.push(`${rag}: ${msg}`);
  }

  const rag = worstRag(...metricRags.map((m) => m.rag));

  const worstMetric = metricRags.find((m) => m.rag === rag);
  const overallMsg = worstMetric ? excelRagCommentary(worstMetric.metric, rag) : "";
  const overallColor =
    rag === "GREEN" ? "text-success" : rag === "AMBER" ? "text-amber-400" : "text-danger";

  return {
    overall: overallMsg ?? "",
    overallColor,
    guidance,
    healthScore: 0,
    unitEconomicsGrade: rag === "GREEN" ? "excellent" : rag === "AMBER" ? "good" : "critical",
  };
}

// ================== ENGINE ==================

export function calculateUnitEconomics(
  monthsData: Record<string, Record<string, number>>
): UnitEconomicsResults {
  const computed: Record<string, ComputedUEMonth> = {};
  const addedMonths: string[] = [];
  let prevCustomers = 0;
  let prevArpu = UE_ASSUMPTIONS.baselineArpu;
  let prevTotalCustomers = 0;
  let isFirstMonth = true;

  MONTHS_ORDER.forEach((month) => {
    if (!monthsData[month]) return;
    addedMonths.push(month);

    const raw = monthsData[month];
    const m: Record<string, number | string> = { ...raw };

    const salesRevenue = Number(raw["Sales Revenue"]) || 0;
    const marketingSpend = Number(raw["Marketing Spend"]) || 0;
    const custBegin = Number(raw["Customers at the beginning"]) || prevCustomers;
    const newCust = Number(raw["New Customers"]) || 0;
    const churned = Number(raw["Churned Customers"]) || 0;

    m["Sales Revenue"] = salesRevenue;
    m["Marketing Spend"] = marketingSpend;
    m["Customers at the beginning"] = custBegin;
    m["New Customers"] = newCust;
    m["Churned Customers"] = churned;

    const totalCustomers = custBegin + newCust - churned;
    m["Total Customers"] = totalCustomers;
    m["Total Active Customers (Monthly)"] = (custBegin + totalCustomers) / 2;

    m["CAC"] = newCust > 0 ? marketingSpend / newCust : 0;
    const activeCustomers = Number(m["Total Active Customers (Monthly)"]);
    m["ARPU"] = activeCustomers > 0 ? salesRevenue / activeCustomers : 0;

    const churnDecimal = totalCustomers > 0 ? churned / totalCustomers : 0;
    m["Churn Rate %"] = churnDecimal * 100;

    m["LTV"] =
      Number(m["ARPU"]) * UE_ASSUMPTIONS.grossMarginRate * UE_ASSUMPTIONS.avgLifespanMonths;

    const contributionArpu = Number(m["ARPU"]) * UE_ASSUMPTIONS.grossMarginRate;
    m["CAC Payback Period (Months)"] =
      contributionArpu > 0 ? Number(m["CAC"]) / contributionArpu : 0;

    const growthDecimal = isFirstMonth
      ? (totalCustomers > 0 ? (newCust - churned) / totalCustomers : 0)
      : (prevTotalCustomers > 0 ? (totalCustomers - prevTotalCustomers) / prevTotalCustomers : 0);
    m["Growth Rate %"] = growthDecimal * 100;

    prevCustomers = totalCustomers;
    prevTotalCustomers = totalCustomers;
    isFirstMonth = false;

    m["KPI Summary Dashboard"] = getRAG(m, prevArpu);
    prevArpu = Number(m["ARPU"]);

    computed[month] = m as unknown as ComputedUEMonth;
  });

  const status: MonthStatusWithInsights[] = addedMonths.map((month) => {
    const c = computed[month];
    const cac = Number(c["CAC"]) || 0;
    const ltv = Number(c["LTV"]) || 0;
    const arpu = Number(c["ARPU"]) || 0;
    const churnRate = Number(c["Churn Rate %"]) || 0;
    const growthRate = Number(c["Growth Rate %"]) || 0;
    const cacPayback = Number(c["CAC Payback Period (Months)"]) || 0;
    const ltvCacRatio = computeLtvCacRatio(ltv, cac);

    // Generate insights for this month
    const insights = generateInsights({
      ltv,
      cac,
      ltvCacRatio,
      churnRate,
      arpu,
      cacPaybackMonths: cacPayback,
      growthRate,
    });

    return {
      month,
      rag: c["KPI Summary Dashboard"] as RAGStatus,
      ltvCacRatio,
      churnRate,
      growthRate,
      insights,
    };
  });

  return { monthlyData: computed, status, monthsAdded: addedMonths };
}

export const OUTPUT_FIELDS: { key: string; label: string; format: "currency" | "number" | "percent" | "months" | "rag" }[] = [
  { key: "Total Customers", label: "Total Customers", format: "number" },
  { key: "Total Active Customers (Monthly)", label: "Active Customers (Avg)", format: "number" },
  { key: "CAC", label: "CAC", format: "currency" },
  { key: "ARPU", label: "ARPU", format: "currency" },
  { key: "Churn Rate %", label: "Churn Rate", format: "percent" },
  { key: "LTV", label: "LTV", format: "currency" },
  { key: "CAC Payback Period (Months)", label: "CAC Payback (Months)", format: "months" },
  { key: "Growth Rate %", label: "Growth Rate", format: "percent" },
  { key: "KPI Summary Dashboard", label: "RAG Status", format: "rag" },
];
