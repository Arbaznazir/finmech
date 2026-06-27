"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link"
import { ModelBackLink } from "@/components/model-back-link";
import {
  ArrowLeft, Presentation, Save, RotateCcw,
  CheckCircle, AlertTriangle, XCircle, Lightbulb, Info,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { FieldHint } from "@/components/FieldHint";
import { HintLabel } from "@/components/HintLabel";
import { useModelHints } from "@/hooks/use-model-hints";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { useSavedModel } from "@/lib/use-saved-model";
import { offerSmartResultsAfterCalculate } from "@/lib/smart-results";
import {
  INPUT_FIELDS,
  calculatePitchDeck,
  createEmptyInputs,
  type PitchDeckInputs,
  type PitchDeckResults,
  type RAGStatus,
} from "@/lib/pitchdeck-model";

function ragColor(s: RAGStatus): string {
  if (s === "GREEN") return "text-success";
  if (s === "AMBER") return "text-amber-400";
  return "text-danger";
}

function ragBg(s: RAGStatus): string {
  if (s === "GREEN") return "bg-success/10 border-success/30";
  if (s === "AMBER") return "bg-amber-400/10 border-amber-400/30";
  return "bg-danger/10 border-danger/30";
}

function ragIcon(s: RAGStatus) {
  if (s === "GREEN") return <CheckCircle className="h-5 w-5 text-success" />;
  if (s === "AMBER") return <AlertTriangle className="h-5 w-5 text-amber-400" />;
  return <XCircle className="h-5 w-5 text-danger" />;
}

function flagIcon(v: boolean) {
  return v
    ? <CheckCircle className="h-4 w-4 text-success" />
    : <XCircle className="h-4 w-4 text-danger" />;
}

export default function PitchDeckKPIsPage() {
  const { user, hydrate } = useAuth();
  const { hint } = useModelHints("pitchdeck-kpis");
  const [inputs, setInputs] = useState<PitchDeckInputs>(createEmptyInputs());
  const [results, setResults] = useState<PitchDeckResults | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "pitchdeck-kpis",
    onLoad: (data: Record<string, unknown>) => {
      if (data.inputs) setInputs(data.inputs as PitchDeckInputs);
    },
    getState: useCallback(() => ({ inputs }), [inputs]),
  });

  useEffect(() => { hydrate(); }, [hydrate]);

  const handleChange = (key: keyof PitchDeckInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    markDirty();
  };

  const handleCalculate = () => {
    const r = calculatePitchDeck(inputs);
    setResults(r);
    offerSmartResultsAfterCalculate("pitchdeck-kpis", inputs, r);
    persistState();
  };

  const handleReset = () => {
    setInputs(createEmptyInputs());
    setResults(null);
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user || !results) return;
    try {
      await api.post("/calculations", {
        modelSlug: "pitchdeck-kpis",
        inputs,
        outputs: results,
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

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <ModelBackLink modelSlug="pitchdeck-kpis" label="Back to Models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" />

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-pink-400/10">
            <Presentation className="h-7 w-7 text-pink-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Pitch Deck KPIs</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-blue-400/10 text-blue-400">
                Standalone
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              Investor-ready KPIs — Gross Margin, CAC, LTV, Runway, Burn Multiple with RAG &amp; mentoring tips.
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

      {/* Input Panel */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-8" data-inputs>
        <h2 className="font-semibold mb-5">Enter Your Numbers</h2>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 px-1">
                {fields.map((field) => (
                  <div key={field.key}>
                    <label className="flex items-center text-xs text-muted-foreground mb-1">{field.label}{hint(field.key) && <FieldHint hint={hint(field.key)!} />}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.prefix}</span>
                      <input
                        type="number"
                        data-field={field.key}
                        value={inputs[field.key] || ""}
                        onChange={(e) => handleChange(field.key, e.target.value)}
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
                            } else {
                              handleCalculate();
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
        <div className="flex gap-3 mt-4 pt-4 border-t border-border">
          <button
            onClick={handleCalculate}
            className="rounded-lg bg-primary px-8 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors"
          >
            Generate KPIs
          </button>
          <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { label: "Gross Margin", key: "grossMargin", value: results.grossMargin.toFixed(1) + "%", status: results.grossMarginStatus },
              { label: "Contribution Margin", key: "contributionMarginAfterCAC", value: results.contributionMarginAfterCAC.toFixed(1) + "%", status: results.contributionStatus },
              { label: "CAC", key: "cac", value: formatCurrency(results.cac), status: results.cacStatus },
              { label: "LTV", key: "ltv", value: formatCurrency(results.ltv), status: results.ltvStatus },
              { label: "LTV / CAC", key: "ltvCacRatio", value: results.ltvCacRatio.toFixed(2) + "x", status: results.ltvCacStatus },
              { label: "Recurring Rev %", key: "recurringRevenueRatio", value: results.recurringRevenueRatio.toFixed(1) + "%", status: results.recurringRatioStatus },
              { label: "Net Burn", key: "netBurn", value: formatCurrency(results.netBurn), status: results.burnStatus },
              { label: "Runway", key: "runwayMonths", value: results.runwayMonths === Infinity ? "∞" : results.runwayMonths.toFixed(1) + " mo", status: results.runwayStatus },
              { label: "Burn Multiple", key: "burnMultiple", value: results.burnMultiple.toFixed(2) + "x", status: results.burnStatus },
              { label: "Cash Efficiency", key: "cashEfficiencyRatio", value: results.cashEfficiencyRatio.toFixed(2) + "x", status: results.burnStatus },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1 flex items-center">
                  <HintLabel hint={hint(m.key)}>{m.label}</HintLabel>
                </p>
                <p className={`text-xl font-bold ${ragColor(m.status)}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Overall Insights */}
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
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
              results.insights.investorReadiness === "excellent" ? "bg-success/10 text-success" :
              results.insights.investorReadiness === "good" ? "bg-amber-400/10 text-amber-400" :
              results.insights.investorReadiness === "needs-work" ? "bg-orange-400/10 text-orange-400" :
              "bg-danger/10 text-danger"
            }`}>
              {results.insights.investorReadiness === "excellent" ? "✓ Investor Ready" :
               results.insights.investorReadiness === "good" ? "📊 Good Progress" :
               results.insights.investorReadiness === "needs-work" ? "⚠️ Needs Improvement" :
               "🚨 Not Investor Ready"}
            </span>
          </div>

          {/* Detailed Guidance */}
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <h3 className="font-semibold mb-4">Detailed Analysis & Recommendations</h3>
            <div className="space-y-3">
              {results.insights.guidance.map((item, idx) => (
                <div key={idx} className={`flex items-start gap-3 rounded-xl px-4 py-3 ${
                  item.startsWith("✓") ? "bg-success/5 border border-success/20" :
                  item.startsWith("🚨") ? "bg-danger/10 border border-danger/30" :
                  item.startsWith("⚠️") ? "bg-amber-400/5 border border-amber-400/20" :
                  item.startsWith("📊") ? "bg-blue-400/5 border border-blue-400/20" :
                  item.startsWith("💡") ? "bg-primary/5 border border-primary/20" :
                  "bg-muted/30 border border-border/50"
                }`}>
                  <span className="text-sm leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RAG Cards */}
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <h2 className="font-semibold mb-5">RAG Classification</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {([
                { label: "Gross Margin", status: results.grossMarginStatus, value: results.grossMargin.toFixed(1) + "%", tip: results.mentoringTips.grossMargin },
                { label: "Contribution Margin", status: results.contributionStatus, value: results.contributionMarginAfterCAC.toFixed(1) + "%", tip: results.mentoringTips.contribution },
                { label: "CAC", status: results.cacStatus, value: formatCurrency(results.cac), tip: results.mentoringTips.cac },
                { label: "LTV", status: results.ltvStatus, value: formatCurrency(results.ltv), tip: results.mentoringTips.ltv },
                { label: "LTV / CAC", status: results.ltvCacStatus, value: results.ltvCacRatio.toFixed(2) + "x", tip: results.mentoringTips.ltvCac },
                { label: "Runway", status: results.runwayStatus, value: results.runwayMonths === Infinity ? "∞" : results.runwayMonths.toFixed(1) + " mo", tip: results.mentoringTips.runway },
                { label: "Recurring Revenue", status: results.recurringRatioStatus, value: results.recurringRevenueRatio.toFixed(1) + "%", tip: results.mentoringTips.recurring },
                { label: "Net Burn", status: results.burnStatus, value: formatCurrency(results.netBurn), tip: results.mentoringTips.netBurn },
              ] as const).map((card) => (
                <div key={card.label} className={`rounded-xl border px-5 py-4 ${ragBg(card.status)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {ragIcon(card.status)}
                      <span className="font-semibold text-sm">{card.label}</span>
                    </div>
                    <span className={`text-sm font-bold ${ragColor(card.status)}`}>{card.status}</span>
                  </div>
                  <p className="text-lg font-bold mb-2">{card.value}</p>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-400" />
                    <span>{card.tip}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Flags */}
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <h2 className="font-semibold mb-5">Investor Summary Flags</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { label: "Unit Economics Positive", value: results.summary.isUnitEconomicsPositive },
                { label: "CAC Recoverable", value: results.summary.isCACRecoverable },
                { label: "Burn Controlled", value: results.summary.isBurnControlled },
                { label: "Scale Can Improve Margins", value: results.summary.canScaleImproveMargins },
              ]).map((flag) => (
                <div key={flag.label} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${flag.value ? "bg-success/5 border-success/20" : "bg-danger/5 border-danger/20"}`}>
                  {flagIcon(flag.value)}
                  <span className="text-sm font-medium">{flag.label}</span>
                  <span className={`ml-auto text-xs font-bold ${flag.value ? "text-success" : "text-danger"}`}>
                    {flag.value ? "YES" : "NO"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* KPI Radar */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Investor KPI Radar</h3>
              <ReactECharts
                style={{ height: 280 }}
                option={{
                  radar: {
                    indicator: [
                      { name: "Gross Margin", max: 80 },
                      { name: "LTV/CAC", max: 6 },
                      { name: "Runway (mo)", max: 24 },
                      { name: "Recurring Rev %", max: 100 },
                      { name: "Cash Efficiency", max: 3 },
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
                        Math.max(0, Math.min(80, results.grossMargin)),
                        Math.max(0, Math.min(6, results.ltvCacRatio)),
                        Math.max(0, Math.min(24, results.runwayMonths === Infinity ? 24 : results.runwayMonths)),
                        Math.max(0, Math.min(100, results.recurringRevenueRatio)),
                        Math.max(0, Math.min(3, results.cashEfficiencyRatio)),
                      ],
                      areaStyle: { color: "rgba(236,72,153,0.2)" },
                      lineStyle: { color: "#ec4899", width: 2 },
                      itemStyle: { color: "#ec4899" },
                    }],
                  }],
                }}
              />
            </div>

            {/* Key Metrics Horizontal Bar */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Key Metrics</h3>
              <ReactECharts
                style={{ height: 260 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  grid: { top: 10, right: 60, bottom: 25, left: 120 },
                  xAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10 }, splitLine: { lineStyle: { color: "#222" } } },
                  yAxis: { type: "category", data: ["Burn Multiple", "Cash Efficiency", "LTV/CAC", "Recurring Rev %", "Gross Margin %"], axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                  series: [{
                    type: "bar", barWidth: 16,
                    data: [
                      { value: Math.round(results.burnMultiple * 100) / 100, itemStyle: { color: "#f59e0b", borderRadius: [0, 4, 4, 0] } },
                      { value: Math.round(results.cashEfficiencyRatio * 100) / 100, itemStyle: { color: "#22d3ee", borderRadius: [0, 4, 4, 0] } },
                      { value: Math.round(results.ltvCacRatio * 100) / 100, itemStyle: { color: results.ltvCacRatio > 3 ? "#34d399" : "#ef4444", borderRadius: [0, 4, 4, 0] } },
                      { value: Math.round(results.recurringRevenueRatio * 10) / 10, itemStyle: { color: results.recurringRevenueRatio > 70 ? "#34d399" : "#f59e0b", borderRadius: [0, 4, 4, 0] } },
                      { value: Math.round(results.grossMargin * 10) / 10, itemStyle: { color: results.grossMargin > 40 ? "#34d399" : "#f59e0b", borderRadius: [0, 4, 4, 0] } },
                    ],
                    label: { show: true, position: "right", color: "#aaa", fontSize: 10 },
                  }],
                }}
              />
            </div>

            {/* Runway Gauge */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Runway Gauge</h3>
              <ReactECharts
                style={{ height: 220 }}
                option={{
                  series: [{
                    type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: 24,
                    pointer: { show: true, length: "60%", width: 4, itemStyle: { color: "#ec4899" } },
                    axisLine: { lineStyle: { width: 20, color: [[0.25, "#ef4444"], [0.5, "#f59e0b"], [1, "#34d399"]] } },
                    axisTick: { show: false },
                    splitLine: { show: false },
                    axisLabel: { color: "#888", fontSize: 9, distance: 25 },
                    detail: { valueAnimation: true, formatter: "{value} mo", color: "#e0e0e0", fontSize: 18, offsetCenter: [0, "70%"] },
                    data: [{ value: Math.min(24, results.runwayMonths === Infinity ? 24 : Math.round(results.runwayMonths * 10) / 10) }],
                  }],
                }}
              />
            </div>

            {/* Revenue vs Cost Donut */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Revenue vs Cost Split</h3>
              <ReactECharts
                style={{ height: 220 }}
                option={{
                  tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  series: [{
                    type: "pie", radius: ["40%", "68%"], center: ["50%", "50%"],
                    label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{d}%" },
                    data: [
                      { value: Math.abs(results.netBurn < 0 ? 0 : results.netBurn), name: "Net Burn", itemStyle: { color: "#ef4444" } },
                      { value: Math.abs(results.netBurn < 0 ? Math.abs(results.netBurn) : 0), name: "Net Positive", itemStyle: { color: "#34d399" } },
                    ].filter(d => d.value > 0),
                  }],
                }}
              />
            </div>
          </div>

          {/* Thresholds */}
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <h3 className="font-semibold text-sm mb-3">RAG Thresholds</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-semibold">Metric</th>
                    <th className="text-center py-2 px-3 text-success font-semibold">GREEN</th>
                    <th className="text-center py-2 px-3 text-amber-400 font-semibold">AMBER</th>
                    <th className="text-center py-2 px-3 text-danger font-semibold">RED</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/30">
                    <td className="py-2 px-3">Gross Margin</td>
                    <td className="text-center py-2 px-3">≥ 60%</td>
                    <td className="text-center py-2 px-3">40–60%</td>
                    <td className="text-center py-2 px-3">&lt; 40%</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-2 px-3">Contribution Margin</td>
                    <td className="text-center py-2 px-3">≥ 30%</td>
                    <td className="text-center py-2 px-3">15–30%</td>
                    <td className="text-center py-2 px-3">&lt; 15%</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-2 px-3">LTV / CAC</td>
                    <td className="text-center py-2 px-3">≥ 5x</td>
                    <td className="text-center py-2 px-3">3–5x</td>
                    <td className="text-center py-2 px-3">&lt; 3x</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-2 px-3">Runway</td>
                    <td className="text-center py-2 px-3">≥ 18 mo</td>
                    <td className="text-center py-2 px-3">9–18 mo</td>
                    <td className="text-center py-2 px-3">&lt; 9 mo</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-2 px-3">Recurring Rev %</td>
                    <td className="text-center py-2 px-3">≥ 60%</td>
                    <td className="text-center py-2 px-3">30–60%</td>
                    <td className="text-center py-2 px-3">&lt; 30%</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Net Burn</td>
                    <td className="text-center py-2 px-3">Self-funding / controlled</td>
                    <td className="text-center py-2 px-3">—</td>
                    <td className="text-center py-2 px-3">Excessive burn</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!results && (
        <div className="text-center py-20 text-muted-foreground">
          <p>Enter your numbers above and click Generate KPIs</p>
        </div>
      )}

      {!user && results && (
        <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <p className="text-muted-foreground mb-3">Sign up to save your Pitch Deck KPIs</p>
          <Link href="/signup" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
            Create Free Account
          </Link>
        </div>
      )}
    </div>
  );
}
