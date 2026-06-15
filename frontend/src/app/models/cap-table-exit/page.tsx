"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, DollarSign, PieChart, Users, Gem } from "lucide-react";
import {
  CapTableMechanicsModel,
  RoundInput,
} from "@/lib/cap-table-mechanics-model";

const model = new CapTableMechanicsModel();

export default function CapTableExitPage() {
  const [exitValue, setExitValue] = useState(30000000);
  const [rounds, setRounds] = useState<RoundInput[]>([
    { roundName: "Seed", preMoney: 2000000, investment: 500000 },
    { roundName: "Series A", preMoney: 5000000, investment: 2000000 },
    { roundName: "Series B", preMoney: 12000000, investment: 5000000 },
  ]);

  const [results, setResults] = useState(model.simulateExit(rounds, exitValue));

  const updateRound = (index: number, field: keyof RoundInput, value: string | number) => {
    const newRounds = [...rounds];
    newRounds[index] = { ...newRounds[index], [field]: value };
    setRounds(newRounds);
    setResults(model.simulateExit(newRounds, exitValue));
  };

  const addRound = () => {
    const newRounds = [...rounds, { roundName: `Round ${rounds.length + 1}`, preMoney: 0, investment: 0 }];
    setRounds(newRounds);
    setResults(model.simulateExit(newRounds, exitValue));
  };

  const removeRound = (index: number) => {
    if (rounds.length <= 1) return;
    const newRounds = rounds.filter((_, i) => i !== index);
    setRounds(newRounds);
    setResults(model.simulateExit(newRounds, exitValue));
  };

  const handleExitValueChange = (value: number) => {
    setExitValue(value);
    setResults(model.simulateExit(rounds, value));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <Link href="/models?tier=standalone" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Cap Table Exit Simulation</h1>
            <p className="text-muted-foreground">Funding Rounds & Exit Waterfall Analysis</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Inputs Section */}
        <div className="space-y-6">
          {/* Exit Value */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Gem className="h-5 w-5 text-primary" />
              Exit Scenario
            </h3>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Exit Value</label>
              <input
                type="number"
                value={exitValue}
                onChange={(e) => handleExitValueChange(Number(e.target.value))}
                className="w-full bg-background border border-primary/30 rounded-lg px-4 py-3 text-2xl font-bold"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Total company valuation at exit event (IPO/Acquisition)
              </p>
            </div>
          </div>

          {/* Funding Rounds */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Funding Rounds
              </h3>
              <button
                onClick={addRound}
                className="text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors"
              >
                + Add Round
              </button>
            </div>
            <div className="space-y-4">
              {rounds.map((round, index) => (
                <div key={index} className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="text"
                      value={round.roundName}
                      onChange={(e) => updateRound(index, "roundName", e.target.value)}
                      className="font-semibold bg-transparent border-b border-border focus:border-primary outline-none"
                    />
                    <button
                      onClick={() => removeRound(index)}
                      className="text-xs text-danger hover:text-danger/80"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Pre-Money</label>
                      <input
                        type="number"
                        value={round.preMoney}
                        onChange={(e) => updateRound(index, "preMoney", Number(e.target.value))}
                        className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Investment</label>
                      <input
                        type="number"
                        value={round.investment}
                        onChange={(e) => updateRound(index, "investment", Number(e.target.value))}
                        className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {/* Round Summary */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Funding Rounds Summary
            </h3>
            <div className="space-y-3">
              {results.rounds.map((round, index) => (
                <div key={index} className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{round.roundName}</span>
                    <span className="text-sm text-muted-foreground">{round.foundersPct}% founders</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Pre:</span>
                      <span className="ml-1">₹{(round.preMoney / 1000000).toFixed(1)}M</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Invest:</span>
                      <span className="ml-1">₹{(round.investment / 1000000).toFixed(1)}M</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Price/Share:</span>
                      <span className="ml-1">₹{round.pricePerShare}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    New Shares: {round.newShares.toLocaleString()} | Total: {round.totalShares.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exit Waterfall */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Exit Waterfall @ ₹{(exitValue / 10000000).toFixed(1)}Cr
            </h3>
            <div className="space-y-2">
              {results.waterfall.map((item, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-center p-4 rounded-lg ${
                    index === 0
                      ? "bg-success/10 border border-success/30"
                      : "bg-muted/50 border border-border"
                  }`}
                >
                  <div>
                    <span className={index === 0 ? "font-bold text-success" : "font-medium"}>
                      {item.stakeholder}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">({item.ownership}%)</span>
                  </div>
                  <span className={`font-bold ${index === 0 ? "text-success text-lg" : ""}`}>
                    ₹{item.payout.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Founder Summary */}
          <div className="rounded-2xl border border-success/30 bg-success/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-6 w-6 text-success" />
              <h3 className="font-semibold">Founders Summary</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Final Ownership</span>
                <span className="font-bold text-success">{results.founderOwnership}%</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Total Shares</span>
                <span className="font-semibold">{results.totalShares.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Exit Payout</span>
                <span className="font-bold text-success text-xl">₹{results.totalFounderPayout.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Ownership Evolution */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold mb-4">Founder Ownership Evolution</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span>Start (Founders Only)</span>
                <span className="font-semibold">100%</span>
              </div>
              {results.rounds.map((round, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <span>After {round.roundName}</span>
                  <span className="font-semibold text-amber-400">{round.foundersPct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
