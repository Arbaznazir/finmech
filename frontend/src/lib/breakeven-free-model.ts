// ========================================================
// BREAK-EVEN MODEL (FREE) – FULL EXCEL MATCH
// Source: FINMECH-UPGRADED/1.Free Models/Break-even Model- Only calculator.xlsx
// ========================================================

/** Units column (F) from Excel projection table — exact order. */
export const EXCEL_PROJECTION_UNITS = [
  10, 20, 50, 100, 125, 175, 700, 800, 400, 450, 500, 550, 600, 650, 700, 750,
  800, 850, 900, 950, 1000, 1050, 1100, 700, 800, 900, 1000, 1100, 1200, 1300, 1400,
] as const;

export interface BreakEvenFreeInputs {
  pricePerUnit: number;
  variableCostPerUnit: number;
  fixedCostMonthly: number;
  unitsSoldForProjection: number;
}

export interface ProjectionRow {
  units: number;
  revenue: number;
  totalCost: number;
  profit: number;
}

export interface BreakEvenFreeResults extends BreakEvenFreeInputs {
  contributionPerUnit: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  revenueAtUnits: number;
  totalCostAtUnits: number;
  profitAtUnits: number;
  isProfitable: boolean;
  status: "GREEN" | "RED";
  projection: ProjectionRow[];
}

export const BREAKEVEN_FREE_FIELDS: { key: keyof BreakEvenFreeInputs; label: string; prefix: string }[] = [
  { key: "pricePerUnit", label: "Price per Unit", prefix: "₹" },
  { key: "variableCostPerUnit", label: "Variable Cost per Unit", prefix: "₹" },
  { key: "fixedCostMonthly", label: "Fixed Cost (Monthly)", prefix: "₹" },
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

function buildProjection(
  pricePerUnit: number,
  variableCostPerUnit: number,
  fixedCostMonthly: number,
  extraUnits: number,
): ProjectionRow[] {
  const unitSet = new Set<number>(EXCEL_PROJECTION_UNITS);
  if (extraUnits > 0) unitSet.add(extraUnits);

  return [...unitSet]
    .sort((a, b) => a - b)
    .map((units) => {
      const revenue = units * pricePerUnit;
      const totalCost = fixedCostMonthly + units * variableCostPerUnit;
      return {
        units,
        revenue,
        totalCost,
        profit: revenue - totalCost,
      };
    });
}

export function calculateBreakEvenFree(inputs: BreakEvenFreeInputs): BreakEvenFreeResults {
  const { pricePerUnit, variableCostPerUnit, fixedCostMonthly, unitsSoldForProjection } = inputs;

  const contributionPerUnit = pricePerUnit - variableCostPerUnit;

  const breakEvenUnits =
    contributionPerUnit > 0 ? fixedCostMonthly / contributionPerUnit : Infinity;

  const breakEvenRevenue =
    breakEvenUnits === Infinity ? Infinity : breakEvenUnits * pricePerUnit;

  const units = unitsSoldForProjection || 0;
  const revenueAtUnits = units * pricePerUnit;
  const totalCostAtUnits = fixedCostMonthly + units * variableCostPerUnit;
  const profitAtUnits = revenueAtUnits - totalCostAtUnits;

  const projection = buildProjection(
    pricePerUnit,
    variableCostPerUnit,
    fixedCostMonthly,
    units,
  );

  return {
    ...inputs,
    contributionPerUnit,
    breakEvenUnits: breakEvenUnits === Infinity ? 0 : breakEvenUnits,
    breakEvenRevenue: breakEvenRevenue === Infinity ? 0 : breakEvenRevenue,
    revenueAtUnits,
    totalCostAtUnits,
    profitAtUnits,
    isProfitable: profitAtUnits > 0,
    status: profitAtUnits >= 0 ? "GREEN" : "RED",
    projection,
  };
}
