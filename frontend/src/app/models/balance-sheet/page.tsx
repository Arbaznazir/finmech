"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft, Scale, Save, RotateCcw, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Info, AlertTriangle,
} from "lucide-react";
import { FieldHint } from "@/components/FieldHint";
import { HintLabel } from "@/components/HintLabel";
import { standaloneHint } from "@/lib/standalone-model-hints";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { useSavedModel } from "@/lib/use-saved-model";
import { offerSmartResultsAfterCalculate } from "@/lib/smart-results";
import {
  MONTHS_ORDER,
  INPUT_FIELDS,
  OUTPUT_FIELDS,
  calculateBalanceSheet,
  createEmptyInputs,
  type MonthName,
  type BalanceSheetResults,
} from "@/lib/balance-sheet-model";

type TabView = "input" | "monthly" | "quarterly" | "annual" | "historical" | "insights" | "status";

function fmtVal(key: string, value: number | undefined): string {
  if (value === undefined || value === null) return "—";
  if (key === "BALANCE CHECK") return value === 0 ? "✓ Balanced" : `${formatCurrency(value)} OFF`;
  if (["Current Ratio", "Quick Ratio", "Debt/Equity Ratio", "Proprietary Ratio"].includes(key))
    return (Math.round(value * 100) / 100).toFixed(2);
  return formatCurrency(value);
}

