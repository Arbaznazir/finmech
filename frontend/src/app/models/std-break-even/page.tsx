"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link"
import { ModelBackLink } from "@/components/model-back-link";
import { ArrowLeft, TrendingUp, Save, RotateCcw, CheckCircle, XCircle } from "lucide-react";
import { FieldHint } from "@/components/FieldHint";
import { HintLabel } from "@/components/HintLabel";
import { standardHint } from "@/lib/standard-model-hints";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import {formatCurrency, formatChartCurrency} from "@/lib/utils";
import api from "@/lib/api";
import { offerSmartResultsAfterCalculate } from "@/lib/smart-results";
import { saveModelResults, clearModelResults } from "@/lib/model-link";
import { useSavedModel } from "@/lib/use-saved-model";
import {
  MONTHS_ORDER,
  calculateBreakEven,
  createEmptyMonthInputs,
  type MonthName,
  type BreakEvenMonthInputs,
} from "@/lib/breakeven-model";

const INPUT_FIELDS: { key: keyof BreakEvenMonthInputs; label: string; prefix: string }[] = [
  { key: "pricePerUnit", label: "Price Per Unit", prefix: "₹" },
  { key: "variableCostPerUnit", label: "Variable Cost Per Unit", prefix: "₹" },
  { key: "fixedCostMonthly", label: "Fixed Cost (Monthly)", prefix: "₹" },
  { key: "unitsSoldForProjection", label: "Units Sold (for projection)", prefix: "#" },
];

