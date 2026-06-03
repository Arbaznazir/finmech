"use client";

import { useState, useEffect } from "react";
import { X, Check, Loader2, CreditCard, Shield } from "lucide-react";
import { useAuth } from "@/lib/store";
import api from "@/lib/api";

interface PaymentCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  plan: "standard" | "investor";
  planName: string;
  price: number;
  period: string;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// Razorpay window type declaration
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
  price,
  period,
}: PaymentCheckoutProps) {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Calculate actual price based on billing cycle
  const actualPrice = billingCycle === "yearly" 
    ? plan === "standard" ? 999 : 1999
    : price;
  const savings = billingCycle === "yearly"
    ? plan === "standard" ? 189 : 389
    : 0;

  // Load Razorpay script
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  const handlePayment = async () => {
    if (!user) {
      setError("Please log in to subscribe");
      return;
    }

    if (!scriptLoaded || !window.Razorpay) {
      setError("Payment gateway not loaded. Please try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Create order on backend
      const { data: orderData } = await api.post("/payments/create-order", {
        plan,
        billingCycle,
      });

      if (!orderData.success) {
        throw new Error(orderData.error || "Failed to create order");
      }

      const { order, key, paymentId } = orderData;

      // Step 2: Initialize Razorpay checkout
      const options = {
        key: key,
        amount: order.amount,
        currency: order.currency,
        name: "FinMech",
        description: `${planName} - ${billingCycle === "yearly" ? "Annual" : "Monthly"} Subscription`,
        order_id: order.id,
        handler: async (response: RazorpayResponse) => {
          try {
            // Step 3: Verify payment on backend
            const { data: verifyData } = await api.post("/payments/verify", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              payment_id: paymentId,
            });

            if (verifyData.success) {
              setSuccess(true);
              // Refresh user data after short delay
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            } else {
              setError("Payment verification failed. Please contact support.");
            }
          } catch (err: any) {
            console.error("Payment verification error:", err);
            setError(err.response?.data?.error || "Payment verification failed");
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#8b5cf6", // Primary color
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      
      razorpay.on("payment.failed", (response: any) => {
        setError(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });

      razorpay.open();
    } catch (err: any) {
      console.error("Payment error:", err);
      setError(err.response?.data?.error || err.message || "Payment failed. Please try again.");
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Complete Purchase</h3>
              <p className="text-xs text-muted-foreground">Secure payment powered by Razorpay</p>
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

        {/* Success State */}
        {success ? (
          <div className="p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
            <p className="text-muted-foreground mb-4">
              Your {planName} subscription is now active.
            </p>
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </div>
        ) : (
          <>
            {/* Billing Cycle Toggle */}
            <div className="p-5 border-b border-border">
              <label className="text-sm font-medium mb-2 block">Billing Cycle</label>
              <div className="flex gap-2 p-1 bg-muted rounded-xl">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    billingCycle === "monthly"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("yearly")}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    billingCycle === "yearly"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Yearly
                  {savings > 0 && (
                    <span className="text-[10px] bg-success/20 text-success px-1.5 py-0.5 rounded">
                      Save ₹{savings}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Plan Summary */}
            <div className="p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">{planName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Billing</span>
                <span className="font-medium">
                  {billingCycle === "yearly" ? "Annual" : "Monthly"}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold text-primary">₹{actualPrice}</span>
              </div>
              {billingCycle === "yearly" && (
                <p className="text-xs text-success">
                  You save ₹{savings} with annual billing
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-5 pb-3">
                <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 text-sm text-danger">
                  {error}
                </div>
              </div>
            )}

            {/* Pay Button */}
            <div className="p-5 pt-0 space-y-3">
              <button
                onClick={handlePayment}
                disabled={loading || !scriptLoaded}
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
                    Pay ₹{actualPrice}
                  </>
                )}
              </button>

              {/* Security Note */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                <span>256-bit SSL encryption. PCI DSS compliant.</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
