"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Gem, Save, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { useSavedModel } from "@/lib/use-saved-model";
import {
  calculateDCF,
  createDefaultInputs,
  type DCFInputs,
  type DCFResults,
  type DCFYearData,
} from "@/lib/dcf-valuation-model";

interface InputField {
  key: keyof DCFInputs;
  label: string;
  category: string;
  type: "currency" | "percent" | "decimal";
  step?: string;
}

const INPUT_FIELDS: InputField[] = [
  // Base Year
  { key: "baseYearRevenue", label: "Base Year Revenue", category: "Base Year", type: "currency" },
  
  // Growth Assumptions
  { key: "revenueGrowthY1", label: "Revenue Growth Y1", category: "Growth Assumptions", type: "percent", step: "0.01" },
  { key: "revenueGrowthY2", label: "Revenue Growth Y2", category: "Growth Assumptions", type: "percent", step: "0.01" },
  { key: "revenueGrowthY3", label: "Revenue Growth Y3", category: "Growth Assumptions", type: "percent", step: "0.01" },
  { key: "revenueGrowthY4", label: "Revenue Growth Y4", category: "Growth Assumptions", type: "percent", step: "0.01" },
  { key: "revenueGrowthY5", label: "Revenue Growth Y5", category: "Growth Assumptions", type: "percent", step: "0.01" },
  
  // Operating Assumptions
  { key: "ebitdaMargin", label: "EBITDA Margin", category: "Operating Assumptions", type: "percent", step: "0.001" },
  { key: "depreciationPct", label: "Depreciation %", category: "Operating Assumptions", type: "percent", step: "0.0001" },
  { key: "capexPct", label: "CapEx %", category: "Operating Assumptions", type: "percent", step: "0.01" },
  { key: "workingCapitalPct", label: "Working Capital %", category: "Operating Assumptions", type: "percent", step: "0.01" },
  
  // WACC Inputs
  { key: "taxRate", label: "Tax Rate", category: "WACC Inputs", type: "percent", step: "0.01" },
  { key: "riskFreeRate", label: "Risk Free Rate", category: "WACC Inputs", type: "percent", step: "0.01" },
  { key: "equityRiskPremium", label: "Equity Risk Premium", category: "WACC Inputs", type: "percent", step: "0.01" },
  { key: "beta", label: "Beta", category: "WACC Inputs", type: "decimal", step: "0.01" },
  { key: "costOfDebt", label: "Cost of Debt", category: "WACC Inputs", type: "percent", step: "0.01" },
  { key: "debt", label: "Debt", category: "WACC Inputs", type: "currency" },
  { key: "equityMarketValue", label: "Equity Market Value", category: "WACC Inputs", type: "currency" },
  
  // Terminal Value
  { key: "terminalGrowthRate", label: "Terminal Growth Rate", category: "Terminal Value", type: "percent", step: "0.01" },
];

