"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft, PieChart, RotateCcw, Plus, TrendingUp, Calculator, FileText, Download,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { useSavedModel } from "@/lib/use-saved-model";
import { CapTableMechanicsModel, type Round, type ExitResult } from "@/lib/cap-table-mechanics-model";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type TabView = "simulation" | "original";

// Create singleton model instance
const model = new CapTableMechanicsModel();

export default function CapTablePage() {
  const { user, hydrate } = useAuth();
  const [activeTab, setActiveTab] = useState<TabView>("simulation");
  
  // Simulation state
  const [rounds, setRounds] = useState<Round[]>([]);
  const [exitValue, setExitValue] = useState(30000000);
  const [result, setResult] = useState<ExitResult | null>(null);
  
  // Add round form
  const [newRound, setNewRound] = useState({ name: "", preMoney: "", investment: "" });
  
  // 7-input quick form
  const [quickInputs, setQuickInputs] = useState({
    preSeed: 2000000,
    invSeed: 500000,
    preA: 8000000,
    invA: 3000000,
    preB: 25000000,
    invB: 10000000,
    exitVal: 100000000,
  });

  const { save: persistState, reset: clearPersisted } = useSavedModel({
    modelSlug: "cap-table",
    onLoad: (data: Record<string, unknown>) => {
      if (data.rounds) {
        setRounds(data.rounds as Round[]);
        // Restore model state
        model.reset();
        (data.rounds as Round[]).forEach((r) => {
          model.addRound(r.roundName, r.preMoney, r.investment);
        });
      }
      if (typeof data.exitValue === "number") setExitValue(data.exitValue);
    },
    getState: useCallback(() => ({ rounds, exitValue }), [rounds, exitValue]),
  });

  useEffect(() => { hydrate(); }, [hydrate]);

  const addRound = () => {
    if (!newRound.name || !newRound.preMoney || !newRound.investment) return;

    model.addRound(
      newRound.name,
      Number(newRound.preMoney),
      Number(newRound.investment)
    );

    setRounds([...model.rounds]);
    setNewRound({ name: "", preMoney: "", investment: "" });
  };

  const runExit = () => {
    const res = model.runExit(exitValue);
    setResult(res);
    persistState();
  };

  const runQuickCalculate = () => {
    model.reset();
    model.addRound("Seed", quickInputs.preSeed, quickInputs.invSeed);
    model.addRound("Series A", quickInputs.preA, quickInputs.invA);
    model.addRound("Series B", quickInputs.preB, quickInputs.invB);
    setRounds([...model.rounds]);
    setExitValue(quickInputs.exitVal);
    const res = model.runExit(quickInputs.exitVal);
    setResult(res);
    persistState();
  };

  const loadTemplate = () => {
    model.reset();
    model.addRound("Seed", 2000000, 500000);
    model.addRound("Series A", 8000000, 3000000);
    model.addRound("Series B", 25000000, 10000000);
    setRounds([...model.rounds]);
    setExitValue(100000000);
    setResult(null);
  };

  const resetAll = () => {
    model.reset();
    setRounds([]);
    setResult(null);
    setExitValue(30000000);
    setNewRound({ name: "", preMoney: "", investment: "" });
    clearPersisted();
  };

  // PDF Export function
  const exportToPDF = () => {
    if (!result) return;
    
    const content = `
CAP TABLE MECHANICS REPORT
==========================

Generated: ${new Date().toLocaleString()}
Exit Value: ${formatCurrency(result.exitValue)}
Total Shares: ${result.totalShares.toLocaleString()}

FINAL OWNERSHIP
---------------
${Object.entries(result.ownership).map(([key, pct]) => 
  `${key}: ${(pct * 100).toFixed(2)}%`
).join('\n')}

PAYOUT WATERFALL
----------------
${Object.entries(result.waterfall).map(([key, data]) => 
  `${key}: ${formatCurrency(data.payout)} (${data.ownershipPct}%)`
).join('\n')}

FUNDING ROUNDS
--------------
${rounds.map((r, i) => `
Round ${i + 1}: ${r.roundName}
  Pre-Money: ${formatCurrency(r.preMoney)}
  Investment: ${formatCurrency(r.investment)}
  Post-Money: ${formatCurrency(r.postMoney)}
  Price/Share: ₹${r.pricePerShare}
  New Shares: ${r.newShares.toLocaleString()}
  Total Shares: ${r.totalShares.toLocaleString()}
`).join('\n')}

---
FinMech - Cap Table Mechanics
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cap-table-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Chart options for ownership pie chart
  const getOwnershipChartOption = () => {
    if (!result) return {};
    return {
      title: {
        text: 'Final Ownership Distribution',
        left: 'center',
        textStyle: { color: '#fff', fontSize: 16 }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {d}%'
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        textStyle: { color: '#aaa' }
      },
      series: [
        {
          name: 'Ownership',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#1a1a1a',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            color: '#fff'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold'
            }
          },
          data: Object.entries(result.ownership).map(([name, value]) => ({
            name,
            value: Number((value * 100).toFixed(2))
          }))
        }
      ]
    };
  };

  // Chart options for payout bar chart
  const getPayoutChartOption = () => {
    if (!result) return {};
    return {
      title: {
        text: 'Exit Payout Distribution',
        left: 'center',
        textStyle: { color: '#fff', fontSize: 16 }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          return `${params[0].name}: ${formatCurrency(params[0].value * 100000)}`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: Object.keys(result.waterfall),
        axisLabel: { color: '#aaa', rotate: 30 },
        axisLine: { lineStyle: { color: '#444' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { 
          color: '#aaa',
          formatter: (value: number) => `₹${value}L`
        },
        axisLine: { lineStyle: { color: '#444' } },
        splitLine: { lineStyle: { color: '#333' } }
      },
      series: [
        {
          name: 'Payout',
          type: 'bar',
          barWidth: '60%',
          data: Object.values(result.waterfall).map(w => Math.round(w.payout / 100000)),
          itemStyle: {
            color: '#22c55e',
            borderRadius: [8, 8, 0, 0]
          }
        }
      ]
    };
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <Link href="/models?tier=standalone" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-cyan-400/10">
            <PieChart className="h-7 w-7 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Cap Table Mechanics</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-blue-400/10 text-blue-400">
                Standalone
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              Initial cap table → Funding rounds → Dilution → Exit waterfall + payouts.
            </p>
          </div>
        </div>
        <button onClick={resetAll} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors inline-flex items-center gap-2">
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </div>

      {/* Tabs - Two clean tabs as requested */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setActiveTab("simulation")}
          className={`flex items-center gap-2 px-6 py-3 font-medium rounded-t-xl border-b-2 transition-all ${
            activeTab === "simulation" 
              ? "bg-primary text-primary-foreground border-primary" 
              : "bg-card border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calculator className="h-4 w-4" />
          Round Simulation & Exit
        </button>
        <button
          onClick={() => setActiveTab("original")}
          className={`flex items-center gap-2 px-6 py-3 font-medium rounded-t-xl border-b-2 transition-all ${
            activeTab === "original" 
              ? "bg-primary text-primary-foreground border-primary" 
              : "bg-card border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          Original Cap Table
        </button>
      </div>

      {/* ==================== TAB 1: ROUND SIMULATION & EXIT ==================== */}
      {activeTab === "simulation" && (
        <div className="space-y-8">
          {/* Quick 7-Input Calculator */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Quick Calculator (7 Inputs)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Seed Pre-Money</label>
                <input
                  type="number"
                  value={quickInputs.preSeed}
                  onChange={(e) => setQuickInputs({ ...quickInputs, preSeed: Number(e.target.value) })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Seed Investment</label>
                <input
                  type="number"
                  value={quickInputs.invSeed}
                  onChange={(e) => setQuickInputs({ ...quickInputs, invSeed: Number(e.target.value) })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Series A Pre-Money</label>
                <input
                  type="number"
                  value={quickInputs.preA}
                  onChange={(e) => setQuickInputs({ ...quickInputs, preA: Number(e.target.value) })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Series A Investment</label>
                <input
                  type="number"
                  value={quickInputs.invA}
                  onChange={(e) => setQuickInputs({ ...quickInputs, invA: Number(e.target.value) })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Series B Pre-Money</label>
                <input
                  type="number"
                  value={quickInputs.preB}
                  onChange={(e) => setQuickInputs({ ...quickInputs, preB: Number(e.target.value) })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Series B Investment</label>
                <input
                  type="number"
                  value={quickInputs.invB}
                  onChange={(e) => setQuickInputs({ ...quickInputs, invB: Number(e.target.value) })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Exit Value</label>
                <input
                  type="number"
                  value={quickInputs.exitVal}
                  onChange={(e) => setQuickInputs({ ...quickInputs, exitVal: Number(e.target.value) })}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={runQuickCalculate}
                  className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors"
                >
                  Calculate All
                </button>
              </div>
            </div>
            <button
              onClick={loadTemplate}
              className="text-xs text-muted-foreground hover:text-primary underline"
            >
              Load Template (3 rounds + ₹30M exit)
            </button>
          </div>

          {/* Step-by-Step Round Builder */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add Rounds Step-by-Step
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <input
                type="text"
                placeholder="Round Name (e.g. Seed)"
                className="bg-input p-3 rounded-xl border border-border"
                value={newRound.name}
                onChange={(e) => setNewRound({ ...newRound, name: e.target.value })}
              />
              <input
                type="number"
                placeholder="Pre-Money Valuation"
                className="bg-input p-3 rounded-xl border border-border"
                value={newRound.preMoney}
                onChange={(e) => setNewRound({ ...newRound, preMoney: e.target.value })}
              />
              <input
                type="number"
                placeholder="Investment Amount"
                className="bg-input p-3 rounded-xl border border-border"
                value={newRound.investment}
                onChange={(e) => setNewRound({ ...newRound, investment: e.target.value })}
              />
              <button
                onClick={addRound}
                disabled={!newRound.name || !newRound.preMoney || !newRound.investment}
                className="bg-primary hover:bg-accent disabled:opacity-50 rounded-xl font-medium text-primary-foreground"
              >
                + Add Round
              </button>
            </div>
          </div>

          {/* Current Rounds Table */}
          {rounds.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-xl font-semibold mb-4">Cap Table Evolution</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background/50">
                      <th className="text-left py-3 px-4">Round</th>
                      <th className="text-right py-3 px-4">Pre-Money</th>
                      <th className="text-right py-3 px-4">Investment</th>
                      <th className="text-right py-3 px-4">Post-Money</th>
                      <th className="text-right py-3 px-4">Price/Share</th>
                      <th className="text-right py-3 px-4">New Shares</th>
                      <th className="text-right py-3 px-4">Total Shares</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/30">
                      <td className="py-3 px-4 font-medium">Founders</td>
                      <td className="text-right py-3 px-4">—</td>
                      <td className="text-right py-3 px-4">—</td>
                      <td className="text-right py-3 px-4">—</td>
                      <td className="text-right py-3 px-4">—</td>
                      <td className="text-right py-3 px-4">200,000</td>
                      <td className="text-right py-3 px-4 font-mono">200,000</td>
                    </tr>
                    {rounds.map((r, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="py-3 px-4 font-medium">{r.roundName}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(r.preMoney)}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(r.investment)}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(r.postMoney)}</td>
                        <td className="text-right py-3 px-4">₹{r.pricePerShare}</td>
                        <td className="text-right py-3 px-4">{r.newShares.toLocaleString()}</td>
                        <td className="text-right py-3 px-4 font-mono">{r.totalShares.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Ownership Progression */}
              <div className="mt-6">
                <h4 className="font-medium mb-3 text-muted-foreground">Ownership After Each Round</h4>
                <div className="space-y-2">
                  <div className="flex justify-between bg-background/50 p-3 rounded-xl">
                    <span>Founders</span>
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">Start: 100%</span>
                      {rounds.map((r, i) => (
                        <span key={i} className="text-primary">
                          After {r.roundName}: {(r.ownership.Founders * 100).toFixed(2)}%
                        </span>
                      ))}
                    </div>
                  </div>
                  {rounds.map((r) => (
                    <div key={r.roundName} className="flex justify-between bg-primary/5 p-3 rounded-xl border border-primary/20">
                      <span>{r.roundName} Investors</span>
                      <span className="font-mono font-semibold">{(r.ownership[r.roundName] * 100).toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Exit Section */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Exit Waterfall
            </h3>
            <div className="flex gap-4 items-end mb-6">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground block mb-2">Exit Value</label>
                <input
                  type="number"
                  value={exitValue}
                  onChange={(e) => setExitValue(Number(e.target.value))}
                  className="w-full bg-input p-4 rounded-xl border border-border text-2xl font-mono"
                />
              </div>
              <button
                onClick={runExit}
                disabled={rounds.length === 0}
                className="px-8 py-4 bg-primary hover:bg-accent disabled:opacity-50 rounded-xl font-semibold text-lg text-primary-foreground"
              >
                Run Exit Simulation
              </button>
            </div>

            {/* Exit Results */}
            {result && (
              <>
                {/* Export Button */}
                <div className="flex justify-end mb-4">
                  <button
                    onClick={exportToPDF}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary/10 text-primary px-4 py-2 text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Export Report
                  </button>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Ownership Pie Chart */}
                  <div className="rounded-xl bg-background/50 p-4">
                    <h4 className="font-medium mb-3 text-muted-foreground flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      Ownership Distribution
                    </h4>
                    <div className="h-64">
                      <ReactECharts option={getOwnershipChartOption()} style={{ height: '100%' }} />
                    </div>
                  </div>

                  {/* Payout Bar Chart */}
                  <div className="rounded-xl bg-background/50 p-4">
                    <h4 className="font-medium mb-3 text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Payout Distribution
                    </h4>
                    <div className="h-64">
                      <ReactECharts option={getPayoutChartOption()} style={{ height: '100%' }} />
                    </div>
                  </div>
                </div>

                {/* Data Tables Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Final Ownership Table */}
                  <div className="rounded-xl bg-background/50 p-4">
                    <h4 className="font-medium mb-3 text-muted-foreground">Final Ownership</h4>
                    <div className="space-y-2">
                      {Object.entries(result.ownership).map(([key, pct]) => (
                        <div key={key} className="flex justify-between p-3 bg-card rounded-xl">
                          <span>{key}</span>
                          <span className="font-mono font-semibold">{(pct * 100).toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payout Waterfall Table */}
                  <div className="rounded-xl bg-background/50 p-4">
                    <h4 className="font-medium mb-3 text-muted-foreground">Payout Waterfall @ {formatCurrency(result.exitValue)}</h4>
                    <div className="space-y-2">
                      {Object.entries(result.waterfall).map(([key, data]) => (
                        <div key={key} className="flex justify-between p-3 bg-card rounded-xl">
                          <span>{key}</span>
                          <div className="text-right">
                            <div className="font-mono text-success font-semibold">{formatCurrency(data.payout)}</div>
                            <div className="text-xs text-muted-foreground">{data.ownershipPct}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 2: ORIGINAL CAP TABLE ==================== */}
      {activeTab === "original" && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-2xl font-bold mb-6">Original Cap Table</h2>
          <p className="text-muted-foreground mb-6">
            Static view of the initial cap table structure before any funding rounds.
          </p>

          {/* Founders Table */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="text-left py-3 px-4">Shareholder</th>
                  <th className="text-left py-3 px-4">Role</th>
                  <th className="text-right py-3 px-4">Shares</th>
                  <th className="text-right py-3 px-4">Ownership</th>
                  <th className="text-right py-3 px-4">Investment</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/30">
                  <td className="py-3 px-4 font-medium">Founders</td>
                  <td className="py-3 px-4">Promoter</td>
                  <td className="text-right py-3 px-4 font-mono">200,000</td>
                  <td className="text-right py-3 px-4 font-semibold">100.00%</td>
                  <td className="text-right py-3 px-4">—</td>
                </tr>
                <tr className="bg-background/50 font-semibold">
                  <td className="py-3 px-4">Total</td>
                  <td className="py-3 px-4" />
                  <td className="text-right py-3 px-4 font-mono">200,000</td>
                  <td className="text-right py-3 px-4">100.00%</td>
                  <td className="text-right py-3 px-4">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Share Structure */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl bg-background/50 p-4 text-center">
              <div className="text-3xl font-bold text-primary">200,000</div>
              <div className="text-sm text-muted-foreground mt-1">Founder Shares</div>
            </div>
            <div className="rounded-xl bg-background/50 p-4 text-center">
              <div className="text-3xl font-bold text-primary">1</div>
              <div className="text-sm text-muted-foreground mt-1">Share Classes</div>
            </div>
            <div className="rounded-xl bg-background/50 p-4 text-center">
              <div className="text-3xl font-bold text-primary">100%</div>
              <div className="text-sm text-muted-foreground mt-1">Founder Ownership</div>
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
            <p>
              This represents the starting point. Use the "Round Simulation & Exit" tab to 
              add funding rounds and see how dilution affects founder ownership.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
