// ========================================================
// BREAK-EVEN MODEL (STANDALONE) – FULL EXCEL MATCH
// Source: FINMECH-UPGRADED/2.Stand alone models/5.Break-even Model.xlsx
// ========================================================

import { BREAK_EVEN_EXACT } from "@/lib/excel-model-content";

/** Units column (F) from Excel BreakEven Table — exact order. */
export const EXCEL_STANDALONE_PROJECTION_UNITS = [
  10, 20, 50, 100, 125, 175, 700, 800, 400, 450, 500, 550, 600, 650, 700, 750,
  800, 850, 900, 950, 1000, 1050, 1100, 700, 800, 900, 1000, 1100, 1200, 1300, 1400,
] as const;

export interface BreakEvenInputs {
  pricePerUnit: number;
  variableCostPerUnit: number;
  fixedCostMonthly: number;
}

export interface SimulationRow {
  units: number;
  revenue: number;
  totalCost: number;
  profitLoss: number;
  aboveBreakEven: boolean;
  status: "GREEN" | "RED";
}

export interface BreakEvenResults {
  contributionPerUnit: number;
  contributionMargin: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  simulation: SimulationRow[];
}

export interface BreakEvenInsights {
  overall: string;
  overallColor: string;
  guidance: string[];
  healthScore: number;
  difficulty: "easy" | "moderate" | "challenging" | "very-hard";
}

export interface BreakEvenCompleteResults extends BreakEvenResults {
  insights: BreakEvenInsights;
}

export const INPUT_FIELDS: { key: keyof BreakEvenInputs; label: string; category: string }[] = [
  { key: "pricePerUnit", label: "Price per Unit", category: "Pricing" },
  { key: "variableCostPerUnit", label: "Variable Cost per Unit", category: "Costs" },
  { key: "fixedCostMonthly", label: "Fixed Cost (Periodic- monthly)", category: "Costs" },
];

export const OUTPUT_FIELDS: { key: string; label: string }[] = [
  { key: "contributionPerUnit", label: "Contribution per Unit" },
  { key: "breakEvenUnits", label: "Break-even Units" },
  { key: "breakEvenRevenue", label: "Break-even Revenue" },
];

export function createEmptyInputs(): BreakEvenInputs {
  return {
    pricePerUnit: 0,
    variableCostPerUnit: 0,
    fixedCostMonthly: 0,
  };
}

export function calculateBreakEven(
  inputs: BreakEvenInputs,
  simulationUnits: number[] = [...EXCEL_STANDALONE_PROJECTION_UNITS],
): BreakEvenCompleteResults {
  const { pricePerUnit, variableCostPerUnit, fixedCostMonthly } = inputs;

  const contributionPerUnit = pricePerUnit - variableCostPerUnit;
  const contributionMargin =
    pricePerUnit > 0 ? contributionPerUnit / pricePerUnit : 0;
  const breakEvenUnits =
    contributionPerUnit > 0 ? fixedCostMonthly / contributionPerUnit : 0;
  const breakEvenRevenue = breakEvenUnits * pricePerUnit;

  const unitSet = new Set(simulationUnits.filter((u) => u > 0));
  const simulation: SimulationRow[] = [...unitSet]
    .sort((a, b) => a - b)
    .map((units) => {
      const revenue = units * pricePerUnit;
      const totalCost = fixedCostMonthly + units * variableCostPerUnit;
      const profitLoss = revenue - totalCost;
      return {
        units,
        revenue,
        totalCost,
        profitLoss,
        aboveBreakEven: units >= breakEvenUnits,
        status: profitLoss >= 0 ? "GREEN" : "RED",
      };
    });

  const results: BreakEvenResults = {
    contributionPerUnit,
    contributionMargin,
    breakEvenUnits,
    breakEvenRevenue,
    simulation,
  };

  return { ...results, insights: generateInsights(inputs, results) };
}

function generateInsights(
  inputs: BreakEvenInputs,
  results: BreakEvenResults,
): BreakEvenInsights {
  const { pricePerUnit } = inputs;
  const be = BREAK_EVEN_EXACT;

  if (pricePerUnit <= 0 || inputs.variableCostPerUnit < 0 || inputs.fixedCostMonthly < 0) {
    return {
      overall: "",
      overallColor: "text-muted-foreground",
      guidance: [],
      healthScore: 0,
      difficulty: "easy",
    };
  }

  const contributionMargin =
    pricePerUnit > 0 ? results.contributionPerUnit / pricePerUnit : 0;

  const guidance = [
    be.pricePerUnit.question,
    be.variableCostPerUnit.question,
    be.fixedCostMonthly.question,
    be.contributionPerUnit.what,
    be.breakEvenUnits.what,
    be.breakEvenRevenue.what,
  ].filter(Boolean);

  const overall =
    contributionMargin < 0 ? be.variableCostPerUnit.what : be.breakEvenUnits.what;
  const overallColor = contributionMargin < 0 ? "text-danger" : "text-success";

  return {
    overall,
    overallColor,
    guidance,
    healthScore: 0,
    difficulty: "easy",
  };
}

export const BREAK_EVEN_TOOLTIPS = {
  pricePerUnit: {
    what: BREAK_EVEN_EXACT.pricePerUnit.what,
    why: BREAK_EVEN_EXACT.pricePerUnit.question,
  },
  variableCostPerUnit: {
    what: BREAK_EVEN_EXACT.variableCostPerUnit.what,
    why: BREAK_EVEN_EXACT.variableCostPerUnit.question,
  },
  fixedCostMonthly: {
    what: BREAK_EVEN_EXACT.fixedCostMonthly.what,
    why: BREAK_EVEN_EXACT.fixedCostMonthly.question,
  },
  contributionPerUnit: {
    what: BREAK_EVEN_EXACT.contributionPerUnit.what,
    why: BREAK_EVEN_EXACT.contributionPerUnit.question,
  },
  breakEvenUnits: {
    what: BREAK_EVEN_EXACT.breakEvenUnits.what,
    why: BREAK_EVEN_EXACT.breakEvenUnits.question,
  },
  breakEvenRevenue: {
    what: BREAK_EVEN_EXACT.breakEvenRevenue.what,
    why: BREAK_EVEN_EXACT.breakEvenRevenue.question,
  },
};
