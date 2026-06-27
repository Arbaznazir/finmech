"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  TrendingUp,
  Calculator,
  BarChart3,
  ArrowRight,
  Shield,
  Zap,
  Link2,
  ChevronRight,
  Rocket,
  Building2,
  GraduationCap,
  Users,
  Sparkles,
  Brain,
  Target,
  LineChart,
  Lightbulb,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

// Rotating taglines for hero section
const taglines = [
  "Smart Financial Models for Modern Businesses",
  "Translate real numbers into understandable business intelligence",
  "Build clarity around your business numbers without needing to be a finance expert",
  "Turn Business Numbers into Business Intelligence",
  "Finance Simplified. Intelligence Amplified.",
  "From Raw Inputs to Smart Decisions",
];

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

const audienceCards = [
  {
    icon: Rocket,
    title: "For Startups",
    items: [
      "Understand revenue potential, costing structure and break-even points",
      "Build investor-ready financial projections",
      "Track burn, runway and funding requirements",
      "Improve decision-making through actionable metrics and dashboards",
    ],
    color: "primary",
  },
  {
    icon: Building2,
    title: "For MSMEs & Businesses",
    items: [
      "Monitor profitability, cash flows and operational efficiency",
      "Identify hidden leakages and weak business ratios",
      "Create structured financial planning mechanisms",
      "Improve business discipline and financial visibility",
    ],
    color: "success",
  },
  {
    icon: GraduationCap,
    title: "For Students & Learners",
    items: [
      "Learn financial analysis through practical mock data",
      "Understand how financial statements interact in real businesses",
      "Explore valuation, unit economics and investor metrics",
      "Build industry-relevant financial understanding",
    ],
    color: "amber",
  },
  {
    icon: Users,
    title: "For Incubators, Mentors & Advisors",
    items: [
      "Evaluate startup readiness through measurable indicators",
      "Standardize startup financial reviews and assessments",
      "Generate advisory insights through structured reporting",
      "Help founders become financially investment-ready",
    ],
    color: "purple",
  },
];

const packages = [
  {
    name: "Free Models",
    badge: "Try Free",
    description: "Try your hands on foundational models to know how it works",
    features: ["Break-even Calculator", "Costing Model", "Revenue Model", "Know Your Numbers"],
    cta: "Get Started",
    href: "/signup",
    highlighted: false,
    icon: Sparkles,
  },
  {
    name: "Standalone Suite",
    badge: "Pick. Input. Analyse. Decide.",
    description: "One model at a time. Access powerful financial models individually, without paying for a full-suite subscription. Simply select a model, enter your data, and instantly generate financial results.",
    features: [
      "Income Statement",
      "Cash Flow Analysis",
      "Balance Sheet Models",
      "Unit Economics",
      "Business Viability",
      "DCF Valuation",
      "Burn & Runway Monitoring",
    ],
    cta: "View Models",
    href: "/models?tier=standalone",
    highlighted: false,
    icon: Target,
  },
  {
    name: "Standard Pack",
    badge: "One Input. Multiple Models. Complete Business Visibility.",
    description: "An integrated financial suite where a single set of inputs automatically powers multiple interconnected business models. Generate revenue projections, costing analysis, break-even insights, financial statements, cash flow forecasts, and business health dashboards through one intelligent workflow.",
    features: [
      "Common Utility Hub",
      "All Models Linked",
      "Break-even Analysis",
      "Burn & Runway",
      "Unit Economics",
      "Business Snapshot",
      "Cash Flow Forecasts",
    ],
    cta: "Start Trial",
    href: "/signup",
    highlighted: true,
    icon: LineChart,
  },
  {
    name: "Investor-Grade Capsule",
    badge: "Designed for serious founders and investment-ready businesses",
    description: "An advanced integrated capsule combining financial projections, burn analysis, runway monitoring, valuation models, investor KPIs, cap table mechanics, DCF methodology and business viability analytics into a unified decision-support engine.",
    features: [
      "Everything in Standard",
      "DCF Valuation",
      "Funding Model",
      "Advanced Unit Economics",
      "Full Cap Table Dynamics",
      "Investor Dashboard",
      "Investor-Grade Financial Narratives",
    ],
    cta: "Go Pro",
    href: "/signup",
    highlighted: false,
    icon: Brain,
  },
];

// Lead magnet rotating text
const leadMagnetTaglines = [
  "Learn. Analyze. Project. Grow.",
  "Investor Thinking Starts with Financial Clarity.",
  "Not Just Models, A Financial Intelligence System.",
  "Built for Founders. Useful for Everyone.",
  "Where Financial Learning Meets Real Business Analytics.",
];

