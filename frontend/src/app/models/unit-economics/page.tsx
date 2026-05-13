"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft, Users, Save, RotateCcw, CheckCircle,
  AlertTriangle, XCircle, Info,
} from "lucide-react";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { useSavedModel } from "@/lib/use-saved-model";
import {
  MONTHS_ORDER,
  INPUT_FIELDS,
  OUTPUT_FIELDS,
  calculateUnitEconomics,
  createEmptyInputs,
  type MonthName,
  type UnitEconomicsResults,
  type RAGStatus,
} from "@/lib/unit-economics-model";

type TabView = "input" | "monthly" | "status";

function fmtVal(key: string, value: number | string | undefined): string {
  if (value === undefined || value === null) return "—";
  if (key === "KPI Summary Dashboard") return String(value);
  if (typeof value === "string") return value;
  if (key.includes("%")) return value.toFixed(1) + "%";
  if (key.includes("Payback") || key.includes("Months")) return (Math.round(value * 10) / 10).toFixed(1) + " mo";
  if (key === "CAC" || key === "ARPU" || key === "LTV") return formatCurrency(value);
  if (key.includes("Customer") || key.includes("Active")) return Math.round(value).toLocaleString();
  return formatCurrency(value);
}

function ragColor(s: RAGStatus): string {
  if (s === "GREEN") return "text-success";
  if (s === "AMBER") return "text-amber-400";
  return "text-danger";
}

function ragBg(s: RAGStatus): string {
  if (s === "GREEN") return "bg-success/10 border-success/30";
  if (s === "AMBER") return "bg-amber-400/10 border-amber-400/30";
  return "bg-danger/10 border-danger/30";
}

function ragIcon(s: RAGStatus) {
  if (s === "GREEN") return <CheckCircle className="h-5 w-5 text-success" />;
  if (s === "AMBER") return <AlertTriangle className="h-5 w-5 text-amber-400" />;
  return <XCircle className="h-5 w-5 text-danger" />;
}

