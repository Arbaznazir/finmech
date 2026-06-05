import api from "@/lib/api";

export interface PriceDisplay {
  basePaise: number;
  finalPaise: number;
  discountPercent: number;
  baseDisplay: string;
  finalDisplay: string;
  hasDiscount: boolean;
}

export interface PlanPriceRow {
  id: string;
  planKey: string;
  name: string;
  description: string | null;
  priceMonthly: number | null;
  priceYearly: number | null;
  priceOneTime: number | null;
  discountPercent: number;
  discountLabel: string | null;
  isActive: boolean;
  sortOrder: number;
  monthly: PriceDisplay | null;
  yearly: PriceDisplay | null;
  oneTime: PriceDisplay | null;
}

export interface ModelPriceRow {
  id: string;
  modelSlug: string;
  modelName: string;
  priceOneTime: number;
  discountPercent: number;
  discountLabel: string | null;
  isActive: boolean;
  pricing: PriceDisplay;
}

export type CheckoutPlanKey =
  | "standalone_model"
  | "standalone_all"
  | "standalone_standard"
  | "investor";

export async function fetchPublicPricing() {
  const { data } = await api.get("/pricing");
  return data as { plans: PlanPriceRow[]; modelPrices: ModelPriceRow[] };
}

export async function fetchAdminPricing() {
  const { data } = await api.get("/admin/pricing");
  return data as { plans: PlanPriceRow[]; modelPrices: ModelPriceRow[] };
}
