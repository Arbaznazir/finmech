// ========================================================
// BURN & RUNWAY MONITOR – FULL EXCEL MATCH
// Month-by-month → cumulative cash, burn rates, runway,
// ratios & GREEN/AMBER/RED classification
// ========================================================

import { BURN_CLASSIFICATION_MESSAGES } from "@/lib/excel-model-content";
import { ragTextClass } from "@/lib/utils";

export const MONTHS_ORDER = [
  "April", "May", "June", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

/** Legacy saved state may use "July" — map to Excel month key "Jul". */
const MONTH_ALIASES: Record<string, MonthName> = {
  July: "Jul",
  Jul: "Jul",
};

function normalizeMonthsData(
  monthsData: Record<string, Record<string, number>>,
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const [month, inputs] of Object.entries(monthsData)) {
    const key = (MONTH_ALIASES[month] ?? month) as MonthName;
    if (MONTHS_ORDER.includes(key)) out[key] = inputs;
  }
  return out;
}

/** null = infinite runway (JSON-safe; Infinity serializes to null). */
export function isInfiniteRunway(runway: number | null | undefined): boolean {
  return runway === null || runway === undefined || !Number.isFinite(runway);
}

export function formatRunway(runway: number | null | undefined): string {
  if (isInfiniteRunway(runway)) return "∞";
  return `${Math.round((runway as number) * 10) / 10} mo`;
}

function computeRunway(cumulativeCash: number, avgNetBurn: number): number | null {
  if (avgNetBurn <= 0) return null;
  return cumulativeCash / avgNetBurn;
}

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
  { key: "Miscll. revenue", label: "Miscll. revenue", category: "Revenue" },
];

export function createEmptyInputs(): BurnMonthInputs {
  return {
    "Fixed Expenses": 0,
    "Variable Expenses": 0,
    "Recurring Revenue": 0,
    "Miscll. revenue": 0,
  };
}

export interface ComputedBurnMonth {
  [key: string]: number | string | null;
  "Fixed Expenses": number;
  "Variable Expenses": number;
  "Recurring Revenue": number;
  "Miscll. revenue": number;
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
  "Runway (months)": number | null;
  "CLASSIFICATION": string;
}

export type Classification = "GREEN" | "AMBER" | "RED";

export interface MonthStatus {
  month: string;
  classification: Classification;
  runway: number | null;
  netBurn: number;
  cumulativeCash: number;
}

export interface BurnRunwayInsights {
  overall: string;
  overallColor: string;
  classification: Classification | null;
  guidance: string[];
  healthScore: number; // 0-100
  runwayTrend: "improving" | "stable" | "declining" | "critical";
  cashOutlook: "surplus" | "adequate" | "constrained" | "deficit";
}

export interface BurnRunwayResults {
  monthlyData: Record<string, ComputedBurnMonth>;
  status: MonthStatus[];
  monthsAdded: string[];
  openingCash: number;
  insights: BurnRunwayInsights;
}

// ================== CLASSIFICATION LOGIC ==================

function getClassification(m: Record<string, number | null | string>): Classification {
  const recurringRatio = Number(m["Recurring Revenue ratio"]) || 0;
  const netBurn = Number(m["Net Burn"]) || 0;
  const variableCostRatio = Number(m["Variable Cost Ratio"]) || 0;
  const netProfit = Number(m["Net Profit/Loss"]) || 0;
  const runway = m["Runway (months)"] as number | null;
  const runwayMonths = isInfiniteRunway(runway) ? Infinity : Number(runway);

  // Excel Budget!R4 formula
  if (
    recurringRatio > 0.7 &&
    (netProfit > 0 || netBurn < 0.15) &&
    (runwayMonths > 12 || runwayMonths === Infinity) &&
    variableCostRatio < 0.5
  ) {
    return "GREEN";
  }

  const netBurnRatio = Number(m["Net Burn Ratio"]) || 0;
  const fixedExpenses = Number(m["Fixed Expenses"]) || 0;

  // Excel Budget!R4 — AMBER branch uses K (Net Burn abs), M (Net Burn Ratio), B (Fixed Expenses)
  if (
    recurringRatio > 0.14 &&
    recurringRatio < 0.7 &&
    netProfit < 0 &&
    netBurn < 0.3 &&
    runwayMonths > 6 &&
    netBurnRatio < 12 &&
    fixedExpenses > 0.3
  ) {
    return "AMBER";
  }

  return "RED";
}

// ================== CALCULATION ENGINE ==================

