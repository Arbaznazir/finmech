"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Scale, Save, RotateCcw } from "lucide-react";
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
  calculateBalanceSheet,
  createEmptyInputs,
  type MonthName,
} from "@/lib/balance-sheet-model";

export default function InvBalanceSheetPage() {
  const { user, hydrate } = useAuth();
  const [monthData, setMonthData] = useState<Record<string, Record<string, number>>>(() => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyInputs() as Record<string, number>; });
    return d;
  });
  const [activeMonth, setActiveMonth] = useState<MonthName>("Apr");
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set());
  const [autoLinked, setAutoLinked] = useState(false);
  const [cumulativeNetProfits, setCumulativeNetProfits] = useState<Record<string, number>>({});

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "inv-balance-sheet",
    onLoad: (data: Record<string, unknown>) => {
      if (data.monthData) setMonthData(data.monthData as Record<string, Record<string, number>>);
    },
    getState: useCallback(() => ({ monthData }), [monthData]),
  });

  // Auto-fill from Income Statement, Cash Flow & Movements
  useEffect(() => {
    hydrate();
    const locked = new Set<string>();

    // Pull from Income Statement for cumulative retained earnings
    const hub = loadModelResults<Record<string, unknown>>("inv-common-utility");
    const hubMonths = hub?.months as Record<string, Record<string, number>> | undefined;
    const cumProfits: Record<string, number> = {};
    if (hubMonths) {
      let running = 0;
      MONTHS_ORDER.forEach((m) => {
        if (hubMonths[m]?.netProfit !== undefined) {
          running += hubMonths[m].netProfit;
        }
        cumProfits[m] = running;
      });
      setCumulativeNetProfits(cumProfits);
    }

    setMonthData((prev) => {
      const next = { ...prev };

      // Pull from Cash Flow
      const cf = loadModelResults<Record<string, unknown>>("inv-cash-flow");
      const cfMonths = cf?.monthlyData as Record<string, Record<string, number>> | undefined;

      // Pull from Movements
      const mov = loadModelResults<Record<string, unknown>>("inv-movements");
      const movMonths = mov?.monthlyData as Record<string, Record<string, number>> | undefined;

      MONTHS_ORDER.forEach((m) => {
        next[m] = { ...next[m] };

        // Cash from Cash Flow
        if (cfMonths?.[m]) {
          const c = cfMonths[m];
          if (c["Cumulative Cash"] !== undefined) {
            next[m]["Cash & Cash Equivalents (Cash at bank included)"] = c["Cumulative Cash"];
            locked.add(`${m}::Cash & Cash Equivalents (Cash at bank included)`);
          }
        }

        // Receivables, Inventory, Payables from Movements
        if (movMonths?.[m]) {
          const mv = movMonths[m];
          if (mv["Trade Receivables (Closing)"] > 0) {
            next[m]["Trade Receivables (Debtors)"] = mv["Trade Receivables (Closing)"];
            locked.add(`${m}::Trade Receivables (Debtors)`);
          }
          if (mv["Inventory (Closing)"] > 0) {
            next[m]["Inventory / Stock"] = mv["Inventory (Closing)"];
            locked.add(`${m}::Inventory / Stock`);
          }
          if (mv["Trade Payables (Closing)"] > 0) {
            next[m]["Trade Payables (Creditors)"] = mv["Trade Payables (Closing)"];
            locked.add(`${m}::Trade Payables (Creditors)`);
          }
        }
      });

      return next;
    });

    if (locked.size > 0) { setAutoLinked(true); setLockedFields(locked); }
  }, [hydrate]);

  const results = useMemo(() => calculateBalanceSheet(monthData, cumulativeNetProfits), [monthData, cumulativeNetProfits]);

  // Persist to localStorage
  useEffect(() => {
    saveModelResults("inv-balance-sheet", {
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
    setAutoLinked(false);
    setLockedFields(new Set());
    clearModelResults("inv-balance-sheet");
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      await api.post("/calculations", {
        modelSlug: "inv-balance-sheet",
        inputs: monthData,
        outputs: { monthlyData: results.monthlyData, annual: results.annual },
      });
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  const cur = results.monthlyData[activeMonth];
  const categories = [...new Set(INPUT_FIELDS.map((f) => f.category))];
  const outputSections = [...new Set(OUTPUT_FIELDS.map((f) => f.section))];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models/inv-common-utility" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Common Utility Hub
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-400/10">
            <Scale className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Balance Sheet</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-amber-400/10 text-amber-400">Investor Grade</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Assets, Equity &amp; Liabilities with balance check. Auto-pulls from Cash Flow &amp; Movements.
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

      {autoLinked && (
        <div className="rounded-xl bg-success/5 border border-success/20 p-3 mb-6">
          <p className="text-xs text-success font-medium">Auto-filled: Cash from Cash Flow, Receivables/Inventory/Payables from Movements.</p>
        </div>
      )}

      {/* Month tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6">
        {MONTHS_ORDER.map((m) => {
          const status = results.status.find((s) => s.month === m);
          const balOk = status ? Math.abs(status.balanceCheck) < 1 : true;
          return (
            <button key={m} onClick={() => setActiveMonth(m)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${activeMonth === m ? "bg-amber-400 text-black" : balOk ? "bg-card border border-border hover:bg-muted" : "bg-danger/10 border border-danger/30 text-danger"}`}>
              {m}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Inputs */}
        <div className="space-y-5" data-inputs>
          {categories.map((cat) => (
            <div key={cat} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">{cat}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INPUT_FIELDS.filter((f) => f.category === cat).map((field) => {
                  const isLocked = lockedFields.has(`${activeMonth}::${field.key}`);
                  return (
                    <div key={field.key}>
                      <label className="block text-xs text-muted-foreground mb-1">
                        {field.label}
                        {isLocked && <span className="ml-1 text-[10px] text-amber-400/70">(auto-filled)</span>}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
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
          <div className="flex gap-3">
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4 h-fit sticky top-8">
          {outputSections.map((section) => (
            <div key={section} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">{section}</h3>
              {cur ? (
                <div className="space-y-2">
                  {OUTPUT_FIELDS.filter((f) => f.section === section).map((f) => {
                    const val = cur[f.key] ?? 0;
                    const isCheck = f.format === "check";
                    const isRatio = f.format === "ratio";
                    return (
                      <div key={f.key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{f.label}</span>
                        <span className={`font-medium ${isCheck ? (Math.abs(val) < 1 ? "text-success" : "text-danger") : ""}`}>
                          {isCheck
                            ? (Math.abs(val) < 1 ? "✓ Balanced" : `⚠ Off by ${formatCurrency(Math.abs(val))}`)
                            : isRatio
                              ? val.toFixed(2)
                              : formatCurrency(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Enter inputs to see results.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ============ CHARTS ============ */}
      {results.monthsAdded.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Total Assets vs Total Liabilities + Equity */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Assets vs Liabilities + Equity</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              legend: { data: ["Total Assets", "Total L+E"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
              grid: { top: 30, right: 15, bottom: 30, left: 55 },
              xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [
                { name: "Total Assets", type: "line", data: MONTHS_ORDER.map(m => results.monthlyData[m]?.["Total Assets"] || 0), smooth: true, lineStyle: { color: "#60a5fa", width: 2 }, itemStyle: { color: "#60a5fa" }, symbol: "circle", symbolSize: 5 },
                { name: "Total L+E", type: "line", data: MONTHS_ORDER.map(m => (results.monthlyData[m]?.["Total Equity"] || 0) + (results.monthlyData[m]?.["Total Liabilities"] || 0)), smooth: true, lineStyle: { color: "#34d399", width: 2, type: "dashed" }, itemStyle: { color: "#34d399" }, symbol: "circle", symbolSize: 5 },
              ],
            }} />
          </div>

          {/* Asset Composition Donut (active month) */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Asset Composition ({activeMonth})</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              series: [{ type: "pie", radius: ["35%", "65%"], center: ["50%", "50%"],
                label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{d}%" },
                data: [
                  { value: Math.abs(cur?.["Total Non-Current Assets"] || 0), name: "Non-Current", itemStyle: { color: "#60a5fa" } },
                  { value: Math.abs(cur?.["Cash & Cash Equivalents (Cash at bank included)"] || 0), name: "Cash", itemStyle: { color: "#34d399" } },
                  { value: Math.abs(cur?.["Trade Receivables (Debtors)"] || 0), name: "Receivables", itemStyle: { color: "#f59e0b" } },
                  { value: Math.abs(cur?.["Inventory / Stock"] || 0), name: "Inventory", itemStyle: { color: "#a78bfa" } },
                ].filter(d => d.value > 0),
              }],
            }} />
          </div>

          {/* Working Capital Trend */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Working Capital Trend</h3>
            <ReactECharts style={{ height: 220 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 30, left: 55 },
              xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{
                type: "bar",
                data: MONTHS_ORDER.map(m => {
                  const v = results.monthlyData[m]?.["Working Capital"] || 0;
                  return { value: v, itemStyle: { color: v >= 0 ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] } };
                }),
              }],
            }} />
          </div>

          {/* Current Ratio Gauge */}
          {(() => {
            const latestStatus = results.status[results.status.length - 1];
            return (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-sm mb-3">Current Ratio (Latest)</h3>
                <ReactECharts style={{ height: 220 }} option={{
                  series: [{
                    type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: 4,
                    pointer: { show: true, length: "60%", width: 4, itemStyle: { color: "#60a5fa" } },
                    axisLine: { lineStyle: { width: 20, color: [[0.25, "#ef4444"], [0.5, "#f59e0b"], [1, "#34d399"]] } },
                    axisTick: { show: false }, splitLine: { show: false },
                    axisLabel: { color: "#888", fontSize: 9, distance: 25 },
                    detail: { valueAnimation: true, formatter: "{value}x", color: "#e0e0e0", fontSize: 20, offsetCenter: [0, "70%"] },
                    data: [{ value: Math.round(latestStatus.currentRatio * 100) / 100 }],
                  }],
                }} />
              </div>
            );
          })()}

          {/* Liabilities vs Equity Breakdown */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Liabilities vs Equity ({activeMonth})</h3>
            <ReactECharts style={{ height: 220 }} option={{
              tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              series: [{ type: "pie", radius: ["40%", "68%"], center: ["50%", "50%"],
                label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{d}%" },
                data: [
                  { value: Math.abs(cur?.["Total Equity"] || 0), name: "Equity", itemStyle: { color: "#34d399" } },
                  { value: Math.abs(cur?.["Total Non-Current Liabilities"] || 0), name: "Non-Current Liab", itemStyle: { color: "#f59e0b" } },
                  { value: Math.abs(cur?.["Total Current Liabilities"] || 0), name: "Current Liab", itemStyle: { color: "#ef4444" } },
                ].filter(d => d.value > 0),
              }],
            }} />
          </div>

          {/* Balance Check Status */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Balance Check Status</h3>
            <ReactECharts style={{ height: 220 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 30, left: 55 },
              xAxis: { type: "category", data: results.status.map(s => s.month), axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{
                type: "bar",
                data: results.status.map(s => ({
                  value: Math.abs(s.balanceCheck),
                  itemStyle: { color: s.status === "GREEN" ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] },
                })),
                markLine: { data: [{ yAxis: 1, lineStyle: { color: "#f59e0b", type: "dashed" } }], label: { formatter: "Threshold", color: "#f59e0b", fontSize: 9 }, symbol: "none" },
              }],
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
