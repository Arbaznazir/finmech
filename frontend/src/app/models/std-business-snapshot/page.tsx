"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, LayoutDashboard, Save, RotateCcw, RefreshCw } from "lucide-react";
import { FieldHint } from "@/components/FieldHint";
import { FIELD_HINTS } from "@/lib/field-hints";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { loadModelResults, saveModelResults, clearModelResults } from "@/lib/model-link";
import { useSavedModel } from "@/lib/use-saved-model";

interface SnapshotInputs {
  monthlyRevenue: number;
  grossMargin: number;
  netMargin: number;
  cashBalance: number;
  burnRate: number;
  totalCustomers: number;
  ltv: number;
  cac: number;
  receivables: number;
  inventory: number;
  payables: number;
  changeInWC: number;
}

interface SnapshotResults {
  ltcCacRatio: number;
  runway: number;
  revenueStatus: "GREEN" | "AMBER" | "RED";
  marginStatus: "GREEN" | "AMBER" | "RED";
  runwayStatus: "GREEN" | "AMBER" | "RED";
  ltcCacStatus: "GREEN" | "AMBER" | "RED";
  healthScore: number;
  healthLabel: string;
  insights: string[];
}

function getRAG(val: number, greenThreshold: number, amberThreshold: number, inverse = false): "GREEN" | "AMBER" | "RED" {
  if (inverse) return val < amberThreshold ? "GREEN" : val < greenThreshold ? "AMBER" : "RED";
  return val >= greenThreshold ? "GREEN" : val >= amberThreshold ? "AMBER" : "RED";
}

function calculateSnapshot(inp: SnapshotInputs): SnapshotResults {
  const ltcCacRatio = inp.cac > 0 ? inp.ltv / inp.cac : 0;
  const runway = inp.burnRate > 0 ? inp.cashBalance / inp.burnRate : Infinity;

  const revenueStatus = getRAG(inp.monthlyRevenue, 50000, 10000);
  const marginStatus = getRAG(inp.grossMargin, 40, 20);
  const runwayStatus = getRAG(runway === Infinity ? 99 : runway, 12, 6);
  const ltcCacStatus = getRAG(ltcCacRatio, 3, 1);

  const scores = { GREEN: 3, AMBER: 2, RED: 1 };
  const total = scores[revenueStatus] + scores[marginStatus] + scores[runwayStatus] + scores[ltcCacStatus];
  const healthScore = Math.round((total / 12) * 100);
  const healthLabel = healthScore >= 75 ? "HEALTHY" : healthScore >= 50 ? "CAUTION" : "CRITICAL";

  const insights: string[] = [];
  if (revenueStatus === "RED") insights.push("Revenue is very low — prioritize sales pipeline.");
  if (marginStatus === "RED") insights.push("Gross margin critical — review COGS and pricing.");
  if (runwayStatus === "RED") insights.push("Runway below 6 months — seek funding or cut costs.");
  if (ltcCacStatus === "RED") insights.push("LTV/CAC below 1x — customer economics are unsustainable.");
  if (insights.length === 0) insights.push("Business fundamentals look solid. Keep monitoring.");

  return { ltcCacRatio, runway, revenueStatus, marginStatus, runwayStatus, ltcCacStatus, healthScore, healthLabel, insights };
}

const emptyInputs = (): SnapshotInputs => ({
  monthlyRevenue: 0, grossMargin: 0, netMargin: 0, cashBalance: 0, burnRate: 0, totalCustomers: 0, ltv: 0, cac: 0, receivables: 0, inventory: 0, payables: 0, changeInWC: 0,
});

