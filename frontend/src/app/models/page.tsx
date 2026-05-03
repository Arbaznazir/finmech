"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp, Calculator, DollarSign, BarChart3, FileText, Scale,
  Flame, ArrowRightLeft, Activity, Users, Gem, Rocket, PieChart,
  Settings, LayoutDashboard, Lock, Link2, Search,
} from "lucide-react";
import { MODELS, TIER_INFO } from "@/lib/models-data";
import { useAuth } from "@/lib/store";

const ICONS: Record<string, any> = {
  TrendingUp, Calculator, DollarSign, BarChart3, FileText, Scale,
  Flame, ArrowRightLeft, Activity, Users, Gem, Rocket, PieChart,
  Settings, LayoutDashboard,
};

const TIERS = ["all", "free", "standalone", "standard", "investor"];

export default function ModelsPage() {
  const { user, hydrate } = useAuth();
  const [activeTier, setActiveTier] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { hydrate(); }, [hydrate]);

  const userPlan = user?.plan || "free";
  const tierHierarchy = ["free", "standalone", "standard", "investor"];
  const userTierIndex = tierHierarchy.indexOf(userPlan);

  const models = Object.values(MODELS).filter((m) => {
    const matchTier = activeTier === "all" || m.tier === activeTier;
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase());
    return matchTier && matchSearch;
  });

  const canAccess = (tier: string) => tierHierarchy.indexOf(tier) <= userTierIndex;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Financial Models</h1>
        <p className="text-muted-foreground">Choose a model to start calculating. Free models are always available.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models..."
            className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TIERS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTier(t)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors capitalize ${
                activeTier === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border hover:bg-muted"
              }`}
            >
              {t === "all" ? "All" : TIER_INFO[t]?.name || t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {models.map((model) => {
          const IconComp = ICONS[model.icon] || BarChart3;
          const tierInfo = TIER_INFO[model.tier];
          const accessible = canAccess(model.tier);

          return (
            <Link
              key={model.slug}
              href={accessible ? `/models/${model.slug}` : "/pricing"}
              className={`group relative rounded-2xl border bg-card p-6 transition-all hover:shadow-lg ${
                accessible
                  ? "border-border hover:border-primary/50 hover:shadow-primary/5"
                  : "border-border/50 opacity-70 hover:opacity-90"
              }`}
            >
              {!accessible && (
                <div className="absolute top-4 right-4">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex items-start gap-4">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${tierInfo.bgColor}`}>
                  <IconComp className={`h-5 w-5 ${tierInfo.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">{model.name}</h3>
                  </div>
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${tierInfo.bgColor} ${tierInfo.color}`}>
                    {tierInfo.name}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{model.description}</p>
              <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
                <span>{model.customPage ? "Custom" : `${model.fields.length} inputs`}</span>
                <span>•</span>
                <span>{model.category}</span>
                {model.linkedModels && model.linkedModels.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Link2 className="h-3 w-3" /> {model.linkedModels.length} linked
                    </span>
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {models.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p>No models found matching your search.</p>
        </div>
      )}
    </div>
  );
}
