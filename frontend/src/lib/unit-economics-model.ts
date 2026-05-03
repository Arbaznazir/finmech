// ========================================================
// UNIT ECONOMICS BASICS – FULL EXCEL MATCH
// Month-by-month → CAC, LTV, ARPU, Payback, Churn,
// Growth Rate + RAG classification
// ========================================================

export const MONTHS_ORDER = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

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
  { key: "Sales Revenue", label: "Sales Revenue", category: "Revenue", prefix: "$" },
  { key: "Marketing Spend", label: "Marketing Spend", category: "Revenue", prefix: "$" },
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

export interface UnitEconomicsResults {
  monthlyData: Record<string, ComputedUEMonth>;
  status: MonthStatus[];
  monthsAdded: string[];
}

// ================== RAG ==================

function getRAG(m: Record<string, number | string>): RAGStatus {
  const cac = Number(m["CAC"]) || 0;
  const ltv = Number(m["LTV"]) || 0;
  const ltvCac = cac > 0 ? ltv / cac : 0;
  const churn = Number(m["Churn Rate %"]) || 0;
  const growth = Number(m["Growth Rate %"]) || 0;

  if (ltvCac > 3 && churn < 5 && growth > 20) return "GREEN";
  if (ltvCac > 1 && churn < 10) return "AMBER";
  return "RED";
}

// ================== ENGINE ==================

export function calculateUnitEconomics(
  monthsData: Record<string, Record<string, number>>
): UnitEconomicsResults {
  const computed: Record<string, ComputedUEMonth> = {};
  const addedMonths: string[] = [];
  let prevCustomers = 0;

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

    // Core customer metrics
    const totalCustomers = custBegin + newCust - churned;
    m["Total Customers"] = totalCustomers;
    m["Total Active Customers (Monthly)"] = (custBegin + totalCustomers) / 2;

    // KPIs
    m["CAC"] = newCust > 0 ? marketingSpend / newCust : 0;
    const activeCustomers = Number(m["Total Active Customers (Monthly)"]);
    m["ARPU"] = activeCustomers > 0 ? salesRevenue / activeCustomers : 0;

    const churnRate = custBegin > 0 ? churned / custBegin : 0;
    m["Churn Rate %"] = churnRate * 100;
    m["LTV"] = churnRate > 0 ? Number(m["ARPU"]) / churnRate : 0;

    m["CAC Payback Period (Months)"] = Number(m["ARPU"]) > 0 ? Number(m["CAC"]) / Number(m["ARPU"]) : 0;

    m["Growth Rate %"] = custBegin > 0
      ? ((newCust - churned) / custBegin) * 100
      : 0;

    prevCustomers = totalCustomers;

    m["KPI Summary Dashboard"] = getRAG(m);

    computed[month] = m as unknown as ComputedUEMonth;
  });

  const status: MonthStatus[] = addedMonths.map((month) => {
    const c = computed[month];
    const cac = Number(c["CAC"]) || 0;
    const ltv = Number(c["LTV"]) || 0;
    return {
      month,
      rag: c["KPI Summary Dashboard"] as RAGStatus,
      ltvCacRatio: cac > 0 ? ltv / cac : 0,
      churnRate: Number(c["Churn Rate %"]),
      growthRate: Number(c["Growth Rate %"]),
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
