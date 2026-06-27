import type { CalculationExport } from "@/lib/calculation-pdf";
import {
  BURN_CLASSIFICATION_MESSAGES,
  BREAK_EVEN_EXACT,
  CFS_EXACT,
  PITCHDECK_EXACT,
  cfsEbitdaMeaning,
  cfsOverallInsight,
  cfsPatMeaning,
  exactCommentaryForModel,
} from "@/lib/excel-model-content";
import {
  buildExcelSmartReport,
  excelFieldExplanations,
  insightsGuidance,
  insightsOverall,
} from "@/lib/excel-smart-report";
import {
  fmt,
  num,
  pctVal,
  metricTable,
  getMonthlyData,
  getAnnual,
  monthKeys,
  lastMonthData,
  resultsTableHTML,
} from "@/lib/pdf-analysis-shared";

export const STANDALONE_MODEL_SLUGS = new Set([
  "income-statement",
  "balance-sheet",
  "burn-runway",
  "break-even",
  "cashflow-ops",
  "consolidated-cfo",
  "viability-dashboard",
  "unit-economics",
  "pitchdeck-kpis",
  "dcf-valuation",
  "funding-model",
  "cap-table",
]);

type Row = { label: string; value: string };

// ── INCOME STATEMENT ───────────────────────────────────────────────────────────

function analyzeIncomeStatement(out: Record<string, unknown>): string {
  const annual = getAnnual(out) ?? {};
  const last = getMonthlyData(out) ? lastMonthData(getMonthlyData(out)!) : null;
  const derived = (out.derived ?? {}) as Record<string, number>;

  return buildExcelSmartReport({
    status: insightsOverall(out),
    keyResults: metricTable([
      { label: "Gross Revenue", value: fmt(annual["Gross Revenue"] ?? last?.["Gross Revenue"]) },
      { label: "EBITDA", value: fmt(annual["EBITDA"] ?? last?.["EBITDA"]), note: `${num(derived.ebitdaMarginAnnual || annual["EBITDA Margin %"]).toFixed(1)}% margin` },
      { label: "Net Profit (PAT)", value: fmt(annual["Net Profit"] ?? last?.["Net Profit"]), note: `${num(derived.netMarginAnnual || annual["Net Margin %"]).toFixed(1)}% net margin` },
      { label: "Gross Margin", value: `${num(derived.grossMarginAnnual || annual["Gross Margin %"]).toFixed(1)}%` },
    ]),
    commentary: insightsGuidance(out),
  });
}

// ── BALANCE SHEET ──────────────────────────────────────────────────────────────

function analyzeBalanceSheet(out: Record<string, unknown>): string {
  const annual = getAnnual(out) ?? {};
  const last = getMonthlyData(out) ? lastMonthData(getMonthlyData(out)!) : null;

  return buildExcelSmartReport({
    status: insightsOverall(out),
    keyResults: metricTable([
      { label: "Total Assets", value: fmt(annual["TOTAL ASSETS"] ?? last?.["TOTAL ASSETS"]) },
      { label: "Working Capital", value: fmt(annual["Working Capital"] ?? last?.["Working Capital"]) },
      { label: "Current Ratio", value: `${num(annual["Current Ratio"] ?? last?.["Current Ratio"]).toFixed(2)}x` },
      { label: "Debt / Equity", value: `${num(annual["Debt/Equity Ratio"] ?? last?.["Debt/Equity Ratio"]).toFixed(2)}x` },
      { label: "Balance Check", value: num(annual["BALANCE CHECK"] ?? last?.["BALANCE CHECK"]) === 0 ? "Balanced" : fmt(annual["BALANCE CHECK"] ?? last?.["BALANCE CHECK"]) },
    ]),
    commentary: insightsGuidance(out),
  });
}

// ── BURN & RUNWAY ──────────────────────────────────────────────────────────────