export default function Home() {
  const [currentTagline, setCurrentTagline] = useState(0);
  const [currentLeadMagnet, setCurrentLeadMagnet] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTagline((prev) => (prev + 1) % taglines.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLeadMagnet((prev) => (prev + 1) % leadMagnetTaglines.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-primary)_0%,_transparent_50%)] opacity-15" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center">
          <BrandLogo variant="hero" className="mb-8" />

          {/* Rotating Tagline Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-8 min-h-[36px]">
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span className="transition-opacity duration-500">
              {taglines[currentTagline]}
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6">
            Financial
            <span className="bg-gradient-to-r from-primary via-accent to-purple-400 bg-clip-text text-transparent"> Intelligence</span>
          </h1>

          {/* Introductory Paragraph */}
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground mb-8 leading-relaxed">
            A powerful suite of intelligent financial models built for <span className="text-foreground font-medium">startups, MSMEs, students and business professionals</span>. 
            Generate meaningful financial insights, projections, business health indicators, visual dashboards and investor-ready analytics through guided and easy-to-use models — 
            <span className="text-primary">even without advanced finance knowledge</span>.
          </p>

          <p className="mx-auto max-w-2xl text-sm text-muted-foreground/80 mb-10">
            From Revenue Models and Costing Sheets to Cash Flows, Unit Economics, Valuation Models and Investor Metrics, 
            every module converts raw inputs into meaningful outputs.
            <br />
            <span className="text-foreground font-medium mt-2 inline-block">No jargon. No complicated spreadsheets. Just structured financial clarity.</span>
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
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              ["20+", "Financial Models"],
              ["4", "Package Tiers"],
              ["100%", "Web-Based"],
              ["Real-time", "Intelligence"],
            ].map(([stat, label]) => (
              <div key={label}>
                <div className="text-3xl font-bold text-primary">{stat}</div>
                <div className="text-sm text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why These Models Matter - Audience Cards */}
      <section className="py-24 border-t border-border bg-card/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why These Models Matter</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Purpose-built financial intelligence for every stakeholder in the ecosystem
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {audienceCards.map((card) => (
              <div
                key={card.title}
                className={`group rounded-2xl border border-border bg-card p-6 hover:border-${card.color}/50 transition-all hover:shadow-lg hover:shadow-${card.color}/5`}
              >
                <div className={`h-12 w-12 rounded-xl bg-${card.color}/10 flex items-center justify-center mb-4 group-hover:bg-${card.color}/20 transition-colors`}>
                  <card.icon className={`h-6 w-6 text-${card.color}`} />
                </div>
                <h3 className="font-semibold text-lg mb-4">{card.title}</h3>
                <ul className="space-y-3">
                  {card.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ChevronRight className={`h-4 w-4 text-${card.color} mt-0.5 shrink-0`} />
                      {item}
                    </li>
                  ))}
                </ul>
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
              Stop wrestling with spreadsheets. FinMech gives you purpose-built financial models that actually work together.
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

      {/* Package Descriptions */}
      <section className="py-24 border-t border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Choose Your Financial Intelligence Package</h2>
            <p className="text-muted-foreground">From free exploration to investor-grade analytics</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                className={`rounded-2xl border p-6 flex flex-col ${
                  pkg.highlighted
                    ? "border-primary bg-primary/5 shadow-xl shadow-primary/10 ring-1 ring-primary/50"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`h-12 w-12 rounded-xl ${pkg.highlighted ? "bg-primary/20" : "bg-muted"} flex items-center justify-center shrink-0`}>
                    <pkg.icon className={`h-6 w-6 ${pkg.highlighted ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    {pkg.highlighted && (
                      <div className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">Most Popular</div>
                    )}
                    <h3 className="text-xl font-bold">{pkg.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 italic">{pkg.badge}</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{pkg.description}</p>

                <ul className="space-y-2 mb-8 flex-1">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={pkg.href}
                  className={`block text-center rounded-xl py-2.5 text-sm font-semibold transition-all ${
                    pkg.highlighted
                      ? "bg-primary text-primary-foreground hover:bg-accent"
                      : "border border-border hover:bg-muted"
                  }`}
                >
                  {pkg.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lead Magnet / CTA Section */}
      <section className="py-24 border-t border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--color-primary)_0%,_transparent_50%)] opacity-10" />
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <TrendingUp className="h-12 w-12 text-primary mx-auto mb-6" />

          {/* Rotating Lead Magnet Tagline */}
          <div className="h-8 mb-4">
            <p className="text-primary font-medium transition-opacity duration-500">
              {leadMagnetTaglines[currentLeadMagnet]}
            </p>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to turn your numbers into intelligence?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join founders, professionals, and learners who&apos;ve replaced their messy spreadsheets with structured financial clarity.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-all shadow-lg shadow-primary/25"
            >
              Start for Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/models"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-8 py-3.5 text-sm font-semibold hover:bg-card transition-all"
            >
              Explore All Models
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
