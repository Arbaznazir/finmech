// ========================================================
// INCOME STATEMENT MODEL – FULL EXCEL MATCH
// Month-by-month input → automatic quarterly + annual roll-up
// Exact field names, formulas, margins, status messages
// ========================================================

import { IS_EXACT } from "@/lib/excel-model-content";
import { ragTextClass, stripRagPrefix, type RagStatus } from "@/lib/utils";

export const MONTHS_ORDER = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export type MonthName = (typeof MONTHS_ORDER)[number];

export interface MonthInputs {
  [key: string]: number;
  "Operational Revenue (Recurring Receipts)": number;
  "Operational Revenue (Variable revenue including interest income)": number;
  "COGS (Direct Costs)": number;
  "Freight & Logistics": number;
  "Other Variable Costs": number;
  "Salaries & Benefits": number;
  "Rent & Utilities": number;
  "Professional & Legal Fees": number;
  "Technology & IT Costs": number;
  "Marketing & Advertising": number;
  "Travel": number;
  "Miscll Operating expenses": number;
  "Depreciation & Amortization": number;
  "Interest Expense": number;
  "Other Non-Operating Expenses": number;
  "Tax Expense": number;
}

export const INPUT_FIELDS: { key: string; label: string; category: string }[] = [
  { key: "Operational Revenue (Recurring Receipts)", label: "Operational Revenue (Recurring Receipts)", category: "Revenue" },
  { key: "Operational Revenue (Variable revenue including interest income)", label: "Operational Revenue (Variable revenue including interest income)", category: "Revenue" },
  { key: "COGS (Direct Costs)", label: "COGS (Direct Costs)", category: "Cost of Goods Sold" },
  { key: "Freight & Logistics", label: "Freight & Logistics", category: "Cost of Goods Sold" },
  { key: "Other Variable Costs", label: "Other Variable Costs", category: "Cost of Goods Sold" },
  { key: "Salaries & Benefits", label: "Salaries & Benefits", category: "Operating Expenses" },
  { key: "Rent & Utilities", label: "Rent & Utilities", category: "Operating Expenses" },
  { key: "Professional & Legal Fees", label: "Professional & Legal Fees", category: "Operating Expenses" },
  { key: "Technology & IT Costs", label: "Technology & IT Costs", category: "Operating Expenses" },
  { key: "Marketing & Advertising", label: "Marketing & Advertising", category: "Operating Expenses" },
  { key: "Travel", label: "Travel", category: "Operating Expenses" },
  { key: "Miscll Operating expenses", label: "Miscll Operating expenses", category: "Operating Expenses" },
  { key: "Depreciation & Amortization", label: "Depreciation & Amortization", category: "Below the Line" },
  { key: "Interest Expense", label: "Interest Expense", category: "Below the Line" },
  { key: "Other Non-Operating Expenses", label: "Other Non-Operating Expenses", category: "Below the Line" },
  { key: "Tax Expense", label: "Tax Expense", category: "Below the Line" },
];

export interface ComputedMonth extends MonthInputs {
  [key: string]: number;
  "Gross Revenue": number;
  "Total of COGS": number;
  "Gross Profit": number;
  "Gross Margin %": number;
  "Total Operating Expenses": number;
  "EBITDA": number;
  "EBITDA Margin %": number;
  "EBIT": number;
  "PBT": number;
  "Net Profit": number;
  "Net Margin %": number;
  "Total Fixed Costs": number;
  "Total variable Costs": number;
}

export interface QuarterData {
  [key: string]: number;
}

export interface StatusMessages {
  overall: string;
  overallColor: string;
  rag: RagStatus | null;
  guidance: string[];
  monthStatus: MonthRagStatus[];
}

export interface MonthRagStatus {
  month: string;
  rag: RagStatus;
  message: string;
}

export interface IncomeStatementResults {
  monthlyData: Record<string, ComputedMonth>;
  quarters: Record<string, QuarterData>;
  annual: QuarterData;
  historical: ComputedMonth | null;
  status: StatusMessages;
  monthsAdded: string[];
  derived: {
    revenueGrowthQ2Q: number | null;
    grossMarginAnnual: number;
    ebitdaMarginAnnual: number;
    netMarginAnnual: number;
  };
}

export function createEmptyInputs(): MonthInputs {
  return {
    "Operational Revenue (Recurring Receipts)": 0,
    "Operational Revenue (Variable revenue including interest income)": 0,
    "COGS (Direct Costs)": 0,
    "Freight & Logistics": 0,
    "Other Variable Costs": 0,
    "Salaries & Benefits": 0,
    "Rent & Utilities": 0,
    "Professional & Legal Fees": 0,
    "Technology & IT Costs": 0,
    "Marketing & Advertising": 0,
    "Travel": 0,
    "Miscll Operating expenses": 0,
    "Depreciation & Amortization": 0,
    "Interest Expense": 0,
    "Other Non-Operating Expenses": 0,
    "Tax Expense": 0,
  };
}

