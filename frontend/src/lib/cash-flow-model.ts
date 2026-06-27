// ========================================================
// CASH FLOW STATEMENT MODEL – INVESTOR GRADE
// Auto-pulls from Income Statement (inv-common-utility)
// and Movements (inv-movements) via localStorage.
// Operating · Investing · Financing · Net Cash Movement
// ========================================================

export const MONTHS_ORDER = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export type MonthName = (typeof MONTHS_ORDER)[number];

// Only financing fields are manual; everything else auto-fills
export interface CashFlowMonthInputs {
  [key: string]: number;
  // Auto-filled from Income Statement
  "Net Profit (PAT)": number;
  "Depreciation & Amortization": number;
  // Auto-filled from Movements
  "Change in Receivables": number;
  "Change in Inventory": number;
  "Change in Payables": number;
  "CapEx": number;
  // Manual — Financing
  "Equity Infusion": number;
  "Debt Raised": number;
  "Debt Repayment": number;
  "Dividends Paid": number;
}

export const INPUT_FIELDS: { key: string; label: string; category: string; prefix: string; autoFill?: boolean }[] = [
  // Operating — auto-filled
  { key: "Net Profit (PAT)", label: "Net Profit (PAT)", category: "Operating (Auto-filled)", prefix: "₹", autoFill: true },
  { key: "Depreciation & Amortization", label: "Depreciation & Amortization", category: "Operating (Auto-filled)", prefix: "₹", autoFill: true },
  { key: "Change in Receivables", label: "Δ Receivables", category: "Working Capital Changes (Auto-filled)", prefix: "₹", autoFill: true },
  { key: "Change in Inventory", label: "Δ Inventory", category: "Working Capital Changes (Auto-filled)", prefix: "₹", autoFill: true },
  { key: "Change in Payables", label: "Δ Payables", category: "Working Capital Changes (Auto-filled)", prefix: "₹", autoFill: true },
  // Investing — auto-filled
  { key: "CapEx", label: "Capital Expenditure", category: "Investing (Auto-filled)", prefix: "₹", autoFill: true },
  // Financing — manual
  { key: "Equity Infusion", label: "Equity Infusion", category: "Financing", prefix: "₹" },
  { key: "Debt Raised", label: "Debt Raised", category: "Financing", prefix: "₹" },
  { key: "Debt Repayment", label: "Debt Repayment", category: "Financing", prefix: "₹" },
  { key: "Dividends Paid", label: "Dividends Paid", category: "Financing", prefix: "₹" },
];

export function createEmptyInputs(): CashFlowMonthInputs {
  return {
    "Net Profit (PAT)": 0,
    "Depreciation & Amortization": 0,
    "Change in Receivables": 0,
    "Change in Inventory": 0,
    "Change in Payables": 0,
    "CapEx": 0,
    "Equity Infusion": 0,
    "Debt Raised": 0,
    "Debt Repayment": 0,
    "Dividends Paid": 0,
  };
}

// ================== COMPUTED FIELDS ==================

export interface ComputedCashFlowMonth extends CashFlowMonthInputs {
  "Change in Working Capital": number;
  "Operating Cash Flow": number;
  "Investing Cash Flow": number;
  "Financing Cash Flow": number;
  "Net Cash Movement": number;
  "Cumulative Cash": number;
}

export interface CashFlowResults {
  monthlyData: Record<string, ComputedCashFlowMonth>;
  monthsAdded: string[];
  annual: {
    totalOperatingCF: number;
    totalInvestingCF: number;
    totalFinancingCF: number;
    totalNetCash: number;
    totalDepreciation: number;
    totalChangeInWC: number;
    endingCash: number;
  };
}

// ================== CALCULATION ENGINE ==================

export function calculateCashFlow(
  monthsData: Record<string, Record<string, number>>,
  openingCash: number = 0,
): CashFlowResults {
  const computed: Record<string, ComputedCashFlowMonth> = {};
  const addedMonths: string[] = [];
  let cumulativeCash = openingCash;

  MONTHS_ORDER.forEach((month) => {
    if (!monthsData[month]) return;
    addedMonths.push(month);
    const m = monthsData[month];
    const c = { ...m } as any;

    // Change in Working Capital = Δ Receivables + Δ Inventory - Δ Payables
    c["Change in Working Capital"] =
      (m["Change in Receivables"] || 0) +
      (m["Change in Inventory"] || 0) -
      (m["Change in Payables"] || 0);

    // Operating Cash Flow = Net Profit + D&A - Change in WC
    c["Operating Cash Flow"] =
      (m["Net Profit (PAT)"] || 0) +
      (m["Depreciation & Amortization"] || 0) -
      c["Change in Working Capital"];

    // Investing Cash Flow = -CapEx
    c["Investing Cash Flow"] = -(m["CapEx"] || 0);

    // Financing Cash Flow = Equity + Debt Raised - Debt Repayment - Dividends
    c["Financing Cash Flow"] =
      (m["Equity Infusion"] || 0) +
      (m["Debt Raised"] || 0) -
      (m["Debt Repayment"] || 0) -
      (m["Dividends Paid"] || 0);

    // Net Cash Movement
    c["Net Cash Movement"] =
      c["Operating Cash Flow"] + c["Investing Cash Flow"] + c["Financing Cash Flow"];

    // Cumulative
    cumulativeCash += c["Net Cash Movement"];
    c["Cumulative Cash"] = cumulativeCash;

    computed[month] = c as ComputedCashFlowMonth;
  });

  // Annual
  let totalOperatingCF = 0, totalInvestingCF = 0, totalFinancingCF = 0;
  let totalNetCash = 0, totalDepreciation = 0, totalChangeInWC = 0;

  addedMonths.forEach((month) => {
    const c = computed[month];
    totalOperatingCF += c["Operating Cash Flow"];
    totalInvestingCF += c["Investing Cash Flow"];
    totalFinancingCF += c["Financing Cash Flow"];
    totalNetCash += c["Net Cash Movement"];
    totalDepreciation += c["Depreciation & Amortization"];
    totalChangeInWC += c["Change in Working Capital"];
  });

  return {
    monthlyData: computed,
    monthsAdded: addedMonths,
    annual: {
      totalOperatingCF,
      totalInvestingCF,
      totalFinancingCF,
      totalNetCash,
      totalDepreciation,
      totalChangeInWC,
      endingCash: cumulativeCash,
    },
  };
}

// Output fields for display
export const OUTPUT_FIELDS: { key: string; label: string; format: "currency" | "number" }[] = [
  { key: "Operating Cash Flow", label: "Operating Cash Flow", format: "currency" },
  { key: "Change in Working Capital", label: "Δ Working Capital", format: "currency" },
  { key: "Investing Cash Flow", label: "Investing Cash Flow", format: "currency" },
  { key: "Financing Cash Flow", label: "Financing Cash Flow", format: "currency" },
  { key: "Net Cash Movement", label: "Net Cash Movement", format: "currency" },
  { key: "Cumulative Cash", label: "Cumulative Cash", format: "currency" },
];
