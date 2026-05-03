"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, TrendingUp, Save, RotateCcw,
  CheckCircle, XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import {
  calculateBreakEven,
  type BreakEvenInputs,
  type BreakEvenResults,
} from "@/lib/breakeven-model";

export default function BreakEvenPage() {
  const { user, hydrate } = useAuth();
  const [inputs, setInputs] = useState<BreakEvenInputs>({
    pricePerUnit: 0,
    variableCostPerUnit: 0,
    fixedCostMonthly: 0,
    unitsSoldForProjection: 0,
  });
  const [results, setResults] = useState<BreakEvenResults | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);

  const handleChange = (key: keyof BreakEvenInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    setSaved(false);
  };

  const handleCalculate = () => {
    if (inputs.pricePerUnit <= 0) return;
    setResults(calculateBreakEven(inputs));
  };

  const handleReset = () => {
    setInputs({ pricePerUnit: 0, variableCostPerUnit: 0, fixedCostMonthly: 0, unitsSoldForProjection: 0 });
    setResults(null);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!user || !results) return;
    setSaving(true);
    try {
      await api.post("/calculations", {
        modelSlug: "break-even-pro",
        inputs,
        outputs: {
          contributionPerUnit: results.contributionPerUnit,
          breakEvenUnits: results.breakEvenUnits,
          breakEvenRevenue: results.breakEvenRevenue,
          profitAtUnits: results.profitAtUnits,
          status: results.status,
        },
      });
      setSaved(true);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof BreakEvenInputs; label: string; prefix: string; placeholder: string }[] = [
    { key: "pricePerUnit", label: "Selling Price per Unit", prefix: "$", placeholder: "3000" },
    { key: "variableCostPerUnit", label: "Variable Cost per Unit", prefix: "$", placeholder: "2295" },
    { key: "fixedCostMonthly", label: "Fixed Cost (Monthly)", prefix: "$", placeholder: "87500" },
    { key: "unitsSoldForProjection", label: "Units Sold (for projection)", prefix: "#", placeholder: "200" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <Link href="/models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-green-400/10">
            <TrendingUp className="h-7 w-7 text-green-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Break-Even Model</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-blue-400/10 text-blue-400">
                Standalone
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              Contribution, break-even units &amp; revenue with full projection table.
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

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Input Panel */}
        <div className="rounded-2xl border border-border bg-card p-6" data-inputs>
          <h2 className="font-semibold mb-5">Parameters</h2>
          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm text-muted-foreground mb-1.5">{field.label}</label>
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
                    placeholder={field.placeholder}
                    className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button
              onClick={handleCalculate}
              disabled={inputs.pricePerUnit <= 0}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              Calculate Break-Even
            </button>
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results Panel */}
        {results ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Contribution / Unit</p>
                <p className="text-xl font-bold">{formatCurrency(results.contributionPerUnit)}</p>
              </div>
              <div className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Break-Even Units</p>
                <p className="text-xl font-bold">
                  {results.breakEvenUnits === Infinity ? "∞" : results.breakEvenUnits.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Break-Even Revenue</p>
                <p className="text-xl font-bold">
                  {results.breakEvenRevenue === Infinity ? "∞" : formatCurrency(results.breakEvenRevenue)}
                </p>
              </div>
              <div className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Revenue at {results.unitsSoldForProjection} units</p>
                <p className="text-xl font-bold">{formatCurrency(results.revenueAtUnits)}</p>
              </div>
              <div className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Cost at {results.unitsSoldForProjection} units</p>
                <p className="text-xl font-bold">{formatCurrency(results.totalCostAtUnits)}</p>
              </div>
              <div className={`rounded-xl border p-4 ${results.status === "GREEN" ? "bg-success/5 border-success/30" : "bg-danger/5 border-danger/30"}`}>
                <p className="text-xs text-muted-foreground mb-1">Profit at {results.unitsSoldForProjection} units</p>
                <div className="flex items-center gap-2">
                  {results.status === "GREEN"
                    ? <CheckCircle className="h-5 w-5 text-success" />
                    : <XCircle className="h-5 w-5 text-danger" />}
                  <p className={`text-xl font-bold ${results.status === "GREEN" ? "text-success" : "text-danger"}`}>
                    {formatCurrency(results.profitAtUnits)}
                  </p>
                </div>
              </div>
            </div>

            {/* Projection Table */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-background/50">
                <h2 className="font-semibold text-sm">Projection Table</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background/50">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Units</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Revenue</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Total Cost</th>
                      <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Profit / Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.projection.map((row) => {
                      const isBreakEven = row.units === results.breakEvenUnits;
                      const isProjection = row.units === results.unitsSoldForProjection && results.unitsSoldForProjection > 0;
                      return (
                        <tr
                          key={row.units}
                          className={`border-b border-border/30 ${
                            isBreakEven ? "bg-amber-400/5" : isProjection ? "bg-primary/5" : ""
                          }`}
                        >
                          <td className="px-4 py-2.5 font-medium">
                            {row.units.toLocaleString()}
                            {isBreakEven && <span className="ml-2 text-xs text-amber-400 font-semibold">BE</span>}
                            {isProjection && !isBreakEven && <span className="ml-2 text-xs text-primary font-semibold">PROJ</span>}
                          </td>
                          <td className="text-right px-4 py-2.5">{formatCurrency(row.revenue)}</td>
                          <td className="text-right px-4 py-2.5">{formatCurrency(row.totalCost)}</td>
                          <td className={`text-right px-4 py-2.5 font-semibold ${row.profit >= 0 ? "text-success" : "text-danger"}`}>
                            {formatCurrency(row.profit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card min-h-[300px]">
            <p className="text-muted-foreground text-sm">Enter parameters and click Calculate</p>
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
