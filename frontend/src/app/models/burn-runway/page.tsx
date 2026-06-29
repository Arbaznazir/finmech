"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link"
import { ModelBackLink } from "@/components/model-back-link";
import {
  ArrowLeft, Flame, Save, RotateCcw, ChevronDown, ChevronUp,
  CheckCircle, AlertTriangle, XCircle, Info,
} from "lucide-react";
import { FieldHint } from "@/components/FieldHint";
import { HintLabel } from "@/components/HintLabel";
import { standaloneHint } from "@/lib/standalone-model-hints";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import { formatCurrency, ragCardClasses, ragTextClass } from "@/lib/utils";
import api from "@/lib/api";
import { useSavedModel } from "@/lib/use-saved-model";
import { offerSmartResultsAfterCalculate } from "@/lib/smart-results";
import {
  MONTHS_ORDER,
  INPUT_FIELDS,
  OUTPUT_FIELDS,
  calculateBurnRunway,
  createEmptyInputs,
  formatRunway,
  isInfiniteRunway,
  type MonthName,
  type BurnRunwayResults,
  type Classification,
} from "@/lib/burn-runway-model";

type TabView = "input" | "monthly" | "insights" | "status";

function fmtVal(key: string, value: number | string | null | undefined): string {
  if (value === undefined || value === null) return "—";
  if (key === "CLASSIFICATION") return String(value);
  if (typeof value === "string") return value;
  if (key.includes("Ratio") || key.includes("ratio"))
    return (value * 100).toFixed(1) + "%";
  if (key === "Runway (months)")
    return formatRunway(value as number | null);
  return formatCurrency(value);
}

function classColor(c: Classification): string {
  return ragTextClass(c);
}

function classBg(c: Classification): string {
  return `${ragCardClasses(c)} border`;
}

function classIcon(c: Classification | null, size: "sm" | "lg" = "lg") {
  const cls = size === "sm" ? "h-5 w-5" : "h-8 w-8";
  if (c === "GREEN") return <CheckCircle className={`${cls} text-success`} />;
  if (c === "AMBER") return <AlertTriangle className={`${cls} text-amber-400`} />;
  if (c === "RED") return <XCircle className={`${cls} text-danger`} />;
  return <Info className={`${cls} text-muted-foreground`} />;
}

