"use client";

import Link from "next/link";
import { ArrowLeft, Settings, ArrowRight, FileText, ArrowRightLeft, Banknote, Scale } from "lucide-react";

const PAGES = [
  {
    title: "Income Statement",
    description: "Revenue, COGS, Operating Expenses, EBITDA, Net Profit — the central data hub that feeds all other models.",
    href: "/models/inv-common-utility/income-statement",
    icon: FileText,
    status: "Start here",
    feeds: "Burn & Runway, Unit Economics, Funding, DCF, Snapshot, Cash Flow",
  },
  {
    title: "Working Capital Movements",
    description: "Track Receivables, Inventory & Payables month-by-month. Calculates CFO, FCF, and Cash Conversion Cycle.",
    href: "/models/inv-movements",
    icon: ArrowRightLeft,
    status: "Step 2",
    feeds: "Cash Flow, Balance Sheet, Funding Model, Snapshot",
  },
  {
    title: "Cash Flow Statement",
    description: "Operating, Investing & Financing cash flows. Auto-pulls from Income Statement & Movements.",
    href: "/models/inv-common-utility/cash-flow",
    icon: Banknote,
    status: "Step 3",
    feeds: "Balance Sheet",
  },
  {
    title: "Balance Sheet",
    description: "Assets, Equity & Liabilities with balance check and ratios. Auto-pulls from Cash Flow & Movements.",
    href: "/models/inv-common-utility/balance-sheet",
    icon: Scale,
    status: "Step 4",
    feeds: "Standalone output",
  },
];

export default function InvCommonUtilityPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/models?tier=investor" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Models
      </Link>

      <div className="flex items-start gap-4 mb-8">
        <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-400/10">
          <Settings className="h-7 w-7 text-amber-400" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Common Utility Hub</h1>
            <span className="rounded px-2 py-0.5 text-xs font-medium uppercase bg-amber-400/10 text-amber-400">Investor Grade</span>
          </div>
          <p className="text-muted-foreground mt-1">
            Complete financial statements suite. Start with the Income Statement — data flows automatically through all 4 pages.
          </p>
        </div>
      </div>

      {/* Flow diagram */}
      <div className="rounded-2xl bg-amber-400/5 border border-amber-400/20 p-5 mb-8">
        <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider mb-3">Data Flow</p>
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="rounded-lg bg-amber-400/10 px-3 py-1 font-medium text-amber-400">Income Statement</span>
          <ArrowRight className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="rounded-lg bg-amber-400/10 px-3 py-1 font-medium text-amber-400">Movements</span>
          <ArrowRight className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="rounded-lg bg-amber-400/10 px-3 py-1 font-medium text-amber-400">Cash Flow</span>
          <ArrowRight className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="rounded-lg bg-amber-400/10 px-3 py-1 font-medium text-amber-400">Balance Sheet</span>
        </div>
      </div>

      {/* Page cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PAGES.map((page) => (
          <Link key={page.href} href={page.href}
            className="group rounded-2xl border border-border bg-card p-6 hover:border-amber-400/50 hover:bg-amber-400/5 transition-all">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-amber-400/10 group-hover:bg-amber-400/20 transition-colors">
                <page.icon className="h-6 w-6 text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{page.title}</h3>
                  <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-400/10 text-amber-400">{page.status}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{page.description}</p>
                <p className="text-xs text-amber-400/70 flex items-center gap-1">
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
