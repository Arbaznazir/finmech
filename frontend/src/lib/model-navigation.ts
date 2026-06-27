import { MODELS } from "@/lib/models-data";

const TIER_FROM = new Set(["free", "standalone", "standard", "investor"]);
const COMING_SOON_TIERS = new Set(["standard", "investor"]);

/** Slugs whose route path differs from /models/{slug} */
const MODEL_ROUTE_OVERRIDES: Record<string, string> = {
  "cashflow-ops": "/models/cash-flow-statement/cashflow-ops",
  "consolidated-cfo": "/models/cash-flow-statement/consolidated-cfo",
};

/** Append ?from= so model pages can navigate back to the right place. */
export function modelHref(slug: string, from?: string | null): string {
  const base = MODEL_ROUTE_OVERRIDES[slug] ?? `/models/${slug}`;
  if (!from) return base;
  return `${base}?from=${encodeURIComponent(from)}`;
}

export function resolveModelBackHref(
  from: string | null,
  options?: { modelSlug?: string; fallbackHref?: string }
): string {
  const { modelSlug, fallbackHref } = options ?? {};
  const defaultFallback = "/models";

  // Back to a parent hub (e.g. Cash Flow hub from a sub-sheet)
  if (fallbackHref && fallbackHref !== defaultFallback) {
    if (from) {
      const sep = fallbackHref.includes("?") ? "&" : "?";
      return `${fallbackHref}${sep}from=${encodeURIComponent(from)}`;
    }
    return fallbackHref;
  }

  if (from) {
    if (TIER_FROM.has(from)) {
      return COMING_SOON_TIERS.has(from) ? defaultFallback : `/models?tier=${from}`;
    }
    if (from === "dashboard") return "/dashboard";
    if (from === "history") return "/history";
    if (from.startsWith("/")) return from;
  }

  if (modelSlug && MODELS[modelSlug]) {
    const tier = MODELS[modelSlug].tier;
    if (COMING_SOON_TIERS.has(tier)) return defaultFallback;
    return `/models?tier=${tier}`;
  }

  return defaultFallback;
}
