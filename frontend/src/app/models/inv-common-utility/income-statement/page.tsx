"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Settings, Save, RotateCcw, ArrowRight } from "lucide-react";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { saveModelResults, clearModelResults } from "@/lib/model-link";
import { useSavedModel } from "@/lib/use-saved-model";
import {
  MONTHS_ORDER,
  INPUT_FIELDS,
  calculateIncomeStatement,
  type MonthName,
} from "@/lib/income-statement-model";

const emptyMonth = (): Record<string, number> => {
  const m: Record<string, number> = {};
  INPUT_FIELDS.forEach((f) => { m[f.key] = 0; });
  return m;
};

export default function InvIncomeStatementPage() {
  const { user, hydrate } = useAuth();
  const [monthData, setMonthData] = useState<Record<string, Record<string, number>>>(() => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = emptyMonth(); });
    return d;
  });
  const [activeMonth, setActiveMonth] = useState<MonthName>("Apr");
  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "inv-common-utility",
    onLoad: (data: Record<string, unknown>) => {
      if (data.monthData) setMonthData(data.monthData as Record<string, Record<string, number>>);
    },
    getState: useCallback(() => ({ monthData }), [monthData]),
  });

  useEffect(() => { hydrate(); }, [hydrate]);

  const isResult = useMemo(() => calculateIncomeStatement(monthData), [monthData]);

  const handleChange = (field: string, value: string) => {
    setMonthData((prev) => ({
      ...prev,
      [activeMonth]: { ...prev[activeMonth], [field]: parseFloat(value) || 0 },
    }));
    markDirty();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const all = Array.from(
        (e.currentTarget.closest("[data-inputs]") || document).querySelectorAll<HTMLInputElement>("input[data-field]")
      );
      const idx = all.indexOf(e.currentTarget);
      if (idx >= 0 && idx < all.length - 1) all[idx + 1].focus();
    }
  };

  const persistResults = () => {
    const months: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => {
      const d = isResult.monthlyData[m];
      if (!d) return;
      months[m] = {
        revenue: d["Gross Revenue"] ?? 0,
        recurringRevenue: d["Operational Revenue (Recurring Receipts)"] ?? 0,
        variableRevenue: d["Operational Revenue (Variable revenue including interest income)"] ?? 0,
        cogs: d["Total of COGS"] ?? 0,
        grossProfit: d["Gross Profit"] ?? 0,
        grossMargin: d["Gross Margin %"] ?? 0,
        totalFixedCosts: d["Total Fixed Costs"] ?? 0,
        totalVariableCosts: d["Total variable Costs"] ?? 0,
        totalOpex: d["Total Operating Expenses"] ?? 0,
        marketingSpend: d["Marketing & Advertising"] ?? 0,
        salaries: d["Salaries & Benefits"] ?? 0,
        rent: d["Rent & Utilities"] ?? 0,
        ebitda: d["EBITDA"] ?? 0,
        ebitdaMargin: d["EBITDA Margin %"] ?? 0,
        netProfit: d["Net Profit"] ?? 0,
        netMargin: d["Net Margin %"] ?? 0,
        depreciation: d["Depreciation & Amortization"] ?? 0,
      };
    });

    let latestMonth = isResult.monthlyData[MONTHS_ORDER[0]];
    for (let i = MONTHS_ORDER.length - 1; i >= 0; i--) {
      const m = isResult.monthlyData[MONTHS_ORDER[i]];
      if (m && (m["Gross Revenue"] || 0) > 0) { latestMonth = m; break; }
    }
    saveModelResults("inv-common-utility", {
      months,
      monthlyRevenue: latestMonth?.["Gross Revenue"] ?? 0,
      monthlyExpenses: latestMonth?.["Total Operating Expenses"] ?? 0,
      grossMargin: latestMonth?.["Gross Margin %"] ?? 0,
      ebitdaMargin: latestMonth?.["EBITDA Margin %"] ?? 0,
      netMargin: latestMonth?.["Net Margin %"] ?? 0,
      totalFixedCosts: latestMonth?.["Total Fixed Costs"] ?? 0,
      totalVariableCosts: latestMonth?.["Total variable Costs"] ?? 0,
      annualRevenue: isResult.annual["Gross Revenue"] ?? 0,
      annualNetProfit: isResult.annual["Net Profit"] ?? 0,
      annualEBITDA: isResult.annual["EBITDA"] ?? 0,
      annualGrossProfit: isResult.annual["Gross Profit"] ?? 0,
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { persistResults(); }, [isResult]);

  const handleReset = () => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = emptyMonth(); });
    setMonthData(d);
    clearModelResults("inv-common-utility");
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user) return;
    persistResults();
    try {
      await api.post("/calculations", {
        modelSlug: "inv-common-utility",
        inputs: monthData,
        outputs: { monthlyData: isResult.monthlyData, annual: isResult.annual },
      });
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  const cur = isResult.monthlyData[activeMonth];
  const categories = [...new Set(INPUT_FIELDS.map((f) => f.category))];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models/inv-common-utility" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Common Utility Hub
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-400/10">
            <Settings className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Income Statement</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-amber-400/10 text-amber-400">Investor Grade</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Central Income Statement hub — feeds data into all other Investor Grade models.
            </p>
            <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
              <ArrowRight className="h-3 w-3" /> Break-even, Burn &amp; Runway, Unit Economics, Movements, Funding, DCF, Snapshot
            </p>
          </div>
        </div>
        {user && (
          <button onClick={handleSave} disabled={saving || saved}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${saved ? "bg-success/10 text-success" : "bg-amber-400/10 text-amber-400 hover:bg-amber-400/20"}`}>
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>

      {/* Month tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6">
        {MONTHS_ORDER.map((m) => (
          <button key={m} onClick={() => setActiveMonth(m)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${activeMonth === m ? "bg-amber-400 text-black" : "bg-card border border-border hover:bg-muted"}`}>
            {m}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Inputs */}
        <div className="space-y-5" data-inputs>
          {categories.map((cat) => (
            <div key={cat} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">{cat}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INPUT_FIELDS.filter((f) => f.category === cat).map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs text-muted-foreground mb-1">{field.label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <input type="number" data-field={field.key}
                        value={monthData[activeMonth][field.key] || ""}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="0"
                        className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-3">
            <button onClick={persistResults} className="flex-1 rounded-lg bg-amber-400 text-black py-2.5 text-sm font-semibold hover:bg-amber-300 transition-colors">
              Push Data to Linked Models
            </button>
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4 h-fit sticky top-8">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">{activeMonth} Summary</h3>
            {cur && (
              <div className="space-y-2 text-xs">
                {([
                  { label: "Gross Revenue", key: "Gross Revenue" },
                  { label: "COGS", key: "Total of COGS" },
                  { label: "Gross Profit", key: "Gross Profit" },
                  { label: "Gross Margin", key: "Gross Margin %", pct: true },
                  { label: "Total OPEX", key: "Total Operating Expenses" },
                  { label: "EBITDA", key: "EBITDA" },
                  { label: "EBITDA Margin", key: "EBITDA Margin %", pct: true },
                  { label: "EBIT", key: "EBIT" },
                  { label: "PBT", key: "PBT" },
                  { label: "Net Profit", key: "Net Profit" },
                  { label: "Net Margin", key: "Net Margin %", pct: true },
                ] as { label: string; key: string; pct?: boolean }[]).map((row) => (
                  <div key={row.label} className="flex justify-between rounded-lg px-3 py-1.5 bg-background/50 border border-border/50">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold">
                      {row.pct
                        ? `${(Number(cur[row.key]) || 0).toFixed(1)}%`
                        : formatCurrency(Number(cur[row.key]) || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Annual Total</h3>
            <div className="space-y-2 text-xs">
              {([
                { label: "Revenue", key: "Gross Revenue" },
                { label: "Gross Profit", key: "Gross Profit" },
                { label: "EBITDA", key: "EBITDA" },
                { label: "Net Profit", key: "Net Profit" },
              ] as { label: string; key: string }[]).map((row) => (
                <div key={row.label} className="flex justify-between rounded-lg px-3 py-1.5 bg-background/50 border border-border/50">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold">{formatCurrency(Number(isResult.annual[row.key]) || 0)}</span>
                </div>
              ))}
            </div>
          </div>

          {isResult.status.overall && (
            <div className={`rounded-xl border p-4 ${isResult.status.overallColor === "text-success" ? "bg-success/5 border-success/20" : isResult.status.overallColor === "text-danger" ? "bg-danger/5 border-danger/20" : "bg-amber-400/5 border-amber-400/20"}`}>
              <p className={`text-xs font-medium ${isResult.status.overallColor}`}>{isResult.status.overall}</p>
              {isResult.status.guidance && <p className="text-xs text-muted-foreground mt-1">{isResult.status.guidance}</p>}
            </div>
          )}

          <div className="rounded-xl bg-amber-400/5 border border-amber-400/20 p-4">
            <p className="text-xs text-amber-400 font-medium mb-2 flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" /> Data flows to linked models
            </p>
            <p className="text-xs text-muted-foreground">
              Revenue, costs, margins, and EBITDA auto-fill into Break-even, Burn &amp; Runway, Unit Economics, Movements, Funding, DCF, and Business Snapshot.
            </p>
          </div>
        </div>
      </div>

      {/* ============ CHARTS ============ */}
      {isResult.monthsAdded.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Monthly Revenue + Net Profit */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Monthly Revenue & Net Profit</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              legend: { data: ["Revenue", "Net Profit"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
              grid: { top: 30, right: 15, bottom: 25, left: 55 },
              xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [
                { name: "Revenue", type: "bar", data: MONTHS_ORDER.map(m => isResult.monthlyData[m]?.["Gross Revenue"] || 0), itemStyle: { color: "#60a5fa", borderRadius: [4, 4, 0, 0] } },
                { name: "Net Profit", type: "line", data: MONTHS_ORDER.map(m => isResult.monthlyData[m]?.["Net Profit"] || 0), smooth: true, lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" }, symbol: "circle", symbolSize: 5 },
              ],
            }} />
          </div>

          {/* Margin Trends */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Margin Trends</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              legend: { data: ["Gross %", "EBITDA %", "Net %"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
              grid: { top: 30, right: 15, bottom: 25, left: 45 },
              xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: "{value}%" }, splitLine: { lineStyle: { color: "#222" } } },
              series: [
                { name: "Gross %", type: "line", data: MONTHS_ORDER.map(m => isResult.monthlyData[m]?.["Gross Margin %"] || 0), smooth: true, lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" }, symbol: "circle", symbolSize: 4 },
                { name: "EBITDA %", type: "line", data: MONTHS_ORDER.map(m => isResult.monthlyData[m]?.["EBITDA Margin %"] || 0), smooth: true, lineStyle: { color: "#f59e0b", width: 2 }, itemStyle: { color: "#f59e0b" }, symbol: "circle", symbolSize: 4 },
                { name: "Net %", type: "line", data: MONTHS_ORDER.map(m => isResult.monthlyData[m]?.["Net Margin %"] || 0), smooth: true, lineStyle: { color: "#a78bfa", width: 2 }, itemStyle: { color: "#a78bfa" }, symbol: "circle", symbolSize: 4 },
              ],
            }} />
          </div>

          {/* P&L Composition Donut (annual) */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Annual P&L Composition</h3>
            <ReactECharts style={{ height: 220 }} option={{
              tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              series: [{ type: "pie", radius: ["40%", "68%"], center: ["50%", "50%"],
                label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{d}%" },
                data: [
                  { value: Math.abs(isResult.annual["Total of COGS"] || 0), name: "COGS", itemStyle: { color: "#ef4444" } },
                  { value: Math.abs(isResult.annual["Total Fixed Costs"] || 0), name: "Fixed Costs", itemStyle: { color: "#f59e0b" } },
                  { value: Math.abs(isResult.annual["Total variable Costs"] || 0), name: "Variable Costs", itemStyle: { color: "#a78bfa" } },
                  { value: Math.max(0, isResult.annual["Net Profit"] || 0), name: "Net Profit", itemStyle: { color: "#34d399" } },
                ].filter(d => d.value > 0),
              }],
            }} />
          </div>

          {/* Annual Summary Bar */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Annual Summary</h3>
            <ReactECharts style={{ height: 220 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 35, left: 55 },
              xAxis: { type: "category", data: ["Revenue", "Gross Profit", "EBITDA", "EBIT", "Net Profit"], axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{ type: "bar", barWidth: 28,
                data: [
                  { value: isResult.annual["Gross Revenue"] || 0, itemStyle: { color: "#60a5fa", borderRadius: [4, 4, 0, 0] } },
                  { value: isResult.annual["Gross Profit"] || 0, itemStyle: { color: "#34d399", borderRadius: [4, 4, 0, 0] } },
                  { value: isResult.annual["EBITDA"] || 0, itemStyle: { color: "#f59e0b", borderRadius: [4, 4, 0, 0] } },
                  { value: isResult.annual["EBIT"] || 0, itemStyle: { color: "#a78bfa", borderRadius: [4, 4, 0, 0] } },
                  { value: isResult.annual["Net Profit"] || 0, itemStyle: { color: (isResult.annual["Net Profit"] || 0) >= 0 ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] } },
                ],
                label: { show: true, position: "top", color: "#aaa", fontSize: 9, formatter: (p: any) => p.value >= 1000 ? `$${(p.value/1000).toFixed(0)}k` : `$${p.value}` },
              }],
            }} />
          </div>

          {/* Revenue vs COGS vs OPEX Stacked */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Revenue vs Cost Structure</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              legend: { data: ["Revenue", "COGS", "OPEX"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
              grid: { top: 30, right: 15, bottom: 25, left: 55 },
              xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [
                { name: "Revenue", type: "line", data: MONTHS_ORDER.map(m => isResult.monthlyData[m]?.["Gross Revenue"] || 0), smooth: true, lineStyle: { color: "#60a5fa", width: 2 }, itemStyle: { color: "#60a5fa" }, symbol: "circle", symbolSize: 4 },
                { name: "COGS", type: "bar", stack: "cost", data: MONTHS_ORDER.map(m => Math.abs(isResult.monthlyData[m]?.["Total of COGS"] || 0)), itemStyle: { color: "#ef4444" } },
                { name: "OPEX", type: "bar", stack: "cost", data: MONTHS_ORDER.map(m => Math.abs(isResult.monthlyData[m]?.["Total Operating Expenses"] || 0)), itemStyle: { color: "#f59e0b" } },
              ],
            }} />
          </div>

          {/* OPEX Breakdown Donut (active month) */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">OPEX Breakdown ({activeMonth})</h3>
            <ReactECharts style={{ height: 220 }} option={{
              tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              series: [{ type: "pie", radius: ["35%", "65%"], center: ["50%", "50%"],
                label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{d}%" },
                data: [
                  { value: Math.abs(cur?.["Salaries & Benefits"] || 0), name: "Salaries", itemStyle: { color: "#60a5fa" } },
                  { value: Math.abs(cur?.["Rent & Utilities"] || 0), name: "Rent & Utils", itemStyle: { color: "#f59e0b" } },
                  { value: Math.abs(cur?.["Marketing & Advertising"] || 0), name: "Marketing", itemStyle: { color: "#ec4899" } },
                  { value: Math.abs(cur?.["Travel & Transport"] || 0), name: "Travel", itemStyle: { color: "#22d3ee" } },
                  { value: Math.abs(cur?.["Insurance"] || 0), name: "Insurance", itemStyle: { color: "#a78bfa" } },
                  { value: Math.abs(cur?.["Other Expenses"] || 0), name: "Other", itemStyle: { color: "#84cc16" } },
                ].filter(d => d.value > 0),
              }],
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
