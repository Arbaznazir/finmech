"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft, ArrowRightLeft, Save, RotateCcw, ChevronDown, ChevronUp,
  CheckCircle, AlertTriangle, XCircle, Info,
} from "lucide-react";
import { FieldHint } from "@/components/FieldHint";
import { FIELD_HINTS } from "@/lib/field-hints";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { useSavedModel } from "@/lib/use-saved-model";
import {
  MONTHS_ORDER,
  INPUT_FIELDS,
  OUTPUT_FIELDS,
  calculateCashFlow,
  createEmptyInputs,
  type MonthName,
  type CashFlowResults,
  type RatioClass,
} from "@/lib/cashflow-model";

type TabView = "input" | "monthly" | "quarterly" | "annual" | "status";

function fmtVal(key: string, value: number | string | undefined): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "string") return value;
  if (key.includes("/")) return (Math.round(value * 100) / 100).toFixed(2);
  return formatCurrency(value);
}

function classColor(c: RatioClass): string {
  if (c === "Strong") return "text-success";
  if (c === "Acceptable") return "text-amber-400";
  if (c === "Weak") return "text-orange-400";
  return "text-danger";
}

function classBg(c: RatioClass): string {
  if (c === "Strong") return "bg-success/10 border-success/30";
  if (c === "Acceptable") return "bg-amber-400/10 border-amber-400/30";
  if (c === "Weak") return "bg-orange-400/10 border-orange-400/30";
  return "bg-danger/10 border-danger/30";
}

function classIcon(c: RatioClass) {
  if (c === "Strong") return <CheckCircle className="h-5 w-5 text-success" />;
  if (c === "Acceptable") return <AlertTriangle className="h-5 w-5 text-amber-400" />;
  if (c === "Weak") return <AlertTriangle className="h-5 w-5 text-orange-400" />;
  return <XCircle className="h-5 w-5 text-danger" />;
}

