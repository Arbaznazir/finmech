"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, RefreshCcw } from "lucide-react";
import api from "@/lib/api";
import type { PlanPriceRow, ModelPriceRow } from "@/lib/pricing-api";
import { STANDALONE_PRODUCTS } from "@/lib/pricing-catalog";

function paiseToRupees(paise: number | null) {
  if (paise == null || paise === 0) return "";
  return String(paise / 100);
}

function rupeesToPaise(v: string): number | null {
  if (v === "" || v == null) return null;
  const n = parseFloat(v);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

export function AdminPricingPanel() {
  const [plans, setPlans] = useState<PlanPriceRow[]>([]);
  const [modelPrices, setModelPrices] = useState<ModelPriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/pricing");
      if (data.success) {
        setPlans(data.plans);
        setModelPrices(data.modelPrices);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const savePlan = async (planKey: string, draft: Record<string, unknown>) => {
    setSaving(planKey);
    try {
      const { data } = await api.put(`/admin/pricing/plans/${planKey}`, draft);
      if (data.success) {
        setPlans((prev) => prev.map((p) => (p.planKey === planKey ? { ...p, ...data.plan } : p)));
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  const saveModel = async (modelSlug: string, draft: Record<string, unknown>) => {
    setSaving(modelSlug);
    try {
      const { data } = await api.put(`/admin/pricing/models/${modelSlug}`, draft);
      if (data.success) {
        setModelPrices((prev) =>
          prev.map((m) => (m.modelSlug === modelSlug ? { ...m, ...data.model } : m))
        );
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Pricing &amp; discounts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Amounts in rupees. Discount % applies to the price shown on the pricing page.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted"
        >
          <RefreshCcw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <section className="space-y-4">
        <h3 className="font-semibold">Bundle plans (3)</h3>
        <p className="text-xs text-muted-foreground">
          All Standalone Models · Standalone All + Standard · All Models PRO +
        </p>
        {plans.map((plan) => (
          <PlanEditor
            key={plan.planKey}
            plan={plan}
            saving={saving === plan.planKey}
            onSave={(draft) => savePlan(plan.planKey, draft)}
          />
        ))}
      </section>

      <section>
        <h3 className="font-semibold mb-1">Per-model pricing (standalone workbooks)</h3>
        <p className="text-xs text-muted-foreground mb-4">
          One row per Excel workbook. Sub-sheets (e.g. Cashflow Ops inside Cash Flow Statement) are
          not priced separately. Leave price at 0 until after client consultation — the public page
          shows &quot;Contact for pricing&quot;.
        </p>
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-3 px-4">Model</th>
                <th className="text-left py-3 px-4">Includes</th>
                <th className="text-left py-3 px-4">Price (₹)</th>
                <th className="text-left py-3 px-4">Discount %</th>
                <th className="text-left py-3 px-4">Discount label</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {STANDALONE_PRODUCTS.map((product) => {
                const mp = modelPrices.find((m) => m.modelSlug === product.slug);
                if (!mp) return null;
                return (
                  <ModelPriceEditor
                    key={mp.modelSlug}
                    model={mp}
                    includes={"includes" in product ? product.includes : undefined}
                    saving={saving === mp.modelSlug}
                    onSave={(draft) => saveModel(mp.modelSlug, draft)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PlanEditor({
  plan,
  saving,
  onSave,
}: {
  plan: PlanPriceRow;
  saving: boolean;
  onSave: (draft: Record<string, unknown>) => void;
}) {
  const [monthly, setMonthly] = useState(paiseToRupees(plan.priceMonthly));
  const [yearly, setYearly] = useState(paiseToRupees(plan.priceYearly));
  const [oneTime, setOneTime] = useState(paiseToRupees(plan.priceOneTime));
  const [discount, setDiscount] = useState(String(plan.discountPercent));
  const [label, setLabel] = useState(plan.discountLabel || "");

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-semibold">{plan.name}</h4>
          <p className="text-xs text-muted-foreground">{plan.planKey}</p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            onSave({
              priceMonthly: rupeesToPaise(monthly),
              priceYearly: rupeesToPaise(yearly),
              priceOneTime: rupeesToPaise(oneTime),
              discountPercent: Number(discount) || 0,
              discountLabel: label || null,
            })
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Field label="Monthly (₹)" value={monthly} onChange={setMonthly} />
        <Field label="Yearly (₹)" value={yearly} onChange={setYearly} />
        <Field label="One-time (₹)" value={oneTime} onChange={setOneTime} />
        <Field label="Discount %" value={discount} onChange={setDiscount} />
        <Field label="Badge label" value={label} onChange={setLabel} placeholder="e.g. Launch offer" />
      </div>
    </div>
  );
}

function ModelPriceEditor({
  model,
  includes,
  saving,
  onSave,
}: {
  model: ModelPriceRow;
  includes?: readonly string[];
  saving: boolean;
  onSave: (draft: Record<string, unknown>) => void;
}) {
  const [price, setPrice] = useState(paiseToRupees(model.priceOneTime));
  const [discount, setDiscount] = useState(String(model.discountPercent));
  const [label, setLabel] = useState(model.discountLabel || "");

  return (
    <tr>
      <td className="py-3 px-4 font-medium">{model.modelName}</td>
      <td className="py-3 px-4 text-xs text-muted-foreground max-w-[160px]">
        {includes?.length ? includes.join(" · ") : "—"}
      </td>
      <td className="py-3 px-4">
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-24 rounded-lg border border-border bg-input px-2 py-1"
        />
      </td>
      <td className="py-3 px-4">
        <input
          type="number"
          min={0}
          max={100}
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          className="w-16 rounded-lg border border-border bg-input px-2 py-1"
        />
      </td>
      <td className="py-3 px-4">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full max-w-[140px] rounded-lg border border-border bg-input px-2 py-1 text-xs"
          placeholder="Optional"
        />
      </td>
      <td className="py-3 px-4 text-right">
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            onSave({
              priceOneTime: rupeesToPaise(price) ?? 0,
              discountPercent: Number(discount) || 0,
              discountLabel: label || null,
            })
          }
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </button>
      </td>
    </tr>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
      />
    </div>
  );
}