function analyzeBurnRunway(out: Record<string, unknown>, inp: Record<string, unknown>): string {
  const md = getMonthlyData(out);
  const openingCash = num(out.openingCash) || num(inp.openingCash);
  const last = md ? lastMonthData(md) : null;
  const runwayRaw = last?.["Runway (months)"];
  const runwayInfinite = runwayRaw === null || runwayRaw === undefined || !Number.isFinite(Number(runwayRaw));
  const runwayLabel = runwayInfinite ? "∞" : Number(runwayRaw).toFixed(1);
  const classification = last ? String(last["CLASSIFICATION"]) : "";
  const excelMsgs = classification && classification in BURN_CLASSIFICATION_MESSAGES
    ? BURN_CLASSIFICATION_MESSAGES[classification as keyof typeof BURN_CLASSIFICATION_MESSAGES]
    : null;

  return buildExcelSmartReport({
    status: excelMsgs?.overall ?? insightsOverall(out),
    keyResults: metricTable([
      { label: "Opening Cash", value: fmt(openingCash) },
      { label: "Net Burn / Month", value: fmt(last?.["Net Burn"]) },
      { label: "Runway (Months)", value: runwayLabel },
      { label: "Cumulative Cash", value: fmt(last?.["Cumulative Cash"]) },
      { label: "Classification", value: classification || "—" },
    ]),
    commentary: excelMsgs ? excelMsgs.guidance : insightsGuidance(out),
    explanations: excelFieldExplanations([
      "Gross Burn",
      "Net Burn",
      "Runway (months)",
      "Recurring Revenue ratio",
      "Cumulative Cash",
    ]),
  });
}

// ── BREAK-EVEN ─────────────────────────────────────────────────────────────────

function analyzeBreakEvenStandalone(out: Record<string, unknown>): string {
  const be = BREAK_EVEN_EXACT;
  const simulation = out.simulation as { units: number; profitLoss: number; aboveBreakEven: boolean }[] | undefined;
  const commentary = [
    ...insightsGuidance(out),
    be.pricePerUnit.question,
    be.variableCostPerUnit.question,
    be.fixedCostMonthly.question,
  ].filter(Boolean);

  let extra = "";
  if (Array.isArray(simulation) && simulation.length) {
    extra = metricTable(
      simulation.map((r) => ({
        label: `${r.units.toLocaleString()} units`,
        value: fmt(r.profitLoss),
        note: r.aboveBreakEven ? "Above break-even" : "Below break-even",
      }))
    );
  }

  return buildExcelSmartReport({
    status: insightsOverall(out),
    keyResults: metricTable([
      { label: "Break-Even Units", value: fmt(out.breakEvenUnits) },
      { label: "Break-Even Revenue", value: fmt(out.breakEvenRevenue) },
      { label: "Contribution / Unit", value: fmt(out.contributionPerUnit) },
      { label: "Contribution Margin", value: pctVal(num(out.contributionMargin)) },
    ]),
    commentary,
    explanations: [
      { label: "Price per Unit", what: be.pricePerUnit.what },
      { label: "Variable Cost per Unit", what: be.variableCostPerUnit.what },
      { label: "Fixed Cost (Monthly)", what: be.fixedCostMonthly.what },
      { label: "Contribution per Unit", what: be.contributionPerUnit.what },
      { label: "Break-even Units", what: be.breakEvenUnits.what },
      { label: "Break-even Revenue", what: be.breakEvenRevenue.what },
    ],
    extra: extra ? `<div style="margin-top:16px"><h4 style="font-size:11px;font-weight:800;color:#0d9488;text-transform:uppercase">Volume Simulation</h4>${extra}</div>` : undefined,
  });
}

// ── CASHFLOW OPS ───────────────────────────────────────────────────────────────

function analyzeCashflowOps(out: Record<string, unknown>, inp: Record<string, unknown>): string {
  const md = getMonthlyData(out);
  const openingCash = num(out.openingCash) || num(inp.openingCash);
  const months = md ? monthKeys(md) : [];
  const last = md ? lastMonthData(md) : null;
  let totalCFO = 0;
  let totalNet = 0;
  months.forEach((m) => {
    if (!md) return;
    totalCFO += num(md[m]["Net Cash Flow from Operating Activities (CFO)"]);
    totalNet += num(md[m]["Net Cash Flow"]);
  });
  const closing = last ? num(last["Closing Balance"]) : openingCash + totalNet;

  return buildExcelSmartReport({
    keyResults: metricTable([
      { label: "Opening Cash", value: fmt(openingCash) },
      { label: "Total CFO", value: fmt(totalCFO) },
      { label: "Net Cash Flow", value: fmt(totalNet) },
      { label: "Closing Balance", value: fmt(closing) },
    ]),
    commentary: insightsGuidance(out),
  });
}

