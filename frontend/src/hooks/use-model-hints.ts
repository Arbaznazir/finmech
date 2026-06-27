"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import type { HintDef } from "@/lib/field-hints";
import { FREE_MODEL_HINTS } from "@/lib/free-model-hints";
import { standaloneHint } from "@/lib/standalone-model-hints";

const cache = new Map<string, Record<string, HintDef>>();

export function useModelHints(modelSlug: string) {
  const [hints, setHints] = useState<Record<string, HintDef>>(() => cache.get(modelSlug) ?? {});
  const [loaded, setLoaded] = useState(() => cache.has(modelSlug));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/model-hints/${modelSlug}`);
        if (!cancelled && data.success && data.hints) {
          cache.set(modelSlug, data.hints);
          setHints(data.hints);
        }
      } catch {
        /* fallback via hint() */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modelSlug]);

  const hint = useCallback(
    (fieldKey: string): HintDef | undefined => {
      if (hints[fieldKey]) return hints[fieldKey];
      return standaloneHint(fieldKey) ?? FREE_MODEL_HINTS[fieldKey];
    },
    [hints]
  );

  const refresh = useCallback(async () => {
    const { data } = await api.get(`/model-hints/${modelSlug}`);
    if (data.success && data.hints) {
      cache.set(modelSlug, data.hints);
      setHints(data.hints);
    }
  }, [modelSlug]);

  return { hint, hints, loaded, refresh };
}

/** Clear cache after admin saves so model pages pick up edits on next navigation. */
export function invalidateModelHintsCache(modelSlug?: string) {
  if (modelSlug) cache.delete(modelSlug);
  else cache.clear();
}
