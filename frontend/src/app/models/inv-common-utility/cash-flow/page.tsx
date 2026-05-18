"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Banknote, Save, RotateCcw } from "lucide-react";
import { FieldHint } from "@/components/FieldHint";
import { FIELD_HINTS } from "@/lib/field-hints";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { loadModelResults, saveModelResults, clearModelResults } from "@/lib/model-link";
import { useSavedModel } from "@/lib/use-saved-model";
import {
  MONTHS_ORDER,
  INPUT_FIELDS,
  OUTPUT_FIELDS,
  calculateCashFlow,
  createEmptyInputs,
  type MonthName,
} from "@/lib/cash-flow-model";

export default function InvCashFlowPage() {
  const { user, hydrate } = useAuth();
  const [monthData, setMonthData] = useState<Record<string, Record<string, number>>>(() => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyInputs() as Record<string, number>; });
    return d;
  });
  const [activeMonth, setActiveMonth] = useState<MonthName>("Apr");
  const [openingCash, setOpeningCash] = useState(0);
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set());
  const [autoLinked, setAutoLinked] = useState(false);

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "inv-cash-flow",
    onLoad: (data: Record<string, unknown>) => {
      if (data.monthData) setMonthData(data.monthData as Record<string, Record<string, number>>);
      if (typeof data.openingCash === "number") setOpeningCash(data.openingCash as number);
    },
    getState: useCallback(() => ({ monthData, openingCash }), [monthData, openingCash]),
  });

  // Auto-fill from Income Statement + Movements
  useEffect(() => {
    hydrate();
    const locked = new Set<string>();

    setMonthData((prev) => {
      const next = { ...prev };

      // Pull from Income Statement (inv-common-utility)
      const hub = loadModelResults<Record<string, unknown>>("inv-common-utility");
      const hubMonths = hub?.months as Record<string, Record<string, number>> | undefined;

      // Pull from Movements (inv-movements)
      const mov = loadModelResults<Record<string, unknown>>("inv-movements");
      const movMonths = mov?.monthlyData as Record<string, Record<string, number>> | undefined;

      MONTHS_ORDER.forEach((m) => {
        next[m] = { ...next[m] };

        // From Income Statement
        if (hubMonths?.[m]) {
          const h = hubMonths[m];
          if (h.netProfit !== undefined) { next[m]["Net Profit (PAT)"] = h.netProfit; locked.add(`${m}::Net Profit (PAT)`); }
          if (h.depreciation !== undefined && h.depreciation > 0) { next[m]["Depreciation & Amortization"] = h.depreciation; locked.add(`${m}::Depreciation & Amortization`); }
        }

        // From Movements
        if (movMonths?.[m]) {
          const mv = movMonths[m];
          if (mv["Change in Receivables"] !== undefined) { next[m]["Change in Receivables"] = mv["Change in Receivables"]; locked.add(`${m}::Change in Receivables`); }
          if (mv["Change in Inventory"] !== undefined) { next[m]["Change in Inventory"] = mv["Change in Inventory"]; locked.add(`${m}::Change in Inventory`); }
          if (mv["Change in Payables"] !== undefined) { next[m]["Change in Payables"] = mv["Change in Payables"]; locked.add(`${m}::Change in Payables`); }
          if (mv["CapEx"] !== undefined && mv["CapEx"] > 0) { next[m]["CapEx"] = mv["CapEx"]; locked.add(`${m}::CapEx`); }
        }
      });

      return next;
    });

    if (locked.size > 0) { setAutoLinked(true); setLockedFields(locked); }
  }, [hydrate]);

  const results = useMemo(() => calculateCashFlow(monthData, openingCash), [monthData, openingCash]);

  // Persist to localStorage for Balance Sheet
  useEffect(() => {
    saveModelResults("inv-cash-flow", {
      monthlyData: results.monthlyData,
      annual: results.annual,
      openingCash,
    });
  }, [results, openingCash]);

  const handleChange = (key: string, value: string) => {
    setMonthData((prev) => ({
      ...prev,
      [activeMonth]: { ...prev[activeMonth], [key]: parseFloat(value) || 0 },
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

  const handleReset = () => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyInputs() as Record<string, number>; });
    setMonthData(d);
    setOpeningCash(0);
    setAutoLinked(false);
    setLockedFields(new Set());
    clearModelResults("inv-cash-flow");
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      await api.post("/calculations", {
        modelSlug: "inv-cash-flow",
        inputs: { monthData, openingCash },
        outputs: { monthlyData: results.monthlyData, annual: results.annual },
      });
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  const cur = results.monthlyData[activeMonth];
  const categories = [...new Set(INPUT_FIELDS.map((f) => f.category))];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models/inv-common-utility" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Common Utility Hub
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-400/10">
            <Banknote className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Cash Flow Statement</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-amber-400/10 text-amber-400">Investor Grade</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Operating, Investing &amp; Financing cash flows. Auto-pulls from Income Statement &amp; Movements.
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

      {autoLinked && (
        <div className="rounded-xl bg-success/5 border border-success/20 p-3 mb-6">
          <p className="text-xs text-success font-medium">Auto-filled from Income Statement &amp; Movements. Only Financing fields are manual.</p>
        </div>
      )}

      {/* Opening Cash */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <label className="flex items-center text-xs text-muted-foreground mb-1">Opening Cash Balance<FieldHint hint={{ what: "Cash and bank balance at the very start of the period being analysed.", why: "All cumulative cash calculations start from this number. Get it from your bank statement on day 1.", how: "Bank statement opening balance on 1st April or start of your financial year." }} /></label>
        <div className="relative w-64">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
          <input type="number" value={openingCash || ""}
            onChange={(e) => { setOpeningCash(parseFloat(e.target.value) || 0); markDirty(); }}
            placeholder="0"
            className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          />
        </div>
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
        <div className="rounded-2xl border border-border bg-card p-5" data-inputs>
          <h3 className="font-semibold text-sm mb-3">{activeMonth} Inputs</h3>
          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat}>
                <p className="text-xs font-medium text-muted-foreground mb-2">{cat}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {INPUT_FIELDS.filter((f) => f.category === cat).map((field) => {
                    const isAutoLocked = autoLinked && lockedFields.has(`${activeMonth}::${field.key}`);
                    return (
                      <div key={field.key}>
                        <label className="flex items-center text-xs text-muted-foreground mb-1">
                          {field.label}
                          {FIELD_HINTS[field.key] && <FieldHint hint={FIELD_HINTS[field.key]} />}
                          {isAutoLocked && <span className="ml-1 text-[10px] text-amber-400/70">(auto-filled)</span>}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.prefix}</span>
                          <input type="number" data-field={field.key}
                            value={monthData[activeMonth][field.key] || ""}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isAutoLocked}
                            placeholder="0"
                            className={`w-full rounded-lg border border-border pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${isAutoLocked ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60" : "bg-input"}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4 h-fit sticky top-8">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">{activeMonth} Results</h3>
            {cur ? (
              <div className="space-y-2">
                {OUTPUT_FIELDS.map((f) => {
                  const val = cur[f.key] ?? 0;
                  return (
                    <div key={f.key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{f.label}</span>
                      <span className={`font-medium ${val < 0 ? "text-danger" : val > 0 ? "text-success" : ""}`}>
                        {formatCurrency(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Enter inputs to see results.</p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Annual Summary</h3>
            <div className="space-y-2 text-sm">
              {([
                { label: "Total Operating CF", key: "totalOperatingCF" },
                { label: "Total Investing CF", key: "totalInvestingCF" },
                { label: "Total Financing CF", key: "totalFinancingCF" },
                { label: "Net Cash Movement", key: "totalNetCash" },
                { label: "Ending Cash", key: "endingCash" },
              ] as { label: string; key: string }[]).map((row) => {
                const val = (results.annual as Record<string, number>)[row.key] ?? 0;
                return (
                  <div key={row.key} className="flex justify-between">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className={`font-medium ${val < 0 ? "text-danger" : val > 0 ? "text-success" : ""}`}>
                      {formatCurrency(val)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ============ CHARTS ============ */}
      {results.monthsAdded.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Cumulative Cash Area */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Cumulative Cash Position</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 30, left: 55 },
              xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{
                type: "line", smooth: true,
                data: MONTHS_ORDER.map(m => results.monthlyData[m]?.["Cumulative Cash"] || 0),
                areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(96,165,250,0.3)" }, { offset: 1, color: "rgba(96,165,250,0)" }] } },
                lineStyle: { color: "#60a5fa", width: 2 }, itemStyle: { color: "#60a5fa" },
                markLine: { data: [{ yAxis: 0, lineStyle: { color: "#ef4444", type: "dashed" } }], label: { show: false }, symbol: "none" },
              }],
            }} />
          </div>

          {/* Operating vs Investing vs Financing Stacked */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Cash Flow Components</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              legend: { data: ["Operating", "Investing", "Financing"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
              grid: { top: 30, right: 15, bottom: 30, left: 55 },
              xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [
                { name: "Operating", type: "bar", stack: "cf", data: MONTHS_ORDER.map(m => results.monthlyData[m]?.["Operating Cash Flow"] || 0), itemStyle: { color: "#34d399" } },
                { name: "Investing", type: "bar", stack: "cf", data: MONTHS_ORDER.map(m => results.monthlyData[m]?.["Investing Cash Flow"] || 0), itemStyle: { color: "#f59e0b" } },
                { name: "Financing", type: "bar", stack: "cf", data: MONTHS_ORDER.map(m => results.monthlyData[m]?.["Financing Cash Flow"] || 0), itemStyle: { color: "#a78bfa" } },
              ],
            }} />
          </div>

          {/* Monthly Net Cash Movement Bar */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Monthly Net Cash Movement</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 30, left: 55 },
              xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{
                type: "bar",
                data: MONTHS_ORDER.map(m => {
                  const v = results.monthlyData[m]?.["Net Cash Movement"] || 0;
                  return { value: v, itemStyle: { color: v >= 0 ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] } };
                }),
              }],
            }} />
          </div>

          {/* Annual CF Waterfall */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Annual Cash Flow Waterfall</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 35, left: 55 },
              xAxis: { type: "category", data: ["Operating", "Investing", "Financing", "Net Cash", "Ending Cash"], axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{
                type: "bar", barWidth: 28,
                data: [
                  { value: (results.annual as Record<string, number>).totalOperatingCF || 0, itemStyle: { color: "#34d399", borderRadius: [4, 4, 0, 0] } },
                  { value: (results.annual as Record<string, number>).totalInvestingCF || 0, itemStyle: { color: "#f59e0b", borderRadius: [4, 4, 0, 0] } },
                  { value: (results.annual as Record<string, number>).totalFinancingCF || 0, itemStyle: { color: "#a78bfa", borderRadius: [4, 4, 0, 0] } },
                  { value: (results.annual as Record<string, number>).totalNetCash || 0, itemStyle: { color: ((results.annual as Record<string, number>).totalNetCash || 0) >= 0 ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] } },
                  { value: (results.annual as Record<string, number>).endingCash || 0, itemStyle: { color: "#60a5fa", borderRadius: [4, 4, 0, 0] } },
                ],
                label: { show: true, position: "top", color: "#aaa", fontSize: 9, formatter: (p: any) => p.value >= 1000 ? `$${(p.value/1000).toFixed(0)}k` : `$${p.value}` },
              }],
            }} />
          </div>

          {/* Annual CF Composition Donut */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Cash Flow Composition</h3>
            <ReactECharts style={{ height: 220 }} option={{
              tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              series: [{ type: "pie", radius: ["40%", "68%"], center: ["50%", "50%"],
                label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{d}%" },
                data: [
                  { value: Math.abs((results.annual as Record<string, number>).totalOperatingCF || 0), name: "Operating", itemStyle: { color: "#34d399" } },
                  { value: Math.abs((results.annual as Record<string, number>).totalInvestingCF || 0), name: "Investing", itemStyle: { color: "#f59e0b" } },
                  { value: Math.abs((results.annual as Record<string, number>).totalFinancingCF || 0), name: "Financing", itemStyle: { color: "#a78bfa" } },
                ].filter(d => d.value > 0),
              }],
            }} />
          </div>

          {/* Working Capital Impact Line */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Working Capital Impact on Cash</h3>
            <ReactECharts style={{ height: 220 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 30, left: 55 },
              xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}` }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{
                type: "bar",
                data: MONTHS_ORDER.map(m => {
                  const v = results.monthlyData[m]?.["Change in Working Capital"] || 0;
                  return { value: v, itemStyle: { color: v >= 0 ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] } };
                }),
              }],
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
