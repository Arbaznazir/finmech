// ========================================================
// BREAK-EVEN MODEL (STANDALONE) – FULL EXCEL MATCH
// Calculates contribution margin, break-even units & revenue
// With simulation table for scenario analysis
// ========================================================

export interface BreakEvenInputs {
  pricePerUnit: number;
  variableCostPerUnit: number;
  fixedCostMonthly: number;
}

export interface SimulationRow {
  units: number;
  revenue: number;
  totalVariableCost: number;
  totalCost: number;
  profitLoss: number;
  aboveBreakEven: boolean;
}

export interface BreakEvenResults {
  contributionPerUnit: number;
  contributionMargin: number; // as decimal (e.g., 0.4 = 40%)
  breakEvenUnits: number;
  breakEvenRevenue: number;
  simulation: SimulationRow[];
}

export interface BreakEvenInsights {
  overall: string;
  overallColor: string;
  guidance: string[];
  healthScore: number; // 0-100
  difficulty: "easy" | "moderate" | "challenging" | "very-hard";
}

export interface BreakEvenCompleteResults extends BreakEvenResults {
  insights: BreakEvenInsights;
}

export const INPUT_FIELDS: { key: keyof BreakEvenInputs; label: string; category: string }[] = [
  { key: "pricePerUnit", label: "Price per Unit", category: "Pricing" },
  { key: "variableCostPerUnit", label: "Variable Cost per Unit", category: "Costs" },
  { key: "fixedCostMonthly", label: "Fixed Cost (Monthly)", category: "Costs" },
];

export function createEmptyInputs(): BreakEvenInputs {
  return {
    pricePerUnit: 0,
    variableCostPerUnit: 0,
    fixedCostMonthly: 0,
  };
}

// ================== CALCULATION ENGINE ==================

export function calculateBreakEven(
  inputs: BreakEvenInputs,
  simulationUnits: number[] = [100, 500, 1000, 2000, 5000, 10000]
): BreakEvenCompleteResults {
  const { pricePerUnit, variableCostPerUnit, fixedCostMonthly } = inputs;

  // Core calculations
  const contributionPerUnit = pricePerUnit - variableCostPerUnit;
  const contributionMargin = pricePerUnit > 0 ? contributionPerUnit / pricePerUnit : 0;
  
  const breakEvenUnits = contributionPerUnit > 0 
    ? fixedCostMonthly / contributionPerUnit 
    : 0;
  
  const breakEvenRevenue = breakEvenUnits * pricePerUnit;

  // Generate simulation table
  const simulation: SimulationRow[] = simulationUnits.map((units) => {
    const revenue = units * pricePerUnit;
    const totalVariableCost = units * variableCostPerUnit;
    const totalCost = totalVariableCost + fixedCostMonthly;
    const profitLoss = revenue - totalCost;
    return {
      units,
      revenue: Math.round(revenue),
      totalVariableCost: Math.round(totalVariableCost),
      totalCost: Math.round(totalCost),
      profitLoss: Math.round(profitLoss),
      aboveBreakEven: units >= breakEvenUnits,
    };
  });

  const results: BreakEvenResults = {
    contributionPerUnit: Number(contributionPerUnit.toFixed(2)),
    contributionMargin: Number(contributionMargin.toFixed(4)),
    breakEvenUnits: Number(breakEvenUnits.toFixed(2)),
    breakEvenRevenue: Number(breakEvenRevenue.toFixed(2)),
    simulation,
  };

  // Generate insights
  const insights = generateInsights(inputs, results);

  return { ...results, insights };
}

