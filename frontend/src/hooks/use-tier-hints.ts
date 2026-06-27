"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import type { HintDef } from "@/lib/field-hints";

const FALLBACK: Record<string, HintDef> = {
  free: {
    what: "Free tier — always available calculators with no account required.",
    why: "Quick tools to explore revenue, costing, break-even, and key business numbers before committing to a paid tier.",
    how: "Open the Free tile on the Models page to browse Revenue Model, Costing Model, Break-even, and Know Your Numbers.",
  },
  standalone: {
    what: "Standalone models — professional financial models you can run independently, one at a time.",
    why: "Each model matches the Excel workbook exactly. Buy or unlock only the models you need — no suite dependency.",
    how: "Includes Income Statement, Balance Sheet, Cash Flow, DCF Valuation, Cap Table, Funding Model, and more.",
  },
  standard: {
    what: "Standard package — integrated models that share data through the Common Utility hub.",
    why: "Enter assumptions once and they flow across linked models for a connected operating view.",
    how: "Suite includes Common Utility, Break-even, Burn & Runway, Unit Economics, and Business Snapshot.",
  },
  investor: {
    what: "Investor Grade — full fundraising-ready pack with advanced DCF, cap table, funding, and snapshot models.",
    why: "Designed for founders preparing investor conversations with linked, investor-grade outputs.",
    how: "Includes investor DCF, advanced cap table, funding model, business snapshot, and the full linked suite.",
  },
};

const cache: { hints: Record<string, HintDef> | null } = { hints: null };

export function useTierHints() {
  const [hints, setHints] = useState<Record<string, HintDef>>(() => cache.hints ?? {});
  const [loaded, setLoaded] = useState(() => cache.hints !== null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/tier-hints");
        if (!cancelled && data.success && data.hints) {
          cache.hints = data.hints;
          setHints(data.hints);
        }
      } catch {
        /* use fallback */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hint = useCallback(
    (tierId: string): HintDef | undefined => hints[tierId] ?? FALLBACK[tierId],
    [hints],
  );

  const refresh = useCallback(async () => {
    const { data } = await api.get("/tier-hints");
    if (data.success && data.hints) {
      cache.hints = data.hints;
      setHints(data.hints);
    }
  }, []);

  return { hint, hints, loaded, refresh };
}

export function invalidateTierHintsCache() {
  cache.hints = null;
}
