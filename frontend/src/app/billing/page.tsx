"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, Calendar, Check, AlertCircle, Loader2, RefreshCcw, IndianRupee } from "lucide-react";
import { useAuth } from "@/lib/store";
import { InvoicesList } from "@/components/invoices-list";
import api from "@/lib/api";

interface SubscriptionData {
  plan: string;
  status: string;
  subscriptionPlan: string | null;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  isActive: boolean;
  daysRemaining: number;
}

export default function BillingPage() {
  const { user, hydrate } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    hydrate();
    fetchSubscription();
  }, [hydrate]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/payments/subscription");
      if (data.success) {
        setSubscription(data.subscription);
      }
    } catch (err: any) {
      console.error("Failed to fetch subscription:", err);
      setError(err.response?.data?.error || "Failed to load subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel? You'll still have access until the end of your billing period.")) {
      return;
    }

    try {
      setCancelling(true);
      const { data } = await api.post("/payments/cancel");
      if (data.success) {
        alert(data.message);
        fetchSubscription();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  const planDisplayNames: Record<string, string> = {
    free: "Free Plan",
    standalone: "Standalone Models",
    standard: "Standard Tool Package",
    investor: "Investor Grade",
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Please log in to view billing information.</p>
        <Link href="/login" className="text-primary hover:underline mt-2 inline-block">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/models"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-bold">Billing & Invoices</h1>
      </div>

      {/* Subscription Status Card */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Current Plan</h2>
            <p className="text-sm text-muted-foreground">Manage your subscription</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-danger" />
            <p className="text-sm text-danger">{error}</p>
          </div>
        ) : subscription ? (
          <div className="space-y-4">
            {/* Plan Info */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="text-xl font-bold">{planDisplayNames[subscription.plan] || subscription.plan}</p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                    subscription.isActive
                      ? "bg-success/10 text-success"
                      : subscription.status === "cancelled"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-danger/10 text-danger"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  {subscription.isActive ? "Active" : subscription.status === "cancelled" ? "Cancelled" : "Expired"}
                </span>
              </div>
            </div>

            {/* Subscription Details */}
            {subscription.subscriptionPlan && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    Started
                  </div>
                  <p className="font-medium">
                    {subscription.subscriptionStart
                      ? new Date(subscription.subscriptionStart).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    Renews / Expires
                  </div>
                  <p className="font-medium">
                    {subscription.subscriptionEnd
                      ? new Date(subscription.subscriptionEnd).toLocaleDateString()
                      : "N/A"}
                  </p>
                  {subscription.isActive && subscription.daysRemaining > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {subscription.daysRemaining} days remaining
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                onClick={fetchSubscription}
                disabled={loading}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
              >
                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>

              {subscription.isActive && subscription.plan !== "free" && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="text-sm text-danger hover:text-danger/80 transition-colors disabled:opacity-50"
                >
                  {cancelling ? "Cancelling..." : "Cancel Subscription"}
                </button>
              )}
            </div>

            {/* Upgrade Prompt */}
            {subscription.plan === "free" && (
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <IndianRupee className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Upgrade to unlock more models</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Get access to professional financial models and tools.
                    </p>
                    <Link
                      href="/pricing"
                      className="inline-flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-accent transition-colors"
                    >
                      View Plans
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Invoices Section */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <InvoicesList />
      </div>
    </div>
  );
}
