/**
 * Compare free-model calculations against FINMECH-UPGRADED Excel sample data.
 * Run: npx tsx scripts/verify-free-models.ts
 */
import { calculateRevenue } from "../frontend/src/lib/revenue-free-model";
import { calculateCosting } from "../frontend/src/lib/costing-free-model";
import {
  calculateBreakEvenFree,
  EXCEL_PROJECTION_UNITS,
} from "../frontend/src/lib/breakeven-free-model";
import {
  calculateChecklist,
  QUESTIONS,
  type ChecklistResponse,
} from "../frontend/src/lib/checklist-model";
import { checklistAdvisoryComment } from "../frontend/src/lib/free-excel-content";

const TOL = 0.01;

function close(a: number, b: number, label: string) {
  if (!Number.isFinite(a) && !Number.isFinite(b)) return null;
  if (Math.abs(a - b) <= TOL) return null;
  return { label, expected: b, actual: a };
}

function section(title: string) {
  console.log(`\n${"=".repeat(60)}\n${title}\n${"=".repeat(60)}`);
}

// ── Revenue Model (Revenue Model.xlsx B4:B8) ──
section("Revenue Model");
{
  const inputs = {
    pricePerUnit: 3000,
    customersPerMonth: 10,
    unitsPerCustomer: 2,
    purchaseFrequencyPerYear: 4,
    customerLifetimeMonths: 12,
  };
  const r = calculateRevenue(inputs);
  const expected = {
    monthlyPurchaseRate: 4 / 12,
    monthlyUnitsSold: 20,
    monthlyRevenue: 60000,
    annualRevenue: 720000,
  };
  const mismatches = [
    close(r.monthlyPurchaseRate, expected.monthlyPurchaseRate, "monthlyPurchaseRate"),
    close(r.monthlyUnitsSold, expected.monthlyUnitsSold, "monthlyUnitsSold"),
    close(r.monthlyRevenue, expected.monthlyRevenue, "monthlyRevenue"),
    close(r.annualRevenue, expected.annualRevenue, "annualRevenue"),
  ].filter(Boolean);
  console.log("Inputs:", inputs);
  console.log("Results:", r);
  if (mismatches.length) {
    console.log("MISMATCHES:", mismatches);
  } else {
    console.log("✓ All metrics match Excel");
  }
}

// ── Costing Model (Costing Model.xlsx) ──
section("Costing Model");
{
  const inputs = {
    salaries: 45000,
    officeRent: 25000,
    utilities: 10000,
    softwareSubscriptions: 5000,
    administrativeCosts: 1000,
    otherFixedCosts: 1500,
    rawMaterial: 2000,
    packaging: 20,
    shippingLogistics: 50,
    salesCommission: 100,
    paymentGatewayFees: 25,
    otherVariableCosts: 100,
    unitsSold: 20,
  };
  const r = calculateCosting(inputs);
  const expected = {
    totalFixedCosts: 87500,
    totalVariableCostPerUnit: 2295,
    totalVariableCost: 45900,
    totalMonthlyCost: 133400,
  };
  const mismatches = [
    close(r.totalFixedCosts, expected.totalFixedCosts, "totalFixedCosts"),
    close(r.totalVariableCostPerUnit, expected.totalVariableCostPerUnit, "totalVariableCostPerUnit"),
    close(r.totalVariableCost, expected.totalVariableCost, "totalVariableCost"),
    close(r.totalMonthlyCost, expected.totalMonthlyCost, "totalMonthlyCost"),
  ].filter(Boolean);
  console.log("Results:", r);
  if (mismatches.length) console.log("MISMATCHES:", mismatches);
  else console.log("✓ All metrics match Excel");
}

