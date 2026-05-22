"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft, TrendingUp, Save, RotateCcw, CheckCircle, AlertTriangle, XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { useSavedModel } from "@/lib/use-saved-model";
import { loadSavedState } from "@/lib/saved-state";
import {
  CONSOLIDATED_MONTHS,
  calculateConsolidatedCFO,
  type RAGClassification,
  type ConsolidatedCFOResults,
} from "@/lib/consolidated-cfo-model";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

function classColor(c: RAGClassification): string {
  if (c === "Strong") return "text-emerald-400";
  if (c === "Acceptable") return "text-amber-400";
  if (c === "Weak") return "text-orange-400";
  return "text-red-500";
}

function classBg(c: RAGClassification): string {
  if (c === "Strong") return "bg-emerald-500/10 border-emerald-500/30";
  if (c === "Acceptable") return "bg-amber-500/10 border-amber-500/30";
  if (c === "Weak") return "bg-orange-500/10 border-orange-500/30";
  return "bg-red-500/10 border-red-500/30";
}

function classIcon(c: RAGClassification) {
  if (c === "Strong") return <CheckCircle className="h-5 w-5 text-emerald-400" />;
  if (c === "Acceptable") return <AlertTriangle className="h-5 w-5 text-amber-400" />;
  if (c === "Weak") return <AlertTriangle className="h-5 w-5 text-orange-400" />;
  return <XCircle className="h-5 w-5 text-red-500" />;
}

export default function ConsolidatedCFOPage() {
  const { user, hydrate } = useAuth();
  const [results, setResults] = useState<ConsolidatedCFOResults | null>(null);
  const [hasData, setHasData] = useState(false);

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "consolidated-cfo",
    onLoad: () => {},
    getState: useCallback(() => ({}), []),
  });

  useEffect(() => { hydrate(); }, [hydrate]);

  const refreshData = useCallback(async () => {
    // 1. Try localStorage first (written when Calculate is clicked in Cashflow Ops)
    const local = JSON.parse(localStorage.getItem('cashflowOps') || '{}');
    if (local?.monthlyData && Object.keys(local.monthlyData).length > 0) {
      const result = calculateConsolidatedCFO(local, local.openingCash || 0);
      setResults(result);
      setHasData(true);
      return;
    }
    // 2. Fallback: load raw cashflow-ops inputs from backend and recalculate
    const { calculateCFOps } = await import('@/lib/cashflow-ops-model');
    const opsState = await loadSavedState<Record<string, unknown>>('cashflow-ops');
    if (opsState?.monthsData && Object.keys(opsState.monthsData as object).length > 0) {
      const result = calculateCFOps(
        opsState.monthsData as Record<string, Record<string, number>>,
        (opsState.openingCash as number) || 0
      );
      localStorage.setItem('cashflowOps', JSON.stringify(result));
      const consolidated = calculateConsolidatedCFO(result as unknown as Parameters<typeof calculateConsolidatedCFO>[0], result.openingCash || 0);
      setResults(consolidated);
      setHasData(true);
    } else {
      setHasData(false);
      setResults(null);
    }
  }, []);

  // Load on mount
  useEffect(() => { refreshData(); }, [refreshData]);

  const handleSave = async () => {
    if (!user || !results) return;
    try {
      await api.post("/calculations", {
        modelSlug: "consolidated-cfo",
        inputs: { source: "cashflow-ops" },
        outputs: {
          monthlyData: results.monthlyData,
          monthsAdded: results.monthsAdded,
          summary: results.summary,
          openingCash: results.openingCash,
        },
      });
      await persistState();
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const handleRefresh = async () => {
    await refreshData();
    markDirty();
  };

  const handleReset = () => {
    setResults(null);
    setHasData(false);
    clearPersisted();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <Link href="/models/cash-flow-statement" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Cash Flow
      </Link>

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
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            <RotateCcw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* No Data State */}
      {!hasData && (
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
      {hasData && results && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase mb-1">Opening Cash</p>
              <p className="text-2xl font-bold">{formatCurrency(results.openingCash)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase mb-1">Total Net Cash Flow</p>
              <p className={`text-2xl font-bold ${results.summary.totalNetCashFlow >= 0 ? "text-emerald-400" : "text-red-500"}`}>
                {formatCurrency(results.summary.totalNetCashFlow)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase mb-1">Final Ending Cash</p>
              <p className="text-2xl font-bold">{formatCurrency(results.summary.finalEndingCash)}</p>
            </div>
            <div className={`rounded-2xl border p-5 ${classBg(results.summary.overallClassification)}`}>
              <p className="text-xs uppercase mb-1 opacity-70">Overall Classification</p>
              <p className={`text-2xl font-bold ${classColor(results.summary.overallClassification)}`}>
                {results.summary.overallClassification}
              </p>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CFO/PAT Trend */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">CFO/PAT Ratio Trend</h3>
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
              <h3 className="font-semibold text-sm mb-3">Ending Cash Trend</h3>
              <ReactECharts
                style={{ height: 260 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  grid: { top: 15, right: 15, bottom: 30, left: 55 },
                  xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                  yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
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
                  <div key={month} className={`rounded-xl px-4 py-4 border ${classBg(data.classification)}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold">{month}</span>
                      {classIcon(data.classification)}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CFO/PAT</span>
                        <span className={classColor(data.classification)}>{data.cfoPat.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ending Cash</span>
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
                  <p className="font-semibold text-emerald-400">Strong</p>
                  <p className="text-muted-foreground text-xs">CFO/PAT &gt; 1.2</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 rounded-full bg-amber-400 mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-400">Acceptable</p>
                  <p className="text-muted-foreground text-xs">CFO/PAT 0.8 – 1.2</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 rounded-full bg-orange-400 mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-orange-400">Weak</p>
                  <p className="text-muted-foreground text-xs">CFO/PAT 0 – 0.8</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-3 h-3 rounded-full bg-red-500 mt-1 shrink-0" />
                <div>
                  <p className="font-semibold text-red-500">Red</p>
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

      {!user && hasData && (
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
