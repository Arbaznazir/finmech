"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Save, RotateCcw } from "lucide-react";
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { loadModelResults, saveModelResults, clearModelResults } from "@/lib/model-link";
import {
  MONTHS_ORDER,
  INPUT_FIELDS,
  calculateUnitEconomics,
  createEmptyInputs,
  type MonthName,
} from "@/lib/unit-economics-model";

export default function InvUnitEconomicsPage() {
  const { user, hydrate } = useAuth();
  const [monthData, setMonthData] = useState<Record<string, Record<string, number>>>(() => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyInputs(); });
    return d;
  });
  const [activeMonth, setActiveMonth] = useState<MonthName>("Apr");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hubLinked, setHubLinked] = useState(false);

  useEffect(() => {
    hydrate();
    const hub = loadModelResults<Record<string, number>>("inv-common-utility");
    if (hub && hub.monthlyRevenue > 0) {
      setHubLinked(true);
      setMonthData((prev) => {
        const next = { ...prev };
        MONTHS_ORDER.forEach((m) => {
          next[m] = { ...next[m], "Sales Revenue": hub.monthlyRevenue };
        });
        return next;
      });
    }
  }, [hydrate]);

  const results = useMemo(() => calculateUnitEconomics(monthData), [monthData]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { saveModelResults("inv-unit-economics", results); }, [results]);

  const handleChange = (field: string, value: string) => {
    setMonthData((prev) => ({
      ...prev,
      [activeMonth]: { ...prev[activeMonth], [field]: parseFloat(value) || 0 },
    }));
    setSaved(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const all = Array.from(
        (e.currentTarget.closest("[data-inputs]") || document).querySelectorAll<HTMLInputElement>("input[data-field]")
      );
      const idx = all.indexOf(e.currentTarget);
      if (idx >= 0 && idx < all.length - 1) all[idx + 1].focus();
    }
  };

  const handleReset = () => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyInputs(); });
    setMonthData(d);
    setSaved(false);
    setHubLinked(false);
    clearModelResults("inv-unit-economics");
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await api.post("/calculations", { modelSlug: "inv-unit-economics", inputs: monthData, outputs: results });
      setSaved(true);
    } catch (err) { console.error("Failed to save:", err); }
    finally { setSaving(false); }
  };

  const cur = results.monthlyData[activeMonth];
  const fmt = (key: string, format: string) => {
    const v = Number(cur?.[key]) || 0;
    if (format === "$") return formatCurrency(v);
    if (format === "%") return `${v.toFixed(1)}%`;
    if (format === "x") return `${v.toFixed(2)}x`;
    if (format === "mo") return `${v.toFixed(1)} mo`;
    return v.toLocaleString();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-400/10">
            <Users className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Unit Economics — Advanced</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-amber-400/10 text-amber-400">Investor Grade</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Advanced unit economics with cohort analysis and payback curves.
              <span className="text-amber-400 ml-2 text-xs font-medium">&larr; Common Utility</span>
            </p>
          </div>
        </div>
        {user && (
          <button onClick={handleSave} disabled={saving || saved}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${saved ? "bg-success/10 text-success" : "bg-amber-400/10 text-amber-400 hover:bg-amber-400/20"}`}>
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>

      {hubLinked && (
        <div className="rounded-xl bg-success/5 border border-success/20 p-3 mb-6">
          <p className="text-xs text-success font-medium">Auto-filled from Common Utility — Sales Revenue loaded for all months.</p>
        </div>
      )}

      {/* Month tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6">
        {MONTHS_ORDER.map((m) => (
          <button key={m} onClick={() => setActiveMonth(m)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${activeMonth === m ? "bg-amber-400 text-black" : "bg-card border border-border hover:bg-muted"}`}>
            {m}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="rounded-2xl border border-border bg-card p-5" data-inputs>
          <h3 className="font-semibold text-sm mb-3">{activeMonth} Inputs</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INPUT_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="block text-xs text-muted-foreground mb-1">{field.label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.prefix}</span>
                  <input type="number" data-field={field.key}
                    value={monthData[activeMonth][field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="0"
                    className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-4 h-fit sticky top-8">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">{activeMonth} Metrics</h3>
            <div className="space-y-2 text-xs">
              {([
                { label: "CAC", key: "CAC", f: "$" },
                { label: "LTV", key: "LTV", f: "$" },
                { label: "ARPU", key: "ARPU", f: "$" },
                { label: "Churn Rate", key: "Churn Rate", f: "%" },
                { label: "Growth Rate", key: "Growth Rate", f: "%" },
                { label: "LTV/CAC Ratio", key: "LTV/CAC", f: "x" },
                { label: "CAC Payback", key: "CAC Payback Period (months)", f: "mo" },
                { label: "End Customers", key: "End Customers", f: "#" },
              ]).map((row) => (
                <div key={row.label} className="flex justify-between rounded-lg px-3 py-1.5 bg-background/50 border border-border/50">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold">{fmt(row.key, row.f)}</span>
                </div>
              ))}
            </div>
          </div>

          {cur && cur["RAG Status"] && (
            <div className={`rounded-xl border p-4 text-center ${
              cur["RAG Status"] === 1 ? "bg-success/5 border-success/20" :
              cur["RAG Status"] === 2 ? "bg-amber-400/5 border-amber-400/20" :
              "bg-danger/5 border-danger/20"
            }`}>
              <p className={`text-xs font-semibold ${
                cur["RAG Status"] === 1 ? "text-success" :
                cur["RAG Status"] === 2 ? "text-amber-400" :
                "text-danger"
              }`}>
                {cur["RAG Status"] === 1 ? "GREEN — Healthy Economics" : cur["RAG Status"] === 2 ? "AMBER — Watch Closely" : "RED — Economics Need Fixing"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
