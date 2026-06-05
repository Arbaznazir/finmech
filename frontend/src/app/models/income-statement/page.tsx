"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft, FileText, Save, RotateCcw, ChevronDown, ChevronUp,
  Plus, CheckCircle, AlertTriangle, XCircle, Info,
} from "lucide-react";
import { FieldHint } from "@/components/FieldHint";
import { HintLabel } from "@/components/HintLabel";
import { standaloneHint } from "@/lib/standalone-model-hints";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import { formatCurrency, formatPercent } from "@/lib/utils";
import api from "@/lib/api";
import { useSavedModel } from "@/lib/use-saved-model";
import { offerSmartResultsAfterCalculate } from "@/lib/smart-results";
import {
  MONTHS_ORDER,
  INPUT_FIELDS,
  OUTPUT_FIELDS,
  calculateIncomeStatement,
  createEmptyInputs,
  type MonthName,
  type IncomeStatementResults,
} from "@/lib/income-statement-model";

type TabView = "input" | "monthly" | "quarterly" | "annual" | "status";

export default function IncomeStatementPage() {
  const { user, hydrate } = useAuth();
  const [activeMonth, setActiveMonth] = useState<MonthName>("Apr");
  const [monthsData, setMonthsData] = useState<Record<string, Record<string, number>>>({});
  const [results, setResults] = useState<IncomeStatementResults | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>("input");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "income-statement",
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
    const result = calculateIncomeStatement(monthsData);
    setResults(result);
    offerSmartResultsAfterCalculate("income-statement", { monthsData }, result);
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
        modelSlug: "income-statement",
        inputs: monthsData,
        outputs: {
          annual: results.annual,
          monthsAdded: results.monthsAdded,
          derived: results.derived,
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

  // Group input fields by category
  const categories = INPUT_FIELDS.reduce<Record<string, typeof INPUT_FIELDS>>((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {});

  const currentInputs = monthsData[activeMonth] || createEmptyInputs();

  const formatVal = (key: string, value: number | undefined) => {
    if (value === undefined || value === null) return "—";
    if (key.includes("%") || key.includes("Margin")) return formatPercent(value);
    return formatCurrency(value);
  };

  const statusIcon = (color: string) => {
    if (color === "text-success") return <CheckCircle className="h-5 w-5 text-success" />;
    if (color === "text-amber-400") return <AlertTriangle className="h-5 w-5 text-amber-400" />;
    if (color === "text-danger") return <XCircle className="h-5 w-5 text-danger" />;
    return <Info className="h-5 w-5 text-muted-foreground" />;
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
            <FileText className="h-7 w-7 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Income Statement</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-blue-400/10 text-blue-400">
                Standalone
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              Full P&L model — add data month by month. Auto quarterly &amp; annual roll-ups.
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

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 rounded-xl bg-card border border-border p-1 overflow-x-auto">
        {(["input", "monthly", "quarterly", "annual", "status"] as TabView[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors whitespace-nowrap ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {tab === "input" ? "Enter Data" : tab === "monthly" ? "Monthly View" : tab}
          </button>
        ))}
      </div>

      {/* ============ INPUT TAB ============ */}
      {activeTab === "input" && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Month Selector (sidebar) */}
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
              <div className="flex gap-2">
                <button onClick={handleResetMonth} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" /> Clear Month
                </button>
              </div>
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
                                  (e.currentTarget.closest("form") || e.currentTarget.closest("[data-inputs]") || document)
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
                Calculate P&L
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
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground sticky left-0 bg-background/50 min-w-[200px]">Line Item</th>
                  {results.monthsAdded.map((m) => (
                    <th key={m} className="text-right px-4 py-3 font-semibold text-muted-foreground min-w-[110px]">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {OUTPUT_FIELDS.map((field, i) => {
                  const isMargin = field.format === "percent";
                  const isBold = ["Gross Revenue", "Gross Profit", "EBITDA", "EBIT", "PBT", "Net Profit"].includes(field.key);
                  return (
                    <tr key={field.key} className={`border-b border-border/30 ${isBold ? "bg-background/30" : ""}`}>
                      <td className={`px-4 py-2.5 sticky left-0 bg-card ${isBold ? "font-semibold bg-background/30" : "text-muted-foreground"}`}>
                        <HintLabel hint={standaloneHint(field.key)} className={isBold ? "font-semibold" : ""}>{field.label}</HintLabel>
                      </td>
                      {results.monthsAdded.map((m) => {
                        const val = results.monthlyData[m]?.[field.key];
                        const isNeg = typeof val === "number" && val < 0;
                        return (
                          <td key={m} className={`text-right px-4 py-2.5 ${isBold ? "font-semibold" : ""} ${isNeg ? "text-danger" : ""}`}>
                            {formatVal(field.key, val)}
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
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground sticky left-0 bg-background/50 min-w-[200px]">Line Item</th>
                  {Object.keys(results.quarters).map((q) => (
                    <th key={q} className="text-right px-4 py-3 font-semibold text-muted-foreground min-w-[130px]">{q}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {OUTPUT_FIELDS.map((field) => {
                  const isBold = ["Gross Revenue", "Gross Profit", "EBITDA", "EBIT", "PBT", "Net Profit"].includes(field.key);
                  return (
                    <tr key={field.key} className={`border-b border-border/30 ${isBold ? "bg-background/30" : ""}`}>
                      <td className={`px-4 py-2.5 sticky left-0 bg-card ${isBold ? "font-semibold bg-background/30" : "text-muted-foreground"}`}>
                        <HintLabel hint={standaloneHint(field.key)} className={isBold ? "font-semibold" : ""}>{field.label}</HintLabel>
                      </td>
                      {Object.entries(results.quarters).map(([q, data]) => {
                        const val = data[field.key];
                        const isNeg = typeof val === "number" && val < 0;
                        return (
                          <td key={q} className={`text-right px-4 py-2.5 ${isBold ? "font-semibold" : ""} ${isNeg ? "text-danger" : ""}`}>
                            {formatVal(field.key, val)}
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
          {/* Annual P&L */}
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <h2 className="font-semibold mb-5">Annual P&L Summary</h2>
            <div className="space-y-2">
              {OUTPUT_FIELDS.map((field) => {
                const val = results.annual[field.key];
                const isBold = ["Gross Revenue", "Gross Profit", "EBITDA", "EBIT", "Net Profit"].includes(field.key);
                const isNeg = typeof val === "number" && val < 0;
                return (
                  <div key={field.key} className={`flex items-center justify-between rounded-lg px-4 py-2.5 ${isBold ? "bg-background/50 border border-border/50" : ""}`}>
                    <span className={`text-sm inline-flex items-center ${isBold ? "font-semibold" : "text-muted-foreground"}`}>
                      <HintLabel hint={standaloneHint(field.key)}>{field.label}</HintLabel>
                    </span>
                    <span className={`text-sm ${isBold ? "font-bold" : "font-semibold"} ${isNeg ? "text-danger" : ""}`}>
                      {formatVal(field.key, val)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Derived Metrics */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 output-panel">
              <h2 className="font-semibold mb-5">Key Metrics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Gross Margin</p>
                  <p className="text-2xl font-bold">{formatPercent(results.derived.grossMarginAnnual)}</p>
                </div>
                <div className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">EBITDA Margin</p>
                  <p className="text-2xl font-bold">{formatPercent(results.derived.ebitdaMarginAnnual)}</p>
                </div>
                <div className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Net Margin</p>
                  <p className="text-2xl font-bold">{formatPercent(results.derived.netMarginAnnual)}</p>
                </div>
                <div className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Revenue Growth (Q2Q)</p>
                  <p className="text-2xl font-bold">
                    {results.derived.revenueGrowthQ2Q !== null
                      ? formatPercent(results.derived.revenueGrowthQ2Q)
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Monthly Revenue & Net Profit Trend */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Monthly Revenue & Net Profit Trend</h3>
              <ReactECharts
                style={{ height: 260 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  legend: { data: ["Revenue", "Net Profit"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
                  grid: { top: 30, right: 15, bottom: 30, left: 55 },
                  xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                  yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
                  series: [
                    { name: "Revenue", type: "bar", data: results.monthsAdded.map(m => results.monthlyData[m]?.["Gross Revenue"] || 0), itemStyle: { color: "#60a5fa", borderRadius: [4, 4, 0, 0] } },
                    { name: "Net Profit", type: "line", data: results.monthsAdded.map(m => results.monthlyData[m]?.["Net Profit"] || 0), smooth: true, lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" }, symbol: "circle", symbolSize: 5 },
                  ],
                }}
              />
            </div>

            {/* P&L Composition Donut */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Annual P&L Composition</h3>
              <ReactECharts
                style={{ height: 240 }}
                option={{
                  tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  series: [{
                    type: "pie", radius: ["40%", "68%"], center: ["50%", "50%"],
                    label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{d}%" },
                    data: [
                      { value: Math.abs(results.annual["Total of COGS"] || 0), name: "COGS", itemStyle: { color: "#ef4444" } },
                      { value: Math.abs(results.annual["Total Operating Expenses"] || 0), name: "OpEx", itemStyle: { color: "#f59e0b" } },
                      { value: Math.max(0, results.annual["Net Profit"] || 0), name: "Net Profit", itemStyle: { color: "#34d399" } },
                      { value: Math.abs(results.annual["Depreciation & Amortization"] || 0), name: "D&A", itemStyle: { color: "#a78bfa" } },
                      { value: Math.abs(results.annual["Interest Expense"] || 0), name: "Interest", itemStyle: { color: "#60a5fa" } },
                    ].filter(d => d.value > 0),
                  }],
                }}
              />
            </div>

            {/* Margin Comparison Bar */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Annual Margins</h3>
              <ReactECharts
                style={{ height: 180 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 }, formatter: (p: any) => p.map((s: any) => `${s.seriesName}: ${s.value.toFixed(1)}%`).join("<br/>") },
                  grid: { top: 10, right: 15, bottom: 25, left: 100 },
                  xAxis: { type: "value", max: 100, axisLabel: { color: "#888", fontSize: 10, formatter: "{value}%" }, splitLine: { lineStyle: { color: "#222" } } },
                  yAxis: { type: "category", data: ["Net Margin", "EBITDA Margin", "Gross Margin"], axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                  series: [{
                    type: "bar", barWidth: 18,
                    data: [
                      { value: Math.max(0, (results.derived.netMarginAnnual || 0) * 100), itemStyle: { color: "#34d399", borderRadius: [0, 4, 4, 0] } },
                      { value: Math.max(0, (results.derived.ebitdaMarginAnnual || 0) * 100), itemStyle: { color: "#a78bfa", borderRadius: [0, 4, 4, 0] } },
                      { value: Math.max(0, (results.derived.grossMarginAnnual || 0) * 100), itemStyle: { color: "#60a5fa", borderRadius: [0, 4, 4, 0] } },
                    ],
                    label: { show: true, position: "right", color: "#aaa", fontSize: 10, formatter: (p: any) => p.value.toFixed(1) + "%" },
                  }],
                }}
              />
            </div>

            {/* Quarterly Revenue Comparison */}
            {Object.keys(results.quarters).length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5 output-panel">
                <h3 className="font-semibold text-sm mb-3">Quarterly Revenue vs Profit</h3>
                <ReactECharts
                  style={{ height: 220 }}
                  option={{
                    tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                    legend: { data: ["Revenue", "Net Profit"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
                    grid: { top: 30, right: 15, bottom: 25, left: 55 },
                    xAxis: { type: "category", data: Object.keys(results.quarters), axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                    yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
                    series: [
                      { name: "Revenue", type: "bar", data: Object.values(results.quarters).map(q => q["Gross Revenue"] || 0), itemStyle: { color: "#60a5fa", borderRadius: [4, 4, 0, 0] } },
                      { name: "Net Profit", type: "bar", data: Object.values(results.quarters).map(q => q["Net Profit"] || 0), itemStyle: { color: "#34d399", borderRadius: [4, 4, 0, 0] } },
                    ],
                  }}
                />
              </div>
            )}

            {/* Expense Waterfall */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Revenue to Net Profit Waterfall</h3>
              <ReactECharts
                style={{ height: 220 }}
                option={(() => {
                  const rev = results.annual["Gross Revenue"] || 0;
                  const cogs = Math.abs(results.annual["Total of COGS"] || 0);
                  const opex = Math.abs(results.annual["Total Operating Expenses"] || 0);
                  const da = Math.abs(results.annual["Depreciation & Amortization"] || 0);
                  const interest = Math.abs(results.annual["Interest Expense"] || 0);
                  const tax = Math.abs(results.annual["Tax"] || 0);
                  const netProfit = results.annual["Net Profit"] || 0;
                  return {
                    tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                    grid: { top: 15, right: 15, bottom: 35, left: 55 },
                    xAxis: { type: "category", data: ["Revenue", "COGS", "OpEx", "D&A", "Interest", "Tax", "Net Profit"], axisLabel: { color: "#888", fontSize: 9, rotate: 20 }, axisLine: { lineStyle: { color: "#333" } } },
                    yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => `$${(v/1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: "#222" } } },
                    series: [
                      { type: "bar", stack: "w", itemStyle: { borderColor: "transparent", color: "transparent" }, emphasis: { itemStyle: { borderColor: "transparent", color: "transparent" } }, data: [0, rev - cogs, rev - cogs - opex, rev - cogs - opex - da, rev - cogs - opex - da - interest, rev - cogs - opex - da - interest - tax, 0].map(v => Math.max(0, v)) },
                      { type: "bar", stack: "w", data: [
                        { value: rev, itemStyle: { color: "#60a5fa", borderRadius: [4, 4, 0, 0] } },
                        { value: cogs, itemStyle: { color: "#ef4444", borderRadius: [4, 4, 0, 0] } },
                        { value: opex, itemStyle: { color: "#f59e0b", borderRadius: [4, 4, 0, 0] } },
                        { value: da, itemStyle: { color: "#a78bfa", borderRadius: [4, 4, 0, 0] } },
                        { value: interest, itemStyle: { color: "#94a3b8", borderRadius: [4, 4, 0, 0] } },
                        { value: tax, itemStyle: { color: "#fb923c", borderRadius: [4, 4, 0, 0] } },
                        { value: Math.abs(netProfit), itemStyle: { color: netProfit >= 0 ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] } },
                      ] },
                    ],
                  };
                })()}
              />
            </div>

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

      {/* ============ STATUS TAB ============ */}
      {activeTab === "status" && results && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className={`rounded-2xl border bg-card p-8 text-center ${
            results.status.overallColor === "text-success" ? "border-success/30" :
            results.status.overallColor === "text-danger" ? "border-danger/30" :
            results.status.overallColor === "text-amber-400" ? "border-amber-400/30" : "border-border"
          }`}>
            <div className="flex justify-center mb-4">
              {statusIcon(results.status.overallColor)}
            </div>
            <h2 className={`text-xl font-bold mb-2 ${results.status.overallColor}`}>
              {results.status.overall}
            </h2>
            {results.status.guidance && (
              <p className="text-sm text-muted-foreground mt-3">{results.status.guidance}</p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <h3 className="font-semibold mb-4">Quick Numbers</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Revenue (Annual)</span>
                <span className="font-semibold">{formatCurrency(results.annual["Gross Revenue"] || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total COGS</span>
                <span className="font-semibold">{formatCurrency(results.annual["Total of COGS"] || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total OpEx</span>
                <span className="font-semibold">{formatCurrency(results.annual["Total Operating Expenses"] || 0)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-3">
                <span className="font-semibold">Net Profit (PAT)</span>
                <span className={`font-bold ${(results.annual["Net Profit"] || 0) < 0 ? "text-danger" : "text-success"}`}>
                  {formatCurrency(results.annual["Net Profit"] || 0)}
                </span>
              </div>
            </div>
          </div>
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

      {/* CTA for non-logged-in users */}
      {!user && results && (
        <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <p className="text-muted-foreground mb-3">Sign up to save your Income Statement and track it over time</p>
          <Link href="/signup" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
            Create Free Account
          </Link>
        </div>
      )}
    </div>
  );
}
