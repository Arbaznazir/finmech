"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Save, RotateCcw, CheckCircle, XCircle } from "lucide-react";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { loadModelResults, saveModelResults, clearModelResults } from "@/lib/model-link";
import { useSavedModel } from "@/lib/use-saved-model";
import {
  calculateBreakEven,
  type BreakEvenInputs,
  type BreakEvenResults,
} from "@/lib/breakeven-model";

export default function StdBreakEvenPage() {
  const { user, hydrate } = useAuth();
  const [inputs, setInputs] = useState<BreakEvenInputs>({
    pricePerUnit: 0, variableCostPerUnit: 0, fixedCostMonthly: 0, unitsSoldForProjection: 0,
  });
  const [results, setResults] = useState<BreakEvenResults | null>(null);
  const [linkedFields, setLinkedFields] = useState<Set<string>>(new Set());

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "std-break-even",
    onLoad: (data: Record<string, unknown>) => {
      if (data.inputs) setInputs(data.inputs as BreakEvenInputs);
    },
    getState: useCallback(() => ({ inputs }), [inputs]),
  });

  useEffect(() => {
    hydrate();
    const hub = loadModelResults<Record<string, number>>("std-common-utility");
    const linked = new Set<string>();
    if (hub) {
      setInputs((prev) => {
        const next = { ...prev };
        if (hub.totalFixedCosts > 0) { next.fixedCostMonthly = hub.totalFixedCosts; linked.add("fixedCostMonthly"); }
        return next;
      });
    }
    setLinkedFields(linked);
  }, [hydrate]);

  const handleChange = (key: keyof BreakEvenInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    markDirty();
  };

  const handleCalculate = () => {
    const r = calculateBreakEven(inputs);
    setResults(r);
    saveModelResults("std-break-even", {
      breakEvenUnits: r.breakEvenUnits,
      breakEvenRevenue: r.breakEvenRevenue,
      contributionPerUnit: r.contributionPerUnit,
      fixedCostMonthly: r.fixedCostMonthly,
    });
  };

  const handleReset = () => {
    setInputs({ pricePerUnit: 0, variableCostPerUnit: 0, fixedCostMonthly: 0, unitsSoldForProjection: 0 });
    setResults(null); setLinkedFields(new Set());
    clearModelResults("std-break-even");
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user || !results) return;
    try {
      await api.post("/calculations", { modelSlug: "std-break-even", inputs, outputs: results });
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  const fields: { key: keyof BreakEvenInputs; label: string; prefix: string; linked?: boolean }[] = [
    { key: "pricePerUnit", label: "Price Per Unit", prefix: "$" },
    { key: "variableCostPerUnit", label: "Variable Cost Per Unit", prefix: "$" },
    { key: "fixedCostMonthly", label: "Fixed Cost (Monthly)", prefix: "$", linked: true },
    { key: "unitsSoldForProjection", label: "Units Sold (for projection)", prefix: "#" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10">
            <TrendingUp className="h-7 w-7 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Break-even Model</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-primary/10 text-primary">Standard</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Linked with Common Utility for integrated analysis.
              <span className="text-blue-400 ml-2 text-xs font-medium">&larr; Common Utility</span>
            </p>
          </div>
        </div>
        {results && user && (
          <button onClick={handleSave} disabled={saving || saved}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${saved ? "bg-success/10 text-success" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : saving ? "Saving..." : "Save Results"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-6" data-inputs>
          <h2 className="font-semibold mb-5">Break-Even Inputs</h2>
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.key}>
                <div className="flex items-center gap-2 mb-1">
                  <label className="block text-xs text-muted-foreground">{field.label}</label>
                  {field.linked && linkedFields.has(field.key) && (
                    <span className="text-[10px] rounded px-1.5 py-0.5 text-success bg-success/10">
                      Auto-filled
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.prefix}</span>
                  <input type="number" step="0.01" data-field={field.key}
                    value={inputs[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    disabled={linkedFields.has(field.key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const all = Array.from((e.currentTarget.closest("[data-inputs]") || document).querySelectorAll<HTMLInputElement>("input[data-field]"));
                        const idx = all.indexOf(e.currentTarget);
                        if (idx >= 0 && idx < all.length - 1) all[idx + 1].focus();
                        else handleCalculate();
                      }
                    }}
                    placeholder="0"
                    className={`w-full rounded-lg border border-border pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${linkedFields.has(field.key) ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60" : "bg-input"}`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button onClick={handleCalculate} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
              Calculate Break-Even
            </button>
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {results ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 text-center">
                <p className="text-xs text-muted-foreground mb-1">Break-Even Units</p>
                <p className="text-2xl font-bold text-primary">{results.breakEvenUnits.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border-2 border-success/30 bg-success/5 p-5 text-center">
                <p className="text-xs text-muted-foreground mb-1">Break-Even Revenue</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(results.breakEvenRevenue)}</p>
              </div>
            </div>
            <div className={`rounded-2xl p-4 text-center border-2 ${results.isProfitable ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"}`}>
              {results.isProfitable
                ? <><CheckCircle className="h-6 w-6 text-success mx-auto mb-1" /><p className="text-sm font-bold text-success">PROFITABLE at {inputs.unitsSoldForProjection.toLocaleString()} units</p></>
                : <><XCircle className="h-6 w-6 text-danger mx-auto mb-1" /><p className="text-sm font-bold text-danger">NOT YET PROFITABLE</p></>
              }
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">Key Metrics</h3>
              <div className="space-y-2">
                {([
                  { label: "Contribution / Unit", value: formatCurrency(results.contributionPerUnit) },
                  { label: "Revenue at Projection", value: formatCurrency(results.revenueAtUnits) },
                  { label: "Total Cost at Projection", value: formatCurrency(results.totalCostAtUnits) },
                  { label: "Profit / Loss", value: formatCurrency(results.profitAtUnits) },
                ]).map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-lg px-3 py-2 bg-background/50 border border-border/50">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className="text-sm font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {results.projection.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-sm mb-3">Projection Table</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 pr-3">Units</th>
                      <th className="text-right py-2 px-3">Revenue</th>
                      <th className="text-right py-2 px-3">Total Cost</th>
                      <th className="text-right py-2 pl-3">Profit</th>
                    </tr></thead>
                    <tbody>
                      {results.projection.map((row) => (
                        <tr key={row.units} className={`border-b border-border/50 ${row.units === results.breakEvenUnits ? "bg-primary/5 font-bold" : ""}`}>
                          <td className="py-1.5 pr-3">{row.units.toLocaleString()}</td>
                          <td className="text-right py-1.5 px-3">{formatCurrency(row.revenue)}</td>
                          <td className="text-right py-1.5 px-3">{formatCurrency(row.totalCost)}</td>
                          <td className={`text-right py-1.5 pl-3 ${row.profit >= 0 ? "text-success" : "text-danger"}`}>{formatCurrency(row.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card min-h-[300px]">
            <p className="text-muted-foreground text-sm">Enter inputs and click Calculate</p>
          </div>
        )}
      </div>

      {/* ============ CHARTS ============ */}
      {results && results.projection.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Revenue vs Total Cost Crossover */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Revenue vs Total Cost</h3>
            <ReactECharts
              style={{ height: 240 }}
              option={{
                tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                legend: { data: ["Revenue", "Total Cost"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
                grid: { top: 30, right: 15, bottom: 25, left: 55 },
                xAxis: { type: "category", name: "Units", nameTextStyle: { color: "#888", fontSize: 9 }, data: results.projection.map(r => r.units.toLocaleString()), axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
                series: [
                  { name: "Revenue", type: "line", data: results.projection.map(r => r.revenue), smooth: true, lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" }, symbol: "circle", symbolSize: 4 },
                  { name: "Total Cost", type: "line", data: results.projection.map(r => r.totalCost), smooth: true, lineStyle: { color: "#ef4444", width: 2 }, itemStyle: { color: "#ef4444" }, symbol: "circle", symbolSize: 4 },
                ],
              }}
            />
          </div>

          {/* Profit / Loss Area */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Profit / Loss by Units</h3>
            <ReactECharts
              style={{ height: 240 }}
              option={{
                tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                grid: { top: 15, right: 15, bottom: 25, left: 55 },
                xAxis: { type: "category", data: results.projection.map(r => r.units.toLocaleString()), axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
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

          {/* Cost Structure Donut */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Cost Structure</h3>
            <ReactECharts
              style={{ height: 220 }}
              option={{
                tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                series: [{
                  type: "pie", radius: ["40%", "68%"], center: ["50%", "50%"],
                  label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{d}%" },
                  data: [
                    { value: results.fixedCostMonthly, name: "Fixed Cost", itemStyle: { color: "#f59e0b" } },
                    { value: results.variableCostPerUnit * (inputs.unitsSoldForProjection || results.breakEvenUnits), name: "Variable Cost", itemStyle: { color: "#ef4444" } },
                  ].filter(d => d.value > 0),
                }],
              }}
            />
          </div>

          {/* Contribution Waterfall */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Contribution Breakdown</h3>
            <ReactECharts
              style={{ height: 220 }}
              option={{
                tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                grid: { top: 15, right: 15, bottom: 35, left: 55 },
                xAxis: { type: "category", data: ["Price/Unit", "Var Cost/Unit", "Contribution/Unit", "Fixed Cost", "Profit/Loss"], axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
                yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
                series: [{
                  type: "bar", barWidth: 28,
                  data: [
                    { value: results.pricePerUnit, itemStyle: { color: "#60a5fa", borderRadius: [4, 4, 0, 0] } },
                    { value: results.variableCostPerUnit, itemStyle: { color: "#ef4444", borderRadius: [4, 4, 0, 0] } },
                    { value: results.contributionPerUnit, itemStyle: { color: "#34d399", borderRadius: [4, 4, 0, 0] } },
                    { value: results.fixedCostMonthly, itemStyle: { color: "#f59e0b", borderRadius: [4, 4, 0, 0] } },
                    { value: results.profitAtUnits, itemStyle: { color: results.profitAtUnits >= 0 ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] } },
                  ],
                  label: { show: true, position: "top", color: "#aaa", fontSize: 9, formatter: (p: any) => `$${p.value.toLocaleString()}` },
                }],
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
