import { useCallback, useState } from "react";
import api from "@/lib/api";
import {
  evaluateSmartResultPoints,
  type MatchedSmartResultPoint,
  type SmartResultRule,
} from "@/lib/smart-result-evaluator";

export function useSmartResultPoints() {
  const [loading, setLoading] = useState(false);

  const fetchAndEvaluate = useCallback(
    async (
      modelSlug: string,
      outputs: Record<string, unknown>
    ): Promise<MatchedSmartResultPoint[]> => {
      setLoading(true);
      try {
        const { data } = await api.get("/smart-result-points", {
          params: { modelSlug },
        });
        if (!data.success || !Array.isArray(data.points)) return [];
        return evaluateSmartResultPoints(outputs, data.points as SmartResultRule[]);
      } catch {
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { fetchAndEvaluate, loading };
}