export default function InvDCFValuationPage() {
  const { user, hydrate } = useAuth();
  const [inputs, setInputs] = useState<DCFInputs>(createDefaultInputs());
  const [results, setResults] = useState<DCFResults | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "inv-dcf-valuation",
    onLoad: (data: Record<string, unknown>) => {
      if (data.inputs) setInputs(data.inputs as DCFInputs);
    },
    getState: useCallback(() => ({ inputs }), [inputs]),
  });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleChange = (key: keyof DCFInputs, value: string) => {
    setInputs((prev: DCFInputs) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    markDirty();
  };

  const handleCalculate = () => {
    const r = calculateDCF(inputs);
    setResults(r);
    persistState();
  };

  const handleReset = () => {
    setInputs(createDefaultInputs());
    setResults(null);
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user || !results) return;
    try {
      await api.post("/calculations", {
        modelSlug: "inv-dcf-valuation",
        inputs,
        outputs: {
          enterpriseValue: results.enterpriseValue,
          equityValue: results.equityValue,
          wacc: results.wacc.wacc,
        }
      });
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  const toggleCategory = (cat: string) => setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  const categories = [...new Set(INPUT_FIELDS.map((f) => f.category))];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models?tier=investor" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-400/10">
            <Gem className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">DCF Valuation Model</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-amber-400/10 text-amber-400">Investor Grade</span>
            </div>
            <p className="text-muted-foreground mt-1">
              WACC + 5-year projection + Terminal Value + Enterprise/Equity valuation.
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          {categories.map((cat) => {
            const collapsed = collapsedCategories[cat];
            return (
              <div key={cat} className="rounded-2xl border border-border bg-card overflow-hidden">
                <button onClick={() => toggleCategory(cat)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors">
                  <h3 className="font-semibold text-sm">{cat}</h3>
                  {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
                </button>
                {!collapsed && (
                  <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {INPUT_FIELDS.filter((f) => f.category === cat).map((field) => (
                      <div key={String(field.key)}>
                        <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            {field.type === "currency" ? "₹" : ""}
                          </span>
                          <input 
                            type="number" 
                            step={field.step || (field.type === "currency" ? "1" : "0.01")}
                            value={inputs[field.key] || ""}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            placeholder="0"
                            className="w-full rounded-lg border border-border pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 bg-input"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex gap-3">
            <button onClick={handleCalculate} className="flex-1 rounded-lg bg-amber-400 text-black py-2.5 text-sm font-semibold hover:bg-amber-300 transition-colors">
              Run DCF Valuation
            </button>
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        {results ? (
          <div className="space-y-4 h-fit sticky top-8">
            <div className="rounded-2xl border-2 border-amber-400/30 bg-amber-400/5 p-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">Enterprise Value</p>
              <p className="text-3xl font-bold text-amber-400">{formatCurrency(results.enterpriseValue)}</p>
              <p className="text-sm text-muted-foreground mt-2">Equity Value: {formatCurrency(results.equityValue)}</p>
              <p className="text-xs text-muted-foreground mt-1">Value/Share: ₹{results.valuePerShare.toFixed(2)}</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">WACC Breakdown</h3>
              <div className="space-y-2 text-xs">
                {[
                  { label: "Cost of Equity", value: `${(results.wacc.costOfEquity * 100).toFixed(2)}%` },
                  { label: "After-Tax Cost of Debt", value: `${(results.wacc.afterTaxCostOfDebt * 100).toFixed(2)}%` },
                  { label: "Equity Weight", value: `${(results.wacc.equityWeight * 100).toFixed(1)}%` },
                  { label: "Debt Weight", value: `${(results.wacc.debtWeight * 100).toFixed(1)}%` },
                  { label: "WACC", value: `${(results.wacc.wacc * 100).toFixed(2)}%` },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between rounded-lg px-3 py-1.5 bg-background/50 border border-border/50">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">Valuation Summary</h3>
              <div className="space-y-2 text-xs">
                {[
                  { label: "PV of FCFFs", value: formatCurrency(results.totalPVofFCFF) },
                  { label: "Terminal Value", value: formatCurrency(results.terminalValue) },
                  { label: "PV of Terminal", value: formatCurrency(results.pvOfTerminalValue) },
                  { label: "Enterprise Value", value: formatCurrency(results.enterpriseValue) },
                  { label: "Equity Value", value: formatCurrency(results.equityValue) },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between rounded-lg px-3 py-1.5 bg-background/50 border border-border/50">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Projection table */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-background/50"><h3 className="font-semibold text-sm">DCF Projection (with Base Year)</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border bg-background/50">
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Year</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Revenue</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">EBITDA</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">FCFF</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">PV of FCFF</th>
                  </tr></thead>
                  <tbody>
                    {results.years.map((row: DCFYearData) => (
                      <tr key={row.year} className="border-b border-border/30">
                        <td className="px-3 py-2 font-medium">{row.year}</td>
                        <td className="text-right px-3 py-2">{formatCurrency(row.revenue)}</td>
                        <td className="text-right px-3 py-2">{formatCurrency(row.ebitda)}</td>
                        <td className="text-right px-3 py-2">{formatCurrency(row.fcff)}</td>
                        <td className="text-right px-3 py-2">{formatCurrency(row.pvOfFCFF)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card min-h-[300px]">
            <p className="text-muted-foreground text-sm">Enter assumptions and click Run DCF Valuation</p>
          </div>
        )}
      </div>

      {/* Charts */}
      {results && results.years.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Revenue & EBITDA Projection */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Revenue & EBITDA Projection</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              legend: { data: ["Revenue", "EBITDA"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
              grid: { top: 30, right: 15, bottom: 25, left: 55 },
              xAxis: { type: "category", data: results.years.map((r: any) => r.year), axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000000 ? `₹${(v/1000000).toFixed(1)}M` : v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [
                { name: "Revenue", type: "bar", data: results.years.map((r: any) => r.revenue), itemStyle: { color: "#60a5fa", borderRadius: [4, 4, 0, 0] } },
                { name: "EBITDA", type: "line", smooth: true, data: results.years.map((r: any) => r.ebitda), lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" }, symbol: "circle", symbolSize: 5 },
              ],
            }} />
          </div>

          {/* FCFF vs PV of FCFF */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">FCFF vs Present Value</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              legend: { data: ["FCFF", "PV of FCFF"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
              grid: { top: 30, right: 15, bottom: 25, left: 55 },
              xAxis: { type: "category", data: results.years.map((r: any) => r.year), axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000000 ? `₹${(v/1000000).toFixed(1)}M` : v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [
                { name: "FCFF", type: "bar", data: results.years.map((r: any) => r.fcff), itemStyle: { color: "#f59e0b", borderRadius: [4, 4, 0, 0] } },
                { name: "PV of FCFF", type: "bar", data: results.years.map((r: any) => r.pvOfFCFF), itemStyle: { color: "#a78bfa", borderRadius: [4, 4, 0, 0] } },
              ],
            }} />
          </div>

          {/* Valuation Waterfall */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Valuation Waterfall</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 35, left: 60 },
              xAxis: { type: "category", data: ["PV of FCFF", "PV of TV", "Enterprise", "- Debt", "Equity"], axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000000 ? `₹${(v/1000000).toFixed(1)}M` : v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{ type: "bar", barWidth: 28,
                data: [
                  { value: results.totalPVofFCFF, itemStyle: { color: "#60a5fa", borderRadius: [4, 4, 0, 0] } },
                  { value: results.pvOfTerminalValue, itemStyle: { color: "#34d399", borderRadius: [4, 4, 0, 0] } },
                  { value: results.enterpriseValue, itemStyle: { color: "#f59e0b", borderRadius: [4, 4, 0, 0] } },
                  { value: -(results.enterpriseValue - results.equityValue), itemStyle: { color: "#ef4444", borderRadius: [4, 4, 0, 0] } },
                  { value: results.equityValue, itemStyle: { color: "#a78bfa", borderRadius: [4, 4, 0, 0] } },
                ],
                label: { show: true, position: "top", color: "#aaa", fontSize: 8, formatter: (p: any) => p.value >= 1000000 ? `₹${(p.value/1000000).toFixed(1)}M` : `₹${(p.value/1000).toFixed(0)}k` },
              }],
            }} />
          </div>

          {/* WACC Composition */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">WACC Composition</h3>
            <ReactECharts style={{ height: 220 }} option={{
              tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              series: [{ type: "pie", radius: ["40%", "68%"], center: ["50%", "50%"],
                label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{d}%" },
                data: [
                  { value: Math.round(results.wacc.equityWeight * results.wacc.costOfEquity * 10000) / 100, name: `Equity (${(results.wacc.costOfEquity*100).toFixed(1)}%)`, itemStyle: { color: "#60a5fa" } },
                  { value: Math.round(results.wacc.debtWeight * results.wacc.afterTaxCostOfDebt * 10000) / 100, name: `Debt (${(results.wacc.afterTaxCostOfDebt*100).toFixed(1)}%)`, itemStyle: { color: "#f59e0b" } },
                ].filter((d) => d.value > 0),
              }],
            }} />
          </div>

          {/* EV vs Equity Value */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Enterprise vs Equity Value</h3>
            <ReactECharts style={{ height: 220 }} option={{
              tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              series: [{ type: "pie", radius: ["40%", "68%"], center: ["50%", "50%"],
                label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{d}%" },
                data: [
                  { value: results.equityValue, name: "Equity Value", itemStyle: { color: "#34d399" } },
                  { value: (results.enterpriseValue - results.equityValue) > 0 ? (results.enterpriseValue - results.equityValue) : 0, name: "Net Debt", itemStyle: { color: "#ef4444" } },
                ].filter((d) => d.value > 0),
              }],
            }} />
          </div>

          {/* WACC Gauge */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">WACC</h3>
            <ReactECharts style={{ height: 220 }} option={{
              series: [{
                type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: 25,
                pointer: { show: true, length: "60%", width: 4, itemStyle: { color: "#60a5fa" } },
                axisLine: { lineStyle: { width: 20, color: [[0.4, "#34d399"], [0.7, "#f59e0b"], [1, "#ef4444"]] } },
                axisTick: { show: false }, splitLine: { show: false },
                axisLabel: { color: "#888", fontSize: 9, distance: 25 },
                detail: { valueAnimation: true, formatter: "{value}%", color: "#e0e0e0", fontSize: 20, offsetCenter: [0, "70%"] },
                data: [{ value: Math.round(results.wacc.wacc * 1000) / 10 }],
              }],
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
