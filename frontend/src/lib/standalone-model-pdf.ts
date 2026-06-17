import type { CalculationExport } from "@/lib/calculation-pdf";
import {
  STANDALONE_ACCENT,
  fmt,
  num,
  pct,
  pctVal,
  p,
  bullet,
  section,
  callout,
  metricTable,
  numberedPlan,
  scenarioTable,
  wrapAnalysis,
  resultsTableHTML,
  ragBadge,
  getMonthlyData,
  getAnnual,
  monthKeys,
  lastMonthData,
  trendAcrossMonths,
  standardRoadmap,
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

function insightsGuidance(out: Record<string, unknown>): string[] {
  const ins = out.insights as { guidance?: string[] } | undefined;
  return Array.isArray(ins?.guidance) ? ins.guidance : [];
}

function statusOverall(out: Record<string, unknown>): string {
  const st = out.status as { overall?: string } | undefined;
  return st?.overall ?? "";
}

// ── INCOME STATEMENT ───────────────────────────────────────────────────────────

function analyzeIncomeStatement(out: Record<string, unknown>, inp: Record<string, unknown>): string {
  const md = getMonthlyData(out);
  const annual = getAnnual(out) ?? {};
  const derived = (out.derived ?? {}) as Record<string, number>;
  const months = md ? monthKeys(md) : [];
  const last = md ? lastMonthData(md) : null;

  const revenue = num(annual["Gross Revenue"]) || (last ? num(last["Gross Revenue"]) : 0);
  const grossProfit = num(annual["Gross Profit"]) || (last ? num(last["Gross Profit"]) : 0);
  const ebitda = num(annual["EBITDA"]) || (last ? num(last["EBITDA"]) : 0);
  const netProfit = num(annual["Net Profit"]) || (last ? num(last["Net Profit"]) : 0);
  const gm = num(derived.grossMarginAnnual) || num(annual["Gross Margin %"]);
  const em = num(derived.ebitdaMarginAnnual) || num(annual["EBITDA Margin %"]);
  const nm = num(derived.netMarginAnnual) || num(annual["Net Margin %"]);
  const qGrowth = derived.revenueGrowthQ2Q;

  const monthsAdded = Array.isArray(out.monthsAdded) ? out.monthsAdded.length : 0;
  const exec = p(`<strong>Executive summary:</strong> Over ${months.length || monthsAdded} month(s), your P&amp;L shows <strong>${fmt(revenue)}</strong> gross revenue, <strong>${fmt(ebitda)}</strong> EBITDA (${em.toFixed(1)}% margin), and <strong>${fmt(netProfit)}</strong> net profit (${nm.toFixed(1)}% net margin). Gross margin is <strong>${gm.toFixed(1)}%</strong>. ${netProfit >= 0 ? "The business is profitable on a reported basis." : "The business is loss-making — immediate margin and cost actions are required."}`);

  const results = metricTable([
    { label: "Gross Revenue (Annual / Latest)", value: fmt(revenue), note: "Top-line scale" },
    { label: "Gross Profit", value: fmt(grossProfit), note: `${gm.toFixed(1)}% gross margin` },
    { label: "EBITDA", value: fmt(ebitda), note: `${em.toFixed(1)}% EBITDA margin` },
    { label: "Net Profit (PAT)", value: fmt(netProfit), note: `${nm.toFixed(1)}% net margin` },
    { label: "Total Fixed Costs", value: fmt(annual["Total Fixed Costs"]), note: pct(num(annual["Total Fixed Costs"]), revenue) + " of revenue" },
    { label: "Total Variable Costs", value: fmt(annual["Total variable Costs"]), note: pct(num(annual["Total variable Costs"]), revenue) + " of revenue" },
    { label: "Q-o-Q Revenue Growth", value: qGrowth != null ? `${qGrowth.toFixed(1)}%` : "—", note: "Latest vs prior quarter" },
  ]);

  const deepItems: string[] = [];
  if (gm < 20) deepItems.push("Gross margin below 20% — pricing power or COGS efficiency is weak. Benchmark SaaS: 70%+, D2C: 40–60%, services: 50%+.");
  else if (gm > 50) deepItems.push("Strong gross margin (>50%) — core unit economics support scaling if CAC is controlled.");
  if (em < 0) deepItems.push("Negative EBITDA means operating expenses exceed gross profit — audit Salaries, Rent, Marketing, and Technology spend.");
  if (num(annual["Total Fixed Costs"]) / (revenue || 1) > 0.4) deepItems.push("Fixed costs exceed 40% of revenue — high operating leverage; revenue dips will amplify losses.");
  if (last) {
    const revTrend = md ? trendAcrossMonths(md, "Gross Revenue") : { change: 0, first: 0, last: 0 };
    if (revTrend.change > 0) deepItems.push(`Revenue trend: grew from ${fmt(revTrend.first)} to ${fmt(revTrend.last)} across entered months.`);
    else if (revTrend.change < 0) deepItems.push(`Revenue trend: declined ${fmt(Math.abs(revTrend.change))} from first to last month — investigate pipeline and retention.`);
  }
  insightsGuidance(out).slice(0, 3).forEach((g) => deepItems.push(g.replace(/^[✓⚠️💡📊]\s*/, "")));

  const scenarios = scenarioTable(
    ["Scenario", "Revenue Change", "Est. Net Profit"],
    [
      ["Base case", fmt(revenue), fmt(netProfit)],
      ["+10% revenue (costs flat)", fmt(revenue * 1.1), fmt(netProfit + revenue * 0.1 * (gm / 100))],
      ["-10% revenue (costs flat)", fmt(revenue * 0.9), fmt(netProfit - revenue * 0.1 * (gm / 100))],
      ["Cut opex 15%", fmt(revenue), fmt(netProfit + num(annual["Total Operating Expenses"]) * 0.15)],
    ]
  );

  const risks: string[] = [];
  if (netProfit < 0) risks.push("Sustained losses erode cash reserves and investor confidence.");
  if (gm < 15) risks.push("Very low gross margin — one pricing mistake or supplier cost spike can wipe out contribution.");
  if (em > 0 && netProfit < 0) risks.push("EBITDA-positive but PAT-negative — interest and tax burden may be unsustainable.");
  if (months.length < 3) risks.push("Limited month coverage — annualized figures may not reflect seasonality.");

  return wrapAnalysis(
    section("Executive Summary", exec) +
    section("Complete Results Breakdown", results) +
    section("Deep Dive", `<ul style="margin:0;padding-left:18px">${deepItems.map(bullet).join("") || bullet("Enter more months for trend and seasonality analysis.")}</ul>`) +
    section("Scenario Analysis", p("Stress-test how revenue and cost changes affect profitability:") + scenarios) +
    section("Risk Flags", risks.length ? `<ul style="margin:0;padding-left:18px">${risks.map(bullet).join("")}</ul>` : callout("ok", "No critical flags", "Fundamentals appear manageable on reported metrics.")) +
    standardRoadmap({
      d30: ["Lock monthly close process — reconcile revenue and COGS to bank/collections.", "Identify top 3 expense lines driving EBITDA gap.", "Set gross margin and net margin targets for next quarter."],
      d60: ["Implement monthly variance review (budget vs actual).", "Renegotiate top vendor contracts or adjust pricing tiers.", "Model headcount plan tied to revenue milestones."],
      d90: ["Publish investor-ready P&amp;L summary with 12-month forecast.", "Link Income Statement outputs to Balance Sheet and Cash Flow models.", "Prepare board pack with margin improvement narrative."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">
      ${bullet("Cross-link with Balance Sheet to validate working capital and debt service capacity.")}
      ${bullet("Use Burn & Runway Monitor to translate P&amp;L losses into cash runway.")}
      ${bullet("Feed gross margin and growth into Pitch Deck KPIs for investor narrative.")}
    </ul>`)
  );
}

// ── BALANCE SHEET ──────────────────────────────────────────────────────────────

function analyzeBalanceSheet(out: Record<string, unknown>): string {
  const md = getMonthlyData(out);
  const annual = getAnnual(out) ?? {};
  const last = md ? lastMonthData(md) : null;
  const ins = out.insights as { overall?: string; healthScore?: number; guidance?: string[] } | undefined;

  const totalAssets = num(annual["TOTAL ASSETS"]) || (last ? num(last["TOTAL ASSETS"]) : 0);
  const totalLiab = num(annual["TOTAL LIABILITIES"]) || (last ? num(last["TOTAL LIABILITIES"]) : 0);
  const equity = num(annual["Total Equity"]) || (last ? num(last["Total Equity"]) : 0);
  const wc = num(annual["Working Capital"]) || (last ? num(last["Working Capital"]) : 0);
  const cr = num(annual["Current Ratio"]) || (last ? num(last["Current Ratio"]) : 0);
  const qr = num(annual["Quick Ratio"]) || (last ? num(last["Quick Ratio"]) : 0);
  const de = num(annual["Debt/Equity Ratio"]) || (last ? num(last["Debt/Equity Ratio"]) : 0);
  const balanceCheck = num(annual["BALANCE CHECK"]) || (last ? num(last["BALANCE CHECK"]) : 0);
  const cash = num(annual["Cash & Cash Equivalents (Cash at bank included)"]) || (last ? num(last["Cash & Cash Equivalents (Cash at bank included)"]) : 0);

  const exec = p(`<strong>Executive summary:</strong> Total assets of <strong>${fmt(totalAssets)}</strong> are funded by <strong>${fmt(equity)}</strong> equity and liabilities of <strong>${fmt(totalLiab)}</strong>. Working capital is <strong>${fmt(wc)}</strong> with a current ratio of <strong>${cr.toFixed(2)}x</strong>. ${ins?.overall ? ins.overall : balanceCheck === 0 ? "Balance sheet balances correctly." : "Balance check mismatch — verify inputs."}`);

  const results = metricTable([
    { label: "Total Assets", value: fmt(totalAssets) },
    { label: "Total Equity", value: fmt(equity), note: pct(equity, totalAssets) + " of assets" },
    { label: "Working Capital", value: fmt(wc), note: wc >= 0 ? "Positive" : "Negative — liquidity risk" },
    { label: "Current Ratio", value: cr.toFixed(2) + "x", note: cr >= 1.5 ? "Healthy" : cr >= 1 ? "Adequate" : "Tight" },
    { label: "Quick Ratio", value: qr.toFixed(2) + "x", note: "Excludes inventory" },
    { label: "Debt / Equity", value: de.toFixed(2) + "x", note: de > 2 ? "High leverage" : "Moderate" },
    { label: "Cash & Equivalents", value: fmt(cash) },
    { label: "Balance Check", value: balanceCheck === 0 ? "✓ Balanced" : fmt(balanceCheck), note: "Should be zero" },
    { label: "Health Score", value: ins?.healthScore != null ? `${ins.healthScore}/100` : "—" },
  ]);

  const deep: string[] = [];
  if (wc < 0) deep.push("Negative working capital — you may struggle to pay short-term obligations without refinancing or faster collections.");
  if (cr < 1) deep.push("Current ratio below 1.0 — current liabilities exceed current assets. Prioritize receivables collection and payables negotiation.");
  if (de > 2) deep.push("Debt/equity above 2x — high financial leverage increases interest risk and reduces fundraising flexibility.");
  (ins?.guidance ?? []).slice(0, 4).forEach((g) => deep.push(g));

  const risks: string[] = [];
  if (balanceCheck !== 0) risks.push("Balance sheet does not balance — audit asset/liability/equity entries before sharing with investors.");
  if (cr < 1.2) risks.push("Liquidity constraint — insufficient buffer for unexpected expenses.");
  if (num(annual["Trade Receivables (Debtors)"]) > revenueProxy(out) * 0.25) risks.push("High receivables relative to scale — collection risk.");

  return wrapAnalysis(
    section("Executive Summary", exec) +
    section("Complete Results Breakdown", results) +
    section("Deep Dive", `<ul style="margin:0;padding-left:18px">${deep.map(bullet).join("") || bullet("Add more months to track ratio trends.")}</ul>`) +
    section("Scenario Analysis", scenarioTable(["Scenario", "Impact"], [
      ["10% receivables write-off", fmt(-num(annual["Trade Receivables (Debtors)"]) * 0.1) + " hit to assets"],
      ["15% inventory write-down", fmt(-num(annual["Inventory / Stock"]) * 0.15)],
      ["Equity injection (+20% cash)", fmt(cash * 1.2) + " cash; improved current ratio"],
    ])) +
    section("Risk Flags", risks.length ? `<ul style="margin:0;padding-left:18px">${risks.map(bullet).join("")}</ul>` : callout("ok", "Solid structure", "Key ratios within acceptable ranges.")) +
    standardRoadmap({
      d30: ["Verify balance check = 0 for latest month.", "Age receivables >90 days and chase top debtors.", "Map short-term debt maturity schedule."],
      d60: ["Target current ratio ≥1.5 via WC optimization.", "Review inventory turns vs industry.", "Stress-test D/E under 20% revenue decline."],
      d90: ["Integrate with Cash Flow Statement for liquidity forecast.", "Prepare balance sheet snapshot for data room.", "Align equity story with Cap Table ownership."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">
      ${bullet("Pair with Funding Model to size raise against max cash deficit.")}
      ${bullet("Use DCF Valuation once equity and debt weights are validated.")}
    </ul>`)
  );
}

function revenueProxy(out: Record<string, unknown>): number {
  const a = getAnnual(out);
  return num(a?.["TOTAL ASSETS"]) * 0.5 || 1;
}

// ── BURN & RUNWAY ──────────────────────────────────────────────────────────────

function analyzeBurnRunway(out: Record<string, unknown>, inp: Record<string, unknown>): string {
  const md = getMonthlyData(out);
  const openingCash = num(out.openingCash) || num(inp.openingCash);
  const ins = out.insights as { overall?: string; healthScore?: number; runwayTrend?: string; cashOutlook?: string; guidance?: string[] } | undefined;
  const last = md ? lastMonthData(md) : null;
  const months = md ? monthKeys(md) : [];

  const netBurn = last ? num(last["Net Burn"]) : 0;
  const grossBurn = last ? num(last["Gross Burn"]) : 0;
  const runway = last ? num(last["Runway (months)"]) : 0;
  const cumCash = last ? num(last["Cumulative Cash"]) : openingCash;
  const revRatio = last ? num(last["Recurring Revenue ratio"]) : 0;

  const exec = p(`<strong>Executive summary:</strong> With <strong>${fmt(openingCash)}</strong> opening cash and <strong>${fmt(netBurn)}</strong>/month net burn, you have approximately <strong>${runway.toFixed(1)} months</strong> of runway (${(runway / 12).toFixed(1)} years). Cumulative cash stands at <strong>${fmt(cumCash)}</strong>. Outlook: <strong>${ins?.cashOutlook ?? "—"}</strong>, trend: <strong>${ins?.runwayTrend ?? "—"}</strong>.`);

  const results = metricTable([
    { label: "Opening Cash", value: fmt(openingCash) },
    { label: "Latest Net Burn / Month", value: fmt(netBurn), note: "Revenue − expenses" },
    { label: "Latest Gross Burn / Month", value: fmt(grossBurn), note: "Total expenses" },
    { label: "Runway (Months)", value: runway.toFixed(1), note: runway < 6 ? "Critical" : runway < 12 ? "Watch" : "Healthy" },
    { label: "Cumulative Cash (Latest)", value: fmt(cumCash) },
    { label: "Recurring Revenue Ratio", value: pctVal(revRatio), note: "Higher = more predictable" },
    { label: "Classification", value: last ? String(last["CLASSIFICATION"]) : "—" },
    { label: "Health Score", value: ins?.healthScore != null ? `${ins.healthScore}/100` : "—" },
  ]);

  const risks: string[] = [];
  if (runway < 6) risks.push("CRITICAL: Less than 6 months runway — begin emergency cost cuts and fundraising immediately.");
  else if (runway < 12) risks.push("Under 12 months — start fundraise now (typical close: 4–6 months).");
  if (netBurn > 0 && revRatio < 0.5) risks.push("Low recurring revenue ratio — burn is hard to offset with predictable income.");
  if (md) {
    const burnTrend = trendAcrossMonths(md, "Net Burn");
    if (burnTrend.change > 0) risks.push("Net burn is increasing month-over-month — investigate expense creep.");
  }

  return wrapAnalysis(
    section("Executive Summary", exec) +
    section("Complete Results Breakdown", results) +
    section("Deep Dive", `<ul style="margin:0;padding-left:18px">${(ins?.guidance ?? []).map(bullet).join("") || bullet("Track burn weekly during fundraise.")}</ul>`) +
    section("Scenario Analysis", scenarioTable(["Scenario", "Runway Impact"], [
      ["Base", `${runway.toFixed(1)} months`],
      ["Reduce net burn 20%", netBurn > 0 ? `${(cumCash / (netBurn * 0.8)).toFixed(1)} months` : "∞"],
      ["Reduce net burn 30%", netBurn > 0 ? `${(cumCash / (netBurn * 0.7)).toFixed(1)} months` : "∞"],
      ["Bridge round (+6 mo burn)", `${(runway + 6).toFixed(1)} months`],
    ])) +
    section("Risk Flags", risks.length ? `<ul style="margin:0;padding-left:18px">${risks.map(bullet).join("")}</ul>` : callout("ok", "Runway adequate", "Continue monitoring monthly.")) +
    standardRoadmap({
      d30: ["Weekly cash dashboard: burn, runway, top 5 expenses.", "Identify 15–20% opex reduction levers.", "Update 13-week cash flow forecast."],
      d60: ["Launch investor outreach if runway <12 months.", "Negotiate payment terms with largest vendors.", "Increase recurring revenue share."],
      d90: ["Close bridge or extend runway 18+ months.", "Set burn multiple targets for next stage.", "Sync with Funding Model for raise sizing."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">
      ${bullet("Feed runway into Pitch Deck KPIs for investor slides.")}
      ${bullet("Link to Funding Model for total funding required incl. contingency.")}
    </ul>`)
  );
}

// ── BREAK-EVEN (STANDALONE) ────────────────────────────────────────────────────

function analyzeBreakEvenStandalone(out: Record<string, unknown>, inp: Record<string, unknown>): string {
  const price = num(inp.pricePerUnit);
  const varCost = num(inp.variableCostPerUnit);
  const fixed = num(inp.fixedCostMonthly);
  const contrib = num(out.contributionPerUnit) || (price - varCost);
  const contribMargin = num(out.contributionMargin) || (price > 0 ? contrib / price : 0);
  const beUnits = num(out.breakEvenUnits);
  const beRev = num(out.breakEvenRevenue);
  const simulation = out.simulation as { units: number; revenue: number; profitLoss: number; aboveBreakEven: boolean }[] | undefined;
  const ins = out.insights as { difficulty?: string; healthScore?: number; guidance?: string[] } | undefined;

  const firstAboveBE = simulation?.find((r) => r.aboveBreakEven);
  const refUnits = firstAboveBE?.units ?? 0;
  const refProfit = firstAboveBE?.profitLoss ?? 0;
  const dailyBE = beUnits > 0 ? beUnits / 30 : 0;

  const exec = p(`<strong>Executive summary:</strong> Break-even requires <strong>${beUnits.toLocaleString(undefined, { maximumFractionDigits: 0 })} units</strong> (${fmt(beRev)} revenue) per month — roughly <strong>${dailyBE.toFixed(0)} units/day</strong>. Contribution margin: <strong>${pctVal(contribMargin)}</strong> (${fmt(contrib)}/unit). Fixed costs: <strong>${fmt(fixed)}</strong>/month. Difficulty: <strong>${ins?.difficulty ?? "—"}</strong>. ${firstAboveBE ? `At ${refUnits.toLocaleString()} units (first simulated volume above break-even), profit is <strong>${fmt(refProfit)}</strong>/month.` : "Run simulation scenarios to see profit at different volumes."}`);

  const results = metricTable([
    { label: "Price / Unit", value: fmt(price) },
    { label: "Variable Cost / Unit", value: fmt(varCost) },
    { label: "Contribution / Unit", value: fmt(contrib) },
    { label: "Contribution Margin", value: pctVal(contribMargin) },
    { label: "Monthly Fixed Costs", value: fmt(fixed) },
    { label: "Break-Even Units", value: beUnits.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
    { label: "Break-Even Revenue", value: fmt(beRev) },
    { label: "Break-Even Units / Day", value: dailyBE.toFixed(0) },
    { label: "First Profitable Scenario", value: firstAboveBE ? `${refUnits.toLocaleString()} units → ${fmt(refProfit)}` : "—" },
    { label: "Difficulty", value: ins?.difficulty ?? "—" },
  ]);

  let simHTML = "";
  if (Array.isArray(simulation) && simulation.length) {
    simHTML = scenarioTable(
      ["Units", "Revenue", "Profit / Loss", "Status"],
      simulation.map((r) => [
        r.units.toLocaleString(),
        fmt(r.revenue),
        fmt(r.profitLoss),
        r.aboveBreakEven ? "Above BE" : "Below BE",
      ])
    );
  }

  const risks: string[] = [];
  if (contribMargin < 0.2) risks.push("Contribution margin below 20% — small cost increases can eliminate profitability.");
  if (contrib <= 0) risks.push("Negative contribution per unit — every sale loses money before fixed costs. Fix pricing or variable costs immediately.");
  if (beUnits > 10000) risks.push("Very high break-even volume — consider reducing fixed costs or improving contribution margin.");

  return wrapAnalysis(
    section("Executive Summary", exec) +
    section("Complete Results Breakdown", results) +
    section("Deep Dive", `<ul style="margin:0;padding-left:18px">${(ins?.guidance ?? []).map(bullet).join("") || bullet("Increase price or reduce variable cost to lower break-even threshold.")}</ul>`) +
    section("Scenario Analysis", (simHTML || p("Simulation table not saved — re-run Calculate for full volume scenarios."))) +
    section("Risk Flags", risks.length ? `<ul style="margin:0;padding-left:18px">${risks.map(bullet).join("")}</ul>` : callout("ok", "Viable structure", "Contribution margin supports profitability at target volume.")) +
    standardRoadmap({
      d30: ["Validate fixed vs variable cost classification.", "Run 3 pricing scenarios (+5%, +10%, bundle).", "Set weekly unit volume tracker vs break-even."],
      d60: ["Cut discretionary fixed costs 10–15%.", "Test CAC payback at current contribution.", "Build 90-day volume ramp plan."],
      d90: ["Integrate with Viability Dashboard for holistic view.", "Update investor deck with path to profitability.", "Link to Costing Model for unit cost accuracy."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">
      ${bullet("Use Viability Dashboard for RAG status on margin of safety.")}
      ${bullet("Feed break-even utilisation into Pitch Deck KPIs narrative.")}
    </ul>`)
  );
}

// ── CASHFLOW OPS ───────────────────────────────────────────────────────────────

function analyzeCashflowOps(out: Record<string, unknown>, inp: Record<string, unknown>): string {
  const md = getMonthlyData(out);
  const openingCash = num(out.openingCash) || num(inp.openingCash);
  const months = md ? monthKeys(md) : [];
  const last = md ? lastMonthData(md) : null;

  let totalCFO = 0;
  let totalCFI = 0;
  let totalCFF = 0;
  let totalNet = 0;
  months.forEach((m) => {
    if (!md) return;
    totalCFO += num(md[m]["Net Cash Flow from Operating Activities (CFO)"]);
    totalCFI += num(md[m]["Cash Flow from Investing Activities (CFI)"]);
    totalCFF += num(md[m]["Cash Flow from Financing Activities (CFF)"]);
    totalNet += num(md[m]["Net Cash Flow"]);
  });

  const closing = last ? num(last["Closing Balance"]) : openingCash + totalNet;

  const exec = p(`<strong>Executive summary:</strong> Over ${months.length} month(s), operating cash flow (CFO) totalled <strong>${fmt(totalCFO)}</strong>, investing (CFI) <strong>${fmt(totalCFI)}</strong>, and financing (CFF) <strong>${fmt(totalCFF)}</strong>. Net cash movement: <strong>${fmt(totalNet)}</strong>. Closing cash balance: <strong>${fmt(closing)}</strong> (from ${fmt(openingCash)} opening).`);

  const results = metricTable([
    { label: "Opening Cash", value: fmt(openingCash) },
    { label: "Total CFO (Operating)", value: fmt(totalCFO), note: "Core business cash" },
    { label: "Total CFI (Investing)", value: fmt(totalCFI), note: "CapEx / asset sales" },
    { label: "Total CFF (Financing)", value: fmt(totalCFF), note: "Equity, debt, dividends" },
    { label: "Net Cash Flow (Period)", value: fmt(totalNet) },
    { label: "Closing Balance", value: fmt(closing) },
    { label: "Latest Month CFO", value: last ? fmt(last["Net Cash Flow from Operating Activities (CFO)"]) : "—" },
    { label: "Latest EBITDA (proxy)", value: last ? fmt(last["EBITDA"]) : "—" },
  ]);

  const risks: string[] = [];
  if (totalCFO < 0) risks.push("Negative operating cash flow — business consumes cash from operations; profits may not convert to cash.");
  if (totalCFF > 0 && totalCFO < 0) risks.push("Relying on financing to fund operations — unsustainable without path to CFO-positive.");
  if (closing < openingCash * 0.5 && closing > 0) risks.push("Cash balance declined significantly — monitor weekly.");

  return wrapAnalysis(
    section("Executive Summary", exec) +
    section("Complete Results Breakdown", results) +
    section("Deep Dive", `<ul style="margin:0;padding-left:18px">
      ${bullet("CFO/PAT and CFO/EBITDA ratios are computed in Consolidated CFO view — run that model for cash conversion quality.")}
      ${bullet("Investigate gap between PAT and CFO if receivables or inventory are growing.")}
    </ul>`) +
    section("Scenario Analysis", scenarioTable(["Scenario", "Closing Cash"], [
      ["Base", fmt(closing)],
      ["CFO improves 15%", fmt(closing + totalCFO * 0.15)],
      ["Delay CapEx 1 quarter", fmt(closing - totalCFI * 0.3)],
      ["Equity raise (3 mo burn)", fmt(closing + Math.abs(totalNet) * 3)],
    ])) +
    section("Risk Flags", risks.length ? `<ul style="margin:0;padding-left:18px">${risks.map(bullet).join("")}</ul>` : callout("ok", "Cash flow stable", "Operating activities support liquidity.")) +
    standardRoadmap({
      d30: ["Reconcile CFO to bank statements.", "Flag months with CFO/PAT < 0.8.", "Map CapEx pipeline for next 2 quarters."],
      d60: ["Run Consolidated CFO for RAG classification.", "Optimize working capital (DSO, DPO).", "Build 13-week direct cash forecast."],
      d90: ["Integrate with Balance Sheet cash line.", "Include in investor data room.", "Tie to Funding Model deficit analysis."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">${bullet("Use Consolidated CFO for investor-grade cash conversion metrics.")}</ul>`)
  );
}

// ── CONSOLIDATED CFO ───────────────────────────────────────────────────────────

function analyzeConsolidatedCFO(out: Record<string, unknown>, inp: Record<string, unknown>): string {
  const md = getMonthlyData(out);
  const summary = (out.summary ?? {}) as Record<string, unknown>;
  const openingCash = num(out.openingCash) || num(inp.openingCash);
  const months = md ? monthKeys(md) : [];

  const totalNet = num(summary.totalNetCashFlow);
  const finalCash = num(summary.finalEndingCash);
  const avgCfoPat = num(summary.avgCfoPat);
  const avgCfoEbitda = num(summary.avgCfoEbitda);
  const overall = String(summary.overallClassification ?? "—");

  const exec = p(`<strong>Executive summary:</strong> Consolidated cash analysis across ${months.length} months shows <strong>${fmt(totalNet)}</strong> total net cash flow, ending at <strong>${fmt(finalCash)}</strong>. Average CFO/PAT ratio: <strong>${avgCfoPat.toFixed(2)}x</strong>, CFO/EBITDA: <strong>${avgCfoEbitda.toFixed(2)}x</strong>. Overall classification: <strong>${overall}</strong>. ${avgCfoPat > 1.2 ? "Strong cash-backed profits." : avgCfoPat > 0.8 ? "Acceptable conversion — monitor closely." : "Weak cash conversion — profits not fully converting to cash."}`);

  const results = metricTable([
    { label: "Opening Cash", value: fmt(openingCash) },
    { label: "Total Net Cash Flow", value: fmt(totalNet) },
    { label: "Final Ending Cash", value: fmt(finalCash) },
    { label: "Avg CFO / PAT", value: avgCfoPat.toFixed(2) + "x", note: ">1.2 Strong" },
    { label: "Avg CFO / EBITDA", value: avgCfoEbitda.toFixed(2) + "x" },
    { label: "Overall Classification", value: overall },
  ]);

  let monthRAG = "";
  if (md) {
    monthRAG = `<div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0">${months.map((m) => {
      const c = String(md[m]?.classification ?? "—");
      return `<span>${m}: ${ragBadge(c)}</span>`;
    }).join("")}</div>`;
  }

  const risks: string[] = [];
  if (overall === "Red" || overall === "Weak") risks.push("Cash conversion is weak — investigate receivables, inventory, and accrual vs cash timing.");
  if (avgCfoPat < 0.8) risks.push("CFO/PAT below 0.8 — reported profits overstate cash generation.");

  return wrapAnalysis(
    section("Executive Summary", exec) +
    section("Complete Results Breakdown", results + monthRAG) +
    section("Deep Dive", `<ul style="margin:0;padding-left:18px">
      ${bullet("CFO/PAT > 1.2 indicates strong cash-backed earnings — ideal for growth investors.")}
      ${bullet("Red months require drill-down in Cashflow Ops for specific inflow/outflow drivers.")}
    </ul>`) +
    section("Scenario Analysis", scenarioTable(["Metric", "Current", "Target"], [
      ["CFO/PAT", avgCfoPat.toFixed(2), "1.20+"],
      ["Ending Cash", fmt(finalCash), fmt(finalCash * 1.15)],
      ["Red months", months.filter((m) => md && String(md[m]?.classification) === "Red").length.toString(), "0"],
    ])) +
    section("Risk Flags", risks.length ? `<ul style="margin:0;padding-left:18px">${risks.map(bullet).join("")}</ul>` : callout("ok", "Strong conversion", "Cash flows align with reported performance.")) +
    standardRoadmap({
      d30: ["Resolve all Red-classified months.", "Accelerate collections on top 10 receivables.", "Align accrual P&amp;L with cash timing."],
      d60: ["Achieve avg CFO/PAT ≥ 1.0.", "Present consolidated view in board pack.", "Benchmark vs industry cash conversion."],
      d90: ["Investor-ready cash narrative for data room.", "Link to Burn & Runway for forward view.", "Automate monthly CFO dashboard."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">${bullet("Primary model for investor due diligence on cash quality.")}</ul>`)
  );
}

// ── VIABILITY DASHBOARD ────────────────────────────────────────────────────────

function analyzeViability(out: Record<string, unknown>): string {
  const revenue = num(out.totalRevenue);
  const netProfit = num(out.netProfitLoss);
  const gm = num(out.contributionMarginPct);
  const nm = num(out.netProfitMarginPct);
  const beUnits = num(out.breakEvenUnits);
  const units = num(out.unitsSoldPerMonth);
  const mos = num(out.marginOfSafetyPct);
  const beUtil = num(out.breakEvenUtilisationPct);
  const ins = out.insights as { viabilityLevel?: string; healthScore?: number; guidance?: string[] } | undefined;

  const exec = p(`<strong>Executive summary:</strong> Selling <strong>${units.toLocaleString()}</strong> units at <strong>${fmt(num(out.averagePricePerUnit))}</strong> generates <strong>${fmt(revenue)}</strong>/month revenue. Net ${netProfit >= 0 ? "profit" : "loss"}: <strong>${fmt(Math.abs(netProfit))}</strong> (${nm.toFixed(1)}% margin). Break-even: <strong>${beUnits.toLocaleString(undefined, { maximumFractionDigits: 0 })} units</strong> (${beUtil.toFixed(0)}% utilisation). Margin of safety: <strong>${mos.toFixed(1)}%</strong>. Viability: <strong>${ins?.viabilityLevel ?? "—"}</strong>.`);

  const results = metricTable([
    { label: "Contribution Margin", value: `${gm.toFixed(1)}%`, note: String(out.contributionStatus) },
    { label: "Net Profit / Loss", value: fmt(netProfit), note: String(out.netProfitStatus) },
    { label: "Break-Even Utilisation", value: `${beUtil.toFixed(0)}%`, note: String(out.breakevenStatus) },
    { label: "Margin of Safety", value: `${mos.toFixed(1)}%`, note: String(out.marginSafetyStatus) },
    { label: "Break-Even Units", value: beUnits.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
    { label: "Break-Even Revenue", value: fmt(out.breakEvenRevenue) },
    { label: "Health Score", value: ins?.healthScore != null ? `${ins.healthScore}/100` : "—" },
  ]);

  const ragRow = `<div style="display:flex;flex-wrap:wrap;gap:10px;margin:12px 0">
    <span>Contribution: ${ragBadge(String(out.contributionStatus))}</span>
    <span>Net Profit: ${ragBadge(String(out.netProfitStatus))}</span>
    <span>Break-Even: ${ragBadge(String(out.breakevenStatus))}</span>
    <span>Margin of Safety: ${ragBadge(String(out.marginSafetyStatus))}</span>
  </div>`;

  return wrapAnalysis(
    section("Executive Summary", exec) +
    section("Complete Results Breakdown", results + ragRow) +
    section("Deep Dive", `<ul style="margin:0;padding-left:18px">${(ins?.guidance ?? []).map(bullet).join("")}</ul>`) +
    section("Scenario Analysis", scenarioTable(["Lever", "Change", "Est. Net Profit"], [
      ["Base", "—", fmt(netProfit)],
      ["Price +10%", fmt(revenue * 1.1), fmt(netProfit + revenue * 0.1 * (gm / 100))],
      ["Volume +20%", fmt(revenue * 1.2), fmt(netProfit + revenue * 0.2 * (gm / 100))],
      ["Fixed costs −15%", "—", fmt(netProfit + num(out.monthlyFixedCosts) * 0.15)],
    ])) +
    section("Risk Flags", netProfit < 0 ? `<ul style="margin:0;padding-left:18px">${bullet("Negative net profit — business is not viable at current volume without changes.")}</ul>` : callout("ok", "Viable", "Core metrics support continued operations.")) +
    standardRoadmap({
      d30: ["Address all RED RAG metrics first.", "Validate unit economics with Costing Model.", "Set monthly volume target above break-even + 20% MOS."],
      d60: ["Convert AMBER metrics to GREEN.", "Test 2 pricing/packaging experiments.", "Build 6-month viability tracker."],
      d90: ["Investor narrative: path to sustainable margins.", "Integrate with Pitch Deck KPIs.", "Quarterly viability review cadence."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">${bullet("Best single-page viability check before fundraising.")}</ul>`)
  );
}

// ── UNIT ECONOMICS ─────────────────────────────────────────────────────────────

function analyzeUnitEconomics(out: Record<string, unknown>): string {
  const md = getMonthlyData(out);
  const status = out.status as { month?: string; rag?: string; insights?: { guidance?: string[] } }[] | undefined;
  const last = md ? lastMonthData(md) : null;
  const lastStatus = Array.isArray(status) && status.length ? status[status.length - 1] : null;

  const cac = last ? num(last["CAC"]) : 0;
  const ltv = last ? num(last["LTV"]) : 0;
  const ratio = cac > 0 ? ltv / cac : 0;
  const churn = last ? num(last["Churn Rate %"]) : 0;
  const arpu = last ? num(last["ARPU"]) : 0;
  const payback = last ? num(last["CAC Payback (months)"]) : 0;
  const growth = last ? num(last["Growth Rate %"]) : 0;

  const exec = p(`<strong>Executive summary:</strong> Latest unit economics: CAC <strong>${fmt(cac)}</strong>, LTV <strong>${fmt(ltv)}</strong>, LTV/CAC <strong>${ratio.toFixed(1)}x</strong>. Churn: <strong>${churn.toFixed(1)}%</strong>/month, ARPU: <strong>${fmt(arpu)}</strong>, payback: <strong>${payback.toFixed(1)} months</strong>. Growth: <strong>${growth.toFixed(1)}%</strong>. Status: <strong>${lastStatus?.rag ?? "—"}</strong>.`);

  const results = metricTable([
    { label: "CAC", value: fmt(cac) },
    { label: "LTV", value: fmt(ltv) },
    { label: "LTV / CAC", value: ratio.toFixed(1) + "x", note: ratio >= 3 ? "Excellent" : ratio >= 1 ? "Marginal" : "Broken" },
    { label: "ARPU", value: fmt(arpu) },
    { label: "Churn Rate %", value: churn.toFixed(1) + "%" },
    { label: "CAC Payback (Months)", value: payback.toFixed(1) },
    { label: "Growth Rate %", value: growth.toFixed(1) + "%" },
    { label: "RAG Status", value: lastStatus?.rag ?? "—" },
  ]);

  const risks: string[] = [];
  if (ratio < 1) risks.push("LTV/CAC below 1x — losing money on every customer acquired.");
  else if (ratio < 3) risks.push("LTV/CAC below 3x — investors typically expect 3x+ for efficient scaling.");
  if (churn > 10) risks.push("High churn (>10%) — LTV calculations may be optimistic; focus on retention.");
  if (payback > 18) risks.push("CAC payback over 18 months — capital-intensive growth.");

  let trendNote = "";
  if (md) {
    const cacTrend = trendAcrossMonths(md, "CAC");
    const ltvTrend = trendAcrossMonths(md, "LTV");
    trendNote = `<ul style="margin:0;padding-left:18px">
      ${bullet(`CAC trend: ${cacTrend.change <= 0 ? "improved" : "worsened"} by ${fmt(Math.abs(cacTrend.change))} over period.`)}
      ${bullet(`LTV trend: ${ltvTrend.change >= 0 ? "up" : "down"} ${fmt(Math.abs(ltvTrend.change))}.`)}
    </ul>`;
  }

  return wrapAnalysis(
    section("Executive Summary", exec) +
    section("Complete Results Breakdown", results) +
    section("Deep Dive", trendNote + `<ul style="margin:8px 0 0 18px">${(lastStatus?.insights?.guidance ?? []).slice(0, 5).map(bullet).join("")}</ul>`) +
    section("Scenario Analysis", scenarioTable(["Scenario", "LTV/CAC"], [
      ["Base", ratio.toFixed(1) + "x"],
      ["Reduce CAC 20%", cac > 0 ? (ltv / (cac * 0.8)).toFixed(1) + "x" : "—"],
      ["Improve retention (−30% churn)", "~" + (ratio * 1.3).toFixed(1) + "x"],
      ["Increase ARPU 15%", cac > 0 ? ((ltv * 1.15) / cac).toFixed(1) + "x" : "—"],
    ])) +
    section("Risk Flags", risks.length ? `<ul style="margin:0;padding-left:18px">${risks.map(bullet).join("")}</ul>` : callout("ok", "Strong unit economics", "Metrics support scalable acquisition.")) +
    standardRoadmap({
      d30: ["Segment CAC by channel; kill worst performers.", "Launch retention cohort analysis.", "Set LTV/CAC target ≥3x."],
      d60: ["Optimize onboarding to reduce early churn.", "Test pricing for ARPU uplift.", "Report unit economics in weekly growth meeting."],
      d90: ["Sync with Pitch Deck KPIs for investor deck.", "Model CAC at 2x spend for fundraise.", "Build cohort-based LTV model."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">${bullet("Core metric set for SaaS/subscription investor conversations.")}</ul>`)
  );
}

// ── PITCH DECK KPIs ────────────────────────────────────────────────────────────

function analyzePitchdeck(out: Record<string, unknown>): string {
  const revenue = num(out.grossMonthlyRevenue);
  const gm = num(out.grossMargin);
  const cac = num(out.cac);
  const ltv = num(out.ltv);
  const ratio = num(out.ltvCacRatio);
  const runway = num(out.runwayMonths);
  const burn = num(out.netBurn);
  const burnMult = num(out.burnMultiple);
  const recurring = num(out.recurringRevenueRatio);
  const ins = out.insights as { investorReadiness?: string; healthScore?: number; guidance?: string[] } | undefined;
  const summary = out.summary as { isUnitEconomicsPositive?: boolean; isCACRecoverable?: boolean; isBurnControlled?: boolean; canScaleImproveMargins?: boolean } | undefined;

  const exec = p(`<strong>Executive summary:</strong> Investor KPI snapshot: <strong>${fmt(revenue)}</strong> monthly revenue, <strong>${pctVal(gm)}</strong> gross margin, LTV/CAC <strong>${ratio.toFixed(1)}x</strong>, <strong>${runway.toFixed(1)} months</strong> runway, burn multiple <strong>${burnMult.toFixed(1)}x</strong>. Recurring revenue ratio: <strong>${pctVal(recurring)}</strong>. Investor readiness: <strong>${ins?.investorReadiness ?? "—"}</strong>.`);

  const results = metricTable([
    { label: "Gross Margin", value: pctVal(gm), note: String(out.grossMarginStatus) },
    { label: "LTV / CAC", value: ratio.toFixed(1) + "x", note: String(out.ltvCacStatus) },
    { label: "Runway (Months)", value: runway.toFixed(1), note: String(out.runwayStatus) },
    { label: "Recurring Revenue Ratio", value: pctVal(recurring), note: String(out.recurringRatioStatus) },
    { label: "Net Burn / Month", value: fmt(burn), note: String(out.burnStatus) },
    { label: "Burn Multiple", value: burnMult.toFixed(1) + "x" },
    { label: "CAC Payback (Months)", value: num(out.cacPaybackMonths).toFixed(1) },
    { label: "Contribution (Post-CAC)", value: pctVal(num(out.contributionMarginAfterCAC)) },
    { label: "Health Score", value: ins?.healthScore != null ? `${ins.healthScore}/100` : "—" },
  ]);

  const flags = summary ? `<div style="margin:12px 0;font-size:12px">
    ${summary.isUnitEconomicsPositive ? callout("ok", "Unit Economics", "Positive unit economics.") : callout("risk", "Unit Economics", "Unit economics need improvement.")}
    ${summary.isCACRecoverable ? callout("ok", "CAC Recoverable", "CAC is recoverable within acceptable payback.") : callout("warn", "CAC", "CAC recovery is slow — address before scaling spend.")}
    ${summary.isBurnControlled ? callout("ok", "Burn", "Burn is controlled relative to growth.") : callout("warn", "Burn", "Burn may be elevated — show efficiency plan.")}
  </div>` : "";

  return wrapAnalysis(
    section("Executive Summary", exec) +
    section("Complete Results Breakdown", results + flags) +
    section("Deep Dive", `<ul style="margin:0;padding-left:18px">${(ins?.guidance ?? []).map(bullet).join("")}</ul>`) +
    section("Scenario Analysis", scenarioTable(["Investor Question", "Your Number", "Benchmark"], [
      ["LTV/CAC", ratio.toFixed(1) + "x", "≥3x"],
      ["Gross Margin", pctVal(gm), "≥60% (SaaS)"],
      ["Runway", runway.toFixed(0) + " mo", "≥18 mo pre-Series A"],
      ["Burn Multiple", burnMult.toFixed(1) + "x", "<2x efficient"],
    ])) +
    section("Risk Flags", ratio < 3 || runway < 12 ? `<ul style="margin:0;padding-left:18px">
      ${ratio < 3 ? bullet("LTV/CAC below 3x — prepare narrative on improvement path.") : ""}
      ${runway < 12 ? bullet("Runway under 12 months — address in deck with raise timeline.") : ""}
    </ul>` : callout("ok", "Deck-ready", "Key KPIs align with typical investor expectations.")) +
    standardRoadmap({
      d30: ["Fix RED RAG metrics before investor meetings.", "Prepare one-slide KPI dashboard.", "Document assumptions behind LTV/CAC."],
      d60: ["Run mock investor Q&A on each KPI.", "Add cohort charts to appendix.", "Align with Cap Table for ownership story."],
      d90: ["Finalize pitch deck KPI slide from this model.", "Update monthly before each fundraise touchpoint.", "Cross-check with DCF for valuation consistency."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">${bullet("Primary export for investor pitch KPI slide and data room summary.")}</ul>`)
  );
}

// ── DCF VALUATION ──────────────────────────────────────────────────────────────

function analyzeDCF(out: Record<string, unknown>, inp: Record<string, unknown>): string {
  const wacc = (out.wacc ?? {}) as Record<string, number>;
  const years = out.years as { year: string; revenue: number; fcff: number; pvOfFCFF: number }[] | undefined;
  const ev = num(out.enterpriseValue);
  const equity = num(out.equityValue);
  const tv = num(out.terminalValue);
  const pvTv = num(out.pvOfTerminalValue);
  const totalPv = num(out.totalPVofFCFF);
  const waccRate = num(wacc.wacc);

  const exec = p(`<strong>Executive summary:</strong> DCF yields enterprise value of <strong>${fmt(ev)}</strong> and equity value of <strong>${fmt(equity)}</strong> at WACC <strong>${pctVal(waccRate)}</strong>. PV of explicit FCFF (5yr): <strong>${fmt(totalPv)}</strong>; terminal value PV: <strong>${fmt(pvTv)}</strong> (${ev > 0 ? pct(pvTv, ev) : "0%"} of EV). Cost of equity: <strong>${pctVal(num(wacc.costOfEquity))}</strong>, after-tax cost of debt: <strong>${pctVal(num(wacc.afterTaxCostOfDebt))}</strong>.`);

  const results = metricTable([
    { label: "WACC", value: pctVal(waccRate) },
    { label: "Cost of Equity (Ke)", value: pctVal(num(wacc.costOfEquity)) },
    { label: "Equity Weight", value: pctVal(num(wacc.equityWeight)) },
    { label: "Debt Weight", value: pctVal(num(wacc.debtWeight)) },
    { label: "Total PV of FCFF (5yr)", value: fmt(totalPv) },
    { label: "Terminal Value (undiscounted)", value: fmt(tv) },
    { label: "PV of Terminal Value", value: fmt(pvTv) },
    { label: "Enterprise Value", value: fmt(ev) },
    { label: "Equity Value", value: fmt(equity) },
    { label: "Value Per Share", value: fmt(out.valuePerShare) },
  ]);

  let yearTable = "";
  if (Array.isArray(years) && years.length) {
    yearTable = scenarioTable(
      ["Year", "Revenue", "FCFF", "PV of FCFF"],
      years.map((y) => [y.year, fmt(y.revenue), fmt(y.fcff), fmt(y.pvOfFCFF)])
    );
  }

  const risks: string[] = [];
  if (pvTv / (ev || 1) > 0.75) risks.push("Terminal value dominates (>75% of EV) — small changes in terminal growth or WACC swing valuation significantly.");
  if (num(inp.beta) < 0.5) risks.push("Very low beta — verify against comparable companies.");
  if (equity <= 0) risks.push("Negative equity value — debt may exceed enterprise value.");

  return wrapAnalysis(
    section("Executive Summary", exec) +
    section("Complete Results Breakdown", results) +
    section("5-Year FCFF Projection", yearTable || p("Re-run calculation to include year-by-year detail.")) +
    section("Deep Dive", `<ul style="margin:0;padding-left:18px">
      ${bullet("Sensitivity: ±1% WACC typically moves EV 10–15% for growth companies.")}
      ${bullet("Cross-check equity value against last round post-money and public comps.")}
      ${bullet("Document terminal growth rate assumption — investors will stress-test.")}
    </ul>`) +
    section("Scenario Analysis", scenarioTable(["Scenario", "WACC", "Est. EV Impact"], [
      ["Base", pctVal(waccRate), fmt(ev)],
      ["WACC +1%", pctVal(waccRate + 0.01), fmt(ev * 0.88)],
      ["WACC −1%", pctVal(waccRate - 0.01), fmt(ev * 1.12)],
      ["Terminal growth +0.5%", "—", fmt(ev * 1.08)],
    ])) +
    section("Risk Flags", risks.length ? `<ul style="margin:0;padding-left:18px">${risks.map(bullet).join("")}</ul>` : callout("info", "Model assumptions", "Validate all inputs with advisors before term sheet negotiations.")) +
    standardRoadmap({
      d30: ["Sanity-check revenue growth vs historical.", "Benchmark WACC components to comps.", "Run sensitivity table (WACC × terminal growth)."],
      d60: ["Align with Cap Table implied ownership value.", "Prepare valuation range (bear/base/bull).", "Document FCFF bridge from EBITDA."],
      d90: ["Include in data room with assumption appendix.", "Reconcile with Pitch Deck KPIs growth story.", "Update quarterly or at each funding round."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">${bullet("Pair with Cap Table for per-share and dilution analysis.")}</ul>`)
  );
}

// ── FUNDING MODEL ──────────────────────────────────────────────────────────────

function analyzeFunding(out: Record<string, unknown>, inp: Record<string, unknown>): string {
  const summary = (out.summary ?? out) as Record<string, unknown>;
  const md = getMonthlyData(out);

  const maxDeficit = num(summary.maxCashDeficit);
  const fundingReq = num(summary.fundingRequired);
  const contingency = num(summary.contingency);
  const totalFunding = num(summary.totalFunding);
  const openingCash = num(summary.openingCash) || num(inp.openingCash);
  const finalCash = num(summary.finalCash);
  const contingencyPct = num(summary.contingencyPct) || num(inp.contingencyPct);
  const avgCCC = num(summary.avgCashConversionCycle);

  const exec = p(`<strong>Executive summary:</strong> Maximum cash deficit of <strong>${fmt(maxDeficit)}</strong> requires base funding of <strong>${fmt(fundingReq)}</strong>. With <strong>${contingencyPct}%</strong> contingency (${fmt(contingency)}), total recommended raise: <strong>${fmt(totalFunding)}</strong>. Opening cash: <strong>${fmt(openingCash)}</strong>; projected final cash: <strong>${fmt(finalCash)}</strong>. Avg cash conversion cycle: <strong>${avgCCC.toFixed(0)} days</strong>.`);

  const results = metricTable([
    { label: "Max Cash Deficit", value: fmt(maxDeficit), note: "Lowest cumulative cash" },
    { label: "Funding Required", value: fmt(fundingReq) },
    { label: "Contingency", value: fmt(contingency), note: `${contingencyPct}% buffer` },
    { label: "Total Funding Recommended", value: fmt(totalFunding) },
    { label: "Opening Cash", value: fmt(openingCash) },
    { label: "Final Cash (Projected)", value: fmt(finalCash) },
    { label: "Total Revenue (Period)", value: fmt(summary.totalRevenue) },
    { label: "Total EBITDA (Period)", value: fmt(summary.totalEBITDA) },
    { label: "Avg Cash Conversion Cycle", value: avgCCC.toFixed(0) + " days" },
    { label: "Avg Receivable Days", value: num(summary.avgReceivableDays).toFixed(0) + " days" },
    { label: "Avg Payable Days", value: num(summary.avgPayableDays).toFixed(0) + " days" },
  ]);

  const risks: string[] = [];
  if (maxDeficit < -openingCash) risks.push("Deficit exceeds opening cash — operations require external funding before month-end.");
  if (contingencyPct < 15) risks.push("Contingency below 15% — consider higher buffer for execution risk.");
  if (avgCCC > 90) risks.push("Long cash conversion cycle — working capital will consume cash faster.");

  return wrapAnalysis(
    section("Executive Summary", exec) +
    section("Complete Results Breakdown", results) +
    section("Deep Dive", `<ul style="margin:0;padding-left:18px">
      ${bullet("Map total funding to 18–24 month runway plus milestone buffer.")}
      ${bullet("Use of funds should tie each ₹/$ to hiring, product, or GTM milestones.")}
      ${md ? bullet(`${monthKeys(md).length} months modelled — review month of max deficit for timing.`) : bullet("Re-run with full monthly data for deficit timing.")}
    </ul>`) +
    section("Scenario Analysis", scenarioTable(["Scenario", "Total Funding"], [
      ["Base", fmt(totalFunding)],
      ["+25% contingency", fmt(fundingReq * 1.25 + contingency)],
      ["Revenue 20% below plan", fmt(totalFunding * 1.2)],
      ["CCC improves 15 days", fmt(totalFunding * 0.95)],
    ])) +
    section("Risk Flags", risks.length ? `<ul style="margin:0;padding-left:18px">${risks.map(bullet).join("")}</ul>` : callout("ok", "Funding sized", "Raise amount covers projected deficit with contingency.")) +
    standardRoadmap({
      d30: ["Validate monthly inputs vs actuals.", "Identify month of max deficit for raise timing.", "Draft use-of-funds table."],
      d60: ["Align raise with Cap Table dilution model.", "Prepare 18-month cash milestone map.", "Stress-test revenue 15% below plan."],
      d90: ["Finalize term sheet ask from total funding.", "Integrate with Pitch Deck runway slide.", "Board approval on funding strategy."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">
      ${bullet("Link to Cap Table for ownership impact of raise.")}
      ${bullet("Cross-check with Burn & Runway for consistency.")}
    </ul>`)
  );
}

// ── CAP TABLE ───────────────────────────────────────────────────────────────────

function analyzeCapTable(out: Record<string, unknown>, inp: Record<string, unknown>): string {
  const exitValue = num(out.exitValue) || num(inp.exitValue);
  const ownership = out.ownership as Record<string, number> | undefined;
  const waterfall = out.waterfall as Record<string, { ownershipPct?: number; payout?: number }> | undefined;
  const totalShares = num(out.totalShares);

  const owners = ownership ? Object.entries(ownership) : [];
  const founderPct = owners.filter(([k]) => /founder|promoter|founders/i.test(k)).reduce((s, [, v]) => s + num(v), 0);
  const investorPct = 1 - founderPct;

  const exec = p(`<strong>Executive summary:</strong> At an exit value of <strong>${fmt(exitValue)}</strong>, ${owners.length} stakeholder(s) participate in the waterfall. ${founderPct > 0 ? `Founders hold approximately <strong>${pctVal(founderPct)}</strong> (${fmt(exitValue * founderPct)} payout).` : ""} ${totalShares > 0 ? `Total shares: <strong>${totalShares.toLocaleString()}</strong>.` : ""}`);

  const ownerRows = owners.map(([name, pctOwn]) => ({
    label: name,
    value: pctVal(num(pctOwn)),
    note: fmt(exitValue * num(pctOwn)),
  }));

  const payoutRows = waterfall
    ? Object.entries(waterfall).map(([name, w]) => ({
        label: `${name} (payout)`,
        value: fmt(w.payout),
        note: w.ownershipPct != null ? `${w.ownershipPct}%` : "",
      }))
    : ownerRows.map((r) => ({ label: r.label + " payout", value: r.note ?? "—" }));

  const results = metricTable([
    { label: "Exit Value", value: fmt(exitValue) },
    { label: "Total Shares", value: totalShares > 0 ? totalShares.toLocaleString() : "—" },
    { label: "Founder Ownership (est.)", value: founderPct > 0 ? pctVal(founderPct) : "—" },
    { label: "Investor Ownership (est.)", value: investorPct > 0 ? pctVal(investorPct) : "—" },
    ...payoutRows.slice(0, 6),
  ]);

  const risks: string[] = [];
  if (founderPct > 0 && founderPct < 0.3) risks.push("Founders below 30% at exit — ensure incentive alignment and vesting clarity.");
  if (founderPct > 0.7) risks.push("Founders retain >70% — verify investor rounds are reflected in inputs.");
  if (!waterfall && !ownership) risks.push("Limited ownership data — re-run exit simulation for full waterfall.");

  return wrapAnalysis(
    section("Executive Summary", exec) +
    section("Complete Results Breakdown", results) +
    section("Deep Dive", `<ul style="margin:0;padding-left:18px">
      ${bullet("Founders should target >50% through Series A and >30% at meaningful exit.")}
      ${bullet("Each round's pre-money, investment, and option pool expand should be documented.")}
      ${bullet("Compare payout multiples vs invested capital for each investor class.")}
    </ul>`) +
    section("Scenario Analysis", scenarioTable(["Exit Value", "Founder Payout (est.)"], [
      [fmt(exitValue * 0.5), fmt(exitValue * 0.5 * founderPct)],
      [fmt(exitValue), fmt(exitValue * founderPct)],
      [fmt(exitValue * 2), fmt(exitValue * 2 * founderPct)],
      [fmt(exitValue * 5), fmt(exitValue * 5 * founderPct)],
    ])) +
    section("Risk Flags", risks.length ? `<ul style="margin:0;padding-left:18px">${risks.map(bullet).join("")}</ul>` : callout("info", "Cap table hygiene", "Keep cap table updated after every SAFE, note, or equity round.")) +
    standardRoadmap({
      d30: ["Audit all rounds for correct pre/post money.", "Model option pool refresh for next round.", "Export ownership for data room."],
      d60: ["Run exit scenarios at 1x, 3x, 5x last valuation.", "Align with DCF equity value.", "Legal review of shareholder agreements."],
      d90: ["Update cap table within 48h of any closing.", "Prepare waterfall for term sheet negotiations.", "Integrate with Pitch Deck ownership slide."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">${bullet("Essential for fundraise dilution and exit planning.")}</ul>`)
  );
}

// ── Public exports ─────────────────────────────────────────────────────────────

export function generateStandaloneModelAnalysis(calc: CalculationExport): string {
  const slug = calc.modelSlug;
  const out = calc.outputs as Record<string, unknown>;
  const inp = calc.inputs as Record<string, unknown>;

  if (slug === "income-statement") return analyzeIncomeStatement(out, inp);
  if (slug === "balance-sheet") return analyzeBalanceSheet(out);
  if (slug === "burn-runway") return analyzeBurnRunway(out, inp);
  if (slug === "break-even") return analyzeBreakEvenStandalone(out, inp);
  if (slug === "cashflow-ops") return analyzeCashflowOps(out, inp);
  if (slug === "consolidated-cfo") return analyzeConsolidatedCFO(out, inp);
  if (slug === "viability-dashboard") return analyzeViability(out);
  if (slug === "unit-economics") return analyzeUnitEconomics(out);
  if (slug === "pitchdeck-kpis") return analyzePitchdeck(out);
  if (slug === "dcf-valuation") return analyzeDCF(out, inp);
  if (slug === "funding-model") return analyzeFunding(out, inp);
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
    return [
      { label: "Net Burn", value: fmt(last?.["Net Burn"]) },
      { label: "Runway", value: `${num(last?.["Runway (months)"]).toFixed(1)} mo` },
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
