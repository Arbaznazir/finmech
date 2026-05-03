"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Save, RotateCcw, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { loadModelResults, saveModelResults, clearModelResults } from "@/lib/model-link";
import {
  calculateBreakEven,
  type BreakEvenInputs,
  type BreakEvenResults,
} from "@/lib/breakeven-model";

export default function StdBreakEvenPage() {
  const { user, hydrate } = useAuth();
  const [inputs, setInputs] = useState<BreakEvenInputs>({
    pricePerUnit: 0, variableCostPerUnit: 0, fixedCostMonthly: 0, unitsSoldForProjection: 0,
  });
  const [results, setResults] = useState<BreakEvenResults | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [linkedFields, setLinkedFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    hydrate();
    const hub = loadModelResults<Record<string, number>>("std-common-utility");
    const linked = new Set<string>();
    if (hub) {
      setInputs((prev) => {
        const next = { ...prev };
        if (hub.totalFixedCosts > 0) { next.fixedCostMonthly = hub.totalFixedCosts; linked.add("fixedCostMonthly"); }
        return next;
      });
    }
    setLinkedFields(linked);
  }, [hydrate]);

  const handleChange = (key: keyof BreakEvenInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    setSaved(false);
  };

  const handleCalculate = () => {
    const r = calculateBreakEven(inputs);
    setResults(r);
    saveModelResults("std-break-even", {
      breakEvenUnits: r.breakEvenUnits,
      breakEvenRevenue: r.breakEvenRevenue,
      contributionPerUnit: r.contributionPerUnit,
      fixedCostMonthly: r.fixedCostMonthly,
    });
  };

  const handleReset = () => {
    setInputs({ pricePerUnit: 0, variableCostPerUnit: 0, fixedCostMonthly: 0, unitsSoldForProjection: 0 });
    setResults(null); setSaved(false); setLinkedFields(new Set());
    clearModelResults("std-break-even");
  };

  const handleSave = async () => {
    if (!user || !results) return;
    setSaving(true);
    try {
      await api.post("/calculations", { modelSlug: "std-break-even", inputs, outputs: results });
      setSaved(true);
    } catch (err) { console.error("Failed to save:", err); }
    finally { setSaving(false); }
  };

  const fields: { key: keyof BreakEvenInputs; label: string; prefix: string; linked?: boolean }[] = [
    { key: "pricePerUnit", label: "Price Per Unit", prefix: "$" },
    { key: "variableCostPerUnit", label: "Variable Cost Per Unit", prefix: "$" },
    { key: "fixedCostMonthly", label: "Fixed Cost (Monthly)", prefix: "$", linked: true },
    { key: "unitsSoldForProjection", label: "Units Sold (for projection)", prefix: "#" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10">
            <TrendingUp className="h-7 w-7 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Break-even Model</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-primary/10 text-primary">Standard</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Linked with Common Utility for integrated analysis.
              <span className="text-blue-400 ml-2 text-xs font-medium">&larr; Common Utility</span>
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
        <div className="rounded-2xl border border-border bg-card p-6" data-inputs>
          <h2 className="font-semibold mb-5">Break-Even Inputs</h2>
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.key}>
                <div className="flex items-center gap-2 mb-1">
                  <label className="block text-xs text-muted-foreground">{field.label}</label>
                  {field.linked && (
                    <span className={`text-[10px] rounded px-1.5 py-0.5 ${linkedFields.has(field.key) ? "text-success bg-success/10" : "text-blue-400 bg-blue-400/10"}`}>
                      {linkedFields.has(field.key) ? "Auto-filled from Common Utility" : "From Common Utility"}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.prefix}</span>
                  <input type="number" step="0.01" data-field={field.key}
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

        {results ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 text-center">
                <p className="text-xs text-muted-foreground mb-1">Break-Even Units</p>
                <p className="text-2xl font-bold text-primary">{results.breakEvenUnits.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border-2 border-success/30 bg-success/5 p-5 text-center">
                <p className="text-xs text-muted-foreground mb-1">Break-Even Revenue</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(results.breakEvenRevenue)}</p>
              </div>
            </div>
            <div className={`rounded-2xl p-4 text-center border-2 ${results.isProfitable ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"}`}>
              {results.isProfitable
                ? <><CheckCircle className="h-6 w-6 text-success mx-auto mb-1" /><p className="text-sm font-bold text-success">PROFITABLE at {inputs.unitsSoldForProjection.toLocaleString()} units</p></>
                : <><XCircle className="h-6 w-6 text-danger mx-auto mb-1" /><p className="text-sm font-bold text-danger">NOT YET PROFITABLE</p></>
              }
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">Key Metrics</h3>
              <div className="space-y-2">
                {([
                  { label: "Contribution / Unit", value: formatCurrency(results.contributionPerUnit) },
                  { label: "Revenue at Projection", value: formatCurrency(results.revenueAtUnits) },
                  { label: "Total Cost at Projection", value: formatCurrency(results.totalCostAtUnits) },
                  { label: "Profit / Loss", value: formatCurrency(results.profitAtUnits) },
                ]).map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-lg px-3 py-2 bg-background/50 border border-border/50">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className="text-sm font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
            {results.projection.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-sm mb-3">Projection Table</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 pr-3">Units</th>
                      <th className="text-right py-2 px-3">Revenue</th>
                      <th className="text-right py-2 px-3">Total Cost</th>
                      <th className="text-right py-2 pl-3">Profit</th>
                    </tr></thead>
                    <tbody>
                      {results.projection.map((row) => (
                        <tr key={row.units} className={`border-b border-border/50 ${row.units === results.breakEvenUnits ? "bg-primary/5 font-bold" : ""}`}>
                          <td className="py-1.5 pr-3">{row.units.toLocaleString()}</td>
                          <td className="text-right py-1.5 px-3">{formatCurrency(row.revenue)}</td>
                          <td className="text-right py-1.5 px-3">{formatCurrency(row.totalCost)}</td>
                          <td className={`text-right py-1.5 pl-3 ${row.profit >= 0 ? "text-success" : "text-danger"}`}>{formatCurrency(row.profit)}</td>
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
