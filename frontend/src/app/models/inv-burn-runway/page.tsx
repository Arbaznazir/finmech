"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link"
import { ModelBackLink } from "@/components/model-back-link";
import { ArrowLeft, Flame, Save, RotateCcw } from "lucide-react";
import { FieldHint } from "@/components/FieldHint";
import { HintLabel } from "@/components/HintLabel";
import { investorHint } from "@/lib/investor-model-hints";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import {formatCurrency, formatChartCurrency} from "@/lib/utils";
import api from "@/lib/api";
import { offerSmartResultsAfterCalculate } from "@/lib/smart-results";
import { loadModelResults, saveModelResults, clearModelResults } from "@/lib/model-link";
import { useSavedModel } from "@/lib/use-saved-model";
import {
  MONTHS_ORDER,
  INPUT_FIELDS,
  calculateBurnRunway,
  createEmptyInputs,
  formatRunway,
  isInfiniteRunway,
  type MonthName,
} from "@/lib/burn-runway-model";

export default function InvBurnRunwayPage() {
  const { user, hydrate } = useAuth();
  const [monthData, setMonthData] = useState<Record<string, Record<string, number>>>(() => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyInputs() as Record<string, number>; });
    return d;
  });
  const [activeMonth, setActiveMonth] = useState<MonthName>("April");
  const [openingCash, setOpeningCash] = useState(0);
  const [hubLinked, setHubLinked] = useState(false);
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set());

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "inv-burn-runway",
    onLoad: (data: Record<string, unknown>) => {
      if (data.monthData) setMonthData(data.monthData as Record<string, Record<string, number>>);
      if (typeof data.openingCash === "number") setOpeningCash(data.openingCash);
    },
    getState: useCallback(() => ({ monthData, openingCash }), [monthData, openingCash]),
  });

  // Map Common Utility short month names to Burn & Runway month names
  const HUB_TO_BURN_MONTH: Record<string, string> = {
    Apr: "April", May: "May", Jun: "June", Jul: "July",
    Aug: "Aug", Sep: "Sep", Oct: "Oct", Nov: "Nov",
    Dec: "Dec", Jan: "Jan", Feb: "Feb", Mar: "Mar",
  };

  useEffect(() => {
    hydrate();
    const hub = loadModelResults<Record<string, unknown>>("inv-common-utility");
    if (!hub) return;
    const hubMonths = hub.months as Record<string, Record<string, number>> | undefined;
    const locked = new Set<string>();

    setMonthData((prev) => {
      const next = { ...prev };
      if (hubMonths) {
        Object.entries(hubMonths).forEach(([shortM, data]) => {
          const burnM = HUB_TO_BURN_MONTH[shortM];
          if (!burnM || !next[burnM]) return;
          next[burnM] = { ...next[burnM] };
          if (data.recurringRevenue > 0) { next[burnM]["Recurring Revenue"] = data.recurringRevenue; locked.add(`${burnM}::Recurring Revenue`); }
          if (data.variableRevenue > 0) { next[burnM]["Miscll. revenue"] = data.variableRevenue; locked.add(`${burnM}::Miscll. revenue`); }
          if (data.totalFixedCosts > 0) { next[burnM]["Fixed Expenses"] = data.totalFixedCosts; locked.add(`${burnM}::Fixed Expenses`); }
          if (data.totalVariableCosts > 0) { next[burnM]["Variable Expenses"] = data.totalVariableCosts; locked.add(`${burnM}::Variable Expenses`); }
        });
      } else if (typeof hub.monthlyRevenue === "number" && (hub.monthlyRevenue as number) > 0) {
        next["April"] = { ...next["April"], "Recurring Revenue": hub.monthlyRevenue as number, "Fixed Expenses": (hub.totalFixedCosts as number) ?? 0, "Variable Expenses": (hub.totalVariableCosts as number) ?? 0 };
        locked.add("April::Recurring Revenue"); locked.add("April::Fixed Expenses"); locked.add("April::Variable Expenses");
      }
      return next;
    });
    if (locked.size > 0) { setHubLinked(true); setLockedFields(locked); }
  }, [hydrate]);

  const results = useMemo(() => calculateBurnRunway(monthData, openingCash), [monthData, openingCash]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { saveModelResults("inv-burn-runway", results); }, [results]);

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

  const handleReset = () => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyInputs() as Record<string, number>; });
    setMonthData(d);
    setOpeningCash(0);
    setHubLinked(false);
    clearModelResults("inv-burn-runway");
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      await api.post("/calculations", { modelSlug: "inv-burn-runway", inputs: { openingCash, monthData }, outputs: results });
      offerSmartResultsAfterCalculate("inv-burn-runway", { openingCash, monthData }, results);
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  const cur = results.monthlyData[activeMonth];
  const summaryRows = [
    { label: "Revenue", key: "Total Revenue" },
    { label: "Total Expenses", key: "Total Expenses" },
    { label: "Net Profit/Loss", key: "Net Profit/Loss" },
    { label: "Gross Burn", key: "Gross Burn" },
    { label: "Net Burn", key: "Net Burn" },
    { label: "Avg Net Burn", key: "Avg Net Burn (to date)" },
    { label: "Cumulative Cash", key: "Cumulative Cash" },
    { label: "Runway (Months)", key: "Runway (months)" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <ModelBackLink modelSlug="inv-burn-runway" label="Back to Models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" />

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-400/10">
            <Flame className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Burn &amp; Runway Monitor</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-amber-400/10 text-amber-400">Investor Grade</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Month-by-month burn tracking with cumulative cash &amp; runway.
              <span className="text-amber-400 ml-2 text-xs font-medium">&larr; Common Utility</span>
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

      {hubLinked && (
        <div className="rounded-xl bg-success/5 border border-success/20 p-3 mb-6">
          <p className="text-xs text-success font-medium">Auto-filled from Common Utility. Linked fields are locked.</p>
        </div>
      )}

      {/* Opening Cash */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-4">
        <label className="flex items-center text-xs text-muted-foreground mb-1">
          Opening Cash Balance
          {investorHint("Opening Cash Balance") && <FieldHint hint={investorHint("Opening Cash Balance")!} />}
        </label>
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
          <input type="number" value={openingCash || ""} onChange={(e) => { setOpeningCash(parseFloat(e.target.value) || 0); markDirty(); }}
            placeholder="100000" className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
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
        <div className="rounded-2xl border border-border bg-card p-5 output-panel" data-inputs>
          <h3 className="font-semibold text-sm mb-3">{activeMonth} Inputs</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INPUT_FIELDS.map((field) => {
              const isLocked = lockedFields.has(`${activeMonth}::${field.key}`);
              return (
              <div key={field.key}>
                <label className="flex items-center text-xs text-muted-foreground mb-1">
                  {field.label}
                  {investorHint(field.key) && <FieldHint hint={investorHint(field.key)!} />}
                  {isLocked && <span className="ml-1 text-[10px] text-amber-400/70">(auto-filled)</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                  <input type="number" data-field={field.key}
                    value={monthData[activeMonth][field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLocked}
                    placeholder="0"
                    className={`w-full rounded-lg border border-border pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${isLocked ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60" : "bg-input"}`}
                  />
                </div>
              </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4 h-fit sticky top-8">
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">{activeMonth} Summary</h3>
            {cur && (
              <div className="space-y-2 text-xs">
                {summaryRows.map((row) => (
                  <div key={row.label} className="flex justify-between rounded-lg px-3 py-1.5 bg-background/50 border border-border/50">
                    <span className="text-muted-foreground inline-flex items-center">
                      <HintLabel hint={investorHint(row.key)}>{row.label}</HintLabel>
                    </span>
                    <span className={`font-semibold ${
                      row.key === "Net Profit/Loss" ? (Number(cur[row.key]) >= 0 ? "text-success" : "text-danger") :
                      row.key === "Net Burn" ? (Number(cur[row.key]) > 0 ? "text-danger" : "text-success") : ""
                    }`}>
                      {row.key === "Runway (months)"
                        ? formatRunway(cur[row.key] as number | null)
                        : formatCurrency(Number(cur[row.key]) || 0)}
                    </span>
                  </div>
                ))}
                {cur["CLASSIFICATION"] && (
                  <div className={`rounded-lg px-3 py-2 text-center font-semibold text-xs ${
                    cur["CLASSIFICATION"] === "GREEN" ? "bg-success/10 text-success" :
                    cur["CLASSIFICATION"] === "AMBER" ? "bg-amber-400/10 text-amber-400" :
                    "bg-danger/10 text-danger"
                  }`}>
                    <span className="inline-flex items-center justify-center gap-1">
                      <HintLabel hint={investorHint("CLASSIFICATION")}>
                        {cur["CLASSIFICATION"] === "GREEN" ? "GREEN — Healthy" :
                         cur["CLASSIFICATION"] === "AMBER" ? "AMBER — Monitor" : "RED — Critical"}
                      </HintLabel>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============ CHARTS ============ */}
      {results.status.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Cumulative Cash Area */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Cumulative Cash Position</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 30, left: 55 },
              xAxis: { type: "category", data: results.status.map(s => s.month), axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => formatChartCurrency(v) }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{
                type: "line", smooth: true,
                data: results.status.map(s => s.cumulativeCash),
                areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(96,165,250,0.3)" }, { offset: 1, color: "rgba(96,165,250,0)" }] } },
                lineStyle: { color: "#60a5fa", width: 2 }, itemStyle: { color: "#60a5fa" },
                markLine: { data: [{ yAxis: 0, lineStyle: { color: "#ef4444", type: "dashed" } }], label: { show: false }, symbol: "none" },
              }],
            }} />
          </div>

          {/* Monthly Net Burn */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Monthly Net Burn</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 30, left: 55 },
              xAxis: { type: "category", data: results.status.map(s => s.month), axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => formatChartCurrency(v) }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{
                type: "bar",
                data: results.status.map(s => ({ value: s.netBurn, itemStyle: { color: s.netBurn > 0 ? "#ef4444" : "#34d399", borderRadius: [4, 4, 0, 0] } })),
              }],
            }} />
          </div>

          {/* Runway Trend */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Runway Trend</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              grid: { top: 15, right: 15, bottom: 30, left: 55 },
              xAxis: { type: "category", data: results.status.map(s => s.month), axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", name: "months", nameTextStyle: { color: "#888", fontSize: 9 }, axisLabel: { color: "#888", fontSize: 10 }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{
                type: "line", smooth: true,
                data: results.status.map(s => isInfiniteRunway(s.runway) ? 36 : Math.min(s.runway as number, 36)),
                lineStyle: { color: "#f59e0b", width: 2 }, itemStyle: { color: "#f59e0b" }, symbol: "circle", symbolSize: 5,
                markLine: { data: [{ yAxis: 12, lineStyle: { color: "#34d399", type: "dashed" } }, { yAxis: 6, lineStyle: { color: "#ef4444", type: "dashed" } }], label: { formatter: (p: any) => `${p.value}mo`, color: "#888", fontSize: 9 }, symbol: "none" },
              }],
            }} />
          </div>

          {/* Classification Donut */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Month Classification</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              series: [{ type: "pie", radius: ["40%", "68%"], center: ["50%", "50%"],
                label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{c} mo" },
                data: [
                  { value: results.status.filter(s => s.classification === "GREEN").length, name: "GREEN", itemStyle: { color: "#34d399" } },
                  { value: results.status.filter(s => s.classification === "AMBER").length, name: "AMBER", itemStyle: { color: "#f59e0b" } },
                  { value: results.status.filter(s => s.classification === "RED").length, name: "RED", itemStyle: { color: "#ef4444" } },
                ].filter(d => d.value > 0),
              }],
            }} />
          </div>

          {/* Revenue vs Expenses Stacked */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Revenue vs Expenses</h3>
            <ReactECharts style={{ height: 240 }} option={{
              tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
              legend: { data: ["Revenue", "Expenses"], textStyle: { color: "#aaa", fontSize: 10 }, top: 0 },
              grid: { top: 30, right: 15, bottom: 30, left: 55 },
              xAxis: { type: "category", data: MONTHS_ORDER, axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => formatChartCurrency(v) }, splitLine: { lineStyle: { color: "#222" } } },
              series: [
                { name: "Revenue", type: "bar", data: MONTHS_ORDER.map(m => results.monthlyData[m]?.["Total Revenue"] || 0), itemStyle: { color: "#34d399", borderRadius: [4, 4, 0, 0] } },
                { name: "Expenses", type: "bar", data: MONTHS_ORDER.map(m => Math.abs(results.monthlyData[m]?.["Total Expenses"] || 0)), itemStyle: { color: "#ef4444", borderRadius: [4, 4, 0, 0] } },
              ],
            }} />
          </div>

          {/* Runway Gauge (Latest) */}
          {(() => {
            const latest = results.status[results.status.length - 1];
            return (
              <div className="rounded-2xl border border-border bg-card p-5 output-panel">
                <h3 className="font-semibold text-sm mb-3">Current Runway</h3>
                <ReactECharts style={{ height: 220 }} option={{
                  series: [{
                    type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: 24,
                    pointer: { show: true, length: "60%", width: 4, itemStyle: { color: "#60a5fa" } },
                    axisLine: { lineStyle: { width: 20, color: [[0.25, "#ef4444"], [0.5, "#f59e0b"], [1, "#34d399"]] } },
                    axisTick: { show: false }, splitLine: { show: false },
                    axisLabel: { color: "#888", fontSize: 9, distance: 25 },
                    detail: { valueAnimation: true, formatter: () => isInfiniteRunway(latest.runway) ? "∞" : `${Math.min(24, Math.round((latest.runway as number) * 10) / 10)} mo`, color: "#e0e0e0", fontSize: 20, offsetCenter: [0, "70%"] },
                    data: [{ value: isInfiniteRunway(latest.runway) ? 24 : Math.min(Math.round((latest.runway as number) * 10) / 10, 24) }],
                  }],
                }} />
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
