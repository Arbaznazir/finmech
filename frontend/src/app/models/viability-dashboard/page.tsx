"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Activity, Save, RotateCcw,
  CheckCircle, AlertTriangle, XCircle, Lightbulb,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import {
  calculateViability,
  type ViabilityInputs,
  type ViabilityResults,
  type RAGStatus,
} from "@/lib/viability-model";

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

function ragDot(s: RAGStatus): string {
  if (s === "GREEN") return "bg-success";
  if (s === "AMBER") return "bg-amber-400";
  return "bg-danger";
}

function ragIcon(s: RAGStatus) {
  if (s === "GREEN") return <CheckCircle className="h-5 w-5 text-success" />;
  if (s === "AMBER") return <AlertTriangle className="h-5 w-5 text-amber-400" />;
  return <XCircle className="h-5 w-5 text-danger" />;
}

export default function ViabilityDashboardPage() {
  const { user, hydrate } = useAuth();
  const [inputs, setInputs] = useState<ViabilityInputs>({
    averagePricePerUnit: 0,
    variableCostPerUnit: 0,
    monthlyFixedCosts: 0,
    unitsSoldPerMonth: 0,
  });
  const [results, setResults] = useState<ViabilityResults | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);

  const handleChange = (key: keyof ViabilityInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    setSaved(false);
  };

  const handleCalculate = () => {
    if (inputs.averagePricePerUnit <= 0) return;
    setResults(calculateViability(inputs));
  };

  const handleReset = () => {
    setInputs({ averagePricePerUnit: 0, variableCostPerUnit: 0, monthlyFixedCosts: 0, unitsSoldPerMonth: 0 });
    setResults(null);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!user || !results) return;
    setSaving(true);
    try {
      await api.post("/calculations", {
        modelSlug: "viability-dashboard",
        inputs,
        outputs: {
          contributionPerUnit: results.contributionPerUnit,
          netProfitLoss: results.netProfitLoss,
          breakEvenUnits: results.breakEvenUnits,
          marginOfSafetyPct: results.marginOfSafetyPct,
          contributionStatus: results.contributionStatus,
          netProfitStatus: results.netProfitStatus,
        },
      });
      setSaved(true);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof ViabilityInputs; label: string; prefix: string; placeholder: string }[] = [
    { key: "averagePricePerUnit", label: "Average Price per Unit", prefix: "$", placeholder: "15000" },
    { key: "variableCostPerUnit", label: "Variable Cost per Unit", prefix: "$", placeholder: "14700" },
    { key: "monthlyFixedCosts", label: "Monthly Fixed Costs", prefix: "$", placeholder: "90000" },
    { key: "unitsSoldPerMonth", label: "Units Sold per Month", prefix: "#", placeholder: "290" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <Link href="/models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-violet-400/10">
            <Activity className="h-7 w-7 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Business Viability Dashboard</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-blue-400/10 text-blue-400">
                Standalone
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              Contribution, margins, break-even, margin of safety with RAG status &amp; mentoring tips.
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
        <h2 className="font-semibold mb-5">Parameters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            disabled={inputs.averagePricePerUnit <= 0}
            className="rounded-lg bg-primary px-8 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Analyze Viability
          </button>
          <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: "Contribution / Unit", value: formatCurrency(results.contributionPerUnit) },
              { label: "Contribution Margin", value: results.contributionMarginPct.toFixed(1) + "%" },
              { label: "Total Revenue", value: formatCurrency(results.totalRevenue) },
              { label: "Net Profit / Loss", value: formatCurrency(results.netProfitLoss), color: results.netProfitLoss >= 0 ? "text-success" : "text-danger" },
              { label: "Net Profit Margin", value: results.netProfitMarginPct.toFixed(1) + "%", color: results.netProfitMarginPct >= 0 ? "text-success" : "text-danger" },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                <p className={`text-xl font-bold ${m.color || ""}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Break-Even & Safety Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="text-xs text-muted-foreground mb-1">BE Utilisation</p>
              <p className={`text-xl font-bold ${results.breakEvenUtilisationPct > 100 ? "text-danger" : results.breakEvenUtilisationPct > 80 ? "text-amber-400" : "text-success"}`}>
                {results.breakEvenUtilisationPct.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs text-muted-foreground mb-1">Margin of Safety</p>
              <p className={`text-xl font-bold ${results.marginOfSafetyPct > 20 ? "text-success" : results.marginOfSafetyPct > 0 ? "text-amber-400" : "text-danger"}`}>
                {results.marginOfSafetyPct.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* RAG Status Cards */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-5">RAG Classification</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                { label: "Contribution Margin", status: results.contributionStatus, value: results.contributionMarginPct.toFixed(1) + "%", tip: results.mentoringTips.contribution },
                { label: "Net Profit Margin", status: results.netProfitStatus, value: results.netProfitMarginPct.toFixed(1) + "%", tip: results.mentoringTips.netProfit },
                { label: "Break-Even Utilisation", status: results.breakevenStatus, value: results.breakEvenUtilisationPct.toFixed(1) + "%", tip: results.mentoringTips.breakeven },
                { label: "Margin of Safety", status: results.marginSafetyStatus, value: results.marginOfSafetyPct.toFixed(1) + "%", tip: results.mentoringTips.marginSafety },
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

          {/* Classification Legend */}
          <div className="rounded-2xl border border-border bg-card p-6">
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
                    <td className="py-2 px-3">Contribution Margin</td>
                    <td className="text-center py-2 px-3">&gt; 20%</td>
                    <td className="text-center py-2 px-3">10–20%</td>
                    <td className="text-center py-2 px-3">&lt; 10%</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-2 px-3">Net Profit Margin</td>
                    <td className="text-center py-2 px-3">&gt; 0%</td>
                    <td className="text-center py-2 px-3">-10% to 0%</td>
                    <td className="text-center py-2 px-3">&lt; -10%</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-2 px-3">BE Utilisation</td>
                    <td className="text-center py-2 px-3">&lt; 80%</td>
                    <td className="text-center py-2 px-3">80–100%</td>
                    <td className="text-center py-2 px-3">&gt; 100%</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Margin of Safety</td>
                    <td className="text-center py-2 px-3">&gt; 20%</td>
                    <td className="text-center py-2 px-3">0–20%</td>
                    <td className="text-center py-2 px-3">&lt; 0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!results && (
        <div className="text-center py-20 text-muted-foreground">
          <p>Enter your 4 parameters above and click Analyze Viability</p>
        </div>
      )}

      {!user && results && (
        <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <p className="text-muted-foreground mb-3">Sign up to save your Viability Dashboard</p>
          <Link href="/signup" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
            Create Free Account
          </Link>
        </div>
      )}
    </div>
  );
}
