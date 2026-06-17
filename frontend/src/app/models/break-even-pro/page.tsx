"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft, TrendingUp, Save, RotateCcw,
  CheckCircle, XCircle,
} from "lucide-react";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { useSavedModel } from "@/lib/use-saved-model";
import { offerSmartResultsAfterCalculate } from "@/lib/smart-results";
import {
  calculateBreakEven,
  createEmptyMonthInputs,
  type BreakEvenMonthInputs,
  type BreakEvenMonthResults,
} from "@/lib/breakeven-model";

export default function BreakEvenPage() {
  const { user, hydrate } = useAuth();
  const [inputs, setInputs] = useState<BreakEvenMonthInputs>(createEmptyMonthInputs());
  const [results, setResults] = useState<BreakEvenMonthResults | null>(null);
  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "break-even-pro",
    onLoad: (data: Record<string, unknown>) => {
      if (data.inputs) setInputs(data.inputs as BreakEvenMonthInputs);
    },
    getState: useCallback(() => ({ inputs }), [inputs]),
  });

  useEffect(() => { hydrate(); }, [hydrate]);

  const handleChange = (key: keyof BreakEvenMonthInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    markDirty();
  };

  const handleCalculate = () => {
    if (inputs.pricePerUnit <= 0) return;
    const monthlyData = { "Apr": inputs };
    const fullResults = calculateBreakEven(monthlyData);
    const monthResult = fullResults.monthlyData["Apr"] || null;
    setResults(monthResult);
    if (monthResult) offerSmartResultsAfterCalculate("break-even-pro", inputs, monthResult);
    persistState();
  };

  const handleReset = () => {
    setInputs(createEmptyMonthInputs());
    setResults(null);
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user || !results) return;
    try {
      await api.post("/calculations", {
        modelSlug: "break-even-pro",
        inputs,
        outputs: results,
      });
      await persistState();
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const fields: { key: keyof BreakEvenMonthInputs; label: string; prefix: string; placeholder: string }[] = [
    { key: "pricePerUnit", label: "Selling Price per Unit", prefix: "$", placeholder: "3000" },
    { key: "variableCostPerUnit", label: "Variable Cost per Unit", prefix: "$", placeholder: "2295" },
    { key: "fixedCostMonthly", label: "Fixed Cost (Monthly)", prefix: "$", placeholder: "87500" },
    { key: "unitsSoldForProjection", label: "Units Sold (for projection)", prefix: "#", placeholder: "200" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <Link href="/models?tier=standalone" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-green-400/10">
            <TrendingUp className="h-7 w-7 text-green-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Break-Even Model</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-blue-400/10 text-blue-400">
                Standalone
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              Contribution, break-even units &amp; revenue with full projection table.
            </p>
          </div>
        </div>
        {results && user && (
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              saved ? "bg-success/10 text-success" : "bg-primary/10 text-primary hover:bg-primary/20"
            }`}
          >
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : saving ? "Saving..." : "Save Results"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Input Panel */}
        <div className="rounded-2xl border border-border bg-card p-6 output-panel" data-inputs>
          <h2 className="font-semibold mb-5">Parameters</h2>
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm text-muted-foreground mb-1.5">{field.label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.prefix}</span>
                  <input
                    type="number"
                    data-field={field.key}
                    value={inputs[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const allInputs = Array.from(
                          (e.currentTarget.closest("[data-inputs]") || document)
                            .querySelectorAll<HTMLInputElement>("input[data-field]")
                        );
                        const idx = allInputs.indexOf(e.currentTarget);
                        if (idx >= 0 && idx < allInputs.length - 1) {
                          allInputs[idx + 1].focus();
                        } else {
                          handleCalculate();
                        }
                      }
                    }}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button
              onClick={handleCalculate}
              disabled={inputs.pricePerUnit <= 0}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              Calculate Break-Even
            </button>
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results Panel */}
        {results ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Contribution / Unit</p>
                <p className="text-xl font-bold">{formatCurrency(results.contributionPerUnit)}</p>
              </div>
              <div className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Break-Even Units</p>
                <p className="text-xl font-bold">
                  {results.breakEvenUnits === Infinity ? "∞" : results.breakEvenUnits.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Break-Even Revenue</p>
                <p className="text-xl font-bold">
                  {results.breakEvenRevenue === Infinity ? "∞" : formatCurrency(results.breakEvenRevenue)}
                </p>
              </div>
              <div className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Revenue at {results.unitsSoldForProjection} units</p>
                <p className="text-xl font-bold">{formatCurrency(results.revenueAtUnits)}</p>
              </div>
              <div className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Cost at {results.unitsSoldForProjection} units</p>
                <p className="text-xl font-bold">{formatCurrency(results.totalCostAtUnits)}</p>
              </div>
              <div className={`rounded-xl border p-4 ${results.status === "GREEN" ? "bg-success/5 border-success/30" : "bg-danger/5 border-danger/30"}`}>
                <p className="text-xs text-muted-foreground mb-1">Profit at {results.unitsSoldForProjection} units</p>
                <div className="flex items-center gap-2">
                  {results.status === "GREEN"
                    ? <CheckCircle className="h-5 w-5 text-success" />
                    : <XCircle className="h-5 w-5 text-danger" />}
                  <p className={`text-xl font-bold ${results.status === "GREEN" ? "text-success" : "text-danger"}`}>
                    {formatCurrency(results.profitAtUnits)}
                  </p>
                </div>
              </div>
            </div>

            {/* Projection Table */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-background/50">
                <h2 className="font-semibold text-sm">Projection Table</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background/50">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Units</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Revenue</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Total Cost</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Profit / Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.projection.map((row) => {
                      const isBreakEven = row.units === results.breakEvenUnits;
                      const isProjection = row.units === results.unitsSoldForProjection && results.unitsSoldForProjection > 0;
                      return (
                        <tr
                          key={row.units}
                          className={`border-b border-border/30 ${
                            isBreakEven ? "bg-amber-400/5" : isProjection ? "bg-primary/5" : ""
                          }`}
                        >
                          <td className="px-4 py-2.5 font-medium">
                            {row.units.toLocaleString()}
                            {isBreakEven && <span className="ml-2 text-xs text-amber-400 font-semibold">BE</span>}
                            {isProjection && !isBreakEven && <span className="ml-2 text-xs text-primary font-semibold">PROJ</span>}
                          </td>
                          <td className="text-right px-4 py-2.5">{formatCurrency(row.revenue)}</td>
                          <td className="text-right px-4 py-2.5">{formatCurrency(row.totalCost)}</td>
                          <td className={`text-right px-4 py-2.5 font-semibold ${row.profit >= 0 ? "text-success" : "text-danger"}`}>
                            {formatCurrency(row.profit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card min-h-[300px]">
            <p className="text-muted-foreground text-sm">Enter parameters and click Calculate</p>
          </div>
        )}
      </div>

      {/* ============ CHARTS ============ */}
      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Revenue vs Total Cost Crossover */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Revenue vs Total Cost</h3>
            <ReactECharts
              style={{ height: 260 }}
              option={{
                tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                legend: { data: ["Revenue", "Total Cost"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
                grid: { top: 30, right: 15, bottom: 30, left: 55 },
                xAxis: { type: "category", name: "Units", nameTextStyle: { color: "#888", fontSize: 10 }, data: results.projection.map(r => r.units.toLocaleString()), axisLabel: { color: "#888", fontSize: 9, rotate: 30 }, axisLine: { lineStyle: { color: "#333" } } },
                yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
                series: [
                  { name: "Revenue", type: "line", data: results.projection.map(r => r.revenue), smooth: true, lineStyle: { color: "#60a5fa", width: 2 }, itemStyle: { color: "#60a5fa" }, symbol: "circle", symbolSize: 4 },
                  { name: "Total Cost", type: "line", data: results.projection.map(r => r.totalCost), smooth: true, lineStyle: { color: "#ef4444", width: 2 }, itemStyle: { color: "#ef4444" }, symbol: "circle", symbolSize: 4 },
                ],
              }}
            />
          </div>

          {/* Profit/Loss Area */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Profit / Loss by Units</h3>
            <ReactECharts
              style={{ height: 260 }}
              option={{
                tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                grid: { top: 15, right: 15, bottom: 30, left: 55 },
                xAxis: { type: "category", data: results.projection.map(r => r.units.toLocaleString()), axisLabel: { color: "#888", fontSize: 9, rotate: 30 }, axisLine: { lineStyle: { color: "#333" } } },
                yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => `$${(v/1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: "#222" } } },
                series: [{
                  type: "bar",
                  data: results.projection.map(r => ({
                    value: r.profit,
                    itemStyle: { color: r.profit >= 0 ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] },
                  })),
                }],
              }}
            />
          </div>

          {/* Contribution Waterfall */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Contribution Waterfall</h3>
            <ReactECharts
              style={{ height: 220 }}
              option={{
                tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                grid: { top: 15, right: 15, bottom: 35, left: 55 },
                xAxis: { type: "category", data: ["Price/Unit", "Var Cost", "Contribution", "Fixed Cost", "Profit"], axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => `$${v.toLocaleString()}` }, splitLine: { lineStyle: { color: "#222" } } },
                series: [
                  { type: "bar", stack: "w", itemStyle: { borderColor: "transparent", color: "transparent" }, emphasis: { itemStyle: { borderColor: "transparent", color: "transparent" } },
                    data: [0, results.pricePerUnit - results.variableCostPerUnit, 0, Math.max(0, results.contributionPerUnit - results.fixedCostMonthly / Math.max(1, results.unitsSoldForProjection)), 0] },
                  { type: "bar", stack: "w", data: [
                    { value: results.pricePerUnit, itemStyle: { color: "#60a5fa", borderRadius: [4, 4, 0, 0] } },
                    { value: results.variableCostPerUnit, itemStyle: { color: "#ef4444", borderRadius: [4, 4, 0, 0] } },
                    { value: results.contributionPerUnit, itemStyle: { color: "#34d399", borderRadius: [4, 4, 0, 0] } },
                    { value: results.fixedCostMonthly / Math.max(1, results.unitsSoldForProjection), itemStyle: { color: "#f59e0b", borderRadius: [4, 4, 0, 0] } },
                    { value: Math.abs(results.profitAtUnits / Math.max(1, results.unitsSoldForProjection)), itemStyle: { color: results.profitAtUnits >= 0 ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] } },
                  ] },
                ],
              }}
            />
          </div>

          {/* Cost Structure Donut */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Cost Structure at Projection</h3>
            <ReactECharts
              style={{ height: 220 }}
              option={{
                tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                series: [{
                  type: "pie", radius: ["40%", "68%"], center: ["50%", "50%"],
                  label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{d}%" },
                  data: [
                    { value: results.fixedCostMonthly, name: "Fixed Costs", itemStyle: { color: "#f59e0b" } },
                    { value: results.variableCostPerUnit * results.unitsSoldForProjection, name: "Variable Costs", itemStyle: { color: "#ef4444" } },
                  ].filter(d => d.value > 0),
                }],
              }}
            />
          </div>
        </div>
      )}

      {!user && results && (
        <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <p className="text-muted-foreground mb-3">Sign up to save your Break-Even analysis</p>
          <Link href="/signup" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
            Create Free Account
          </Link>
        </div>
      )}
    </div>
  );
}
