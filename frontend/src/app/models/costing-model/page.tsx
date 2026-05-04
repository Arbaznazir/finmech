"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator, Save, RotateCcw, ArrowRight, ArrowLeftRight } from "lucide-react";
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { loadModelResults, saveModelResults, clearModelResults } from "@/lib/model-link";
import { useSavedModel } from "@/lib/use-saved-model";
import { type RevenueResults } from "@/lib/revenue-free-model";
import {
  FIXED_COST_FIELDS,
  VARIABLE_COST_FIELDS,
  calculateCosting,
  createEmptyCostingInputs,
  type CostingInputs,
  type CostingResults,
} from "@/lib/costing-free-model";

export default function CostingModelPage() {
  const { user, hydrate } = useAuth();
  const [inputs, setInputs] = useState<CostingInputs>(createEmptyCostingInputs());
  const [results, setResults] = useState<CostingResults | null>(null);
  const [revenueLinked, setRevenueLinked] = useState(false);

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "costing-model",
    onLoad: (data: Record<string, unknown>) => {
      if (data.inputs) setInputs(data.inputs as CostingInputs);
    },
    getState: useCallback(() => ({ inputs }), [inputs]),
  });

  useEffect(() => {
    hydrate();
    const rev = loadModelResults<RevenueResults>("revenue-model");
    if (rev && rev.monthlyUnitsSold > 0) {
      setInputs((prev) => ({ ...prev, unitsSold: rev.monthlyUnitsSold }));
      setRevenueLinked(true);
    }
  }, [hydrate]);

  const handleChange = (key: keyof CostingInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    markDirty();
  };

  const handleCalculate = () => {
    const r = calculateCosting(inputs);
    setResults(r);
    saveModelResults("costing-model", r);
  };

  const handleReset = () => { setInputs(createEmptyCostingInputs()); setResults(null); setRevenueLinked(false); clearModelResults("costing-model"); clearPersisted(); };

  const handleSave = async () => {
    if (!user || !results) return;
    try {
      await api.post("/calculations", { modelSlug: "costing-model", inputs, outputs: results });
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-400/10">
            <Calculator className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Costing Model</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-green-400/10 text-green-400">Free</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Fixed + variable cost breakdown.
              <span className="text-blue-400 ml-2 text-xs font-medium">← Revenue Model (units) | → Break-even (costs)</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Inputs */}
        <div className="space-y-6" data-inputs>
          {/* Units Sold */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-semibold text-sm">Units Sold (Monthly)</h2>
              <span className={`text-xs rounded px-2 py-0.5 ${revenueLinked ? "text-success bg-success/10" : "text-blue-400 bg-blue-400/10"}`}>
                {revenueLinked ? "✓ Auto-filled from Revenue Model" : "Can come from Revenue Model"}
              </span>
            </div>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">#</span>
              <input
                type="number"
                data-field="unitsSold"
                value={inputs.unitsSold || ""}
                onChange={(e) => handleChange("unitsSold", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const all = Array.from((e.currentTarget.closest("[data-inputs]") || document).querySelectorAll<HTMLInputElement>("input[data-field]"));
                    const idx = all.indexOf(e.currentTarget);
                    if (idx >= 0 && idx < all.length - 1) all[idx + 1].focus();
                  }
                }}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Fixed Costs */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold text-sm mb-4">Fixed Costs (Monthly)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FIXED_COST_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs text-muted-foreground mb-1">{field.label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                    <input
                      type="number"
                      data-field={field.key}
                      value={inputs[field.key] || ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const all = Array.from((e.currentTarget.closest("[data-inputs]") || document).querySelectorAll<HTMLInputElement>("input[data-field]"));
                          const idx = all.indexOf(e.currentTarget);
                          if (idx >= 0 && idx < all.length - 1) all[idx + 1].focus();
                        }
                      }}
                      placeholder="0"
                      className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Variable Costs */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold text-sm mb-4">Variable Costs (Per Unit)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VARIABLE_COST_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs text-muted-foreground mb-1">{field.label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                    <input
                      type="number"
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
          </div>

          <div className="flex gap-3">
            <button onClick={handleCalculate} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
              Calculate Costs
            </button>
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        {results ? (
          <div className="space-y-4 h-fit sticky top-8">
            <div className="rounded-2xl border-2 border-danger/30 bg-danger/5 p-5 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Monthly Cost</p>
              <p className="text-2xl font-bold text-danger">{formatCurrency(results.totalMonthlyCost)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-background/50 border border-border/50 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Fixed Costs</p>
                <p className="text-lg font-bold">{formatCurrency(results.totalFixedCosts)}</p>
              </div>
              <div className="rounded-xl bg-background/50 border border-border/50 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Variable Cost</p>
                <p className="text-lg font-bold">{formatCurrency(results.totalVariableCost)}</p>
              </div>
              <div className="rounded-xl bg-background/50 border border-border/50 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Variable Cost / Unit</p>
                <p className="text-lg font-bold">{formatCurrency(results.totalVariableCostPerUnit)}</p>
              </div>
              <div className="rounded-xl bg-background/50 border border-border/50 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Units Sold</p>
                <p className="text-lg font-bold">{results.unitsSold.toLocaleString()}</p>
              </div>
            </div>

            <div className="rounded-xl bg-blue-400/5 border border-blue-400/20 p-4">
              <p className="text-xs text-blue-400 font-medium mb-2 flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" /> Data flows to Break-even
              </p>
              <p className="text-xs text-muted-foreground">
                <code className="bg-background/80 px-1 rounded">variableCostPerUnit = {formatCurrency(results.totalVariableCostPerUnit)}</code><br />
                <code className="bg-background/80 px-1 rounded">fixedCostMonthly = {formatCurrency(results.totalFixedCosts)}</code>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card min-h-[300px]">
            <p className="text-muted-foreground text-sm">Enter costs and click Calculate</p>
          </div>
        )}
      </div>

      {!user && results && (
        <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <p className="text-muted-foreground mb-3">Sign up to save your Costing Model</p>
          <Link href="/signup" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
            Create Free Account
          </Link>
        </div>
      )}
    </div>
  );
}
