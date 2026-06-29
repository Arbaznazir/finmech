import type { CalculationExport } from "@/lib/calculation-pdf";
import {
  STANDARD_ACCENT,
  fmt,
  num,
  pct,
  pctVal,
  p,
  bullet,
  section,
  callout,
  metricTable,
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

export const STANDARD_MODEL_SLUGS = new Set([
  "std-common-utility",
  "std-break-even",
  "std-burn-runway",
  "std-unit-economics",
  "std-cap-table",
  "std-business-snapshot",
  "std-movements",
]);

type Row = { label: string; value: string };

const hubNote = `<p style="font-size:11px;color:#888;margin:8px 0;font-style:italic">Standard tier: this model integrates with Common Utility — keep the hub updated for linked fields.</p>`;

// ── COMMON UTILITY (Income Statement Hub) ────────────────────────────────────

function analyzeCommonUtility(out: Record<string, unknown>): string {
  const md = getMonthlyData(out);
  const annual = getAnnual(out) ?? {};
  const derived = (out.derived ?? {}) as Record<string, number>;
  const months = md ? monthKeys(md) : [];
  const last = md ? lastMonthData(md) : null;

  const revenue = num(annual["Gross Revenue"]) || (last ? num(last["Gross Revenue"]) : 0);
  const ebitda = num(annual["EBITDA"]) || (last ? num(last["EBITDA"]) : 0);
  const netProfit = num(annual["Net Profit"]) || (last ? num(last["Net Profit"]) : 0);
  const gm = num(derived.grossMarginAnnual) || num(annual["Gross Margin %"]);
  const em = num(derived.ebitdaMarginAnnual) || num(annual["EBITDA Margin %"]);
  const nm = num(derived.netMarginAnnual) || num(annual["Net Margin %"]);
  const fixedCosts = num(annual["Total Fixed Costs"]) || (last ? num(last["Total Fixed Costs"]) : 0);
  const varCosts = num(annual["Total variable Costs"]) || (last ? num(last["Total variable Costs"]) : 0);

  const exec = p(`<strong>Executive summary:</strong> Common Utility P&amp;L hub across ${months.length || num(Array.isArray(out.monthsAdded) ? out.monthsAdded.length : 0)} month(s): <strong>${fmt(revenue)}</strong> annual gross revenue, <strong>${fmt(ebitda)}</strong> EBITDA (${em.toFixed(1)}%), <strong>${fmt(netProfit)}</strong> net profit (${nm.toFixed(1)}%). This hub feeds Break-even, Burn &amp; Runway, Unit Economics, Movements, Cap Table, and Business Snapshot.`);

  const results = metricTable([
    { label: "Annual Gross Revenue", value: fmt(revenue), note: "Feeds all Standard models" },
    { label: "Gross Margin", value: `${gm.toFixed(1)}%` },
    { label: "EBITDA", value: fmt(ebitda), note: `${em.toFixed(1)}% margin` },
    { label: "Net Profit (PAT)", value: fmt(netProfit), note: `${nm.toFixed(1)}% margin` },
    { label: "Total Fixed Costs", value: fmt(fixedCosts), note: "→ Burn & Break-even" },
    { label: "Total Variable Costs", value: fmt(varCosts), note: "→ Burn & Break-even" },
    { label: "Marketing Spend (Annual)", value: fmt(annual["Marketing & Advertising"]) },
    { label: "Salaries (Annual)", value: fmt(annual["Salaries & Benefits"]) },
  ], STANDARD_ACCENT);

  const st = out.status as { overall?: string; guidance?: string[] } | undefined;
  const deep = (st?.guidance ?? []).slice(0, 5);

  return wrapAnalysis(
    section("Executive Summary", exec + hubNote, STANDARD_ACCENT) +
    section("Complete Results Breakdown", results, STANDARD_ACCENT) +
    section("Deep Dive", `<ul style="margin:0;padding-left:18px">${deep.map(bullet).join("") || bullet("Complete all 12 months for full fiscal-year accuracy across linked models.")}</ul>`, STANDARD_ACCENT) +
    section("Scenario Analysis", scenarioTable(["Scenario", "Est. Net Profit"], [
      ["Base", fmt(netProfit)],
      ["Revenue +10%", fmt(netProfit + revenue * 0.1 * (gm / 100))],
      ["Fixed costs −10%", fmt(netProfit + fixedCosts * 0.1)],
      ["Gross margin +5 pts", fmt(netProfit + revenue * 0.05)],
    ], STANDARD_ACCENT), STANDARD_ACCENT) +
    section("Risk Flags", netProfit < 0 ? `<ul style="margin:0;padding-left:18px">${bullet("Hub shows losses — downstream Burn & Snapshot models will flag critical status.")}</ul>` : callout("ok", "Hub healthy", "P&amp;L supports linked Standard model chain."), STANDARD_ACCENT) +
    standardRoadmap({
      d30: ["Close monthly P&amp;L in Common Utility first.", "Verify revenue/COGS tie to bank.", "Re-sync linked models after hub update."],
      d60: ["Complete Q1–Q2 months for trend visibility.", "Benchmark margins vs industry.", "Export hub summary for board."],
      d90: ["Full 12-month fiscal year in hub.", "Run Business Snapshot with all links.", "Prepare Standard tier investor pack."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">
      ${bullet("Single source of truth — update here before any linked model.")}
      ${bullet("Fixed/variable split drives Burn & Break-even auto-fill.")}
      ${bullet("Revenue & marketing feed Unit Economics CAC/LTV.")}
    </ul>`, STANDARD_ACCENT),
    STANDARD_ACCENT
  );
}

// ── STD BREAK-EVEN (Monthly) ───────────────────────────────────────────────────

function analyzeStdBreakEven(out: Record<string, unknown>): string {
  const md = getMonthlyData(out);
  const annual = (out.annual ?? {}) as Record<string, number>;
  const months = md ? monthKeys(md) : [];
  const last = md ? lastMonthData(md) : null;

  const beUnits = last ? num(last["breakEvenUnits"]) : 0;
  const beRev = last ? num(last["breakEvenRevenue"]) : 0;
  const contrib = last ? num(last["contributionPerUnit"]) : 0;
  const profit = last ? num(last["profitAtUnits"]) : 0;
  const units = last ? num(last["unitsSoldForProjection"]) : 0;
  const utilisation = beUnits > 0 && Number.isFinite(beUnits) ? (units / beUnits) * 100 : 0;
  const greenMonths = months.filter((m) => md && String((md[m] as Record<string, unknown>)?.status) === "GREEN").length;
  const redMonths = months.filter((m) => md && String((md[m] as Record<string, unknown>)?.status) === "RED").length;

  const exec = p(`<strong>Executive summary:</strong> Month-by-month break-even across ${months.length} period(s). Latest month: BE at <strong>${Number.isFinite(beUnits) ? beUnits.toLocaleString() : "—"} units</strong> (${fmt(beRev)}), contribution <strong>${fmt(contrib)}/unit</strong>, projected profit <strong>${fmt(profit)}</strong> at ${units.toLocaleString()} units. Annual rollup: <strong>${fmt(annual.totalRevenue)}</strong> revenue, <strong>${fmt(annual.totalProfit)}</strong> profit. ${greenMonths}/${months.length} months profitable.`);

  const results = metricTable([
    { label: "Latest Break-Even Units", value: Number.isFinite(beUnits) ? beUnits.toLocaleString() : "—" },
    { label: "Latest Break-Even Revenue", value: fmt(beRev) },
    { label: "Contribution / Unit", value: fmt(contrib) },
    { label: "Units (Projection)", value: units.toLocaleString() },
    { label: "BE Utilisation", value: `${utilisation.toFixed(0)}%` },
    { label: "Profitable Months", value: `${greenMonths} GREEN / ${redMonths} RED` },
    { label: "Annual Total Revenue", value: fmt(annual.totalRevenue) },
    { label: "Annual Total Profit", value: fmt(annual.totalProfit) },
    { label: "Annual Fixed Costs", value: fmt(annual.totalFixedCosts) },
  ], STANDARD_ACCENT);

  let monthStatus = "";
  if (months.length) {
    monthStatus = `<div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0">${months.map((m) => {
      const st = md ? String((md[m] as Record<string, unknown>)?.status ?? "—") : "—";
      return `<span>${m}: ${ragBadge(st)}</span>`;
    }).join("")}</div>`;
  }

  const risks: string[] = [];
  if (redMonths > greenMonths) risks.push("Majority of months are loss-making at projected volume — raise units, price, or cut fixed costs.");
  if (contrib <= 0) risks.push("Zero/negative contribution per unit — pricing or variable cost fix required before any volume helps.");
  if (utilisation > 100 && profit < 0) risks.push("Above break-even units but still showing loss — verify fixed cost inputs.");

  return wrapAnalysis(
    section("Executive Summary", exec + hubNote, STANDARD_ACCENT) +
    section("Complete Results Breakdown", results + monthStatus, STANDARD_ACCENT) +
    section("Deep Dive", `<ul style="margin:0;padding-left:18px">
      ${bullet("Fixed costs auto-fill from Common Utility — override per month if needed.")}
      ${bullet("Compare BE units month-over-month for seasonality.")}
      ${bullet("Use projection table per month to find minimum viable volume.")}
    </ul>`, STANDARD_ACCENT) +
    section("Scenario Analysis", scenarioTable(["Lever", "Impact on Latest Profit"], [
      ["Base", fmt(profit)],
      ["+10% price", fmt(profit + units * (last ? num(last["pricePerUnit"]) : 0) * 0.1)],
      ["+20% units", fmt(profit + units * 0.2 * contrib)],
      ["−15% fixed costs", fmt(profit + (last ? num(last["fixedCostMonthly"]) : 0) * 0.15)],
    ], STANDARD_ACCENT), STANDARD_ACCENT) +
    section("Risk Flags", risks.length ? `<ul style="margin:0;padding-left:18px">${risks.map(bullet).join("")}</ul>` : callout("ok", "On track", "Most months show profitable projections."), STANDARD_ACCENT) +
    standardRoadmap({
      d30: ["Fix all RED months to GREEN.", "Validate fixed costs vs Common Utility.", "Set monthly volume targets above BE."],
      d60: ["Seasonal BE plan for full fiscal year.", "Link to Business Snapshot.", "Test 3 pricing scenarios."],
      d90: ["Investor narrative: path to monthly profitability.", "Integrate with Burn & Runway cash view.", "Quarterly BE review cadence."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">${bullet("Receives fixed costs from Common Utility hub automatically.")}</ul>`, STANDARD_ACCENT),
    STANDARD_ACCENT
  );
}

