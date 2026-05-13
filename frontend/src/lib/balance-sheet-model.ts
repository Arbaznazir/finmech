// ========================================================
// BALANCE SHEET MODEL – FULL EXCEL MATCH
// Month-by-month → quarterly + annual roll-ups
// Ratios, balance check, status logic
// ========================================================

export const MONTHS_ORDER = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export type MonthName = (typeof MONTHS_ORDER)[number];

export interface BSMonthInputs {
  [key: string]: number;
  // Non-Current Assets
  "Property, Plant & Equipment (Net)": number;
  "Capital Work in Progress": number;
  "Investments (Long-Term)": number;
  "Lease Assets (if applicable)": number;
  "Other Non-Current Assets": number;
  "Deferred Tax Assets": number;
  "Intangible Assets": number;
  "Intangible Assets Under Development": number;
  // Current Assets
  "Cash & Cash Equivalents (Cash at bank included)": number;
  "Trade Receivables (Debtors)": number;
  "Inventory / Stock": number;
  "Short-term Financial Assets": number;
  "Other Current Assets": number;
  "GST Input/Refunds Receivable": number;
  // Equity
  "Owner's Capital / Share Capital": number;
  "Share Premium": number;
  "Reserves & Surplus / Retained Earnings": number;
  // Non-Current Liabilities
  "Long-Term Borrowings": number;
  "Lease Liabilities (Long-Term)": number;
  "Deferred Tax Liabilities": number;
  "Other Non-Current Liabilities": number;
  // Current Liabilities
  "Trade Payables (Creditors)": number;
  "Short-Term Loans & Borrowings": number;
  "Accrued Expenses / Outstanding Expenses": number;
  "Tax/GST Payable": number;
  "Current Maturity of Long-term Debt": number;
  "Employee Payables": number;
  "Other Current Liabilities": number;
}

export const INPUT_FIELDS: { key: string; label: string; category: string }[] = [
  // Non-Current Assets
  { key: "Property, Plant & Equipment (Net)", label: "Property, Plant & Equipment (Net)", category: "Non-Current Assets" },
  { key: "Capital Work in Progress", label: "Capital Work in Progress", category: "Non-Current Assets" },
  { key: "Investments (Long-Term)", label: "Investments (Long-Term)", category: "Non-Current Assets" },
  { key: "Lease Assets (if applicable)", label: "Lease Assets", category: "Non-Current Assets" },
  { key: "Other Non-Current Assets", label: "Other Non-Current Assets", category: "Non-Current Assets" },
  { key: "Deferred Tax Assets", label: "Deferred Tax Assets", category: "Non-Current Assets" },
  { key: "Intangible Assets", label: "Intangible Assets", category: "Non-Current Assets" },
  { key: "Intangible Assets Under Development", label: "Intangible Assets Under Dev.", category: "Non-Current Assets" },
  // Current Assets
  { key: "Cash & Cash Equivalents (Cash at bank included)", label: "Cash & Cash Equivalents", category: "Current Assets" },
  { key: "Trade Receivables (Debtors)", label: "Trade Receivables (Debtors)", category: "Current Assets" },
  { key: "Inventory / Stock", label: "Inventory / Stock", category: "Current Assets" },
  { key: "Short-term Financial Assets", label: "Short-term Financial Assets", category: "Current Assets" },
  { key: "Other Current Assets", label: "Other Current Assets", category: "Current Assets" },
  { key: "GST Input/Refunds Receivable", label: "GST Input/Refunds Receivable", category: "Current Assets" },
  // Equity
  { key: "Owner's Capital / Share Capital", label: "Owner's Capital / Share Capital", category: "Equity" },
  { key: "Share Premium", label: "Share Premium", category: "Equity" },
  { key: "Reserves & Surplus / Retained Earnings", label: "Reserves & Surplus / Retained Earnings", category: "Equity" },
  // Non-Current Liabilities
  { key: "Long-Term Borrowings", label: "Long-Term Borrowings", category: "Non-Current Liabilities" },
  { key: "Lease Liabilities (Long-Term)", label: "Lease Liabilities (Long-Term)", category: "Non-Current Liabilities" },
  { key: "Deferred Tax Liabilities", label: "Deferred Tax Liabilities", category: "Non-Current Liabilities" },
  { key: "Other Non-Current Liabilities", label: "Other Non-Current Liabilities", category: "Non-Current Liabilities" },
  // Current Liabilities
  { key: "Trade Payables (Creditors)", label: "Trade Payables (Creditors)", category: "Current Liabilities" },
  { key: "Short-Term Loans & Borrowings", label: "Short-Term Loans & Borrowings", category: "Current Liabilities" },
  { key: "Accrued Expenses / Outstanding Expenses", label: "Accrued Expenses / Outstanding", category: "Current Liabilities" },
  { key: "Tax/GST Payable", label: "Tax/GST Payable", category: "Current Liabilities" },
  { key: "Current Maturity of Long-term Debt", label: "Current Maturity of Long-term Debt", category: "Current Liabilities" },
  { key: "Employee Payables", label: "Employee Payables", category: "Current Liabilities" },
  { key: "Other Current Liabilities", label: "Other Current Liabilities", category: "Current Liabilities" },
];