export default function StdBreakEvenPage() {
  const { user, hydrate } = useAuth();
  const [monthData, setMonthData] = useState<Record<string, BreakEvenMonthInputs>>(() => {
    const d: Record<string, BreakEvenMonthInputs> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyMonthInputs(); });
    return d;
  });
  const [activeMonth, setActiveMonth] = useState<MonthName>("Apr");

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "std-break-even",
    onLoad: (data: Record<string, unknown>) => {
      if (data.monthData) setMonthData(data.monthData as Record<string, BreakEvenMonthInputs>);
    },
    getState: useCallback(() => ({ monthData }), [monthData]),
  });

  useEffect(() => { hydrate(); }, [hydrate]);

  const results = useMemo(() => calculateBreakEven(monthData), [monthData]);

  const handleChange = (key: keyof BreakEvenMonthInputs, value: string) => {
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

  // Auto-persist results for downstream models
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    saveModelResults("std-break-even", results);
  }, [results]);

  const handleReset = () => {
    const d: Record<string, BreakEvenMonthInputs> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyMonthInputs(); });
    setMonthData(d);
    clearModelResults("std-break-even");
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      await api.post("/calculations", { modelSlug: "std-break-even", inputs: monthData, outputs: results });
      offerSmartResultsAfterCalculate("std-break-even", monthData, results);
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  const cur = results.monthlyData[activeMonth];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <ModelBackLink modelSlug="std-break-even" label="Back to Models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" />

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10">
            <TrendingUp className="h-7 w-7 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Break-even Model</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-primary/10 text-primary">Standard</span>
            </div>
            <p className="text-muted-foreground mt-1">Month-by-month break-even analysis. All fields are editable per month.</p>
          </div>
        </div>
        {user && (
          <button onClick={handleSave} disabled={saving || saved}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${saved ? "bg-success/10 text-success" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : saving ? "Saving..." : "Save Results"}
          </button>
        )}
      </div>

      {/* Month tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6">
        {MONTHS_ORDER.map((m) => {
          const mResult = results.monthlyData[m];
          const dot = mResult
            ? mResult.status === "GREEN"
              ? "bg-success"
              : "bg-danger"
            : "";
          return (
            <button key={m} onClick={() => setActiveMonth(m)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${activeMonth === m ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:bg-muted"}`}>
              {m}
              {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Inputs */}
        <div className="rounded-2xl border border-border bg-card p-5 output-panel" data-inputs>
          <h3 className="font-semibold text-sm mb-4">{activeMonth} Inputs</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INPUT_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="flex items-center text-xs text-muted-foreground mb-1">
                  {field.label}
                  {standardHint(field.key) && <FieldHint hint={standardHint(field.key)!} />}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.prefix}</span>
                  <input type="number" step="0.01" data-field={field.key}
                    value={monthData[activeMonth][field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="0"
                    className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-1.5">
              <RotateCcw className="h-4 w-4" /> Reset All
            </button>
          </div>
        </div>

        {/* Results sidebar */}
        <div className="space-y-4 h-fit sticky top-8">
          {cur ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center">
                    <HintLabel hint={standardHint("breakEvenUnits")}>Break-Even Units</HintLabel>
                  </p>
                  <p className="text-xl font-bold text-primary">{cur.breakEvenUnits.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border-2 border-success/30 bg-success/5 p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center">
                    <HintLabel hint={standardHint("breakEvenRevenue")}>Break-Even Revenue</HintLabel>
                  </p>
                  <p className="text-xl font-bold text-success">{formatCurrency(cur.breakEvenRevenue)}</p>
                </div>
              </div>

              <div className={`rounded-2xl p-4 text-center border-2 ${cur.isProfitable ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"}`}>
                {cur.isProfitable
                  ? <><CheckCircle className="h-6 w-6 text-success mx-auto mb-1" /><p className="text-sm font-bold text-success">PROFITABLE at {cur.unitsSoldForProjection.toLocaleString()} units</p></>
                  : <><XCircle className="h-6 w-6 text-danger mx-auto mb-1" /><p className="text-sm font-bold text-danger">NOT YET PROFITABLE</p></>
                }
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 output-panel">
                <h3 className="font-semibold text-sm mb-3">{activeMonth} Metrics</h3>
                <div className="space-y-2 text-xs">
                  {([
                    { label: "Contribution / Unit", key: "contributionPerUnit", value: formatCurrency(cur.contributionPerUnit) },
                    { label: "Revenue at Projection", key: "revenueAtUnits", value: formatCurrency(cur.revenueAtUnits) },
                    { label: "Total Cost", key: "totalCostAtUnits", value: formatCurrency(cur.totalCostAtUnits) },
                    { label: "Profit / Loss", key: "profitAtUnits", value: formatCurrency(cur.profitAtUnits) },
                  ]).map((row) => (
                    <div key={row.label} className="flex justify-between rounded-lg px-3 py-1.5 bg-background/50 border border-border/50">
                      <span className="text-muted-foreground inline-flex items-center">
                        <HintLabel hint={standardHint(row.key)}>{row.label}</HintLabel>
                      </span>
                      <span className="font-semibold">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center rounded-2xl border border-border bg-card min-h-[200px]">
              <p className="text-muted-foreground text-sm">Enter inputs to see results</p>
            </div>
          )}

          {/* Annual Summary */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Annual Total</h3>
            <div className="space-y-2 text-xs">
              {([
                { label: "Total Revenue", value: formatCurrency(results.annual.totalRevenue) },
                { label: "Total Fixed Costs", value: formatCurrency(results.annual.totalFixedCosts) },
                { label: "Total Variable Costs", value: formatCurrency(results.annual.totalVariableCosts) },
                { label: "Total Profit", value: formatCurrency(results.annual.totalProfit) },
              ]).map((row) => (
                <div key={row.label} className="flex justify-between rounded-lg px-3 py-1.5 bg-background/50 border border-border/50">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============ CHARTS ============ */}
      {results.monthsAdded.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Monthly Break-Even Units */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Break-Even Units by Month</h3>
            <ReactECharts
              style={{ height: 240 }}
              option={{
                tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                grid: { top: 30, right: 15, bottom: 30, left: 55 },
                xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10 }, splitLine: { lineStyle: { color: "#222" } } },
                series: [{
                  type: "bar",
                  data: MONTHS_ORDER.map(m => results.monthlyData[m]?.breakEvenUnits || 0),
                  itemStyle: { color: "#60a5fa", borderRadius: [4, 4, 0, 0] },
                }],
              }}
            />
          </div>

          {/* Monthly Profit Trend */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Profit / Loss Trend</h3>
            <ReactECharts
              style={{ height: 240 }}
              option={{
                tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                grid: { top: 15, right: 15, bottom: 30, left: 55 },
                xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => formatChartCurrency(v) }, splitLine: { lineStyle: { color: "#222" } } },
                series: [{
                  type: "bar",
                  data: MONTHS_ORDER.map(m => {
                    const profit = results.monthlyData[m]?.profitAtUnits || 0;
                    return {
                      value: profit,
                      itemStyle: { color: profit >= 0 ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] },
                    };
                  }),
                }],
              }}
            />
          </div>

          {/* Revenue vs Cost for Active Month */}
          {cur && cur.projection.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">{activeMonth}: Revenue vs Total Cost</h3>
              <ReactECharts
                style={{ height: 240 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  legend: { data: ["Revenue", "Total Cost"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
                  grid: { top: 30, right: 15, bottom: 25, left: 55 },
                  xAxis: { type: "category", name: "Units", nameTextStyle: { color: "#888", fontSize: 9 }, data: cur.projection.map(r => r.units.toLocaleString()), axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                  yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => formatChartCurrency(v) }, splitLine: { lineStyle: { color: "#222" } } },
                  series: [
                    { name: "Revenue", type: "line", data: cur.projection.map(r => r.revenue), smooth: true, lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" }, symbol: "circle", symbolSize: 4 },
                    { name: "Total Cost", type: "line", data: cur.projection.map(r => r.totalCost), smooth: true, lineStyle: { color: "#ef4444", width: 2 }, itemStyle: { color: "#ef4444" }, symbol: "circle", symbolSize: 4 },
                  ],
                }}
              />
            </div>
          )}

          {/* Contribution Breakdown for Active Month */}
          {cur && (
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">{activeMonth}: Contribution Breakdown</h3>
              <ReactECharts
                style={{ height: 220 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  grid: { top: 15, right: 15, bottom: 35, left: 55 },
                  xAxis: { type: "category", data: ["Price/Unit", "Var Cost", "Contribution", "Fixed", "Profit"], axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
                  yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => formatChartCurrency(v) }, splitLine: { lineStyle: { color: "#222" } } },
                  series: [{
                    type: "bar", barWidth: 28,
                    data: [
                      { value: cur.pricePerUnit, itemStyle: { color: "#60a5fa", borderRadius: [4, 4, 0, 0] } },
                      { value: cur.variableCostPerUnit, itemStyle: { color: "#ef4444", borderRadius: [4, 4, 0, 0] } },
                      { value: cur.contributionPerUnit, itemStyle: { color: "#34d399", borderRadius: [4, 4, 0, 0] } },
                      { value: cur.fixedCostMonthly, itemStyle: { color: "#f59e0b", borderRadius: [4, 4, 0, 0] } },
                      { value: cur.profitAtUnits, itemStyle: { color: cur.profitAtUnits >= 0 ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] } },
                    ],
                    label: { show: true, position: "top", color: "#aaa", fontSize: 9, formatter: (p: any) => formatChartCurrency(p.value) },
                  }],
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