export function calculateBurnRunway(
  monthsData: Record<string, Record<string, number>>,
  openingCash: number
): BurnRunwayResults {
  const normalized = normalizeMonthsData(monthsData);
  const computed: Record<string, ComputedBurnMonth> = {};
  const addedMonths: string[] = [];
  let cumulativeCash = openingCash;

  MONTHS_ORDER.forEach((month) => {
    if (!normalized[month]) return;

    const m = { ...normalized[month] } as Record<string, number | string | null>;
    addedMonths.push(month);

    // Core calculations
    m["Total Expenses"] = (Number(m["Fixed Expenses"]) || 0) + (Number(m["Variable Expenses"]) || 0);
    m["Total Revenue"] = (Number(m["Recurring Revenue"]) || 0) + (Number(m["Miscll. revenue"]) || 0);
    m["Net Profit/Loss"] = Number(m["Total Revenue"]) - Number(m["Total Expenses"]);

    // Cumulative Cash
    cumulativeCash += Number(m["Net Profit/Loss"]);
    m["Cumulative Cash"] = cumulativeCash;

    // Burn Metrics
    m["Gross Burn"] = Number(m["Total Expenses"]);
    m["Net Burn"] = Math.max(0, Number(m["Total Expenses"]) - Number(m["Total Revenue"]));

    // Avg Net Burn (to date) — Excel: AVERAGE(K$4:Kn)
    const monthsSoFar = addedMonths.length;
    let runningNetBurn = 0;
    addedMonths.forEach((mn) => {
      if (mn === month) runningNetBurn += Number(m["Net Burn"]);
      else runningNetBurn += Number(computed[mn]["Net Burn"]);
    });
    m["Avg Net Burn (to date)"] = runningNetBurn / monthsSoFar;

    // Ratios — Excel: IF(G=0,1,K/G) for net burn ratio
    const totalRev = Number(m["Total Revenue"]);
    m["Net Burn Ratio"] = totalRev > 0 ? Number(m["Net Burn"]) / totalRev : 1;
    m["Recurring Revenue ratio"] = totalRev > 0 ? (Number(m["Recurring Revenue"]) || 0) / totalRev : 0;
    m["Variable Cost Ratio"] = totalRev > 0 ? (Number(m["Variable Expenses"]) || 0) / totalRev : 0;
    m["Fixed expenses Ratio"] = totalRev > 0 ? (Number(m["Fixed Expenses"]) || 0) / totalRev : 0;

    // Runway — Excel: IF(L=0,"infinite",I/L); null = infinite (JSON-safe)
    const avgNetBurn = Number(m["Avg Net Burn (to date)"]);
    m["Runway (months)"] = computeRunway(Number(m["Cumulative Cash"]), avgNetBurn);

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

  // Generate comprehensive insights
  const insights = generateInsights(computed, addedMonths, status, openingCash);

  return { monthlyData: computed, status, monthsAdded: addedMonths, openingCash, insights };
}

function generateInsights(
  computed: Record<string, ComputedBurnMonth>,
  addedMonths: string[],
  status: MonthStatus[],
  openingCash: number
): BurnRunwayInsights {
  const guidance: string[] = [];
  let overall: string;
  let overallColor: string;
  let healthScore = 100;
  let runwayTrend: "improving" | "stable" | "declining" | "critical" = "stable";
  let cashOutlook: "surplus" | "adequate" | "constrained" | "deficit" = "adequate";

  // Check if any data entered
  if (addedMonths.length === 0) {
    return {
      overall: "",
      overallColor: "text-muted-foreground",
      classification: null,
      guidance: [],
      healthScore: 0,
      runwayTrend: "stable",
      cashOutlook: "adequate",
    };
  }

  // Get latest month data
  const latestMonth = addedMonths[addedMonths.length - 1];
  const latest = computed[latestMonth];
  const latestStatus = status[status.length - 1];

  // Cash position analysis (health score only)
  const finalCash = latest["Cumulative Cash"];
  if (finalCash < 0) {
    healthScore -= 40;
    cashOutlook = "deficit";
  } else if (finalCash < openingCash * 0.2) {
    healthScore -= 25;
    cashOutlook = "constrained";
  } else if (finalCash > openingCash * 1.5) {
    cashOutlook = "surplus";
  }

  // Runway analysis (health score only)
  const runway = latestStatus.runway;
  if (isInfiniteRunway(runway)) {
    healthScore = Math.min(100, healthScore + 10);
    runwayTrend = "improving";
  } else if (runway != null && runway < 3) {
    healthScore -= 35;
    runwayTrend = "critical";
  } else if (runway != null && runway < 6) {
    healthScore -= 20;
    runwayTrend = "declining";
  } else if (runway != null && runway < 12) {
    healthScore -= 5;
  }

  // Trend analysis
  if (addedMonths.length >= 3) {
    const midPoint = Math.floor(addedMonths.length / 2);
    const firstHalf = addedMonths.slice(0, midPoint);
    const secondHalf = addedMonths.slice(midPoint);

    const firstHalfBurn = firstHalf.reduce((sum, m) => sum + computed[m]["Net Burn"], 0) / firstHalf.length;
    const secondHalfBurn = secondHalf.reduce((sum, m) => sum + computed[m]["Net Burn"], 0) / secondHalf.length;

    if (secondHalfBurn < firstHalfBurn * 0.8) {
      if (runwayTrend !== "critical") runwayTrend = "improving";
    } else if (secondHalfBurn > firstHalfBurn * 1.2) {
      healthScore -= 15;
      if (runwayTrend !== "critical") runwayTrend = "declining";
    }
  }

  const recurringRatio = latest["Recurring Revenue ratio"] || 0;
  if (recurringRatio < 0.3) healthScore -= 10;

  const netBurnRatio = latest["Net Burn Ratio"] || 0;
  if (netBurnRatio > 1) healthScore -= 20;
  else if (netBurnRatio > 0.5) healthScore -= 10;

  const redMonths = status.filter(s => s.classification === "RED").length;
  if (redMonths > status.length * 0.5) healthScore -= 15;

  // Excel classification commentary (latest month)
  const classification = latestStatus.classification;
  const excelMsgs = BURN_CLASSIFICATION_MESSAGES[classification];

  overall = excelMsgs.overall;
  overallColor = ragTextClass(classification);

  guidance.push(...excelMsgs.guidance);

  return {
    overall,
    overallColor,
    classification,
    guidance,
    healthScore: Math.max(0, healthScore),
    runwayTrend,
    cashOutlook,
  };
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
  { key: "Recurring Revenue ratio", label: "Recurring Revenue ratio", format: "ratio" },
  { key: "Variable Cost Ratio", label: "Variable Cost Ratio", format: "ratio" },
  { key: "Fixed expenses Ratio", label: "Fixed expenses Ratio", format: "ratio" },
  { key: "Runway (months)", label: "Runway (months)", format: "months" },
  { key: "CLASSIFICATION", label: "Classification", format: "classification" },
];
