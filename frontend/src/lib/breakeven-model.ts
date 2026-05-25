// ========================================================
// BREAK-EVEN MODEL – MONTHLY VERSION (Apr-Mar)
// Month-by-month → Price, Variable Cost, Fixed Cost, Units
// + break-even calculation per month
// ========================================================

export const MONTHS_ORDER = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export type MonthName = (typeof MONTHS_ORDER)[number];

export interface BreakEvenMonthInputs {
  pricePerUnit: number;
  variableCostPerUnit: number;
  fixedCostMonthly: number;
  unitsSoldForProjection: number;
}

export type BreakEvenInputs = Record<string, BreakEvenMonthInputs>;

export interface ProjectionRow {
  units: number;
  revenue: number;
  totalCost: number;
  profit: number;
}

export interface BreakEvenMonthResults extends BreakEvenMonthInputs {
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

export interface BreakEvenResults {
  monthlyData: Record<string, BreakEvenMonthResults>;
  monthsAdded: string[];
  annual: {
    totalRevenue: number;
    totalVariableCosts: number;
    totalFixedCosts: number;
    totalProfit: number;
  };
}

export function createEmptyMonthInputs(): BreakEvenMonthInputs {
  return {
    pricePerUnit: 0,
    variableCostPerUnit: 0,
    fixedCostMonthly: 0,
    unitsSoldForProjection: 0,
  };
}

function calculateMonth(inputs: BreakEvenMonthInputs): BreakEvenMonthResults {
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
    ...inputs,
    contributionPerUnit,
    breakEvenUnits,
    breakEvenRevenue,
    revenueAtUnits,
    totalCostAtUnits,
    profitAtUnits,
    isProfitable: profitAtUnits > 0,
    status: profitAtUnits >= 0 ? "GREEN" : "RED",
    projection,
  };
}

export function calculateBreakEven(monthData: Record<string, BreakEvenMonthInputs>): BreakEvenResults {
  const monthlyData: Record<string, BreakEvenMonthResults> = {};
  const monthsAdded: string[] = [];
  let totalRevenue = 0;
  let totalVariableCosts = 0;
  let totalFixedCosts = 0;
  let totalProfit = 0;

  MONTHS_ORDER.forEach((month) => {
    const inputs = monthData[month];
    if (!inputs) return;
    
    monthsAdded.push(month);
    const result = calculateMonth(inputs);
    monthlyData[month] = result;
    
    totalRevenue += result.revenueAtUnits;
    totalVariableCosts += inputs.variableCostPerUnit * inputs.unitsSoldForProjection;
    totalFixedCosts += inputs.fixedCostMonthly;
    totalProfit += result.profitAtUnits;
  });

  return {
    monthlyData,
    monthsAdded,
    annual: {
      totalRevenue,
      totalVariableCosts,
      totalFixedCosts,
      totalProfit,
    },
  };
}
