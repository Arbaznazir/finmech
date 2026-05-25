"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Save, RotateCcw } from "lucide-react";
import { FieldHint } from "@/components/FieldHint";
import { FIELD_HINTS } from "@/lib/field-hints";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { loadModelResults, saveModelResults, clearModelResults } from "@/lib/model-link";
import { useSavedModel } from "@/lib/use-saved-model";
import {
  calculateBreakEven,
  createEmptyMonthInputs,
  type BreakEvenMonthInputs,
  type BreakEvenMonthResults,
} from "@/lib/breakeven-model";

export default function InvBreakEvenPage() {
  const { user, hydrate } = useAuth();
  const [inputs, setInputs] = useState<BreakEvenMonthInputs>(createEmptyMonthInputs());
  const [results, setResults] = useState<BreakEvenMonthResults | null>(null);
  const [linkedFields, setLinkedFields] = useState<Set<string>>(new Set());

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "inv-break-even",
    onLoad: (data: Record<string, unknown>) => {
      if (data.inputs) setInputs(data.inputs as BreakEvenMonthInputs);
    },
    getState: useCallback(() => ({ inputs }), [inputs]),
  });

  useEffect(() => {
    hydrate();
    const hub = loadModelResults<Record<string, unknown>>("inv-common-utility");
    if (!hub) return;

    const linked = new Set<string>();
    const hubMonths = hub.months as Record<string, Record<string, number>> | undefined;

    // Get latest month with data
    const MONTHS = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];
    let latestMonthData: Record<string, number> | null = null;
    for (let i = MONTHS.length - 1; i >= 0; i--) {
      const d = hubMonths?.[MONTHS[i]];
      if (d && (d.revenue ?? 0) > 0) { latestMonthData = d; break; }
    }

    setInputs((prev) => {
      const next = { ...prev };
      // Fixed costs — prefer latest month, fall back to top-level
      const fc = latestMonthData?.totalFixedCosts ?? (hub.totalFixedCosts as number | undefined);
      if (fc && fc > 0) { next.fixedCostMonthly = fc; linked.add("fixedCostMonthly"); }
      return next;
    });

    if (linked.size > 0) setLinkedFields(linked);
  }, [hydrate]);

  const handleCalculate = () => {
    const monthlyData = { "Apr": inputs };
    const r = calculateBreakEven(monthlyData);
    const monthResult = r.monthlyData["Apr"];
    if (!monthResult) return;
    setResults(monthResult);
    saveModelResults("inv-break-even", {
      breakEvenUnits: monthResult.breakEvenUnits,
      breakEvenRevenue: monthResult.breakEvenRevenue,
      contributionPerUnit: monthResult.contributionPerUnit,
      fixedCostMonthly: monthResult.fixedCostMonthly,
    });
    persistState();
  };

  const handleReset = () => {
    setInputs(createEmptyMonthInputs());
    setResults(null); setLinkedFields(new Set());
    clearModelResults("inv-break-even");
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user || !results) return;
    try {
      await api.post("/calculations", { modelSlug: "inv-break-even", inputs, outputs: results });
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  const fields: { key: keyof BreakEvenMonthInputs; label: string; prefix: string; linked?: boolean }[] = [
    { key: "pricePerUnit", label: "Price Per Unit", prefix: "$" },
    { key: "variableCostPerUnit", label: "Variable Cost Per Unit", prefix: "$" },
    { key: "fixedCostMonthly", label: "Fixed Cost (Monthly)", prefix: "$", linked: linkedFields.has("fixedCostMonthly") },
    { key: "unitsSoldForProjection", label: "Units Sold (for projection)", prefix: "#" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models?tier=investor" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-400/10">
            <TrendingUp className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Break-even Model</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-amber-400/10 text-amber-400">Investor Grade</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Linked with Common Utility for integrated analysis.
              <span className="text-amber-400 ml-2 text-xs font-medium">&larr; Common Utility</span>
            </p>
          </div>
        </div>
        {results && user && (
          <button onClick={handleSave} disabled={saving || saved}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${saved ? "bg-success/10 text-success" : "bg-amber-400/10 text-amber-400 hover:bg-amber-400/20"}`}>
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : saving ? "Saving..." : "Save Results"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="rounded-2xl border border-border bg-card p-6 output-panel">
          <h2 className="font-semibold mb-5">Break-Even Inputs</h2>
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.key}>
                <div className="flex items-center gap-2 mb-1">
                  <label className="flex items-center text-xs text-muted-foreground">{field.label}{FIELD_HINTS[field.key] && <FieldHint hint={FIELD_HINTS[field.key]} />}</label>
                  {field.linked && linkedFields.has(field.key) && (
                    <span className="text-[10px] rounded px-1.5 py-0.5 bg-success/10 text-success font-medium">
                      Auto-filled
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.prefix}</span>
                  <input type="number" value={inputs[field.key] || ""}
                    onChange={(e) => {
                      setInputs((prev) => ({ ...prev, [field.key]: parseFloat(e.target.value) || 0 }));
                      markDirty();
                    }}
                    disabled={linkedFields.has(field.key)}
                    placeholder="0"
                    className={`w-full rounded-lg border pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${linkedFields.has(field.key) ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60 border-border" : "bg-input border-border"}`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleCalculate} className="flex-1 rounded-lg bg-amber-400 text-black py-2.5 text-sm font-semibold hover:bg-amber-300 transition-colors">
              Calculate Break-Even
            </button>
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        {results ? (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-amber-400/30 bg-amber-400/5 p-6 text-center output-panel-amber">
              <p className="text-sm text-muted-foreground mb-1">Break-Even Point</p>
              <p className="text-3xl font-bold text-amber-400">{results.breakEvenUnits === Infinity ? "N/A" : `${results.breakEvenUnits.toLocaleString()} units`}</p>
              <p className="text-sm text-muted-foreground mt-1">{results.breakEvenRevenue === Infinity ? "" : formatCurrency(results.breakEvenRevenue) + " revenue"}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Results</h3>
              <div className="space-y-2 text-xs">
                {([
                  { label: "Contribution/Unit", value: formatCurrency(results.contributionPerUnit) },
                  { label: "CM Ratio", value: results.pricePerUnit > 0 ? `${((results.contributionPerUnit / results.pricePerUnit) * 100).toFixed(1)}%` : "N/A" },
                  { label: "Break-Even Units", value: results.breakEvenUnits === Infinity ? "N/A" : results.breakEvenUnits.toLocaleString() },
                  { label: "Break-Even Revenue", value: results.breakEvenRevenue === Infinity ? "N/A" : formatCurrency(results.breakEvenRevenue) },
                  { label: "Fixed Costs (Monthly)", value: formatCurrency(results.fixedCostMonthly) },
                ]).map((row) => (
                  <div key={row.label} className="flex justify-between rounded-lg px-3 py-2 bg-background/50 border border-border/50">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {results.projection && results.projection.length > 0 && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-background/50"><h3 className="font-semibold text-sm">Projection Table</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border bg-background/50">
                      <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Units</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Revenue</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Total Cost</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Profit</th>
                    </tr></thead>
                    <tbody>
                      {results.projection.map((row: { units: number; revenue: number; totalCost: number; profit: number }, i: number) => (
                        <tr key={i} className={`border-b border-border/30 ${row.profit >= 0 ? "" : "text-danger/70"}`}>
                          <td className="px-3 py-2">{row.units.toLocaleString()}</td>
                          <td className="text-right px-3 py-2">{formatCurrency(row.revenue)}</td>
                          <td className="text-right px-3 py-2">{formatCurrency(row.totalCost)}</td>
                          <td className={`text-right px-3 py-2 font-semibold ${row.profit >= 0 ? "text-success" : "text-danger"}`}>{formatCurrency(row.profit)}</td>
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
          {/* Revenue vs Total Cost */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Revenue vs Total Cost</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              legend: { data: ["Revenue", "Total Cost"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
              grid: { top: 30, right: 15, bottom: 25, left: 55 },
              xAxis: { type: "category", name: "Units", nameTextStyle: { color: "#888", fontSize: 9 }, data: results.projection.map(r => r.units.toLocaleString()), axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [
                { name: "Revenue", type: "line", data: results.projection.map(r => r.revenue), smooth: true, lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" }, symbol: "circle", symbolSize: 4 },
                { name: "Total Cost", type: "line", data: results.projection.map(r => r.totalCost), smooth: true, lineStyle: { color: "#ef4444", width: 2 }, itemStyle: { color: "#ef4444" }, symbol: "circle", symbolSize: 4 },
              ],
            }} />
          </div>

          {/* Profit / Loss Bar */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Profit / Loss by Units</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 25, left: 55 },
              xAxis: { type: "category", data: results.projection.map(r => r.units.toLocaleString()), axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{ type: "bar", data: results.projection.map(r => ({ value: r.profit, itemStyle: { color: r.profit >= 0 ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] } })) }],
            }} />
          </div>

          {/* Cost Structure Donut */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Cost Structure</h3>
            <ReactECharts style={{ height: 220 }} option={{
              tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              series: [{ type: "pie", radius: ["40%", "68%"], center: ["50%", "50%"],
                label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{d}%" },
                data: [
                  { value: results.fixedCostMonthly, name: "Fixed Cost", itemStyle: { color: "#f59e0b" } },
                  { value: results.variableCostPerUnit * (inputs.unitsSoldForProjection || results.breakEvenUnits), name: "Variable Cost", itemStyle: { color: "#ef4444" } },
                ].filter(d => d.value > 0),
              }],
            }} />
          </div>

          {/* Contribution Breakdown */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Contribution Breakdown</h3>
            <ReactECharts style={{ height: 220 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 35, left: 55 },
              xAxis: { type: "category", data: ["Price/Unit", "Var Cost/Unit", "Contribution/Unit", "Fixed Cost", "Profit/Loss"], axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{ type: "bar", barWidth: 28,
                data: [
                  { value: results.pricePerUnit, itemStyle: { color: "#60a5fa", borderRadius: [4, 4, 0, 0] } },
                  { value: results.variableCostPerUnit, itemStyle: { color: "#ef4444", borderRadius: [4, 4, 0, 0] } },
                  { value: results.contributionPerUnit, itemStyle: { color: "#34d399", borderRadius: [4, 4, 0, 0] } },
                  { value: results.fixedCostMonthly, itemStyle: { color: "#f59e0b", borderRadius: [4, 4, 0, 0] } },
                  { value: results.profitAtUnits, itemStyle: { color: results.profitAtUnits >= 0 ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] } },
                ],
                label: { show: true, position: "top", color: "#aaa", fontSize: 9, formatter: (p: any) => `$${p.value.toLocaleString()}` },
              }],
            }} />
          </div>

          {/* CM Ratio Gauge */}
          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
            <h3 className="font-semibold text-sm mb-3">Contribution Margin Ratio</h3>
            <ReactECharts style={{ height: 200 }} option={{
              series: [{
                type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: 100,
                pointer: { show: true, length: "60%", width: 4, itemStyle: { color: "#60a5fa" } },
                axisLine: { lineStyle: { width: 20, color: [[0.25, "#ef4444"], [0.5, "#f59e0b"], [1, "#34d399"]] } },
                axisTick: { show: false }, splitLine: { show: false },
                axisLabel: { color: "#888", fontSize: 9, distance: 25 },
                detail: { valueAnimation: true, formatter: "{value}%", color: "#e0e0e0", fontSize: 20, offsetCenter: [0, "70%"] },
                data: [{ value: results.pricePerUnit > 0 ? Math.round((results.contributionPerUnit / results.pricePerUnit) * 1000) / 10 : 0 }],
              }],
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
