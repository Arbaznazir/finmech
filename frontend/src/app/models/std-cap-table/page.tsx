"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link"
import { ModelBackLink } from "@/components/model-back-link";
import { ArrowLeft, PieChart, Save, RotateCcw, Plus, Trash2, Play } from "lucide-react";
import { FieldHint } from "@/components/FieldHint";
import { HintLabel } from "@/components/HintLabel";
import { standardHint } from "@/lib/standard-model-hints";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import {formatCurrency, formatChartCurrency} from "@/lib/utils";
import api from "@/lib/api";
import { loadModelResults, saveModelResults, clearModelResults } from "@/lib/model-link";
import { useSavedModel } from "@/lib/use-saved-model";
import { offerSmartResultsAfterCalculate } from "@/lib/smart-results";
import {
  buildCapTable,
  type InitialShareholder,
  type CapTableResults,
} from "@/lib/captable-model";

type TabView = "shareholders" | "rounds" | "exit";

const EMPTY_SHAREHOLDER: InitialShareholder = {
  name: "", role: "Founder", shares: 0, shareClass: "Common", investment: 0,
};
const EMPTY_ROUND = { roundName: "", investmentAmount: 0, pricePerShare: 0, shareClass: "Preferred" };

export default function StdCapTablePage() {
  const { user, hydrate } = useAuth();
  const [shareholders, setShareholders] = useState<InitialShareholder[]>([{ ...EMPTY_SHAREHOLDER }]);
  const [rounds, setRounds] = useState<{ roundName: string; investmentAmount: number; pricePerShare: number; shareClass: string }[]>([]);
  const [exitValue, setExitValue] = useState(0);
  const [results, setResults] = useState<CapTableResults | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>("shareholders");
  const [hubLinked, setHubLinked] = useState(false);

  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "std-cap-table",
    onLoad: (data: Record<string, unknown>) => {
      if (data.shareholders) setShareholders(data.shareholders as InitialShareholder[]);
      if (Array.isArray(data.rounds)) setRounds(data.rounds as typeof rounds);
      if (typeof data.exitValue === "number") setExitValue(data.exitValue);
    },
    getState: useCallback(() => ({ shareholders, rounds, exitValue }), [shareholders, rounds, exitValue]),
  });

  useEffect(() => {
    hydrate();
    const hub = loadModelResults<Record<string, number>>("std-common-utility");
    if (hub && hub.annualRevenue > 0) {
      setHubLinked(true);
    }
  }, [hydrate]);

  const handleCalculate = () => {
    const validSH = shareholders.filter((s) => s.name && s.shares > 0);
    if (validSH.length === 0) return;
    const result = buildCapTable(validSH, rounds, exitValue > 0 ? exitValue : undefined);
    setResults(result);
    offerSmartResultsAfterCalculate("std-cap-table", { shareholders: validSH, rounds, exitValue }, result);
    saveModelResults("std-cap-table", {
      totalShares: result.totalShares,
      shareholderCount: result.shareholders.length,
      roundCount: result.rounds.length,
    });
    persistState();
  };

  const handleReset = () => {
    setShareholders([{ ...EMPTY_SHAREHOLDER }]); setRounds([]); setExitValue(0);
    setResults(null); setHubLinked(false);
    clearModelResults("std-cap-table");
    clearPersisted();
  };

  const handleSave = async () => {
    if (!user || !results) return;
    try {
      await api.post("/calculations", { modelSlug: "std-cap-table", inputs: { shareholders, rounds, exitValue }, outputs: results });
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  const addShareholder = () => setShareholders((prev) => [...prev, { ...EMPTY_SHAREHOLDER }]);
  const removeShareholder = (i: number) => setShareholders((prev) => prev.filter((_, idx) => idx !== i));
  const updateShareholder = (i: number, key: keyof InitialShareholder, value: string | number) => {
    setShareholders((prev) => { const next = [...prev]; next[i] = { ...next[i], [key]: value }; return next; });
    markDirty();
  };
  const addRound = () => setRounds((prev) => [...prev, { ...EMPTY_ROUND }]);
  const removeRound = (i: number) => setRounds((prev) => prev.filter((_, idx) => idx !== i));
  const updateRound = (i: number, key: string, value: string | number) => {
    setRounds((prev) => { const next = [...prev]; next[i] = { ...next[i], [key]: value }; return next; });
    markDirty();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <ModelBackLink modelSlug="std-cap-table" label="Back to Models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors" />

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10">
            <PieChart className="h-7 w-7 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Cap Table Mechanics</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-primary/10 text-primary">Standard</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Track ownership with data integrated from Common Utility.
              <span className="text-blue-400 ml-2 text-xs font-medium">&larr; Common Utility</span>
            </p>
          </div>
        </div>
        {results && user && (
          <button onClick={handleSave} disabled={saving || saved}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${saved ? "bg-success/10 text-success" : "bg-primary/10 text-primary hover:bg-primary/20"}`}>
            <Save className="h-4 w-4" />
            {saved ? "Saved!" : saving ? "Saving..." : "Save Results"}
          </button>
        )}
      </div>

      {hubLinked && (
        <div className="rounded-xl bg-success/5 border border-success/20 p-3 mb-6">
          <p className="text-xs text-success font-medium">Common Utility data available — annual revenue context loaded.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 rounded-xl bg-card border border-border p-1 overflow-x-auto">
        {(["shareholders", "rounds", "exit"] as TabView[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors whitespace-nowrap ${activeTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}>
            {tab === "shareholders" ? "Shareholders" : tab === "rounds" ? "Funding Rounds" : "Exit Waterfall"}
          </button>
        ))}
      </div>

      {/* SHAREHOLDERS */}
      {activeTab === "shareholders" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold">Initial Shareholders (Promoters)</h2>
              <button onClick={addShareholder} className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/20 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add Shareholder
              </button>
            </div>
            <div className="space-y-3">
              {shareholders.map((sh, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_100px_120px_36px] gap-2 items-end rounded-lg bg-background/50 border border-border/50 p-3">
                  <div><label className="flex items-center text-xs text-muted-foreground mb-1">Name<FieldHint hint={{ what: "Full name of the shareholder — founder, co-founder, employee, or advisor.", why: "Identifies each person's stake for legal records and ROC filings.", how: "Use legal name matching PAN card. Listed in Form DIR-12 with ROC." }} /></label><input type="text" value={sh.name} onChange={(e) => updateShareholder(i, "name", e.target.value)} placeholder="Promoter 1" className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                  <div><label className="block text-xs text-muted-foreground mb-1">Role</label><select value={sh.role} onChange={(e) => updateShareholder(i, "role", e.target.value)} className="w-full rounded-lg border border-border bg-input px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option value="Founder">Founder</option><option value="Co-Founder">Co-Founder</option><option value="Advisor">Advisor</option><option value="Employee">Employee</option></select></div>
                  <div><label className="flex items-center text-xs text-muted-foreground mb-1">Shares{standardHint("shares") && <FieldHint hint={standardHint("shares")!} />}</label><input type="number" value={sh.shares || ""} onChange={(e) => updateShareholder(i, "shares", parseFloat(e.target.value) || 0)} placeholder="250000" className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                  <div><label className="block text-xs text-muted-foreground mb-1">Class</label><select value={sh.shareClass} onChange={(e) => updateShareholder(i, "shareClass", e.target.value)} className="w-full rounded-lg border border-border bg-input px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option value="Common">Common</option><option value="Preferred">Preferred</option></select></div>
                  <div><label className="flex items-center text-xs text-muted-foreground mb-1">Investment{standardHint("investment") && <FieldHint hint={standardHint("investment")!} />}</label><input type="number" value={sh.investment || ""} onChange={(e) => updateShareholder(i, "investment", parseFloat(e.target.value) || 0)} placeholder="500000" className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                  <button onClick={() => removeShareholder(i)} disabled={shareholders.length <= 1} className="rounded-lg border border-border p-2 hover:bg-danger/10 hover:text-danger transition-colors disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { handleCalculate(); setActiveTab("rounds"); }} disabled={shareholders.every((s) => !s.name || s.shares <= 0)} className="rounded-lg bg-primary px-8 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors disabled:opacity-50">Next: Funding Rounds</button>
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors"><RotateCcw className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* ROUNDS */}
      {activeTab === "rounds" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold">Funding Rounds</h2>
              <button onClick={addRound} className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/20 transition-colors"><Plus className="h-3.5 w-3.5" /> Add Round</button>
            </div>
            {rounds.length === 0 && <div className="text-center py-10 text-muted-foreground text-sm"><p>No funding rounds added yet.</p><p className="text-xs mt-1">Add a round or skip to exit waterfall.</p></div>}
            <div className="space-y-3">
              {rounds.map((round, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_140px_100px_36px] gap-2 items-end rounded-lg bg-background/50 border border-border/50 p-3">
                  <div><label className="flex items-center text-xs text-muted-foreground mb-1">Round Name{standardHint("roundName") && <FieldHint hint={standardHint("roundName")!} />}</label><input type="text" value={round.roundName} onChange={(e) => updateRound(i, "roundName", e.target.value)} placeholder="Angel Investor" className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                  <div><label className="flex items-center text-xs text-muted-foreground mb-1">Investment ($){standardHint("investmentAmount") && <FieldHint hint={standardHint("investmentAmount")!} />}</label><input type="number" value={round.investmentAmount || ""} onChange={(e) => updateRound(i, "investmentAmount", parseFloat(e.target.value) || 0)} placeholder="1000000" className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                  <div><label className="flex items-center text-xs text-muted-foreground mb-1">Price/Share ($){standardHint("pricePerShare") && <FieldHint hint={standardHint("pricePerShare")!} />}</label><input type="number" step="0.01" value={round.pricePerShare || ""} onChange={(e) => updateRound(i, "pricePerShare", parseFloat(e.target.value) || 0)} placeholder="2.00" className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                  <div><label className="block text-xs text-muted-foreground mb-1">Class</label><select value={round.shareClass} onChange={(e) => updateRound(i, "shareClass", e.target.value)} className="w-full rounded-lg border border-border bg-input px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option value="Preferred">Preferred</option><option value="Common">Common</option></select></div>
                  <button onClick={() => removeRound(i)} className="rounded-lg border border-border p-2 hover:bg-danger/10 hover:text-danger transition-colors"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
          {(() => {
            const preview = buildCapTable(shareholders.filter((s) => s.name && s.shares > 0), rounds.filter((r) => r.roundName && r.investmentAmount > 0 && r.pricePerShare > 0));
            return preview.shareholders.length > 0 ? (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-background/50"><h3 className="font-semibold text-sm">Current Ownership</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border bg-background/50"><th className="text-left px-4 py-2.5 text-muted-foreground font-semibold">Name</th><th className="text-left px-4 py-2.5 text-muted-foreground font-semibold">Role</th><th className="text-right px-4 py-2.5 text-muted-foreground font-semibold">Shares</th><th className="text-left px-4 py-2.5 text-muted-foreground font-semibold">Class</th><th className="text-right px-4 py-2.5 text-muted-foreground font-semibold">Ownership</th><th className="text-right px-4 py-2.5 text-muted-foreground font-semibold">Investment</th></tr></thead>
                    <tbody>
                      {preview.shareholders.map((s, i) => (
                        <tr key={i} className="border-b border-border/30"><td className="px-4 py-2.5 font-medium">{s.name}</td><td className="px-4 py-2.5 text-muted-foreground">{s.role}</td><td className="text-right px-4 py-2.5">{s.shares.toLocaleString()}</td><td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded ${s.shareClass === "Common" ? "bg-blue-400/10 text-blue-400" : "bg-purple-400/10 text-purple-400"}`}>{s.shareClass}</span></td><td className="text-right px-4 py-2.5 font-semibold">{s.ownershipPct.toFixed(1)}%</td><td className="text-right px-4 py-2.5">{formatCurrency(s.investment)}</td></tr>
                      ))}
                      <tr className="bg-background/50 font-semibold"><td className="px-4 py-2.5">Total</td><td /><td className="text-right px-4 py-2.5">{preview.totalShares.toLocaleString()}</td><td /><td className="text-right px-4 py-2.5">100.0%</td><td className="text-right px-4 py-2.5">{formatCurrency(preview.shareholders.reduce((s, sh) => s + sh.investment, 0))}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null;
          })()}
          <div className="flex gap-3">
            <button onClick={() => { handleCalculate(); setActiveTab("exit"); }} className="rounded-lg bg-primary px-8 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">Next: Exit Waterfall</button>
          </div>
        </div>
      )}

      {/* EXIT */}
      {activeTab === "exit" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <h2 className="font-semibold mb-4">Exit Scenario</h2>
            <div className="max-w-sm">
              <label className="flex items-center text-xs text-muted-foreground mb-1">Exit Value ($){standardHint("exitValue") && <FieldHint hint={standardHint("exitValue")!} />}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                <input type="number" value={exitValue || ""} onChange={(e) => { setExitValue(parseFloat(e.target.value) || 0); markDirty(); }} placeholder="30000000" className="w-full rounded-lg border border-border bg-input pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
            <button onClick={handleCalculate} disabled={exitValue <= 0} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors disabled:opacity-50">
              <Play className="h-4 w-4" /> Run Exit Waterfall
            </button>
          </div>
          {results?.exit && (
            <>
              <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 text-center output-panel-primary">
                <p className="text-sm text-muted-foreground mb-2">Exit Value</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(results.exit.exitValue)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-background/50"><h3 className="font-semibold text-sm">Exit Waterfall — Payouts</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border bg-background/50"><th className="text-left px-4 py-2.5 text-muted-foreground font-semibold">Shareholder</th><th className="text-left px-4 py-2.5 text-muted-foreground font-semibold">Role</th><th className="text-right px-4 py-2.5 text-muted-foreground font-semibold">Shares</th><th className="text-right px-4 py-2.5 text-muted-foreground font-semibold">Ownership</th><th className="text-right px-4 py-2.5 text-muted-foreground font-semibold">Investment</th><th className="text-right px-4 py-2.5 text-muted-foreground font-semibold">Payout</th><th className="text-right px-4 py-2.5 text-muted-foreground font-semibold">Multiple</th></tr></thead>
                    <tbody>
                      {results.exit.payouts.map((p, i) => (
                        <tr key={i} className="border-b border-border/30"><td className="px-4 py-2.5 font-medium">{p.name}</td><td className="px-4 py-2.5 text-muted-foreground">{p.role}</td><td className="text-right px-4 py-2.5">{p.shares.toLocaleString()}</td><td className="text-right px-4 py-2.5">{p.ownershipPct.toFixed(1)}%</td><td className="text-right px-4 py-2.5">{formatCurrency(p.investment)}</td><td className="text-right px-4 py-2.5 font-semibold text-success">{formatCurrency(p.payout)}</td><td className="text-right px-4 py-2.5"><span className={`font-semibold ${p.multiple !== null && p.multiple >= 1 ? "text-success" : "text-muted-foreground"}`}>{p.multiple !== null ? p.multiple.toFixed(2) + "x" : "N/A"}</span></td></tr>
                      ))}
                      <tr className="bg-background/50 font-semibold"><td className="px-4 py-2.5">Total</td><td /><td className="text-right px-4 py-2.5">{results.exit.totalShares.toLocaleString()}</td><td className="text-right px-4 py-2.5">100.0%</td><td className="text-right px-4 py-2.5">{formatCurrency(results.exit.payouts.reduce((s, p) => s + p.investment, 0))}</td><td className="text-right px-4 py-2.5 text-success">{formatCurrency(results.exit.exitValue)}</td><td /></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          {!results?.exit && <div className="text-center py-16 text-muted-foreground text-sm">Enter an exit value and click Run Exit Waterfall.</div>}
        </div>
      )}

      {!user && results && (
        <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <p className="text-muted-foreground mb-3">Sign up to save your Cap Table</p>
          <Link href="/signup" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">Create Free Account</Link>
        </div>
      )}

      {/* ============ CHARTS ============ */}
      {results && results.shareholders.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Ownership Distribution Pie */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Ownership Distribution</h3>
            <ReactECharts
              style={{ height: 260 }}
              option={{
                tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                series: [{
                  type: "pie", radius: ["35%", "65%"], center: ["50%", "50%"],
                  label: { color: "#ccc", fontSize: 10, formatter: "{b}\n{d}%" },
                  data: results.shareholders.map((s, i) => ({
                    value: s.ownershipPct,
                    name: s.name,
                    itemStyle: { color: ["#60a5fa", "#34d399", "#f59e0b", "#a78bfa", "#ec4899", "#22d3ee", "#84cc16", "#ef4444"][i % 8] },
                  })),
                }],
              }}
            />
          </div>

          {/* Investment by Shareholder Bar */}
          <div className="rounded-2xl border border-border bg-card p-5 output-panel">
            <h3 className="font-semibold text-sm mb-3">Investment by Shareholder</h3>
            <ReactECharts
              style={{ height: 260 }}
              option={{
                tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                grid: { top: 15, right: 15, bottom: 40, left: 55 },
                xAxis: { type: "category", data: results.shareholders.map(s => s.name), axisLabel: { color: "#888", fontSize: 9, rotate: 20 }, axisLine: { lineStyle: { color: "#333" } } },
                yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => formatChartCurrency(v) }, splitLine: { lineStyle: { color: "#222" } } },
                series: [{
                  type: "bar", barWidth: 28,
                  data: results.shareholders.map((s, i) => ({
                    value: s.investment,
                    itemStyle: { color: ["#60a5fa", "#34d399", "#f59e0b", "#a78bfa", "#ec4899", "#22d3ee", "#84cc16", "#ef4444"][i % 8], borderRadius: [4, 4, 0, 0] },
                  })),
                  label: { show: true, position: "top", color: "#aaa", fontSize: 9, formatter: (p: any) => formatChartCurrency(p.value) },
                }],
              }}
            />
          </div>

          {/* Exit Payout Waterfall */}
          {results.exit && results.exit.payouts.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">Exit Payouts</h3>
              <ReactECharts
                style={{ height: 240 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  grid: { top: 15, right: 15, bottom: 40, left: 55 },
                  xAxis: { type: "category", data: results.exit.payouts.map(p => p.name), axisLabel: { color: "#888", fontSize: 9, rotate: 20 }, axisLine: { lineStyle: { color: "#333" } } },
                  yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: (v: number) => formatChartCurrency(v) }, splitLine: { lineStyle: { color: "#222" } } },
                  series: [{
                    type: "bar", barWidth: 28,
                    data: results.exit.payouts.map((p, i) => ({
                      value: p.payout,
                      itemStyle: { color: ["#60a5fa", "#34d399", "#f59e0b", "#a78bfa", "#ec4899", "#22d3ee"][i % 6], borderRadius: [4, 4, 0, 0] },
                    })),
                    label: { show: true, position: "top", color: "#aaa", fontSize: 9, formatter: (p: any) => formatChartCurrency(p.value) },
                  }],
                }}
              />
            </div>
          )}

          {/* ROI Multiple Bar */}
          {results.exit && results.exit.payouts.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 output-panel">
              <h3 className="font-semibold text-sm mb-3">ROI Multiple</h3>
              <ReactECharts
                style={{ height: 240 }}
                option={{
                  tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                  grid: { top: 15, right: 15, bottom: 40, left: 55 },
                  xAxis: { type: "category", data: results.exit.payouts.map(p => p.name), axisLabel: { color: "#888", fontSize: 9, rotate: 20 }, axisLine: { lineStyle: { color: "#333" } } },
                  yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 10, formatter: "{value}x" }, splitLine: { lineStyle: { color: "#222" } } },
                  series: [{
                    type: "bar", barWidth: 28,
                    data: results.exit.payouts.map((p, i) => ({
                      value: p.multiple ?? 0,
                      itemStyle: { color: (p.multiple ?? 0) >= 1 ? "#34d399" : "#ef4444", borderRadius: [4, 4, 0, 0] },
                    })),
                    markLine: { data: [{ yAxis: 1, lineStyle: { color: "#f59e0b", type: "dashed" } }], label: { formatter: "1x", color: "#f59e0b", fontSize: 9 }, symbol: "none" },
                    label: { show: true, position: "top", color: "#aaa", fontSize: 9, formatter: (p: any) => `${p.value.toFixed(1)}x` },
                  }],
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
