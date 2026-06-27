import type { HintDef } from "@/lib/field-hints";
import { EXCEL_FIELD_HINTS } from "@/lib/excel-model-content";
import { bullet, p, section, wrapAnalysis, wrapExcelReport } from "@/lib/pdf-analysis-shared";

/** Build report HTML using only Excel-sourced explanations and model commentary. */
export function buildExcelSmartReport(parts: {
  keyResults?: string;
  status?: string;
  commentary?: string[];
  explanations?: { label: string; what: string; why?: string }[];
  extra?: string;
}, options?: { plain?: boolean; accent?: string }): string {
  const blocks: string[] = [];

  if (parts.status) {
    blocks.push(section("Status", p(parts.status)));
  }
  if (parts.keyResults) {
    blocks.push(section("Key Results", parts.keyResults));
  }
  if (parts.commentary?.length) {
    blocks.push(
      section(
        "Commentary",
        `<ul style="margin:0;padding-left:18px">${parts.commentary.map(bullet).join("")}</ul>`
      )
    );
  }
  if (parts.explanations?.length) {
    blocks.push(
      section(
        "Field Explanations",
        `<ul style="margin:0;padding-left:18px">${parts.explanations
          .map((e) =>
            bullet(
              `<strong>${e.label}</strong>: ${e.what}${e.why ? ` ${e.why}` : ""}`
            )
          )
          .join("")}</ul>`
      )
    );
  }
  if (parts.extra) {
    blocks.push(parts.extra);
  }

  const body = blocks.join("");
  if (options?.plain) {
    return wrapExcelReport(body, options.accent);
  }
  return wrapAnalysis(body, options?.accent);
}

export function excelFieldExplanations(keys: string[]): { label: string; what: string; why?: string }[] {
  const out: { label: string; what: string; why?: string }[] = [];
  for (const key of keys) {
    const hint: HintDef | undefined = EXCEL_FIELD_HINTS[key];
    if (hint?.what) out.push({ label: key, what: hint.what, why: hint.why });
  }
  return out;
}

export function insightsGuidance(out: Record<string, unknown>): string[] {
  const ins = out.insights as { guidance?: string[] } | undefined;
  const st = out.status as { guidance?: string[] } | undefined;
  const raw = ins?.guidance ?? st?.guidance ?? [];
  return raw.filter((g) => !g.startsWith("📊"));
}

export function insightsOverall(out: Record<string, unknown>): string {
  const ins = out.insights as { overall?: string } | undefined;
  const st = out.status as { overall?: string } | undefined;
  return ins?.overall ?? st?.overall ?? "";
}
