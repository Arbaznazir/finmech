"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link"
import { ModelBackLink } from "@/components/model-back-link";
import {
  ArrowLeft, TrendingUp, Save, RotateCcw, CheckCircle, AlertTriangle, XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { useSavedModel } from "@/lib/use-saved-model";
import { offerSmartResultsAfterCalculate } from "@/lib/smart-results";
import { loadSavedState } from "@/lib/saved-state";
import { HintLabel } from "@/components/HintLabel";
import { useModelHints } from "@/hooks/use-model-hints";
import {
  CONSOLIDATED_MONTHS,
  CONSOLIDATED_INPUT_FIELDS,
  calculateConsolidatedCFO,
  createEmptyConsolidatedInputs,
  cfsBandCardClass,
  cfsBandLabel,
  cfsBandTextClass,
  type CfsPatBand,
  type ConsolidatedCFOResults,
  type ConsolidatedMonthInputs,
} from "@/lib/consolidated-cfo-model";
import type { CFOpsResults } from "@/lib/cashflow-ops-model";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

function bandIcon(band: CfsPatBand, size: "sm" | "lg" = "lg") {
  const cls = size === "sm" ? "h-5 w-5" : "h-8 w-8";
  if (band === "green") return <CheckCircle className={`${cls} text-success`} />;
  if (band === "amber") return <AlertTriangle className={`${cls} text-amber-400`} />;
  if (band === "weak-amber") return <AlertTriangle className={`${cls} text-orange-400`} />;
  return <XCircle className={`${cls} text-danger`} />;
}

type TabView = "input" | "summary";

export default function ConsolidatedCFOPage() {
  const { user, hydrate } = useAuth();
  const { hint } = useModelHints("consolidated-cfo");
  const [results, setResults] = useState<ConsolidatedCFOResults | null>(null);
  const [hasOpsData, setHasOpsData] = useState(false);
  const [activeTab, setActiveTab] = useState<TabView>("input");
  const [activeMonth, setActiveMonth] = useState<string>("Apr");
  const [beginningCash, setBeginningCash] = useState(0);
  const [monthsData, setMonthsData] = useState<Record<string, ConsolidatedMonthInputs>>({});

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "consolidated-cfo",
    onLoad: (data: Record<string, unknown>) => {
      if (data.monthsData) setMonthsData(data.monthsData as Record<string, ConsolidatedMonthInputs>);
      if (typeof data.beginningCash === "number") setBeginningCash(data.beginningCash);
    },
    getState: useCallback(() => ({ monthsData, beginningCash }), [monthsData, beginningCash]),
  });

  useEffect(() => { hydrate(); }, [hydrate]);

  const runCalculation = useCallback(async (ops: CFOpsResults | null, inputs: Record<string, ConsolidatedMonthInputs>) => {
    if (!ops?.monthlyData || Object.keys(ops.monthlyData).length === 0) {
      setHasOpsData(false);
      setResults(null);
      return;
    }
    const isState = await loadSavedState<Record<string, unknown>>("income-statement");
    const result = calculateConsolidatedCFO(ops, inputs, beginningCash, isState);
    setResults(result);
    setHasOpsData(true);
    setActiveTab("summary");
  }, [beginningCash]);

  const refreshData = useCallback(async () => {
    const local = JSON.parse(localStorage.getItem("cashflowOps") || "{}") as CFOpsResults;
    if (local?.monthlyData && Object.keys(local.monthlyData).length > 0) {
      await runCalculation(local, monthsData);
      return;
    }
    const { calculateCFOps } = await import("@/lib/cashflow-ops-model");
    const opsState = await loadSavedState<Record<string, unknown>>("cashflow-ops");
    if (opsState?.monthsData && Object.keys(opsState.monthsData as object).length > 0) {
      const ops = calculateCFOps(opsState.monthsData as Record<string, Record<string, number>>);
      localStorage.setItem("cashflowOps", JSON.stringify(ops));
      await runCalculation(ops, monthsData);
    } else {
      setHasOpsData(false);
      setResults(null);
    }
  }, [monthsData, runCalculation]);

  // Load on mount
  useEffect(() => { refreshData(); }, [refreshData]);

  const handleSave = async () => {
    if (!user || !results) return;
    const outputs = {
      monthlyData: results.monthlyData,
      monthsAdded: results.monthsAdded,
      summary: results.summary,
      openingCash: results.beginningCash,
    };
    try {
      await api.post("/calculations", {
        modelSlug: "consolidated-cfo",
        inputs: { source: "cashflow-ops" },
        outputs,
      });
      offerSmartResultsAfterCalculate("consolidated-cfo", { source: "cashflow-ops" }, outputs, {
        modelName: "Consolidated CFO",
        tier: "standalone",
      });
      await persistState();
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const handleCalculate = () => { refreshData(); markDirty(); };

  const handleInputChange = (key: keyof ConsolidatedMonthInputs, value: string) => {
    setMonthsData((prev) => ({
      ...prev,
      [activeMonth]: {
        ...(prev[activeMonth] || createEmptyConsolidatedInputs()),
        [key]: parseFloat(value) || 0,
      },
    }));
    markDirty();
  };

  const handleReset = () => {
    setResults(null);
    setHasOpsData(false);
    clearPersisted();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <ModelBackLink modelSlug="consolidated-cfo" fallbackHref="/models/cash-flow-statement" label="Back to Cash Flow" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors" />

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 bg-amber-500/10">
            <TrendingUp className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">Consolidated CFO</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-amber-500/10 text-amber-500">
                Sheet 2
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Summary view with CFO/PAT ratios and RAG insights
            </p>
          </div>
        </div>
        <div className="flex gap-2">
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
          <button
            onClick={handleCalculate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> Calculate
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 rounded-xl bg-card border border-border p-1">
        {(["input", "summary"] as TabView[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {tab === "input" ? "Investing & Financing" : "Summary & RAG"}
          </button>
        ))}
      </div>

      {activeTab === "input" && (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3">Month</h3>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-1.5">
              {CONSOLIDATED_MONTHS.map((month) => (
                <button
                  key={month}
                  onClick={() => setActiveMonth(month)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeMonth === month ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4">Inputs for <span className="text-primary">{activeMonth}</span></h2>
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1 block">
                <HintLabel hint={hint("beginningCash")}>Beginning Cash (April 1st)</HintLabel>
              </label>
              <input
                type="number"
                value={beginningCash || ""}
                onChange={(e) => { setBeginningCash(parseFloat(e.target.value) || 0); markDirty(); }}
                className="w-full max-w-xs rounded-lg border border-border bg-input px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CONSOLIDATED_INPUT_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    <HintLabel hint={hint(field.key)}>{field.label}</HintLabel>
                  </label>
                  <input
                    type="number"
                    value={monthsData[activeMonth]?.[field.key] || ""}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleCalculate}
              className="mt-6 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent"
            >
              Calculate Consolidated CFS
            </button>
          </div>
        </div>
      )}

      {!hasOpsData && activeTab === "summary" && (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-semibold mb-2">No Data Available</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This page auto-pulls data from Cashflow Operations. Please enter data there first.
          </p>
          <Link
            href="/models/cash-flow-statement/cashflow-ops"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors"
          >
            Go to Cashflow Operations
          </Link>
        </div>
      )}

      {/* Results View */}
      {hasOpsData && results && activeTab === "summary" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase mb-1">
                <HintLabel hint={hint("beginningCash")}>Opening Cash</HintLabel>
              </p>
              <p className="text-2xl font-bold">{formatCurrency(results.beginningCash)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase mb-1">
                <HintLabel hint={hint("totalNetCashFlow")}>Total Net Cash Flow</HintLabel>
              </p>
              <p className={`text-2xl font-bold ${results.summary.totalNetCashFlow >= 0 ? "text-emerald-400" : "text-red-500"}`}>
                {formatCurrency(results.summary.totalNetCashFlow)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase mb-1">
                <HintLabel hint={hint("finalEndingCash")}>Final Ending Cash</HintLabel>
              </p>
              <p className="text-2xl font-bold">{formatCurrency(results.summary.finalEndingCash)}</p>
            </div>
            <div className={`rounded-2xl border p-5 ${cfsBandCardClass(results.summary.overallPatBand)}`}>
              <p className="text-xs uppercase mb-1 opacity-70">
                <HintLabel hint={hint("overallClassification")}>CFO/PAT Band</HintLabel>
              </p>
              <p className={`text-2xl font-bold ${cfsBandTextClass(results.summary.overallPatBand)}`}>
                {cfsBandLabel(results.summary.overallPatBand)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">{results.summary.overallInsight}</p>
            </div>
          </div>

          {/* Ratio Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase mb-1">
                <HintLabel hint={hint("avgCfoPat")}>Avg CFO/PAT</HintLabel>
              </p>
              <p className={`text-2xl font-bold ${cfsBandTextClass(results.summary.overallPatBand)}`}>
                {results.summary.avgCfoPat.toFixed(2)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase mb-1">
                <HintLabel hint={hint("avgCfoEbitda")}>Avg CFO/EBITDA</HintLabel>
              </p>
              <p className="text-2xl font-bold">{results.summary.avgCfoEbitda.toFixed(2)}</p>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CFO/PAT Trend */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">
                <HintLabel hint={hint("cfoPat")}>CFO/PAT Ratio Trend</HintLabel>
              </h3>
              <ReactECharts
                style={{ height: 260 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 }, formatter: (params: any) => {
                    const data = params[0];
                    const monthData = results.monthlyData[data.name];
                    return `${data.name}<br/>CFO/PAT: ${data.value.toFixed(2)}<br/>${monthData?.insight || ""}`;
                  }},
                  grid: { top: 15, right: 15, bottom: 30, left: 50 },
                  xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                  yAxis: { type: "value", min: 0, max: 2, axisLabel: { color: "#888", fontSize: 10 }, splitLine: { lineStyle: { color: "#222" } } },
                  series: [{
                    type: "line", smooth: true,
                    data: results.monthsAdded.map(m => results.monthlyData[m]?.cfoPat || 0),
                    lineStyle: { color: "#f59e0b", width: 2 },
                    itemStyle: { color: (params: any) => {
                      const val = params.value as number;
                      if (val > 1.2) return "#34d399";
                      if (val > 0.8) return "#f59e0b";
                      if (val > 0) return "#fb923c";
                      return "#ef4444";
                    }},
                    symbol: "circle", symbolSize: 8,
                    markLine: {
                      data: [
                        { yAxis: 1.2, lineStyle: { color: "#34d399", type: "dashed" }, label: { show: false } },
                        { yAxis: 0.8, lineStyle: { color: "#f59e0b", type: "dashed" }, label: { show: false } },
                      ],
                      symbol: "none",
                    },
                  }],
                }}
              />
            </div>

            {/* Ending Cash Trend */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">
                <HintLabel hint={hint("endingCash")}>Ending Cash Trend</HintLabel>
              </h3>
              <ReactECharts
                style={{ height: 260 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  grid: { top: 15, right: 15, bottom: 30, left: 55 },
                  xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                  yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}` }, splitLine: { lineStyle: { color: "#222" } } },
                  series: [{
                    type: "line", smooth: true,
                    data: results.monthsAdded.map(m => results.monthlyData[m]?.endingCash || 0),
                    areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(245,158,11,0.3)" }, { offset: 1, color: "rgba(245,158,11,0)" }] } },
                    lineStyle: { color: "#f59e0b", width: 2 },
                    itemStyle: { color: "#f59e0b" },
                    symbol: "circle", symbolSize: 5,
                  }],
                }}
              />
            </div>
          </div>

          {/* Monthly RAG Cards */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-5">Monthly CFO Quality</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {results.monthsAdded.map((month) => {
                const data = results.monthlyData[month];
                if (!data) return null;
                return (
                  <div key={month} className={`rounded-xl px-4 py-4 border ${cfsBandCardClass(data.patBand)}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold">{month}</span>
                      {bandIcon(data.patBand, "sm")}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          <HintLabel hint={hint("cfoPat")}>CFO/PAT</HintLabel>
                        </span>
                        <span className={cfsBandTextClass(data.patBand)}>
                          {data.cfoPat !== null ? data.cfoPat.toFixed(2) : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          <HintLabel hint={hint("endingCash")}>Ending Cash</HintLabel>
                        </span>
                        <span>{formatCurrency(data.endingCash)}</span>
                      </div>
                      <p className="text-xs mt-2 pt-2 border-t border-white/10">{data.insight}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold text-sm mb-4">CFO/PAT Classification Guide</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-success">🟢 Green</p>
                  <p className="text-muted-foreground text-xs">CFO/PAT &gt; 1.2</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 rounded-full bg-amber-400 mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-400">🟡 Amber</p>
                  <p className="text-muted-foreground text-xs">CFO/PAT 0.8 – 1.2</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 rounded-full bg-orange-400 mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-orange-400">🟠 Weak Amber</p>
                  <p className="text-muted-foreground text-xs">CFO/PAT 0 – 0.8</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 rounded-full bg-danger mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-danger">🔴 Red</p>
                  <p className="text-muted-foreground text-xs">CFO/PAT &lt; 0</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reset */}
          <div className="flex justify-end">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              <RotateCcw className="h-4 w-4" /> Clear Data
            </button>
          </div>
        </div>
      )}

      {!user && hasOpsData && (
        <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <p className="text-muted-foreground mb-3">Sign up to save your Consolidated CFO analysis</p>
          <Link href="/signup" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
            Create Free Account
          </Link>
        </div>
      )}
    </div>
  );
}