export function createEmptyInputs(): BSMonthInputs {
  const empty: Record<string, number> = {};
  INPUT_FIELDS.forEach((f) => { empty[f.key] = 0; });
  return empty as BSMonthInputs;
}

// Computed fields
export interface ComputedBSMonth extends BSMonthInputs {
  "Total Non-Current Assets": number;
  "Total Current Assets": number;
  "TOTAL ASSETS": number;
  "Total Equity": number;
  "Total Non-Current Liability": number;
  "Total Current Liability": number;
  "TOTAL LIABILITIES": number;
  "BALANCE CHECK": number;
  "Working Capital": number;
  "Current Ratio": number;
  "Quick Ratio": number;
  "Debt/Equity Ratio": number;
  "Proprietary Ratio": number;
}

export interface MonthStatus {
  month: string;
  balanceCheck: number;
  workingCapital: number;
  currentRatio: number;
  status: "GREEN" | "RED";
}

export interface BalanceSheetResults {
  monthlyData: Record<string, ComputedBSMonth>;
  quarters: Record<string, Record<string, number>>;
  annual: Record<string, number>;
  status: MonthStatus[];
  monthsAdded: string[];
}

// ================== CALCULATION ENGINE ==================

function computeMonth(m: Record<string, number>): ComputedBSMonth {
  const c = { ...m } as any;

  // NON-CURRENT ASSETS
  c["Total Non-Current Assets"] =
    (m["Property, Plant & Equipment (Net)"] || 0) +
    (m["Capital Work in Progress"] || 0) +
    (m["Investments (Long-Term)"] || 0) +
    (m["Lease Assets (if applicable)"] || 0) +
    (m["Other Non-Current Assets"] || 0) +
    (m["Deferred Tax Assets"] || 0) +
    (m["Intangible Assets"] || 0) +
    (m["Intangible Assets Under Development"] || 0);

  // CURRENT ASSETS
  c["Total Current Assets"] =
    (m["Cash & Cash Equivalents (Cash at bank included)"] || 0) +
    (m["Trade Receivables (Debtors)"] || 0) +
    (m["Inventory / Stock"] || 0) +
    (m["Short-term Financial Assets"] || 0) +
    (m["Other Current Assets"] || 0) +
    (m["GST Input/Refunds Receivable"] || 0);

  c["TOTAL ASSETS"] = c["Total Non-Current Assets"] + c["Total Current Assets"];

  // EQUITY
  c["Total Equity"] =
    (m["Owner's Capital / Share Capital"] || 0) +
    (m["Share Premium"] || 0) +
    (m["Reserves & Surplus / Retained Earnings"] || 0);

  // NON-CURRENT LIABILITIES
  c["Total Non-Current Liability"] =
    (m["Long-Term Borrowings"] || 0) +
    (m["Lease Liabilities (Long-Term)"] || 0) +
    (m["Deferred Tax Liabilities"] || 0) +
    (m["Other Non-Current Liabilities"] || 0);

  // CURRENT LIABILITIES
  c["Total Current Liability"] =
    (m["Trade Payables (Creditors)"] || 0) +
    (m["Short-Term Loans & Borrowings"] || 0) +
    (m["Accrued Expenses / Outstanding Expenses"] || 0) +
    (m["Tax/GST Payable"] || 0) +
    (m["Current Maturity of Long-term Debt"] || 0) +
    (m["Employee Payables"] || 0) +
    (m["Other Current Liabilities"] || 0);

  c["TOTAL LIABILITIES"] = c["Total Equity"] + c["Total Non-Current Liability"] + c["Total Current Liability"];

  // BALANCE CHECK
  c["BALANCE CHECK"] = c["TOTAL ASSETS"] - c["TOTAL LIABILITIES"];

  // RATIOS
  const ca = c["Total Current Assets"];
  const cl = c["Total Current Liability"];
  const inv = m["Inventory / Stock"] || 0;
  const equity = c["Total Equity"];
  const debt = c["Total Non-Current Liability"] + c["Total Current Liability"];

  c["Working Capital"] = ca - cl;
  c["Current Ratio"] = cl > 0 ? ca / cl : 0;
  c["Quick Ratio"] = cl > 0 ? (ca - inv) / cl : 0;
  c["Debt/Equity Ratio"] = equity > 0 ? debt / equity : 0;
  c["Proprietary Ratio"] = c["TOTAL ASSETS"] > 0 ? equity / c["TOTAL ASSETS"] : 0;

  return c as ComputedBSMonth;
}