// ── Break-even (Break-even Model- Only calculator.xlsx B3:B9, projection F/G/H) ──
section("Break-Even Model (Free)");
{
  const inputs = {
    pricePerUnit: 3000,
    variableCostPerUnit: 2295,
    fixedCostMonthly: 87500,
    unitsSoldForProjection: 0,
  };
  const r = calculateBreakEvenFree(inputs);
  const expected = {
    contributionPerUnit: 705,
    breakEvenUnits: 87500 / 705,
    breakEvenRevenue: (87500 / 705) * 3000,
  };
  const mismatches = [
    close(r.contributionPerUnit, expected.contributionPerUnit, "contributionPerUnit"),
    close(r.breakEvenUnits, expected.breakEvenUnits, "breakEvenUnits"),
    close(r.breakEvenRevenue, expected.breakEvenRevenue, "breakEvenRevenue"),
  ].filter(Boolean);

  // Spot-check projection rows 1–3 (Excel F3:F5)
  const rowChecks = [
    { units: 10, revenue: 30000, totalCost: 110450 },
    { units: 20, revenue: 60000, totalCost: 133400 },
    { units: 50, revenue: 150000, totalCost: 202250 },
  ];
  for (const check of rowChecks) {
    const row = r.projection.find((p) => p.units === check.units);
    if (!row) {
      mismatches.push({ label: `projection units=${check.units}`, expected: "row exists", actual: "missing" } as never);
      continue;
    }
    const m1 = close(row.revenue, check.revenue, `proj ${check.units} revenue`);
    const m2 = close(row.totalCost, check.totalCost, `proj ${check.units} totalCost`);
    if (m1) mismatches.push(m1);
    if (m2) mismatches.push(m2);
  }

  console.log("Derived:", {
    contributionPerUnit: r.contributionPerUnit,
    breakEvenUnits: r.breakEvenUnits,
    breakEvenRevenue: r.breakEvenRevenue,
  });
  console.log("Excel expected BE units:", expected.breakEvenUnits);
  console.log("Projection rows:", r.projection.length, "(Excel:", EXCEL_PROJECTION_UNITS.length, ")");
  if (mismatches.length) console.log("MISMATCHES:", mismatches);
  else console.log("✓ All metrics match Excel");
}

// ── Know Your Numbers (sample responses from Excel column C, rows 3–27) ──
section("Know Your Business Numbers");
{
  const excelResponses: ChecklistResponse[] = [
    "Partial", "Yes", "Yes", "Yes",
    "No", "No", "Partial",
    "Partial", "Yes", "No",
    "No", "Yes", "No",
    "Partial", "No", "Yes",
    "No", "No", "Yes",
    "No", "Yes", "Yes",
    "Partial", "No", "No",
  ];
  const answers: Record<string, ChecklistResponse> = {};
  QUESTIONS.forEach((q, i) => {
    answers[q.id] = excelResponses[i];
  });

  const r = calculateChecklist(answers);
  const expected = {
    totalScore: 55, // formula-correct (Excel I2=52 has stale D4=1 while C4=Yes)
    maxPossible: 114,
    readinessPercentage: (55 / 114) * 100,
    readinessStatus: "SURVIVAL RISK",
  };

  const mismatches = [
    close(r.totalScore, expected.totalScore, "totalScore"),
    close(r.maxPossible, expected.maxPossible, "maxPossible"),
    close(r.readinessPercentage, expected.readinessPercentage, "readinessPercentage"),
  ].filter(Boolean);

  if (r.readinessStatus !== expected.readinessStatus) {
    mismatches.push({
      label: "readinessStatus",
      expected: expected.readinessStatus,
      actual: r.readinessStatus,
    } as never);
  }

  // Advisory comment formula check
  const advisoryChecks = [
    { score: 2, expected: "Strong control in place" },
    { score: 1, expected: "Needs improvement ; partially addressed" },
    { score: 0, expected: "High risk - immediate action required" },
  ];
  for (const { score, expected: exp } of advisoryChecks) {
    const got = checklistAdvisoryComment(score);
    if (got !== exp) {
      mismatches.push({ label: `advisory score=${score}`, expected: exp, actual: got } as never);
    }
  }

  console.log("Results:", {
    totalScore: r.totalScore,
    maxPossible: r.maxPossible,
    readinessPercentage: r.readinessPercentage,
    readinessStatus: r.readinessStatus,
    advisorySummary: r.advisorySummary,
  });
  console.log("Note: Excel file I2=52 due to stale D4 cell; formulas give totalScore=55");
  if (mismatches.length) console.log("MISMATCHES:", mismatches);
  else console.log("✓ All metrics match Excel formulas");
}