export default function BalanceSheetPage() {
  const { user, hydrate } = useAuth();
  const [activeMonth, setActiveMonth] = useState<MonthName>("Apr");
  const [monthsData, setMonthsData] = useState<Record<string, Record<string, number>>>({});
  const [results, setResults] = useState<BalanceSheetResults | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>("input");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "balance-sheet",
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
    const result = calculateBalanceSheet(monthsData);
    setResults(result);
    offerSmartResultsAfterCalculate("balance-sheet", { monthsData }, result);
    setActiveTab("monthly");
    persistState();
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
        modelSlug: "balance-sheet",
        inputs: monthsData,
        outputs: {
          annual: results.annual,
          monthsAdded: results.monthsAdded,
          status: results.status,
        },
      });
      await persistState();
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const categories = INPUT_FIELDS.reduce<Record<string, typeof INPUT_FIELDS>>((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {});

  const currentInputs = monthsData[activeMonth] || createEmptyInputs();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <Link href="/models?tier=standalone" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-400/10">
            <Scale className="h-7 w-7 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Balance Sheet</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-blue-400/10 text-blue-400">
                Standalone
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              Full balance sheet — Assets, Equity &amp; Liabilities with ratios and balance check.
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
        {(["input", "monthly", "quarterly", "annual", "historical", "insights", "status"] as TabView[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors whitespace-nowrap ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {tab === "input" ? "Enter Data" : tab === "monthly" ? "Monthly View" : tab === "insights" ? "Health Insights" : tab === "status" ? "Balance Check" : tab}
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
          <div className="rounded-2xl border border-border bg-card p-6 output-panel" data-inputs>
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
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center justify-between w-full rounded-lg bg-background/50 px-3 py-2 mb-2"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category}</span>
                  {collapsedCategories[category] ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
                {!collapsedCategories[category] && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1">
                    {fields.map((field) => (
                      <div key={field.key}>
                        <label className="flex items-center text-xs text-muted-foreground mb-1">{field.label}{standaloneHint(field.key) && <FieldHint hint={standaloneHint(field.key)!} />}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
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
                )}
              </div>
            ))}

            <div className="flex gap-3 mt-6 pt-4 border-t border-border">
              <button
                onClick={handleCalculate}
                disabled={addedMonths.length === 0}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                Calculate Balance Sheet
              </button>
              <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MONTHLY VIEW ============ */}
      {activeTab === "monthly" && results && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground sticky left-0 bg-background/50 min-w-[220px]">Line Item</th>
                  {results.monthsAdded.map((m) => (
                    <th key={m} className="text-right px-4 py-3 font-semibold text-muted-foreground min-w-[110px]">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {OUTPUT_FIELDS.map((field) => {
                  const isBold = ["TOTAL ASSETS", "TOTAL LIABILITIES", "BALANCE CHECK", "Total Equity"].includes(field.key);
                  const isSection = field.key.startsWith("Total ") || field.key === "TOTAL ASSETS" || field.key === "TOTAL LIABILITIES";
                  return (
                    <tr key={field.key} className={`border-b border-border/30 ${isBold ? "bg-background/30" : ""}`}>
                      <td className={`px-4 py-2.5 sticky left-0 bg-card ${isBold ? "font-semibold bg-background/30" : isSection ? "font-medium" : "text-muted-foreground"}`}>
                        <HintLabel hint={standaloneHint(field.key)} className={isBold ? "font-semibold" : ""}>{field.label}</HintLabel>
                      </td>
                      {results.monthsAdded.map((m) => {
                        const val = results.monthlyData[m]?.[field.key];
                        const isCheck = field.key === "BALANCE CHECK";
                        const isNeg = typeof val === "number" && val < 0;
                        const isBalanced = isCheck && val === 0;
                        return (
                          <td key={m} className={`text-right px-4 py-2.5 ${isBold ? "font-semibold" : ""} ${isCheck ? (isBalanced ? "text-success font-semibold" : "text-danger font-semibold") : isNeg ? "text-danger" : ""}`}>
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

      {/* ============ QUARTERLY VIEW ============ */}
      {activeTab === "quarterly" && results && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground sticky left-0 bg-background/50 min-w-[220px]">Line Item</th>
                  {Object.keys(results.quarters).map((q) => (
                    <th key={q} className="text-right px-4 py-3 font-semibold text-muted-foreground min-w-[130px]">{q}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {OUTPUT_FIELDS.map((field) => {
                  const isBold = ["TOTAL ASSETS", "TOTAL LIABILITIES", "BALANCE CHECK"].includes(field.key);
                  return (
                    <tr key={field.key} className={`border-b border-border/30 ${isBold ? "bg-background/30" : ""}`}>
                      <td className={`px-4 py-2.5 sticky left-0 bg-card ${isBold ? "font-semibold bg-background/30" : "text-muted-foreground"}`}>
                        <HintLabel hint={standaloneHint(field.key)} className={isBold ? "font-semibold" : ""}>{field.label}</HintLabel>
                      </td>
                      {Object.entries(results.quarters).map(([q, data]) => {
                        const val = data[field.key];
                        const isCheck = field.key === "BALANCE CHECK";
                        const isBalanced = isCheck && val === 0;
                        return (
                          <td key={q} className={`text-right px-4 py-2.5 ${isBold ? "font-semibold" : ""} ${isCheck ? (isBalanced ? "text-success" : "text-danger") : (typeof val === "number" && val < 0) ? "text-danger" : ""}`}>
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

      {/* ============ ANNUAL VIEW ============ */}
      {activeTab === "annual" && results && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <h2 className="font-semibold mb-5">Annual Summary</h2>
            <div className="space-y-2">
              {OUTPUT_FIELDS.map((field) => {
                const val = results.annual[field.key];
                const isBold = ["TOTAL ASSETS", "TOTAL LIABILITIES", "BALANCE CHECK"].includes(field.key);
                const isCheck = field.key === "BALANCE CHECK";
                const isBalanced = isCheck && val === 0;
                return (
                  <div key={field.key} className={`flex items-center justify-between rounded-lg px-4 py-2.5 ${isBold ? "bg-background/50 border border-border/50" : ""}`}>
                    <span className={`text-sm inline-flex items-center ${isBold ? "font-semibold" : "text-muted-foreground"}`}>
                      <HintLabel hint={standaloneHint(field.key)}>{field.label}</HintLabel>
                    </span>
                    <span className={`text-sm font-semibold ${isCheck ? (isBalanced ? "text-success" : "text-danger") : (typeof val === "number" && val < 0) ? "text-danger" : ""}`}>
                      {fmtVal(field.key, val)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 output-panel">
              <h2 className="font-semibold mb-5">Key Ratios (Annual)</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "Current Ratio", label: "Current Ratio" },
                  { key: "Quick Ratio", label: "Quick Ratio" },
                  { key: "Debt/Equity Ratio", label: "Debt/Equity" },
                  { key: "Proprietary Ratio", label: "Proprietary Ratio" },
                ].map((r) => (
                  <div key={r.key} className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{r.label}</p>
                    <p className="text-2xl font-bold">
                      {results.annual[r.key] !== undefined
                        ? (Math.round(results.annual[r.key] * 100) / 100).toFixed(2)
                        : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Assets vs Liabilities Monthly Trend */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Assets vs Liabilities Trend</h3>
              <ReactECharts
                style={{ height: 260 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  legend: { data: ["Total Assets", "Total Liabilities", "Equity"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
                  grid: { top: 30, right: 15, bottom: 30, left: 55 },
                  xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                  yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
                  series: [
                    { name: "Total Assets", type: "bar", data: results.monthsAdded.map(m => results.monthlyData[m]?.["TOTAL ASSETS"] || 0), itemStyle: { color: "#60a5fa", borderRadius: [4, 4, 0, 0] } },
                    { name: "Total Liabilities", type: "bar", data: results.monthsAdded.map(m => results.monthlyData[m]?.["TOTAL LIABILITIES"] || 0), itemStyle: { color: "#ef4444", borderRadius: [4, 4, 0, 0] } },
                    { name: "Equity", type: "line", data: results.monthsAdded.map(m => results.monthlyData[m]?.["Total Equity"] || 0), smooth: true, lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" }, symbol: "circle", symbolSize: 5 },
                  ],
                }}
              />
            </div>

            {/* Asset Composition Donut */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Annual Asset Composition</h3>
              <ReactECharts
                style={{ height: 240 }}
                option={{
                  tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  series: [{
                    type: "pie", radius: ["40%", "68%"], center: ["50%", "50%"],
                    label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{d}%" },
                    data: [
                      { value: Math.abs(results.annual["Total Non-Current Assets"] || 0), name: "Non-Current Assets", itemStyle: { color: "#a78bfa" } },
                      { value: Math.abs(results.annual["Total Current Assets"] || 0), name: "Current Assets", itemStyle: { color: "#60a5fa" } },
                      { value: Math.abs(results.annual["Total Equity"] || 0), name: "Equity", itemStyle: { color: "#34d399" } },
                      { value: Math.abs(results.annual["Total Current Liabilities"] || 0), name: "Current Liabilities", itemStyle: { color: "#f59e0b" } },
                      { value: Math.abs(results.annual["Total Non-Current Liabilities"] || 0), name: "Non-Current Liabilities", itemStyle: { color: "#ef4444" } },
                    ].filter(d => d.value > 0),
                  }],
                }}
              />
            </div>

            {/* Key Ratios Radar */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Financial Ratios</h3>
              <ReactECharts
                style={{ height: 280 }}
                option={{
                  radar: {
                    indicator: [
                      { name: "Current Ratio", max: 5 },
                      { name: "Quick Ratio", max: 5 },
                      { name: "Debt/Equity", max: 5 },
                      { name: "Proprietary", max: 2 },
                    ],
                    axisName: { color: "#aaa", fontSize: 10 },
                    splitArea: { areaStyle: { color: ["rgba(255,255,255,0.02)", "rgba(255,255,255,0.04)"] } },
                    splitLine: { lineStyle: { color: "#333" } },
                    axisLine: { lineStyle: { color: "#444" } },
                  },
                  series: [{
                    type: "radar",
                    data: [{
                      value: [
                        Math.min(5, results.annual["Current Ratio"] || 0),
                        Math.min(5, results.annual["Quick Ratio"] || 0),
                        Math.min(5, results.annual["Debt/Equity Ratio"] || 0),
                        Math.min(2, results.annual["Proprietary Ratio"] || 0),
                      ],
                      name: "Ratios",
                      areaStyle: { color: "rgba(96,165,250,0.2)" },
                      lineStyle: { color: "#60a5fa", width: 2 },
                      itemStyle: { color: "#60a5fa" },
                    }],
                  }],
                }}
              />
            </div>

            {/* Working Capital Trend */}
            {results.monthsAdded.length > 1 && (
              <div className="rounded-2xl border border-border bg-card p-5 output-panel">
                <h3 className="font-semibold text-sm mb-3">Working Capital Trend</h3>
                <ReactECharts
                  style={{ height: 200 }}
                  option={{
                    tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                    grid: { top: 15, right: 15, bottom: 30, left: 55 },
                    xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                    yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => `$${(v/1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: "#222" } } },
                    series: [{
                      type: "line", smooth: true,
                      data: results.monthsAdded.map(m => (results.monthlyData[m]?.["Total Current Assets"] || 0) - (results.monthlyData[m]?.["Total Current Liabilities"] || 0)),
                      areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(52,211,153,0.3)" }, { offset: 1, color: "rgba(52,211,153,0)" }] } },
                      lineStyle: { color: "#34d399", width: 2 },
                      itemStyle: { color: "#34d399" },
                      symbol: "circle", symbolSize: 5,
                    }],
                  }}
                />
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-6 output-panel">
              <h2 className="font-semibold mb-3">Months Coverage</h2>
              <div className="grid grid-cols-6 gap-2">
                {MONTHS_ORDER.map((m) => {
                  const added = results.monthsAdded.includes(m);
                  return (
                    <div key={m} className={`rounded-lg px-2 py-2 text-center text-xs font-medium ${added ? "bg-success/10 text-success border border-success/20" : "bg-muted/30 text-muted-foreground"}`}>
                      {m}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ HISTORICAL TAB ============ */}
      {activeTab === "historical" && results && (
        <div className="space-y-6">
          {/* Key Ratios Historical Trend */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-5">Key Ratios — Monthly Trend</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/50">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground sticky left-0 bg-background/50">Ratio</th>
                    {results.monthsAdded.map((m) => (
                      <th key={m} className="text-right px-4 py-3 font-semibold text-muted-foreground min-w-[100px]">{m}</th>
                    ))}
                    <th className="text-right px-4 py-3 font-semibold text-primary bg-primary/5 min-w-[100px]">Annual Avg</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/30">
                    <td className="px-4 py-2.5 font-semibold text-blue-400 sticky left-0 bg-card">Current Ratio</td>
                    {results.monthsAdded.map((m) => (
                      <td key={m} className={`text-right px-4 py-2.5 ${(results.monthlyData[m]?.["Current Ratio"] || 0) < 1 ? "text-danger" : ""}`}>
                        {(results.monthlyData[m]?.["Current Ratio"] || 0).toFixed(2)}
                      </td>
                    ))}
                    <td className="text-right px-4 py-2.5 font-semibold bg-primary/5">{(results.annual["Current Ratio"] || 0).toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="px-4 py-2.5 font-semibold text-purple-400 sticky left-0 bg-card">Quick Ratio</td>
                    {results.monthsAdded.map((m) => (
                      <td key={m} className={`text-right px-4 py-2.5 ${(results.monthlyData[m]?.["Quick Ratio"] || 0) < 0.8 ? "text-amber-400" : ""}`}>
                        {(results.monthlyData[m]?.["Quick Ratio"] || 0).toFixed(2)}
                      </td>
                    ))}
                    <td className="text-right px-4 py-2.5 font-semibold bg-primary/5">{(results.annual["Quick Ratio"] || 0).toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="px-4 py-2.5 font-semibold text-amber-400 sticky left-0 bg-card">Debt/Equity</td>
                    {results.monthsAdded.map((m) => (
                      <td key={m} className={`text-right px-4 py-2.5 ${(results.monthlyData[m]?.["Debt/Equity Ratio"] || 0) > 1.5 ? "text-amber-400" : ""}`}>
                        {(results.monthlyData[m]?.["Debt/Equity Ratio"] || 0).toFixed(2)}
                      </td>
                    ))}
                    <td className="text-right px-4 py-2.5 font-semibold bg-primary/5">{(results.annual["Debt/Equity Ratio"] || 0).toFixed(2)}</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="px-4 py-2.5 font-semibold text-green-400 sticky left-0 bg-card">Proprietary Ratio</td>
                    {results.monthsAdded.map((m) => (
                      <td key={m} className="text-right px-4 py-2.5">
                        {(results.monthlyData[m]?.["Proprietary Ratio"] || 0).toFixed(2)}
                      </td>
                    ))}
                    <td className="text-right px-4 py-2.5 font-semibold bg-primary/5">{(results.annual["Proprietary Ratio"] || 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Working Capital & Balance Check History */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-4">Working Capital & Balance Check History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background/50">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground sticky left-0 bg-background/50">Month</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Working Capital</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Current Assets</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Current Liabilities</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Balance Status</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {results.status.map((s) => (
                    <tr key={s.month} className="border-b border-border/30">
                      <td className="px-4 py-2.5 font-semibold sticky left-0 bg-card">{s.month}</td>
                      <td className={`text-right px-4 py-2.5 ${s.workingCapital < 0 ? "text-danger" : "text-success"}`}>{formatCurrency(s.workingCapital)}</td>
                      <td className="text-right px-4 py-2.5">{formatCurrency(results.monthlyData[s.month]?.["Total Current Assets"] || 0)}</td>
                      <td className="text-right px-4 py-2.5">{formatCurrency(results.monthlyData[s.month]?.["Total Current Liability"] || 0)}</td>
                      <td className="text-center px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.status === "GREEN" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                          {s.status === "GREEN" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {s.status === "GREEN" ? "Balanced" : "Error"}
                        </span>
                      </td>
                      <td className={`text-right px-4 py-2.5 ${Math.abs(s.balanceCheck) >= 1 ? "text-danger font-semibold" : ""}`}>
                        {Math.abs(s.balanceCheck) < 1 ? "—" : formatCurrency(s.balanceCheck)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Asset & Liability Composition Over Time */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">Current Ratio Trend</h3>
              <ReactECharts
                style={{ height: 260 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  legend: { data: ["Current Ratio", "Threshold (1.5)", "Threshold (1.0)"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
                  grid: { top: 30, right: 15, bottom: 30, left: 55 },
                  xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                  yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: "{value}x" }, splitLine: { lineStyle: { color: "#222" } } },
                  series: [
                    { name: "Current Ratio", type: "line", data: results.monthsAdded.map(m => results.monthlyData[m]?.["Current Ratio"] || 0), smooth: true, lineStyle: { color: "#60a5fa", width: 3 }, itemStyle: { color: "#60a5fa" }, symbol: "circle", symbolSize: 6 },
                    { name: "Threshold (1.5)", type: "line", data: results.monthsAdded.map(() => 1.5), lineStyle: { color: "#f59e0b", type: "dashed", width: 2 }, symbol: "none" },
                    { name: "Threshold (1.0)", type: "line", data: results.monthsAdded.map(() => 1.0), lineStyle: { color: "#ef4444", type: "dashed", width: 2 }, symbol: "none" },
                  ],
                }}
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">Working Capital Trend</h3>
              <ReactECharts
                style={{ height: 260 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  grid: { top: 15, right: 15, bottom: 30, left: 55 },
                  xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                  yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => `₹${(v/1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: "#222" } } },
                  series: [{
                    type: "bar",
                    data: results.monthsAdded.map(m => {
                      const v = results.monthlyData[m]?.["Working Capital"] || 0;
                      return { value: v, itemStyle: { color: v >= 0 ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] } };
                    }),
                  }],
                }}
              />
            </div>
          </div>

          {/* Debt/Equity Trend */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Debt/Equity Ratio Trend</h3>
            <ReactECharts
              style={{ height: 240 }}
              option={{
                tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                legend: { data: ["Debt/Equity", "Conservative (1.0)", "High Risk (3.0)"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
                grid: { top: 30, right: 15, bottom: 30, left: 55 },
                xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: "{value}x" }, splitLine: { lineStyle: { color: "#222" } } },
                series: [
                  { name: "Debt/Equity", type: "line", data: results.monthsAdded.map(m => results.monthlyData[m]?.["Debt/Equity Ratio"] || 0), smooth: true, lineStyle: { color: "#a78bfa", width: 3 }, itemStyle: { color: "#a78bfa" }, symbol: "circle", symbolSize: 6 },
                  { name: "Conservative (1.0)", type: "line", data: results.monthsAdded.map(() => 1.0), lineStyle: { color: "#34d399", type: "dashed", width: 2 }, symbol: "none" },
                  { name: "High Risk (3.0)", type: "line", data: results.monthsAdded.map(() => 3.0), lineStyle: { color: "#ef4444", type: "dashed", width: 2 }, symbol: "none" },
                ],
              }}
            />
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

          {/* Detailed Guidance */}
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <h3 className="font-semibold mb-4">Financial Health Analysis</h3>
            <div className="space-y-3">
              {results.insights.guidance.map((item, idx) => (
                <div key={idx} className={`flex items-start gap-3 rounded-xl px-4 py-3 ${
                  item.startsWith("✓") ? "bg-success/5 border border-success/20" :
                  item.startsWith("🚨") ? "bg-danger/10 border border-danger/30" :
                  item.startsWith("⚠️") ? "bg-amber-400/5 border border-amber-400/20" :
                  item.startsWith("📊") ? "bg-blue-400/5 border border-blue-400/20" :
                  item.startsWith("💡") ? "bg-purple-400/5 border border-purple-400/20" :
                  "bg-muted/30 border border-border/50"
                }`}>
                  <span className="text-sm leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Avg Current Ratio</p>
              <p className="text-2xl font-bold">{(results.annual["Current Ratio"] || 0).toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Debt/Equity</p>
              <p className="text-2xl font-bold">{(results.annual["Debt/Equity Ratio"] || 0).toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Working Capital</p>
              <p className={`text-2xl font-bold ${(results.annual["Working Capital"] || 0) < 0 ? "text-danger" : ""}`}>
                {formatCurrency(results.annual["Working Capital"] || 0)}
              </p>
            </div>
            <div className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Assets</p>
              <p className="text-2xl font-bold">{formatCurrency(results.annual["TOTAL ASSETS"] || 0)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ============ BALANCE CHECK / STATUS TAB ============ */}
      {activeTab === "status" && results && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <h2 className="font-semibold mb-5">Monthly Balance Check</h2>
            <div className="space-y-3">
              {results.status.map((s) => (
                <div key={s.month} className={`flex items-center justify-between rounded-xl px-5 py-4 border ${
                  s.status === "GREEN" ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"
                }`}>
                  <div className="flex items-center gap-3">
                    {s.status === "GREEN"
                      ? <CheckCircle className="h-5 w-5 text-success" />
                      : <XCircle className="h-5 w-5 text-danger" />}
                    <div>
                      <p className="font-semibold">{s.month}</p>
                      <p className="text-xs text-muted-foreground">
                        Working Capital: {formatCurrency(s.workingCapital)} · Current Ratio: {(Math.round(s.currentRatio * 100) / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${s.status === "GREEN" ? "text-success" : "text-danger"}`}>
                    {s.status === "GREEN" ? "Balanced" : `Off by ${formatCurrency(s.balanceCheck)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

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
          <p className="text-muted-foreground mb-3">Sign up to save your Balance Sheet and track it over time</p>
          <Link href="/signup" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
            Create Free Account
          </Link>
        </div>
      )}
    </div>
  );
}
