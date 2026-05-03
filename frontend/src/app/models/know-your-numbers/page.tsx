"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Save, RotateCcw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useAuth } from "@/lib/store";
import api from "@/lib/api";
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);

  const handleAnswer = (qId: string, response: ChecklistResponse) => {
    setAnswers((prev) => ({ ...prev, [qId]: response }));
    setSaved(false);
  };

  const handleCalculate = () => setResults(calculateChecklist(answers));

  const handleReset = () => { setAnswers({}); setResults(null); setSaved(false); };

  const handleSave = async () => {
    if (!user || !results) return;
    setSaving(true);
    try {
      await api.post("/calculations", { modelSlug: "know-your-numbers", inputs: answers, outputs: results });
      setSaved(true);
    } catch (err) { console.error("Failed to save:", err); }
    finally { setSaving(false); }
  };

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = QUESTIONS.length;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
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
              <div key={section} className="rounded-2xl border border-border bg-card p-6">
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

          {/* Score breakdown */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4">Score by Section</h2>
            <div className="space-y-3">
              {results.sectionScores.map((s) => {
                const pct = s.percentage;
                const barColor = pct >= 80 ? "bg-success" : pct >= 50 ? "bg-amber-400" : "bg-danger";
                return (
                  <div key={s.section}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{s.section}</span>
                      <span className="text-xs text-muted-foreground">{s.score} / {s.maxPossible} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-background/80 border border-border/50">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
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