export default function UnitEconomicsPage() {
  const { user, hydrate } = useAuth();
  const [activeMonth, setActiveMonth] = useState<MonthName>("Apr");
  const [monthsData, setMonthsData] = useState<Record<string, Record<string, number>>>({});
  const [results, setResults] = useState<UnitEconomicsResults | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>("input");
  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "unit-economics",
    onLoad: (data: Record<string, unknown>) => {
      if (data.monthsData) setMonthsData(data.monthsData as Record<string, Record<string, number>>);
    },
    getState: useCallback(() => ({ monthsData }), [monthsData]),
  });

  useEffect(() => { hydrate(); }, [hydrate]);

  const addedMonths = Object.keys(monthsData);

  const handleInputChange = (key: string, value: string) => {
    setMonthsData((prev) => ({
      ...prev,
      [activeMonth]: {
        ...(prev[activeMonth] || createEmptyInputs()),
        [key]: parseFloat(value) || 0,
      },
    }));
    markDirty();
  };

  const handleCalculate = useCallback(() => {
    if (Object.keys(monthsData).length === 0) return;
    const result = calculateUnitEconomics(monthsData);
    setResults(result);
    setActiveTab("monthly");
  }, [monthsData]);

  const handleReset = () => {
    setMonthsData({});
    setResults(null);
    setActiveTab("input");
    clearPersisted();
  };

  const handleResetMonth = () => {
    setMonthsData((prev) => {
      const next = { ...prev };
      delete next[activeMonth];
      return next;
    });
    markDirty();
  };

  const handleSave = async () => {
    if (!user || !results) return;
    try {
      await api.post("/calculations", {
        modelSlug: "unit-economics",
        inputs: monthsData,
        outputs: { monthsAdded: results.monthsAdded, status: results.status },
      });
      await persistState();
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const currentInputs = monthsData[activeMonth] || createEmptyInputs();

  const categories = INPUT_FIELDS.reduce<Record<string, typeof INPUT_FIELDS>>((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <Link href="/models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-blue-400/10">
            <Users className="h-7 w-7 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Unit Economics</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-blue-400/10 text-blue-400">
                Standalone
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              CAC, LTV, ARPU, Payback Period, Churn &amp; Growth with RAG classification.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {addedMonths.length} of 12 months entered
              {addedMonths.length > 0 && ` (${addedMonths.join(", ")})`}
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
        {(["input", "monthly", "status"] as TabView[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors whitespace-nowrap ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {tab === "input" ? "Enter Data" : tab === "monthly" ? "Monthly KPIs" : "KPI Dashboard"}
          </button>
        ))}
      </div>

      {/* ============ INPUT TAB ============ */}
      {activeTab === "input" && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Month Selector */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3">Select Month</h3>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-1.5">
              {MONTHS_ORDER.map((month) => {
                const hasData = !!monthsData[month];
                return (
                  <button
                    key={month}
                    onClick={() => setActiveMonth(month)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      activeMonth === month
                        ? "bg-primary text-primary-foreground"
                        : hasData
                          ? "bg-success/10 text-success border border-success/20"
                          : "hover:bg-muted border border-transparent"
                    }`}
                  >
                    <span>{month}</span>
                    {hasData && activeMonth !== month && <CheckCircle className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input form */}
          <div className="rounded-2xl border border-border bg-card p-6" data-inputs>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold">
                Inputs for <span className="text-primary">{activeMonth}</span>
              </h2>
              <button onClick={handleResetMonth} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-1">
                <RotateCcw className="h-3 w-3" /> Clear Month
              </button>
            </div>

            {Object.entries(categories).map(([category, fields]) => (
              <div key={category} className="mb-4">
                <div className="rounded-lg bg-background/50 px-3 py-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1">
                  {fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs text-muted-foreground mb-1">{field.label}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.prefix}</span>
                        <input
                          type="number"
                          data-field={field.key}
                          value={currentInputs[field.key] || ""}
                          onChange={(e) => handleInputChange(field.key, e.target.value)}
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
                              }
                            }
                          }}
                          placeholder="0"
                          className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex gap-3 mt-6 pt-4 border-t border-border">
              <button
                onClick={handleCalculate}
                disabled={addedMonths.length === 0}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                Calculate Unit Economics
              </button>
              <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MONTHLY KPIs ============ */}
      {activeTab === "monthly" && results && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground sticky left-0 bg-background/50 min-w-[200px]">KPI</th>
                  {results.monthsAdded.map((m) => (
                    <th key={m} className="text-right px-4 py-3 font-semibold text-muted-foreground min-w-[110px]">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {OUTPUT_FIELDS.map((field) => {
                  const isBold = ["CAC", "LTV", "ARPU", "KPI Summary Dashboard"].includes(field.key);
                  return (
                    <tr key={field.key} className={`border-b border-border/30 ${isBold ? "bg-background/30" : ""}`}>
                      <td className={`px-4 py-2.5 sticky left-0 bg-card ${isBold ? "font-semibold bg-background/30" : "text-muted-foreground"}`}>
                        {field.label}
                      </td>
                      {results.monthsAdded.map((m) => {
                        const val = results.monthlyData[m]?.[field.key];
                        const isRag = field.key === "KPI Summary Dashboard";
                        return (
                          <td key={m} className={`text-right px-4 py-2.5 ${isBold ? "font-semibold" : ""} ${
                            isRag ? ragColor(val as RAGStatus) : ""
                          }`}>
                            {fmtVal(field.key, val)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ STATUS TAB ============ */}
      {activeTab === "status" && results && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Summary cards */}
          {results.status.length > 0 && (() => {
            const last = results.status[results.status.length - 1];
            return (
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl bg-card border border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Latest LTV/CAC</p>
                  <p className="text-2xl font-bold">{last.ltvCacRatio.toFixed(1)}x</p>
                </div>
                <div className="rounded-xl bg-card border border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Latest Churn</p>
                  <p className="text-2xl font-bold">{last.churnRate.toFixed(1)}%</p>
                </div>
                <div className="rounded-xl bg-card border border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Latest Status</p>
                  <p className={`text-2xl font-bold ${ragColor(last.rag)}`}>{last.rag}</p>
                </div>
              </div>
            );
          })()}

          {/* Per-month */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-5">Monthly KPI Dashboard</h2>
            <div className="space-y-3">
              {results.status.map((s) => (
                <div key={s.month} className={`flex items-center justify-between rounded-xl px-5 py-4 border ${ragBg(s.rag)}`}>
                  <div className="flex items-center gap-3">
                    {ragIcon(s.rag)}
                    <div>
                      <p className="font-semibold">{s.month}</p>
                      <p className="text-xs text-muted-foreground">
                        LTV/CAC: {s.ltvCacRatio.toFixed(1)}x · Churn: {s.churnRate.toFixed(1)}% · Growth: {s.growthRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${ragColor(s.rag)}`}>{s.rag}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold text-sm mb-3">RAG Classification</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-success shrink-0" />
                <span><strong className="text-success">GREEN</strong> — LTV/CAC &gt; 3x, Churn &lt; 5%, Growth &gt; 20%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                <span><strong className="text-amber-400">AMBER</strong> — LTV/CAC &gt; 1x, Churn &lt; 10%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-danger shrink-0" />
                <span><strong className="text-danger">RED</strong> — Below AMBER thresholds</span>
              </div>
            </div>
          </div>

          {/* Charts */}
          {results.status.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CAC vs LTV Trend */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-sm mb-3">CAC vs LTV Trend</h3>
                <ReactECharts
                  style={{ height: 240 }}
                  option={{
                    tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                    legend: { data: ["CAC", "LTV"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
                    grid: { top: 30, right: 15, bottom: 30, left: 55 },
                    xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                    yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => `$${v.toLocaleString()}` }, splitLine: { lineStyle: { color: "#222" } } },
                    series: [
                      { name: "CAC", type: "bar", data: results.monthsAdded.map(m => results.monthlyData[m]?.["CAC"] || 0), itemStyle: { color: "#ef4444", borderRadius: [4, 4, 0, 0] } },
                      { name: "LTV", type: "line", data: results.monthsAdded.map(m => results.monthlyData[m]?.["LTV"] || 0), smooth: true, lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" }, symbol: "circle", symbolSize: 5 },
                    ],
                  }}
                />
              </div>

              {/* Churn & Growth Trend */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-sm mb-3">Churn & Growth Rates</h3>
                <ReactECharts
                  style={{ height: 240 }}
                  option={{
                    tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                    legend: { data: ["Churn %", "Growth %"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
                    grid: { top: 30, right: 15, bottom: 30, left: 45 },
                    xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                    yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: "{value}%" }, splitLine: { lineStyle: { color: "#222" } } },
                    series: [
                      { name: "Churn %", type: "line", data: results.status.map(s => s.churnRate), smooth: true, lineStyle: { color: "#ef4444", width: 2 }, itemStyle: { color: "#ef4444" }, symbol: "circle", symbolSize: 5 },
                      { name: "Growth %", type: "line", data: results.status.map(s => s.growthRate), smooth: true, lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" }, symbol: "circle", symbolSize: 5 },
                    ],
                  }}
                />
              </div>

              {/* LTV/CAC Ratio Bar */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-sm mb-3">LTV/CAC Ratio by Month</h3>
                <ReactECharts
                  style={{ height: 220 }}
                  option={{
                    tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                    grid: { top: 15, right: 15, bottom: 30, left: 45 },
                    xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                    yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: "{value}x" }, splitLine: { lineStyle: { color: "#222" } } },
                    series: [{
                      type: "bar",
                      data: results.status.map(s => ({
                        value: Math.round(s.ltvCacRatio * 10) / 10,
                        itemStyle: { color: s.ltvCacRatio > 3 ? "#34d399" : s.ltvCacRatio > 1 ? "#f59e0b" : "#ef4444", borderRadius: [4, 4, 0, 0] },
                      })),
                      markLine: { data: [{ yAxis: 3, lineStyle: { color: "#34d399", type: "dashed" } }], label: { formatter: "3x target", color: "#34d399", fontSize: 9 }, symbol: "none" },
                    }],
                  }}
                />
              </div>

              {/* KPI Radar (latest month) */}
              {(() => {
                const last = results.status[results.status.length - 1];
                return (
                  <div className="rounded-2xl border border-border bg-card p-5">
                    <h3 className="font-semibold text-sm mb-3">Latest Month KPI Radar</h3>
                    <ReactECharts
                      style={{ height: 240 }}
                      option={{
                        radar: {
                          indicator: [
                            { name: "LTV/CAC", max: 6 },
                            { name: "Growth %", max: 50 },
                            { name: "Low Churn\n(inv)", max: 20 },
                          ],
                          axisName: { color: "#aaa", fontSize: 9 },
                          splitArea: { areaStyle: { color: ["rgba(255,255,255,0.02)", "rgba(255,255,255,0.04)"] } },
                          splitLine: { lineStyle: { color: "#333" } },
                          axisLine: { lineStyle: { color: "#444" } },
                        },
                        series: [{
                          type: "radar",
                          data: [{
                            value: [
                              Math.min(6, Math.max(0, last.ltvCacRatio)),
                              Math.min(50, Math.max(0, last.growthRate)),
                              Math.max(0, 20 - last.churnRate),
                            ],
                            areaStyle: { color: "rgba(96,165,250,0.2)" },
                            lineStyle: { color: "#60a5fa", width: 2 },
                            itemStyle: { color: "#60a5fa" },
                          }],
                        }],
                      }}
                    />
                  </div>
                );
              })()}
            </div>
          )}

          {results.status.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p>No data yet. Enter month data and calculate.</p>
            </div>
          )}
        </div>
      )}

      {/* No results prompt */}
      {activeTab !== "input" && !results && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="mb-4">No results yet. Enter data and click Calculate.</p>
          <button onClick={() => setActiveTab("input")} className="text-primary hover:underline text-sm">
            Go to Enter Data
          </button>
        </div>
      )}

      {!user && results && (
        <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <p className="text-muted-foreground mb-3">Sign up to save your Unit Economics analysis</p>
          <Link href="/signup" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
            Create Free Account
          </Link>
        </div>
      )}
    </div>
  );
}