function incomeStatementRag(gm: number, em: number, nm: number): "GREEN" | "AMBER" | "RED" {
  if (gm >= 0.4 && em >= 0.2 && nm >= 0.1) return "GREEN";
  if (gm >= 0.25 && em >= 0.1) return "AMBER";
  return "RED";
}

function computeMonth(m: Record<string, number>): ComputedMonth {
  const computed = { ...m } as any;

  // REVENUE
  computed["Gross Revenue"] =
    (m["Operational Revenue (Recurring Receipts)"] || 0) +
    (m["Operational Revenue (Variable revenue including interest income)"] || 0);

  // COGS
  computed["Total of COGS"] =
    (m["COGS (Direct Costs)"] || 0) +
    (m["Freight & Logistics"] || 0) +
    (m["Other Variable Costs"] || 0);

  // Gross Profit & Margin (Excel stores ratios as decimals, e.g. 0.943)
  computed["Gross Profit"] = computed["Gross Revenue"] - computed["Total of COGS"];
  computed["Gross Margin %"] =
    computed["Gross Revenue"] > 0
      ? computed["Gross Profit"] / computed["Gross Revenue"]
      : 0;

  // OPERATING EXPENSES
  computed["Total Operating Expenses"] =
    (m["Salaries & Benefits"] || 0) +
    (m["Rent & Utilities"] || 0) +
    (m["Professional & Legal Fees"] || 0) +
    (m["Technology & IT Costs"] || 0) +
    (m["Marketing & Advertising"] || 0) +
    (m["Travel"] || 0) +
    (m["Miscll Operating expenses"] || 0);

  // EBITDA
  computed["EBITDA"] = computed["Gross Profit"] - computed["Total Operating Expenses"];
  computed["EBITDA Margin %"] =
    computed["EBITDA"] <= 1 || computed["Gross Revenue"] <= 0
      ? NaN
      : computed["EBITDA"] / computed["Gross Revenue"];

  // D&A
  const dep = m["Depreciation & Amortization"] || 0;

  // EBIT
  computed["EBIT"] = computed["EBITDA"] - dep;

  // Finance & Other
  const interestExp = m["Interest Expense"] || 0;
  const otherNonOp = m["Other Non-Operating Expenses"] || 0;

  // PBT
  computed["PBT"] = computed["EBIT"] - interestExp - otherNonOp;

  // Tax
  const taxExpense = m["Tax Expense"] || 0;

  // Net Profit (PAT)
  computed["Net Profit"] = computed["PBT"] - taxExpense;
  computed["Net Margin %"] =
    computed["Gross Revenue"] > 0
      ? computed["Net Profit"] / computed["Gross Revenue"]
      : 0;

  // Excel row 41–42: fixed & variable cost roll-ups
  computed["Total Fixed Costs"] =
    (m["Salaries & Benefits"] || 0) +
    (m["Rent & Utilities"] || 0) +
    (m["Professional & Legal Fees"] || 0) +
    (m["Technology & IT Costs"] || 0) +
    interestExp;

  computed["Total variable Costs"] =
    computed["Total of COGS"] +
    (m["Marketing & Advertising"] || 0) +
    (m["Travel"] || 0) +
    (m["Miscll Operating expenses"] || 0) +
    otherNonOp +
    taxExpense;

  return computed as ComputedMonth;
}

function sumMonths(
  data: Record<string, Record<string, number>>,
  months: string[]
): QuarterData {
  const sum: QuarterData = {};
  months.forEach((month) => {
    const d = data[month];
    if (!d) return;
    Object.keys(d).forEach((key) => {
      if (typeof d[key] === "number") {
        sum[key] = (sum[key] || 0) + d[key];
      }
    });
  });
  // Re-calculate margin ratios for the aggregate (Excel decimal format)
  if (sum["Gross Revenue"] && sum["Gross Revenue"] > 0) {
    sum["Gross Margin %"] = sum["Gross Profit"] / sum["Gross Revenue"];
    sum["EBITDA Margin %"] =
      (sum["EBITDA"] ?? 0) <= 1 ? NaN : (sum["EBITDA"] / sum["Gross Revenue"]);
    sum["Net Margin %"] = sum["Net Profit"] / sum["Gross Revenue"];
  }
  return sum;
}