// ── CONSOLIDATED CFO ───────────────────────────────────────────────────────────

function analyzeConsolidatedCFO(out: Record<string, unknown>, inp: Record<string, unknown>): string {
  const summary = (out.summary ?? {}) as Record<string, unknown>;
  const openingCash = num(out.openingCash) || num(inp.openingCash);
  const avgCfoPat = num(summary.avgCfoPat);
  const avgCfoEbitda = num(summary.avgCfoEbitda);

  return buildExcelSmartReport({
    status: cfsOverallInsight(avgCfoPat),
    keyResults: metricTable([
      { label: "Opening Cash", value: fmt(openingCash) },
      { label: "Total Net Cash Flow", value: fmt(summary.totalNetCashFlow) },
      { label: "Final Ending Cash", value: fmt(summary.finalEndingCash) },
      { label: "Avg CFO / PAT", value: `${avgCfoPat.toFixed(2)}x` },
      { label: "Avg CFO / EBITDA", value: `${avgCfoEbitda.toFixed(2)}x` },
    ]),
    commentary: [
      `CFO / PAT: ${cfsPatMeaning(avgCfoPat)}`,
      `CFO / EBITDA: ${cfsEbitdaMeaning(avgCfoEbitda)}`,
      ...CFS_EXACT.cfoPatInterpretation.map((r) => `${r.range}: ${r.meaning}`),
      ...CFS_EXACT.cfoEbitdaInterpretation.map((r) => `${r.range}: ${r.meaning}`),
    ],
  });
}

// ── VIABILITY DASHBOARD ────────────────────────────────────────────────────────

function analyzeViability(out: Record<string, unknown>): string {
  return buildExcelSmartReport({
    status: insightsOverall(out),
    keyResults: metricTable([
      { label: "Contribution Margin", value: `${num(out.contributionMarginPct).toFixed(1)}%`, note: String(out.contributionStatus) },
      { label: "Net Profit / Loss", value: fmt(out.netProfitLoss), note: String(out.netProfitStatus) },
      { label: "Break-Even Utilisation", value: `${num(out.breakEvenUtilisationPct).toFixed(0)}%`, note: String(out.breakevenStatus) },
      { label: "Margin of Safety", value: `${num(out.marginOfSafetyPct).toFixed(1)}%`, note: String(out.marginSafetyStatus) },
    ]),
    commentary: insightsGuidance(out),
  });
}

// ── UNIT ECONOMICS ─────────────────────────────────────────────────────────────

function analyzeUnitEconomics(out: Record<string, unknown>): string {
  const last = getMonthlyData(out) ? lastMonthData(getMonthlyData(out)!) : null;
  const status = out.status as { insights?: { guidance?: string[] } }[] | undefined;
  const lastInsights = Array.isArray(status) && status.length ? status[status.length - 1]?.insights : undefined;

  return buildExcelSmartReport({
    status: insightsOverall(out),
    keyResults: metricTable([
      { label: "CAC", value: fmt(last?.["CAC"]) },
      { label: "LTV", value: fmt(last?.["LTV"]) },
      { label: "LTV / CAC", value: last && num(last["CAC"]) > 0 ? `${(num(last["LTV"]) / num(last["CAC"])).toFixed(1)}x` : "—" },
      { label: "Churn Rate %", value: `${num(last?.["Churn Rate %"]).toFixed(1)}%` },
      { label: "Growth Rate %", value: `${num(last?.["Growth Rate %"]).toFixed(1)}%` },
    ]),
    commentary: lastInsights?.guidance ?? insightsGuidance(out),
    explanations: excelFieldExplanations(["CAC", "LTV", "ARPU", "Churn Rate %", "Growth Rate %"]),
  });
}

