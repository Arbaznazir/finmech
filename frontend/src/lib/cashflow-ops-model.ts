// ========================================================
// CASHFLOW OPERATIONS MODEL – Detailed Monthly Cash Flow
// Sheet 1 of Cash Flow Statement Excel
// ========================================================

export const CF_OPS_MONTHS = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export type CFOpsMonth = (typeof CF_OPS_MONTHS)[number];

export interface CFOpsInputs {
  [key: string]: number;
  // Cash Inflows (Operating)
  "Business receipts": number;
  "Other cash receipts (including interest income)": number;
  // Cash Outflows (Operating)
  "COGS (Raw Materials, Manufacturing, shipping)": number;
  "Frieght & Logistics": number;
  "Other Variable Costs": number;
  "Salaries & Wages": number;
  "Rent & Utilities": number;
  "Marketing & Advertising": number;
  "Technology and IT costs": number;
  "Professional and Legal Fees": number;
  "Travel & Entertainment": number;
  "Other Miscll operating expenses": number;
  "Interest expenses": number;
  "Income Tax expenses (including Provision)": number;
  // Investing
  "Purchase of Assets": number;
  "Sale of Assets": number;
  // Financing
  "Equity raised": number;
  "Loan Taken": number;
  "Loan repaid": number;
  "Dividends paid": number;
  // Depreciation for EBITDA calc
  "Depreciation and Amortization": number;
  // From P&L for ratios
  "Net Profit/Loss": number;
}

export const CF_OPS_INPUT_FIELDS: { key: keyof CFOpsInputs | string; label: string; category: string }[] = [
  // Cash Inflows
  { key: "Business receipts", label: "Business Receipts", category: "Cash Inflows" },
  { key: "Other cash receipts (including interest income)", label: "Other Cash Receipts", category: "Cash Inflows" },
  // Cash Outflows
  { key: "COGS (Raw Materials, Manufacturing, shipping)", label: "COGS", category: "Cash Outflows" },
  { key: "Frieght & Logistics", label: "Freight & Logistics", category: "Cash Outflows" },
  { key: "Other Variable Costs", label: "Other Variable Costs", category: "Cash Outflows" },
  { key: "Salaries & Wages", label: "Salaries & Wages", category: "Cash Outflows" },
  { key: "Rent & Utilities", label: "Rent & Utilities", category: "Cash Outflows" },
  { key: "Marketing & Advertising", label: "Marketing & Advertising", category: "Cash Outflows" },
  { key: "Technology and IT costs", label: "Technology & IT Costs", category: "Cash Outflows" },
  { key: "Professional and Legal Fees", label: "Professional & Legal Fees", category: "Cash Outflows" },
  { key: "Travel & Entertainment", label: "Travel & Entertainment", category: "Cash Outflows" },
  { key: "Other Miscll operating expenses", label: "Other Misc Operating Expenses", category: "Cash Outflows" },
  { key: "Interest expenses", label: "Interest Expenses", category: "Cash Outflows" },
  { key: "Income Tax expenses (including Provision)", label: "Income Tax Expenses", category: "Cash Outflows" },
  // Investing
  { key: "Purchase of Assets", label: "Purchase of Assets", category: "Investing Activities" },
  { key: "Sale of Assets", label: "Sale of Assets", category: "Investing Activities" },
  // Financing
  { key: "Equity raised", label: "Equity Raised", category: "Financing Activities" },
  { key: "Loan Taken", label: "Loan Taken", category: "Financing Activities" },
  { key: "Loan repaid", label: "Loan Repaid", category: "Financing Activities" },
  { key: "Dividends paid", label: "Dividends Paid", category: "Financing Activities" },
  // Additional
  { key: "Depreciation and Amortization", label: "Depreciation & Amortization", category: "Additional" },
  { key: "Net Profit/Loss", label: "Net Profit/Loss (from P&L)", category: "Additional" },
];

export function createEmptyCFOpsInputs(): Record<string, number> {
  const empty: Record<string, number> = {};
  CF_OPS_INPUT_FIELDS.forEach((f) => { empty[f.key] = 0; });
  return empty;
}