export function calculateIncomeStatement(
  monthsData: Record<string, Record<string, number>>,
  historicalInputs?: Record<string, number> | null,
): IncomeStatementResults {
  // 1. Compute each month
  const computed: Record<string, ComputedMonth> = {};
  const addedMonths: string[] = [];

  MONTHS_ORDER.forEach((month) => {
    if (monthsData[month]) {
      computed[month] = computeMonth(monthsData[month]);
      addedMonths.push(month);
    }
  });

  // 2. Quarterly aggregates
  const quarters: Record<string, QuarterData> = {
    "Q1 (Apr–Jun)": sumMonths(computed, ["Apr", "May", "Jun"]),
    "Q2 (Jul–Sep)": sumMonths(computed, ["Jul", "Aug", "Sep"]),
    "Q3 (Oct–Dec)": sumMonths(computed, ["Oct", "Nov", "Dec"]),
    "Q4 (Jan–Mar)": sumMonths(computed, ["Jan", "Feb", "Mar"]),
  };

  // 3. Annual
  const annual = sumMonths(computed, [...MONTHS_ORDER]);

  // 4. Derived metrics
  const qKeys = Object.keys(quarters);
  const populatedQs = qKeys.filter((k) => (quarters[k]["Gross Revenue"] || 0) > 0);
  let revenueGrowthQ2Q: number | null = null;
  if (populatedQs.length >= 2) {
    const prevQ = quarters[populatedQs[populatedQs.length - 2]];
    const currQ = quarters[populatedQs[populatedQs.length - 1]];
    if (prevQ["Gross Revenue"] > 0) {
      revenueGrowthQ2Q =
        ((currQ["Gross Revenue"] - prevQ["Gross Revenue"]) / prevQ["Gross Revenue"]) * 100;
    }
  }

  const grossMarginAnnual = annual["Gross Margin %"] || 0;
  const ebitdaMarginAnnual = annual["EBITDA Margin %"] || 0;
  const netMarginAnnual = annual["Net Margin %"] || 0;

  const hasHistorical =
    !!historicalInputs && Object.values(historicalInputs).some((v) => Number(v) !== 0);
  const historical = hasHistorical ? computeMonth(historicalInputs!) : null;

  // 5. Status messages from Excel row 43 (GREEN / AMBER / RED)
  let overall: string;
  let overallColor: string;
  let rag: RagStatus | null = null;
  let guidance: string[] = [];
  const monthStatus: MonthRagStatus[] = [];

  addedMonths.forEach((month) => {
    const m = computed[month];
    const monthRag = incomeStatementRag(
      m["Gross Margin %"] || 0,
      Number.isFinite(m["EBITDA Margin %"]) ? m["EBITDA Margin %"] : 0,
      m["Net Margin %"] || 0,
    );
    monthStatus.push({
      month,
      rag: monthRag,
      message: stripRagPrefix(IS_EXACT.ragByColor[monthRag]),
    });
  });

  if (addedMonths.length === 0) {
    overall = "";
    overallColor = "text-muted-foreground";
  } else {
    const last = monthStatus[monthStatus.length - 1];
    rag = last.rag;
    overall = last.message;
    overallColor = ragTextClass(rag);
    guidance.push(IS_EXACT.ragByColor[rag]);
    guidance.push(...IS_EXACT.mentoringGuidance);
  }

  return {
    monthlyData: computed,
    quarters,
    annual,
    historical,
    status: { overall, overallColor, rag, guidance, monthStatus },
    monthsAdded: addedMonths,
    derived: {
      revenueGrowthQ2Q,
      grossMarginAnnual,
      ebitdaMarginAnnual,
      netMarginAnnual,
    },
  };
}

// Computed output field labels for display
export const OUTPUT_FIELDS: { key: string; label: string; format: "currency" | "percent" | "number" }[] = [
  { key: "Gross Revenue", label: "Gross Revenue", format: "currency" },
  { key: "Total of COGS", label: "Total of COGS", format: "currency" },
  { key: "Gross Profit", label: "Gross Profit", format: "currency" },
  { key: "Gross Margin %", label: "Gross Margin %", format: "percent" },
  { key: "Total Operating Expenses", label: "Total Operating Expenses", format: "currency" },
  { key: "EBITDA", label: "EBITDA", format: "currency" },
  { key: "EBITDA Margin %", label: "EBITDA Margin %", format: "percent" },
  { key: "EBIT", label: "EBIT", format: "currency" },
  { key: "PBT", label: "PBT", format: "currency" },
  { key: "Net Profit", label: "Net Profit", format: "currency" },
  { key: "Net Margin %", label: "Net Margin %", format: "percent" },
  { key: "Total Fixed Costs", label: "Total Fixed Costs", format: "currency" },
  { key: "Total variable Costs", label: "Total variable Costs", format: "currency" },
];
