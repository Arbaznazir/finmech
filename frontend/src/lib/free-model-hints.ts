import type { HintDef } from "@/lib/field-hints";
import {
  BREAK_EVEN_FREE_EXACT,
  COSTING_EXACT,
  REVENUE_EXACT,
} from "@/lib/free-excel-content";
import { QUESTIONS } from "@/lib/checklist-model";

/** Excel-exact tooltips — `what` from workbook copy, `why` from formula column where present. */
function excelTip(what: string, why?: string): HintDef {
  return { what, why: why ?? what };
}

const questionHints = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, excelTip(q.text)])
);

export const FREE_MODEL_HINTS: Record<string, HintDef> = {
  // ── Revenue Model (inputs — Excel column C) ──
  pricePerUnit: excelTip(REVENUE_EXACT.inputs.pricePerUnit),
  customersPerMonth: excelTip(REVENUE_EXACT.inputs.customersPerMonth),
  unitsPerCustomer: excelTip(REVENUE_EXACT.inputs.unitsPerCustomer),
  purchaseFrequencyPerYear: excelTip(REVENUE_EXACT.inputs.purchaseFrequencyPerYear),
  customerLifetimeMonths: excelTip(REVENUE_EXACT.inputs.customerLifetimeMonths),

  // ── Revenue Model (results — Excel column D meanings) ──
  monthlyPurchaseRate: excelTip(
    REVENUE_EXACT.metrics.monthlyPurchaseRate.meaning,
    REVENUE_EXACT.metrics.monthlyPurchaseRate.formula
  ),
  monthlyUnitsSold: excelTip(
    REVENUE_EXACT.metrics.monthlyUnitsSold.meaning,
    REVENUE_EXACT.metrics.monthlyUnitsSold.formula
  ),
  monthlyRevenue: excelTip(
    REVENUE_EXACT.metrics.monthlyRevenue.meaning,
    REVENUE_EXACT.metrics.monthlyRevenue.formula
  ),
  annualRevenue: excelTip(
    REVENUE_EXACT.metrics.annualRevenue.meaning,
    REVENUE_EXACT.metrics.annualRevenue.formula
  ),

  // ── Costing Model (inputs — Excel column C) ──
  salaries: excelTip(COSTING_EXACT.fixedItems.salaries),
  officeRent: excelTip(COSTING_EXACT.fixedItems.officeRent),
  utilities: excelTip(COSTING_EXACT.fixedItems.utilities),
  softwareSubscriptions: excelTip(COSTING_EXACT.fixedItems.softwareSubscriptions),
  administrativeCosts: excelTip(COSTING_EXACT.fixedItems.administrativeCosts),
  otherFixedCosts: excelTip(COSTING_EXACT.fixedItems.otherFixedCosts),
  rawMaterial: excelTip(COSTING_EXACT.variableItems.rawMaterial),
  packaging: excelTip(COSTING_EXACT.variableItems.packaging),
  shippingLogistics: excelTip(COSTING_EXACT.variableItems.shippingLogistics),
  salesCommission: excelTip(COSTING_EXACT.variableItems.salesCommission),
  paymentGatewayFees: excelTip(COSTING_EXACT.variableItems.paymentGatewayFees),
  otherVariableCosts: excelTip(COSTING_EXACT.variableItems.otherVariableCosts),
  unitsSold: excelTip(
    "Units Sold",
    COSTING_EXACT.simulation.unitsSold.formula
  ),

  // ── Costing Model (results — Excel formulas) ──
  totalFixedCosts: excelTip("Total Fixed Costs", "SUM of all fixed cost items"),
  totalVariableCostPerUnit: excelTip("Total Variable Cost per Unit", "SUM of all variable cost per unit items"),
  totalVariableCost: excelTip(
    "Total Variable Cost",
    COSTING_EXACT.simulation.totalVariableCost.formula
  ),
  totalMonthlyCost: excelTip(
    "Total Monthly Cost",
    COSTING_EXACT.simulation.totalMonthlyCost.formula
  ),

  // ── Break-even Model (inputs — Excel column D) ──
  variableCostPerUnit: excelTip(
    BREAK_EVEN_FREE_EXACT.variableCostPerUnit.meaning,
    BREAK_EVEN_FREE_EXACT.variableCostPerUnit.question
  ),
  fixedCostMonthly: excelTip(
    BREAK_EVEN_FREE_EXACT.fixedCostMonthly.meaning,
    BREAK_EVEN_FREE_EXACT.fixedCostMonthly.question
  ),
  unitsSoldForProjection: excelTip(
    "Units sold for projection — highlights profit/loss at your expected volume."
  ),

  // ── Break-even Model (results — Excel column D) ──
  contributionPerUnit: excelTip(
    BREAK_EVEN_FREE_EXACT.contributionPerUnit.meaning,
    BREAK_EVEN_FREE_EXACT.contributionPerUnit.formula
  ),
  breakEvenUnits: excelTip(
    BREAK_EVEN_FREE_EXACT.breakEvenUnits.meaning,
    BREAK_EVEN_FREE_EXACT.breakEvenUnits.formula
  ),
  breakEvenRevenue: excelTip(
    BREAK_EVEN_FREE_EXACT.breakEvenRevenue.meaning,
    BREAK_EVEN_FREE_EXACT.breakEvenRevenue.formula
  ),
  profitAtUnits: excelTip(
    "Profit or loss at projected units = Revenue − Total Cost."
  ),

  // ── Know Your Numbers (results) ──
  readinessPercentage: excelTip(
    "Readiness % = Total Score ÷ Maximum Possible Score",
    "Weighted percentage from all checklist answers."
  ),
  readinessStatus: excelTip(
    "FINANCE-READY (≥80%), GROWTH RISK (≥50%), or SURVIVAL RISK (<50%)",
    "Excel readiness band from your score."
  ),
  totalScore: excelTip(
    "Sum of weighted scores (Yes=2, Partial=1, No=0 × question weight)",
  ),
  maxPossible: excelTip(
    "Maximum Possible Score = sum of all weights × 2",
  ),

  ...questionHints,
};

export function freeHint(key: string | number): HintDef | undefined {
  return FREE_MODEL_HINTS[String(key)];
}
