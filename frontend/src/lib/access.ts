import { MODELS, type FinModel } from "@/lib/models-data";
import { hasPurchasedStandalone } from "@/lib/pricing-catalog";

export function parsePurchasedModels(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function canAccessModel(
  user: { plan?: string; purchasedModels?: string } | null | undefined,
  model: FinModel
): boolean {
  if (model.tier === "free") return true;
  if (!user) return false;

  const purchased = parsePurchasedModels(user.purchasedModels);
  if (purchased.includes(model.slug)) return true;
  if (hasPurchasedStandalone(purchased, model.slug)) return true;

  const plan = user.plan || "free";
  if (plan === "investor") return true;
  if (plan === "standalone_standard") {
    return model.tier === "standalone" || model.tier === "standard";
  }
  if (plan === "standalone_all" || plan === "standalone") {
    return model.tier === "standalone";
  }
  if (plan === "standard") {
    return model.tier === "standard";
  }
  return false;
}

export function canAccessTier(
  user: { plan?: string; purchasedModels?: string } | null | undefined,
  tier: string
): boolean {
  const models = Object.values(MODELS).filter((m) => m.tier === tier);
  if (models.length === 0) return tier === "free";
  return models.some((m) => canAccessModel(user, m));
}
