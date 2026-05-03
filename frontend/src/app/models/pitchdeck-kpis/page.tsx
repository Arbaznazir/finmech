"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Presentation, Save, RotateCcw,
  CheckCircle, AlertTriangle, XCircle, Lightbulb,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
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
  const [inputs, setInputs] = useState<PitchDeckInputs>(createEmptyInputs());
  const [results, setResults] = useState<PitchDeckResults | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => { hydrate(); }, [hydrate]);

  const handleChange = (key: keyof PitchDeckInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    setSaved(false);
  };

  const handleCalculate = () => {
    setResults(calculatePitchDeck(inputs));
  };

  const handleReset = () => {
    setInputs(createEmptyInputs());
    setResults(null);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!user || !results) return;
    setSaving(true);
    try {
      await api.post("/calculations", {
        modelSlug: "pitchdeck-kpis",
        inputs,
        outputs: {
          grossMargin: results.grossMargin,
          cac: results.cac,
          ltv: results.ltv,
          ltvCacRatio: results.ltvCacRatio,
          runwayMonths: results.runwayMonths,
          netBurn: results.netBurn,
        },
      });
      setSaved(true);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
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
      <Link href="/models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

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
                    <label className="block text-xs text-muted-foreground mb-1">{field.label}</label>
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
              { label: "Gross Margin", value: results.grossMargin.toFixed(1) + "%", color: results.grossMargin > 40 ? "text-success" : results.grossMargin > 20 ? "text-amber-400" : "text-danger" },
              { label: "Contribution Margin", value: results.contributionMarginAfterCAC.toFixed(1) + "%" },
              { label: "CAC", value: formatCurrency(results.cac) },
              { label: "LTV", value: formatCurrency(results.ltv) },
              { label: "LTV / CAC", value: results.ltvCacRatio.toFixed(2) + "x", color: results.ltvCacRatio > 3 ? "text-success" : results.ltvCacRatio > 1 ? "text-amber-400" : "text-danger" },
              { label: "Recurring Rev %", value: results.recurringRevenueRatio.toFixed(1) + "%" },
              { label: "Net Burn", value: formatCurrency(results.netBurn), color: results.netBurn < 0 ? "text-success" : "text-danger" },
              { label: "Runway", value: results.runwayMonths === Infinity ? "∞" : results.runwayMonths.toFixed(1) + " mo", color: results.runwayMonths === Infinity || results.runwayMonths > 12 ? "text-success" : results.runwayMonths > 6 ? "text-amber-400" : "text-danger" },
              { label: "Burn Multiple", value: results.burnMultiple.toFixed(2) + "x" },
              { label: "Cash Efficiency", value: results.cashEfficiencyRatio.toFixed(2) + "x" },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                <p className={`text-xl font-bold ${m.color || ""}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* RAG Cards */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-5">RAG Classification</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {([
                { label: "Gross Margin", status: results.grossMarginStatus, value: results.grossMargin.toFixed(1) + "%", tip: results.mentoringTips.grossMargin },
                { label: "LTV / CAC", status: results.ltvCacStatus, value: results.ltvCacRatio.toFixed(2) + "x", tip: results.mentoringTips.ltvCac },
                { label: "Runway", status: results.runwayStatus, value: results.runwayMonths === Infinity ? "∞" : results.runwayMonths.toFixed(1) + " mo", tip: results.mentoringTips.runway },
                { label: "Recurring Revenue", status: results.recurringRatioStatus, value: results.recurringRevenueRatio.toFixed(1) + "%", tip: results.mentoringTips.recurring },
                { label: "Net Burn", status: results.burnStatus, value: formatCurrency(results.netBurn), tip: results.netBurn < 0 ? "Revenue exceeds costs. Positive cash flow." : "Burning cash. Control spend." },
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
          <div className="rounded-2xl border border-border bg-card p-6">
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

          {/* Thresholds */}
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
                    <td className="py-2 px-3">Gross Margin</td>
                    <td className="text-center py-2 px-3">&gt; 40%</td>
                    <td className="text-center py-2 px-3">20–40%</td>
                    <td className="text-center py-2 px-3">&lt; 20%</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-2 px-3">LTV / CAC</td>
                    <td className="text-center py-2 px-3">&gt; 3x</td>
                    <td className="text-center py-2 px-3">1–3x</td>
                    <td className="text-center py-2 px-3">&lt; 1x</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-2 px-3">Runway</td>
                    <td className="text-center py-2 px-3">&gt; 12 mo</td>
                    <td className="text-center py-2 px-3">6–12 mo</td>
                    <td className="text-center py-2 px-3">&lt; 6 mo</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-2 px-3">Recurring Rev %</td>
                    <td className="text-center py-2 px-3">&gt; 70%</td>
                    <td className="text-center py-2 px-3">40–70%</td>
                    <td className="text-center py-2 px-3">&lt; 40%</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Net Burn</td>
                    <td className="text-center py-2 px-3">Negative (profit)</td>
                    <td className="text-center py-2 px-3">—</td>
                    <td className="text-center py-2 px-3">Positive (burning)</td>
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