// ── STD BURN & RUNWAY ──────────────────────────────────────────────────────────

function analyzeStdBurnRunway(out: Record<string, unknown>, inp: Record<string, unknown>): string {
  const md = getMonthlyData(out);
  const openingCash = num(out.openingCash) || num(inp.openingCash);
  const ins = out.insights as { overall?: string; healthScore?: number; runwayTrend?: string; cashOutlook?: string; guidance?: string[] } | undefined;
  const last = md ? lastMonthData(md) : null;
  const months = md ? monthKeys(md) : [];

  const netBurn = last ? num(last["Net Burn"]) : 0;
  const runwayRaw = last ? last["Runway (months)"] : null;
  const runwayInfinite = runwayRaw === null || runwayRaw === undefined || !Number.isFinite(Number(runwayRaw));
  const runway = runwayInfinite ? null : Number(runwayRaw);
  const runwayLabel = runwayInfinite ? "∞" : runway!.toFixed(1);
  const cumCash = last ? num(last["Cumulative Cash"]) : openingCash;
  const recurring = last ? num(last["Recurring Revenue ratio"]) : 0;

  const exec = p(`<strong>Executive summary:</strong> Standard Burn &amp; Runway (fed by Common Utility): opening cash <strong>${fmt(openingCash)}</strong>, latest net burn <strong>${fmt(netBurn)}/mo</strong>, runway <strong>${runwayLabel} months</strong>, cumulative cash <strong>${fmt(cumCash)}</strong>. Recurring revenue ratio: <strong>${pctVal(recurring)}</strong>. Outlook: <strong>${ins?.cashOutlook ?? "—"}</strong>.`);

  const results = metricTable([
    { label: "Opening Cash", value: fmt(openingCash) },
    { label: "Net Burn (Latest)", value: fmt(netBurn) },
    { label: "Runway (Months)", value: runwayLabel, note: runwayInfinite ? "Self-sustaining" : runway! < 6 ? "Critical" : runway! < 12 ? "Watch" : "OK" },
    { label: "Cumulative Cash", value: fmt(cumCash) },
    { label: "Recurring Revenue Ratio", value: pctVal(recurring) },
    { label: "Classification", value: last ? String(last["CLASSIFICATION"]) : "—" },
    { label: "Health Score", value: ins?.healthScore != null ? `${ins.healthScore}/100` : "—" },
    { label: "Months Tracked", value: String(months.length) },
  ], STANDARD_ACCENT);

  const risks: string[] = [];
  if (!runwayInfinite && runway! < 6) risks.push("Critical runway — emergency fundraise or cost cuts required.");
  else if (!runwayInfinite && runway! < 12) risks.push("Under 12 months — begin Standard tier fundraise planning.");
  if (md) {
    const t = trendAcrossMonths(md, "Net Burn");
    if (t.change > 0) risks.push("Net burn increasing — audit expense growth vs hub revenue.");
  }

  return wrapAnalysis(
    section("Executive Summary", exec + hubNote, STANDARD_ACCENT) +
    section("Complete Results Breakdown", results, STANDARD_ACCENT) +
    section("Deep Dive", `<ul style="margin:0;padding-left:18px">${(ins?.guidance ?? []).map(bullet).join("") || bullet("Revenue and costs auto-sync from Common Utility.")}</ul>`, STANDARD_ACCENT) +
    section("Scenario Analysis", scenarioTable(["Scenario", "Runway"], [
      ["Base", runwayInfinite ? "∞" : `${runway!.toFixed(1)} mo`],
      ["Burn −20%", netBurn > 0 ? `${(cumCash / (netBurn * 0.8)).toFixed(1)} mo` : "∞"],
      ["Bridge (+3 mo burn)", runwayInfinite ? "∞" : `${(runway! + 3).toFixed(1)} mo`],
    ], STANDARD_ACCENT), STANDARD_ACCENT) +
    section("Risk Flags", risks.length ? `<ul style="margin:0;padding-left:18px">${risks.map(bullet).join("")}</ul>` : callout("ok", "Adequate runway", "Continue monthly monitoring."), STANDARD_ACCENT) +
    standardRoadmap({
      d30: ["Re-sync from Common Utility after P&amp;L update.", "13-week cash forecast.", "Identify 15% opex levers."],
      d60: ["Feed runway into Business Snapshot.", "Investor outreach if <12 mo.", "Improve recurring revenue ratio."],
      d90: ["Cap table raise sizing.", "Board cash report.", "Link to Movements for WC impact."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">${bullet("Auto-filled from Common Utility fixed/variable/revenue splits.")}</ul>`, STANDARD_ACCENT),
    STANDARD_ACCENT
  );
}

// ── STD UNIT ECONOMICS ─────────────────────────────────────────────────────────

function analyzeStdUnitEconomics(out: Record<string, unknown>): string {
  const md = getMonthlyData(out);
  const status = out.status as { month?: string; rag?: string; insights?: { guidance?: string[] } }[] | undefined;
  const last = md ? lastMonthData(md) : null;
  const lastSt = Array.isArray(status) && status.length ? status[status.length - 1] : null;

  const cac = last ? num(last["CAC"]) : 0;
  const ltv = last ? num(last["LTV"]) : 0;
  const ratio = cac > 0 ? ltv / cac : 0;
  const churn = last ? num(last["Churn Rate %"]) : 0;
  const arpu = last ? num(last["ARPU"]) : 0;
  const payback = last ? num(last["CAC Payback (months)"]) : 0;

  const exec = p(`<strong>Executive summary:</strong> Standard Unit Economics (hub-linked): CAC <strong>${fmt(cac)}</strong>, LTV <strong>${fmt(ltv)}</strong>, LTV/CAC <strong>${ratio.toFixed(1)}x</strong>, churn <strong>${churn.toFixed(1)}%</strong>, payback <strong>${payback.toFixed(1)} mo</strong>. Status: <strong>${lastSt?.rag ?? "—"}</strong>. Sales revenue auto-fills from Common Utility.`);

  const results = metricTable([
    { label: "CAC", value: fmt(cac) },
    { label: "LTV", value: fmt(ltv) },
    { label: "LTV / CAC", value: `${ratio.toFixed(1)}x` },
    { label: "ARPU", value: fmt(arpu) },
    { label: "Churn Rate %", value: `${churn.toFixed(1)}%` },
    { label: "CAC Payback", value: `${payback.toFixed(1)} mo` },
    { label: "Growth Rate %", value: `${num(last?.["Growth Rate %"]).toFixed(1)}%` },
    { label: "RAG", value: lastSt?.rag ?? "—" },
  ], STANDARD_ACCENT);

  const risks: string[] = [];
  if (ratio < 1) risks.push("LTV/CAC below 1x — unsustainable acquisition.");
  else if (ratio < 3) risks.push("Below 3x LTV/CAC — improve before scaling marketing.");
  if (churn > 10) risks.push("High churn — LTV may be overstated.");

  return wrapAnalysis(
    section("Executive Summary", exec + hubNote, STANDARD_ACCENT) +
    section("Complete Results Breakdown", results, STANDARD_ACCENT) +
    section("Deep Dive", `<ul style="margin:0;padding-left:18px">${(lastSt?.insights?.guidance ?? []).slice(0, 5).map(bullet).join("") || bullet("Ensure marketing spend from hub matches CAC inputs.")}</ul>`, STANDARD_ACCENT) +
    section("Scenario Analysis", scenarioTable(["Scenario", "LTV/CAC"], [
      ["Base", `${ratio.toFixed(1)}x`],
      ["CAC −20%", cac > 0 ? `${(ltv / (cac * 0.8)).toFixed(1)}x` : "—"],
      ["LTV +15%", cac > 0 ? `${((ltv * 1.15) / cac).toFixed(1)}x` : "—"],
    ], STANDARD_ACCENT), STANDARD_ACCENT) +
    section("Risk Flags", risks.length ? `<ul style="margin:0;padding-left:18px">${risks.map(bullet).join("")}</ul>` : callout("ok", "Strong UE", "Unit economics support growth."), STANDARD_ACCENT) +
    standardRoadmap({
      d30: ["Reconcile marketing spend with Common Utility.", "Segment CAC by channel.", "Set LTV/CAC ≥3x target."],
      d60: ["Cohort retention analysis.", "Feed into Business Snapshot.", "Optimize payback period."],
      d90: ["Investor-ready UE slide.", "Scale plan tied to CAC efficiency.", "Monthly UE dashboard."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">${bullet("Revenue & marketing auto-fill from Common Utility.")}</ul>`, STANDARD_ACCENT),
    STANDARD_ACCENT
  );
}

// ── STD CAP TABLE ──────────────────────────────────────────────────────────────

function analyzeStdCapTable(out: Record<string, unknown>, inp: Record<string, unknown>): string {
  const shareholders = out.shareholders as { name: string; role: string; shares: number; ownershipPct: number; investment: number }[] | undefined;
  const rounds = out.rounds as { roundName: string; investmentAmount: number; preMoneyValuation: number; postMoneyValuation: number; dilutionPct: number }[] | undefined;
  const exit = out.exit as { exitValue: number; totalShares: number; payouts: { name: string; role: string; ownershipPct: number; payout: number; investment: number; multiple: number | null }[] } | null | undefined;
  const exitValue = num(exit?.exitValue) || num(out.exitValue) || num(inp.exitValue);
  const totalShares = num(out.totalShares) || num(exit?.totalShares);

  const founders = (shareholders ?? []).filter((s) => /founder/i.test(s.role));
  const founderPct = founders.reduce((s, f) => s + num(f.ownershipPct), 0) / 100;
  const founderPayout = exit?.payouts?.filter((p) => /founder/i.test(p.role)).reduce((s, p) => s + num(p.payout), 0) ?? exitValue * founderPct;

  const exec = p(`<strong>Executive summary:</strong> Cap table with <strong>${(shareholders ?? []).length}</strong> shareholder(s), <strong>${(rounds ?? []).length}</strong> funding round(s), <strong>${totalShares.toLocaleString()}</strong> total shares. ${exitValue > 0 ? `At <strong>${fmt(exitValue)}</strong> exit, founders receive ~<strong>${fmt(founderPayout)}</strong> (${pctVal(founderPct)}).` : "Set exit value to model waterfall payouts."}`);

  const results = metricTable([
    { label: "Total Shares", value: totalShares > 0 ? totalShares.toLocaleString() : "—" },
    { label: "Shareholders", value: String((shareholders ?? []).length) },
    { label: "Funding Rounds", value: String((rounds ?? []).length) },
    { label: "Exit Value", value: fmt(exitValue) },
    { label: "Founder Ownership", value: founderPct > 0 ? pctVal(founderPct) : "—" },
    { label: "Founder Exit Payout", value: fmt(founderPayout) },
    ...(rounds ?? []).slice(0, 3).map((r) => ({
      label: `${r.roundName} Dilution`,
      value: `${num(r.dilutionPct).toFixed(1)}%`,
      note: fmt(r.investmentAmount),
    })),
  ], STANDARD_ACCENT);

  let payoutTable = "";
  if (exit?.payouts?.length) {
    payoutTable = scenarioTable(
      ["Stakeholder", "Ownership", "Payout", "Multiple"],
      exit.payouts.map((py) => [
        py.name,
        `${num(py.ownershipPct).toFixed(1)}%`,
        fmt(py.payout),
        py.multiple != null ? `${py.multiple.toFixed(1)}x` : "—",
      ]),
      STANDARD_ACCENT
    );
  }

  return wrapAnalysis(
    section("Executive Summary", exec + hubNote, STANDARD_ACCENT) +
    section("Complete Results Breakdown", results, STANDARD_ACCENT) +
    section("Exit Waterfall", payoutTable || p("Add exit value and recalculate for payout breakdown."), STANDARD_ACCENT) +
    section("Deep Dive", `<ul style="margin:0;padding-left:18px">
      ${bullet("Common Utility revenue context helps size pre-money valuations.")}
      ${bullet("Track dilution per round — target founders >50% through Series A.")}
      ${bullet("Compare investor multiples vs benchmark (3–10x for early stage).")}
    </ul>`, STANDARD_ACCENT) +
    section("Scenario Analysis", scenarioTable(["Exit", "Founder Payout"], [
      [fmt(exitValue * 0.5), fmt(founderPayout * 0.5)],
      [fmt(exitValue), fmt(founderPayout)],
      [fmt(exitValue * 3), fmt(founderPayout * 3)],
    ], STANDARD_ACCENT), STANDARD_ACCENT) +
    section("Risk Flags", founderPct > 0 && founderPct < 0.3 ? `<ul style="margin:0;padding-left:18px">${bullet("Founder ownership below 30% — review incentive alignment.")}</ul>` : callout("info", "Cap table", "Update after every round closing."), STANDARD_ACCENT) +
    standardRoadmap({
      d30: ["Document all SAFEs and notes.", "Model next round dilution.", "Export for data room."],
      d60: ["Exit scenarios at 1x/3x/5x.", "Legal review shareholder agreements.", "Align with Business Snapshot."],
      d90: ["Investor ownership slide.", "409A / valuation sync.", "Quarterly cap table hygiene."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">${bullet("Integrated with Common Utility for revenue-based valuation context.")}</ul>`, STANDARD_ACCENT),
    STANDARD_ACCENT
  );
}

// ── STD BUSINESS SNAPSHOT ──────────────────────────────────────────────────────

function analyzeStdSnapshot(out: Record<string, unknown>, inp: Record<string, unknown>): string {
  const revenue = num(out.monthlyRevenue) || num(inp.monthlyRevenue);
  const gm = num(out.grossMargin) || num(inp.grossMargin);
  const nm = num(out.netMargin) || num(inp.netMargin);
  const cash = num(out.cashBalance) || num(inp.cashBalance);
  const burn = num(out.burnRate) || num(inp.burnRate);
  const ltv = num(out.ltv) || num(inp.ltv);
  const cac = num(out.cac) || num(inp.cac);
  const ratio = num(out.ltcCacRatio) || (cac > 0 ? ltv / cac : 0);
  const runway = num(out.runway) || (burn > 0 ? cash / burn : 0);
  const health = num(out.healthScore);
  const label = String(out.healthLabel ?? "—");
  const wc = num(out.changeInWC) || num(inp.changeInWC);

  const exec = p(`<strong>Executive summary:</strong> Business Snapshot health score: <strong>${health}/100 (${label})</strong>. Revenue <strong>${fmt(revenue)}/mo</strong>, gross margin <strong>${gm.toFixed(1)}%</strong>, net margin <strong>${nm.toFixed(1)}%</strong>. Runway: <strong>${Number.isFinite(runway) ? runway.toFixed(1) : "∞"} months</strong>. LTV/CAC: <strong>${ratio.toFixed(1)}x</strong>. Aggregates data from Common Utility, Burn, Unit Economics, and Movements.`);

  const results = metricTable([
    { label: "Health Score", value: `${health}/100 (${label})` },
    { label: "Monthly Revenue", value: fmt(revenue), note: String(out.revenueStatus) },
    { label: "Gross Margin %", value: `${gm.toFixed(1)}%`, note: String(out.marginStatus) },
    { label: "Net Margin %", value: `${nm.toFixed(1)}%` },
    { label: "Cash Balance", value: fmt(cash) },
    { label: "Monthly Burn", value: fmt(burn) },
    { label: "Runway (Months)", value: Number.isFinite(runway) ? runway.toFixed(1) : "∞", note: String(out.runwayStatus) },
    { label: "LTV / CAC", value: `${ratio.toFixed(1)}x`, note: String(out.ltcCacStatus) },
    { label: "Customers", value: num(inp.totalCustomers).toLocaleString() },
    { label: "Change in WC", value: fmt(wc) },
  ], STANDARD_ACCENT);

  const ragRow = `<div style="display:flex;flex-wrap:wrap;gap:10px;margin:12px 0">
    <span>Revenue: ${ragBadge(String(out.revenueStatus))}</span>
    <span>Margin: ${ragBadge(String(out.marginStatus))}</span>
    <span>Runway: ${ragBadge(String(out.runwayStatus))}</span>
    <span>LTV/CAC: ${ragBadge(String(out.ltcCacStatus))}</span>
  </div>`;

  const insights = out.insights as string[] | undefined;

  return wrapAnalysis(
    section("Executive Summary", exec, STANDARD_ACCENT) +
    section("Complete Results Breakdown", results + ragRow, STANDARD_ACCENT) +
    section("Deep Dive", `<ul style="margin:0;padding-left:18px">${(insights ?? []).map(bullet).join("")}</ul>`, STANDARD_ACCENT) +
    section("Scenario Analysis", scenarioTable(["Metric", "Current", "Target"], [
      ["Health Score", `${health}`, "75+"],
      ["Gross Margin", `${gm.toFixed(0)}%`, "40%+"],
      ["Runway", Number.isFinite(runway) ? `${runway.toFixed(0)} mo` : "∞", "12+ mo"],
      ["LTV/CAC", `${ratio.toFixed(1)}x`, "3x+"],
    ], STANDARD_ACCENT), STANDARD_ACCENT) +
    section("Risk Flags", health < 50 ? callout("risk", "Critical health", "Multiple RED RAG metrics — prioritize fixes in linked models.") : health < 75 ? callout("warn", "Caution", "Some metrics need attention before fundraising.") : callout("ok", "Healthy", "Fundamentals support continued growth."), STANDARD_ACCENT) +
    standardRoadmap({
      d30: ["Refresh all linked Standard models.", "Fix lowest-scoring RAG metric.", "One-page snapshot for team."],
      d60: ["Health score target 75+.", "Board-ready snapshot PDF.", "Benchmark vs peers."],
      d90: ["Monthly snapshot cadence.", "Investor update template.", "Full Standard tier data room."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">${bullet("Top-level view of entire Standard model chain — run after updating hub.")}</ul>`, STANDARD_ACCENT),
    STANDARD_ACCENT
  );
}

// ── STD MOVEMENTS ──────────────────────────────────────────────────────────────

function analyzeStdMovements(out: Record<string, unknown>): string {
  const md = getMonthlyData(out);
  const annual = (out.annual ?? {}) as Record<string, number>;
  const months = md ? monthKeys(md) : [];
  const last = md ? lastMonthData(md) : null;

  const exec = p(`<strong>Executive summary:</strong> Working capital analysis over ${months.length} month(s). Annual: revenue <strong>${fmt(annual.totalRevenue)}</strong>, gross profit <strong>${fmt(annual.totalGrossProfit)}</strong>, CFO <strong>${fmt(annual.totalCFO)}</strong>, FCF <strong>${fmt(annual.totalFCF)}</strong>. Avg cash conversion cycle: <strong>${num(annual.avgCCC).toFixed(0)} days</strong> (DSO ${num(annual.avgDSO).toFixed(0)}, DIO ${num(annual.avgDIO).toFixed(0)}, DPO ${num(annual.avgDPO).toFixed(0)}).`);

  const results = metricTable([
    { label: "Total Revenue", value: fmt(annual.totalRevenue) },
    { label: "Total Gross Profit", value: fmt(annual.totalGrossProfit) },
    { label: "Total Change in WC", value: fmt(annual.totalChangeInWC) },
    { label: "Cash from Operations", value: fmt(annual.totalCFO) },
    { label: "Total CapEx", value: fmt(annual.totalCapEx) },
    { label: "Free Cash Flow", value: fmt(annual.totalFCF) },
    { label: "Avg DSO", value: `${num(annual.avgDSO).toFixed(0)} days` },
    { label: "Avg DIO", value: `${num(annual.avgDIO).toFixed(0)} days` },
    { label: "Avg DPO", value: `${num(annual.avgDPO).toFixed(0)} days` },
    { label: "Avg Cash Conversion Cycle", value: `${num(annual.avgCCC).toFixed(0)} days` },
    { label: "Closing Receivables", value: fmt(annual.closingReceivables) },
    { label: "Closing Inventory", value: fmt(annual.closingInventory) },
    { label: "Closing Payables", value: fmt(annual.closingPayables) },
  ], STANDARD_ACCENT);

  const risks: string[] = [];
  if (num(annual.avgCCC) > 90) risks.push("CCC above 90 days — cash tied up in working capital.");
  if (annual.totalChangeInWC > 0) risks.push("Positive change in WC consumes cash — receivables/inventory growing faster than payables.");
  if (annual.totalFCF < 0) risks.push("Negative FCF — operations and CapEx exceed cash generated.");

  return wrapAnalysis(
    section("Executive Summary", exec + hubNote, STANDARD_ACCENT) +
    section("Complete Results Breakdown", results, STANDARD_ACCENT) +
    section("Deep Dive", `<ul style="margin:0;padding-left:18px">
      ${bullet("Revenue & COGS auto-fill from Common Utility.")}
      ${bullet(`Latest month CCC: ${last ? num(last["Cash Conversion Cycle"]).toFixed(0) : "—"} days.`)}
      ${bullet("Feeds receivables/inventory/payables into Business Snapshot.")}
    </ul>`, STANDARD_ACCENT) +
    section("Scenario Analysis", scenarioTable(["Lever", "Est. FCF Impact"], [
      ["Base FCF", fmt(annual.totalFCF)],
      ["DSO −5 days", fmt(annual.totalFCF + annual.totalRevenue * (5 / 365))],
      ["DPO +5 days", fmt(annual.totalFCF + annual.totalCOGS * (5 / 365))],
      ["CapEx −20%", fmt(annual.totalFCF + annual.totalCapEx * 0.2)],
    ], STANDARD_ACCENT), STANDARD_ACCENT) +
    section("Risk Flags", risks.length ? `<ul style="margin:0;padding-left:18px">${risks.map(bullet).join("")}</ul>` : callout("ok", "WC managed", "Cash conversion within acceptable range."), STANDARD_ACCENT) +
    standardRoadmap({
      d30: ["Reconcile AR/AP to balance sheet.", "Chase receivables >60 days.", "Review inventory turns."],
      d60: ["Target CCC reduction 10%.", "Feed into Business Snapshot.", "13-week WC forecast."],
      d90: ["Investor WC narrative.", "Negotiate supplier terms.", "Monthly movements review."],
    }) +
    section("Strategic Enhancements", `<ul style="margin:0;padding-left:18px">${bullet("Bridges P&amp;L (hub) to cash reality for Snapshot and fundraise.")}</ul>`, STANDARD_ACCENT),
    STANDARD_ACCENT
  );
}

// ── Public exports ─────────────────────────────────────────────────────────────

export function generateStandardModelAnalysis(calc: CalculationExport): string {
  const slug = calc.modelSlug;
  const out = calc.outputs as Record<string, unknown>;
  const inp = calc.inputs as Record<string, unknown>;

  if (slug === "std-common-utility") return analyzeCommonUtility(out);
  if (slug === "std-break-even") return analyzeStdBreakEven(out);
  if (slug === "std-burn-runway") return analyzeStdBurnRunway(out, inp);
  if (slug === "std-unit-economics") return analyzeStdUnitEconomics(out);
  if (slug === "std-cap-table") return analyzeStdCapTable(out, inp);
  if (slug === "std-business-snapshot") return analyzeStdSnapshot(out, inp);
  if (slug === "std-movements") return analyzeStdMovements(out);
  return "";
}

export function getStandardModelHeroCards(calc: CalculationExport): Row[] {
  const out = calc.outputs as Record<string, unknown>;
  const inp = calc.inputs as Record<string, unknown>;
  const slug = calc.modelSlug;
  const md = getMonthlyData(out);
  const last = md ? lastMonthData(md) : null;
  const annual = getAnnual(out) ?? (out.annual as Record<string, number> | undefined);

  if (slug === "std-common-utility") {
    return [
      { label: "Annual Revenue", value: fmt(annual?.["Gross Revenue"]) },
      { label: "EBITDA", value: fmt(annual?.["EBITDA"]) },
      { label: "Net Profit", value: fmt(annual?.["Net Profit"]) },
      { label: "Gross Margin", value: `${num(annual?.["Gross Margin %"]).toFixed(1)}%` },
    ];
  }
  if (slug === "std-break-even") {
    const a = out.annual as Record<string, number> | undefined;
    return [
      { label: "BE Units (Latest)", value: Number.isFinite(num(last?.breakEvenUnits)) ? num(last?.breakEvenUnits).toLocaleString() : "—" },
      { label: "Latest Profit", value: fmt(last?.profitAtUnits) },
      { label: "Annual Profit", value: fmt(a?.totalProfit) },
      { label: "Status", value: String(last?.status ?? "—") },
    ];
  }
  if (slug === "std-burn-runway") {
    const rw = last?.["Runway (months)"];
    const rwInfinite = rw === null || rw === undefined || !Number.isFinite(Number(rw));
    return [
      { label: "Runway", value: rwInfinite ? "∞" : `${Number(rw).toFixed(1)} mo` },
      { label: "Net Burn", value: fmt(last?.["Net Burn"]) },
      { label: "Cash", value: fmt(last?.["Cumulative Cash"]) },
      { label: "RAG", value: String(last?.["CLASSIFICATION"] ?? "—") },
    ];
  }
  if (slug === "std-unit-economics") {
    const cac = num(last?.["CAC"]);
    const ltv = num(last?.["LTV"]);
    return [
      { label: "LTV / CAC", value: cac > 0 ? `${(ltv / cac).toFixed(1)}x` : "—" },
      { label: "CAC", value: fmt(last?.["CAC"]) },
      { label: "LTV", value: fmt(last?.["LTV"]) },
      { label: "Churn", value: `${num(last?.["Churn Rate %"]).toFixed(1)}%` },
    ];
  }
  if (slug === "std-cap-table") {
    const exit = out.exit as { exitValue?: number } | null | undefined;
    const sh = out.shareholders as { ownershipPct: number; role: string }[] | undefined;
    const founderPct = (sh ?? []).filter((s) => /founder/i.test(s.role)).reduce((s, f) => s + num(f.ownershipPct), 0);
    return [
      { label: "Total Shares", value: num(out.totalShares) > 0 ? num(out.totalShares).toLocaleString() : "—" },
      { label: "Shareholders", value: String((sh ?? []).length) },
      { label: "Exit Value", value: fmt(exit?.exitValue ?? out.exitValue) },
      { label: "Founder %", value: founderPct > 0 ? `${founderPct.toFixed(1)}%` : "—" },
    ];
  }
  if (slug === "std-business-snapshot") {
    return [
      { label: "Health Score", value: `${num(out.healthScore)}/100` },
      { label: "Runway", value: `${num(out.runway).toFixed(1)} mo` },
      { label: "LTV / CAC", value: `${num(out.ltcCacRatio).toFixed(1)}x` },
      { label: "Status", value: String(out.healthLabel ?? "—") },
    ];
  }
  if (slug === "std-movements") {
    const a = out.annual as Record<string, number> | undefined;
    return [
      { label: "Free Cash Flow", value: fmt(a?.totalFCF) },
      { label: "Cash from Ops", value: fmt(a?.totalCFO) },
      { label: "Avg CCC", value: `${num(a?.avgCCC).toFixed(0)} days` },
      { label: "Change in WC", value: fmt(a?.totalChangeInWC) },
    ];
  }
  return [];
}

export function formatStandardModelOutputsHTML(calc: CalculationExport, tierColor: string): string | null {
  const slug = calc.modelSlug;
  const out = calc.outputs as Record<string, unknown>;
  const inp = calc.inputs as Record<string, unknown>;

  if (getMonthlyData(out)) return null;

  if (slug === "std-business-snapshot") {
    return resultsTableHTML([
      { label: "Monthly Revenue", value: fmt(inp.monthlyRevenue) },
      { label: "Gross Margin %", value: `${num(inp.grossMargin).toFixed(1)}%` },
      { label: "Net Margin %", value: `${num(inp.netMargin).toFixed(1)}%` },
      { label: "Cash Balance", value: fmt(inp.cashBalance) },
      { label: "Monthly Burn", value: fmt(inp.burnRate) },
      { label: "LTV", value: fmt(inp.ltv) },
      { label: "CAC", value: fmt(inp.cac) },
      { label: "Receivables", value: fmt(inp.receivables) },
      { label: "Inventory", value: fmt(inp.inventory) },
      { label: "Payables", value: fmt(inp.payables) },
      { label: "Change in WC", value: fmt(inp.changeInWC) },
    ], tierColor, "Snapshot Inputs") +
    resultsTableHTML([
      { label: "Health Score", value: `${num(out.healthScore)}/100 (${out.healthLabel})` },
      { label: "LTV / CAC", value: `${num(out.ltcCacRatio).toFixed(1)}x (${out.ltcCacStatus})` },
      { label: "Runway", value: `${num(out.runway).toFixed(1)} mo (${out.runwayStatus})` },
      { label: "Revenue RAG", value: String(out.revenueStatus) },
      { label: "Margin RAG", value: String(out.marginStatus) },
      { label: "Runway RAG", value: String(out.runwayStatus) },
    ], tierColor, "Calculated Results");
  }

  if (slug === "std-cap-table") {
    const shareholders = out.shareholders as { name: string; role: string; shares: number; ownershipPct: number; investment: number }[] | undefined;
    const rounds = out.rounds as { roundName: string; investmentAmount: number; preMoneyValuation: number; postMoneyValuation: number; dilutionPct: number }[] | undefined;
    const exit = out.exit as { exitValue: number; payouts: { name: string; ownershipPct: number; payout: number; multiple: number | null }[] } | null | undefined;

    let html = resultsTableHTML([
      { label: "Total Shares", value: num(out.totalShares) > 0 ? num(out.totalShares).toLocaleString() : "—" },
      { label: "Exit Value", value: fmt(exit?.exitValue ?? inp.exitValue) },
    ], tierColor, "Cap Table Summary");

    if (shareholders?.length) {
      html += resultsTableHTML(
        shareholders.map((s) => ({ label: `${s.name} (${s.role})`, value: `${num(s.ownershipPct).toFixed(2)}% · ${s.shares.toLocaleString()} shares` })),
        tierColor,
        "Shareholders"
      );
    }
    if (rounds?.length) {
      html += resultsTableHTML(
        rounds.map((r) => ({
          label: r.roundName,
          value: `${fmt(r.investmentAmount)} @ ${fmt(r.preMoneyValuation)} pre / ${num(r.dilutionPct).toFixed(1)}% dilution`,
        })),
        tierColor,
        "Funding Rounds"
      );
    }
    if (exit?.payouts?.length) {
      html += resultsTableHTML(
        exit.payouts.map((py) => ({
          label: py.name,
          value: `${fmt(py.payout)} (${num(py.ownershipPct).toFixed(1)}%)${py.multiple != null ? ` · ${py.multiple.toFixed(1)}x` : ""}`,
        })),
        tierColor,
        "Exit Waterfall"
      );
    }
    return html;
  }

  return null;
}
