"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp, Calculator, DollarSign, BarChart3, FileText, Scale,
  Flame, ArrowRightLeft, Activity, Users, Gem, Rocket, PieChart,
  Settings, LayoutDashboard, ArrowLeft, Save, Link2, RotateCcw,
} from "lucide-react";
import { MODELS, TIER_INFO } from "@/lib/models-data";
import { calculateModel } from "@/lib/calculations";
import { useAuth } from "@/lib/store";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import api from "@/lib/api";
import { useSavedModel } from "@/lib/use-saved-model";
import { offerSmartResultsAfterCalculate } from "@/lib/smart-results";

const ICONS: Record<string, any> = {
  TrendingUp, Calculator, DollarSign, BarChart3, FileText, Scale,
  Flame, ArrowRightLeft, Activity, Users, Gem, Rocket, PieChart,
  Settings, LayoutDashboard,
};

const OUTPUT_LABELS: Record<string, string> = {
  contributionMargin: "Contribution Margin",
  breakEvenUnits: "Break-even Units",
  breakEvenRevenue: "Break-even Revenue",
  cmRatio: "CM Ratio",
  totalCost: "Total Cost",
  costPerUnit: "Cost Per Unit",
  sellingPrice: "Selling Price",
  totalRevenue: "Total Revenue",
  profit: "Total Profit",
  month1Revenue: "Month 1 Revenue",
  lastMonthRevenue: "Last Month Revenue",
  endMonthlyUnits: "End Monthly Units",
  avgMonthlyRevenue: "Avg Monthly Revenue",
  grossProfit: "Gross Profit",
  grossMargin: "Gross Margin %",
  netProfit: "Net Profit",
  netMargin: "Net Margin %",
  arpu: "ARPU",
  ltv: "Customer LTV",
  totalAssets: "Total Assets",
  currentAssets: "Current Assets",
  totalLiabilities: "Total Liabilities",
  currentLiabilities: "Current Liabilities",
  totalLiabilitiesAndEquity: "Total Liab. + Equity",
  isBalanced: "Balance Sheet Balanced",
  currentRatio: "Current Ratio",
  debtToEquity: "Debt-to-Equity",
  netBurn: "Net Burn / Month",
  grossBurn: "Gross Burn / Month",
  simpleRunwayMonths: "Simple Runway (Months)",
  adjustedRunwayMonths: "Adjusted Runway (Months)",
  cashOutDate: "Estimated Cash-out",
  operatingCashFlow: "Operating Cash Flow",
  investingCashFlow: "Investing Cash Flow",
  financingCashFlow: "Financing Cash Flow",
  netCashFlow: "Net Cash Flow",
  weightedContributionMargin: "Weighted CM",
  targetProfitUnits: "Target Profit Units",
  totalOpex: "Total OpEx",
  ebitda: "EBITDA",
  ebit: "EBIT",
  ebt: "EBT",
  tax: "Tax Expense",
  netIncome: "Net Income",
  ltvCacRatio: "LTV:CAC Ratio",
  arr: "ARR",
  viabilityScore: "Viability Score",
  viabilityGrade: "Viability Grade",
  runway: "Runway (Months)",
  avgLifespanMonths: "Avg Customer Lifespan",
  paybackMonths: "CAC Payback (Months)",
  magicNumber: "Magic Number",
  pvOfFCFs: "PV of FCFs",
  terminalValue: "Terminal Value",
  pvOfTerminal: "PV of Terminal",
  enterpriseValue: "Enterprise Value",
  equityValue: "Equity Value",
  pricePerShare: "Price Per Share",
  postMoneyValuation: "Post-Money Valuation",
  dilution: "Dilution %",
  newShares: "New Shares Issued",
  totalShares: "Total Shares",
  runwayFromRaise: "Runway from Raise (Mo)",
  totalSharesPostAll: "Total Shares (Post-All)",
  founderOwnership: "Founder %",
  cofounderOwnership: "Co-Founder %",
  esopOwnership: "ESOP %",
  seedOwnership: "Seed Investor %",
  seriesAOwnership: "Series A %",
  error: "Error",
};

function formatOutputValue(key: string, value: number | string): string {
  if (typeof value === "string") return value;
  if (key.includes("Margin") || key.includes("Ratio") || key.includes("Ownership") || key.includes("dilution") || key === "cmRatio") {
    return typeof value === "number" ? formatPercent(value) : String(value);
  }
  if (key.includes("Units") || key.includes("Shares") || key.includes("Months") || key.includes("Score") || key === "paybackMonths" || key === "avgLifespanMonths" || key === "magicNumber") {
    return typeof value === "number" ? formatNumber(value) : String(value);
  }
  if (typeof value === "number") return formatCurrency(value);
  return String(value);
}

