"use client";

import { useState, useEffect } from "react";
import { X, Check, Loader2, CreditCard, Shield } from "lucide-react";
import { useAuth } from "@/lib/store";
import api from "@/lib/api";
import type { CheckoutPlanKey } from "@/lib/pricing-api";
import { fetchPaymentsConfig, type PaymentsConfig } from "@/lib/payments-config";

interface PaymentCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  plan: CheckoutPlanKey;
  planName: string;
  /** Final price in rupees (after discount) */
  priceRupees: number;
  modelSlug?: string;
  /** Show monthly/yearly toggle for subscriptions */
  allowBillingToggle?: boolean;
  defaultBillingCycle?: "monthly" | "yearly" | "one_time";
  yearlyPriceRupees?: number;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function PaymentCheckout({
  isOpen,
  onClose,
  plan,
  planName,
  priceRupees,
  modelSlug,
  allowBillingToggle = false,
  defaultBillingCycle = "monthly",
  yearlyPriceRupees,
}: PaymentCheckoutProps) {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly" | "one_time">(
    defaultBillingCycle
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [payConfig, setPayConfig] = useState<PaymentsConfig | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchPaymentsConfig().then(setPayConfig).catch(() => null);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setBillingCycle(defaultBillingCycle);
  }, [isOpen, defaultBillingCycle]);

  const actualPrice =
    billingCycle === "yearly" && yearlyPriceRupees != null
      ? yearlyPriceRupees
      : priceRupees;

  useEffect(() => {
    if (!isOpen || !payConfig) return;
    if (payConfig.mockMode) {
      setScriptLoaded(true);
      return;
    }
    if (window.Razorpay) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => setError("Failed to load payment gateway");
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [isOpen, payConfig]);

  const handlePayment = async () => {
    if (!user) {
      setError("Please log in to purchase");
      return;
    }
    if (!payConfig?.paymentsEnabled) {
      setError("Payments are not configured. Add Razorpay keys to backend .env");
      return;
    }
    if (!scriptLoaded || !window.Razorpay) {
      setError("Payment gateway not loaded. Please try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: orderData } = await api.post("/payments/create-order", {
        plan,
        billingCycle,
        modelSlug,
      });

      if (!orderData.success) {
        throw new Error(orderData.error || "Failed to create order");
      }

      const { order, key, paymentId, mockMode } = orderData;

      // Dev mock flow — no Razorpay modal, auto-verify
      if (mockMode) {
        const { data: verifyData } = await api.post("/payments/verify", {
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_order_id: order.id,
          razorpay_signature: "mock_signature",
          payment_id: paymentId,
        });
        if (verifyData.success) {
          setSuccess(true);
          setTimeout(() => window.location.reload(), 2000);
        } else {
          setError("Mock payment verification failed");
        }
        setLoading(false);
        return;
      }

      const cycleLabel =
        billingCycle === "yearly"
          ? "Annual"
          : billingCycle === "one_time"
            ? "One-time"
            : "Monthly";

      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: "FinMech",
        description: `${planName} — ${cycleLabel}`,
        order_id: order.id,
        handler: async (response: RazorpayResponse) => {
          try {
            const { data: verifyData } = await api.post("/payments/verify", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              payment_id: paymentId,
            });

            if (verifyData.success) {
              setSuccess(true);
              setTimeout(() => window.location.reload(), 2000);
            } else {
              setError("Payment verification failed. Please contact support.");
            }
          } catch (err: unknown) {
            const e = err as { response?: { data?: { error?: string } } };
            setError(e.response?.data?.error || "Payment verification failed");
          }
        },
        prefill: { name: user.name, email: user.email },
        theme: { color: "#8b5cf6" },
        modal: { ondismiss: () => setLoading(false) },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", (response: { error?: { description?: string } }) => {
        setError(`Payment failed: ${response.error?.description || "Unknown error"}`);
        setLoading(false);
      });
      razorpay.open();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || "Payment failed. Please try again.");
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Complete Purchase</h3>
              <p className="text-xs text-muted-foreground">
                {payConfig?.mockMode
                  ? "Dev mode — mock checkout (no Razorpay keys)"
                  : payConfig?.mode === "test"
                    ? "Test mode — Razorpay sandbox"
                    : "Secure payment via Razorpay"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
            <p className="text-muted-foreground mb-4">{planName} is now active on your account.</p>
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </div>
        ) : (
          <>
            {allowBillingToggle && (
              <div className="p-5 border-b border-border">
                <label className="text-sm font-medium mb-2 block">Billing Cycle</label>
                <div className="flex gap-2 p-1 bg-muted rounded-xl">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("monthly")}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      billingCycle === "monthly"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    Monthly
                  </button>
                  {yearlyPriceRupees != null && (
                    <button
                      type="button"
                      onClick={() => setBillingCycle("yearly")}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        billingCycle === "yearly"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      Yearly
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{planName}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold text-primary">₹{actualPrice.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {error && (
              <div className="px-5 pb-3">
                <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 text-sm text-danger">
                  {error}
                </div>
              </div>
            )}

            <div className="p-5 pt-0 space-y-3">
              <button
                type="button"
                onClick={handlePayment}
                disabled={
                  loading ||
                  !payConfig?.paymentsEnabled ||
                  (!payConfig?.mockMode && !scriptLoaded)
                }
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-accent transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Pay ₹{actualPrice.toLocaleString("en-IN")}
                  </>
                )}
              </button>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                <span>256-bit SSL encryption</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
