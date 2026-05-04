"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Save, RotateCcw, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { loadModelResults } from "@/lib/model-link";
import { useSavedModel } from "@/lib/use-saved-model";
import { type RevenueResults } from "@/lib/revenue-free-model";
import { type CostingResults } from "@/lib/costing-free-model";
import {
  BREAKEVEN_FREE_FIELDS,
  calculateBreakEvenFree,
  createEmptyBreakEvenInputs,
  type BreakEvenFreeInputs,
  type BreakEvenFreeResults,
} from "@/lib/breakeven-free-model";

export default function BreakEvenBasicPage() {
  const { user, hydrate } = useAuth();
  const [inputs, setInputs] = useState<BreakEvenFreeInputs>(createEmptyBreakEvenInputs());
  const [results, setResults] = useState<BreakEvenFreeResults | null>(null);
  const [linkedFields, setLinkedFields] = useState<Set<string>>(new Set());

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "break-even-basic",
    onLoad: (data: Record<string, unknown>) => {
      if (data.inputs) setInputs(data.inputs as BreakEvenFreeInputs);
    },
    getState: useCallback(() => ({ inputs }), [inputs]),
  });

  useEffect(() => {
    hydrate();
    const rev = loadModelResults<RevenueResults>("revenue-model");
    const cost = loadModelResults<CostingResults>("costing-model");
    const linked = new Set<string>();
    setInputs((prev) => {
      const next = { ...prev };
      if (rev && rev.pricePerUnit > 0) {
        next.pricePerUnit = rev.pricePerUnit;
        linked.add("pricePerUnit");
      }
      if (cost && cost.totalVariableCostPerUnit > 0) {
        next.variableCostPerUnit = cost.totalVariableCostPerUnit;
        linked.add("variableCostPerUnit");
      }
      if (cost && cost.totalFixedCosts > 0) {
        next.fixedCostMonthly = cost.totalFixedCosts;
        linked.add("fixedCostMonthly");
      }
      return next;
    });
    setLinkedFields(linked);
  }, [hydrate]);

  const handleChange = (key: keyof BreakEvenFreeInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    markDirty();
  };

  const handleCalculate = () => setResults(calculateBreakEvenFree(inputs));

  const handleReset = () => { setInputs(createEmptyBreakEvenInputs()); setResults(null); clearPersisted(); };

  const handleSave = async () => {
    if (!user || !results) return;
    try {
      await api.post("/calculations", { modelSlug: "break-even-basic", inputs, outputs: results });
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-emerald-400/10">
            <TrendingUp className="h-7 w-7 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Break-Even Calculator</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-green-400/10 text-green-400">Free</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Contribution margin, break-even units &amp; revenue, with optional projection.
              <span className="text-blue-400 ml-2 text-xs font-medium">← Revenue + Costing</span>
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
        <div className="rounded-2xl border border-border bg-card p-6" data-inputs>
          <h2 className="font-semibold mb-5">Break-Even Inputs</h2>
          <div className="space-y-4">
            {BREAKEVEN_FREE_FIELDS.map((field) => (
              <div key={field.key}>
                <div className="flex items-center gap-2 mb-1">
                  <label className="block text-xs text-muted-foreground">{field.label}</label>
                  {field.linked && (
                    <span className={`text-[10px] rounded px-1.5 py-0.5 ${linkedFields.has(field.key) ? "text-success bg-success/10" : "text-blue-400 bg-blue-400/10"}`}>
                      {linkedFields.has(field.key) ? "✓ Auto-filled" : "From Revenue / Costing"}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.prefix}</span>
                  <input
                    type="number"
                    step="0.01"
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
                    className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button onClick={handleCalculate} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
              Calculate Break-Even
            </button>
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        {results ? (
          <div className="space-y-4">
            {/* Big numbers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 text-center">
                <p className="text-xs text-muted-foreground mb-1">Break-Even Units</p>
                <p className="text-2xl font-bold text-primary">
                  {results.breakEvenUnits === 0 && inputs.pricePerUnit <= inputs.variableCostPerUnit ? "∞" : results.breakEvenUnits.toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl border-2 border-success/30 bg-success/5 p-5 text-center">
                <p className="text-xs text-muted-foreground mb-1">Break-Even Revenue</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(results.breakEvenRevenue)}</p>
              </div>
            </div>

            {/* Metrics */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">Key Metrics</h3>
              <div className="space-y-2">
                {([
                  { label: "Price Per Unit", value: formatCurrency(results.pricePerUnit) },
                  { label: "Variable Cost Per Unit", value: formatCurrency(results.variableCostPerUnit) },
                  { label: "Contribution Per Unit", value: formatCurrency(results.contributionPerUnit), bold: true },
                  { label: "Fixed Cost (Monthly)", value: formatCurrency(results.fixedCostMonthly) },
                ]).map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-lg px-3 py-2 bg-background/50 border border-border/50">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className={`text-sm ${row.bold ? "font-bold text-primary" : "font-semibold"}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Projection */}
            {inputs.unitsSoldForProjection > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-sm mb-3">Projection at {inputs.unitsSoldForProjection.toLocaleString()} units</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-background/50 border border-border/50">
                    <span className="text-xs text-muted-foreground">Revenue</span>
                    <span className="text-sm font-semibold">{formatCurrency(results.revenueAtUnits)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg px-3 py-2 bg-background/50 border border-border/50">
                    <span className="text-xs text-muted-foreground">Total Cost</span>
                    <span className="text-sm font-semibold">{formatCurrency(results.totalCostAtUnits)}</span>
                  </div>
                  <div className={`flex items-center justify-between rounded-lg px-3 py-2 border ${results.profitAtUnits >= 0 ? "bg-success/5 border-success/20" : "bg-danger/5 border-danger/20"}`}>
                    <span className="text-xs text-muted-foreground">Profit / Loss</span>
                    <span className={`text-sm font-bold ${results.profitAtUnits >= 0 ? "text-success" : "text-danger"}`}>
                      {formatCurrency(results.profitAtUnits)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card min-h-[300px]">
            <p className="text-muted-foreground text-sm">Enter inputs and click Calculate Break-Even</p>
          </div>
        )}
      </div>

      {!user && results && (
        <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <p className="text-muted-foreground mb-3">Sign up to save your Break-Even analysis</p>
          <Link href="/signup" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
            Create Free Account
          </Link>
        </div>
      )}
    </div>
  );
}
