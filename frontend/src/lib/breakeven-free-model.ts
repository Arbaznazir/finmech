// ========================================================
// BREAK-EVEN MODEL (FREE) – FULL EXCEL MATCH
// Standalone break-even calculator
// pricePerUnit, variableCostPerUnit, fixedCostMonthly
// ========================================================

export interface BreakEvenFreeInputs {
  pricePerUnit: number;
  variableCostPerUnit: number;
  fixedCostMonthly: number;
  unitsSoldForProjection: number;
}

export interface BreakEvenFreeResults {
  pricePerUnit: number;
  variableCostPerUnit: number;
  fixedCostMonthly: number;
  contributionPerUnit: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  revenueAtUnits: number;
  totalCostAtUnits: number;
  profitAtUnits: number;
}

export const BREAKEVEN_FREE_FIELDS: { key: keyof BreakEvenFreeInputs; label: string; prefix: string }[] = [
  { key: "pricePerUnit", label: "Price Per Unit", prefix: "$" },
  { key: "variableCostPerUnit", label: "Variable Cost Per Unit", prefix: "$" },
  { key: "fixedCostMonthly", label: "Fixed Cost (Monthly)", prefix: "$" },
  { key: "unitsSoldForProjection", label: "Units Sold (for projection)", prefix: "#" },
];

export function createEmptyBreakEvenInputs(): BreakEvenFreeInputs {
  return {
    pricePerUnit: 0,
    variableCostPerUnit: 0,
    fixedCostMonthly: 0,
    unitsSoldForProjection: 0,
  };
}

export function calculateBreakEvenFree(inputs: BreakEvenFreeInputs): BreakEvenFreeResults {
  const { pricePerUnit, variableCostPerUnit, fixedCostMonthly, unitsSoldForProjection } = inputs;

  const contributionPerUnit = pricePerUnit - variableCostPerUnit;

  const breakEvenUnits = contributionPerUnit > 0
    ? Math.ceil(fixedCostMonthly / contributionPerUnit)
    : Infinity;

  const breakEvenRevenue = breakEvenUnits === Infinity ? 0 : breakEvenUnits * pricePerUnit;

  const revenueAtUnits = unitsSoldForProjection * pricePerUnit;
  const totalCostAtUnits = fixedCostMonthly + (unitsSoldForProjection * variableCostPerUnit);
  const profitAtUnits = revenueAtUnits - totalCostAtUnits;

  return {
    pricePerUnit,
    variableCostPerUnit,
    fixedCostMonthly,
    contributionPerUnit: Math.round(contributionPerUnit * 100) / 100,
    breakEvenUnits: breakEvenUnits === Infinity ? 0 : breakEvenUnits,
    breakEvenRevenue: Math.round(breakEvenRevenue),
    revenueAtUnits: Math.round(revenueAtUnits),
    totalCostAtUnits: Math.round(totalCostAtUnits),
    profitAtUnits: Math.round(profitAtUnits),
  };
}
