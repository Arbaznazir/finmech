"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Gem, Save, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { loadModelResults, saveModelResults, clearModelResults } from "@/lib/model-link";
import {
  INPUT_FIELDS,
  calculateDCF,
  createDefaultInputs,
  type DCFInputs,
  type DCFResults,
} from "@/lib/dcf-model";

export default function InvDCFValuationPage() {
  const { user, hydrate } = useAuth();
  const [inputs, setInputs] = useState<DCFInputs>(createDefaultInputs());
  const [results, setResults] = useState<DCFResults | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [hubLinked, setHubLinked] = useState(false);

  useEffect(() => {
    hydrate();
    const hub = loadModelResults<Record<string, number>>("inv-common-utility");
    if (hub) {
      setInputs((prev) => {
        const next = { ...prev };
        if (hub.annualRevenue > 0) { next.baseYearRevenue = hub.annualRevenue; setHubLinked(true); }
        if (hub.ebitdaMargin > 0) next.ebitdaMargin = hub.ebitdaMargin;
        return next;
      });
    }
  }, [hydrate]);

  const handleChange = (key: keyof DCFInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    setSaved(false);
  };

  const handleCalculate = () => {
    const r = calculateDCF(inputs);
    setResults(r);
    saveModelResults("inv-dcf-valuation", {
      enterpriseValue: r.enterpriseValue,
      equityValue: r.equityValue,
      wacc: r.wacc,
    });
  };

  const handleReset = () => {
    setInputs(createDefaultInputs()); setResults(null); setSaved(false); setHubLinked(false);
    clearModelResults("inv-dcf-valuation");
  };

  const handleSave = async () => {
    if (!user || !results) return;
    setSaving(true);
    try {
      await api.post("/calculations", { modelSlug: "inv-dcf-valuation", inputs, outputs: { enterpriseValue: results.enterpriseValue, equityValue: results.equityValue, wacc: results.wacc } });
      setSaved(true);
    } catch (err) { console.error("Failed to save:", err); }
    finally { setSaving(false); }
  };

  const toggleCategory = (cat: string) => setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  const categories = [...new Set(INPUT_FIELDS.map((f) => f.category))];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-400/10">
            <Gem className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">DCF Valuation Model</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-amber-400/10 text-amber-400">Investor Grade</span>
            </div>
            <p className="text-muted-foreground mt-1">
              WACC + 5-year projection + Terminal Value + Enterprise/Equity valuation.
              <span className="text-amber-400 ml-2 text-xs font-medium">&larr; Common Utility</span>
            </p>
          </div>
        </div>
        {results && user && (
          <button onClick={handleSave} disabled={saving || saved}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${saved ? "bg-success/10 text-success" : "bg-amber-400/10 text-amber-400 hover:bg-amber-400/20"}`}>
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>

      {hubLinked && (
        <div className="rounded-xl bg-success/5 border border-success/20 p-3 mb-6">
          <p className="text-xs text-success font-medium">Auto-filled from Common Utility — Base Year Revenue &amp; EBITDA Margin loaded.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Inputs */}
        <div className="space-y-4">
          {categories.map((cat) => {
            const collapsed = collapsedCategories[cat];
            return (
              <div key={cat} className="rounded-2xl border border-border bg-card overflow-hidden">
                <button onClick={() => toggleCategory(cat)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors">
                  <h3 className="font-semibold text-sm">{cat}</h3>
                  {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
                </button>
                {!collapsed && (
                  <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {INPUT_FIELDS.filter((f) => f.category === cat).map((field) => (
                      <div key={field.key}>
                        <label className="block text-xs text-muted-foreground mb-1">{field.label}</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            {field.type === "currency" ? "$" : field.type === "percent" ? "%" : ""}
                          </span>
                          <input type="number" step={field.type === "decimal" ? "0.01" : "1"}
                            value={inputs[field.key] || ""}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            placeholder="0"
                            className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex gap-3">
            <button onClick={handleCalculate} className="flex-1 rounded-lg bg-amber-400 text-black py-2.5 text-sm font-semibold hover:bg-amber-300 transition-colors">
              Run DCF Valuation
            </button>
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        {results ? (
          <div className="space-y-4 h-fit sticky top-8">
            <div className="rounded-2xl border-2 border-amber-400/30 bg-amber-400/5 p-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">Enterprise Value</p>
              <p className="text-3xl font-bold text-amber-400">{formatCurrency(results.enterpriseValue)}</p>
              <p className="text-sm text-muted-foreground mt-2">Equity Value: {formatCurrency(results.equityValue)}</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">WACC Breakdown</h3>
              <div className="space-y-2 text-xs">
                {([
                  { label: "Cost of Equity", value: `${(results.costOfEquity * 100).toFixed(2)}%` },
                  { label: "After-Tax Cost of Debt", value: `${(results.afterTaxCostOfDebt * 100).toFixed(2)}%` },
                  { label: "Equity Weight", value: `${(results.equityWeight * 100).toFixed(1)}%` },
                  { label: "Debt Weight", value: `${(results.debtWeight * 100).toFixed(1)}%` },
                  { label: "WACC", value: `${(results.wacc * 100).toFixed(2)}%` },
                ]).map((row) => (
                  <div key={row.label} className="flex justify-between rounded-lg px-3 py-1.5 bg-background/50 border border-border/50">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">Valuation Summary</h3>
              <div className="space-y-2 text-xs">
                {([
                  { label: "PV of FCFFs", value: formatCurrency(results.totalPVOfFCFF) },
                  { label: "Terminal Value", value: formatCurrency(results.terminalValue) },
                  { label: "PV of Terminal", value: formatCurrency(results.pvOfTerminalValue) },
                  { label: "Enterprise Value", value: formatCurrency(results.enterpriseValue) },
                  { label: "Equity Value", value: formatCurrency(results.equityValue) },
                ]).map((row) => (
                  <div key={row.label} className="flex justify-between rounded-lg px-3 py-1.5 bg-background/50 border border-border/50">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Projection table */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-background/50"><h3 className="font-semibold text-sm">5-Year Projection</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border bg-background/50">
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Year</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">Revenue</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">EBITDA</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">FCFF</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-semibold">PV of FCFF</th>
                  </tr></thead>
                  <tbody>
                    {results.projection.map((row) => (
                      <tr key={row.year} className="border-b border-border/30">
                        <td className="px-3 py-2 font-medium">{row.year}</td>
                        <td className="text-right px-3 py-2">{formatCurrency(row.revenue)}</td>
                        <td className="text-right px-3 py-2">{formatCurrency(row.ebitda)}</td>
                        <td className="text-right px-3 py-2">{formatCurrency(row.fcff)}</td>
                        <td className="text-right px-3 py-2">{formatCurrency(row.pvOfFCFF)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card min-h-[300px]">
            <p className="text-muted-foreground text-sm">Enter assumptions and click Run DCF Valuation</p>
          </div>
        )}
      </div>
    </div>
  );
}
