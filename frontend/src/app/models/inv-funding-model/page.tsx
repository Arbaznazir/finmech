"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Rocket, Save, RotateCcw } from "lucide-react";
import { FieldHint } from "@/components/FieldHint";
import { FIELD_HINTS } from "@/lib/field-hints";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { loadModelResults, saveModelResults, clearModelResults } from "@/lib/model-link";
import { useSavedModel } from "@/lib/use-saved-model";
import {
  MONTHS_ORDER,
  INPUT_FIELDS,
  OUTPUT_FIELDS,
  calculateFunding,
  createEmptyInputs,
  type MonthName,
  type FundingResults,
} from "@/lib/funding-model";

type TabView = "input" | "monthly" | "summary";

export default function InvFundingModelPage() {
  const { user, hydrate } = useAuth();
  const [activeMonth, setActiveMonth] = useState<MonthName>("Apr");
  const [monthsData, setMonthsData] = useState<Record<string, Record<string, number>>>(() => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyInputs(); });
    return d;
  });
  const [openingCash, setOpeningCash] = useState(0);
  const [contingencyPct, setContingencyPct] = useState(15);
  const [results, setResults] = useState<FundingResults | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>("input");
  const [hubLinked, setHubLinked] = useState(false);
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set());

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "inv-funding-model",
    onLoad: (data: Record<string, unknown>) => {
      if (data.monthsData) setMonthsData(data.monthsData as Record<string, Record<string, number>>);
      if (typeof data.openingCash === "number") setOpeningCash(data.openingCash);
      if (typeof data.contingencyPct === "number") setContingencyPct(data.contingencyPct);
    },
    getState: useCallback(() => ({ monthsData, openingCash, contingencyPct }), [monthsData, openingCash, contingencyPct]),
  });

  useEffect(() => {
    hydrate();
    const hub = loadModelResults<Record<string, unknown>>("inv-common-utility");
    const locked = new Set<string>();

    setMonthsData((prev) => {
      const hubMonths = hub?.months as Record<string, Record<string, number>> | undefined;
      const next = { ...prev };
      if (hubMonths) {
        MONTHS_ORDER.forEach((m) => {
          const data = hubMonths[m];
          if (!data || !next[m]) return;
          next[m] = { ...next[m] };
          if (data.revenue > 0) { next[m]["Revenue"] = data.revenue; locked.add(`${m}::Revenue`); }
          if (data.cogs > 0) { next[m]["Cost of Goods Sold (COGS)"] = data.cogs; locked.add(`${m}::Cost of Goods Sold (COGS)`); }
          if (data.totalVariableCosts > 0) { next[m]["Variable Cost"] = data.totalVariableCosts; locked.add(`${m}::Variable Cost`); }
          if (data.totalFixedCosts > 0) { next[m]["Fixed Cost"] = data.totalFixedCosts; locked.add(`${m}::Fixed Cost`); }
        });
      } else if (hub && typeof hub.monthlyRevenue === "number" && (hub.monthlyRevenue as number) > 0) {
        MONTHS_ORDER.forEach((m) => {
          next[m] = { ...next[m], Revenue: hub.monthlyRevenue as number };
          if ((hub.totalFixedCosts as number) > 0) next[m]["Fixed Cost"] = hub.totalFixedCosts as number;
          if ((hub.totalVariableCosts as number) > 0) next[m]["Variable Cost"] = hub.totalVariableCosts as number;
          locked.add(`${m}::Revenue`); locked.add(`${m}::Fixed Cost`); locked.add(`${m}::Variable Cost`);
        });
      }
      // Pull working capital fields from Movements model
      const mov = loadModelResults<Record<string, unknown>>("inv-movements");
      if (mov && mov.monthlyData) {
        const movMonths = mov.monthlyData as Record<string, Record<string, number>>;
        MONTHS_ORDER.forEach((m) => {
          const md = movMonths[m];
          if (!md || !next[m]) return;
          next[m] = { ...next[m] };
          if (md["Trade Receivables (Closing)"] > 0) { next[m]["Trade Receivables"] = md["Trade Receivables (Closing)"]; locked.add(`${m}::Trade Receivables`); }
          if (md["Inventory (Closing)"] > 0) { next[m]["Inventory"] = md["Inventory (Closing)"]; locked.add(`${m}::Inventory`); }
          if (md["Trade Payables (Closing)"] > 0) { next[m]["Trade Payables"] = md["Trade Payables (Closing)"]; locked.add(`${m}::Trade Payables`); }
          if (md["Change in Working Capital"] !== undefined && md["Change in Working Capital"] !== 0) { next[m]["Change in WC"] = md["Change in Working Capital"]; locked.add(`${m}::Change in WC`); }
        });
      }

      return next;
    });
    if (locked.size > 0) { setHubLinked(true); setLockedFields(locked); }
  }, [hydrate]);

  const handleInputChange = (key: string, value: string) => {
    setMonthsData((prev) => ({
      ...prev,
      [activeMonth]: { ...prev[activeMonth], [key]: parseFloat(value) || 0 },
    }));
    markDirty();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const all = Array.from(
        (e.currentTarget.closest("[data-inputs]") || document).querySelectorAll<HTMLInputElement>("input[data-field]")
      );
      const idx = all.indexOf(e.currentTarget);
      if (idx >= 0 && idx < all.length - 1) all[idx + 1].focus();
    }
  };

  const handleCalculate = () => {
    const r = calculateFunding(monthsData, openingCash, contingencyPct);
    setResults(r);
    saveModelResults("inv-funding-model", {
      maxCashDeficit: r.summary.maxCashDeficit,
      fundingRequired: r.summary.fundingRequired,
      totalFunding: r.summary.totalFunding,
    });
  };

  const handleReset = () => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyInputs(); });
    setMonthsData(d);
    setOpeningCash(0);
    setContingencyPct(15);
    setResults(null);
    setHubLinked(false);
    clearModelResults("inv-funding-model");
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user || !results) return;
    try {
      await api.post("/calculations", { modelSlug: "inv-funding-model", inputs: { openingCash, contingencyPct, monthsData }, outputs: results.summary });
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  const categories = [...new Set(INPUT_FIELDS.map((f) => f.category))];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models?tier=investor" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-400/10">
            <Rocket className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Funding Model</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-amber-400/10 text-amber-400">Investor Grade</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Month-by-month cash flow, working capital, and funding requirements.
              <span className="text-amber-400 ml-2 text-xs font-medium">&larr; Common Utility</span>
            </p>
          </div>
        </div>
        {results && user && (
          <button onClick={handleSave} disabled={saving || saved}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${saved ? "bg-success/10 text-success" : "bg-amber-400/10 text-amber-400 hover:bg-amber-400/20"}`}>
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>

      {hubLinked && (
        <div className="rounded-xl bg-success/5 border border-success/20 p-3 mb-6">
          <p className="text-xs text-success font-medium">Auto-filled from Common Utility &amp; Movements. Only CapEx, Opening Cash &amp; Contingency % are manual.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 rounded-xl bg-card border border-border p-1 overflow-x-auto">
        {(["input", "monthly", "summary"] as TabView[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors whitespace-nowrap ${activeTab === tab ? "bg-amber-400 text-black" : "hover:bg-muted text-muted-foreground"}`}>
            {tab === "input" ? "Month Input" : tab === "monthly" ? "Monthly View" : "Summary"}
          </button>
        ))}
      </div>

      {/* INPUT TAB */}
      {activeTab === "input" && (
        <div className="space-y-4">
          {/* Opening Cash & Contingency */}
          <div className="rounded-2xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center text-xs text-muted-foreground mb-1">Opening Cash<FieldHint hint={FIELD_HINTS["Opening Cash"] ?? { what: "Cash and bank balance at the start of the funding analysis period.", why: "Determines your current runway before the new funding arrives.", how: "From your bank statement on the first day of this period." }} /></label>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <input type="number" value={openingCash || ""} onChange={(e) => { setOpeningCash(parseFloat(e.target.value) || 0); markDirty(); }}
                placeholder="100000" className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" /></div>
            </div>
            <div>
              <label className="flex items-center text-xs text-muted-foreground mb-1">Contingency %<FieldHint hint={{ what: "A buffer added on top of your calculated funding requirement.", why: "Real costs always exceed estimates. 15–20% contingency protects against overruns.", how: "Industry standard is 15%. Increase to 20% for early-stage or unproven business models." }} /></label>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              <input type="number" value={contingencyPct || ""} onChange={(e) => { setContingencyPct(parseFloat(e.target.value) || 15); markDirty(); }}
                placeholder="15" className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" /></div>
            </div>
          </div>

          {/* Month tabs */}
          <div className="flex gap-1 overflow-x-auto pb-2">
            {MONTHS_ORDER.map((m) => (
              <button key={m} onClick={() => setActiveMonth(m)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${activeMonth === m ? "bg-amber-400 text-black" : "bg-card border border-border hover:bg-muted"}`}>
                {m}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 output-panel" data-inputs>
            <h3 className="font-semibold text-sm mb-3">{activeMonth} Inputs</h3>
            <div className="space-y-4">
              {categories.map((cat) => (
                <div key={cat}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{cat}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {INPUT_FIELDS.filter((f) => f.category === cat).map((field) => {
                      const isLocked = lockedFields.has(`${activeMonth}::${field.key}`);
                      return (
                      <div key={field.key}>
                        <label className="flex items-center text-xs text-muted-foreground mb-1">
                          {field.label}
                          {FIELD_HINTS[field.key] && <FieldHint hint={FIELD_HINTS[field.key]} />}
                          {isLocked && <span className="ml-1 text-[10px] text-amber-400/70">(auto-filled)</span>}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.prefix}</span>
                          <input type="number" data-field={field.key}
                            value={monthsData[activeMonth]?.[field.key] || ""}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLocked}
                            placeholder="0"
                            className={`w-full rounded-lg border border-border pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${isLocked ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60" : "bg-input"}`}
                          />
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleCalculate} className="flex-1 rounded-lg bg-amber-400 text-black py-2.5 text-sm font-semibold hover:bg-amber-300 transition-colors">
              Calculate Funding
            </button>
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* MONTHLY TAB */}
      {activeTab === "monthly" && results && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="text-left px-3 py-2.5 text-muted-foreground font-semibold sticky left-0 bg-background/50">Line Item</th>
                  {results.monthsAdded.map((m) => (
                    <th key={m} className="text-right px-3 py-2.5 text-muted-foreground font-semibold whitespace-nowrap">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {OUTPUT_FIELDS.map((field) => (
                  <tr key={field.key} className={`border-b border-border/30 ${field.bold ? "font-semibold" : ""}`}>
                    <td className="px-3 py-2 sticky left-0 bg-card">{field.label}</td>
                    {results.monthsAdded.map((m) => (
                      <td key={m} className={`text-right px-3 py-2 whitespace-nowrap ${
                        (Number(results.monthlyData[m]?.[field.key]) || 0) < 0 ? "text-danger" : ""
                      }`}>
                        {formatCurrency(Number(results.monthlyData[m]?.[field.key]) || 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeTab === "monthly" && !results && (
        <div className="text-center py-16 text-muted-foreground text-sm">Enter inputs and click Calculate Funding first.</div>
      )}

      {/* SUMMARY TAB */}
      {activeTab === "summary" && results && (
        <div className="space-y-6">
          <div className="rounded-2xl border-2 border-amber-400/30 bg-amber-400/5 p-6 text-center output-panel-amber">
            <p className="text-sm text-muted-foreground mb-2">Total Funding Required (incl. {results.summary.contingencyPct}% contingency)</p>
            <p className="text-3xl font-bold text-amber-400">{formatCurrency(results.summary.totalFunding)}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {([
              { label: "Opening Cash", value: formatCurrency(results.summary.openingCash) },
              { label: "Max Cash Deficit", value: formatCurrency(results.summary.maxCashDeficit) },
              { label: "Funding Required", value: formatCurrency(results.summary.fundingRequired) },
              { label: "Contingency", value: formatCurrency(results.summary.contingency) },
            ]).map((card) => (
              <div key={card.label} className="rounded-xl border border-border bg-card p-4">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">{card.label}</p>
                <p className="text-lg font-bold">{card.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === "summary" && !results && (
        <div className="text-center py-16 text-muted-foreground text-sm">Enter inputs and click Calculate Funding first.</div>
      )}

      {/* ============ CHARTS ============ */}
      {results && results.monthsAdded.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Cumulative Cash Area */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Cumulative Cash Position</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 30, left: 55 },
              xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{
                type: "line", smooth: true,
                data: MONTHS_ORDER.map(m => results.monthlyData[m]?.["Cumulative Cash"] || 0),
                areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(96,165,250,0.3)" }, { offset: 1, color: "rgba(96,165,250,0)" }] } },
                lineStyle: { color: "#60a5fa", width: 2 }, itemStyle: { color: "#60a5fa" },
                markLine: { data: [{ yAxis: 0, lineStyle: { color: "#ef4444", type: "dashed" } }], label: { show: false }, symbol: "none" },
              }],
            }} />
          </div>

          {/* Monthly Net Cash Bar */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Monthly Net Cash Flow</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 30, left: 55 },
              xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{
                type: "bar",
                data: MONTHS_ORDER.map(m => {
                  const v = results.monthlyData[m]?.["Net Cash Flow"] || 0;
                  return { value: v, itemStyle: { color: v >= 0 ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] } };
                }),
              }],
            }} />
          </div>

          {/* Revenue vs Total Expenses */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Revenue vs Total Expenses</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              legend: { data: ["Revenue", "Expenses"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
              grid: { top: 30, right: 15, bottom: 30, left: 55 },
              xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [
                { name: "Revenue", type: "bar", data: MONTHS_ORDER.map(m => results.monthlyData[m]?.["Revenue"] || 0), itemStyle: { color: "#34d399", borderRadius: [4, 4, 0, 0] } },
                { name: "Expenses", type: "bar", data: MONTHS_ORDER.map(m => Math.abs((results.monthlyData[m]?.["Cost of Goods Sold (COGS)"] || 0) + (results.monthlyData[m]?.["Variable Cost"] || 0) + (results.monthlyData[m]?.["Fixed Cost"] || 0))), itemStyle: { color: "#ef4444", borderRadius: [4, 4, 0, 0] } },
              ],
            }} />
          </div>

          {/* Funding Waterfall */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Funding Requirement Breakdown</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 35, left: 55 },
              xAxis: { type: "category", data: ["Opening Cash", "Max Deficit", "Funding Req", "Contingency", "Total Funding"], axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{ type: "bar", barWidth: 28,
                data: [
                  { value: results.summary.openingCash, itemStyle: { color: "#60a5fa", borderRadius: [4, 4, 0, 0] } },
                  { value: results.summary.maxCashDeficit, itemStyle: { color: "#ef4444", borderRadius: [4, 4, 0, 0] } },
                  { value: results.summary.fundingRequired, itemStyle: { color: "#f59e0b", borderRadius: [4, 4, 0, 0] } },
                  { value: results.summary.contingency, itemStyle: { color: "#a78bfa", borderRadius: [4, 4, 0, 0] } },
                  { value: results.summary.totalFunding, itemStyle: { color: "#34d399", borderRadius: [4, 4, 0, 0] } },
                ],
                label: { show: true, position: "top", color: "#aaa", fontSize: 9, formatter: (p: any) => p.value >= 1000 ? `$${(p.value/1000).toFixed(0)}k` : `$${p.value}` },
              }],
            }} />
          </div>

          {/* Expense Composition (latest month) */}
          {(() => {
            const last = results.monthsAdded[results.monthsAdded.length - 1];
            const d = last ? results.monthlyData[last] : null;
            if (!d) return null;
            return (
              <div className="rounded-2xl border border-border bg-card p-5 output-panel">
                <h3 className="font-semibold text-sm mb-3">Expense Composition ({last})</h3>
                <ReactECharts style={{ height: 220 }} option={{
                  tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  series: [{ type: "pie", radius: ["35%", "65%"], center: ["50%", "50%"],
                    label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{d}%" },
                    data: [
                      { value: Math.abs(d["Fixed Cost"] || 0), name: "Fixed", itemStyle: { color: "#f59e0b" } },
                      { value: Math.abs(d["Variable Cost"] || 0), name: "Variable", itemStyle: { color: "#ef4444" } },
                      { value: Math.abs(d["Cost of Goods Sold (COGS)"] || 0), name: "COGS", itemStyle: { color: "#a78bfa" } },
                    ].filter(dd => dd.value > 0),
                  }],
                }} />
              </div>
            );
          })()}

          {/* Funding Gauge */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Total Funding Required</h3>
            <ReactECharts style={{ height: 220 }} option={{
              series: [{
                type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: Math.max(results.summary.totalFunding * 1.5, 100000),
                pointer: { show: true, length: "60%", width: 4, itemStyle: { color: "#60a5fa" } },
                axisLine: { lineStyle: { width: 20, color: [[0.33, "#34d399"], [0.66, "#f59e0b"], [1, "#ef4444"]] } },
                axisTick: { show: false }, splitLine: { show: false },
                axisLabel: { show: false },
                detail: { valueAnimation: true, formatter: (v: number) => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`, color: "#e0e0e0", fontSize: 18, offsetCenter: [0, "70%"] },
                data: [{ value: results.summary.totalFunding }],
              }],
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
