// ========================================================
// CASHFLOW OPERATIONS – Excel sheet "CashflowOps"
// FINMECH-UPGRADED/2.Stand alone models/4.Cash Flow Statement.xlsx
// Operating inflows/outflows only — CFI/CFF on Consolidated CFS sheet
// ========================================================

export const CF_OPS_MONTHS = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export type CFOpsMonth = (typeof CF_OPS_MONTHS)[number];

export interface CFOpsInputs {
  [key: string]: number;
  "Business receipts": number;
  "Other cash receipts (including interest income)": number;
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
}

export const CF_OPS_INPUT_FIELDS: { key: string; label: string; category: string }[] = [
  { key: "Business receipts", label: "Business receipts", category: "— CASH INFLOWS —" },
  { key: "Other cash receipts (including interest income)", label: "Other cash receipts (including interest income)", category: "— CASH INFLOWS —" },
  { key: "COGS (Raw Materials, Manufacturing, shipping)", label: "COGS (Raw Materials, Manufacturing, shipping)", category: "— CASH OUTFLOWS —" },
  { key: "Frieght & Logistics", label: "Frieght & Logistics", category: "— CASH OUTFLOWS —" },
  { key: "Other Variable Costs", label: "Other Variable Costs", category: "— CASH OUTFLOWS —" },
  { key: "Salaries & Wages", label: "Salaries & Wages", category: "— CASH OUTFLOWS —" },
  { key: "Rent & Utilities", label: "Rent & Utilities", category: "— CASH OUTFLOWS —" },
  { key: "Marketing & Advertising", label: "Marketing & Advertising", category: "— CASH OUTFLOWS —" },
  { key: "Technology and IT costs", label: "Technology and IT costs", category: "— CASH OUTFLOWS —" },
  { key: "Professional and Legal Fees", label: "Professional and Legal Fees", category: "— CASH OUTFLOWS —" },
  { key: "Travel & Entertainment", label: "Travel & Entertainment", category: "— CASH OUTFLOWS —" },
  { key: "Other Miscll operating expenses", label: "Other Miscll operating expenses", category: "— CASH OUTFLOWS —" },
  { key: "Interest expenses", label: "Interest expenses", category: "— CASH OUTFLOWS —" },
  { key: "Income Tax expenses (including Provision)", label: "Income Tax expenses (including Provision)", category: "— CASH OUTFLOWS —" },
];

export function createEmptyCFOpsInputs(): Record<string, number> {
  const empty: Record<string, number> = {};
  CF_OPS_INPUT_FIELDS.forEach((f) => { empty[f.key] = 0; });
  return empty;
}

export interface CFOpsComputed {
  [key: string]: number;
  "Total Cash inflow": number;
  "Total Outflows": number;
  "Net Cash Flow (Inflow - Outflow)": number;
  "Closing Balance": number;
}

export interface CFOpsResults {
  monthlyData: Record<string, CFOpsComputed>;
  monthsAdded: string[];
}

export function computeCFOpsMonth(
  inputs: Record<string, number>,
  priorClosing: number,
  isFirstMonth: boolean,
): CFOpsComputed {
  const n = (k: string) => Number(inputs[k]) || 0;
  const c = {} as CFOpsComputed;

  c["Total Cash inflow"] =
    n("Business receipts") + n("Other cash receipts (including interest income)");

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

  c["Net Cash Flow (Inflow - Outflow)"] = c["Total Cash inflow"] - c["Total Outflows"];

  // Excel: B22=B21; C22=B22+C21; …
  c["Closing Balance"] = isFirstMonth
    ? c["Net Cash Flow (Inflow - Outflow)"]
    : priorClosing + c["Net Cash Flow (Inflow - Outflow)"];

  return c;
}

export function calculateCFOps(
  monthsData: Record<string, Record<string, number>>,
): CFOpsResults {
  const computed: Record<string, CFOpsComputed> = {};
  const addedMonths: string[] = [];
  let priorClosing = 0;

  CF_OPS_MONTHS.forEach((month, idx) => {
    if (!monthsData[month]) return;
    addedMonths.push(month);
    const c = computeCFOpsMonth(monthsData[month], priorClosing, idx === 0);
    computed[month] = c;
    priorClosing = c["Closing Balance"];
  });

  return { monthlyData: computed, monthsAdded: addedMonths };
}

export const CF_OPS_OUTPUT_FIELDS: { key: string; label: string; bold?: boolean }[] = [
  { key: "Total Cash inflow", label: "Total Cash inflow" },
  { key: "Total Outflows", label: "Total Outflows" },
  { key: "Net Cash Flow (Inflow - Outflow)", label: "Net Cash Flow (Inflow - Outflow)", bold: true },
  { key: "Closing Balance", label: "Closing Balance", bold: true },
];

export function autoFillFromCommonUtility(
  inputs: Record<string, number>,
  month: string,
  commonUtilityData: Record<string, unknown> | null,
): Record<string, number> {
  const md = commonUtilityData?.monthlyData as Record<string, Record<string, number>> | undefined;
  if (!md?.[month]) return inputs;

  const cu = md[month];
  const filled = { ...inputs };

  if (cu["Gross Revenue"] !== undefined) {
    filled["Business receipts"] = cu["Gross Revenue"];
  }
  if (cu["Net Profit"] !== undefined) {
    // retained for consolidated PAT link — not an ops input field
  }

  return filled;
}
