export type SmartResultOp =
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "eq"
  | "neq"
  | "between"
  | "contains";

export type SmartResultCondition = {
  field: string;
  op: SmartResultOp;
  value: string | number | boolean;
  value2?: string | number;
};

export type SmartResultRule = {
  id?: string;
  message: string;
  color: string;
  conditions: SmartResultCondition[];
  combineMode?: "all" | "any";
};

export type MatchedSmartResultPoint = {
  message: string;
  color: string;
};

function getOutputValue(outputs: Record<string, unknown>, field: string): unknown {
  if (!field.includes(".")) return outputs[field];
  const parts = field.split(".");
  let cur: unknown = outputs;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function normalizeCompareValue(v: unknown): string | number | boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
    const num = Number(trimmed);
    if (!Number.isNaN(num)) return num;
    return lower;
  }
  return String(v).toLowerCase();
}

function compareEqual(a: string | number | boolean, b: string | number | boolean): boolean {
  if (typeof a === typeof b) return a === b;
  if (typeof a === "boolean" || typeof b === "boolean") {
    return String(a).toLowerCase() === String(b).toLowerCase();
  }
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb;
  return String(a).toLowerCase() === String(b).toLowerCase();
}

export function evaluateCondition(
  outputs: Record<string, unknown>,
  condition: SmartResultCondition
): boolean {
  const actual = normalizeCompareValue(getOutputValue(outputs, condition.field));
  const expected = normalizeCompareValue(condition.value);
  const expected2 =
    condition.value2 !== undefined ? normalizeCompareValue(condition.value2) : null;

  if (actual === null || expected === null) return false;

  switch (condition.op) {
    case "gt":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "gte":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "lt":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "lte":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "eq":
      return compareEqual(actual, expected);
    case "neq":
      return !compareEqual(actual, expected);
    case "between":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        typeof expected2 === "number" &&
        actual >= expected &&
        actual <= expected2
      );
    case "contains":
      return String(actual).includes(String(expected));
    default:
      return false;
  }
}

export function evaluateRule(
  outputs: Record<string, unknown>,
  rule: SmartResultRule
): boolean {
  if (!rule.conditions?.length) return false;
  const results = rule.conditions.map((c) => evaluateCondition(outputs, c));
  return rule.combineMode === "any" ? results.some(Boolean) : results.every(Boolean);
}

export function evaluateSmartResultPoints(
  outputs: Record<string, unknown>,
  rules: SmartResultRule[]
): MatchedSmartResultPoint[] {
  return rules
    .filter((rule) => evaluateRule(outputs, rule))
    .map((rule) => ({ message: rule.message, color: rule.color || "#16a34a" }));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderAdminSmartResultPointsHTML(
  points?: MatchedSmartResultPoint[]
): string {
  if (!points?.length) return "";

  const items = points
    .map(
      (p) =>
        `<li style="font-size:12px;color:${p.color};line-height:1.8;font-weight:600;margin-bottom:4px">${escapeHtml(p.message)}</li>`
    )
    .join("");

  return `
    <div style="margin-top:28px;padding:16px 20px;background:#f8f9ff;border-left:4px solid #6d28d9;border-radius:4px;page-break-inside:avoid">
      <h3 style="margin:0 0 12px;font-size:13px;color:#6d28d9;text-transform:uppercase;letter-spacing:1px">Smart Results</h3>
      <ul style="margin:0;padding:0 0 0 18px;list-style:disc">${items}</ul>
    </div>`;
}
