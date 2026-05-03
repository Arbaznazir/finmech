// ========================================================
// BURN & RUNWAY MONITOR – FULL EXCEL MATCH
// Month-by-month → cumulative cash, burn rates, runway,
// ratios & GREEN/AMBER/RED classification
// ========================================================

export const MONTHS_ORDER = [
  "April", "May", "June", "July", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export type MonthName = (typeof MONTHS_ORDER)[number];

export interface BurnMonthInputs {
  [key: string]: number | string;
  "Fixed Expenses": number;
  "Variable Expenses": number;
  "Recurring Revenue": number;
  "Miscll. revenue": number;
}

export const INPUT_FIELDS: { key: string; label: string; category: string }[] = [
  { key: "Fixed Expenses", label: "Fixed Expenses", category: "Expenses" },
  { key: "Variable Expenses", label: "Variable Expenses", category: "Expenses" },
  { key: "Recurring Revenue", label: "Recurring Revenue", category: "Revenue" },
  { key: "Miscll. revenue", label: "Miscellaneous Revenue", category: "Revenue" },
];

export function createEmptyInputs(): BurnMonthInputs {
  return {
    "Fixed Expenses": 0,
    "Variable Expenses": 0,
    "Recurring Revenue": 0,
    "Miscll. revenue": 0,
  };
}

export interface ComputedBurnMonth extends BurnMonthInputs {
  "Total Expenses": number;
  "Total Revenue": number;
  "Net Profit/Loss": number;
  "Cumulative Cash": number;
  "Gross Burn": number;
  "Net Burn": number;
  "Avg Net Burn (to date)": number;
  "Net Burn Ratio": number;
  "Recurring Revenue ratio": number;
  "Variable Cost Ratio": number;
  "Fixed expenses Ratio": number;
  "Runway (months)": number;
  "CLASSIFICATION": string;
}

export type Classification = "GREEN" | "AMBER" | "RED";

export interface MonthStatus {
  month: string;
  classification: Classification;
  runway: number;
  netBurn: number;
  cumulativeCash: number;
}

export interface BurnRunwayResults {
  monthlyData: Record<string, ComputedBurnMonth>;
  status: MonthStatus[];
  monthsAdded: string[];
  openingCash: number;
}

// ================== CLASSIFICATION LOGIC ==================

function getClassification(m: Record<string, number>): Classification {
  const recurringRatio = m["Recurring Revenue ratio"] || 0;
  const netBurnRatio = m["Net Burn Ratio"] || 0;
  const runway = m["Runway (months)"] || 0;

  if (recurringRatio >= 0.70 && runway >= 12 && netBurnRatio <= 0.30) {
    return "GREEN";
  } else if (recurringRatio >= 0.40 && runway >= 6 && netBurnRatio <= 0.60) {
    return "AMBER";
  }
  return "RED";
}

// ================== CALCULATION ENGINE ==================

export function calculateBurnRunway(
  monthsData: Record<string, Record<string, number>>,
  openingCash: number
): BurnRunwayResults {
  const computed: Record<string, ComputedBurnMonth> = {};
  const addedMonths: string[] = [];
  let cumulativeCash = openingCash;

  MONTHS_ORDER.forEach((month, globalIdx) => {
    if (!monthsData[month]) return;

    const m = { ...monthsData[month] } as any;
    addedMonths.push(month);

    // Core calculations
    m["Total Expenses"] = (m["Fixed Expenses"] || 0) + (m["Variable Expenses"] || 0);
    m["Total Revenue"] = (m["Recurring Revenue"] || 0) + (m["Miscll. revenue"] || 0);
    m["Net Profit/Loss"] = m["Total Revenue"] - m["Total Expenses"];

    // Cumulative Cash
    cumulativeCash += m["Net Profit/Loss"];
    m["Cumulative Cash"] = cumulativeCash;

    // Burn Metrics
    m["Gross Burn"] = m["Total Expenses"];
    m["Net Burn"] = m["Total Expenses"] - m["Total Revenue"];

    // Avg Net Burn (to date)
    const monthsSoFar = addedMonths.length;
    const totalNetBurnSoFar = addedMonths.reduce(
      (sum, mName) => sum + ((computed[mName]?.["Net Burn"] ?? 0) + (mName === month ? m["Net Burn"] : 0)),
      0
    );
    // Simpler: recalculate from all computed months + current
    let runningNetBurn = 0;
    addedMonths.forEach((mn) => {
      if (mn === month) runningNetBurn += m["Net Burn"];
      else runningNetBurn += computed[mn]["Net Burn"];
    });
    m["Avg Net Burn (to date)"] = runningNetBurn / monthsSoFar;

    // Ratios
    const totalRev = m["Total Revenue"];
    m["Net Burn Ratio"] = totalRev > 0 ? m["Net Burn"] / totalRev : 0;
    m["Recurring Revenue ratio"] = totalRev > 0 ? (m["Recurring Revenue"] || 0) / totalRev : 0;
    m["Variable Cost Ratio"] = totalRev > 0 ? (m["Variable Expenses"] || 0) / totalRev : 0;
    m["Fixed expenses Ratio"] = totalRev > 0 ? (m["Fixed Expenses"] || 0) / totalRev : 0;

    // Runway
    const avgNetBurn = m["Avg Net Burn (to date)"];
    m["Runway (months)"] = avgNetBurn > 0 ? m["Cumulative Cash"] / avgNetBurn : Infinity;

    // Classification
    m["CLASSIFICATION"] = getClassification(m);

    computed[month] = m as ComputedBurnMonth;
  });

  const status: MonthStatus[] = addedMonths.map((month) => ({
    month,
    classification: computed[month]["CLASSIFICATION"] as Classification,
    runway: computed[month]["Runway (months)"],
    netBurn: computed[month]["Net Burn"],
    cumulativeCash: computed[month]["Cumulative Cash"],
  }));

  return { monthlyData: computed, status, monthsAdded: addedMonths, openingCash };
}

// Output fields for display
export const OUTPUT_FIELDS: { key: string; label: string; format: "currency" | "ratio" | "months" | "classification" }[] = [
  { key: "Total Expenses", label: "Total Expenses", format: "currency" },
  { key: "Total Revenue", label: "Total Revenue", format: "currency" },
  { key: "Net Profit/Loss", label: "Net Profit/Loss", format: "currency" },
  { key: "Cumulative Cash", label: "Cumulative Cash", format: "currency" },
  { key: "Gross Burn", label: "Gross Burn", format: "currency" },
  { key: "Net Burn", label: "Net Burn", format: "currency" },
  { key: "Avg Net Burn (to date)", label: "Avg Net Burn (to date)", format: "currency" },
  { key: "Net Burn Ratio", label: "Net Burn Ratio", format: "ratio" },
  { key: "Recurring Revenue ratio", label: "Recurring Revenue Ratio", format: "ratio" },
  { key: "Variable Cost Ratio", label: "Variable Cost Ratio", format: "ratio" },
  { key: "Fixed expenses Ratio", label: "Fixed Expenses Ratio", format: "ratio" },
  { key: "Runway (months)", label: "Runway (months)", format: "months" },
  { key: "CLASSIFICATION", label: "Classification", format: "classification" },
];