// ── PITCH DECK KPIs ────────────────────────────────────────────────────────────

function analyzePitchdeck(out: Record<string, unknown>): string {
  return buildExcelSmartReport({
    status: insightsOverall(out),
    keyResults: metricTable([
      { label: "Gross Margin", value: pctVal(num(out.grossMargin)), note: String(out.grossMarginStatus) },
      { label: "LTV / CAC", value: `${num(out.ltvCacRatio).toFixed(1)}x`, note: String(out.ltvCacStatus) },
      { label: "Runway (Months)", value: num(out.runwayMonths).toFixed(1), note: String(out.runwayStatus) },
      { label: "Recurring Revenue Ratio", value: pctVal(num(out.recurringRevenueRatio)), note: String(out.recurringRatioStatus) },
      { label: "Net Burn", value: fmt(out.netBurn), note: String(out.burnStatus) },
    ]),
    commentary: PITCHDECK_EXACT.smartReportLines,
  });
}

// ── DCF VALUATION ──────────────────────────────────────────────────────────────

function analyzeDCF(out: Record<string, unknown>): string {
  const wacc = (out.wacc ?? {}) as Record<string, number>;

  return buildExcelSmartReport({
    keyResults: metricTable([
      { label: "WACC", value: pctVal(num(wacc.wacc)) },
      { label: "Enterprise Value", value: fmt(out.enterpriseValue) },
      { label: "Equity Value", value: fmt(out.equityValue) },
      { label: "Value Per Share", value: fmt(out.valuePerShare) },
      { label: "PV of FCFF (5yr)", value: fmt(out.totalPVofFCFF) },
      { label: "PV of Terminal Value", value: fmt(out.pvOfTerminalValue) },
    ]),
    commentary: exactCommentaryForModel("dcf-valuation"),
  });
}

// ── FUNDING MODEL ──────────────────────────────────────────────────────────────

function analyzeFunding(out: Record<string, unknown>): string {
  const summary = (out.summary ?? out) as Record<string, unknown>;

  return buildExcelSmartReport({
    keyResults: metricTable([
      { label: "Max Cash Deficit", value: fmt(summary.maxCashDeficit) },
      { label: "Funding Required", value: fmt(summary.fundingRequired) },
      { label: "Contingency", value: fmt(summary.contingency) },
      { label: "Total Funding Recommended", value: fmt(summary.totalFunding) },
      { label: "Final Cash (Projected)", value: fmt(summary.finalCash) },
      { label: "Avg Cash Conversion Cycle", value: `${num(summary.avgCashConversionCycle).toFixed(0)} days` },
    ]),
    commentary: insightsGuidance(out),
  });
}

// ── CAP TABLE ──────────────────────────────────────────────────────────────────

function analyzeCapTable(out: Record<string, unknown>, inp: Record<string, unknown>): string {
  const exitValue = num(out.exitValue) || num(inp.exitValue);
  const ownership = out.ownership as Record<string, number> | undefined;
  const waterfall = out.waterfall as Record<string, { payout?: number }> | undefined;

  const rows: { label: string; value: string }[] = [
    { label: "Exit Value", value: fmt(exitValue) },
    { label: "Total Shares", value: num(out.totalShares) > 0 ? num(out.totalShares).toLocaleString() : "—" },
  ];
  if (ownership) {
    Object.entries(ownership).forEach(([name, pctOwn]) => {
      rows.push({ label: `${name} ownership`, value: pctVal(num(pctOwn)) });
    });
  }
  if (waterfall) {
    Object.entries(waterfall).forEach(([name, w]) => {
      rows.push({ label: `${name} payout`, value: fmt(w.payout) });
    });
  }

  return buildExcelSmartReport({ keyResults: metricTable(rows) });
}


