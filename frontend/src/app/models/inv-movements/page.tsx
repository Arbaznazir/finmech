"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link"
import { ModelBackLink } from "@/components/model-back-link";
import { ArrowLeft, ArrowRightLeft, Save, RotateCcw } from "lucide-react";
import { FieldHint } from "@/components/FieldHint";
import { FIELD_HINTS } from "@/lib/field-hints";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import {formatCurrency, formatChartCurrency} from "@/lib/utils";
import api from "@/lib/api";
import { offerSmartResultsAfterCalculate } from "@/lib/smart-results";
import { loadModelResults, saveModelResults, clearModelResults } from "@/lib/model-link";
import { useSavedModel } from "@/lib/use-saved-model";
import {
  MONTHS_ORDER,
  INPUT_FIELDS,
  OUTPUT_FIELDS,
  calculateMovements,
  createEmptyInputs,
  type MonthName,
} from "@/lib/movements-model";

export default function InvMovementsPage() {
  const { user, hydrate } = useAuth();
  const [monthData, setMonthData] = useState<Record<string, Record<string, number>>>(() => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyInputs() as Record<string, number>; });
    return d;
  });
  const [activeMonth, setActiveMonth] = useState<MonthName>("Apr");
  const [hubLinked, setHubLinked] = useState(false);
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set());

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "inv-movements",
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

    if (hubMonths) {
      setMonthData((prev) => {
        const next = { ...prev };
        MONTHS_ORDER.forEach((m) => {
          const data = hubMonths[m];
          if (!data || !next[m]) return;
          next[m] = { ...next[m] };
          if (data.revenue > 0) { next[m]["Revenue"] = data.revenue; locked.add(`${m}::Revenue`); }
          if (data.cogs > 0) { next[m]["COGS"] = data.cogs; locked.add(`${m}::COGS`); }
        });
        return next;
      });
    } else if (typeof hub.monthlyRevenue === "number" && (hub.monthlyRevenue as number) > 0) {
      setMonthData((prev) => {
        const next = { ...prev };
        MONTHS_ORDER.forEach((m) => {
          next[m] = { ...next[m], Revenue: hub.monthlyRevenue as number };
          locked.add(`${m}::Revenue`);
        });
        return next;
      });
    }
    if (locked.size > 0) { setHubLinked(true); setLockedFields(locked); }
  }, [hydrate]);

  const results = useMemo(() => calculateMovements(monthData), [monthData]);

  // Persist to localStorage so Cash Flow & Balance Sheet can auto-pull
  useEffect(() => {
    saveModelResults("inv-movements", {
      monthlyData: results.monthlyData,
      annual: results.annual,
    });
  }, [results]);

  const handleChange = (key: string, value: string) => {
    setMonthData((prev) => ({
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

  const handleReset = () => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyInputs() as Record<string, number>; });
    setMonthData(d);
    setHubLinked(false);
    setLockedFields(new Set());
    clearModelResults("inv-movements");
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user) return;
    saveModelResults("inv-movements", {
      monthlyData: results.monthlyData,
      annual: results.annual,
    });
    try {
      const outputs = { monthlyData: results.monthlyData, annual: results.annual };
      await api.post("/calculations", {
        modelSlug: "inv-movements",
        inputs: monthData,
        outputs,
      });
      offerSmartResultsAfterCalculate("inv-movements", monthData, outputs);
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  const cur = results.monthlyData[activeMonth];
  const categories = [...new Set(INPUT_FIELDS.map((f) => f.category))];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <ModelBackLink modelSlug="inv-movements" label="Back to Models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" />

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-400/10">
            <ArrowRightLeft className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Working Capital Movements</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-amber-400/10 text-amber-400">Investor Grade</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Track Receivables, Inventory &amp; Payables movements. Feeds working capital data to Business Snapshot &amp; Funding Model.
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
          <p className="text-xs text-success font-medium">Auto-filled from Common Utility. Revenue &amp; COGS are locked.</p>
        </div>
      )}

      {/* Month tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6">
        {MONTHS_ORDER.map((m) => (
          <button key={m} onClick={() => setActiveMonth(m)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${activeMonth === m ? "bg-amber-400 text-black" : "bg-card border border-border hover:bg-muted"}`}>
            {m}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
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

        {/* Results */}
        <div className="space-y-4 h-fit sticky top-8">
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">{activeMonth} Results</h3>
            {cur ? (
              <div className="space-y-2">
                {OUTPUT_FIELDS.map((f) => {
                  const val = cur[f.key] ?? 0;
                  return (
                    <div key={f.key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{f.label}</span>
                      <span className={`font-medium ${f.format === "currency" && val < 0 ? "text-danger" : ""}`}>
                        {f.format === "currency" ? formatCurrency(val) : f.format === "days" ? `${val.toFixed(1)}d` : val.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Enter inputs to see results.</p>
            )}
          </div>

          {/* Annual Summary */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Annual Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Revenue</span>
                <span className="font-medium">{formatCurrency(results.annual.totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Gross Profit</span>
                <span className="font-medium">{formatCurrency(results.annual.totalGrossProfit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Δ Working Capital</span>
                <span className={`font-medium ${results.annual.totalChangeInWC > 0 ? "text-danger" : "text-success"}`}>
                  {formatCurrency(results.annual.totalChangeInWC)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total CFO</span>
                <span className={`font-medium ${results.annual.totalCFO < 0 ? "text-danger" : "text-success"}`}>
                  {formatCurrency(results.annual.totalCFO)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total FCF</span>
                <span className={`font-medium ${results.annual.totalFCF < 0 ? "text-danger" : "text-success"}`}>
                  {formatCurrency(results.annual.totalFCF)}
                </span>
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg DSO</span>
                  <span className="font-medium">{results.annual.avgDSO.toFixed(1)} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg DIO</span>
                  <span className="font-medium">{results.annual.avgDIO.toFixed(1)} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg DPO</span>
                  <span className="font-medium">{results.annual.avgDPO.toFixed(1)} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Cash Conversion Cycle</span>
                  <span className={`font-medium ${results.annual.avgCCC > 60 ? "text-danger" : results.annual.avgCCC > 30 ? "text-amber-400" : "text-success"}`}>
                    {results.annual.avgCCC.toFixed(1)} days
                  </span>
                </div>
              </div>
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Closing Receivables</span>
                  <span className="font-medium">{formatCurrency(results.annual.closingReceivables)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Closing Inventory</span>
                  <span className="font-medium">{formatCurrency(results.annual.closingInventory)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Closing Payables</span>
                  <span className="font-medium">{formatCurrency(results.annual.closingPayables)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ CHARTS ============ */}
      {results.monthsAdded.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Working Capital Components */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Working Capital Components</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              legend: { data: ["Receivables", "Inventory", "Payables"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
              grid: { top: 30, right: 15, bottom: 30, left: 55 },
              xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => formatChartCurrency(v) }, splitLine: { lineStyle: { color: "#222" } } },
              series: [
                { name: "Receivables", type: "bar", stack: "wc", data: MONTHS_ORDER.map(m => results.monthlyData[m]?.["Trade Receivables (Closing)"] || 0), itemStyle: { color: "#60a5fa" } },
                { name: "Inventory", type: "bar", stack: "wc", data: MONTHS_ORDER.map(m => results.monthlyData[m]?.["Inventory (Closing)"] || 0), itemStyle: { color: "#f59e0b" } },
                { name: "Payables", type: "bar", stack: "wc", data: MONTHS_ORDER.map(m => -(results.monthlyData[m]?.["Trade Payables (Closing)"] || 0)), itemStyle: { color: "#ef4444" } },
              ],
            }} />
          </div>

          {/* CFO & FCF Trend */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Cash from Operations & FCF</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              legend: { data: ["CFO", "FCF"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
              grid: { top: 30, right: 15, bottom: 30, left: 55 },
              xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => formatChartCurrency(v) }, splitLine: { lineStyle: { color: "#222" } } },
              series: [
                { name: "CFO", type: "line", smooth: true, data: MONTHS_ORDER.map(m => results.monthlyData[m]?.["Cash from Operations"] || 0), areaStyle: { color: "rgba(52,211,153,0.15)" }, lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" }, symbol: "circle", symbolSize: 4 },
                { name: "FCF", type: "line", smooth: true, data: MONTHS_ORDER.map(m => results.monthlyData[m]?.["Free Cash Flow"] || 0), lineStyle: { color: "#60a5fa", width: 2 }, itemStyle: { color: "#60a5fa" }, symbol: "circle", symbolSize: 4 },
              ],
            }} />
          </div>

          {/* Cash Conversion Cycle */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Cash Conversion Cycle</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              legend: { data: ["DSO", "DIO", "DPO", "CCC"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
              grid: { top: 30, right: 15, bottom: 30, left: 45 },
              xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", name: "days", nameTextStyle: { color: "#888", fontSize: 9 }, axisLabel: { color: "#888", fontSize: 10 }, splitLine: { lineStyle: { color: "#222" } } },
              series: [
                { name: "DSO", type: "line", data: MONTHS_ORDER.map(m => results.monthlyData[m]?.["Days Sales Outstanding (DSO)"] || 0), smooth: true, lineStyle: { color: "#60a5fa", width: 2 }, itemStyle: { color: "#60a5fa" }, symbol: "circle", symbolSize: 4 },
                { name: "DIO", type: "line", data: MONTHS_ORDER.map(m => results.monthlyData[m]?.["Days Inventory Outstanding (DIO)"] || 0), smooth: true, lineStyle: { color: "#f59e0b", width: 2 }, itemStyle: { color: "#f59e0b" }, symbol: "circle", symbolSize: 4 },
                { name: "DPO", type: "line", data: MONTHS_ORDER.map(m => results.monthlyData[m]?.["Days Payable Outstanding (DPO)"] || 0), smooth: true, lineStyle: { color: "#a78bfa", width: 2 }, itemStyle: { color: "#a78bfa" }, symbol: "circle", symbolSize: 4 },
                { name: "CCC", type: "line", data: MONTHS_ORDER.map(m => results.monthlyData[m]?.["Cash Conversion Cycle"] || 0), smooth: true, lineStyle: { color: "#ec4899", width: 2, type: "dashed" }, itemStyle: { color: "#ec4899" }, symbol: "circle", symbolSize: 5 },
              ],
            }} />
          </div>

          {/* Annual Cash Flow Donut */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Annual Cash Flow Breakdown</h3>
            <ReactECharts style={{ height: 220 }} option={{
              tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              series: [{ type: "pie", radius: ["40%", "68%"], center: ["50%", "50%"],
                label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{d}%" },
                data: [
                  { value: Math.abs(results.annual.totalCFO || 0), name: "CFO", itemStyle: { color: "#34d399" } },
                  { value: Math.abs(results.annual.totalCapEx || 0), name: "CapEx", itemStyle: { color: "#f59e0b" } },
                  { value: Math.abs(results.annual.totalChangeInWC || 0), name: "WC Change", itemStyle: { color: "#a78bfa" } },
                ].filter(d => d.value > 0),
              }],
            }} />
          </div>

          {/* Change in Working Capital Bar */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Monthly WC Change</h3>
            <ReactECharts style={{ height: 220 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 30, left: 55 },
              xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => formatChartCurrency(v) }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{
                type: "bar",
                data: MONTHS_ORDER.map(m => {
                  const v = results.monthlyData[m]?.["Change in Working Capital"] || 0;
                  return { value: v, itemStyle: { color: v >= 0 ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] } };
                }),
              }],
            }} />
          </div>

          {/* Gross Profit Trend */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Gross Profit Trend</h3>
            <ReactECharts style={{ height: 220 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 30, left: 55 },
              xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => formatChartCurrency(v) }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{
                type: "line", smooth: true,
                data: MONTHS_ORDER.map(m => results.monthlyData[m]?.["Gross Profit"] || 0),
                areaStyle: { color: "rgba(96,165,250,0.15)" },
                lineStyle: { color: "#60a5fa", width: 2 }, itemStyle: { color: "#60a5fa" }, symbol: "circle", symbolSize: 4,
              }],
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
