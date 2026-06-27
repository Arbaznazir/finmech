import type { HintDef } from "@/lib/field-hints";
import {
  BURN_EXACT,
  BREAK_EVEN_EXACT,
  BS_EXACT,
  CFS_EXACT,
  DCF_EXACT,
  IS_EXACT,
  PITCHDECK_EXACT,
  UE_EXACT,
  VIABILITY_EXACT,
} from "@/lib/excel-exact-content.generated";

export {
  BURN_EXACT,
  BREAK_EVEN_EXACT,
  BS_EXACT,
  CFS_EXACT,
  DCF_EXACT,
  IS_EXACT,
  PITCHDECK_EXACT,
  UE_EXACT,
  VIABILITY_EXACT,
};

/** Exact field guides from Excel EXPLANATION / Note rows (all standalone models). */
export const EXCEL_FIELD_HINTS: Record<string, HintDef> = (() => {
  const hints: Record<string, HintDef> = {};

  for (const [key, what] of Object.entries(BURN_EXACT.fieldWhat as Record<string, string>)) {
    hints[key] = { what, why: (BURN_EXACT.fieldWhy as Record<string, string>)[key] ?? "" };
  }
  for (const [key, what] of Object.entries(UE_EXACT.fieldWhat as Record<string, string>)) {
    hints[key] = { what, why: (UE_EXACT.fieldWhy as Record<string, string>)[key] ?? "" };
    if (key.startsWith("ARPU")) hints["ARPU"] = { what, why: (UE_EXACT.fieldWhy as Record<string, string>)[key] ?? "" };
  }
  for (const [key, def] of Object.entries(PITCHDECK_EXACT.definitions)) {
    hints[key] = { what: def, why: "" };
  }

  return hints;
})();

export const IS_METRIC_STATUS = IS_EXACT.ragByColor;

export const BS_TALLY_MESSAGES = {
  balanced: BS_EXACT.tallyBalanced,
  unbalanced: BS_EXACT.tallyUnbalanced,
};

export const BS_SCENARIO_MESSAGES = {
  GREEN: { overall: BS_EXACT.analyticsGreen, action: BS_EXACT.action.GREEN },
  AMBER: { overall: BS_EXACT.action.AMBER, action: BS_EXACT.action.AMBER },
  RED: { overall: BS_EXACT.analyticsRed, action: BS_EXACT.action.RED },
} as const;

export const BURN_CLASSIFICATION_MESSAGES = BURN_EXACT.classification;

const UE_RAG_KEY_ALIASES: Record<string, string> = {
  ARPU: "ARPU- Average Revenue Per User / Unit (Monthly)",
  "CAC Payback Period (Months)": "CAC Payback Period (Months)",
};

export const UE_RAG_COMMENTARY = UE_EXACT.ragCommentary;

export function excelRagCommentary(metric: string, rag: "GREEN" | "AMBER" | "RED"): string | undefined {
  const key = UE_RAG_KEY_ALIASES[metric] ?? metric;
  return (UE_EXACT.ragCommentary as Record<string, Record<string, string>>)[key]?.[rag];
}

export function viabilityExcelCommentary(metric: string, rag: "GREEN" | "AMBER" | "RED"): string[] {
  const entry = VIABILITY_EXACT[metric]?.[rag];
  if (!entry) return [];
  const lines = [`${rag}: ${entry.meaning}`];
  if (entry.mentoring) lines.push(`Mentoring: ${entry.mentoring}`);
  return lines;
}

export function exactFieldHint(key: string): HintDef | undefined {
  return EXCEL_FIELD_HINTS[key];
}

export function cfsPatMeaning(cfoPat: number): string {
  if (cfoPat > 1.2) return CFS_EXACT.cfoPatInterpretation[0]?.meaning ?? "";
  if (cfoPat >= 0.8) return CFS_EXACT.cfoPatInterpretation[1]?.meaning ?? "";
  if (cfoPat > 0) return CFS_EXACT.cfoPatInterpretation[2]?.meaning ?? "";
  return CFS_EXACT.cfoPatInterpretation[3]?.meaning ?? "";
}

export function cfsEbitdaMeaning(cfoEbitda: number): string {
  if (cfoEbitda > 0.8) return CFS_EXACT.cfoEbitdaInterpretation[0]?.meaning ?? "";
  if (cfoEbitda >= 0.5) return CFS_EXACT.cfoEbitdaInterpretation[1]?.meaning ?? "";
  if (cfoEbitda > 0) return CFS_EXACT.cfoEbitdaInterpretation[2]?.meaning ?? "";
  return CFS_EXACT.cfoEbitdaInterpretation[3]?.meaning ?? "";
}

export function cfsOverallInsight(cfoPat: number): string {
  if (cfoPat > 1.2) return CFS_EXACT.strongOverall;
  const colour = cfoPat >= 0.8 ? "🟡" : cfoPat > 0 ? "🟠" : "🔴";
  return `${colour} ${cfsPatMeaning(cfoPat)}`;
}

export function exactCommentaryForModel(slug: string): string[] {
  switch (slug) {
    case "pitchdeck-kpis":
      return [...PITCHDECK_EXACT.smartReportLines];
    case "dcf-valuation":
      return [
        DCF_EXACT.interpretationBase,
        DCF_EXACT.mentoringBase,
      ].filter(Boolean);
    case "income-statement":
      return [...IS_EXACT.mentoringGuidance];
    case "consolidated-cfo":
      return [
        ...CFS_EXACT.cfoPatInterpretation.map((r) => `${r.range}: ${r.meaning}`),
        ...CFS_EXACT.cfoEbitdaInterpretation.map((r) => `${r.range}: ${r.meaning}`),
      ];
    default:
      return [];
  }
}
