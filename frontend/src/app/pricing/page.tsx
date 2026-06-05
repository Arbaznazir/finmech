"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Zap, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/store";
import { PaymentCheckout } from "@/components/payment-checkout";
import { PriceDisplayBlock } from "@/components/price-display";
import {
  fetchPublicPricing,
  type PlanPriceRow,
  type ModelPriceRow,
  type CheckoutPlanKey,
} from "@/lib/pricing-api";

type CheckoutState = {
  plan: CheckoutPlanKey;
  planName: string;
  priceRupees: number;
  modelSlug?: string;
  allowBillingToggle?: boolean;
  defaultBillingCycle?: "monthly" | "yearly" | "one_time";
  yearlyPriceRupees?: number;
} | null;

const FREE_FEATURES = [
  "Break-even Calculator",
  "Costing Model",
  "Revenue Model",
  "Know Your Business Numbers",
  "Unlimited calculations",
];

export default function PricingPage() {
  const { user, hydrate } = useAuth();
  const [plans, setPlans] = useState<PlanPriceRow[]>([]);
  const [modelPrices, setModelPrices] = useState<ModelPriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkout, setCheckout] = useState<CheckoutState>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    fetchPublicPricing()
      .then((data) => {
        setPlans(data.plans);
        setModelPrices(data.modelPrices);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openCheckout = (state: CheckoutState) => {
    if (!user) {
      window.location.href = "/signup";
      return;
    }
    setCheckout(state);
  };

  const planByKey = (key: string) => plans.find((p) => p.planKey === key);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
          <Zap className="h-3.5 w-3.5" /> Pricing set by admin — discounts applied automatically
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Choose your plan</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Three bundles: all standalone models, standalone + standard, or full PRO access — plus single-model purchases below.
        </p>
      </div>

      {/* Free */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-8 max-w-md mx-auto">
        <h3 className="text-lg font-bold">Free</h3>
        <p className="text-3xl font-bold mt-2">₹0</p>
        <p className="text-sm text-muted-foreground mb-4">Forever</p>
        <ul className="space-y-2 mb-6">
          {FREE_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
        <Link
          href={user ? "/models?tier=free" : "/signup"}
          className="block text-center rounded-xl py-2.5 text-sm font-semibold border border-border hover:bg-muted"
        >
          Get Started
        </Link>
      </div>

      {/* Bundle plans from admin */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const isCurrent = user?.plan === plan.planKey;
          const isSubscription = plan.priceMonthly != null || plan.priceYearly != null;
          const displayPrice = plan.oneTime || plan.monthly || plan.yearly;
          const highlighted = plan.planKey === "standalone_standard";

          return (
            <div
              key={plan.planKey}
              className={`rounded-2xl border p-6 flex flex-col relative ${
                highlighted
                  ? "border-primary bg-primary/5 ring-1 ring-primary/50"
                  : "border-border bg-card"
              }`}
            >
              {highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                  Popular
                </div>
              )}
              {plan.discountLabel && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-500/10 px-2 py-1 rounded-full w-fit mb-2">
                  {plan.discountLabel}
                </span>
              )}
              <h3 className="text-lg font-bold">{plan.name}</h3>
              {displayPrice && (
                <div className="mt-3 mb-1">
                  <PriceDisplayBlock
                    pricing={displayPrice}
                    period={
                      plan.oneTime
                        ? "one-time"
                        : plan.monthly
                          ? "/month"
                          : "/year"
                    }
                  />
                </div>
              )}
              <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

              {isCurrent ? (
                <div className="text-center rounded-xl py-2.5 text-sm font-semibold bg-muted text-muted-foreground">
                  Current Plan
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const monthly = plan.monthly?.finalPaise
                      ? plan.monthly.finalPaise / 100
                      : 0;
                    const yearly = plan.yearly?.finalPaise
                      ? plan.yearly.finalPaise / 100
                      : undefined;
                    const oneTime = plan.oneTime?.finalPaise
                      ? plan.oneTime.finalPaise / 100
                      : monthly;

                    openCheckout({
                      plan: plan.planKey as CheckoutPlanKey,
                      planName: plan.name,
                      priceRupees: plan.oneTime ? oneTime : monthly,
                      allowBillingToggle: isSubscription && !plan.oneTime,
                      defaultBillingCycle: plan.oneTime ? "one_time" : "monthly",
                      yearlyPriceRupees: yearly,
                    });
                  }}
                  className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-all ${
                    highlighted
                      ? "bg-primary text-primary-foreground hover:bg-accent"
                      : "border border-border hover:bg-muted"
                  }`}
                >
                  {plan.oneTime ? "Buy bundle" : "Subscribe"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Per-model standalone */}
      <div className="rounded-2xl border border-border bg-card p-8">
        <h2 className="text-2xl font-bold mb-2">Buy selected standalone model</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Pay only for the professional models you need — prices and discounts are managed in the admin panel.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modelPrices.map((mp) => (
            <div
              key={mp.modelSlug}
              className="rounded-xl border border-border p-4 flex flex-col justify-between"
            >
              <div>
                {mp.discountLabel && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    {mp.discountLabel}
                  </span>
                )}
                <h4 className="font-semibold mt-2">{mp.modelName}</h4>
                <div className="mt-2">
                  <PriceDisplayBlock pricing={mp.pricing} period="one-time" size="sm" />
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  openCheckout({
                    plan: "standalone_model",
                    planName: mp.modelName,
                    priceRupees: mp.pricing.finalPaise / 100,
                    modelSlug: mp.modelSlug,
                    defaultBillingCycle: "one_time",
                  })
                }
                className="mt-4 w-full rounded-lg bg-primary/10 text-primary py-2 text-sm font-semibold hover:bg-primary/20"
              >
                Buy this model
              </button>
            </div>
          ))}
        </div>
        <p className="text-center mt-6 text-sm text-muted-foreground">
          Or get{" "}
          <button
            type="button"
            className="text-primary hover:underline font-medium"
            onClick={() => {
              const all = planByKey("standalone_all");
              if (all?.oneTime) {
                openCheckout({
                  plan: "standalone_all",
                  planName: all.name,
                  priceRupees: all.oneTime.finalPaise / 100,
                  defaultBillingCycle: "one_time",
                });
              }
            }}
          >
            all standalone models
          </button>{" "}
          in one bundle above.
        </p>
      </div>

      {checkout && (
        <PaymentCheckout
          isOpen={true}
          onClose={() => setCheckout(null)}
          plan={checkout.plan}
          planName={checkout.planName}
          priceRupees={checkout.priceRupees}
          modelSlug={checkout.modelSlug}
          allowBillingToggle={checkout.allowBillingToggle}
          defaultBillingCycle={checkout.defaultBillingCycle}
          yearlyPriceRupees={checkout.yearlyPriceRupees}
        />
      )}
    </div>
  );
}