function sumMonths(
  data: Record<string, Record<string, number>>,
  months: string[]
): Record<string, number> {
  const sum: Record<string, number> = {};
  months.forEach((month) => {
    const d = data[month];
    if (!d) return;
    Object.keys(d).forEach((key) => {
      if (typeof d[key] === "number") {
        sum[key] = (sum[key] || 0) + d[key];
      }
    });
  });
  return sum;
}

export function calculateBalanceSheet(
  monthsData: Record<string, Record<string, number>>,
  cumulativeNetProfits?: Record<string, number>,
): BalanceSheetResults {
  const computed: Record<string, ComputedBSMonth> = {};
  const addedMonths: string[] = [];

  MONTHS_ORDER.forEach((month) => {
    if (monthsData[month]) {
      const mData = { ...monthsData[month] };
      // Add cumulative net profit to Retained Earnings if provided
      if (cumulativeNetProfits?.[month] !== undefined) {
        mData["Reserves & Surplus / Retained Earnings"] =
          (mData["Reserves & Surplus / Retained Earnings"] || 0) + cumulativeNetProfits[month];
      }
      computed[month] = computeMonth(mData);
      addedMonths.push(month);
    }
  });

  const quarters: Record<string, Record<string, number>> = {
    "Q1 (Apr–Jun)": sumMonths(computed, ["Apr", "May", "Jun"]),
    "Q2 (Jul–Sep)": sumMonths(computed, ["Jul", "Aug", "Sep"]),
    "Q3 (Oct–Dec)": sumMonths(computed, ["Oct", "Nov", "Dec"]),
    "Q4 (Jan–Mar)": sumMonths(computed, ["Jan", "Feb", "Mar"]),
  };

  const annual = sumMonths(computed, [...MONTHS_ORDER]);

  const status: MonthStatus[] = addedMonths.map((month) => ({
    month,
    balanceCheck: computed[month]["BALANCE CHECK"],
    workingCapital: computed[month]["Working Capital"],
    currentRatio: computed[month]["Current Ratio"],
    status: Math.abs(computed[month]["BALANCE CHECK"]) < 1 ? "GREEN" as const : "RED" as const,
  }));

  return { monthlyData: computed, quarters, annual, status, monthsAdded: addedMonths };
}

// Output fields for display tables
export const OUTPUT_FIELDS: { key: string; label: string; format: "currency" | "ratio" | "check"; section: string }[] = [
  // Assets
  { key: "Total Non-Current Assets", label: "Total Non-Current Assets", format: "currency", section: "Assets" },
  { key: "Total Current Assets", label: "Total Current Assets", format: "currency", section: "Assets" },
  { key: "TOTAL ASSETS", label: "TOTAL ASSETS", format: "currency", section: "Assets" },
  // Equity & Liabilities
  { key: "Total Equity", label: "Total Equity", format: "currency", section: "Equity & Liabilities" },
  { key: "Total Non-Current Liability", label: "Total Non-Current Liabilities", format: "currency", section: "Equity & Liabilities" },
  { key: "Total Current Liability", label: "Total Current Liabilities", format: "currency", section: "Equity & Liabilities" },
  { key: "TOTAL LIABILITIES", label: "TOTAL EQUITY & LIABILITIES", format: "currency", section: "Equity & Liabilities" },
  // Check & Ratios
  { key: "BALANCE CHECK", label: "Balance Check (should be 0)", format: "check", section: "Verification & Ratios" },
  { key: "Working Capital", label: "Working Capital", format: "currency", section: "Verification & Ratios" },
  { key: "Current Ratio", label: "Current Ratio", format: "ratio", section: "Verification & Ratios" },
  { key: "Quick Ratio", label: "Quick Ratio", format: "ratio", section: "Verification & Ratios" },
  { key: "Debt/Equity Ratio", label: "Debt/Equity Ratio", format: "ratio", section: "Verification & Ratios" },
  { key: "Proprietary Ratio", label: "Proprietary Ratio", format: "ratio", section: "Verification & Ratios" },
];
