"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp, Calculator, DollarSign, BarChart3, FileText, Scale,
  Flame, ArrowRightLeft, Activity, Users, Gem, Rocket, PieChart,
  Settings, LayoutDashboard, Lock, Link2, Search, Sparkles, Zap, Star,
  ArrowLeft, ChevronRight,
} from "lucide-react";
import { MODELS, TIER_INFO } from "@/lib/models-data";
import { useAuth } from "@/lib/store";

const ICONS: Record<string, any> = {
  TrendingUp, Calculator, DollarSign, BarChart3, FileText, Scale,
  Flame, ArrowRightLeft, Activity, Users, Gem, Rocket, PieChart,
  Settings, LayoutDashboard,
};

const TIER_ORDER = ["free", "standalone", "standard", "investor"] as const;
type Tier = typeof TIER_ORDER[number];

const TIER_META: Record<Tier, {
  label: string;
  tagline: string;
  description: string;
  sectionColor: string;
  borderColor: string;
  headerBg: string;
  hoverBorder: string;
  icon: any;
  features: string[];
}> = {
  free: {
    label: "Free",
    tagline: "Always available — no account needed",
    description: "Start exploring with our free tools. No sign-up required.",
    sectionColor: "text-success",
    borderColor: "border-success/30",
    headerBg: "bg-success/5",
    hoverBorder: "hover:border-success/60",
    icon: Sparkles,
    features: ["Revenue Model", "Costing Model", "Break-even Calculator", "Know Your Numbers"],
  },
  standalone: {
    label: "Standalone",
    tagline: "Independent models — one-time use",
    description: "Powerful individual models. Use any one independently, no linking needed.",
    sectionColor: "text-blue-400",
    borderColor: "border-blue-400/30",
    headerBg: "bg-blue-400/5",
    hoverBorder: "hover:border-blue-400/60",
    icon: Zap,
    features: ["Income Statement", "Balance Sheet", "Cash Flow", "DCF Valuation", "Cap Table & more"],
  },
  standard: {
    label: "Standard",
    tagline: "Integrated suite — models share data",
    description: "All models linked together. Enter once, data flows automatically across models.",
    sectionColor: "text-primary",
    borderColor: "border-primary/30",
    headerBg: "bg-primary/5",
    hoverBorder: "hover:border-primary/60",
    icon: Star,
    features: ["Common Utility Hub", "Break-even", "Burn & Runway", "Unit Economics", "Business Snapshot"],
  },
  investor: {
    label: "Investor Grade",
    tagline: "Full investor-ready pack",
    description: "Complete pitch-ready financial suite. Advanced models with full data linkage.",
    sectionColor: "text-amber-400",
    borderColor: "border-amber-400/30",
    headerBg: "bg-amber-400/5",
    hoverBorder: "hover:border-amber-400/60",
    icon: Gem,
    features: ["Investor-grade DCF", "Advanced Cap Table", "Funding Model", "Business Snapshot", "Full linked suite"],
  },
};

