import type { CalculationExport } from "@/lib/calculation-pdf";
import {
  BREAK_EVEN_FREE_EXACT,
  COSTING_EXACT,
  REVENUE_EXACT,
  RAG_COLORS,
  checklistAdvisoryComment,
  checklistStatusAdvisory,
} from "@/lib/free-excel-content";
import {
  fmt,
  resultsTableHTML,
} from "@/lib/pdf-analysis-shared";
import { QUESTIONS, type ChecklistResponse } from "@/lib/checklist-model";

export const FREE_MODEL_SLUGS = new Set([
  "revenue-model",
  "costing-model",
  "break-even-pro",
  "break-even-basic",
  "know-your-numbers",
]);

type Row = { label: string; value: string };

const FREE_ACCENT = "#16a34a";

function excelNoteTable(
  rows: { label: string; value: string; note: string }[],
  noteColor?: string
) {
  return `<table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0">
    ${rows
      .map(
        (r, i) => `<tr style="background:${i % 2 === 0 ? "#fafafa" : "#fff"}">
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;width:34%">${r.label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:${FREE_ACCENT};width:22%">${r.value}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:${noteColor ?? "#666"};font-size:11px">${r.note}</td>
    </tr>`
      )
      .join("")}
  </table>`;
}

export function generateFreeModelAnalysis(_calc: CalculationExport): string {
  // Excel-exact copy lives in formatFreeModelOutputsHTML; charts stay in calculation-pdf.
  // No separate narrative / Smart Results block for free models.
  return "";
}

export function getFreeModelHeroCards(calc: CalculationExport): Row[] {
  const out = calc.outputs as Record<string, unknown>;
  const slug = calc.modelSlug;

  if (slug === "revenue-model") {
    return [
      { label: "Monthly Revenue", value: fmt(out.monthlyRevenue) },
      { label: "Annual Revenue", value: fmt(out.annualRevenue) },
      { label: "Monthly Units Sold", value: fmt(out.monthlyUnitsSold) },
      { label: "Price Per Unit", value: fmt(out.pricePerUnit) },
    ];
  }
  if (slug === "costing-model") {
    return [
      { label: "Total Fixed Costs", value: fmt(out.totalFixedCosts) },
      { label: "Total Variable Cost", value: fmt(out.totalVariableCost) },
      { label: "Total Monthly Cost", value: fmt(out.totalMonthlyCost) },
      { label: "Units Sold", value: fmt(out.unitsSold) },
    ];
  }
  if (slug.includes("break-even")) {
    return [
      { label: "Break-even Units", value: fmt(out.breakEvenUnits) },
      { label: "Break-even Revenue", value: fmt(out.breakEvenRevenue) },
      { label: "Contribution per Unit", value: fmt(out.contributionPerUnit) },
      { label: "Profit at Units", value: fmt(out.profitAtUnits) },
    ];
  }
  if (slug === "know-your-numbers") {
    return [
      { label: "Readiness %", value: `${Number(out.readinessPercentage || 0).toFixed(0)}%` },
      { label: "Readiness Status", value: String(out.readinessStatus || "—") },
      { label: "Total Score", value: `${out.totalScore}/${out.maxPossible}` },
    ];
  }
  return [];
}

