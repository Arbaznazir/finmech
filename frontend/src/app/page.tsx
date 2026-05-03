import Link from "next/link";
import {
  TrendingUp,
  Calculator,
  BarChart3,
  ArrowRight,
  Shield,
  Zap,
  Link2,
  ChevronRight,
} from "lucide-react";

const features = [
  {
    icon: Calculator,
    title: "20+ Financial Models",
    description: "Break-even, DCF, Income Statement, Cap Table, and more — all ready to use.",
  },
  {
    icon: Link2,
    title: "Linked Models",
    description: "Models feed into each other. Change one input, see the impact everywhere.",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Real-time calculations with no spreadsheet headaches. Just input and go.",
  },
  {
    icon: Shield,
    title: "Save & Track History",
    description: "Every calculation is saved. Compare runs, track changes, export when needed.",
  },
];

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Essential calculators to get started",
    features: ["Break-even Calculator", "Costing Model", "Revenue Model", "Know Your Numbers"],
    cta: "Get Started",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Standalone",
    price: "$29",
    period: "per model",
    description: "Professional models — buy what you need",
    features: ["Income Statement", "Balance Sheet", "DCF Valuation", "Cap Table", "Unit Economics", "+ 6 more models"],
    cta: "View Models",
    href: "/models",
    highlighted: false,
  },
  {
    name: "Standard",
    price: "$99",
    period: "/month",
    description: "Integrated suite with linked models",
    features: ["Common Utility hub", "All models linked", "Business Snapshot", "Burn & Runway", "Unit Economics", "Cap Table"],
    cta: "Start Trial",
    href: "/signup",
    highlighted: true,
  },
  {
    name: "Investor Grade",
    price: "$199",
    period: "/month",
    description: "Fundraising-ready financial mechanics",
    features: ["Everything in Standard", "DCF Valuation", "Funding Model", "Advanced Unit Economics", "Full Cap Table", "Investor Dashboard"],
    cta: "Go Pro",
    href: "/signup",
    highlighted: false,
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-primary)_0%,_transparent_50%)] opacity-15" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-8">
            <Zap className="h-3.5 w-3.5" />
            Financial models, not spreadsheets
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6">
            Financial Mechanics
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-purple-400 bg-clip-text text-transparent">
              Made Simple
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10">
            Build, analyze, and share financial models for your startup.
            From break-even to DCF valuation — everything you need in one place.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-all shadow-lg shadow-primary/25"
            >
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/models"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-8 py-3.5 text-sm font-semibold hover:bg-card transition-all"
            >
              Explore Models
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              ["20+", "Financial Models"],
              ["4", "Tier Packages"],
              ["100%", "Web-Based"],
              ["Real-time", "Calculations"],
            ].map(([stat, label]) => (
              <div key={label}>
                <div className="text-3xl font-bold text-primary">{stat}</div>
                <div className="text-sm text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything you need to model your finances</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Stop wrestling with spreadsheets. FinMech gives you purpose-built financial calculators that actually work together.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 border-t border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">Start free, upgrade when you&apos;re ready.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl border p-6 flex flex-col ${
                  tier.highlighted
                    ? "border-primary bg-primary/5 shadow-xl shadow-primary/10 ring-1 ring-primary/50"
                    : "border-border bg-card"
                }`}
              >
                {tier.highlighted && (
                  <div className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">Most Popular</div>
                )}
                <h3 className="text-lg font-bold">{tier.name}</h3>
                <div className="mt-2 mb-1">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className="text-sm text-muted-foreground ml-1">{tier.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">{tier.description}</p>
                <ul className="space-y-2 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.href}
                  className={`block text-center rounded-xl py-2.5 text-sm font-semibold transition-all ${
                    tier.highlighted
                      ? "bg-primary text-primary-foreground hover:bg-accent"
                      : "border border-border hover:bg-muted"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <TrendingUp className="h-12 w-12 text-primary mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to master your financial mechanics?</h2>
          <p className="text-muted-foreground mb-8">
            Join founders who&apos;ve replaced their messy spreadsheets with FinMech.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-all shadow-lg shadow-primary/25"
          >
            Start for Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
