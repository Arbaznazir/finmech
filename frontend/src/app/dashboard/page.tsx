"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Clock, Calculator, TrendingUp, ArrowRight, Crown } from "lucide-react";
import { useAuth } from "@/lib/store";
import api from "@/lib/api";
import { TIER_INFO } from "@/lib/models-data";
import { modelHref } from "@/lib/model-navigation";

interface Stats {
  totalCalculations: number;
  recentCalculations: { id: string; modelName: string; modelSlug: string; createdAt: string }[];
  modelUsage: { modelSlug: string; _count: { modelSlug: number } }[];
}

export default function DashboardPage() {
  const { user, hydrate } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => {
        const token = localStorage.getItem("finmech_token");
        if (!token) router.push("/login");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, router]);

  useEffect(() => {
    if (user) {
      api.get("/user/stats").then((res) => {
        setStats(res.data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const tierInfo = TIER_INFO[user.plan] || TIER_INFO.free;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user.name.split(" ")[0]}</h1>
          <p className="text-muted-foreground mt-1">Here&apos;s your FinMech overview</p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 ${tierInfo.bgColor}`}>
          <Crown className={`h-4 w-4 ${tierInfo.color}`} />
          <span className={`text-sm font-semibold ${tierInfo.color}`}>{tierInfo.name} Plan</span>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Total Calculations</span>
          </div>
          <div className="text-3xl font-bold">
            {loading ? "—" : stats?.totalCalculations || 0}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-success" />
            </div>
            <span className="text-sm text-muted-foreground">Models Used</span>
          </div>
          <div className="text-3xl font-bold">
            {loading ? "—" : stats?.modelUsage?.length || 0}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-amber-400/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-400" />
            </div>
            <span className="text-sm text-muted-foreground">Your Plan</span>
          </div>
          <div className="text-3xl font-bold capitalize">{user.plan}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" /> Recent Calculations
            </h2>
            <Link href="/history" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : stats?.recentCalculations && stats.recentCalculations.length > 0 ? (
            <div className="space-y-2">
              {stats.recentCalculations.map((calc) => (
                <Link
                  key={calc.id}
                  href={modelHref(calc.modelSlug, "dashboard")}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium">{calc.modelName}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(calc.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No calculations yet.{" "}
              <Link href="/models" className="text-primary hover:underline">
                Try a model
              </Link>
            </div>
          )}
        </div>

        {/* Top Models */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold flex items-center gap-2 mb-5">
            <BarChart3 className="h-4 w-4 text-muted-foreground" /> Most Used Models
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : stats?.modelUsage && stats.modelUsage.length > 0 ? (
            <div className="space-y-2">
              {stats.modelUsage.map((usage) => (
                <div
                  key={usage.modelSlug}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3"
                >
                  <Link href={modelHref(usage.modelSlug, "dashboard")} className="text-sm font-medium hover:text-primary transition-colors">
                    {usage.modelSlug}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {usage._count.modelSlug} calculations
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No usage data yet
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-10 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold mb-5">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Break-even", href: "/models/break-even-basic", icon: TrendingUp },
            { label: "Revenue Model", href: "/models/revenue-model", icon: BarChart3 },
            { label: "All Models", href: "/models", icon: Calculator },
            { label: "View History", href: "/history", icon: Clock },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-muted transition-colors"
            >
              <action.icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