// Computed fields for each month
export interface CFOpsComputed {
  [key: string]: number;
  "Total Cash inflow": number;
  "Total Outflows": number;
  "Net Cash Flow from Operating Activities (CFO)": number;
  "Cash Flow from Investing Activities (CFI)": number;
  "Cash Flow from Financing Activities (CFF)": number;
  "Net Cash Flow": number;
  "Closing Balance": number;
  "EBITDA": number;
  "Profit After Tax (PAT)": number;
}

export interface CFOpsResults {
  monthlyData: Record<string, CFOpsComputed>;
  monthsAdded: string[];
  openingCash: number;
}

// ================== CALCULATION ENGINE ==================

export function computeCFOpsMonth(
  inputs: Record<string, number>,
  runningCash: number
): { computed: CFOpsComputed; endingCash: number } {
  const n = (k: string) => Number(inputs[k]) || 0;
  const c = {} as CFOpsComputed;

  // Cash Inflows
  c["Total Cash inflow"] = n("Business receipts") + n("Other cash receipts (including interest income)");

  // Cash Outflows
  c["Total Outflows"] =
    n("COGS (Raw Materials, Manufacturing, shipping)") +
    n("Frieght & Logistics") +
    n("Other Variable Costs") +
    n("Salaries & Wages") +
    n("Rent & Utilities") +
    n("Marketing & Advertising") +
    n("Technology and IT costs") +
    n("Professional and Legal Fees") +
    n("Travel & Entertainment") +
    n("Other Miscll operating expenses") +
    n("Interest expenses") +
    n("Income Tax expenses (including Provision)");

  // CFO
  c["Net Cash Flow from Operating Activities (CFO)"] = c["Total Cash inflow"] - c["Total Outflows"];

  // CFI
  c["Cash Flow from Investing Activities (CFI)"] = n("Sale of Assets") - n("Purchase of Assets");

  // CFF
  c["Cash Flow from Financing Activities (CFF)"] =
    n("Equity raised") + n("Loan Taken") - n("Loan repaid") - n("Dividends paid");

  // Net Cash Flow
  c["Net Cash Flow"] =
    c["Net Cash Flow from Operating Activities (CFO)"] +
    c["Cash Flow from Investing Activities (CFI)"] +
    c["Cash Flow from Financing Activities (CFF)"];

  // Closing Balance
  const endingCash = runningCash + c["Net Cash Flow"];
  c["Closing Balance"] = endingCash;

  // Additional metrics
  c["EBITDA"] = c["Net Cash Flow from Operating Activities (CFO)"] + n("Depreciation and Amortization");
  c["Profit After Tax (PAT)"] = n("Net Profit/Loss");

  return { computed: c, endingCash };
}

export function calculateCFOps(
  monthsData: Record<string, Record<string, number>>,
  openingCash: number
): CFOpsResults {
  const computed: Record<string, CFOpsComputed> = {};
  const addedMonths: string[] = [];
  let runningCash = openingCash;

  CF_OPS_MONTHS.forEach((month) => {
    if (!monthsData[month]) return;
    addedMonths.push(month);
    const { computed: c, endingCash } = computeCFOpsMonth(monthsData[month], runningCash);
    computed[month] = c;
    runningCash = endingCash;
  });

  return { monthlyData: computed, monthsAdded: addedMonths, openingCash };
}

// Auto-fill from Common Utility
export function autoFillFromCommonUtility(
  inputs: Record<string, number>,
  month: string,
  commonUtilityData: Record<string, any> | null
): Record<string, number> {
  if (!commonUtilityData?.monthlyData?.[month]) return inputs;
  
  const cu = commonUtilityData.monthlyData[month];
  const filled = { ...inputs };
  
  // Auto-fill linked fields
  if (cu["Gross Revenue"] !== undefined) {
    filled["Business receipts"] = cu["Gross Revenue"];
  }
  if (cu["Net Profit (PAT)"] !== undefined || cu["Net Profit"] !== undefined) {
    filled["Net Profit/Loss"] = cu["Net Profit (PAT)"] || cu["Net Profit"] || 0;
  }
  
  return filled;
}