export default function CashFlowStatementPage() {
  const { user, hydrate } = useAuth();
  const [activeMonth, setActiveMonth] = useState<MonthName>("April");
  const [monthsData, setMonthsData] = useState<Record<string, Record<string, number>>>({});
  const [openingCash, setOpeningCash] = useState(0);
  const [results, setResults] = useState<CashFlowResults | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>("input");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "cash-flow-statement",
    onLoad: (data: Record<string, unknown>) => {
      if (data.monthsData) setMonthsData(data.monthsData as Record<string, Record<string, number>>);
      if (typeof data.openingCash === "number") setOpeningCash(data.openingCash);
    },
    getState: useCallback(() => ({ monthsData, openingCash }), [monthsData, openingCash]),
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
    const result = calculateCashFlow(monthsData, openingCash);
    setResults(result);
    setActiveTab("monthly");
  }, [monthsData, openingCash]);

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
        modelSlug: "cash-flow-statement",
        inputs: { openingCash, monthsData },
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
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-cyan-400/10">
            <ArrowRightLeft className="h-7 w-7 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Cash Flow Statement</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-blue-400/10 text-blue-400">
                Standalone
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              CFO, CFI, CFF with Net Cash Flow, Ending Cash, ratios &amp; classification.
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
        {(["input", "monthly", "quarterly", "annual", "status"] as TabView[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors whitespace-nowrap ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {tab === "input" ? "Enter Data" : tab === "monthly" ? "Monthly View" : tab === "status" ? "CFO Quality" : tab}
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

            {/* Opening Cash (global) */}
            <div className="mb-5 rounded-lg bg-background/50 p-4 border border-border/50">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Opening Cash Balance (April 1st)</label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <input
                  type="number"
                  value={openingCash || ""}
                  onChange={(e) => { setOpeningCash(parseFloat(e.target.value) || 0); markDirty(); }}
                  placeholder="0"
                  className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
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
                        <label className="flex items-center text-xs text-muted-foreground mb-1">{field.label}{FIELD_HINTS[field.key] && <FieldHint hint={FIELD_HINTS[field.key]} />}</label>
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
                Calculate Cash Flow
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
          <div className="px-4 py-3 border-b border-border bg-background/50 text-sm">
            <span className="text-muted-foreground">Opening Cash: </span>
            <span className="font-semibold">{formatCurrency(results.openingCash)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground sticky left-0 bg-background/50 min-w-[260px]">Line Item</th>
                  {results.monthsAdded.map((m) => (
                    <th key={m} className="text-right px-4 py-3 font-semibold text-muted-foreground min-w-[110px]">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {OUTPUT_FIELDS.map((field) => {
                  const isBold = ["Net Cash Flow from Operating Activities (CFO)", "Cash Flow from Investing Activities (CFI)", "Cash Flow from Financing Activities (CFF)", "Net Cash Flow", "Ending Cash"].includes(field.key);
                  return (
                    <tr key={field.key} className={`border-b border-border/30 ${isBold ? "bg-background/30" : ""}`}>
                      <td className={`px-4 py-2.5 sticky left-0 bg-card ${isBold ? "font-semibold bg-background/30" : "text-muted-foreground"}`}>
                        {field.label}
                      </td>
                      {results.monthsAdded.map((m) => {
                        const val = results.monthlyData[m]?.[field.key];
                        const numVal = typeof val === "number" ? val : 0;
                        const isNeg = numVal < 0;
                        return (
                          <td key={m} className={`text-right px-4 py-2.5 ${isBold ? "font-semibold" : ""} ${isNeg ? "text-danger" : ""}`}>
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
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground sticky left-0 bg-background/50 min-w-[260px]">Line Item</th>
                  {Object.keys(results.quarters).map((q) => (
                    <th key={q} className="text-right px-4 py-3 font-semibold text-muted-foreground min-w-[130px]">{q}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {OUTPUT_FIELDS.map((field) => {
                  const isBold = ["Net Cash Flow from Operating Activities (CFO)", "Net Cash Flow", "Ending Cash"].includes(field.key);
                  return (
                    <tr key={field.key} className={`border-b border-border/30 ${isBold ? "bg-background/30" : ""}`}>
                      <td className={`px-4 py-2.5 sticky left-0 bg-card ${isBold ? "font-semibold bg-background/30" : "text-muted-foreground"}`}>
                        {field.label}
                      </td>
                      {Object.entries(results.quarters).map(([q, data]) => {
                        const val = data[field.key];
                        const isNeg = typeof val === "number" && val < 0;
                        return (
                          <td key={q} className={`text-right px-4 py-2.5 ${isBold ? "font-semibold" : ""} ${isNeg ? "text-danger" : ""}`}>
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
                const isBold = ["Net Cash Flow from Operating Activities (CFO)", "Net Cash Flow", "Ending Cash"].includes(field.key);
                const isNeg = typeof val === "number" && val < 0;
                return (
                  <div key={field.key} className={`flex items-center justify-between rounded-lg px-4 py-2.5 ${isBold ? "bg-background/50 border border-border/50" : ""}`}>
                    <span className={`text-sm ${isBold ? "font-semibold" : "text-muted-foreground"}`}>{field.label}</span>
                    <span className={`text-sm font-semibold ${isNeg ? "text-danger" : ""}`}>
                      {fmtVal(field.key, val)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            {/* Key metrics */}
            <div className="rounded-2xl border border-border bg-card p-6 output-panel">
              <h2 className="font-semibold mb-5">Cash Flow Breakdown</h2>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { key: "Net Cash Flow from Operating Activities (CFO)", label: "CFO", color: "text-cyan-400" },
                  { key: "Cash Flow from Investing Activities (CFI)", label: "CFI", color: "text-purple-400" },
                  { key: "Cash Flow from Financing Activities (CFF)", label: "CFF", color: "text-amber-400" },
                  { key: "Net Cash Flow", label: "Net Cash Flow", color: "text-foreground" },
                ].map((item) => {
                  const val = results.annual[item.key] || 0;
                  return (
                    <div key={item.key} className="flex items-center justify-between rounded-xl bg-background/50 border border-border/50 px-4 py-3">
                      <span className={`text-sm font-medium ${item.color}`}>{item.label}</span>
                      <span className={`text-lg font-bold ${val < 0 ? "text-danger" : ""}`}>
                        {formatCurrency(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CFO / CFI / CFF Stacked Bar */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Monthly CFO, CFI & CFF</h3>
              <ReactECharts
                style={{ height: 260 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  legend: { data: ["CFO", "CFI", "CFF"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
                  grid: { top: 30, right: 15, bottom: 30, left: 55 },
                  xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                  yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
                  series: [
                    { name: "CFO", type: "bar", stack: "cf", data: results.monthsAdded.map(m => results.monthlyData[m]?.["Net Cash Flow from Operating Activities (CFO)"] || 0), itemStyle: { color: "#22d3ee" } },
                    { name: "CFI", type: "bar", stack: "cf", data: results.monthsAdded.map(m => results.monthlyData[m]?.["Cash Flow from Investing Activities (CFI)"] || 0), itemStyle: { color: "#a78bfa" } },
                    { name: "CFF", type: "bar", stack: "cf", data: results.monthsAdded.map(m => results.monthlyData[m]?.["Cash Flow from Financing Activities (CFF)"] || 0), itemStyle: { color: "#f59e0b" } },
                  ],
                }}
              />
            </div>

            {/* Ending Cash Line */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Ending Cash Trend</h3>
              <ReactECharts
                style={{ height: 220 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  grid: { top: 15, right: 15, bottom: 30, left: 55 },
                  xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                  yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
                  series: [{
                    type: "line", smooth: true,
                    data: results.monthsAdded.map(m => results.monthlyData[m]?.["Ending Cash"] || 0),
                    areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(34,211,238,0.3)" }, { offset: 1, color: "rgba(34,211,238,0)" }] } },
                    lineStyle: { color: "#22d3ee", width: 2 },
                    itemStyle: { color: "#22d3ee" },
                    symbol: "circle", symbolSize: 5,
                    markLine: { data: [{ yAxis: 0, lineStyle: { color: "#ef4444", type: "dashed" } }], label: { show: false }, symbol: "none" },
                  }],
                }}
              />
            </div>

            {/* Annual CF Breakdown Donut */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Annual Cash Flow Composition</h3>
              <ReactECharts
                style={{ height: 240 }}
                option={{
                  tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  series: [{
                    type: "pie", radius: ["40%", "68%"], center: ["50%", "50%"],
                    label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{d}%" },
                    data: [
                      { value: Math.abs(results.annual["Net Cash Flow from Operating Activities (CFO)"] || 0), name: "CFO", itemStyle: { color: "#22d3ee" } },
                      { value: Math.abs(results.annual["Cash Flow from Investing Activities (CFI)"] || 0), name: "CFI", itemStyle: { color: "#a78bfa" } },
                      { value: Math.abs(results.annual["Cash Flow from Financing Activities (CFF)"] || 0), name: "CFF", itemStyle: { color: "#f59e0b" } },
                    ].filter(d => d.value > 0),
                  }],
                }}
              />
            </div>

            {/* Net Cash Flow Bar (per month) */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Monthly Net Cash Flow</h3>
              <ReactECharts
                style={{ height: 220 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  grid: { top: 15, right: 15, bottom: 30, left: 55 },
                  xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                  yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => `$${(v/1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: "#222" } } },
                  series: [{
                    type: "bar",
                    data: results.monthsAdded.map(m => {
                      const val = results.monthlyData[m]?.["Net Cash Flow"] || 0;
                      return { value: val, itemStyle: { color: val >= 0 ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] } };
                    }),
                  }],
                }}
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

      {/* ============ STATUS / CFO QUALITY TAB ============ */}
      {activeTab === "status" && results && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <h2 className="font-semibold mb-5">CFO Quality (per month)</h2>
            <div className="space-y-3">
              {results.status.map((s) => (
                <div key={s.month} className={`flex items-center justify-between rounded-xl px-5 py-4 border ${classBg(s.classification)}`}>
                  <div className="flex items-center gap-3">
                    {classIcon(s.classification)}
                    <div>
                      <p className="font-semibold">{s.month}</p>
                      <p className="text-xs text-muted-foreground">
                        CFO/PAT: {s.cfoPat.toFixed(2)} · CFO/EBITDA: {s.cfoEbitda.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${classColor(s.classification)}`}>
                    {s.classification}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <h3 className="font-semibold text-sm mb-3">CFO/PAT Classification</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-success shrink-0" />
                <span><strong className="text-success">Strong</strong> — CFO/PAT &gt; 1.2</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                <span><strong className="text-amber-400">Acceptable</strong> — CFO/PAT 0.8 – 1.2</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-400 shrink-0" />
                <span><strong className="text-orange-400">Weak</strong> — CFO/PAT 0 – 0.8</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-danger shrink-0" />
                <span><strong className="text-danger">Red</strong> — CFO/PAT &lt; 0</span>
              </div>
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
          <p className="text-muted-foreground mb-3">Sign up to save your Cash Flow analysis</p>
          <Link href="/signup" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
            Create Free Account
          </Link>
        </div>
      )}
    </div>
  );
}
