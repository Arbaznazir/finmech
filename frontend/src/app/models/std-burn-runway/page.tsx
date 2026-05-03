"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Flame, Save, RotateCcw } from "lucide-react";
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { loadModelResults, saveModelResults, clearModelResults } from "@/lib/model-link";
import {
  MONTHS_ORDER,
  INPUT_FIELDS,
  OUTPUT_FIELDS,
  calculateBurnRunway,
  createEmptyInputs,
  type MonthName,
} from "@/lib/burn-runway-model";

export default function StdBurnRunwayPage() {
  const { user, hydrate } = useAuth();
  const [openingCash, setOpeningCash] = useState(0);
  const [monthData, setMonthData] = useState<Record<string, Record<string, number>>>(() => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyInputs() as Record<string, number>; });
    return d;
  });
  const [activeMonth, setActiveMonth] = useState<MonthName>("April");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hubLinked, setHubLinked] = useState(false);

  useEffect(() => {
    hydrate();
    const hub = loadModelResults<Record<string, number>>("std-common-utility");
    if (hub) {
      if (hub.monthlyRevenue > 0) {
        setMonthData((prev) => {
          const next = { ...prev };
          next["April"] = {
            ...next["April"],
            "Recurring Revenue": hub.monthlyRevenue,
            "Fixed Expenses": hub.totalFixedCosts ?? 0,
            "Variable Expenses": hub.totalVariableCosts ?? 0,
          };
          return next;
        });
        setHubLinked(true);
      }
    }
  }, [hydrate]);

  const results = useMemo(() => calculateBurnRunway(monthData, openingCash), [monthData, openingCash]);

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

  // Auto-persist whenever results change so downstream models (Business Snapshot) can read
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { saveModelResults("std-burn-runway", results); }, [results]);

  const handleReset = () => {
    const d: Record<string, Record<string, number>> = {};
    MONTHS_ORDER.forEach((m) => { d[m] = createEmptyInputs() as Record<string, number>; });
    setMonthData(d);
    setOpeningCash(0);
    setSaved(false);
    setHubLinked(false);
    clearModelResults("std-burn-runway");
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    saveModelResults("std-burn-runway", results);
    try {
      await api.post("/calculations", { modelSlug: "std-burn-runway", inputs: { openingCash, monthData }, outputs: results });
      setSaved(true);
    } catch (err) { console.error("Failed to save:", err); }
    finally { setSaving(false); }
  };

  const cur = results.monthlyData[activeMonth];
  const fmt = (key: string, format: string) => {
    const v = Number(cur?.[key]) || 0;
    if (format === "currency") return formatCurrency(v);
    if (format === "months") return v === Infinity ? "∞" : `${v.toFixed(1)} mo`;
    if (format === "ratio") return v.toFixed(2);
    if (format === "classification") return String(cur?.[key] || "—");
    return v.toLocaleString();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10">
            <Flame className="h-7 w-7 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Burn &amp; Runway Monitor</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-primary/10 text-primary">Standard</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Month-by-month burn tracking with cumulative cash &amp; runway.
              <span className="text-blue-400 ml-2 text-xs font-medium">&larr; Common Utility</span>
            </p>
          </div>
        </div>
        {user && (
          <button onClick={handleSave} disabled={saving || saved}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${saved ? "bg-success/10 text-success" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>

      {/* Opening Cash */}
      <div className="rounded-2xl border border-border bg-card p-5 mb-6">
        <label className="block text-xs text-muted-foreground mb-1">Opening Cash Balance</label>
        <div className="relative max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
          <input type="number" value={openingCash || ""}
            onChange={(e) => { setOpeningCash(parseFloat(e.target.value) || 0); setSaved(false); }}
            placeholder="100000"
            className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Month tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6">
        {MONTHS_ORDER.map((m) => {
          const mStatus = results.status.find((s) => s.month === m);
          const dot = mStatus ? (mStatus.classification === "GREEN" ? "bg-success" : mStatus.classification === "AMBER" ? "bg-amber-400" : "bg-danger") : "";
          return (
            <button key={m} onClick={() => setActiveMonth(m)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${activeMonth === m ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:bg-muted"}`}>
              {m}
              {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
            </button>
          );
        })}
      </div>

      {hubLinked && (
        <div className="rounded-xl bg-success/5 border border-success/20 p-3 mb-6">
          <p className="text-xs text-success font-medium">Revenue &amp; costs auto-filled from Common Utility for April. You can override.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Inputs */}
        <div className="rounded-2xl border border-border bg-card p-5" data-inputs>
          <h3 className="font-semibold text-sm mb-4">{activeMonth} Inputs</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INPUT_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="block text-xs text-muted-foreground mb-1">{field.label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <input type="number" data-field={field.key}
                    value={monthData[activeMonth][field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="0"
                    className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-1.5">
              <RotateCcw className="h-4 w-4" /> Reset All
            </button>
          </div>
        </div>

        {/* Results sidebar */}
        <div className="space-y-4 h-fit sticky top-8">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">{activeMonth} Results</h3>
            {cur ? (
              <div className="space-y-2 text-xs">
                {OUTPUT_FIELDS.map((f) => (
                  <div key={f.key} className={`flex justify-between rounded-lg px-3 py-1.5 bg-background/50 border border-border/50 ${f.key === "CLASSIFICATION" ? (String(cur[f.key]) === "GREEN" ? "border-success/50 bg-success/5" : String(cur[f.key]) === "AMBER" ? "border-amber-400/50 bg-amber-400/5" : "border-danger/50 bg-danger/5") : ""}`}>
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-semibold">{fmt(f.key, f.format)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Enter data and results appear live</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