function generateInsights(
  inputs: BreakEvenInputs,
  results: BreakEvenResults
): BreakEvenInsights {
  const { pricePerUnit, fixedCostMonthly } = inputs;
  const { contributionPerUnit, contributionMargin, breakEvenUnits, breakEvenRevenue } = results;
  
  const guidance: string[] = [];
  let overall: string | undefined;
  let overallColor: string | undefined;
  let healthScore = 100;
  let difficulty: "easy" | "moderate" | "challenging" | "very-hard" = "easy";

  // Check for valid inputs
  if (pricePerUnit <= 0 || inputs.variableCostPerUnit < 0 || fixedCostMonthly < 0) {
    return {
      overall: "Enter valid inputs to see break-even analysis.",
      overallColor: "text-muted-foreground",
      guidance: ["Price per unit must be greater than 0. Costs should be non-negative."],
      healthScore: 0,
      difficulty: "easy",
    };
  }

  // Contribution margin analysis
  if (contributionMargin < 0) {
    healthScore = 0;
    difficulty = "very-hard";
    overall = "Critical: Variable costs exceed price. Every sale loses money!";
    overallColor = "text-danger";
    guidance.push("🚨 Negative Contribution — Variable cost exceeds price. You lose money on every unit sold.");
    guidance.push("💡 Immediate action needed: Either increase price or reduce variable costs.");
  } else if (contributionMargin < 0.2) {
    healthScore -= 30;
    difficulty = "challenging";
    guidance.push("⚠️ Low Contribution Margin (< 20%) — You need high volume to cover fixed costs.");
  } else if (contributionMargin < 0.4) {
    healthScore -= 10;
    difficulty = "moderate";
    guidance.push("📊 Moderate Contribution Margin (20-40%) — Reasonable, but room for improvement.");
  } else {
    guidance.push("✓ Strong Contribution Margin (> 40%) — Healthy unit economics. Each sale contributes significantly.");
  }

  // Break-even units analysis
  if (breakEvenUnits <= 0 && contributionMargin > 0) {
    healthScore = 100;
    overall = "Perfect! No fixed costs or infinite contribution — you're profitable immediately.";
    overallColor = "text-success";
    guidance.push("✓ Instant Profitability — With no fixed costs or positive contribution, every sale is profitable.");
  } else if (breakEvenUnits <= 100) {
    healthScore = Math.min(100, healthScore + 10);
    difficulty = "easy";
    guidance.push("✓ Easy Break-even (< 100 units) — Very achievable sales target.");
  } else if (breakEvenUnits <= 500) {
    difficulty = "moderate";
    guidance.push("📊 Moderate Break-even (100-500 units) — Achievable with good marketing and sales effort.");
  } else if (breakEvenUnits <= 2000) {
    healthScore -= 15;
    difficulty = "challenging";
    guidance.push("⚠️ Challenging Break-even (500-2000 units) — Requires significant sales volume and marketing.");
  } else {
    healthScore -= 30;
    difficulty = "very-hard";
    guidance.push("🚨 Hard Break-even (> 2000 units) — Very difficult to achieve. Consider price increase or cost reduction.");
  }

  // Fixed cost burden analysis
  if (fixedCostMonthly > 0 && contributionPerUnit > 0) {
    const monthsToRecover1k = 1000 / (breakEvenUnits * contributionPerUnit);
    if (fixedCostMonthly > breakEvenRevenue * 0.5) {
      guidance.push("📊 High Fixed Cost Burden — Fixed costs are a significant portion of break-even revenue.");
    }
  }

  // Profitability at various levels
  const profitAt2x = results.simulation.find((s: SimulationRow) => s.units >= breakEvenUnits * 2);
  if (profitAt2x && profitAt2x.profitLoss > 0) {
    guidance.push(`💰 At 2× break-even volume (${Math.round(breakEvenUnits * 2)} units), you'd make ${formatCurrency(profitAt2x.profitLoss)} profit.`);
  }

  // Determine overall status
  let finalOverall: string;
  let finalOverallColor: string;
  
  if (overall !== undefined && overallColor !== undefined) {
    finalOverall = overall;
    finalOverallColor = overallColor;
  } else if (healthScore >= 80) {
    finalOverall = "Excellent unit economics! Low break-even with healthy margins.";
    finalOverallColor = "text-success";
  } else if (healthScore >= 60) {
    finalOverall = "Moderate unit economics. Break-even is achievable with effort.";
    finalOverallColor = "text-amber-400";
  } else if (healthScore >= 40) {
    finalOverall = "Challenging unit economics. High volume needed to break even.";
    finalOverallColor = "text-orange-400";
  } else {
    finalOverall = "Poor unit economics. Immediate price or cost review required.";
    finalOverallColor = "text-danger";
  }

  // Add health score
  guidance.unshift(`📊 Break-even Health Score: ${Math.max(0, healthScore)}/100`);

  return {
    overall: finalOverall,
    overallColor: finalOverallColor,
    guidance,
    healthScore: Math.max(0, healthScore),
    difficulty,
  };
}

// Helper function for formatting
function formatCurrency(value: number): string {
  return "₹" + value.toLocaleString("en-IN");
}

// Tooltips for fields
export const BREAK_EVEN_TOOLTIPS = {
  pricePerUnit: {
    what: "The selling price charged to the customer for one unit of the product or service.",
    why: "Higher prices reduce break-even volume but may impact demand.",
  },
  variableCostPerUnit: {
    what: "The cost that increases directly with each unit sold — raw materials, delivery, commissions, etc.",
    why: "Lower variable costs improve contribution margin and reduce break-even point.",
  },
  fixedCostMonthly: {
    what: "Costs that do not change with the number of units sold — salaries, rent, software subscriptions, insurance, etc.",
    why: "These must be covered regardless of sales volume, setting the minimum viable revenue.",
  },
  contributionPerUnit: {
    what: "Amount each unit contributes toward covering fixed costs and generating profit.",
    why: "Formula: Price - Variable Cost. Higher is better for profitability.",
  },
  contributionMargin: {
    what: "Percentage of each sale that contributes to fixed costs and profit.",
    why: "Formula: (Price - Variable Cost) / Price. >40% is healthy, <20% requires high volume.",
  },
  breakEvenUnits: {
    what: "Minimum number of units you must sell every month to cover all costs.",
    why: "Below this, you lose money. Above this, every additional sale generates profit.",
  },
  breakEvenRevenue: {
    what: "Minimum revenue required to cover all costs.",
    why: "Formula: Break-even Units × Price per Unit. Your monthly sales target.",
  },
};
