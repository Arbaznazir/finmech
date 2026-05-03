// ========================================================
// CASH FLOW STATEMENT MODEL – FULL EXCEL MATCH
// Month-by-month → CFO, CFI, CFF, Net Cash Flow,
// Ending Cash, quarterly & annual roll-ups + ratios
// ========================================================

export const MONTHS_ORDER = [
  "April", "May", "Jun", "July", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export type MonthName = (typeof MONTHS_ORDER)[number];

export interface CFMonthInputs {
  [key: string]: number | string;
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
  // Optional link from Income Statement
  "Net Profit": number;
  "EBITDA": number;
}

export const INPUT_FIELDS: { key: string; label: string; category: string }[] = [
  // Cash Inflows
  { key: "Business receipts", label: "Business Receipts", category: "Cash Inflows (Operating)" },
  { key: "Other cash receipts (including interest income)", label: "Other Cash Receipts (incl. interest)", category: "Cash Inflows (Operating)" },
  // Cash Outflows
  { key: "COGS (Raw Materials, Manufacturing, shipping)", label: "COGS (Raw Materials, Mfg, Shipping)", category: "Cash Outflows (Operating)" },
  { key: "Frieght & Logistics", label: "Freight & Logistics", category: "Cash Outflows (Operating)" },
  { key: "Other Variable Costs", label: "Other Variable Costs", category: "Cash Outflows (Operating)" },
  { key: "Salaries & Wages", label: "Salaries & Wages", category: "Cash Outflows (Operating)" },
  { key: "Rent & Utilities", label: "Rent & Utilities", category: "Cash Outflows (Operating)" },
  { key: "Marketing & Advertising", label: "Marketing & Advertising", category: "Cash Outflows (Operating)" },
  { key: "Technology and IT costs", label: "Technology & IT Costs", category: "Cash Outflows (Operating)" },
  { key: "Professional and Legal Fees", label: "Professional & Legal Fees", category: "Cash Outflows (Operating)" },
  { key: "Travel & Entertainment", label: "Travel & Entertainment", category: "Cash Outflows (Operating)" },
  { key: "Other Miscll operating expenses", label: "Other Misc Operating Expenses", category: "Cash Outflows (Operating)" },
  { key: "Interest expenses", label: "Interest Expenses", category: "Cash Outflows (Operating)" },
  { key: "Income Tax expenses (including Provision)", label: "Income Tax Expenses (incl. Provision)", category: "Cash Outflows (Operating)" },
  // Investing
  { key: "Purchase of Assets", label: "Purchase of Assets", category: "Investing Activities" },
  { key: "Sale of Assets", label: "Sale of Assets", category: "Investing Activities" },
  // Financing
  { key: "Equity raised", label: "Equity Raised", category: "Financing Activities" },
  { key: "Loan Taken", label: "Loan Taken", category: "Financing Activities" },
  { key: "Loan repaid", label: "Loan Repaid", category: "Financing Activities" },
  { key: "Dividends paid", label: "Dividends Paid", category: "Financing Activities" },
  // Optional links
  { key: "Net Profit", label: "Net Profit (from P&L)", category: "Ratios (Optional)" },
  { key: "EBITDA", label: "EBITDA (from P&L)", category: "Ratios (Optional)" },
];

export function createEmptyInputs(): Record<string, number> {
  const empty: Record<string, number> = {};
  INPUT_FIELDS.forEach((f) => { empty[f.key] = 0; });
  return empty;
}

// Computed fields
export interface ComputedCFMonth {
  [key: string]: number | string;
  "Total Cash inflow": number;
  "Total Outflows": number;
  "Net Cash Flow from Operating Activities (CFO)": number;
  "Cash Flow from Investing Activities (CFI)": number;
  "Cash Flow from Financing Activities (CFF)": number;
  "Net Cash Flow": number;
  "Ending Cash": number;
  "CFO / PAT": number;
  "CFO / EBITDA": number;
}

export type RatioClass = "Strong" | "Acceptable" | "Weak" | "Red";

export interface MonthStatus {
  month: string;
  cfoPat: number;
  cfoEbitda: number;
  classification: RatioClass;
}

export interface CashFlowResults {
  monthlyData: Record<string, ComputedCFMonth>;
  quarters: Record<string, Record<string, number>>;
  annual: Record<string, number>;
  status: MonthStatus[];
  monthsAdded: string[];
  openingCash: number;
}

// ================== CLASSIFICATION ==================

function getRatioClassification(cfoPat: number): RatioClass {
  if (cfoPat > 1.2) return "Strong";
  if (cfoPat >= 0.8) return "Acceptable";
  if (cfoPat >= 0) return "Weak";
  return "Red";
}

// ================== CALCULATION ENGINE ==================

function computeMonth(m: Record<string, number | string>, runningCash: number): { computed: ComputedCFMonth; endingCash: number } {
  const c = { ...m } as any;
  const n = (k: string) => Number(m[k]) || 0;

  // CFO
  c["Total Cash inflow"] = n("Business receipts") + n("Other cash receipts (including interest income)");

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

  c["Net Cash Flow from Operating Activities (CFO)"] = c["Total Cash inflow"] - c["Total Outflows"];

  // CFI
  c["Cash Flow from Investing Activities (CFI)"] = n("Sale of Assets") - n("Purchase of Assets");

  // CFF
  c["Cash Flow from Financing Activities (CFF)"] =
    n("Equity raised") + n("Loan Taken") - n("Loan repaid") - n("Dividends paid");

  // Net Cash Flow & Ending Cash
  c["Net Cash Flow"] =
    c["Net Cash Flow from Operating Activities (CFO)"] +
    c["Cash Flow from Investing Activities (CFI)"] +
    c["Cash Flow from Financing Activities (CFF)"];

  const endingCash = runningCash + c["Net Cash Flow"];
  c["Ending Cash"] = endingCash;

  // Ratios
  const pat = n("Net Profit");
  const ebitda = n("EBITDA");
  c["CFO / PAT"] = pat !== 0 ? c["Net Cash Flow from Operating Activities (CFO)"] / pat : 0;
  c["CFO / EBITDA"] = ebitda !== 0 ? c["Net Cash Flow from Operating Activities (CFO)"] / ebitda : 0;

  return { computed: c as ComputedCFMonth, endingCash };
}

function sumMonths(
  data: Record<string, Record<string, number | string>>,
  months: string[]
): Record<string, number> {
  const sum: Record<string, number> = {};
  months.forEach((month) => {
    const d = data[month];
    if (!d) return;
    Object.keys(d).forEach((key) => {
      const v = d[key];
      if (typeof v === "number") {
        sum[key] = (sum[key] || 0) + v;
      }
    });
  });
  return sum;
}

export function calculateCashFlow(
  monthsData: Record<string, Record<string, number>>,
  openingCash: number
): CashFlowResults {
  const computed: Record<string, ComputedCFMonth> = {};
  const addedMonths: string[] = [];
  let runningCash = openingCash;

  MONTHS_ORDER.forEach((month) => {
    if (!monthsData[month]) return;
    addedMonths.push(month);
    const { computed: c, endingCash } = computeMonth(monthsData[month], runningCash);
    computed[month] = c;
    runningCash = endingCash;
  });

  const quarters: Record<string, Record<string, number>> = {
    "Q1 (Apr–Jun)": sumMonths(computed, ["April", "May", "Jun"]),
    "Q2 (Jul–Sep)": sumMonths(computed, ["July", "Aug", "Sep"]),
    "Q3 (Oct–Dec)": sumMonths(computed, ["Oct", "Nov", "Dec"]),
    "Q4 (Jan–Mar)": sumMonths(computed, ["Jan", "Feb", "Mar"]),
  };

  const annual = sumMonths(computed, [...MONTHS_ORDER]);

  const status: MonthStatus[] = addedMonths.map((month) => ({
    month,
    cfoPat: Number(computed[month]["CFO / PAT"]) || 0,
    cfoEbitda: Number(computed[month]["CFO / EBITDA"]) || 0,
    classification: getRatioClassification(Number(computed[month]["CFO / PAT"]) || 0),
  }));

  return { monthlyData: computed, quarters, annual, status, monthsAdded: addedMonths, openingCash };
}

// Output fields for display tables
export const OUTPUT_FIELDS: { key: string; label: string; format: "currency" | "ratio" | "classification"; section: string }[] = [
  // CFO
  { key: "Total Cash inflow", label: "Total Cash Inflow", format: "currency", section: "Operating (CFO)" },
  { key: "Total Outflows", label: "Total Outflows", format: "currency", section: "Operating (CFO)" },
  { key: "Net Cash Flow from Operating Activities (CFO)", label: "Net CFO", format: "currency", section: "Operating (CFO)" },
  // CFI
  { key: "Cash Flow from Investing Activities (CFI)", label: "Net CFI", format: "currency", section: "Investing (CFI)" },
  // CFF
  { key: "Cash Flow from Financing Activities (CFF)", label: "Net CFF", format: "currency", section: "Financing (CFF)" },
  // Net
  { key: "Net Cash Flow", label: "Net Cash Flow", format: "currency", section: "Summary" },
  { key: "Ending Cash", label: "Ending Cash", format: "currency", section: "Summary" },
  // Ratios
  { key: "CFO / PAT", label: "CFO / PAT", format: "ratio", section: "Ratios" },
  { key: "CFO / EBITDA", label: "CFO / EBITDA", format: "ratio", section: "Ratios" },
];
