"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Users, Save, RotateCcw } from "lucide-react";
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
  calculateUnitEconomics,
  createEmptyInputs,
  type MonthName,
} from "@/lib/unit-economics-model";

export default function StdUnitEconomicsPage() {
  const { user, hydrate } = useAuth();
  const [monthData, setMonthData] = useState<Record<string, Record<string, number>>>(() => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyInputs(); });
    return d;
  });
  const [activeMonth, setActiveMonth] = useState<MonthName>("Apr");
  const [hubLinked, setHubLinked] = useState(false);
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set());

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "std-unit-economics",
    onLoad: (data: Record<string, unknown>) => {
      if (data.monthData) setMonthData(data.monthData as Record<string, Record<string, number>>);
    },
    getState: useCallback(() => ({ monthData }), [monthData]),
  });

  useEffect(() => {
    hydrate();
    const hub = loadModelResults<Record<string, unknown>>("std-common-utility");
    if (!hub) return;
    const hubMonths = hub.months as Record<string, Record<string, number>> | undefined;
    const locked = new Set<string>();

    setMonthData((prev) => {
      const next = { ...prev };
      if (hubMonths) {
        MONTHS_ORDER.forEach((m) => {
          const data = hubMonths[m];
          if (!data || !next[m]) return;
          next[m] = { ...next[m] };
          if (data.revenue > 0) { next[m]["Sales Revenue"] = data.revenue; locked.add(`${m}::Sales Revenue`); }
          if (data.marketingSpend > 0) { next[m]["Marketing Spend"] = data.marketingSpend; locked.add(`${m}::Marketing Spend`); }
        });
      } else if (typeof hub.monthlyRevenue === "number" && (hub.monthlyRevenue as number) > 0) {
        next["Apr"] = { ...next["Apr"], "Sales Revenue": hub.monthlyRevenue as number };
        locked.add("Apr::Sales Revenue");
      }
      return next;
    });
    if (locked.size > 0) { setHubLinked(true); setLockedFields(locked); }
  }, [hydrate]);

  const results = useMemo(() => calculateUnitEconomics(monthData), [monthData]);

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

  // Auto-persist whenever results change so downstream models (Business Snapshot) can read
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { saveModelResults("std-unit-economics", results); }, [results]);

  const handleReset = () => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyInputs(); });
    setMonthData(d);
    setHubLinked(false);
    clearModelResults("std-unit-economics");
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      await api.post("/calculations", { modelSlug: "std-unit-economics", inputs: monthData, outputs: results });
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  const cur = results.monthlyData[activeMonth];
  const fmt = (key: string, format: string) => {
    const v = Number(cur?.[key]) || 0;
    if (format === "currency") return formatCurrency(v);
    if (format === "percent") return `${v.toFixed(1)}%`;
    if (format === "months") return v === Infinity ? "∞" : `${v.toFixed(1)} mo`;
    return v.toLocaleString();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Unit Economics Basic</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-primary/10 text-primary">Standard</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Month-by-month CAC, LTV, ARPU, Payback, Churn &amp; Growth Rate.
              <span className="text-blue-400 ml-2 text-xs font-medium">&larr; Common Utility</span>
            </p>
          </div>
        </div>
        {user && (
          <button onClick={handleSave} disabled={saving || saved}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${saved ? "bg-success/10 text-success" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>

      {/* Month tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6">
        {MONTHS_ORDER.map((m) => {
          const mStatus = results.status.find((s) => s.month === m);
          const dot = mStatus ? (mStatus.rag === "GREEN" ? "bg-success" : mStatus.rag === "AMBER" ? "bg-amber-400" : "bg-danger") : "";
          return (
            <button key={m} onClick={() => setActiveMonth(m)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${activeMonth === m ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:bg-muted"}`}>
              {m}
              {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
            </button>
          );
        })}
      </div>

      {hubLinked && (
        <div className="rounded-xl bg-success/5 border border-success/20 p-3 mb-6">
          <p className="text-xs text-success font-medium">Revenue &amp; Marketing Spend auto-filled from Common Utility. Linked fields are locked.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Inputs */}
        <div className="rounded-2xl border border-border bg-card p-5" data-inputs>
          <h3 className="font-semibold text-sm mb-4">{activeMonth} Inputs</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INPUT_FIELDS.map((field) => {
              const isLocked = lockedFields.has(`${activeMonth}::${field.key}`);
              return (
              <div key={field.key}>
                <label className="block text-xs text-muted-foreground mb-1">
                  {field.label}
                  {isLocked && <span className="ml-1 text-[10px] text-primary/70">(auto-filled)</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.prefix}</span>
                  <input type="number" data-field={field.key}
                    value={monthData[activeMonth][field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLocked}
                    placeholder="0"
                    className={`w-full rounded-lg border border-border pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${isLocked ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60" : "bg-input"}`}
                  />
                </div>
              </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-1.5">
              <RotateCcw className="h-4 w-4" /> Reset All
            </button>
          </div>
        </div>

        {/* Results sidebar */}
        <div className="space-y-4 h-fit sticky top-8">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">{activeMonth} Results</h3>
            {cur ? (
              <div className="space-y-2 text-xs">
                {OUTPUT_FIELDS.map((f) => (
                  <div key={f.key} className="flex justify-between rounded-lg px-3 py-1.5 bg-background/50 border border-border/50">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-semibold">{fmt(f.key, f.format)}</span>
                  </div>
                ))}
                {cur["KPI Summary Dashboard"] && (
                  <div className={`rounded-lg px-3 py-2 mt-2 text-xs font-medium ${
                    String(cur["KPI Summary Dashboard"]).includes("GREEN") ? "bg-success/10 text-success" :
                    String(cur["KPI Summary Dashboard"]).includes("AMBER") ? "bg-amber-400/10 text-amber-400" :
                    "bg-danger/10 text-danger"
                  }`}>
                    {String(cur["KPI Summary Dashboard"])}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Enter data and results will appear live</p>
            )}
          </div>
        </div>
      </div>

      {/* ============ CHARTS ============ */}
      {results.status.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
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
    </div>
  );
}