function ModelsPageInner() {
  const { user, hydrate } = useAuth();
  const searchParams = useSearchParams();
  const [openTier, setOpenTier] = useState<Tier | null>(() => {
    if (typeof window === "undefined") return null;
    const t = new URLSearchParams(window.location.search).get("tier");
    return TIER_ORDER.includes(t as Tier) ? (t as Tier) : null;
  });
  const [search, setSearch] = useState("");

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    const t = searchParams.get("tier");
    if (t && TIER_ORDER.includes(t as Tier)) setOpenTier(t as Tier);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const userPlan = user?.plan || "free";
  const tierHierarchy = ["free", "standalone", "standard", "investor"];
  const userTierIndex = tierHierarchy.indexOf(userPlan);
  const canAccess = (tier: string) => tierHierarchy.indexOf(tier) <= userTierIndex;

  const allModels = Object.values(MODELS);

  const tierModels = (tier: Tier) => allModels.filter((m) => m.tier === tier);

  const filteredModels = openTier
    ? tierModels(openTier).filter((m) =>
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.category.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  /* ── TIER OVERVIEW (4 tiles) ── */
  if (!openTier) {
    return (
      <div className="min-h-screen">
        {/* Hero */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute top-10 right-1/4 w-64 h-64 rounded-full bg-amber-400/5 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 backdrop-blur px-4 py-1.5 text-xs text-muted-foreground mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              {allModels.length} models across 4 tiers
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent">
              Financial Models
            </h1>
            <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Professional-grade tools for every stage. From quick calculations to investor-ready packs.
            </p>
          </div>
        </div>

        {/* 4 tiles */}
        <div className="mx-auto max-w-5xl px-6 pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {TIER_ORDER.map((tier) => {
              const meta = TIER_META[tier];
              const tierInfo = TIER_INFO[tier];
              const TileIcon = meta.icon;
              const count = tierModels(tier).length;
              const accessible = canAccess(tier);

              return (
                <button
                  key={tier}
                  onClick={() => setOpenTier(tier)}
                  className={`group relative text-left rounded-3xl border ${meta.borderColor} bg-card overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.025] active:scale-[0.99] cursor-pointer`}
                  style={{ minHeight: 280 }}
                >
                  {/* Glow blob */}
                  <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-20 blur-2xl pointer-events-none ${meta.sectionColor.replace("text-", "bg-")}`} />

                  {/* Lock */}
                  {!accessible && (
                    <div className="absolute top-5 right-5 z-10">
                      <div className="flex items-center gap-1 rounded-full bg-background/80 border border-border px-2.5 py-1 text-[10px] text-muted-foreground backdrop-blur">
                        <Lock className="h-3 w-3" /> Upgrade
                      </div>
                    </div>
                  )}

                  <div className="relative p-7 flex flex-col h-full">
                    {/* Top: icon + badge */}
                    <div className="flex items-start justify-between mb-5">
                      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border ${meta.borderColor} ${meta.headerBg}`}>
                        <TileIcon className={`h-7 w-7 ${meta.sectionColor}`} />
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-3 py-1 border ${meta.borderColor} ${meta.headerBg} ${meta.sectionColor}`}>
                        {count} models
                      </span>
                    </div>

                    {/* Label + tagline */}
                    <h2 className={`text-2xl font-extrabold mb-1 ${meta.sectionColor}`}>{meta.label}</h2>
                    <p className="text-xs text-muted-foreground mb-4 font-medium">{meta.tagline}</p>

                    {/* Divider */}
                    <div className={`h-px w-full mb-4 ${meta.borderColor.replace("border-", "bg-")}`} />

                    {/* Features */}
                    <ul className="flex-1 space-y-2 mb-6">
                      {meta.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-[13px] text-muted-foreground">
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 opacity-80 ${meta.sectionColor.replace("text-", "bg-")}`} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <div className={`flex items-center justify-between pt-4 border-t ${meta.borderColor}`}>
                      <p className="text-xs text-muted-foreground">{meta.description.split(".")[0]}.</p>
                      <span className={`flex items-center gap-1 text-sm font-semibold ${meta.sectionColor} group-hover:gap-2 transition-all`}>
                        Open <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ── TIER DRILL-DOWN (model cards) ── */
  const meta = TIER_META[openTier];
  const tierInfo = TIER_INFO[openTier];
  const TierIcon = meta.icon;

  return (
    <div className="min-h-screen">
      {/* Drill-down hero banner */}
      <div className={`relative overflow-hidden border-b ${meta.borderColor}`}>
        <div className={`absolute inset-0 ${meta.headerBg} pointer-events-none`} />
        <div className={`absolute -top-20 -right-20 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none ${meta.sectionColor.replace("text-", "bg-")}`} />
        <div className="relative mx-auto max-w-7xl px-6 py-10">
          <button
            onClick={() => { setOpenTier(null); setSearch(""); }}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            All tiers
          </button>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-center gap-5">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border ${meta.borderColor} ${meta.headerBg}`}>
                <TierIcon className={`h-7 w-7 ${meta.sectionColor}`} />
              </div>
              <div>
                <h1 className={`text-3xl font-extrabold ${meta.sectionColor}`}>{meta.label}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{meta.tagline}</p>
              </div>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models..."
                className="rounded-xl border border-border bg-background/60 backdrop-blur pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-56"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Model cards grid */}
      <div className="mx-auto max-w-7xl px-6 py-10">
        {filteredModels.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No models match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredModels.map((model) => {
              const IconComp = ICONS[model.icon] || BarChart3;
              const accessible = canAccess(model.tier);

              return (
                <Link
                  key={model.slug}
                  href={accessible ? `/models/${model.slug}` : "/pricing"}
                  className={`group relative rounded-2xl border bg-card p-6 transition-all duration-200 hover:shadow-xl ${
                    accessible
                      ? `border-border ${meta.hoverBorder}`
                      : "border-border/40 opacity-55 hover:opacity-75"
                  }`}
                >
                  {!accessible && (
                    <div className="absolute top-4 right-4">
                      <div className="flex items-center gap-1 rounded-full bg-background border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        <Lock className="h-2.5 w-2.5" /> Locked
                      </div>
                    </div>
                  )}

                  {/* Icon row */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${meta.borderColor} ${meta.headerBg}`}>
                      <IconComp className={`h-5 w-5 ${tierInfo.color}`} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h3 className="font-bold text-sm truncate leading-snug">{model.name}</h3>
                      <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tierInfo.bgColor} ${tierInfo.color}`}>
                        {tierInfo.name}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">{model.description}</p>

                  {/* Footer meta */}
                  <div className={`flex items-center gap-3 pt-3 border-t border-border/50 text-[11px] text-muted-foreground`}>
                    <span className="font-medium">{model.category}</span>
                    {model.linkedModels && model.linkedModels.length > 0 && (
                      <>
                        <span className="opacity-30">•</span>
                        <span className={`flex items-center gap-1 font-medium ${meta.sectionColor}`}>
                          <Link2 className="h-3 w-3" /> {model.linkedModels.length} linked
                        </span>
                      </>
                    )}
                    <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className={`h-3.5 w-3.5 ${meta.sectionColor}`} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ModelsPage() {
  return (
    <Suspense>
      <ModelsPageInner />
    </Suspense>
  );
}
