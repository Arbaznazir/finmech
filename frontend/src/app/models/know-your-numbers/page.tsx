"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, BarChart3, Save, RotateCcw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import { useAuth } from "@/lib/store";
import api from "@/lib/api";
import { useSavedModel } from "@/lib/use-saved-model";
import {
  QUESTIONS,
  SECTIONS,
  calculateChecklist,
  type ChecklistResponse,
  type ChecklistResults,
} from "@/lib/checklist-model";

const RESPONSE_OPTIONS: { value: ChecklistResponse; label: string; color: string }[] = [
  { value: "Yes", label: "Yes", color: "bg-success/10 text-success border-success/30 hover:bg-success/20" },
  { value: "Partial", label: "Partial", color: "bg-amber-400/10 text-amber-400 border-amber-400/30 hover:bg-amber-400/20" },
  { value: "No", label: "No", color: "bg-danger/10 text-danger border-danger/30 hover:bg-danger/20" },
];

export default function KnowYourNumbersPage() {
  const { user, hydrate } = useAuth();
  const [answers, setAnswers] = useState<Record<string, ChecklistResponse>>({});
  const [results, setResults] = useState<ChecklistResults | null>(null);
  const { save: persistState, reset: clearPersisted, saving, saved, markDirty } = useSavedModel({
    modelSlug: "know-your-numbers",
    onLoad: (data: Record<string, unknown>) => {
      if (data.answers) setAnswers(data.answers as Record<string, ChecklistResponse>);
    },
    getState: useCallback(() => ({ answers }), [answers]),
  });

  useEffect(() => { hydrate(); }, [hydrate]);

  const handleAnswer = (qId: string, response: ChecklistResponse) => {
    setAnswers((prev) => ({ ...prev, [qId]: response }));
    markDirty();
  };

  const handleCalculate = () => setResults(calculateChecklist(answers));

  const handleReset = () => { setAnswers({}); setResults(null); clearPersisted(); };

  const handleSave = async () => {
    if (!user || !results) return;
    try {
      await api.post("/calculations", { modelSlug: "know-your-numbers", inputs: answers, outputs: results });
      await persistState();
    } catch (err) { console.error("Failed to save:", err); }
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = QUESTIONS.length;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models?tier=free" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-violet-400/10">
            <BarChart3 className="h-7 w-7 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Know Your Business Numbers</h1>
              <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-green-400/10 text-green-400">Free</span>
            </div>
            <p className="text-muted-foreground mt-1">
              Answer {totalQuestions} questions across 8 categories to assess your financial readiness.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {answeredCount} of {totalQuestions} answered
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

      {/* Questions by section */}
      {!results && (
        <div className="space-y-6">
          {SECTIONS.map((section) => {
            const sectionQs = QUESTIONS.filter((q) => q.section === section);
            return (
              <div key={section} className="rounded-2xl border border-border bg-card p-6 output-panel">
                <h2 className="font-semibold mb-4">{section}</h2>
                <div className="space-y-4">
                  {sectionQs.map((q) => (
                    <div key={q.id} className="rounded-lg bg-background/50 border border-border/50 p-4">
                      <p className="text-sm mb-3">{q.text}</p>
                      <div className="flex gap-2">
                        {RESPONSE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handleAnswer(q.id, opt.value)}
                            className={`rounded-lg border px-4 py-1.5 text-xs font-semibold transition-colors ${
                              answers[q.id] === opt.value
                                ? opt.color + " ring-2 ring-offset-1 ring-offset-background"
                                : "border-border hover:bg-muted text-muted-foreground"
                            } ${answers[q.id] === opt.value ? opt.color : ""}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="flex gap-3">
            <button
              onClick={handleCalculate}
              disabled={answeredCount === 0}
              className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors disabled:opacity-50"
            >
              Calculate Readiness Score
            </button>
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Hero status */}
          <div className={`rounded-2xl border-2 p-8 text-center ${
            results.statusColor === "green" ? "border-success/30 bg-success/5" :
            results.statusColor === "amber" ? "border-amber-400/30 bg-amber-400/5" :
            "border-danger/30 bg-danger/5"
          }`}>
            {results.statusColor === "green" && <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />}
            {results.statusColor === "amber" && <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-3" />}
            {results.statusColor === "red" && <XCircle className="h-12 w-12 text-danger mx-auto mb-3" />}
            <p className={`text-3xl font-bold mb-1 ${
              results.statusColor === "green" ? "text-success" :
              results.statusColor === "amber" ? "text-amber-400" :
              "text-danger"
            }`}>
              {results.readinessPercentage.toFixed(0)}%
            </p>
            <p className={`text-lg font-semibold ${
              results.statusColor === "green" ? "text-success" :
              results.statusColor === "amber" ? "text-amber-400" :
              "text-danger"
            }`}>
              {results.readinessStatus}
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              {results.advisorySummary}
            </p>
          </div>

          {/* Readiness Gauge */}
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <h2 className="font-semibold mb-2">Readiness Gauge</h2>
            <ReactECharts
              style={{ height: 220 }}
              option={{
                series: [{
                  type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: 100,
                  pointer: { show: true, length: "60%", width: 5, itemStyle: { color: results.statusColor === "green" ? "#34d399" : results.statusColor === "amber" ? "#f59e0b" : "#ef4444" } },
                  axisLine: { lineStyle: { width: 18, color: [[0.5, "#ef4444"], [0.8, "#f59e0b"], [1, "#34d399"]] } },
                  axisTick: { show: false }, splitLine: { show: false },
                  axisLabel: { color: "#888", fontSize: 10, distance: 25 },
                  detail: { formatter: "{value}%", fontSize: 22, fontWeight: "bold", color: results.statusColor === "green" ? "#34d399" : results.statusColor === "amber" ? "#f59e0b" : "#ef4444", offsetCenter: [0, "40%"] },
                  data: [{ value: Math.round(results.readinessPercentage) }],
                }],
              }}
            />
          </div>

          {/* Radar Chart */}
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <h2 className="font-semibold mb-2">Section Radar</h2>
            <ReactECharts
              style={{ height: 300 }}
              option={{
                radar: {
                  indicator: results.sectionScores.map(s => ({ name: s.section, max: 100 })),
                  axisName: { color: "#aaa", fontSize: 10 },
                  splitArea: { areaStyle: { color: ["rgba(255,255,255,0.02)", "rgba(255,255,255,0.04)"] } },
                  splitLine: { lineStyle: { color: "#333" } },
                  axisLine: { lineStyle: { color: "#444" } },
                },
                series: [{
                  type: "radar",
                  data: [{
                    value: results.sectionScores.map(s => Math.round(s.percentage)),
                    name: "Score",
                    areaStyle: { color: "rgba(167,139,250,0.2)" },
                    lineStyle: { color: "#a78bfa", width: 2 },
                    itemStyle: { color: "#a78bfa" },
                  }],
                }],
              }}
            />
          </div>

          {/* Score breakdown - Bar Chart */}
          <div className="rounded-2xl border border-border bg-card p-6 output-panel">
            <h2 className="font-semibold mb-2">Score by Section</h2>
            <ReactECharts
              style={{ height: 260 }}
              option={{
                tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 11 } },
                grid: { top: 10, right: 15, bottom: 30, left: 100 },
                xAxis: { type: "value", max: 100, axisLabel: { color: "#888", fontSize: 10, formatter: "{value}%" }, splitLine: { lineStyle: { color: "#222" } } },
                yAxis: { type: "category", data: results.sectionScores.map(s => s.section), axisLabel: { color: "#888", fontSize: 10 }, axisLine: { lineStyle: { color: "#333" } } },
                series: [{
                  type: "bar", barWidth: 16,
                  data: results.sectionScores.map(s => ({
                    value: Math.round(s.percentage),
                    itemStyle: { color: s.percentage >= 80 ? "#34d399" : s.percentage >= 50 ? "#f59e0b" : "#ef4444", borderRadius: [0, 4, 4, 0] },
                  })),
                  label: { show: true, position: "right", color: "#aaa", fontSize: 10, formatter: "{c}%" },
                }],
              }}
            />
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Score</p>
              <p className="text-2xl font-bold">{results.totalScore}</p>
            </div>
            <div className="rounded-xl bg-background/50 border border-border/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Max Possible</p>
              <p className="text-2xl font-bold">{results.maxPossible}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setResults(null)}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              Review Answers
            </button>
            <button onClick={handleReset} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
              <RotateCcw className="h-4 w-4" /> Start Over
            </button>
          </div>
        </div>
      )}

      {!user && results && (
        <div className="mt-8 rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <p className="text-muted-foreground mb-3">Sign up to save your readiness score</p>
          <Link href="/signup" className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors">
            Create Free Account
          </Link>
        </div>
      )}
    </div>
  );
}