export default function StdBusinessSnapshotPage() {
  const { user, hydrate } = useAuth();
  const [inputs, setInputs] = useState<SnapshotInputs>(emptyInputs());
  const [results, setResults] = useState<SnapshotResults | null>(null);
  const [linkedSources, setLinkedSources] = useState<string[]>([]);
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set());

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "std-business-snapshot",
    onLoad: (data: Record<string, unknown>) => {
      if (data.inputs) setInputs(data.inputs as SnapshotInputs);
    },
    getState: useCallback(() => ({ inputs }), [inputs]),
  });

  const loadFromLinkedModels = () => {
    const sources: string[] = [];
    const locked = new Set<string>();
    const hub = loadModelResults<Record<string, unknown>>("std-common-utility");
    const burn = loadModelResults<Record<string, unknown>>("std-burn-runway");
    const ue = loadModelResults<Record<string, unknown>>("std-unit-economics");

    setInputs((prev) => {
      const next = { ...prev };
      if (hub) {
        // Use summary data from Common Utility
        if (typeof hub.monthlyRevenue === "number" && (hub.monthlyRevenue as number) > 0) { next.monthlyRevenue = hub.monthlyRevenue as number; locked.add("monthlyRevenue"); }
        if (typeof hub.grossMargin === "number" && (hub.grossMargin as number) > 0) { next.grossMargin = hub.grossMargin as number; locked.add("grossMargin"); }
        if (typeof hub.netMargin === "number" && (hub.netMargin as number) > 0) { next.netMargin = hub.netMargin as number; locked.add("netMargin"); }
        sources.push("Common Utility");
      }
      if (burn) {
        const md = burn as Record<string, unknown>;
        if (md.monthlyData) {
          const months = md.monthlyData as Record<string, Record<string, number>>;
          const keys = Object.keys(months);
          // Find last month with data
          for (let i = keys.length - 1; i >= 0; i--) {
            const last = months[keys[i]];
            if (last && (last["Total Revenue"] > 0 || last["Cumulative Cash"] !== 0)) {
              if (last["Cumulative Cash"] > 0) { next.cashBalance = last["Cumulative Cash"]; locked.add("cashBalance"); }
              if (last["Net Burn"] > 0) { next.burnRate = last["Net Burn"]; locked.add("burnRate"); }
              break;
            }
          }
          sources.push("Burn & Runway");
        }
      }
      if (ue) {
        const ueData = ue as Record<string, unknown>;
        if (ueData.monthlyData) {
          const months = ueData.monthlyData as Record<string, Record<string, number>>;
          const keys = Object.keys(months);
          for (let i = keys.length - 1; i >= 0; i--) {
            const last = months[keys[i]];
            if (last && last["Total Active Customers (Monthly)"] > 0) {
              next.totalCustomers = last["Total Active Customers (Monthly)"]; locked.add("totalCustomers");
              if (last["LTV"] > 0) { next.ltv = last["LTV"]; locked.add("ltv"); }
              if (last["CAC"] > 0) { next.cac = last["CAC"]; locked.add("cac"); }
              break;
            }
          }
        }
        sources.push("Unit Economics");
      }
      // Pull from Movements model
      const mov = loadModelResults<Record<string, unknown>>("std-movements");
      if (mov) {
        const movAnnual = mov.annual as Record<string, number> | undefined;
        if (movAnnual) {
          if (movAnnual.closingReceivables > 0) { next.receivables = movAnnual.closingReceivables; locked.add("receivables"); }
          if (movAnnual.closingInventory > 0) { next.inventory = movAnnual.closingInventory; locked.add("inventory"); }
          if (movAnnual.closingPayables > 0) { next.payables = movAnnual.closingPayables; locked.add("payables"); }
          if (movAnnual.totalChangeInWC !== 0) { next.changeInWC = movAnnual.totalChangeInWC; locked.add("changeInWC"); }
          sources.push("Movements");
        }
      }
      return next;
    });
    setLinkedSources(sources);
    setLockedFields(locked);
  };

  useEffect(() => {
    hydrate();
    loadFromLinkedModels();
  }, [hydrate]);

  const handleChange = (key: keyof SnapshotInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    markDirty();
  };

  const handleCalculate = () => {
    const r = calculateSnapshot(inputs);
    setResults(r);
    saveModelResults("std-business-snapshot", { ...inputs, ...r });
    persistState();
  };

  const handleReset = () => {
    setInputs(emptyInputs()); setResults(null); setLinkedSources([]);
    clearModelResults("std-business-snapshot");
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user || !results) return;
    try {
      await api.post("/calculations", { modelSlug: "std-business-snapshot", inputs, outputs: results });
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  const fields: { key: keyof SnapshotInputs; label: string; prefix: string; type?: string }[] = [
    { key: "monthlyRevenue", label: "Monthly Revenue", prefix: "$" },
    { key: "grossMargin", label: "Gross Margin %", prefix: "%" },
    { key: "netMargin", label: "Net Margin %", prefix: "%" },
    { key: "cashBalance", label: "Cash Balance", prefix: "$" },
    { key: "burnRate", label: "Monthly Burn", prefix: "$" },
    { key: "totalCustomers", label: "Total Customers", prefix: "#" },
    { key: "ltv", label: "LTV", prefix: "$" },
    { key: "cac", label: "CAC", prefix: "$" },
    { key: "receivables", label: "Trade Receivables", prefix: "$" },
    { key: "inventory", label: "Inventory", prefix: "$" },
    { key: "payables", label: "Trade Payables", prefix: "$" },
    { key: "changeInWC", label: "Δ Working Capital", prefix: "$" },
  ];

  const ragColor = (status: string) =>
    status === "GREEN" ? "text-success bg-success/10 border-success/30" :
    status === "AMBER" ? "text-amber-400 bg-amber-400/10 border-amber-400/30" :
    "text-danger bg-danger/10 border-danger/30";

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models?tier=standard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10">
            <LayoutDashboard className="h-7 w-7 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Business Snapshot</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-primary/10 text-primary">Standard</span>
            </div>
            <p className="text-muted-foreground mt-1">
              One-page business health overview aggregating all Standard models.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadFromLinkedModels} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium bg-blue-400/10 text-blue-400 hover:bg-blue-400/20 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Reload from Models
          </button>
          {results && user && (
            <button onClick={handleSave} disabled={saving || saved}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${saved ? "bg-success/10 text-success" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
              <Save className="h-4 w-4" />
              {saved ? "Saved!" : saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>

      {linkedSources.length > 0 && (
        <div className="rounded-xl bg-success/5 border border-success/20 p-3 mb-6">
          <p className="text-xs text-success font-medium">
            Data imported from: {linkedSources.join(", ")}. Linked fields are locked.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Inputs */}
        <div className="rounded-2xl border border-border bg-card p-6 output-panel" data-inputs>
          <h2 className="font-semibold mb-5">Business Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((field) => {
              const isLocked = lockedFields.has(field.key);
              return (
              <div key={field.key}>
                <label className="flex items-center text-xs text-muted-foreground mb-1">
                  {field.label}
                  {FIELD_HINTS[field.key] && <FieldHint hint={FIELD_HINTS[field.key]} />}
                  {isLocked && <span className="ml-1 text-[10px] text-primary/70">(auto-filled)</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.prefix}</span>
                  <input type="number" step="0.01" data-field={field.key}
                    value={inputs[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    disabled={isLocked}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const all = Array.from((e.currentTarget.closest("[data-inputs]") || document).querySelectorAll<HTMLInputElement>("input[data-field]"));
                        const idx = all.indexOf(e.currentTarget);
                        if (idx >= 0 && idx < all.length - 1) all[idx + 1].focus();
                        else handleCalculate();
                      }
                    }}
                    placeholder="0"
                    className={`w-full rounded-lg border border-border pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${isLocked ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60" : "bg-input"}`}
                  />
                </div>
              </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button onClick={handleCalculate} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
              Generate Snapshot
            </button>
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        {results ? (
          <div className="space-y-4 h-fit sticky top-8">
            {/* Health Score */}
            <div className={`rounded-2xl p-6 text-center border-2 ${results.healthLabel === "HEALTHY" ? "border-success/30 bg-success/5" : results.healthLabel === "CAUTION" ? "border-amber-400/30 bg-amber-400/5" : "border-danger/30 bg-danger/5"}`}>
              <p className="text-xs text-muted-foreground mb-1">Business Health Index</p>
              <p className={`text-4xl font-bold ${results.healthLabel === "HEALTHY" ? "text-success" : results.healthLabel === "CAUTION" ? "text-amber-400" : "text-danger"}`}>{results.healthScore}%</p>
              <p className={`text-sm font-semibold mt-1 ${results.healthLabel === "HEALTHY" ? "text-success" : results.healthLabel === "CAUTION" ? "text-amber-400" : "text-danger"}`}>{results.healthLabel}</p>
            </div>

            {/* RAG Cards */}
            <div className="grid grid-cols-2 gap-3">
              {([
                { label: "Revenue", status: results.revenueStatus, value: formatCurrency(inputs.monthlyRevenue) + "/mo" },
                { label: "Gross Margin", status: results.marginStatus, value: `${inputs.grossMargin.toFixed(1)}%` },
                { label: "Runway", status: results.runwayStatus, value: results.runway === Infinity ? "∞" : `${results.runway.toFixed(1)} mo` },
                { label: "LTV/CAC", status: results.ltcCacStatus, value: `${results.ltcCacRatio.toFixed(2)}x` },
              ]).map((card) => (
                <div key={card.label} className={`rounded-xl border p-4 ${ragColor(card.status)}`}>
                  <p className="text-[10px] uppercase font-semibold mb-1">{card.label}</p>
                  <p className="text-lg font-bold">{card.value}</p>
                  <p className="text-[10px] font-semibold mt-1">{card.status}</p>
                </div>
              ))}
            </div>

            {/* Insights */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Insights</h3>
              <div className="space-y-2">
                {results.insights.map((insight, i) => (
                  <div key={i} className="text-xs text-muted-foreground rounded-lg bg-background/50 border border-border/50 px-3 py-2">
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card min-h-[300px]">
            <p className="text-muted-foreground text-sm">Enter metrics and click Generate Snapshot</p>
          </div>
        )}
      </div>

      {/* ============ CHARTS ============ */}
      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Health Radar */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Business Health Radar</h3>
            <ReactECharts
              style={{ height: 260 }}
              option={{
                radar: {
                  indicator: [
                    { name: "Revenue", max: 3 },
                    { name: "Margin", max: 3 },
                    { name: "Runway", max: 3 },
                    { name: "LTV/CAC", max: 3 },
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
                      { GREEN: 3, AMBER: 2, RED: 1 }[results.revenueStatus],
                      { GREEN: 3, AMBER: 2, RED: 1 }[results.marginStatus],
                      { GREEN: 3, AMBER: 2, RED: 1 }[results.runwayStatus],
                      { GREEN: 3, AMBER: 2, RED: 1 }[results.ltcCacStatus],
                    ],
                    areaStyle: { color: results.healthLabel === "HEALTHY" ? "rgba(52,211,153,0.25)" : results.healthLabel === "CAUTION" ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)" },
                    lineStyle: { color: results.healthLabel === "HEALTHY" ? "#34d399" : results.healthLabel === "CAUTION" ? "#f59e0b" : "#ef4444", width: 2 },
                    itemStyle: { color: results.healthLabel === "HEALTHY" ? "#34d399" : results.healthLabel === "CAUTION" ? "#f59e0b" : "#ef4444" },
                  }],
                }],
              }}
            />
          </div>

          {/* Key Metrics Bar */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Key Metrics Overview</h3>
            <ReactECharts
              style={{ height: 260 }}
              option={{
                tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                grid: { top: 15, right: 15, bottom: 40, left: 70 },
                xAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10 }, splitLine: { lineStyle: { color: "#222" } } },
                yAxis: { type: "category", data: ["Revenue/mo", "Cash Balance", "Burn Rate", "LTV", "CAC"], axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                series: [{
                  type: "bar",
                  data: [
                    { value: inputs.monthlyRevenue, itemStyle: { color: "#60a5fa", borderRadius: [0, 4, 4, 0] } },
                    { value: inputs.cashBalance, itemStyle: { color: "#34d399", borderRadius: [0, 4, 4, 0] } },
                    { value: inputs.burnRate, itemStyle: { color: "#ef4444", borderRadius: [0, 4, 4, 0] } },
                    { value: inputs.ltv, itemStyle: { color: "#a78bfa", borderRadius: [0, 4, 4, 0] } },
                    { value: inputs.cac, itemStyle: { color: "#f59e0b", borderRadius: [0, 4, 4, 0] } },
                  ],
                  label: { show: true, position: "right", color: "#aaa", fontSize: 9, formatter: (p: any) => `$${p.value.toLocaleString()}` },
                }],
              }}
            />
          </div>

          {/* Health Score Gauge */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Health Score</h3>
            <ReactECharts
              style={{ height: 220 }}
              option={{
                series: [{
                  type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: 100,
                  pointer: { show: true, length: "60%", width: 4, itemStyle: { color: "#60a5fa" } },
                  axisLine: { lineStyle: { width: 20, color: [[0.33, "#ef4444"], [0.66, "#f59e0b"], [1, "#34d399"]] } },
                  axisTick: { show: false },
                  splitLine: { show: false },
                  axisLabel: { color: "#888", fontSize: 9, distance: 25 },
                  detail: { valueAnimation: true, formatter: "{value}%", color: "#e0e0e0", fontSize: 20, offsetCenter: [0, "70%"] },
                  data: [{ value: results.healthScore }],
                }],
              }}
            />
          </div>

          {/* Working Capital Donut */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Working Capital Composition</h3>
            <ReactECharts
              style={{ height: 220 }}
              option={{
                tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                series: [{
                  type: "pie", radius: ["40%", "68%"], center: ["50%", "50%"],
                  label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{d}%" },
                  data: [
                    { value: Math.abs(inputs.receivables), name: "Receivables", itemStyle: { color: "#60a5fa" } },
                    { value: Math.abs(inputs.inventory), name: "Inventory", itemStyle: { color: "#f59e0b" } },
                    { value: Math.abs(inputs.payables), name: "Payables", itemStyle: { color: "#ef4444" } },
                  ].filter(d => d.value > 0),
                }],
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
