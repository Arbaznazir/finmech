"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Zap } from "lucide-react";
import { useAuth } from "@/lib/store";
import { PaymentCheckout } from "@/components/payment-checkout";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Get started with essential calculators",
    features: [
      "Break-even Calculator",
      "Costing Model",
      "Revenue Model",
      "Know Your Business Numbers",
      "Unlimited calculations",
      "Basic results view",
    ],
    cta: "Get Started",
    highlighted: false,
    isSubscription: false,
  },
  {
    id: "standalone",
    name: "Standalone Models",
    price: "₹2,399",
    period: "per model",
    description: "Professional models — buy only what you need",
    features: [
      "Income Statement",
      "Balance Sheet",
      "Cash Flow Statement",
      "Break-even Pro (Multi-product)",
      "Business Viability Dashboard",
      "Unit Economics",
      "Pitchdeck KPIs",
      "DCF Valuation",
      "Funding Model",
      "Cap Table Mechanics",
      "Burn & Runway Monitor",
      "Save & track history",
    ],
    cta: "View Models",
    highlighted: false,
    isSubscription: false,
  },
  {
    id: "standard",
    name: "Standard Tool Package",
    price: "₹99",
    period: "/month",
    description: "Integrated suite with linked models & Common Utility hub",
    features: [
      "Everything in Free",
      "Common Utility — central data hub",
      "All models auto-linked",
      "Break-even Model (linked)",
      "Burn & Runway Monitor (linked)",
      "Unit Economics Basic (linked)",
      "Cap Table Mechanics (linked)",
      "Business Snapshot dashboard",
      "Unlimited history & saves",
      "Priority support",
    ],
    cta: "Start Standard",
    highlighted: true,
    isSubscription: true,
  },
  {
    id: "investor",
    name: "Investor Grade",
    price: "₹199",
    period: "/month",
    description: "Complete financial mechanics for fundraising-ready startups",
    features: [
      "Everything in Standard",
      "Common Utility — full metrics hub",
      "DCF Valuation Model",
      "Funding Model with dilution waterfall",
      "Advanced Unit Economics (cohorts)",
      "Full Cap Table (multi-round)",
      "Business Snapshot — investor-ready",
      "Scenario analysis",
      "Export to PDF/Excel",
      "White-glove onboarding",
    ],
    cta: "Go Investor Grade",
    highlighted: false,
    isSubscription: true,
  },
];

export default function PricingPage() {
  const { user, hydrate } = useAuth();
  const [checkoutPlan, setCheckoutPlan] = useState<"standard" | "investor" | null>(null);

  useEffect(() => { hydrate(); }, [hydrate]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
          <Zap className="h-3.5 w-3.5" /> Simple, transparent pricing
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          Choose your plan
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Start free and upgrade as your business grows. All plans include unlimited calculations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isCurrent = user?.plan === plan.id;

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-6 flex flex-col relative ${
                plan.highlighted
                  ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10 ring-1 ring-primary/50"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <div className="mt-3 mb-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground ml-1">{plan.period}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="block text-center rounded-xl py-2.5 text-sm font-semibold bg-muted text-muted-foreground">
                  Current Plan
                </div>
              ) : plan.isSubscription && plan.id !== "free" ? (
                <button
                  onClick={() => setCheckoutPlan(plan.id as "standard" | "investor")}
                  className={`w-full block text-center rounded-xl py-2.5 text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? "bg-primary text-primary-foreground hover:bg-accent shadow-lg shadow-primary/25"
                      : "border border-border hover:bg-muted"
                  }`}
                >
                  {plan.cta}
                </button>
              ) : (
                <Link
                  href={user ? "/models" : "/signup"}
                  className={`block text-center rounded-xl py-2.5 text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? "bg-primary text-primary-foreground hover:bg-accent shadow-lg shadow-primary/25"
                      : "border border-border hover:bg-muted"
                  }`}
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-16 text-center">
        <p className="text-muted-foreground text-sm">
          Need a custom plan or enterprise pricing?{" "}
          <a href="mailto:hello@finmech.com" className="text-primary hover:underline">
            Contact us
          </a>
        </p>
      </div>

      {/* Payment Checkout Modal */}
      {checkoutPlan && (
        <PaymentCheckout
          isOpen={true}
          onClose={() => setCheckoutPlan(null)}
          plan={checkoutPlan}
          planName={plans.find(p => p.id === checkoutPlan)?.name || ""}
          price={checkoutPlan === "standard" ? 99 : 199}
          period="month"
        />
      )}
    </div>
  );
}