export default function BurnRunwayPage() {
  const { user, hydrate } = useAuth();
  const [activeMonth, setActiveMonth] = useState<MonthName>("April");
  const [monthsData, setMonthsData] = useState<Record<string, Record<string, number>>>({});
  const [openingCash, setOpeningCash] = useState(100000);
  const [results, setResults] = useState<BurnRunwayResults | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>("input");
  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "burn-runway",
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
    const result = calculateBurnRunway(monthsData, openingCash);
    setResults(result);
    offerSmartResultsAfterCalculate("burn-runway", { monthsData, openingCash }, result);
    setActiveTab("monthly");
    persistState();
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
        modelSlug: "burn-runway",
        inputs: { openingCash, monthsData },
        outputs: results,
      });
      await persistState();
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const currentInputs = monthsData[activeMonth] || createEmptyInputs();

  // Group inputs by category
  const categories = INPUT_FIELDS.reduce<Record<string, typeof INPUT_FIELDS>>((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <ModelBackLink modelSlug="burn-runway" label="Back to Models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" />

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-orange-400/10">
            <Flame className="h-7 w-7 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Burn &amp; Runway Monitor</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-blue-400/10 text-blue-400">
                Standalone
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              Track cash burn, runway, ratios &amp; classification month by month.
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
        {(["input", "monthly", "insights", "status"] as TabView[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors whitespace-nowrap ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {tab === "input" ? "Enter Data" : tab === "monthly" ? "Monthly View" : tab === "insights" ? "Burn Insights" : "Runway Status"}
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
              <label className="flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Opening Cash Balance
                {standaloneHint("Opening Cash Balance") && <FieldHint hint={standaloneHint("Opening Cash Balance")!} />}
              </label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                <input
                  type="number"
                  value={openingCash || ""}
                  onChange={(e) => { setOpeningCash(parseFloat(e.target.value) || 0); markDirty(); }}
                  placeholder="100000"
                  className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>

            {Object.entries(categories).map(([category, fields]) => (
              <div key={category} className="mb-4">
                <div className="rounded-lg bg-background/50 px-3 py-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1">
                  {fields.map((field) => (
                    <div key={field.key}>
                      <label className="flex items-center text-xs text-muted-foreground mb-1">{field.label}{standaloneHint(field.key) && <FieldHint hint={standaloneHint(field.key)!} />}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
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
                Calculate Burn &amp; Runway
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
          {/* Opening cash banner */}
          <div className="px-4 py-3 border-b border-border bg-background/50 text-sm">
            <span className="text-muted-foreground">Opening Cash: </span>
            <span className="font-semibold">{formatCurrency(results.openingCash)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground sticky left-0 bg-background/50 min-w-[200px]">Metric</th>
                  {results.monthsAdded.map((m) => (
                    <th key={m} className="text-right px-4 py-3 font-semibold text-muted-foreground min-w-[110px]">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {OUTPUT_FIELDS.map((field) => {
                  const isBold = ["Cumulative Cash", "Net Burn", "Runway (months)", "CLASSIFICATION"].includes(field.key);
                  return (
                    <tr key={field.key} className={`border-b border-border/30 ${isBold ? "bg-background/30" : ""}`}>
                      <td className={`px-4 py-2.5 sticky left-0 bg-card ${isBold ? "font-semibold bg-background/30" : "text-muted-foreground"}`}>
                        <HintLabel hint={standaloneHint(field.key)} className={isBold ? "font-semibold" : ""}>{field.label}</HintLabel>
                      </td>
                      {results.monthsAdded.map((m) => {
                        const val = results.monthlyData[m]?.[field.key];
                        const isClass = field.key === "CLASSIFICATION";
                        const numVal = typeof val === "number" ? val : 0;
                        const isNeg = typeof val === "number" && val < 0;
                        return (
                          <td key={m} className={`text-right px-4 py-2.5 ${isBold ? "font-semibold" : ""} ${
                            isClass ? classColor(val as Classification) :
                            isNeg ? "text-danger" : ""
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

      {/* ============ INSIGHTS TAB ============ */}
      {activeTab === "insights" && results && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Overall Health Score */}
          <div className={`rounded-2xl border bg-card p-8 text-center ${
            results.insights.classification
              ? ragCardClasses(results.insights.classification)
              : "border-border"
          }`}>
            <div className="flex justify-center mb-4">
              {classIcon(results.insights.classification ?? "RED")}
            </div>
            {results.insights.classification && (
              <div className="mb-3">
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold border ${
                  results.insights.classification === "GREEN" ? "bg-success/10 text-success border-success/30" :
                  results.insights.classification === "AMBER" ? "bg-amber-400/10 text-amber-400 border-amber-400/30" :
                  "bg-danger/10 text-danger border-danger/30"
                }`}>
                  {results.insights.classification}
                </span>
              </div>
            )}
            <div className="text-5xl font-bold mb-2">
              <span className={results.insights.classification ? ragTextClass(results.insights.classification) : results.insights.overallColor}>
                {results.insights.healthScore}/100
              </span>
            </div>
            <h2 className={`text-xl font-bold mb-2 ${results.insights.classification ? ragTextClass(results.insights.classification) : results.insights.overallColor}`}>
              <HintLabel hint={standaloneHint("burnHealthScore")}>{results.insights.overall}</HintLabel>
            </h2>
          </div>

          {/* Runway Trend & Cash Outlook */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-card border border-border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                <HintLabel hint={standaloneHint("runwayTrend")}>Runway Trend</HintLabel>
              </p>
              <p className={`text-xl font-bold ${
                results.insights.runwayTrend === "improving" ? "text-success" :
                results.insights.runwayTrend === "declining" ? "text-amber-400" :
                results.insights.runwayTrend === "critical" ? "text-danger" : "text-muted-foreground"
              }`}>
                {results.insights.runwayTrend === "improving" ? "↑ Improving" :
                 results.insights.runwayTrend === "declining" ? "↓ Declining" :
                 results.insights.runwayTrend === "critical" ? "🚨 Critical" : "→ Stable"}
              </p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                <HintLabel hint={standaloneHint("cashOutlook")}>Cash Outlook</HintLabel>
              </p>
              <p className={`text-xl font-bold ${
                results.insights.cashOutlook === "surplus" ? "text-success" :
                results.insights.cashOutlook === "constrained" ? "text-amber-400" :
                results.insights.cashOutlook === "deficit" ? "text-danger" : "text-muted-foreground"
              }`}>
                {results.insights.cashOutlook === "surplus" ? "💰 Surplus" :
                 results.insights.cashOutlook === "constrained" ? "⚠️ Constrained" :
                 results.insights.cashOutlook === "deficit" ? "🚨 Deficit" : "✓ Adequate"}
              </p>
            </div>
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
                  item.startsWith("💰") ? "bg-green-400/5 border border-green-400/20" :
                  "bg-muted/30 border border-border/50"
                }`}>
                  <span className="text-sm leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                <HintLabel hint={standaloneHint("Runway (months)")}>Latest Runway</HintLabel>
              </p>
              <p className="text-2xl font-bold">
                {results.status.length > 0
                  ? formatRunway(results.status[results.status.length - 1].runway)
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                <HintLabel hint={standaloneHint("Net Burn")}>Net Burn</HintLabel>
              </p>
              <p className="text-2xl font-bold text-danger">
                {results.status.length > 0
                  ? formatCurrency(results.status[results.status.length - 1].netBurn)
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                <HintLabel hint={standaloneHint("Cumulative Cash")}>Cumulative Cash</HintLabel>
              </p>
              <p className={`text-2xl font-bold ${results.status.length > 0 && results.status[results.status.length - 1].cumulativeCash < 0 ? "text-danger" : ""}`}>
                {results.status.length > 0
                  ? formatCurrency(results.status[results.status.length - 1].cumulativeCash)
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">
                <HintLabel hint={standaloneHint("CLASSIFICATION")}>GREEN/AMBER/RED</HintLabel>
              </p>
              <p className="text-2xl font-bold">
                {results.status.length > 0
                  ? `${results.status.filter(s => s.classification === "GREEN").length}/${results.status.filter(s => s.classification === "AMBER").length}/${results.status.filter(s => s.classification === "RED").length}`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============ STATUS TAB ============ */}
      {activeTab === "status" && results && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Summary cards */}
          {results.status.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl bg-card border border-border p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center">
                  <HintLabel hint={standaloneHint("Runway (months)")}>Latest Runway</HintLabel>
                </p>
                <p className="text-2xl font-bold">
                  {formatRunway(results.status[results.status.length - 1].runway)}
                </p>
              </div>
              <div className="rounded-xl bg-card border border-border p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center">
                  <HintLabel hint={standaloneHint("Cumulative Cash")}>Latest Cash</HintLabel>
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(results.status[results.status.length - 1].cumulativeCash)}
                </p>
              </div>
              <div className="rounded-xl bg-card border border-border p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center">
                  <HintLabel hint={standaloneHint("CLASSIFICATION")}>Latest Status</HintLabel>
                </p>
                <p className={`text-2xl font-bold ${classColor(results.status[results.status.length - 1].classification)}`}>
                  {results.status[results.status.length - 1].classification}
                </p>
              </div>
            </div>
          )}

          {/* Per-month status */}
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <h2 className="font-semibold mb-5">Monthly Classification</h2>
            <div className="space-y-3">
              {results.status.map((s) => (
                <div key={s.month} className={`flex items-center justify-between rounded-xl px-5 py-4 border ${classBg(s.classification)}`}>
                  <div className="flex items-center gap-3">
                    {classIcon(s.classification, "sm")}
                    <div>
                      <p className="font-semibold">{s.month}</p>
                      <p className="text-xs text-muted-foreground">
                        Cash: {formatCurrency(s.cumulativeCash)} · Net Burn: {formatCurrency(s.netBurn)} · Runway: {formatRunway(s.runway)}
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
            <h3 className="font-semibold text-sm mb-3">Classification Logic</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-success shrink-0" />
                <span><strong className="text-success">GREEN</strong> — Recurring Revenue ≥ 70%, profitable or low burn ratio, Runway ≥ 12 mo (or infinite), Variable Cost Ratio &lt; 50%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                <span><strong className="text-amber-400">AMBER</strong> — Recurring Revenue 14–70%, loss-making, Net Burn Ratio &lt; 30%, Runway &gt; 6 mo, Fixed Cost Ratio &gt; 30%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-danger shrink-0" />
                <span><strong className="text-danger">RED</strong> — Below AMBER thresholds</span>
              </div>
            </div>
          </div>

          {/* Cumulative Cash Area */}
          {results.status.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Cumulative Cash Position</h3>
              <ReactECharts
                style={{ height: 240 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  grid: { top: 15, right: 15, bottom: 30, left: 55 },
                  xAxis: { type: "category", data: results.status.map(s => s.month), axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                  yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}` }, splitLine: { lineStyle: { color: "#222" } } },
                  series: [{
                    type: "line", smooth: true,
                    data: results.status.map(s => s.cumulativeCash),
                    areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(96,165,250,0.3)" }, { offset: 1, color: "rgba(96,165,250,0)" }] } },
                    lineStyle: { color: "#60a5fa", width: 2 },
                    itemStyle: { color: "#60a5fa" },
                    markLine: { data: [{ yAxis: 0, lineStyle: { color: "#ef4444", type: "dashed" } }], label: { show: false }, symbol: "none" },
                  }],
                }}
              />
            </div>
          )}

          {/* Monthly Burn Bar */}
          {results.status.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Monthly Net Burn</h3>
              <ReactECharts
                style={{ height: 220 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  grid: { top: 15, right: 15, bottom: 30, left: 55 },
                  xAxis: { type: "category", data: results.status.map(s => s.month), axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                  yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => `₹${(v/1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: "#222" } } },
                  series: [{
                    type: "bar",
                    data: results.status.map(s => ({
                      value: s.netBurn,
                      itemStyle: { color: s.netBurn > 0 ? "#ef4444" : "#34d399", borderRadius: [4, 4, 0, 0] },
                    })),
                  }],
                }}
              />
            </div>
          )}

          {/* Runway Gauge */}
          {results.status.length > 0 && (() => {
            const last = results.status[results.status.length - 1];
            return (
              <div className="rounded-2xl border border-border bg-card p-5 output-panel">
                <h3 className="font-semibold text-sm mb-3">Current Runway</h3>
                <ReactECharts
                  style={{ height: 200 }}
                  option={{
                    series: [{
                      type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: 24,
                      pointer: { show: true, length: "60%", width: 4, itemStyle: { color: "#60a5fa" } },
                      axisLine: { lineStyle: { width: 20, color: [[0.25, "#ef4444"], [0.5, "#f59e0b"], [1, "#34d399"]] } },
                      axisTick: { show: false },
                      splitLine: { show: false },
                      axisLabel: { color: "#888", fontSize: 9, distance: 25 },
                      detail: {
                        valueAnimation: true,
                        formatter: isInfiniteRunway(last.runway) ? "∞" : "{value} mo",
                        color: "#e0e0e0",
                        fontSize: 18,
                        offsetCenter: [0, "70%"],
                      },
                      data: [{
                        value: isInfiniteRunway(last.runway)
                          ? 24
                          : Math.min(24, Math.max(0, Math.round((last.runway as number) * 10) / 10)),
                      }],
                    }],
                  }}
                />
              </div>
            );
          })()}

          {/* Classification Distribution Donut */}
          {results.status.length > 0 && (() => {
            const green = results.status.filter(s => s.classification === "GREEN").length;
            const amber = results.status.filter(s => s.classification === "AMBER").length;
            const red = results.status.filter(s => s.classification === "RED").length;
            return (
              <div className="rounded-2xl border border-border bg-card p-5 output-panel">
                <h3 className="font-semibold text-sm mb-3">Classification Distribution</h3>
                <ReactECharts
                  style={{ height: 200 }}
                  option={{
                    tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                    series: [{
                      type: "pie", radius: ["40%", "68%"], center: ["50%", "50%"],
                      label: { color: "#ccc", fontSize: 10, formatter: "{b}: {c}" },
                      data: [
                        { value: green, name: "Green", itemStyle: { color: "#34d399" } },
                        { value: amber, name: "Amber", itemStyle: { color: "#f59e0b" } },
                        { value: red, name: "Red", itemStyle: { color: "#ef4444" } },
                      ].filter(d => d.value > 0),
                    }],
                  }}
                />
              </div>
            );
          })()}

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
          <p className="text-muted-foreground mb-3">Sign up to save your Burn &amp; Runway analysis</p>
          <Link href="/signup" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
            Create Free Account
          </Link>
        </div>
      )}
    </div>
  );
}
