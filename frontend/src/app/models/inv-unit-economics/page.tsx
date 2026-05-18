"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Save, RotateCcw, Users } from "lucide-react";
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
  calculateUnitEconomicsAdvanced,
  createEmptyInputs,
  type MonthName,
} from "@/lib/unit-economics-advanced-model";

export default function InvUnitEconomicsPage() {
  const { user, hydrate } = useAuth();
  const [monthData, setMonthData] = useState<Record<string, Record<string, number>>>(() => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyInputs(); });
    return d;
  });
  const [activeMonth, setActiveMonth] = useState<MonthName>("Apr");
  const [hubLinked, setHubLinked] = useState(false);
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set());

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "inv-unit-economics",
    onLoad: (data: Record<string, unknown>) => {
      if (data.monthData) setMonthData(data.monthData as Record<string, Record<string, number>>);
    },
    getState: useCallback(() => ({ monthData }), [monthData]),
  });

  useEffect(() => {
    hydrate();
    const hub = loadModelResults<Record<string, unknown>>("inv-common-utility");
    if (!hub) return;
    const hubMonths = hub.months as Record<string, Record<string, number>> | undefined;
    const locked = new Set<string>();

    setMonthData((prev) => {
      const next = { ...prev };
      if (hubMonths) {
        MONTHS_ORDER.forEach((m) => {
          const data = hubMonths[m];
          if (!data || !next[m]) return;
          next[m] = { ...next[m] };
          if (data.marketingSpend > 0) { next[m]["Marketing Spend"] = data.marketingSpend; locked.add(`${m}::Marketing Spend`); }
          if (data.totalFixedCosts > 0) { next[m]["Fixed Costs"] = data.totalFixedCosts; locked.add(`${m}::Fixed Costs`); }
        });
      } else if (typeof hub.totalFixedCosts === "number" && (hub.totalFixedCosts as number) > 0) {
        MONTHS_ORDER.forEach((m) => {
          next[m] = { ...next[m], "Fixed Costs": hub.totalFixedCosts as number };
          locked.add(`${m}::Fixed Costs`);
        });
      }
      return next;
    });
    if (locked.size > 0) { setHubLinked(true); setLockedFields(locked); }
  }, [hydrate]);

  const results = useMemo(() => calculateUnitEconomicsAdvanced(monthData), [monthData]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { saveModelResults("inv-unit-economics", results); }, [results]);

  const handleChange = (field: string, value: string) => {
    setMonthData((prev) => ({
      ...prev,
      [activeMonth]: { ...prev[activeMonth], [field]: parseFloat(value) || 0 },
    }));
    markDirty();
  };

  const activeMonthRef = useRef(activeMonth);
  useEffect(() => {
    const leaving = activeMonthRef.current;
    activeMonthRef.current = activeMonth;
    const leavingIdx = MONTHS_ORDER.indexOf(leaving);
    if (leavingIdx < 0 || leavingIdx >= MONTHS_ORDER.length - 1) return;
    const nextMonth = MONTHS_ORDER[leavingIdx + 1];
    if (nextMonth !== activeMonth) return;
    const leavingTotal = Number(results.monthlyData[leaving]?.["Total Customers"] ?? 0);
    if (!leavingTotal || leavingTotal <= 0) return;
    setMonthData((prev) => ({
      ...prev,
      [nextMonth]: { ...prev[nextMonth], "Customers at the beginning": leavingTotal },
    } as Record<string, Record<string, number>>));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMonth]);

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

  const handleReset = () => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyInputs(); });
    setMonthData(d);
    setHubLinked(false);
    setLockedFields(new Set());
    clearModelResults("inv-unit-economics");
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      await api.post("/calculations", { modelSlug: "inv-unit-economics", inputs: monthData, outputs: results });
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  const cur = results.monthlyData[activeMonth];
  const categories = [...new Set(INPUT_FIELDS.map((f) => f.category))];

  const fmtOutput = (key: string, format: string) => {
    if (!cur) return "—";
    const v = Number(cur[key]) || 0;
    if (format === "currency") return formatCurrency(v);
    if (format === "percent") return `${(v * 100).toFixed(1)}%`;
    if (format === "ratio") return `${v.toFixed(2)}x`;
    if (format === "months") return `${v.toFixed(1)} mo`;
    if (format === "rag") return String(cur[key] || "—");
    return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const ragColor = (status: string) =>
    status === "GREEN" ? "text-success bg-success/10 border-success/30" :
    status === "AMBER" ? "text-amber-400 bg-amber-400/10 border-amber-400/30" :
    "text-danger bg-danger/10 border-danger/30";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models?tier=investor" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-400/10">
            <Users className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Unit Economics — Advanced</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-amber-400/10 text-amber-400">Investor Grade</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Full Excel match — CAC, LTV, MRR, GRR, NRR, Rule of 40, Contribution Margin &amp; more.
            </p>
          </div>
        </div>
        {user && (
          <button onClick={handleSave} disabled={saving || saved}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${saved ? "bg-success/10 text-success" : "bg-amber-400/10 text-amber-400 hover:bg-amber-400/20"}`}>
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>

      {hubLinked && (
        <div className="rounded-xl bg-success/5 border border-success/20 p-3 mb-6">
          <p className="text-xs text-success font-medium">Auto-filled from Common Utility. Linked fields are locked.</p>
        </div>
      )}

      {/* Month tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6">
        {MONTHS_ORDER.map((m) => {
          const mStatus = results.status.find((s) => s.month === m);
          return (
            <button key={m} onClick={() => setActiveMonth(m)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeMonth === m ? "bg-amber-400 text-black" :
                mStatus ? (mStatus.rag === "GREEN" ? "bg-success/10 border border-success/30 text-success" :
                  mStatus.rag === "AMBER" ? "bg-amber-400/10 border border-amber-400/30 text-amber-400" :
                  "bg-danger/10 border border-danger/30 text-danger") :
                "bg-card border border-border hover:bg-muted"
              }`}>
              {m}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Inputs */}
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
                          value={monthData[activeMonth][field.key] || ""}
                          onChange={(e) => handleChange(field.key, e.target.value)}
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
          <div className="flex gap-3 mt-5">
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-4 h-fit sticky top-8">
          {/* Monthly Metrics */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">{activeMonth} Metrics</h3>
            {cur ? (
              <div className="space-y-1.5">
                {OUTPUT_FIELDS.map((f) => {
                  if (f.format === "rag") {
                    const rag = String(cur[f.key] || "");
                    return (
                      <div key={f.key} className={`rounded-lg px-3 py-1.5 text-center text-xs font-semibold border ${ragColor(rag)}`}>
                        {rag === "GREEN" ? "GREEN — Healthy Economics" : rag === "AMBER" ? "AMBER — Watch Closely" : "RED — Economics Need Fixing"}
                      </div>
                    );
                  }
                  return (
                    <div key={f.key} className="flex justify-between text-xs rounded-lg px-3 py-1.5 bg-background/50 border border-border/50">
                      <span className="text-muted-foreground">{f.label}</span>
                      <span className="font-semibold">{fmtOutput(f.key, f.format)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Enter inputs to see metrics.</p>
            )}
          </div>

          {/* Annual Summary */}
          {results.monthsAdded.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Annual Summary</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between px-3 py-1">
                  <span className="text-muted-foreground">Total Revenue</span>
                  <span className="font-semibold">{formatCurrency(results.summary.totalRevenue)}</span>
                </div>
                <div className="flex justify-between px-3 py-1">
                  <span className="text-muted-foreground">Total Contribution Margin</span>
                  <span className="font-semibold">{formatCurrency(results.summary.totalContributionMargin)}</span>
                </div>
                <div className="flex justify-between px-3 py-1">
                  <span className="text-muted-foreground">Ending Customers</span>
                  <span className="font-semibold">{results.summary.endingCustomers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between px-3 py-1">
                  <span className="text-muted-foreground">Ending MRR</span>
                  <span className="font-semibold">{formatCurrency(results.summary.endingMRR)}</span>
                </div>
                <div className="border-t border-border pt-1.5 mt-1.5">
                  <div className="flex justify-between px-3 py-1">
                    <span className="text-muted-foreground">Avg CAC</span>
                    <span className="font-semibold">{formatCurrency(results.summary.avgCAC)}</span>
                  </div>
                  <div className="flex justify-between px-3 py-1">
                    <span className="text-muted-foreground">Avg LTV</span>
                    <span className="font-semibold">{formatCurrency(results.summary.avgLTV)}</span>
                  </div>
                  <div className="flex justify-between px-3 py-1">
                    <span className="text-muted-foreground">Avg LTV/CAC</span>
                    <span className="font-semibold">{results.summary.avgLTVCAC.toFixed(2)}x</span>
                  </div>
                  <div className="flex justify-between px-3 py-1">
                    <span className="text-muted-foreground">Avg Churn Rate</span>
                    <span className="font-semibold">{(results.summary.avgChurnRate * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="border-t border-border pt-1.5 mt-1.5">
                  <div className="flex justify-between px-3 py-1">
                    <span className="text-muted-foreground">Avg GRR</span>
                    <span className="font-semibold">{(results.summary.avgGRR * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between px-3 py-1">
                    <span className="text-muted-foreground">Avg NRR</span>
                    <span className={`font-semibold ${results.summary.avgNRR < 1 ? "text-danger" : "text-success"}`}>
                      {(results.summary.avgNRR * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between px-3 py-1">
                    <span className="text-muted-foreground">Avg Contribution Margin</span>
                    <span className="font-semibold">{(results.summary.avgContributionMargin * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between px-3 py-1">
                    <span className="text-muted-foreground">Avg Rule of 40</span>
                    <span className={`font-semibold ${results.summary.avgRuleOf40 >= 0.40 ? "text-success" : results.summary.avgRuleOf40 >= 0.20 ? "text-amber-400" : "text-danger"}`}>
                      {(results.summary.avgRuleOf40 * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============ CHARTS ============ */}
      {results && results.monthsAdded.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* CAC vs LTV Trend */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">CAC vs LTV Trend</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              legend: { data: ["CAC", "LTV"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
              grid: { top: 30, right: 15, bottom: 25, left: 55 },
              xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [
                { name: "CAC", type: "bar", data: results.monthsAdded.map(m => results.monthlyData[m]?.["CAC"] || 0), itemStyle: { color: "#ef4444", borderRadius: [4, 4, 0, 0] } },
                { name: "LTV", type: "line", data: results.monthsAdded.map(m => results.monthlyData[m]?.["LTV"] || 0), smooth: true, lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" }, symbol: "circle", symbolSize: 5 },
              ],
            }} />
          </div>

          {/* LTV/CAC Ratio */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">LTV/CAC Ratio</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 25, left: 45 },
              xAxis: { type: "category", data: results.status.map(s => s.month), axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: "{value}x" }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{
                type: "bar",
                data: results.status.map(s => ({ value: s.ltvCacRatio, itemStyle: { color: s.ltvCacRatio >= 3 ? "#34d399" : s.ltvCacRatio >= 1 ? "#f59e0b" : "#ef4444", borderRadius: [4, 4, 0, 0] } })),
                markLine: { data: [{ yAxis: 3, lineStyle: { color: "#34d399", type: "dashed" } }], label: { formatter: "3x", color: "#34d399", fontSize: 9 }, symbol: "none" },
              }],
            }} />
          </div>

          {/* Churn & Growth Rates */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Churn & Growth Rates</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              legend: { data: ["Churn %", "Growth %"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
              grid: { top: 30, right: 15, bottom: 25, left: 45 },
              xAxis: { type: "category", data: results.status.map(s => s.month), axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: "{value}%" }, splitLine: { lineStyle: { color: "#222" } } },
              series: [
                { name: "Churn %", type: "line", data: results.status.map(s => (s.churnRate * 100)), smooth: true, lineStyle: { color: "#ef4444", width: 2 }, itemStyle: { color: "#ef4444" }, symbol: "circle", symbolSize: 4 },
                { name: "Growth %", type: "line", data: results.status.map(s => (s.growthRate * 100)), smooth: true, lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" }, symbol: "circle", symbolSize: 4 },
              ],
            }} />
          </div>

          {/* NRR & GRR Trend */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">NRR & GRR Trend</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              legend: { data: ["NRR", "GRR"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
              grid: { top: 30, right: 15, bottom: 25, left: 45 },
              xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: "{value}%" }, splitLine: { lineStyle: { color: "#222" } } },
              series: [
                { name: "NRR", type: "line", data: results.monthsAdded.map(m => ((results.monthlyData[m]?.["Net Revenue Retention (NRR)"] || 0) * 100)), smooth: true, lineStyle: { color: "#60a5fa", width: 2 }, itemStyle: { color: "#60a5fa" }, symbol: "circle", symbolSize: 4 },
                { name: "GRR", type: "line", data: results.monthsAdded.map(m => ((results.monthlyData[m]?.["Gross Revenue Retention (GRR)"] || 0) * 100)), smooth: true, lineStyle: { color: "#a78bfa", width: 2 }, itemStyle: { color: "#a78bfa" }, symbol: "circle", symbolSize: 4 },
              ],
              markLine: { data: [{ yAxis: 100, lineStyle: { color: "#f59e0b", type: "dashed" } }], label: { formatter: "100%", color: "#f59e0b", fontSize: 9 }, symbol: "none" },
            }} />
          </div>

          {/* Rule of 40 Trend */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Rule of 40</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 25, left: 45 },
              xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: "{value}%" }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{
                type: "bar",
                data: results.monthsAdded.map(m => {
                  const v = results.monthlyData[m]?.["Rule of 40"] || 0;
                  return { value: v, itemStyle: { color: v >= 40 ? "#34d399" : v >= 20 ? "#f59e0b" : "#ef4444", borderRadius: [4, 4, 0, 0] } };
                }),
                markLine: { data: [{ yAxis: 40, lineStyle: { color: "#34d399", type: "dashed" } }], label: { formatter: "40%", color: "#34d399", fontSize: 9 }, symbol: "none" },
              }],
            }} />
          </div>

          {/* RAG Status Donut */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">RAG Status Distribution</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              series: [{ type: "pie", radius: ["40%", "68%"], center: ["50%", "50%"],
                label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{c} mo" },
                data: [
                  { value: results.status.filter(s => s.rag === "GREEN").length, name: "GREEN", itemStyle: { color: "#34d399" } },
                  { value: results.status.filter(s => s.rag === "AMBER").length, name: "AMBER", itemStyle: { color: "#f59e0b" } },
                  { value: results.status.filter(s => s.rag === "RED").length, name: "RED", itemStyle: { color: "#ef4444" } },
                ].filter(d => d.value > 0),
              }],
            }} />
          </div>

          {/* KPI Radar (latest month) */}
          {(() => {
            const last = results.monthsAdded[results.monthsAdded.length - 1];
            const d = last ? results.monthlyData[last] : null;
            if (!d) return null;
            return (
              <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
                <h3 className="font-semibold text-sm mb-3">Latest Month KPI Radar ({last})</h3>
                <ReactECharts style={{ height: 260 }} option={{
                  tooltip: { backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  radar: {
                    indicator: [
                      { name: "LTV/CAC", max: 6 },
                      { name: "NRR %", max: 150 },
                      { name: "GRR %", max: 110 },
                      { name: "Rule of 40", max: 80 },
                      { name: "CM %", max: 100 },
                    ],
                    axisName: { color: "#aaa", fontSize: 10 },
                    splitArea: { areaStyle: { color: ["transparent"] } },
                    splitLine: { lineStyle: { color: "#333" } },
                    axisLine: { lineStyle: { color: "#444" } },
                  },
                  series: [{
                    type: "radar",
                    data: [{
                      value: [
                        d["LTV/CAC Ratio"] || 0,
                        (d["Net Revenue Retention (NRR)"] || 0) * 100,
                        (d["Gross Revenue Retention (GRR)"] || 0) * 100,
                        d["Rule of 40"] || 0,
                        (d["Contribution Margin %"] || 0) * 100,
                      ],
                      name: last,
                      areaStyle: { color: "rgba(96,165,250,0.2)" },
                      lineStyle: { color: "#60a5fa", width: 2 },
                      itemStyle: { color: "#60a5fa" },
                    }],
                  }],
                }} />
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
