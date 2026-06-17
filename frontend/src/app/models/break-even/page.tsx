"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft, TrendingUp, Save, RotateCcw,
  CheckCircle, AlertTriangle, XCircle, Info, Lightbulb,
} from "lucide-react";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import { formatCurrency, formatPercent } from "@/lib/utils";
import api from "@/lib/api";
import { useSavedModel } from "@/lib/use-saved-model";
import { offerSmartResultsAfterCalculate } from "@/lib/smart-results";
import { FieldHint } from "@/components/FieldHint";
import { HintLabel } from "@/components/HintLabel";
import { standaloneHint } from "@/lib/standalone-model-hints";
import {
  calculateBreakEven,
  createEmptyInputs,
  type BreakEvenInputs,
  type BreakEvenCompleteResults,
  INPUT_FIELDS,
  BREAK_EVEN_TOOLTIPS,
} from "@/lib/break-even-standalone-model";

type TabView = "calculator" | "simulation" | "insights";

function difficultyColor(d: string): string {
  if (d === "easy") return "text-success";
  if (d === "moderate") return "text-amber-400";
  if (d === "challenging") return "text-orange-400";
  return "text-danger";
}

function difficultyLabel(d: string): string {
  if (d === "easy") return "Easy";
  if (d === "moderate") return "Moderate";
  if (d === "challenging") return "Challenging";
  return "Very Hard";
}

