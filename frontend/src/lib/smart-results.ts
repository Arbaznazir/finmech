import { MODELS } from "@/lib/models-data";
import type { CalculationExport } from "@/lib/calculation-pdf";

export const SMART_RESULTS_EVENT = "finmech:calculation-complete";

export type SmartResultsPayload = {
  modelSlug: string;
  modelName?: string;
  tier?: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
};

type ExportRecord = Record<string, unknown>;

export function notifySmartResults(payload: SmartResultsPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<SmartResultsPayload>(SMART_RESULTS_EVENT, { detail: payload })
  );
}

export function toCalculationExport(payload: SmartResultsPayload): CalculationExport {
  const model = MODELS[payload.modelSlug];
  return {
    modelSlug: payload.modelSlug,
    modelName: payload.modelName ?? model?.name ?? payload.modelSlug,
    tier: payload.tier ?? model?.tier ?? "free",
    inputs: payload.inputs as CalculationExport["inputs"],
    outputs: payload.outputs as CalculationExport["outputs"],
    createdAt: new Date().toISOString(),
  };
}

/** Call after a successful calculate to offer the smart-results PDF after 3 seconds. */
export function offerSmartResultsAfterCalculate(
  modelSlug: string,
  inputs: object,
  outputs: object,
  meta?: { modelName?: string; tier?: string }
) {
  notifySmartResults({
    modelSlug,
    inputs: inputs as ExportRecord,
    outputs: outputs as ExportRecord,
    ...meta,
  });
}
