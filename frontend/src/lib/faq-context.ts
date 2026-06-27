import { MODELS, TIER_INFO } from "@/lib/models-data";
import { modelSlugFromPathname } from "@/lib/model-slug-from-path";
import type { FaqQuery } from "@/hooks/use-faqs";

export type FaqContext = {
  query: FaqQuery;
  title: string;
  subtitle: string;
  /** Short nudge shown in the chat bubble when entering this context */
  hintMessage: string | null;
  contextKey: string;
};

const TIER_SLUGS = ["free", "standalone", "standard", "investor"] as const;

function isTierSlug(value: string | null): value is (typeof TIER_SLUGS)[number] {
  return Boolean(value && TIER_SLUGS.includes(value as (typeof TIER_SLUGS)[number]));
}

/** Resolve which FAQs to show based on the current route. */
export function resolveFaqContext(pathname: string, tierParam: string | null): FaqContext {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";

  if (path.startsWith("/models") && path !== "/models") {
    const modelSlug = modelSlugFromPathname(path);
    if (modelSlug) {
      const name = MODELS[modelSlug]?.name ?? "this model";
      return {
        query: { scope: "model", modelSlug },
        title: `${name} — FAQ`,
        subtitle: `Check FAQs related to ${name} here.`,
        hintMessage: `You can see ${name}'s FAQs here — tap the chat icon.`,
        contextKey: `model:${modelSlug}`,
      };
    }
  }

  if (path === "/models" && isTierSlug(tierParam)) {
    const tierName = TIER_INFO[tierParam]?.name ?? tierParam;
    return {
      query: { scope: "tier", tier: tierParam },
      title: `${tierName} — FAQ`,
      subtitle: `Check FAQs related to ${tierName} here.`,
      hintMessage: `You can check ${tierName}' FAQs here — tap the chat icon below.`,
      contextKey: `tier:${tierParam}`,
    };
  }

  return {
    query: { scope: "global" },
    title: "FAQ",
    subtitle: "Common questions about FinMech, pricing, and our models.",
    hintMessage: null,
    contextKey: "global",
  };
}
