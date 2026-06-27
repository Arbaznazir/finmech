"use client";

import { useState } from "react";
import Link from "next/link"
import { ModelBackLink } from "@/components/model-back-link";
import { ArrowLeft, Users, TrendingUp, PieChart, DollarSign } from "lucide-react";
import {
  CapTableMechanicsModel,
  CapTableFormatInputs,
  PromoterInfo,
} from "@/lib/cap-table-mechanics-model";

const model = new CapTableMechanicsModel();

export default function CapTableFormatPage() {
  const [inputs, setInputs] = useState<CapTableFormatInputs>({
    authorizedCapital: 1000000,
    faceValue: 10,
    preMoneyValuation: 5000000,
    promoters: [
      { name: "Promoter 1", shares: 250000, investment: 500000 },
      { name: "Promoter 2", shares: 125000, investment: 250000 },
    ],
    angelInvestment: 1000000,
    vcInvestment: 1200000,
  });

  const [results, setResults] = useState(model.calculateOriginalAndDilution(inputs));

  const updatePromoter = (index: number, field: keyof PromoterInfo, value: string | number) => {
    const newPromoters = [...inputs.promoters];
    newPromoters[index] = { ...newPromoters[index], [field]: value };
    const newInputs = { ...inputs, promoters: newPromoters };
    setInputs(newInputs);
    setResults(model.calculateOriginalAndDilution(newInputs));
  };

  const addPromoter = () => {
    const newPromoters = [...inputs.promoters, { name: `Promoter ${inputs.promoters.length + 1}`, shares: 0, investment: 0 }];
    const newInputs = { ...inputs, promoters: newPromoters };
    setInputs(newInputs);
    setResults(model.calculateOriginalAndDilution(newInputs));
  };

  const removePromoter = (index: number) => {
    if (inputs.promoters.length <= 1) return;
    const newPromoters = inputs.promoters.filter((_, i) => i !== index);
    const newInputs = { ...inputs, promoters: newPromoters };
    setInputs(newInputs);
    setResults(model.calculateOriginalAndDilution(newInputs));
  };

  const handleInputChange = (field: keyof CapTableFormatInputs, value: number) => {
    const newInputs = { ...inputs, [field]: value };
    setInputs(newInputs);
    setResults(model.calculateOriginalAndDilution(newInputs));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <ModelBackLink modelSlug="cap-table-format" label="Back to Models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" />

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Cap Table Format</h1>
            <p className="text-muted-foreground">Original & Post-Investment Ownership Structure</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Inputs Section */}
        <div className="space-y-6">
          {/* Basic Settings */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Capital Structure
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Authorized Capital</label>
                <input
                  type="number"
                  value={inputs.authorizedCapital}
                  onChange={(e) => handleInputChange("authorizedCapital", Number(e.target.value))}
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Face Value (₹)</label>
                <input
                  type="number"
                  value={inputs.faceValue}
                  onChange={(e) => handleInputChange("faceValue", Number(e.target.value))}
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Pre-Money Valuation</label>
                <input
                  type="number"
                  value={inputs.preMoneyValuation}
                  onChange={(e) => handleInputChange("preMoneyValuation", Number(e.target.value))}
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Promoters */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Promoters
              </h3>
              <button
                onClick={addPromoter}
                className="text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
              >
                + Add Promoter
              </button>
            </div>
            <div className="space-y-3">
              {inputs.promoters.map((promoter, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={promoter.name}
                      onChange={(e) => updatePromoter(index, "name", e.target.value)}
                      placeholder="Name"
                      className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={promoter.shares}
                      onChange={(e) => updatePromoter(index, "shares", Number(e.target.value))}
                      placeholder="Shares"
                      className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={promoter.investment}
                      onChange={(e) => updatePromoter(index, "investment", Number(e.target.value))}
                      placeholder="Investment"
                      className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      onClick={() => removePromoter(index)}
                      className="text-sm text-danger hover:text-danger/80 px-2 py-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* New Investment */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              New Investment
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Angel Investment</label>
                <input
                  type="number"
                  value={inputs.angelInvestment}
                  onChange={(e) => handleInputChange("angelInvestment", Number(e.target.value))}
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">VC Investment</label>
                <input
                  type="number"
                  value={inputs.vcInvestment}
                  onChange={(e) => handleInputChange("vcInvestment", Number(e.target.value))}
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Original Cap Table */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Original Cap Table
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Total Promoter Shares</span>
                <span className="font-semibold">{results.original.totalPromoterShares.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Pre-Money Valuation</span>
                <span className="font-semibold">₹{results.original.preMoneyValuation.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Total Promoter Investment</span>
                <span className="font-semibold">₹{results.original.totalInvestment.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-3">Promoter Ownership</h4>
              <div className="space-y-2">
                {results.original.promoters.map((p, i) => (
                  <div key={i} className="flex justify-between py-2 px-3 bg-muted/30 rounded-lg">
                    <span>{p.name}</span>
                    <div className="text-right">
                      <span className="font-semibold">{p.ownershipPct}%</span>
                      <span className="text-muted-foreground text-sm ml-2">({p.shares.toLocaleString()} shares)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Post-Dilution */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              After Dilution (Angel + VC)
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Post-Money Valuation</span>
                <span className="font-bold text-primary">₹{results.postDilution.postMoneyValuation.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Total Shares Post-Dilution</span>
                <span className="font-semibold">{results.postDilution.totalShares.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between py-3 px-3 bg-muted/50 rounded-lg border border-success/30">
                <span>Promoters (Combined)</span>
                <span className="font-bold text-success">{results.postDilution.promoterOwnershipPct}%</span>
              </div>
              <div className="flex justify-between py-3 px-3 bg-muted/50 rounded-lg border border-amber-400/30">
                <span>Angel Investors</span>
                <span className="font-bold text-amber-400">{results.postDilution.angelOwnershipPct}%</span>
              </div>
              <div className="flex justify-between py-3 px-3 bg-muted/50 rounded-lg border border-blue-400/30">
                <span>VC Investors</span>
                <span className="font-bold text-blue-400">{results.postDilution.vcOwnershipPct}%</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Angel Shares:</span>
                  <span className="ml-2 font-medium">{results.postDilution.angelShares.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">VC Shares:</span>
                  <span className="ml-2 font-medium">{results.postDilution.vcShares.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ownership Chart */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-4">Ownership Visualization</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Promoters</span>
                  <span>{results.postDilution.promoterOwnershipPct}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full transition-all"
                    style={{ width: `${results.postDilution.promoterOwnershipPct}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Angel</span>
                  <span>{results.postDilution.angelOwnershipPct}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${results.postDilution.angelOwnershipPct}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>VC</span>
                  <span>{results.postDilution.vcOwnershipPct}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all"
                    style={{ width: `${results.postDilution.vcOwnershipPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
