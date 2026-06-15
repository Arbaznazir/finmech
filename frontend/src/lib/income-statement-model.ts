// ========================================================
// INCOME STATEMENT MODEL – FULL EXCEL MATCH
// Month-by-month input → automatic quarterly + annual roll-up
// Exact field names, formulas, margins, status messages
// ========================================================

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
  // Revenue
  { key: "Operational Revenue (Recurring Receipts)", label: "Recurring Revenue", category: "Revenue" },
  { key: "Operational Revenue (Variable revenue including interest income)", label: "Variable Revenue (incl. Interest)", category: "Revenue" },
  // COGS
  { key: "COGS (Direct Costs)", label: "COGS (Direct Costs)", category: "Cost of Goods Sold" },
  { key: "Freight & Logistics", label: "Freight & Logistics", category: "Cost of Goods Sold" },
  { key: "Other Variable Costs", label: "Other Variable Costs", category: "Cost of Goods Sold" },
  // Operating Expenses
  { key: "Salaries & Benefits", label: "Salaries & Benefits", category: "Operating Expenses" },
  { key: "Rent & Utilities", label: "Rent & Utilities", category: "Operating Expenses" },
  { key: "Professional & Legal Fees", label: "Professional & Legal Fees", category: "Operating Expenses" },
  { key: "Technology & IT Costs", label: "Technology & IT Costs", category: "Operating Expenses" },
  { key: "Marketing & Advertising", label: "Marketing & Advertising", category: "Operating Expenses" },
  { key: "Travel", label: "Travel", category: "Operating Expenses" },
  { key: "Miscll Operating expenses", label: "Miscl. Operating Expenses", category: "Operating Expenses" },
  // D&A, Finance, Tax
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
  guidance: string[];
}

export interface IncomeStatementResults {
  monthlyData: Record<string, ComputedMonth>;
  quarters: Record<string, QuarterData>;
  annual: QuarterData;
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

// ================== CALCULATION ENGINE ==================

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

  // Gross Profit & Margin
  computed["Gross Profit"] = computed["Gross Revenue"] - computed["Total of COGS"];
  computed["Gross Margin %"] =
    computed["Gross Revenue"] > 0
      ? (computed["Gross Profit"] / computed["Gross Revenue"]) * 100
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
    computed["Gross Revenue"] > 0
      ? (computed["EBITDA"] / computed["Gross Revenue"]) * 100
      : 0;

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
      ? (computed["Net Profit"] / computed["Gross Revenue"]) * 100
      : 0;

  // Fixed & Variable costs - Proper classification
  // Fixed Costs: Costs that don't change with revenue volume
  computed["Total Fixed Costs"] =
    (m["Salaries & Benefits"] || 0) +
    (m["Rent & Utilities"] || 0) +
    (m["Professional & Legal Fees"] || 0) +
    (m["Technology & IT Costs"] || 0) +
    dep + // Depreciation is fixed
    interestExp; // Interest is fixed

  // Variable Costs: Costs that scale with revenue/production
  computed["Total variable Costs"] =
    computed["Total of COGS"] + // COGS includes Direct Costs, Freight, Other Variable
    (m["Marketing & Advertising"] || 0) + // Marketing typically scales with revenue
    (m["Travel"] || 0) + // Travel varies with business activity
    (m["Miscll Operating expenses"] || 0); // Misc operating varies

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
  // Re-calculate margin percentages for the aggregate
  if (sum["Gross Revenue"] && sum["Gross Revenue"] > 0) {
    sum["Gross Margin %"] = (sum["Gross Profit"] / sum["Gross Revenue"]) * 100;
    sum["EBITDA Margin %"] = (sum["EBITDA"] / sum["Gross Revenue"]) * 100;
    sum["Net Margin %"] = (sum["Net Profit"] / sum["Gross Revenue"]) * 100;
  }
  return sum;
}