export function formatFreeModelOutputsHTML(calc: CalculationExport, tierColor: string): string | null {
  const slug = calc.modelSlug;
  const out = calc.outputs as Record<string, unknown>;
  const inp = calc.inputs as Record<string, unknown>;
  const ex = REVENUE_EXACT;

  if (slug === "know-your-numbers") {
    const sections = out.sectionScores as { section: string; score: number; maxPossible: number; percentage: number }[] | undefined;
    if (!Array.isArray(sections)) return null;
    const answers = inp as Record<string, ChecklistResponse>;
    const statusColor =
      out.statusColor === "green" ? RAG_COLORS.green : out.statusColor === "amber" ? RAG_COLORS.amber : RAG_COLORS.red;
    const statusBg =
      out.statusColor === "green" ? "#f0fdf4" : out.statusColor === "amber" ? "#fffbeb" : "#fef2f2";

    const questionRows = QUESTIONS.map((q, i) => {
      const ans = answers[q.id] || "—";
      const rawScore = ans === "Yes" ? 2 : ans === "Partial" ? 1 : ans === "No" ? 0 : -1;
      const ansColor = rawScore === 2 ? RAG_COLORS.green : rawScore === 1 ? RAG_COLORS.amber : rawScore === 0 ? RAG_COLORS.red : "#888";
      const comment = rawScore >= 0 ? checklistAdvisoryComment(rawScore) : "—";
      return `<tr style="background:${i % 2 === 0 ? "#fafafa" : "#fff"}">
        <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:11px;color:#888">${q.section}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:11px">${q.text}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;font-weight:700;color:${ansColor}">${ans}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;font-size:11px">${q.weight}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:11px;color:${ansColor}">${comment}</td>
      </tr>`;
    }).join("");

    return `
      <div style="margin-bottom:20px;padding:20px;background:${statusBg};border:1px solid ${statusColor}44;border-radius:12px;text-align:center">
        <div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px">Founder Finance Readiness Health Check</div>
        <div style="font-size:36px;font-weight:900;color:${statusColor}">${Number(out.readinessPercentage || 0).toFixed(0)}%</div>
        <div style="font-size:15px;font-weight:800;color:${statusColor}">${out.readinessStatus}</div>
        <div style="font-size:12px;color:#555;margin-top:10px;line-height:1.5">${checklistStatusAdvisory(String(out.readinessStatus || ""))}</div>
        <div style="font-size:11px;color:#888;margin-top:6px">Total Score: ${out.totalScore} / ${out.maxPossible}</div>
      </div>
      ${resultsTableHTML(
        sections.map((s) => ({
          label: s.section,
          value: `${s.score}/${s.maxPossible} (${s.percentage.toFixed(0)}%)`,
        })),
        tierColor,
        "Score by Section"
      )}
      <p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:8px">Questions, Responses &amp; Advisory Comments</p>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr style="background:${tierColor};color:#fff">
          <th style="padding:7px 10px;text-align:left">Section</th>
          <th style="padding:7px 10px;text-align:left">Question</th>
          <th style="padding:7px 10px;text-align:center">Response</th>
          <th style="padding:7px 10px;text-align:center">Weight</th>
          <th style="padding:7px 10px;text-align:left">Advisory Comment</th>
        </tr></thead>
        <tbody>${questionRows}</tbody>
      </table>`;
  }

  if (slug.includes("break-even")) {
    const be = BREAK_EVEN_FREE_EXACT;
    return excelNoteTable(
      [
        { label: "Price per Unit", value: fmt(out.pricePerUnit), note: `${be.pricePerUnit.question} — ${be.pricePerUnit.meaning}` },
        { label: "Variable Cost per Unit", value: fmt(out.variableCostPerUnit), note: `${be.variableCostPerUnit.question} — ${be.variableCostPerUnit.meaning}` },
        { label: "Fixed Cost (Periodic- monthly)", value: fmt(out.fixedCostMonthly), note: `${be.fixedCostMonthly.question} — ${be.fixedCostMonthly.meaning}` },
        { label: "Contribution per Unit", value: fmt(out.contributionPerUnit), note: `${be.contributionPerUnit.formula} — ${be.contributionPerUnit.meaning}` },
        { label: "Break-even Units", value: fmt(out.breakEvenUnits), note: `${be.breakEvenUnits.formula} — ${be.breakEvenUnits.meaning}` },
        { label: "Break-even Revenue", value: fmt(out.breakEvenRevenue), note: `${be.breakEvenRevenue.formula} — ${be.breakEvenRevenue.meaning}` },
      ],
      "#666"
    );
  }

  if (slug === "revenue-model") {
    const inputRows = [
      { label: "Price per Unit", key: "pricePerUnit" },
      { label: "Customers per Month", key: "customersPerMonth" },
      { label: "Units per Customer", key: "unitsPerCustomer" },
      { label: "Purchase Frequency (per year)", key: "purchaseFrequencyPerYear" },
      { label: "Customer Lifetime (months)", key: "customerLifetimeMonths" },
    ].map(({ label, key }) => ({
      label,
      value: fmt(inp[key] ?? out[key]),
      note: ex.inputs[key as keyof typeof ex.inputs],
    }));

    return (
      `<p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin:0 0 8px">Inputs</p>` +
      excelNoteTable(inputRows) +
      `<p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin:16px 0 8px">Derived Metrics</p>` +
      excelNoteTable(
        [
          {
            label: "Monthly Purchase Rate",
            value: fmt(out.monthlyPurchaseRate),
            note: `${ex.metrics.monthlyPurchaseRate.formula} — ${ex.metrics.monthlyPurchaseRate.meaning}`,
          },
          {
            label: "Monthly Units Sold",
            value: fmt(out.monthlyUnitsSold),
            note: `${ex.metrics.monthlyUnitsSold.formula} — ${ex.metrics.monthlyUnitsSold.meaning}`,
          },
          {
            label: "Monthly Revenue",
            value: fmt(out.monthlyRevenue),
            note: `${ex.metrics.monthlyRevenue.formula} — ${ex.metrics.monthlyRevenue.meaning}`,
          },
          {
            label: "Annual Revenue",
            value: fmt(out.annualRevenue),
            note: `${ex.metrics.annualRevenue.formula} — ${ex.metrics.annualRevenue.meaning}`,
          },
        ],
        "#666"
      )
    );
  }

  if (slug === "costing-model") {
    const ce = COSTING_EXACT;
    return (
      `<p style="font-size:12px;color:#555;margin-bottom:12px;line-height:1.6">${ce.fixedIntro}</p>` +
      resultsTableHTML(
        [
          { label: "Salaries", value: fmt(inp.salaries) },
          { label: "Office Rent", value: fmt(inp.officeRent) },
          { label: "Utilities", value: fmt(inp.utilities) },
          { label: "Software Subscriptions", value: fmt(inp.softwareSubscriptions) },
          { label: "Administrative Costs", value: fmt(inp.administrativeCosts) },
          { label: "Other Fixed Costs", value: fmt(inp.otherFixedCosts) },
          { label: "Total Fixed Costs", value: fmt(out.totalFixedCosts) },
        ],
        tierColor,
        "Fixed Costs (Monthly)"
      ) +
      `<p style="font-size:12px;color:#555;margin:16px 0 12px;line-height:1.6">${ce.variableIntro}</p>` +
      resultsTableHTML(
        [
          { label: "Raw Material", value: fmt(inp.rawMaterial) },
          { label: "Packaging", value: fmt(inp.packaging) },
          { label: "Shipping / Logistics", value: fmt(inp.shippingLogistics) },
          { label: "Sales Commission", value: fmt(inp.salesCommission) },
          { label: "Payment Gateway Fees", value: fmt(inp.paymentGatewayFees) },
          { label: "Other Variable Costs", value: fmt(inp.otherVariableCosts) },
          { label: "Total Variable Cost per Unit", value: fmt(out.totalVariableCostPerUnit) },
        ],
        tierColor,
        "Variable Costs (Per Unit)"
      ) +
      excelNoteTable(
        [
          { label: "Units Sold", value: fmt(out.unitsSold), note: ce.simulation.unitsSold.formula },
          { label: "Total Variable Cost", value: fmt(out.totalVariableCost), note: ce.simulation.totalVariableCost.formula },
          { label: "Total Monthly Cost", value: fmt(out.totalMonthlyCost), note: ce.simulation.totalMonthlyCost.formula },
        ],
        "#666"
      )
    );
  }

  return null;
}
