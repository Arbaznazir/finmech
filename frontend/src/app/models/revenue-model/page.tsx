"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link"
import { ModelBackLink } from "@/components/model-back-link";
import { ArrowLeft, DollarSign, Save, RotateCcw, ArrowRight } from "lucide-react";
import { FieldHint } from "@/components/FieldHint";
import { HintLabel } from "@/components/HintLabel";
import { useModelHints } from "@/hooks/use-model-hints";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import {formatCurrency, formatChartCurrency} from "@/lib/utils";
import api from "@/lib/api";
import { clearModelResults } from "@/lib/model-link";
import { useSavedModel } from "@/lib/use-saved-model";
import { offerSmartResultsAfterCalculate } from "@/lib/smart-results";
import {
  REVENUE_FIELDS,
  calculateRevenue,
  createEmptyRevenueInputs,
  type RevenueInputs,
  type RevenueResults,
} from "@/lib/revenue-free-model";

export default function RevenueModelPage() {
  const { user, hydrate } = useAuth();
  const { hint } = useModelHints("revenue-model");
  const [inputs, setInputs] = useState<RevenueInputs>(createEmptyRevenueInputs());
  const [results, setResults] = useState<RevenueResults | null>(null);
  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "revenue-model",
    onLoad: (data: Record<string, unknown>) => {
      if (data.inputs) setInputs(data.inputs as RevenueInputs);
    },
    getState: useCallback(() => ({ inputs }), [inputs]),
  });

  useEffect(() => { hydrate(); }, [hydrate]);

  const handleChange = (key: keyof RevenueInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    markDirty();
  };

  const handleCalculate = () => {
    const r = calculateRevenue(inputs);
    setResults(r);
    offerSmartResultsAfterCalculate("revenue-model", inputs, r);
    persistState();
  };

  const handleReset = () => { setInputs(createEmptyRevenueInputs()); setResults(null); clearModelResults("revenue-model"); clearPersisted(); };

  const handleSave = async () => {
    if (!user || !results) return;
    try {
      await api.post("/calculations", { modelSlug: "revenue-model", inputs, outputs: results });
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <ModelBackLink modelSlug="revenue-model" label="Back to Models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" />

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-green-400/10">
            <DollarSign className="h-7 w-7 text-green-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Revenue Model</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-green-400/10 text-green-400">Free</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Calculate monthly &amp; annual revenue from customers, units, and pricing.
            </p>
          </div>
        </div>
        {results && user && (
          <button onClick={handleSave} disabled={saving || saved}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${saved ? "bg-success/10 text-success" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : saving ? "Saving..." : "Save Results"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="rounded-2xl border border-border bg-card p-6 output-panel" data-inputs>
          <h2 className="font-semibold mb-5">Revenue Assumptions</h2>
          <div className="space-y-4">
            {REVENUE_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="flex items-center text-xs text-muted-foreground mb-1">{field.label}{hint(field.key) && <FieldHint hint={hint(field.key)!} />}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.prefix}</span>
                  <input
                    type="number"
                    step={field.step}
                    data-field={field.key}
                    value={inputs[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
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
                    className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button onClick={handleCalculate} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
              Calculate Revenue
            </button>
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        {results ? (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 text-center output-panel-primary">
              <p className="text-sm text-muted-foreground mb-2 flex items-center justify-center">
                <HintLabel hint={hint("monthlyRevenue")}>Monthly Revenue</HintLabel>
              </p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(results.monthlyRevenue)}</p>
            </div>
            <div className="rounded-2xl border-2 border-success/30 bg-success/5 p-6 text-center output-panel-success">
              <p className="text-sm text-muted-foreground mb-2 flex items-center justify-center">
                <HintLabel hint={hint("annualRevenue")}>Annual Revenue</HintLabel>
              </p>
              <p className="text-3xl font-bold text-success">{formatCurrency(results.annualRevenue)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { label: "Monthly Units Sold", key: "monthlyUnitsSold", value: results.monthlyUnitsSold.toLocaleString() },
                { label: "Price Per Unit", key: "pricePerUnit", value: formatCurrency(results.pricePerUnit) },
                { label: "Monthly Purchase Rate", key: "monthlyPurchaseRate", value: results.monthlyPurchaseRate.toLocaleString(undefined, { maximumFractionDigits: 6 }) },
                { label: "Customer Lifetime", key: "customerLifetimeMonths", value: results.customerLifetimeMonths + " months" },
              ]).map((m) => (
                <div key={m.label} className="rounded-xl bg-muted border border-border p-3 output-panel text-center">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center">
                    <HintLabel hint={hint(m.key)}>{m.label}</HintLabel>
                  </p>
                  <p className="text-lg font-bold">{m.value}</p>
                </div>
              ))}
            </div>

            {/* Revenue Projection Bar Chart */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">12-Month Revenue Projection</h3>
              <ReactECharts
                style={{ height: 260 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  grid: { top: 30, right: 15, bottom: 30, left: 55 },
                  xAxis: { type: "category", data: ["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12"], axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                  yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => formatChartCurrency(v) }, splitLine: { lineStyle: { color: "#222" } } },
                  series: [
                    { name: "Revenue", type: "bar", data: Array(12).fill(results.monthlyRevenue), itemStyle: { color: "#a78bfa", borderRadius: [4, 4, 0, 0] } },
                    { name: "Cumulative", type: "line", data: Array.from({ length: 12 }, (_, i) => results.monthlyRevenue * (i + 1)), smooth: true, lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" }, symbol: "circle", symbolSize: 5 },
                  ],
                }}
              />
            </div>

            {/* Revenue Composition Donut */}
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Revenue Composition</h3>
              <ReactECharts
                style={{ height: 220 }}
                option={{
                  tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  series: [{
                    type: "pie", radius: ["45%", "72%"], center: ["50%", "50%"],
                    label: { color: "#ccc", fontSize: 10 },
                    data: [
                      { value: results.monthlyRevenue, name: "Monthly Revenue", itemStyle: { color: "#a78bfa" } },
                      { value: results.annualRevenue - results.monthlyRevenue, name: "Remaining Annual", itemStyle: { color: "#34d399" } },
                    ],
                  }],
                }}
              />
            </div>

          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card min-h-[300px]">
            <p className="text-muted-foreground text-sm">Enter assumptions and click Calculate Revenue</p>
          </div>
        )}
      </div>

      {!user && results && (
        <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <p className="text-muted-foreground mb-3">Sign up to save your Revenue Model</p>
          <Link href="/signup" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
            Create Free Account
          </Link>
        </div>
      )}
    </div>
  );
}