export default function BreakEvenPage() {
  const { user, hydrate } = useAuth();
  const [inputs, setInputs] = useState<BreakEvenInputs>(createEmptyInputs());
  const [results, setResults] = useState<BreakEvenCompleteResults | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>("calculator");
  const [simulationUnits, setSimulationUnits] = useState<string>("100, 500, 1000, 2000, 5000, 10000");

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "break-even",
    onLoad: (data: Record<string, unknown>) => {
      if (data.inputs) setInputs(data.inputs as BreakEvenInputs);
    },
    getState: useCallback(() => ({ inputs }), [inputs]),
  });

  useEffect(() => { hydrate(); }, [hydrate]);

  const handleChange = (key: keyof BreakEvenInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    markDirty();
  };

  const handleCalculate = () => {
    if (inputs.pricePerUnit <= 0) return;
    const units = simulationUnits.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
    const r = calculateBreakEven(inputs, units.length > 0 ? units : undefined);
    setResults(r);
    offerSmartResultsAfterCalculate("break-even", inputs, r);
    persistState();
  };

  const handleReset = () => {
    setInputs(createEmptyInputs());
    setResults(null);
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user || !results) return;
    try {
      await api.post("/calculations", {
        modelSlug: "break-even",
        inputs,
        outputs: {
          contributionPerUnit: results.contributionPerUnit,
          contributionMargin: results.contributionMargin,
          breakEvenUnits: results.breakEvenUnits,
          breakEvenRevenue: results.breakEvenRevenue,
          simulation: results.simulation,
          insights: results.insights,
        },
      });
      await persistState();
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <Link href="/models?tier=standalone" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-blue-400/10">
            <TrendingUp className="h-7 w-7 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Break-Even Analysis</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-blue-400/10 text-blue-400">
                Standalone
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              Calculate contribution margin, break-even point, and simulate different sales scenarios.
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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 rounded-xl bg-card border border-border p-1 overflow-x-auto">
        {(["calculator", "simulation", "insights"] as TabView[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors whitespace-nowrap ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {tab === "calculator" ? "Calculator" : tab}
          </button>
        ))}
      </div>

      {/* ============ CALCULATOR TAB ============ */}
      {activeTab === "calculator" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* Inputs */}
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <h2 className="font-semibold mb-5">Enter Your Data</h2>
            
            <div className="space-y-5">
              {INPUT_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="flex items-center text-xs text-muted-foreground mb-1">
                    {field.label}
                    <FieldHint hint={BREAK_EVEN_TOOLTIPS[field.key]} />
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                    <input
                      type="number"
                      value={inputs[field.key] || ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {field.key === "pricePerUnit" && "The selling price charged to the customer for one unit of your product or service."}
                    {field.key === "variableCostPerUnit" && "Costs that increase directly with each unit sold (raw materials, delivery, commissions, etc.)."}
                    {field.key === "fixedCostMonthly" && "Costs that stay the same every month regardless of sales volume (salaries, rent, software, insurance, etc.)."}
                  </p>
                </div>
              ))}
            </div>

            {/* Simulation Units Input */}
            <div className="mt-6 pt-4 border-t border-border">
              <label className="flex items-center text-xs text-muted-foreground mb-1">
                Simulation Units (comma-separated)
                <FieldHint hint={{ what: "Units to simulate in the projection table.", why: "Helps visualize profitability at different sales volumes." }} />
              </label>
              <input
                type="text"
                value={simulationUnits}
                onChange={(e) => setSimulationUnits(e.target.value)}
                placeholder="100, 500, 1000, 2000, 5000, 10000"
                className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>

            <div className="flex gap-3 mt-6">
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

          {/* Results Sidebar */}
          <div className="space-y-4">
            {results ? (
              <>
                {/* Main Results Card */}
                <div className="rounded-2xl border border-border bg-card p-6 output-panel">
                  <h3 className="font-semibold mb-4">Break-Even Results</h3>
                  
                  <div className="space-y-4">
                    {/* Contribution per Unit */}
                    <div className="rounded-xl bg-success/5 border border-success/20 p-4">
                      <p className="text-xs text-muted-foreground mb-1">Contribution per Unit</p>
                      <p className="text-3xl font-bold text-success">{formatCurrency(results.contributionPerUnit)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Margin: {formatPercent(results.contributionMargin)}
                      </p>
                    </div>

                    {/* Break-Even Units */}
                    <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                      <p className="text-xs text-muted-foreground mb-1">Break-Even Units</p>
                      <p className="text-3xl font-bold text-primary">
                        {Math.ceil(results.breakEvenUnits).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Exact: {results.breakEvenUnits.toFixed(2)} units
                      </p>
                    </div>

                    {/* Break-Even Revenue */}
                    <div className="rounded-xl bg-blue-400/5 border border-blue-400/20 p-4">
                      <p className="text-xs text-muted-foreground mb-1">Break-Even Revenue</p>
                      <p className="text-3xl font-bold text-blue-400">
                        {formatCurrency(results.breakEvenRevenue)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Monthly target
                      </p>
                    </div>

                    {/* Difficulty Level */}
                    <div className={`rounded-xl p-4 border ${
                      results.insights.difficulty === "easy" ? "bg-success/5 border-success/20" :
                      results.insights.difficulty === "moderate" ? "bg-amber-400/5 border-amber-400/20" :
                      results.insights.difficulty === "challenging" ? "bg-orange-400/5 border-orange-400/20" :
                      "bg-danger/5 border-danger/20"
                    }`}>
                      <p className="text-xs text-muted-foreground mb-1">Break-Even Difficulty</p>
                      <p className={`text-xl font-bold ${difficultyColor(results.insights.difficulty)}`}>
                        {difficultyLabel(results.insights.difficulty)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Interpretation */}
                <div className="rounded-2xl border border-border bg-card p-5 output-panel">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-400" />
                    Quick Interpretation
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    You need to sell <strong className="text-foreground">{Math.ceil(results.breakEvenUnits).toLocaleString()} units</strong> per month 
                    to cover all costs. Every unit sold beyond this generates 
                    <strong className="text-success"> {formatCurrency(results.contributionPerUnit)} profit</strong>.
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter your price, costs, and click Calculate to see break-even analysis.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ SIMULATION TAB ============ */}
      {activeTab === "simulation" && results && (
        <div className="space-y-6">
          {/* Simulation Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold">Profitability at Different Volumes</h2>
              <p className="text-sm text-muted-foreground mt-1">
                See how your profit changes as you sell more units
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/50">
                    <th className="text-left px-6 py-3 font-semibold text-muted-foreground">Units Sold</th>
                    <th className="text-right px-6 py-3 font-semibold text-muted-foreground">Revenue</th>
                    <th className="text-right px-6 py-3 font-semibold text-muted-foreground">Variable Costs</th>
                    <th className="text-right px-6 py-3 font-semibold text-muted-foreground">Fixed Costs</th>
                    <th className="text-right px-6 py-3 font-semibold text-muted-foreground">Total Costs</th>
                    <th className="text-right px-6 py-3 font-semibold text-muted-foreground">Profit / Loss</th>
                    <th className="text-center px-6 py-3 font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.simulation.map((row, idx) => (
                    <tr key={idx} className={`border-b border-border/30 ${row.aboveBreakEven ? "bg-success/5" : ""}`}>
                      <td className="px-6 py-3 font-medium">{row.units.toLocaleString()}</td>
                      <td className="text-right px-6 py-3">{formatCurrency(row.revenue)}</td>
                      <td className="text-right px-6 py-3 text-muted-foreground">{formatCurrency(row.totalVariableCost)}</td>
                      <td className="text-right px-6 py-3 text-muted-foreground">{formatCurrency(inputs.fixedCostMonthly)}</td>
                      <td className="text-right px-6 py-3">{formatCurrency(row.totalCost)}</td>
                      <td className={`text-right px-6 py-3 font-semibold ${row.profitLoss >= 0 ? "text-success" : "text-danger"}`}>
                        {row.profitLoss >= 0 ? "+" : ""}{formatCurrency(row.profitLoss)}
                      </td>
                      <td className="text-center px-6 py-3">
                        {row.aboveBreakEven ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success px-2 py-0.5 text-xs font-medium">
                            <CheckCircle className="h-3 w-3" /> Profitable
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 text-danger px-2 py-0.5 text-xs font-medium">
                            <XCircle className="h-3 w-3" /> Loss
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue vs Costs Chart */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Revenue vs Costs</h3>
              <ReactECharts
                style={{ height: 300 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  legend: { data: ["Revenue", "Total Costs", "Fixed Costs"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
                  grid: { top: 30, right: 20, bottom: 30, left: 60 },
                  xAxis: { 
                    type: "category", 
                    data: results.simulation.map(s => s.units.toLocaleString()),
                    axisLabel: { color: "#888", fontSize: 10 }, 
                    axisLine: { lineStyle: { color: "#333" } } 
                  },
                  yAxis: { 
                    type: "value", 
                    axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => `₹${(v/1000).toFixed(0)}k` }, 
                    splitLine: { lineStyle: { color: "#222" } } 
                  },
                  series: [
                    { name: "Revenue", type: "line", data: results.simulation.map(s => s.revenue), smooth: true, lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" } },
                    { name: "Total Costs", type: "line", data: results.simulation.map(s => s.totalCost), smooth: true, lineStyle: { color: "#ef4444", width: 2 }, itemStyle: { color: "#ef4444" } },
                    { name: "Fixed Costs", type: "line", data: results.simulation.map(() => inputs.fixedCostMonthly), lineStyle: { color: "#f59e0b", type: "dashed", width: 2 }, itemStyle: { color: "#f59e0b" }, symbol: "none" },
                  ],
                }}
              />
            </div>

            {/* Profit by Volume */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Profit by Volume</h3>
              <ReactECharts
                style={{ height: 300 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  grid: { top: 15, right: 20, bottom: 30, left: 60 },
                  xAxis: { 
                    type: "category", 
                    data: results.simulation.map(s => s.units.toLocaleString()),
                    axisLabel: { color: "#888", fontSize: 10 }, 
                    axisLine: { lineStyle: { color: "#333" } } 
                  },
                  yAxis: { 
                    type: "value", 
                    axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => `₹${(v/1000).toFixed(0)}k` }, 
                    splitLine: { lineStyle: { color: "#222" } } 
                  },
                  series: [{
                    type: "bar",
                    data: results.simulation.map(s => ({
                      value: s.profitLoss,
                      itemStyle: { 
                        color: s.profitLoss >= 0 ? "#34d399" : "#ef4444",
                        borderRadius: [4, 4, 0, 0]
                      }
                    })),
                    markLine: { 
                      data: [{ yAxis: 0, lineStyle: { color: "#888", type: "dashed" } }], 
                      label: { show: false }, 
                      symbol: "none" 
                    },
                  }],
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============ INSIGHTS TAB ============ */}
      {activeTab === "insights" && results && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Overall Health Score */}
          <div className={`rounded-2xl border bg-card p-8 text-center ${
            results.insights.healthScore >= 80 ? "border-success/30" :
            results.insights.healthScore >= 60 ? "border-amber-400/30" :
            results.insights.healthScore >= 40 ? "border-orange-400/30" : "border-danger/30"
          }`}>
            <div className="flex justify-center mb-4">
              {results.insights.healthScore >= 80 ? <CheckCircle className="h-8 w-8 text-success" /> :
               results.insights.healthScore >= 60 ? <Info className="h-8 w-8 text-amber-400" /> :
               results.insights.healthScore >= 40 ? <AlertTriangle className="h-8 w-8 text-orange-400" /> :
               <XCircle className="h-8 w-8 text-danger" />}
            </div>
            <div className="text-5xl font-bold mb-2">
              <span className={results.insights.overallColor}>{results.insights.healthScore}/100</span>
            </div>
            <h2 className={`text-xl font-bold mb-2 ${results.insights.overallColor}`}>
              {results.insights.overall}
            </h2>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Contribution Margin</p>
              <p className="text-2xl font-bold text-success">{formatPercent(results.contributionMargin)}</p>
            </div>
            <div className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Break-Even Units</p>
              <p className="text-2xl font-bold text-primary">{Math.ceil(results.breakEvenUnits).toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Break-Even Revenue</p>
              <p className="text-2xl font-bold text-blue-400">{formatCurrency(results.breakEvenRevenue)}</p>
            </div>
            <div className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Difficulty</p>
              <p className={`text-2xl font-bold ${difficultyColor(results.insights.difficulty)}`}>
                {difficultyLabel(results.insights.difficulty)}
              </p>
            </div>
          </div>

          {/* Detailed Guidance */}
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <h3 className="font-semibold mb-4">Analysis & Recommendations</h3>
            <div className="space-y-3">
              {results.insights.guidance.map((item, idx) => (
                <div key={idx} className={`flex items-start gap-3 rounded-xl px-4 py-3 ${
                  item.startsWith("✓") ? "bg-success/5 border border-success/20" :
                  item.startsWith("🚨") ? "bg-danger/10 border border-danger/30" :
                  item.startsWith("⚠️") ? "bg-amber-400/5 border border-amber-400/20" :
                  item.startsWith("📊") ? "bg-blue-400/5 border border-blue-400/20" :
                  item.startsWith("💰") ? "bg-green-400/5 border border-green-400/20" :
                  "bg-muted/30 border border-border/50"
                }`}>
                  <span className="text-sm leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Questions */}
          <div className="rounded-2xl border border-success/30 bg-success/5 p-6">
            <h3 className="font-semibold mb-4 text-success flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Strategic Questions to Accelerate Break-even
            </h3>
            <div className="space-y-3 text-sm">
              <p className="flex items-start gap-2">
                <span className="text-success mt-0.5">•</span>
                <span>How can we increase price without losing customers? Consider value-adds or premium positioning.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-success mt-0.5">•</span>
                <span>How can we reduce variable cost per unit? Look for bulk discounts, efficiency improvements, or supplier negotiations.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-success mt-0.5">•</span>
                <span>How can we control or reduce fixed costs? Review subscriptions, rent, and staffing for optimization opportunities.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-success mt-0.5">•</span>
                <span>Can we increase sales volume through better marketing or new channels to spread fixed costs over more units?</span>
              </p>
            </div>
          </div>

          {/* Formula Reference */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Formulas Used</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong className="text-foreground">Contribution per Unit</strong> = Price per Unit − Variable Cost per Unit</p>
              <p><strong className="text-foreground">Contribution Margin</strong> = Contribution per Unit ÷ Price per Unit</p>
              <p><strong className="text-foreground">Break-Even Units</strong> = Fixed Costs ÷ Contribution per Unit</p>
              <p><strong className="text-foreground">Break-Even Revenue</strong> = Break-Even Units × Price per Unit</p>
            </div>
          </div>
        </div>
      )}

      {/* No results prompt */}
      {activeTab !== "calculator" && !results && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="mb-4">No results yet. Go to Calculator and click Calculate.</p>
          <button onClick={() => setActiveTab("calculator")} className="text-primary hover:underline text-sm">
            Go to Calculator
          </button>
        </div>
      )}

      {/* CTA for non-logged-in users */}
      {!user && results && (
        <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <p className="text-muted-foreground mb-3">Sign up to save your break-even analysis</p>
          <Link href="/signup" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
            Create Free Account
          </Link>
        </div>
      )}
    </div>
  );
}