export function calculateIncomeStatement(
  monthsData: Record<string, Record<string, number>>
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

  // 5. Status messages - Clear, specific, actionable insights
  let overall: string;
  let overallColor: string;
  let guidance: string[] = [];

  const fixedCostRatio = annual["Gross Revenue"] > 0 
    ? (annual["Total Fixed Costs"] / annual["Gross Revenue"]) * 100 
    : 0;
  const variableCostRatio = annual["Gross Revenue"] > 0 
    ? (annual["Total variable Costs"] / annual["Gross Revenue"]) * 100 
    : 0;

  // Determine overall status
  if (addedMonths.length === 0) {
    overall = "Enter your monthly data to see your complete P&L analysis.";
    overallColor = "text-muted-foreground";
    guidance.push("Start by entering revenue and expense data for at least one month.");
  } else if (annual["Net Profit"] > 0 && netMarginAnnual > 15) {
    overall = "Strong profitability! Your business is performing exceptionally well.";
    overallColor = "text-success";
  } else if (annual["Net Profit"] > 0) {
    overall = "Profitable but room for improvement. Focus on margin optimization.";
    overallColor = "text-amber-400";
  } else if (annual["EBITDA"] > 0) {
    overall = "Operating profit exists, but interest/tax burden is high.";
    overallColor = "text-amber-400";
  } else {
    overall = "Loss-making. Immediate cost review or revenue strategy needed.";
    overallColor = "text-danger";
  }

  // Specific guidance based on metrics
  if (grossMarginAnnual < 20 && addedMonths.length > 0) {
    guidance.push("⚠️ Low gross margin (<20%) — increase prices or reduce direct costs.");
  } else if (grossMarginAnnual > 50 && addedMonths.length > 0) {
    guidance.push("✓ Strong gross margin (>50%) — your core business is healthy.");
  }

  if (ebitdaMarginAnnual < 0 && addedMonths.length > 0) {
    guidance.push("⚠️ Negative EBITDA — your operating expenses exceed gross profit.");
  }

  if (fixedCostRatio > 40 && addedMonths.length > 0) {
    guidance.push("⚠️ High fixed cost ratio (>40%) — consider cost flexibility or revenue growth.");
  }

  if (revenueGrowthQ2Q !== null) {
    if (revenueGrowthQ2Q > 20) {
      guidance.push("✓ Strong revenue growth (>20% quarter-over-quarter).");
    } else if (revenueGrowthQ2Q < -10) {
      guidance.push("⚠️ Revenue declining (>10%) — investigate sales/marketing effectiveness.");
    }
  }

  if (netMarginAnnual < 0 && annual["Net Profit"] < 0 && addedMonths.length > 0) {
    const breakEvenPct = (Math.abs(annual["Net Profit"]) / annual["Gross Revenue"] * 100).toFixed(1);
    guidance.push(`💡 To break even, increase revenue by ${breakEvenPct}% or reduce costs by ₹${Math.abs(annual["Net Profit"]).toLocaleString("en-IN")}`);
  }

  // Default guidance if nothing specific
  if (guidance.length === 0 && addedMonths.length > 0) {
    if (netMarginAnnual > 10) {
      guidance.push("✓ Business fundamentals are strong. Maintain this performance.");
    } else {
      guidance.push("📊 Continue monitoring monthly to track improvements.");
    }
  }

  return {
    monthlyData: computed,
    quarters,
    annual,
    status: { overall, overallColor, guidance },
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
  { key: "Total of COGS", label: "Total COGS", format: "currency" },
  { key: "Gross Profit", label: "Gross Profit", format: "currency" },
  { key: "Gross Margin %", label: "Gross Margin", format: "percent" },
  { key: "Total Operating Expenses", label: "Total Operating Expenses", format: "currency" },
  { key: "EBITDA", label: "EBITDA", format: "currency" },
  { key: "EBITDA Margin %", label: "EBITDA Margin", format: "percent" },
  { key: "EBIT", label: "EBIT", format: "currency" },
  { key: "PBT", label: "Profit Before Tax", format: "currency" },
  { key: "Net Profit", label: "Net Profit (PAT)", format: "currency" },
  { key: "Net Margin %", label: "Net Margin", format: "percent" },
  { key: "Total Fixed Costs", label: "Total Fixed Costs", format: "currency" },
  { key: "Total variable Costs", label: "Total Variable Costs", format: "currency" },
];