export default function ModelCalculatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user, hydrate } = useAuth();
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [outputs, setOutputs] = useState<Record<string, number | string> | null>(null);
  const model = MODELS[slug];

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: slug,
    onLoad: (data: Record<string, unknown>) => {
      if (data.inputs) {
        const restored: Record<string, string> = {};
        Object.entries(data.inputs as Record<string, string>).forEach(([k, v]) => {
          restored[k] = String(v ?? "");
        });
        setInputs(restored);
      }
    },
    getState: useCallback(() => ({ inputs }), [inputs]),
  });

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (model) {
      const defaultInputs: Record<string, string> = {};
      model.fields.forEach((f) => {
        defaultInputs[f.key] = "";
      });
      setInputs(defaultInputs);
      setOutputs(null);
    }
  }, [slug, model]);

  if (!model) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Model not found</h1>
        <Link href="/models?list=1" className="text-primary hover:underline">Back to Models</Link>
      </div>
    );
  }

  const IconComp = ICONS[model.icon] || BarChart3;
  const tierInfo = TIER_INFO[model.tier];

  const handleCalculate = () => {
    const numericInputs: Record<string, number | string> = {};
    model.fields.forEach((f) => {
      if (f.type === "text") {
        numericInputs[f.key] = inputs[f.key] || "";
      } else {
        numericInputs[f.key] = parseFloat(inputs[f.key]) || 0;
      }
    });
    const result = calculateModel(slug, numericInputs);
    setOutputs(result);
    offerSmartResultsAfterCalculate(slug, inputs, result);
    markDirty();
  };

  const handleReset = () => {
    const empty: Record<string, string> = {};
    model.fields.forEach((f) => { empty[f.key] = ""; });
    setInputs(empty);
    setOutputs(null);
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user || !outputs) return;
    try {
      await api.post("/calculations", {
        modelSlug: slug,
        inputs,
        outputs,
      });
      await persistState();
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models?list=1" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${tierInfo.bgColor}`}>
          <IconComp className={`h-7 w-7 ${tierInfo.color}`} />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{model.name}</h1>
            <span className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${tierInfo.bgColor} ${tierInfo.color}`}>
              {tierInfo.name}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">{model.description}</p>
          {model.linkedModels && model.linkedModels.length > 0 && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Link2 className="h-3 w-3" />
              Linked with:{" "}
              {model.linkedModels.map((lm, i) => (
                <span key={lm}>
                  <Link href={`/models/${lm}`} className="text-primary hover:underline">
                    {MODELS[lm]?.name || lm}
                  </Link>
                  {i < model.linkedModels!.length - 1 && ", "}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="rounded-2xl border border-border bg-card p-6 output-panel">
          <h2 className="font-semibold mb-5">Inputs</h2>
          <div className="space-y-4">
            {model.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  {field.label}
                </label>
                <div className="relative">
                  {field.type === "currency" && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  )}
                  <input
                    type={field.type === "text" ? "text" : "number"}
                    data-field={field.key}
                    value={inputs[field.key] || ""}
                    onChange={(e) => setInputs({ ...inputs, [field.key]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const allInputs = Array.from(
                          document.querySelectorAll<HTMLInputElement>("input[data-field]")
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
                    className={`w-full rounded-lg border border-border bg-input py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary ${
                      field.type === "currency" ? "pl-7 pr-4" : "px-4"
                    }`}
                  />
                  {field.type === "percent" && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleCalculate}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors"
            >
              Calculate
            </button>
            <button
              onClick={handleReset}
              className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="rounded-2xl border border-border bg-card p-6 output-panel">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold">Results</h2>
            {outputs && user && (
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  saved
                    ? "bg-success/10 text-success"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}
              >
                <Save className="h-3 w-3" />
                {saved ? "Saved!" : saving ? "Saving..." : "Save"}
              </button>
            )}
          </div>

          {outputs ? (
            <div className="space-y-3">
              {Object.entries(outputs).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg bg-background/50 border border-border/50 px-4 py-3"
                >
                  <span className="text-sm text-muted-foreground">
                    {OUTPUT_LABELS[key] || key}
                  </span>
                  <span className="text-sm font-semibold">
                    {formatOutputValue(key, value)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              Enter values and click Calculate to see results
            </div>
          )}

          {!user && outputs && (
            <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Sign up to save your calculations and track history
              </p>
              <Link
                href="/signup"
                className="inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-accent transition-colors"
              >
                Create Free Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