export function generateStandaloneModelAnalysis(calc: CalculationExport): string {
  const slug = calc.modelSlug;
  const out = calc.outputs as Record<string, unknown>;
  const inp = calc.inputs as Record<string, unknown>;

  if (slug === "income-statement") return analyzeIncomeStatement(out);
  if (slug === "balance-sheet") return analyzeBalanceSheet(out);
  if (slug === "burn-runway") return analyzeBurnRunway(out, inp);
  if (slug === "break-even") return analyzeBreakEvenStandalone(out);
  if (slug === "cashflow-ops") return analyzeCashflowOps(out, inp);
  if (slug === "consolidated-cfo") return analyzeConsolidatedCFO(out, inp);
  if (slug === "viability-dashboard") return analyzeViability(out);
  if (slug === "unit-economics") return analyzeUnitEconomics(out);
  if (slug === "pitchdeck-kpis") return analyzePitchdeck(out);
  if (slug === "dcf-valuation") return analyzeDCF(out);
  if (slug === "funding-model") return analyzeFunding(out);
  if (slug === "cap-table") return analyzeCapTable(out, inp);
  return "";
}

export function getStandaloneModelHeroCards(calc: CalculationExport): Row[] {
  const out = calc.outputs as Record<string, unknown>;
  const inp = calc.inputs as Record<string, unknown>;
  const slug = calc.modelSlug;
  const md = getMonthlyData(out);
  const last = md ? lastMonthData(md) : null;
  const annual = getAnnual(out);
  const summary = (out.summary ?? out) as Record<string, unknown>;

  if (slug === "income-statement") {
    return [
      { label: "Gross Revenue", value: fmt(annual?.["Gross Revenue"] ?? last?.["Gross Revenue"]) },
      { label: "EBITDA", value: fmt(annual?.["EBITDA"] ?? last?.["EBITDA"]) },
      { label: "Net Profit", value: fmt(annual?.["Net Profit"] ?? last?.["Net Profit"]) },
      { label: "Net Margin", value: `${num(annual?.["Net Margin %"] ?? last?.["Net Margin %"]).toFixed(1)}%` },
    ];
  }
  if (slug === "balance-sheet") {
    return [
      { label: "Total Assets", value: fmt(annual?.["TOTAL ASSETS"] ?? last?.["TOTAL ASSETS"]) },
      { label: "Working Capital", value: fmt(annual?.["Working Capital"] ?? last?.["Working Capital"]) },
      { label: "Current Ratio", value: `${num(annual?.["Current Ratio"] ?? last?.["Current Ratio"]).toFixed(2)}x` },
      { label: "Health Score", value: `${num((out.insights as { healthScore?: number })?.healthScore)}/100` },
    ];
  }
  if (slug === "burn-runway") {
    const rw = last?.["Runway (months)"];
    const rwInfinite = rw === null || rw === undefined || !Number.isFinite(Number(rw));
    return [
      { label: "Net Burn", value: fmt(last?.["Net Burn"]) },
      { label: "Runway", value: rwInfinite ? "∞" : `${Number(rw).toFixed(1)} mo` },
      { label: "Cumulative Cash", value: fmt(last?.["Cumulative Cash"]) },
      { label: "Status", value: String(last?.["CLASSIFICATION"] ?? "—") },
    ];
  }
  if (slug === "break-even") {
    return [
      { label: "Break-Even Units", value: fmt(out.breakEvenUnits) },
      { label: "Break-Even Revenue", value: fmt(out.breakEvenRevenue) },
      { label: "Contribution Margin", value: pctVal(num(out.contributionMargin)) },
      { label: "Difficulty", value: String((out.insights as { difficulty?: string })?.difficulty ?? "—") },
    ];
  }
  if (slug === "cashflow-ops") {
    return [
      { label: "Closing Cash", value: fmt(last?.["Closing Balance"]) },
      { label: "Latest CFO", value: fmt(last?.["Net Cash Flow from Operating Activities (CFO)"]) },
      { label: "Net Cash Flow", value: fmt(last?.["Net Cash Flow"]) },
      { label: "Months Modelled", value: String(md ? monthKeys(md).length : 0) },
    ];
  }
  if (slug === "consolidated-cfo") {
    const s = out.summary as Record<string, unknown> | undefined;
    return [
      { label: "Final Cash", value: fmt(s?.finalEndingCash) },
      { label: "CFO / PAT", value: `${num(s?.avgCfoPat).toFixed(2)}x` },
      { label: "Net Cash Flow", value: fmt(s?.totalNetCashFlow) },
      { label: "Classification", value: String(s?.overallClassification ?? "—") },
    ];
  }
  if (slug === "viability-dashboard") {
    return [
      { label: "Net Profit / Loss", value: fmt(out.netProfitLoss) },
      { label: "Contribution Margin", value: `${num(out.contributionMarginPct).toFixed(1)}%` },
      { label: "Margin of Safety", value: `${num(out.marginOfSafetyPct).toFixed(1)}%` },
      { label: "Viability", value: String((out.insights as { viabilityLevel?: string })?.viabilityLevel ?? "—") },
    ];
  }
  if (slug === "unit-economics") {
    return [
      { label: "LTV / CAC", value: last && num(last["CAC"]) > 0 ? `${(num(last["LTV"]) / num(last["CAC"])).toFixed(1)}x` : "—" },
      { label: "CAC", value: fmt(last?.["CAC"]) },
      { label: "LTV", value: fmt(last?.["LTV"]) },
      { label: "Churn", value: `${num(last?.["Churn Rate %"]).toFixed(1)}%` },
    ];
  }
  if (slug === "pitchdeck-kpis") {
    return [
      { label: "LTV / CAC", value: `${num(out.ltvCacRatio).toFixed(1)}x` },
      { label: "Gross Margin", value: pctVal(num(out.grossMargin)) },
      { label: "Runway", value: `${num(out.runwayMonths).toFixed(1)} mo` },
      { label: "Investor Readiness", value: String((out.insights as { investorReadiness?: string })?.investorReadiness ?? "—") },
    ];
  }
  if (slug === "dcf-valuation") {
    return [
      { label: "Enterprise Value", value: fmt(out.enterpriseValue) },
      { label: "Equity Value", value: fmt(out.equityValue) },
      { label: "WACC", value: pctVal(num((out.wacc as Record<string, number>)?.wacc)) },
      { label: "Value / Share", value: fmt(out.valuePerShare) },
    ];
  }
  if (slug === "funding-model") {
    return [
      { label: "Total Funding", value: fmt(summary.totalFunding) },
      { label: "Max Deficit", value: fmt(summary.maxCashDeficit) },
      { label: "Contingency", value: fmt(summary.contingency) },
      { label: "Final Cash", value: fmt(summary.finalCash) },
    ];
  }
  if (slug === "cap-table") {
    const exitVal = num(out.exitValue) || num(inp.exitValue);
    const own = out.ownership as Record<string, number> | undefined;
    const founder = own ? Object.entries(own).filter(([k]) => /founder|promoter/i.test(k)).reduce((s, [, v]) => s + num(v), 0) : 0;
    return [
      { label: "Exit Value", value: fmt(exitVal) },
      { label: "Founder Ownership", value: founder > 0 ? pctVal(founder) : "—" },
      { label: "Founder Payout", value: founder > 0 ? fmt(exitVal * founder) : "—" },
      { label: "Total Shares", value: num(out.totalShares) > 0 ? num(out.totalShares).toLocaleString() : "—" },
    ];
  }
  return [];
}

