"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

export interface FaqItem {
  id: string;
  scope: string;
  tierSlug?: string | null;
  modelSlug?: string | null;
  question: string;
  answer: string;
  sortOrder: number;
}

export type FaqQuery =
  | { scope: "global" }
  | { scope: "tier"; tier: string }
  | { scope: "model"; modelSlug: string };

export function faqQueryKey(query: FaqQuery | null): string {
  if (!query) return "";
  if (query.scope === "global") return "global";
  if (query.scope === "tier") return `tier:${query.tier}`;
  return `model:${query.modelSlug}`;
}

function faqRequestParams(
  scope: FaqQuery["scope"],
  tier: string | null,
  modelSlug: string | null
): Record<string, string> {
  const params: Record<string, string> = { scope };
  if (scope === "tier" && tier) params.tier = tier;
  if (scope === "model" && modelSlug) params.modelSlug = modelSlug;
  return params;
}

/** Admin-editable — always fetch fresh (no stale default cache). */
export function useFaqs(query: FaqQuery | null) {
  const key = faqQueryKey(query);
  const scope = query?.scope ?? null;
  const tier = query?.scope === "tier" ? query.tier : null;
  const modelSlug = query?.scope === "model" ? query.modelSlug : null;

  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(Boolean(key));

  useEffect(() => {
    if (!key || !scope) {
      setFaqs([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data } = await api.get("/faqs", {
          params: faqRequestParams(scope, tier, modelSlug),
        });
        if (cancelled) return;
        if (data.success && Array.isArray(data.faqs)) {
          setFaqs(data.faqs);
        } else {
          setFaqs([]);
        }
      } catch {
        if (!cancelled) setFaqs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key, scope, tier, modelSlug]);

  const refresh = useCallback(async () => {
    if (!key || !scope) return;
    setLoading(true);
    try {
      const { data } = await api.get("/faqs", {
        params: faqRequestParams(scope, tier, modelSlug),
      });
      if (data.success && Array.isArray(data.faqs)) {
        setFaqs(data.faqs);
      }
    } catch {
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  }, [key, scope, tier, modelSlug]);

  return { faqs, loading, refresh };
}

/** Called after admin edits so open widgets refetch on next open. */
export function invalidateFaqCache() {
  /* no-op — FAQs are not cached client-side anymore */
}
