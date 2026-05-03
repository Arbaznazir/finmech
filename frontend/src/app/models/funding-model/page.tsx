"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Rocket, Save, RotateCcw,
  CheckCircle, AlertTriangle, XCircle, Info,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import {
  MONTHS_ORDER,
  INPUT_FIELDS,
  OUTPUT_FIELDS,
  calculateFunding,
  createEmptyInputs,
  type MonthName,
  type FundingResults,
} from "@/lib/funding-model";

type TabView = "input" | "monthly" | "summary";

export default function FundingModelPage() {
  const { user, hydrate } = useAuth();
  const [activeMonth, setActiveMonth] = useState<MonthName>("Apr");
  const [monthsData, setMonthsData] = useState<Record<string, Record<string, number>>>({});
  const [openingCash, setOpeningCash] = useState(0);
  const [contingencyPct, setContingencyPct] = useState(15);
  const [results, setResults] = useState<FundingResults | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>("input");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);

  const addedMonths = Object.keys(monthsData);

  const handleInputChange = (key: string, value: string) => {
    setMonthsData((prev) => ({
      ...prev,
      [activeMonth]: {
        ...(prev[activeMonth] || createEmptyInputs()),
        [key]: parseFloat(value) || 0,
      },
    }));
    setSaved(false);
  };

  const handleCalculate = useCallback(() => {
    if (Object.keys(monthsData).length === 0) return;
    const result = calculateFunding(monthsData, openingCash, contingencyPct);
    setResults(result);
    setActiveTab("monthly");
  }, [monthsData, openingCash, contingencyPct]);

  const handleReset = () => {
    setMonthsData({});
    setOpeningCash(0);
    setContingencyPct(15);
    setResults(null);
    setActiveTab("input");
    setSaved(false);
  };

  const handleResetMonth = () => {
    setMonthsData((prev) => {
      const next = { ...prev };
      delete next[activeMonth];
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!user || !results) return;
    setSaving(true);
    try {
      await api.post("/calculations", {
        modelSlug: "funding-model",
        inputs: { monthsData, openingCash, contingencyPct },
        outputs: results.summary,
      });
      setSaved(true);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const currentInputs = monthsData[activeMonth] || createEmptyInputs();

  const categories = INPUT_FIELDS.reduce<Record<string, typeof INPUT_FIELDS>>((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <Link href="/models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-orange-400/10">
            <Rocket className="h-7 w-7 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Funding Model</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-blue-400/10 text-blue-400">
                Standalone
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              Month-by-month cash flow → Working Capital → Net Cash → Max Deficit → Funding Required + Contingency.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {addedMonths.length} of 12 months entered
              {addedMonths.length > 0 && ` (${addedMonths.join(", ")})`}
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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 rounded-xl bg-card border border-border p-1 overflow-x-auto">
        {(["input", "monthly", "summary"] as TabView[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors whitespace-nowrap ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {tab === "input" ? "Enter Data" : tab === "monthly" ? "Monthly View" : "Funding Summary"}
          </button>
        ))}
      </div>

      {/* ============ INPUT TAB ============ */}
      {activeTab === "input" && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Month Selector */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3">Select Month</h3>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-1.5">
              {MONTHS_ORDER.map((month) => {
                const hasData = !!monthsData[month];
                return (
                  <button
                    key={month}
                    onClick={() => setActiveMonth(month)}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      activeMonth === month
                        ? "bg-primary text-primary-foreground"
                        : hasData
                          ? "bg-success/10 text-success border border-success/20"
                          : "hover:bg-muted border border-transparent"
                    }`}
                  >
                    <span>{month}</span>
                    {hasData && activeMonth !== month && <CheckCircle className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>

            {/* Global settings */}
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Opening Cash</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <input
                    type="number"
                    value={openingCash || ""}
                    onChange={(e) => { setOpeningCash(parseFloat(e.target.value) || 0); setSaved(false); }}
                    placeholder="0"
                    className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Contingency %</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  <input
                    type="number"
                    value={contingencyPct || ""}
                    onChange={(e) => { setContingencyPct(parseFloat(e.target.value) || 0); setSaved(false); }}
                    placeholder="15"
                    className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Input form */}
          <div className="rounded-2xl border border-border bg-card p-6" data-inputs>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold">
                Inputs for <span className="text-primary">{activeMonth}</span>
              </h2>
              <button onClick={handleResetMonth} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-1">
                <RotateCcw className="h-3 w-3" /> Clear Month
              </button>
            </div>

            {Object.entries(categories).map(([category, fields]) => (
              <div key={category} className="mb-4">
                <div className="rounded-lg bg-background/50 px-3 py-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1">
                  {fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs text-muted-foreground mb-1">{field.label}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.prefix}</span>
                        <input
                          type="number"
                          data-field={field.key}
                          value={currentInputs[field.key] || ""}
                          onChange={(e) => handleInputChange(field.key, e.target.value)}
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
              </div>
            ))}

            <div className="flex gap-3 mt-6 pt-4 border-t border-border">
              <button
                onClick={handleCalculate}
                disabled={addedMonths.length === 0}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                Calculate Funding
              </button>
              <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MONTHLY VIEW ============ */}
      {activeTab === "monthly" && results && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground sticky left-0 bg-background/50 min-w-[180px]">Line Item</th>
                  {results.monthsAdded.map((m) => (
                    <th key={m} className="text-right px-4 py-3 font-semibold text-muted-foreground min-w-[110px]">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {OUTPUT_FIELDS.map((field) => (
                  <tr key={field.key} className={`border-b border-border/30 ${field.bold ? "bg-background/30" : ""}`}>
                    <td className={`px-4 py-2.5 sticky left-0 bg-card ${field.bold ? "font-semibold bg-background/30" : "text-muted-foreground"}`}>
                      {field.label}
                    </td>
                    {results.monthsAdded.map((m) => {
                      const val = results.monthlyData[m]?.[field.key] ?? 0;
                      return (
                        <td key={m} className={`text-right px-4 py-2.5 ${field.bold ? "font-semibold" : ""} ${val < 0 ? "text-danger" : ""}`}>
                          {formatCurrency(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ SUMMARY TAB ============ */}
      {activeTab === "summary" && results && (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Big numbers */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-2xl border-2 p-6 text-center ${results.summary.maxCashDeficit < 0 ? "border-danger/30 bg-danger/5" : "border-success/30 bg-success/5"}`}>
              <p className="text-sm text-muted-foreground mb-2">Max Cash Deficit</p>
              <p className={`text-3xl font-bold ${results.summary.maxCashDeficit < 0 ? "text-danger" : "text-success"}`}>
                {formatCurrency(results.summary.maxCashDeficit)}
              </p>
            </div>
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Total Funding Required</p>
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(results.summary.totalFunding)}
              </p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-5">Funding Breakdown</h2>
            <div className="space-y-3">
              {([
                { label: "Opening Cash", value: results.summary.openingCash },
                { label: "Max Cash Deficit", value: results.summary.maxCashDeficit, color: results.summary.maxCashDeficit < 0 ? "text-danger" : "" },
                { label: "Funding Required (to cover deficit)", value: results.summary.fundingRequired, bold: true },
                { label: `Contingency (${results.summary.contingencyPct}%)`, value: results.summary.contingency },
                { label: "Total Funding Required", value: results.summary.totalFunding, bold: true, primary: true },
              ]).map((row) => (
                <div key={row.label} className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                  row.primary ? "bg-primary/5 border border-primary/20" : row.bold ? "bg-background/80 border border-border" : "bg-background/50 border border-border/50"
                }`}>
                  <span className={`text-sm ${row.bold ? "font-semibold" : "text-muted-foreground"}`}>{row.label}</span>
                  <span className={`text-sm font-semibold ${row.color || ""} ${row.primary ? "text-primary" : ""}`}>
                    {formatCurrency(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Status indicator */}
          <div className={`rounded-2xl border p-6 text-center ${
            results.summary.maxCashDeficit >= 0 ? "bg-success/5 border-success/20" : "bg-amber-400/5 border-amber-400/20"
          }`}>
            {results.summary.maxCashDeficit >= 0 ? (
              <>
                <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
                <p className="font-semibold text-success">Cash Positive</p>
                <p className="text-xs text-muted-foreground mt-1">No external funding required based on current projections.</p>
              </>
            ) : (
              <>
                <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                <p className="font-semibold text-amber-400">Funding Gap Identified</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Secure at least {formatCurrency(results.summary.totalFunding)} (including {results.summary.contingencyPct}% contingency) to cover the projected cash deficit.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* No results */}
      {activeTab !== "input" && !results && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="mb-4">No results yet. Enter data and click Calculate.</p>
          <button onClick={() => setActiveTab("input")} className="text-primary hover:underline text-sm">
            Go to Enter Data
          </button>
        </div>
      )}

      {!user && results && (
        <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <p className="text-muted-foreground mb-3">Sign up to save your Funding Model</p>
          <Link href="/signup" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
            Create Free Account
          </Link>
        </div>
      )}
    </div>
  );
}