export function formatStandaloneModelOutputsHTML(calc: CalculationExport, tierColor: string): string | null {
  const slug = calc.modelSlug;
  const out = calc.outputs as Record<string, unknown>;
  const inp = calc.inputs as Record<string, unknown>;

  // Monthly models use calculation-pdf monthly table; add summary-only enrichments
  if (getMonthlyData(out)) return null;

  if (slug === "break-even") {
    const simulation = out.simulation as { units: number; revenue: number; totalCost: number; profitLoss: number; aboveBreakEven: boolean }[] | undefined;
    let html = resultsTableHTML([
      { label: "Price / Unit", value: fmt(inp.pricePerUnit) },
      { label: "Variable Cost / Unit", value: fmt(inp.variableCostPerUnit) },
      { label: "Fixed Cost (Monthly)", value: fmt(inp.fixedCostMonthly) },
    ], tierColor, "Inputs") +
    resultsTableHTML([
      { label: "Contribution / Unit", value: fmt(out.contributionPerUnit) },
      { label: "Contribution Margin", value: pctVal(num(out.contributionMargin)) },
      { label: "Break-Even Units", value: fmt(out.breakEvenUnits) },
      { label: "Break-Even Revenue", value: fmt(out.breakEvenRevenue) },
    ], tierColor, "Core Results");
    if (Array.isArray(simulation) && simulation.length) {
      html += `<p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin:20px 0 8px">Volume Simulation</p>
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr style="background:${tierColor};color:#fff">
            <th style="padding:7px 10px;text-align:right">Units</th>
            <th style="padding:7px 10px;text-align:right">Revenue</th>
            <th style="padding:7px 10px;text-align:right">Total Cost</th>
            <th style="padding:7px 10px;text-align:right">Profit / Loss</th>
            <th style="padding:7px 10px;text-align:center">Status</th>
          </tr></thead>
          <tbody>${simulation.map((r, i) => `<tr style="background:${i % 2 === 0 ? "#fafafa" : "#fff"}">
            <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${r.units.toLocaleString()}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(r.revenue)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(r.totalCost)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:${r.profitLoss >= 0 ? "#16a34a" : "#dc2626"}">${fmt(r.profitLoss)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${r.aboveBreakEven ? "Above BE" : "Below BE"}</td>
          </tr>`).join("")}</tbody>
        </table>`;
    }
    return html;
  }

  if (slug === "viability-dashboard") {
    return resultsTableHTML([
      { label: "Price / Unit", value: fmt(out.averagePricePerUnit) },
      { label: "Variable Cost / Unit", value: fmt(out.variableCostPerUnit) },
      { label: "Fixed Costs / Month", value: fmt(out.monthlyFixedCosts) },
      { label: "Units Sold / Month", value: fmt(out.unitsSoldPerMonth) },
    ], tierColor, "Inputs") +
    resultsTableHTML([
      { label: "Total Revenue", value: fmt(out.totalRevenue) },
      { label: "Contribution Margin", value: `${num(out.contributionMarginPct).toFixed(1)}% (${out.contributionStatus})` },
      { label: "Net Profit / Loss", value: fmt(out.netProfitLoss) },
      { label: "Net Margin", value: `${num(out.netProfitMarginPct).toFixed(1)}% (${out.netProfitStatus})` },
      { label: "Break-Even Units", value: fmt(out.breakEvenUnits) },
      { label: "Break-Even Revenue", value: fmt(out.breakEvenRevenue) },
      { label: "Break-Even Utilisation", value: `${num(out.breakEvenUtilisationPct).toFixed(0)}% (${out.breakevenStatus})` },
      { label: "Margin of Safety", value: `${num(out.marginOfSafetyPct).toFixed(1)}% (${out.marginSafetyStatus})` },
    ], tierColor, "Calculated Results");
  }

  if (slug === "pitchdeck-kpis") {
    return resultsTableHTML([
      { label: "Gross Monthly Revenue", value: fmt(out.grossMonthlyRevenue) },
      { label: "Recurring Revenue", value: fmt(out.recurringRevenue) },
      { label: "COGS", value: fmt(out.cogs) },
      { label: "Marketing Spend", value: fmt(out.monthlyMarketingSpend) },
      { label: "Fixed + Variable Costs", value: fmt(num(out.fixedCosts) + num(out.variableCosts)) },
      { label: "Cash Available", value: fmt(out.cashAvailable) },
    ], tierColor, "Inputs") +
    resultsTableHTML([
      { label: "Gross Margin", value: `${pctVal(num(out.grossMargin))} (${out.grossMarginStatus})` },
      { label: "CAC", value: fmt(out.cac) },
      { label: "LTV", value: fmt(out.ltv) },
      { label: "LTV / CAC", value: `${num(out.ltvCacRatio).toFixed(1)}x (${out.ltvCacStatus})` },
      { label: "Recurring Revenue Ratio", value: `${pctVal(num(out.recurringRevenueRatio))} (${out.recurringRatioStatus})` },
      { label: "Net Burn", value: fmt(out.netBurn) },
      { label: "Runway (Months)", value: `${num(out.runwayMonths).toFixed(1)} (${out.runwayStatus})` },
      { label: "Burn Multiple", value: `${num(out.burnMultiple).toFixed(1)}x` },
      { label: "CAC Payback (Months)", value: num(out.cacPaybackMonths).toFixed(1) },
    ], tierColor, "Investor KPIs");
  }

  if (slug === "dcf-valuation") {
    const wacc = out.wacc as Record<string, number> | undefined;
    const years = out.years as { year: string; revenue: number; ebitda: number; fcff: number; pvOfFCFF: number }[] | undefined;
    let html = resultsTableHTML([
      { label: "WACC", value: pctVal(num(wacc?.wacc)) },
      { label: "Cost of Equity", value: pctVal(num(wacc?.costOfEquity)) },
      { label: "After-Tax Cost of Debt", value: pctVal(num(wacc?.afterTaxCostOfDebt)) },
      { label: "Enterprise Value", value: fmt(out.enterpriseValue) },
      { label: "Equity Value", value: fmt(out.equityValue) },
      { label: "Value Per Share", value: fmt(out.valuePerShare) },
      { label: "PV of FCFF (5yr)", value: fmt(out.totalPVofFCFF) },
      { label: "PV of Terminal Value", value: fmt(out.pvOfTerminalValue) },
    ], tierColor, "Valuation Summary");
    if (Array.isArray(years) && years.length) {
      html += `<p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin:20px 0 8px">5-Year FCFF Projection</p>
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr style="background:${tierColor};color:#fff">
            ${["Year", "Revenue", "EBITDA", "FCFF", "PV of FCFF"].map((h) => `<th style="padding:7px 10px;text-align:right">${h}</th>`).join("")}
          </tr></thead>
          <tbody>${years.map((y, i) => `<tr style="background:${i % 2 === 0 ? "#fafafa" : "#fff"}">
            <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${y.year}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(y.revenue)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(y.ebitda)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${fmt(y.fcff)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:700">${fmt(y.pvOfFCFF)}</td>
          </tr>`).join("")}</tbody>
        </table>`;
    }
    return html;
  }

  if (slug === "cap-table") {
    const ownership = out.ownership as Record<string, number> | undefined;
    const waterfall = out.waterfall as Record<string, { ownershipPct?: number; payout?: number }> | undefined;
    let html = resultsTableHTML([
      { label: "Exit Value", value: fmt(out.exitValue ?? inp.exitValue) },
      { label: "Total Shares", value: num(out.totalShares) > 0 ? num(out.totalShares).toLocaleString() : "—" },
    ], tierColor, "Exit Scenario");
    if (ownership) {
      html += resultsTableHTML(
        Object.entries(ownership).map(([name, pctOwn]) => ({
          label: name,
          value: pctVal(num(pctOwn)),
        })),
        tierColor,
        "Ownership"
      );
    }
    if (waterfall) {
      html += resultsTableHTML(
        Object.entries(waterfall).map(([name, w]) => ({
          label: name,
          value: fmt(w.payout),
        })),
        tierColor,
        "Exit Waterfall (Payouts)"
      );
    }
    return html;
  }

  if (slug === "funding-model") {
    const s = (out.summary ?? out) as Record<string, unknown>;
    return resultsTableHTML([
      { label: "Max Cash Deficit", value: fmt(s.maxCashDeficit) },
      { label: "Funding Required", value: fmt(s.fundingRequired) },
      { label: "Contingency", value: fmt(s.contingency) },
      { label: "Total Funding", value: fmt(s.totalFunding) },
      { label: "Opening Cash", value: fmt(s.openingCash) },
      { label: "Final Cash", value: fmt(s.finalCash) },
      { label: "Total Revenue", value: fmt(s.totalRevenue) },
      { label: "Total EBITDA", value: fmt(s.totalEBITDA) },
      { label: "Avg Cash Conversion Cycle", value: `${num(s.avgCashConversionCycle).toFixed(0)} days` },
    ], tierColor, "Funding Summary");
  }

  return null;
}
