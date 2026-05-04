"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, LayoutDashboard, Save, RotateCcw, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import api from "@/lib/api";
import { loadModelResults, saveModelResults, clearModelResults } from "@/lib/model-link";
import { useSavedModel } from "@/lib/use-saved-model";

interface SnapshotInputs {
  monthlyRevenue: number;
  grossMargin: number;
  netMargin: number;
  cashBalance: number;
  burnRate: number;
  totalCustomers: number;
  ltv: number;
  cac: number;
  arr: number;
  nrr: number;
  enterpriseValue: number;
  receivables: number;
  inventory: number;
  payables: number;
  changeInWC: number;
}

interface SnapshotResults {
  ltcCacRatio: number;
  runway: number;
  revenueStatus: "GREEN" | "AMBER" | "RED";
  marginStatus: "GREEN" | "AMBER" | "RED";
  runwayStatus: "GREEN" | "AMBER" | "RED";
  ltcCacStatus: "GREEN" | "AMBER" | "RED";
  evRevenueMultiple: number;
  healthScore: number;
  healthLabel: string;
  insights: string[];
}

function getRAG(val: number, greenThreshold: number, amberThreshold: number): "GREEN" | "AMBER" | "RED" {
  return val >= greenThreshold ? "GREEN" : val >= amberThreshold ? "AMBER" : "RED";
}

function calculateSnapshot(inp: SnapshotInputs): SnapshotResults {
  const ltcCacRatio = inp.cac > 0 ? inp.ltv / inp.cac : 0;
  const runway = inp.burnRate > 0 ? inp.cashBalance / inp.burnRate : Infinity;
  const evRevenueMultiple = inp.arr > 0 ? inp.enterpriseValue / inp.arr : 0;

  const revenueStatus = getRAG(inp.monthlyRevenue, 50000, 10000);
  const marginStatus = getRAG(inp.grossMargin, 40, 20);
  const runwayStatus = getRAG(runway === Infinity ? 99 : runway, 12, 6);
  const ltcCacStatus = getRAG(ltcCacRatio, 3, 1);

  const scores = { GREEN: 3, AMBER: 2, RED: 1 };
  const total = scores[revenueStatus] + scores[marginStatus] + scores[runwayStatus] + scores[ltcCacStatus];
  const healthScore = Math.round((total / 12) * 100);
  const healthLabel = healthScore >= 75 ? "HEALTHY" : healthScore >= 50 ? "CAUTION" : "CRITICAL";

  const insights: string[] = [];
  if (revenueStatus === "RED") insights.push("Revenue very low — accelerate sales pipeline and GTM.");
  if (marginStatus === "RED") insights.push("Gross margin critical — review COGS, pricing, and vendor terms.");
  if (runwayStatus === "RED") insights.push("Runway below 6 months — initiate fundraise or cut burn immediately.");
  if (ltcCacStatus === "RED") insights.push("LTV/CAC below 1x — customer economics unsustainable; fix churn or CAC.");
  if (inp.nrr > 0 && inp.nrr < 100) insights.push(`NRR at ${inp.nrr.toFixed(0)}% — below 100% means net contraction. Upsell/cross-sell needed.`);
  if (evRevenueMultiple > 0 && evRevenueMultiple < 3) insights.push(`EV/Revenue multiple at ${evRevenueMultiple.toFixed(1)}x — below market benchmarks.`);
  if (insights.length === 0) insights.push("Business fundamentals look solid. Maintain trajectory and monitor monthly.");

  return { ltcCacRatio, runway, revenueStatus, marginStatus, runwayStatus, ltcCacStatus, evRevenueMultiple, healthScore, healthLabel, insights };
}

const emptyInputs = (): SnapshotInputs => ({
  monthlyRevenue: 0, grossMargin: 0, netMargin: 0, cashBalance: 0, burnRate: 0, totalCustomers: 0, ltv: 0, cac: 0, arr: 0, nrr: 0, enterpriseValue: 0, receivables: 0, inventory: 0, payables: 0, changeInWC: 0,
});

