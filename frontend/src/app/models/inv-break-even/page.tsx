"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Save, RotateCcw } from "lucide-react";
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { loadModelResults, saveModelResults, clearModelResults } from "@/lib/model-link";
import { useSavedModel } from "@/lib/use-saved-model";
import {
  calculateBreakEven,
  type BreakEvenInputs,
  type BreakEvenResults,
} from "@/lib/breakeven-model";

export default function InvBreakEvenPage() {
  const { user, hydrate } = useAuth();
  const [inputs, setInputs] = useState<BreakEvenInputs>({
    pricePerUnit: 0, variableCostPerUnit: 0, fixedCostMonthly: 0, unitsSoldForProjection: 0,
  });
  const [results, setResults] = useState<BreakEvenResults | null>(null);
  const [linkedFields, setLinkedFields] = useState<Set<string>>(new Set());

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "inv-break-even",
    onLoad: (data: Record<string, unknown>) => {
      if (data.inputs) setInputs(data.inputs as BreakEvenInputs);
    },
    getState: useCallback(() => ({ inputs }), [inputs]),
  });

  useEffect(() => {
    hydrate();
    const hub = loadModelResults<Record<string, number>>("inv-common-utility");
    if (hub) {
      const linked = new Set<string>();
      setInputs((prev) => {
        const next = { ...prev };
        if (hub.totalFixedCosts > 0) { next.fixedCostMonthly = hub.totalFixedCosts; linked.add("fixedCostMonthly"); }
        return next;
      });
      setLinkedFields(linked);
    }
  }, [hydrate]);

  const handleCalculate = () => {
    const r = calculateBreakEven(inputs);
    setResults(r);
    saveModelResults("inv-break-even", {
      breakEvenUnits: r.breakEvenUnits,
      breakEvenRevenue: r.breakEvenRevenue,
      contributionPerUnit: r.contributionPerUnit,
      fixedCostMonthly: r.fixedCostMonthly,
    });
  };

  const handleReset = () => {
    setInputs({ pricePerUnit: 0, variableCostPerUnit: 0, fixedCostMonthly: 0, unitsSoldForProjection: 0 });
    setResults(null); setLinkedFields(new Set());
    clearModelResults("inv-break-even");
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user || !results) return;
    try {
      await api.post("/calculations", { modelSlug: "inv-break-even", inputs, outputs: results });
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  const fields: { key: keyof BreakEvenInputs; label: string; prefix: string; linked?: boolean }[] = [
    { key: "pricePerUnit", label: "Price Per Unit", prefix: "$" },
    { key: "variableCostPerUnit", label: "Variable Cost Per Unit", prefix: "$" },
    { key: "fixedCostMonthly", label: "Fixed Cost (Monthly)", prefix: "$", linked: linkedFields.has("fixedCostMonthly") },
    { key: "unitsSoldForProjection", label: "Units Sold (for projection)", prefix: "#" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-400/10">
            <TrendingUp className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Break-even Model</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-amber-400/10 text-amber-400">Investor Grade</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Linked with Common Utility for integrated analysis.
              <span className="text-amber-400 ml-2 text-xs font-medium">&larr; Common Utility</span>
            </p>
          </div>
        </div>
        {results && user && (
          <button onClick={handleSave} disabled={saving || saved}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${saved ? "bg-success/10 text-success" : "bg-amber-400/10 text-amber-400 hover:bg-amber-400/20"}`}>
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : saving ? "Saving..." : "Save Results"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-5">Break-Even Inputs</h2>
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.key}>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-xs text-muted-foreground">{field.label}</label>
                  {field.linked && linkedFields.has(field.key) && (
                    <span className="text-[10px] rounded px-1.5 py-0.5 bg-success/10 text-success font-medium">
                      Auto-filled
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.prefix}</span>
                  <input type="number" value={inputs[field.key] || ""}
                    onChange={(e) => {
                      setInputs((prev) => ({ ...prev, [field.key]: parseFloat(e.target.value) || 0 }));
                      markDirty();
                    }}
                    disabled={linkedFields.has(field.key)}
                    placeholder="0"
                    className={`w-full rounded-lg border pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${linkedFields.has(field.key) ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60 border-border" : "bg-input border-border"}`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleCalculate} className="flex-1 rounded-lg bg-amber-400 text-black py-2.5 text-sm font-semibold hover:bg-amber-300 transition-colors">
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
            <div className="rounded-2xl border-2 border-amber-400/30 bg-amber-400/5 p-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">Break-Even Point</p>
              <p className="text-3xl font-bold text-amber-400">{results.breakEvenUnits === Infinity ? "N/A" : `${results.breakEvenUnits.toLocaleString()} units`}</p>
              <p className="text-sm text-muted-foreground mt-1">{results.breakEvenRevenue === Infinity ? "" : formatCurrency(results.breakEvenRevenue) + " revenue"}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">Results</h3>
              <div className="space-y-2 text-xs">
                {([
                  { label: "Contribution/Unit", value: formatCurrency(results.contributionPerUnit) },
                  { label: "CM Ratio", value: results.pricePerUnit > 0 ? `${((results.contributionPerUnit / results.pricePerUnit) * 100).toFixed(1)}%` : "N/A" },
                  { label: "Break-Even Units", value: results.breakEvenUnits === Infinity ? "N/A" : results.breakEvenUnits.toLocaleString() },
                  { label: "Break-Even Revenue", value: results.breakEvenRevenue === Infinity ? "N/A" : formatCurrency(results.breakEvenRevenue) },
                  { label: "Fixed Costs (Monthly)", value: formatCurrency(results.fixedCostMonthly) },
                ]).map((row) => (
                  <div key={row.label} className="flex justify-between rounded-lg px-3 py-2 bg-background/50 border border-border/50">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {results.projection && results.projection.length > 0 && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-background/50"><h3 className="font-semibold text-sm">Projection Table</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border bg-background/50">
                      <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Units</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Revenue</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Total Cost</th>
                      <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Profit</th>
                    </tr></thead>
                    <tbody>
                      {results.projection.map((row: { units: number; revenue: number; totalCost: number; profit: number }, i: number) => (
                        <tr key={i} className={`border-b border-border/30 ${row.profit >= 0 ? "" : "text-danger/70"}`}>
                          <td className="px-3 py-2">{row.units.toLocaleString()}</td>
                          <td className="text-right px-3 py-2">{formatCurrency(row.revenue)}</td>
                          <td className="text-right px-3 py-2">{formatCurrency(row.totalCost)}</td>
                          <td className={`text-right px-3 py-2 font-semibold ${row.profit >= 0 ? "text-success" : "text-danger"}`}>{formatCurrency(row.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card min-h-[300px]">
            <p className="text-muted-foreground text-sm">Enter inputs and click Calculate</p>
          </div>
        )}
      </div>
    </div>
  );
}
