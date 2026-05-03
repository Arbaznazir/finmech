// ========================================================
// BREAK-EVEN MODEL – FULL EXCEL MATCH
// Parameters → Contribution, Break-even Units & Revenue
// + full projection table
// ========================================================

export interface BreakEvenInputs {
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

export interface BreakEvenResults {
  pricePerUnit: number;
  variableCostPerUnit: number;
  fixedCostMonthly: number;
  contributionPerUnit: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
  unitsSoldForProjection: number;
  revenueAtUnits: number;
  totalCostAtUnits: number;
  profitAtUnits: number;
  isProfitable: boolean;
  status: "GREEN" | "RED";
  projection: ProjectionRow[];
}

export function calculateBreakEven(inputs: BreakEvenInputs): BreakEvenResults {
  const { pricePerUnit, variableCostPerUnit, fixedCostMonthly, unitsSoldForProjection } = inputs;

  const contributionPerUnit = pricePerUnit - variableCostPerUnit;

  let breakEvenUnits = 0;
  let breakEvenRevenue = 0;

  if (contributionPerUnit > 0) {
    breakEvenUnits = Math.ceil(fixedCostMonthly / contributionPerUnit);
    breakEvenRevenue = breakEvenUnits * pricePerUnit;
  } else {
    breakEvenUnits = Infinity;
    breakEvenRevenue = Infinity;
  }

  const units = unitsSoldForProjection || 0;
  const revenueAtUnits = units * pricePerUnit;
  const totalCostAtUnits = fixedCostMonthly + units * variableCostPerUnit;
  const profitAtUnits = revenueAtUnits - totalCostAtUnits;

  // Projection table
  const projectionUnits = [10, 20, 50, 100, 125, 150, 200, 300, 500, 700, 1000];
  // Also add breakEvenUnits and unitsSoldForProjection if not already present
  if (breakEvenUnits !== Infinity && !projectionUnits.includes(breakEvenUnits)) {
    projectionUnits.push(breakEvenUnits);
  }
  if (units > 0 && !projectionUnits.includes(units)) {
    projectionUnits.push(units);
  }
  projectionUnits.sort((a, b) => a - b);

  const projection: ProjectionRow[] = projectionUnits.map((u) => ({
    units: u,
    revenue: u * pricePerUnit,
    totalCost: fixedCostMonthly + u * variableCostPerUnit,
    profit: u * pricePerUnit - (fixedCostMonthly + u * variableCostPerUnit),
  }));

  return {
    pricePerUnit,
    variableCostPerUnit,
    fixedCostMonthly,
    contributionPerUnit,
    breakEvenUnits,
    breakEvenRevenue,
    unitsSoldForProjection: units,
    revenueAtUnits,
    totalCostAtUnits,
    profitAtUnits,
    isProfitable: profitAtUnits > 0,
    status: profitAtUnits >= 0 ? "GREEN" : "RED",
    projection,
  };
}
