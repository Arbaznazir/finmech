"use client";

import Link from "next/link";
import { ArrowLeft, Settings, ArrowRight, FileText, TrendingUp, Flame, Users, BarChart2 } from "lucide-react";

const PAGES = [
  {
    title: "Income Statement",
    description: "Revenue, COGS, Operating Expenses, EBITDA, Net Profit — the central data hub that feeds all other Standard models.",
    href: "/models/std-common-utility/income-statement",
    icon: FileText,
    status: "Start here",
    feeds: "Break-even, Burn & Runway, Unit Economics, Movements, Snapshot",
  },
  {
    title: "Break-even Model",
    description: "Calculate break-even units and revenue. All fields are fully editable.",
    href: "/models/std-break-even",
    icon: TrendingUp,
    status: "Step 2",
    feeds: "Standalone output",
  },
  {
    title: "Burn & Runway Monitor",
    description: "Month-by-month burn tracking with cumulative cash & runway. Auto-pulls from Income Statement.",
    href: "/models/std-burn-runway",
    icon: Flame,
    status: "Step 3",
    feeds: "Business Snapshot",
  },
  {
    title: "Unit Economics",
    description: "CAC, LTV, ARPU, Churn & Growth Rate. Revenue & Marketing auto-filled from Income Statement.",
    href: "/models/std-unit-economics",
    icon: Users,
    status: "Step 4",
    feeds: "Business Snapshot",
  },
  {
    title: "Business Snapshot",
    description: "One-page summary of all key financial metrics. Auto-pulls from all linked models.",
    href: "/models/std-business-snapshot",
    icon: BarChart2,
    status: "Step 5",
    feeds: "Standalone output",
  },
];

export default function StdCommonUtilityPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models?tier=standard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10">
          <Settings className="h-7 w-7 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Common Utility Hub</h1>
            <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-primary/10 text-primary">Standard</span>
          </div>
          <p className="text-muted-foreground mt-1">
            Start with the Income Statement — data flows automatically into all linked Standard models.
          </p>
        </div>
      </div>

      {/* Flow diagram */}
      <div className="rounded-2xl bg-primary/5 border border-primary/20 p-5 mb-8">
        <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-3">Data Flow</p>
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="rounded-lg bg-primary/10 px-3 py-1 font-medium text-primary">Income Statement</span>
          <ArrowRight className="h-4 w-4 text-primary shrink-0" />
          <span className="rounded-lg bg-primary/10 px-3 py-1 font-medium text-primary">Break-even</span>
          <span className="text-muted-foreground">+</span>
          <span className="rounded-lg bg-primary/10 px-3 py-1 font-medium text-primary">Burn &amp; Runway</span>
          <span className="text-muted-foreground">+</span>
          <span className="rounded-lg bg-primary/10 px-3 py-1 font-medium text-primary">Unit Economics</span>
          <ArrowRight className="h-4 w-4 text-primary shrink-0" />
          <span className="rounded-lg bg-primary/10 px-3 py-1 font-medium text-primary">Snapshot</span>
        </div>
      </div>

      {/* Page cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PAGES.map((page) => (
          <Link key={page.href} href={page.href}
            className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/50 hover:bg-primary/5 transition-all">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <page.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{page.title}</h3>
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">{page.status}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{page.description}</p>
                <p className="text-xs text-primary/70 flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" /> Feeds: {page.feeds}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