export default function InvBusinessSnapshotPage() {
  const { user, hydrate } = useAuth();
  const [inputs, setInputs] = useState<SnapshotInputs>(emptyInputs());
  const [results, setResults] = useState<SnapshotResults | null>(null);
  const [linkedSources, setLinkedSources] = useState<string[]>([]);
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set());

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "inv-business-snapshot",
    onLoad: (data: Record<string, unknown>) => {
      if (data.inputs) setInputs(data.inputs as SnapshotInputs);
    },
    getState: useCallback(() => ({ inputs }), [inputs]),
  });

  const loadFromLinkedModels = () => {
    const sources: string[] = [];
    const locked = new Set<string>();
    const hub = loadModelResults<Record<string, unknown>>("inv-common-utility");
    const burn = loadModelResults<Record<string, unknown>>("inv-burn-runway");
    const dcf = loadModelResults<Record<string, unknown>>("inv-dcf-valuation");
    const ue = loadModelResults<Record<string, unknown>>("inv-unit-economics");

    setInputs((prev) => {
      const next = { ...prev };
      if (hub) {
        if (typeof hub.monthlyRevenue === "number" && (hub.monthlyRevenue as number) > 0) { next.monthlyRevenue = hub.monthlyRevenue as number; locked.add("monthlyRevenue"); }
        if (typeof hub.grossMargin === "number" && (hub.grossMargin as number) > 0) { next.grossMargin = hub.grossMargin as number; locked.add("grossMargin"); }
        if (typeof hub.netMargin === "number" && (hub.netMargin as number) > 0) { next.netMargin = hub.netMargin as number; locked.add("netMargin"); }
        if (typeof hub.annualRevenue === "number" && (hub.annualRevenue as number) > 0) { next.arr = hub.annualRevenue as number; locked.add("arr"); }
        sources.push("Common Utility");
      }
      if (burn) {
        const bd = burn as Record<string, unknown>;
        if (bd.monthlyData) {
          const months = bd.monthlyData as Record<string, Record<string, number>>;
          const keys = Object.keys(months);
          for (let i = keys.length - 1; i >= 0; i--) {
            const last = months[keys[i]];
            if (last && (last["Total Revenue"] > 0 || last["Cumulative Cash"] !== 0)) {
              if (last["Cumulative Cash"] > 0) { next.cashBalance = last["Cumulative Cash"]; locked.add("cashBalance"); }
              if (last["Net Burn"] > 0) { next.burnRate = last["Net Burn"]; locked.add("burnRate"); }
              break;
            }
          }
          sources.push("Burn & Runway");
        }
      }
      if (ue) {
        const ueData = ue as Record<string, unknown>;
        if (ueData.monthlyData) {
          const months = ueData.monthlyData as Record<string, Record<string, number>>;
          const keys = Object.keys(months);
          for (let i = keys.length - 1; i >= 0; i--) {
            const last = months[keys[i]];
            if (last && last["Total Active Customers (Monthly)"] > 0) {
              next.totalCustomers = last["Total Active Customers (Monthly)"]; locked.add("totalCustomers");
              if (last["LTV"] > 0) { next.ltv = last["LTV"]; locked.add("ltv"); }
              if (last["CAC"] > 0) { next.cac = last["CAC"]; locked.add("cac"); }
              break;
            }
          }
        }
        sources.push("Unit Economics");
      }
      if (dcf) {
        if (typeof dcf.enterpriseValue === "number" && (dcf.enterpriseValue as number) > 0) { next.enterpriseValue = dcf.enterpriseValue as number; locked.add("enterpriseValue"); sources.push("DCF Valuation"); }
      }
      // Pull from Movements model
      const mov = loadModelResults<Record<string, unknown>>("inv-movements");
      if (mov) {
        const movAnnual = mov.annual as Record<string, number> | undefined;
        if (movAnnual) {
          if (movAnnual.closingReceivables > 0) { next.receivables = movAnnual.closingReceivables; locked.add("receivables"); }
          if (movAnnual.closingInventory > 0) { next.inventory = movAnnual.closingInventory; locked.add("inventory"); }
          if (movAnnual.closingPayables > 0) { next.payables = movAnnual.closingPayables; locked.add("payables"); }
          if (movAnnual.totalChangeInWC !== 0) { next.changeInWC = movAnnual.totalChangeInWC; locked.add("changeInWC"); }
          sources.push("Movements");
        }
      }
      return next;
    });
    setLinkedSources(sources);
    setLockedFields(locked);
  };

  useEffect(() => {
    hydrate();
    loadFromLinkedModels();
  }, [hydrate]);

  const handleChange = (key: keyof SnapshotInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    markDirty();
  };

  const handleCalculate = () => {
    const r = calculateSnapshot(inputs);
    setResults(r);
    saveModelResults("inv-business-snapshot", { ...inputs, ...r });
  };

  const handleReset = () => {
    setInputs(emptyInputs()); setResults(null); setLinkedSources([]);
    clearModelResults("inv-business-snapshot");
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user || !results) return;
    try {
      await api.post("/calculations", { modelSlug: "inv-business-snapshot", inputs, outputs: results });
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  const fields: { key: keyof SnapshotInputs; label: string; prefix: string }[] = [
    { key: "monthlyRevenue", label: "Monthly Revenue", prefix: "$" },
    { key: "grossMargin", label: "Gross Margin %", prefix: "%" },
    { key: "netMargin", label: "Net Margin %", prefix: "%" },
    { key: "cashBalance", label: "Cash Balance", prefix: "$" },
    { key: "burnRate", label: "Monthly Burn", prefix: "$" },
    { key: "totalCustomers", label: "Total Customers", prefix: "#" },
    { key: "ltv", label: "LTV", prefix: "$" },
    { key: "cac", label: "CAC", prefix: "$" },
    { key: "arr", label: "ARR", prefix: "$" },
    { key: "nrr", label: "NRR %", prefix: "%" },
    { key: "enterpriseValue", label: "Enterprise Value", prefix: "$" },
    { key: "receivables", label: "Trade Receivables", prefix: "$" },
    { key: "inventory", label: "Inventory", prefix: "$" },
    { key: "payables", label: "Trade Payables", prefix: "$" },
    { key: "changeInWC", label: "Δ Working Capital", prefix: "$" },
  ];

  const ragColor = (status: string) =>
    status === "GREEN" ? "text-success bg-success/10 border-success/30" :
    status === "AMBER" ? "text-amber-400 bg-amber-400/10 border-amber-400/30" :
    "text-danger bg-danger/10 border-danger/30";

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-400/10">
            <LayoutDashboard className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Business Snapshot</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-amber-400/10 text-amber-400">Investor Grade</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Comprehensive investor-ready business overview aggregating all models.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadFromLinkedModels} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Reload from Models
          </button>
          {results && user && (
            <button onClick={handleSave} disabled={saving || saved}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${saved ? "bg-success/10 text-success" : "bg-amber-400/10 text-amber-400 hover:bg-amber-400/20"}`}>
              <Save className="h-4 w-4" />
              {saved ? "Saved!" : saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>

      {linkedSources.length > 0 && (
        <div className="rounded-xl bg-success/5 border border-success/20 p-3 mb-6">
          <p className="text-xs text-success font-medium">
            Data imported from: {linkedSources.join(", ")}. Linked fields are locked.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Inputs */}
        <div className="rounded-2xl border border-border bg-card p-6" data-inputs>
          <h2 className="font-semibold mb-5">Business Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((field) => {
              const isLocked = lockedFields.has(field.key);
              return (
              <div key={field.key}>
                <label className="block text-xs text-muted-foreground mb-1">
                  {field.label}
                  {isLocked && <span className="ml-1 text-[10px] text-amber-400/70">(auto-filled)</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{field.prefix}</span>
                  <input type="number" step="0.01" data-field={field.key}
                    value={inputs[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    disabled={isLocked}
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
                    className={`w-full rounded-lg border border-border pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 ${isLocked ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60" : "bg-input"}`}
                  />
                </div>
              </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-6 pt-4 border-t border-border">
            <button onClick={handleCalculate} className="flex-1 rounded-lg bg-amber-400 text-black py-2.5 text-sm font-semibold hover:bg-amber-300 transition-colors">
              Generate Snapshot
            </button>
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results */}
        {results ? (
          <div className="space-y-4 h-fit sticky top-8">
            <div className={`rounded-2xl p-6 text-center border-2 ${results.healthLabel === "HEALTHY" ? "border-success/30 bg-success/5" : results.healthLabel === "CAUTION" ? "border-amber-400/30 bg-amber-400/5" : "border-danger/30 bg-danger/5"}`}>
              <p className="text-xs text-muted-foreground mb-1">Business Health Index</p>
              <p className={`text-4xl font-bold ${results.healthLabel === "HEALTHY" ? "text-success" : results.healthLabel === "CAUTION" ? "text-amber-400" : "text-danger"}`}>{results.healthScore}%</p>
              <p className={`text-sm font-semibold mt-1 ${results.healthLabel === "HEALTHY" ? "text-success" : results.healthLabel === "CAUTION" ? "text-amber-400" : "text-danger"}`}>{results.healthLabel}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {([
                { label: "Revenue", status: results.revenueStatus, value: formatCurrency(inputs.monthlyRevenue) + "/mo" },
                { label: "Gross Margin", status: results.marginStatus, value: `${inputs.grossMargin.toFixed(1)}%` },
                { label: "Runway", status: results.runwayStatus, value: results.runway === Infinity ? "∞" : `${results.runway.toFixed(1)} mo` },
                { label: "LTV/CAC", status: results.ltcCacStatus, value: `${results.ltcCacRatio.toFixed(2)}x` },
              ]).map((card) => (
                <div key={card.label} className={`rounded-xl border p-4 ${ragColor(card.status)}`}>
                  <p className="text-[10px] uppercase font-semibold mb-1">{card.label}</p>
                  <p className="text-lg font-bold">{card.value}</p>
                  <p className="text-[10px] font-semibold mt-1">{card.status}</p>
                </div>
              ))}
            </div>

            {results.evRevenueMultiple > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">EV / Revenue Multiple</p>
                <p className="text-lg font-bold">{results.evRevenueMultiple.toFixed(1)}x</p>
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">Insights</h3>
              <div className="space-y-2">
                {results.insights.map((insight, i) => (
                  <div key={i} className="text-xs text-muted-foreground rounded-lg bg-background/50 border border-border/50 px-3 py-2">
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-card min-h-[300px]">
            <p className="text-muted-foreground text-sm">Enter metrics and click Generate Snapshot</p>
          </div>
        )}
      </div>
    </div>
  );
}
