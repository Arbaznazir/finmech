"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft, Calculator, Save, RotateCcw, ChevronDown, ChevronUp,
  ArrowRightLeft, CheckCircle,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { useSavedModel } from "@/lib/use-saved-model";
import { FieldHint } from "@/components/FieldHint";
import { FIELD_HINTS } from "@/lib/field-hints";
import {
  CF_OPS_MONTHS,
  CF_OPS_INPUT_FIELDS,
  calculateCFOps,
  computeCFOpsMonth,
  createEmptyCFOpsInputs,
  autoFillFromCommonUtility,
  type CFOpsResults,
} from "@/lib/cashflow-ops-model";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type TabView = "input" | "monthly" | "charts";

export default function CashflowOpsPage() {
  const { user, hydrate } = useAuth();
  const [activeMonth, setActiveMonth] = useState<string>("Apr");
  const [monthsData, setMonthsData] = useState<Record<string, Record<string, number>>>({});
  const [openingCash, setOpeningCash] = useState(0);
  const [results, setResults] = useState<CFOpsResults | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>("input");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "cashflow-ops",
    onLoad: (data: Record<string, unknown>) => {
      if (data.monthsData) setMonthsData(data.monthsData as Record<string, Record<string, number>>);
      if (typeof data.openingCash === "number") setOpeningCash(data.openingCash);
    },
    getState: useCallback(() => ({ monthsData, openingCash }), [monthsData, openingCash]),
  });

  useEffect(() => { hydrate(); }, [hydrate]);

  const addedMonths = Object.keys(monthsData);

  // Auto-fill from Common Utility when month changes
  const handleMonthChange = (month: string) => {
    setActiveMonth(month);
    
    // Try to auto-fill from Common Utility if no data exists
    if (!monthsData[month]) {
      const commonData = JSON.parse(localStorage.getItem('invCommonUtility') || localStorage.getItem('commonUtility') || '{}');
      const filled = autoFillFromCommonUtility(createEmptyCFOpsInputs(), month, commonData);
      
      if (Object.values(filled).some(v => v !== 0)) {
        setMonthsData(prev => ({ ...prev, [month]: filled }));
        markDirty();
      }
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setMonthsData((prev) => ({
      ...prev,
      [activeMonth]: {
        ...(prev[activeMonth] || createEmptyCFOpsInputs()),
        [key]: parseFloat(value) || 0,
      },
    }));
    markDirty();
  };

  const handleCalculate = useCallback(() => {
    if (Object.keys(monthsData).length === 0) return;
    const result = calculateCFOps(monthsData, openingCash);
    setResults(result);
    setActiveTab("monthly");
    
    // Also save to localStorage for Consolidated CFO to access
    localStorage.setItem('cashflowOps', JSON.stringify(result));
    persistState();
  }, [monthsData, openingCash]);

  const handleReset = () => {
    setMonthsData({});
    setResults(null);
    setActiveTab("input");
    clearPersisted();
    localStorage.removeItem('cashflowOps');
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
        modelSlug: "cashflow-ops",
        inputs: { openingCash, monthsData },
        outputs: {
          monthlyData: results.monthlyData,
          monthsAdded: results.monthsAdded,
          openingCash: results.openingCash,
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

  const categories = CF_OPS_INPUT_FIELDS.reduce<Record<string, typeof CF_OPS_INPUT_FIELDS>>((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {});

  const currentInputs = monthsData[activeMonth] || createEmptyCFOpsInputs();

  // Compute opening balance for the active month
  // For the first month (Apr) it's the user-entered openingCash
  // For subsequent months it's the previous month's closing balance
  const getOpeningBalanceForMonth = (month: string): number => {
    const idx = CF_OPS_MONTHS.indexOf(month as typeof CF_OPS_MONTHS[number]);
    if (idx === 0) return openingCash;
    let running = openingCash;
    for (let i = 0; i < idx; i++) {
      const m = CF_OPS_MONTHS[i];
      const data = monthsData[m];
      if (!data) break;
      const { endingCash } = computeCFOpsMonth(data, running);
      running = endingCash;
    }
    return running;
  };

  const activeOpeningBalance = getOpeningBalanceForMonth(activeMonth);
  const isFirstMonth = CF_OPS_MONTHS.indexOf(activeMonth as typeof CF_OPS_MONTHS[number]) === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <Link href="/models/cash-flow-statement" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Cash Flow
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-500/10">
            <Calculator className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">Cashflow Operations</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-emerald-500/10 text-emerald-500">
                Sheet 1
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Detailed monthly cash inflows & outflows
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
        {(["input", "monthly", "charts"] as TabView[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors whitespace-nowrap ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {tab === "input" ? "Enter Data" : tab === "monthly" ? "Monthly View" : "Charts"}
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
              {CF_OPS_MONTHS.map((month) => {
                const hasData = !!monthsData[month];
                return (
                  <button
                    key={month}
                    onClick={() => handleMonthChange(month)}
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

          {/* Input Form */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold">Inputs for <span className="text-primary">{activeMonth}</span></h2>
              <button onClick={handleResetMonth} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-1">
                <RotateCcw className="h-3 w-3" /> Clear Month
              </button>
            </div>

            {/* Opening Cash */}
            <div className="mb-5 rounded-lg bg-background/50 p-4 border border-border/50">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Opening Cash Balance ({activeMonth} 1st)
              </label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                {isFirstMonth ? (
                  <input
                    type="number"
                    value={openingCash || ""}
                    onChange={(e) => { setOpeningCash(parseFloat(e.target.value) || 0); markDirty(); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        document.querySelector<HTMLInputElement>('[data-field-index="0"]')?.focus();
                      }
                    }}
                    placeholder="0"
                    className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                ) : (
                  <input
                    type="number"
                    value={activeOpeningBalance}
                    readOnly
                    className="w-full rounded-lg border border-border bg-muted/50 pl-7 pr-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                  />
                )}
              </div>
              {!isFirstMonth && (
                <p className="text-xs text-muted-foreground mt-1">Auto-carried from previous month&apos;s closing balance</p>
              )}
            </div>

            {/* Input Categories */}
            {Object.entries(categories).map(([category, fields]) => (
              <div key={category} className="mb-4">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center justify-between w-full rounded-lg bg-background/50 px-3 py-2 mb-2"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category}</span>
                  {collapsedCategories[category] ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                </button>
                {!collapsedCategories[category] && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1">
                    {fields.map((field) => {
                      const allFields = CF_OPS_INPUT_FIELDS.filter(f => !collapsedCategories[f.category]);
                      const fieldIndex = allFields.findIndex(f => f.key === field.key);
                      return (
                      <div key={field.key}>
                        <label className="flex items-center text-xs text-muted-foreground mb-1">
                          {field.label}
                          {FIELD_HINTS[field.key as string] && <FieldHint hint={FIELD_HINTS[field.key as string]} />}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                          <input
                            type="number"
                            data-field-index={fieldIndex}
                            value={currentInputs[field.key as string] || ""}
                            onChange={(e) => handleInputChange(field.key as string, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const next = document.querySelector<HTMLInputElement>(`[data-field-index="${fieldIndex + 1}"]`);
                                next?.focus();
                              }
                            }}
                            placeholder="0"
                            className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                        </div>
                      </div>
                      );
                    })}
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

      {/* ============ MONTHLY VIEW TAB ============ */}
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
                {[
                  { key: "Total Cash inflow", label: "Total Cash Inflow" },
                  { key: "Total Outflows", label: "Total Outflows" },
                  { key: "Net Cash Flow from Operating Activities (CFO)", label: "Net CFO", bold: true },
                  { key: "Cash Flow from Investing Activities (CFI)", label: "Net CFI" },
                  { key: "Cash Flow from Financing Activities (CFF)", label: "Net CFF" },
                  { key: "Net Cash Flow", label: "Net Cash Flow", bold: true },
                  { key: "Closing Balance", label: "Closing Balance", bold: true },
                ].map((row) => (
                  <tr key={row.key} className={`border-b border-border/30 ${row.bold ? "bg-background/30" : ""}`}>
                    <td className={`px-4 py-2.5 sticky left-0 bg-card ${row.bold ? "font-semibold" : "text-muted-foreground"}`}>
                      {row.label}
                    </td>
                    {results.monthsAdded.map((m) => {
                      const val = results.monthlyData[m]?.[row.key];
                      const numVal = typeof val === "number" ? val : 0;
                      const isNeg = numVal < 0;
                      return (
                        <td key={m} className={`text-right px-4 py-2.5 ${row.bold ? "font-semibold" : ""} ${isNeg ? "text-danger" : ""}`}>
                          {formatCurrency(numVal)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ CHARTS TAB ============ */}
      {activeTab === "charts" && results && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CFO/CFI/CFF Lines */}
          <div className="rounded-2xl border border-border bg-card p-5">
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
                  { name: "CFO", type: "line", smooth: true, data: results.monthsAdded.map(m => results.monthlyData[m]?.["Net Cash Flow from Operating Activities (CFO)"] || 0), lineStyle: { color: "#22d3ee", width: 2 }, itemStyle: { color: "#22d3ee" }, symbol: "circle", symbolSize: 4 },
                  { name: "CFI", type: "line", smooth: true, data: results.monthsAdded.map(m => results.monthlyData[m]?.["Cash Flow from Investing Activities (CFI)"] || 0), lineStyle: { color: "#a78bfa", width: 2 }, itemStyle: { color: "#a78bfa" }, symbol: "circle", symbolSize: 4 },
                  { name: "CFF", type: "line", smooth: true, data: results.monthsAdded.map(m => results.monthlyData[m]?.["Cash Flow from Financing Activities (CFF)"] || 0), lineStyle: { color: "#f59e0b", width: 2 }, itemStyle: { color: "#f59e0b" }, symbol: "circle", symbolSize: 4 },
                ],
              }}
            />
          </div>

          {/* Ending Cash Trend */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Closing Balance Trend</h3>
            <ReactECharts
              style={{ height: 260 }}
              option={{
                tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                grid: { top: 15, right: 15, bottom: 30, left: 55 },
                xAxis: { type: "category", data: results.monthsAdded, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
                series: [{
                  type: "line", smooth: true,
                  data: results.monthsAdded.map(m => results.monthlyData[m]?.["Closing Balance"] || 0),
                  areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(34,211,238,0.3)" }, { offset: 1, color: "rgba(34,211,238,0)" }] } },
                  lineStyle: { color: "#22d3ee", width: 2 },
                  itemStyle: { color: "#22d3ee" },
                  symbol: "circle", symbolSize: 5,
                }],
              }}
            />
          </div>

          {/* Net Cash Flow Bar */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Monthly Net Cash Flow</h3>
            <ReactECharts
              style={{ height: 260 }}
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

          {/* Months Coverage */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-3">Months Coverage</h2>
            <div className="grid grid-cols-6 gap-2">
              {CF_OPS_MONTHS.map((m) => {
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
