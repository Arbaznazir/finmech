"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRightLeft, Calculator, TrendingUp } from "lucide-react";

export default function CashFlowLandingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <Link href="/models?tier=standalone" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-cyan-400/10">
          <ArrowRightLeft className="h-7 w-7 text-cyan-400" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Cash Flow Statement</h1>
            <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-blue-400/10 text-blue-400">
              Standalone
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            Choose your view: Detailed operations or consolidated summary with ratios
          </p>
        </div>
      </div>

      {/* Two Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: CashflowOps */}
        <Link href="/models/cash-flow-statement/cashflow-ops" className="group">
          <div className="rounded-2xl border border-border bg-card p-6 hover:border-primary/50 hover:bg-primary/5 transition-all h-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <Calculator className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Cashflow Operations</h2>
                <p className="text-xs text-muted-foreground">Detailed monthly inputs</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Enter detailed cash inflows and outflows month-by-month. Auto-fills from Common Utility.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded">25+ Input Fields</span>
              <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded">Monthly View</span>
              <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded">Auto-fill</span>
            </div>
          </div>
        </Link>

        {/* Card 2: Consolidated CFO */}
        <Link href="/models/cash-flow-statement/consolidated-cfo" className="group">
          <div className="rounded-2xl border border-border bg-card p-6 hover:border-primary/50 hover:bg-primary/5 transition-all h-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <TrendingUp className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Consolidated CFO</h2>
                <p className="text-xs text-muted-foreground">Summary & ratios</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              View summary metrics, CFO/PAT ratios, and RAG insights. Auto-pulls from CashflowOps.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-1 rounded">CFO/PAT Ratios</span>
              <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-1 rounded">RAG Insights</span>
              <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-1 rounded">Summary View</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
