import { formatCurrency } from "@/lib/utils";

export const STANDALONE_ACCENT = "#0d9488";
export const FREE_ACCENT = "#6d28d9";
export const STANDARD_ACCENT = "#6d28d9";

export function fmt(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "—";
    if (Math.abs(v) >= 1000) return formatCurrency(v);
    if (v % 1 !== 0) return v.toFixed(2);
    return v.toLocaleString("en-IN");
  }
  return String(v);
}

export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function pct(n: number, d: number): string {
  if (!d) return "0%";
  return `${((n / d) * 100).toFixed(1)}%`;
}

export function pctVal(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export function p(txt: string) {
  return `<p style="margin:8px 0;font-size:12px;color:#333;line-height:1.7">${txt}</p>`;
}

export function bullet(txt: string) {
  return `<li style="font-size:12px;color:#333;line-height:1.8;margin-bottom:6px">${txt}</li>`;
}

export function section(title: string, body: string, accent = STANDALONE_ACCENT) {
  return `<div style="margin-top:20px">
    <h4 style="font-size:11px;font-weight:800;color:${accent};text-transform:uppercase;letter-spacing:1.2px;margin:0 0 10px;border-bottom:2px solid ${accent}33;padding-bottom:6px">${title}</h4>
    ${body}
  </div>`;
}

export function callout(type: "info" | "warn" | "ok" | "risk", title: string, body: string) {
  const styles = {
    info: { bg: "#eff6ff", border: "#3b82f6", color: "#1d4ed8" },
    warn: { bg: "#fffbeb", border: "#f59e0b", color: "#b45309" },
    ok: { bg: "#f0fdf4", border: "#22c55e", color: "#15803d" },
    risk: { bg: "#fef2f2", border: "#ef4444", color: "#b91c1c" },
  }[type];
  return `<div style="margin:10px 0;padding:12px 14px;background:${styles.bg};border-left:4px solid ${styles.border};border-radius:0 6px 6px 0">
    <div style="font-size:11px;font-weight:800;color:${styles.color};margin-bottom:4px">${title}</div>
    <div style="font-size:12px;color:#444;line-height:1.65">${body}</div>
  </div>`;
}

export function metricTable(rows: { label: string; value: string; note?: string }[], accent = STANDALONE_ACCENT) {
  return `<table style="width:100%;border-collapse:collapse;font-size:12px;margin:8px 0">
    ${rows.map((r, i) => `<tr style="background:${i % 2 === 0 ? "#fafafa" : "#fff"}">
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;width:42%">${r.label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:${accent}">${r.value}</td>
      ${r.note ? `<td style="padding:8px 12px;border-bottom:1px solid #eee;color:#888;font-size:11px">${r.note}</td>` : ""}
    </tr>`).join("")}
  </table>`;
}

export function numberedPlan(title: string, items: string[]) {
  return `<div style="margin-top:8px"><strong style="font-size:12px;color:#444">${title}</strong>
    <ol style="margin:8px 0 0 20px;padding:0">${items.map((t) => `<li style="font-size:12px;color:#333;line-height:1.75;margin-bottom:6px">${t}</li>`).join("")}</ol></div>`;
}

export function scenarioTable(headers: string[], rows: string[][], accent = STANDALONE_ACCENT) {
  return `<table style="width:100%;border-collapse:collapse;font-size:11px;margin:10px 0">
    <thead><tr style="background:${accent};color:#fff">${headers.map((h) => `<th style="padding:8px 10px;text-align:${h === headers[0] ? "left" : "right"}">${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((row, i) => `<tr style="background:${i % 2 === 0 ? "#fafafa" : "#fff"}">${row.map((cell, j) => `<td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:${j === 0 ? "left" : "right"};${j > 0 ? "font-weight:600" : ""}">${cell}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`;
}

export function wrapExcelReport(sections: string, accent = STANDALONE_ACCENT) {
  return `<div style="margin-top:28px;padding:22px 26px;background:#fafafa;border:1px solid #e8e8e8;border-left:5px solid ${accent};border-radius:0 10px 10px 0">
    ${sections}
  </div>`;
}

export function wrapAnalysis(sections: string, accent = STANDALONE_ACCENT) {
  return `<div style="margin-top:28px;padding:22px 26px;background:linear-gradient(135deg,#f0fdfa 0%,#fff 60%);border:1px solid ${accent}33;border-left:5px solid ${accent};border-radius:0 10px 10px 0">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <span style="font-size:20px">✦</span>
      <h3 style="margin:0;font-size:14px;color:${accent};text-transform:uppercase;letter-spacing:1.2px;font-weight:800">Smart Results — Full Advisory Report</h3>
    </div>
    <p style="margin:0 0 16px;font-size:11px;color:#888;line-height:1.5">Founder-grade analysis: every metric explained, benchmarked, stress-tested, and translated into a concrete improvement roadmap.</p>
    ${sections}
    <div style="margin-top:20px;padding-top:12px;border-top:1px dashed #ddd;font-size:10px;color:#aaa;text-align:center">Generated by FinMech Smart Results · For internal planning &amp; investor discussions</div>
  </div>`;
}

export function resultsTableHTML(
  rows: { label: string; value: string }[],
  tierColor: string,
  title?: string
): string {
  const header = title
    ? `<p style="font-size:11px;font-weight:700;color:#888;text-transform:uppercase;margin:16px 0 8px">${title}</p>`
    : "";
  return `${header}<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px">
    ${rows.map((r, i) => `<tr style="background:${i % 2 === 0 ? "#fafafa" : "#fff"}">
      <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;width:55%">${r.label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:${tierColor}">${r.value}</td>
    </tr>`).join("")}
  </table>`;
}

export function ragBadge(status: string): string {
  const s = status.toUpperCase();
  const color = s === "GREEN" || s === "STRONG" ? "#16a34a" : s === "AMBER" || s === "ACCEPTABLE" || s === "WEAK" ? "#d97706" : "#dc2626";
  const bg = s === "GREEN" || s === "STRONG" ? "#f0fdf4" : s === "AMBER" || s === "ACCEPTABLE" || s === "WEAK" ? "#fffbeb" : "#fef2f2";
  return `<span style="background:${bg};border:1px solid ${color}44;color:${color};font-size:10px;font-weight:700;padding:3px 8px;border-radius:100px">${status}</span>`;
}

export const FISCAL_MONTHS_SHORT = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export function getMonthlyData(out: Record<string, unknown>): Record<string, Record<string, number>> | null {
  const md = out.monthlyData;
  if (!md || typeof md !== "object") return null;
  return md as Record<string, Record<string, number>>;
}

export function getAnnual(out: Record<string, unknown>): Record<string, number> | null {
  const a = out.annual;
  if (!a || typeof a !== "object") return null;
  return a as Record<string, number>;
}

export function monthKeys(md: Record<string, Record<string, number>>): string[] {
  const keys = Object.keys(md);
  const order = [...FISCAL_MONTHS_SHORT, "April", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  return keys.sort((a, b) => {
    const ia = order.indexOf(a as typeof FISCAL_MONTHS_SHORT[number]);
    const ib = order.indexOf(b as typeof FISCAL_MONTHS_SHORT[number]);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export function lastMonthData(md: Record<string, Record<string, number>>): Record<string, number> | null {
  const keys = monthKeys(md);
  if (!keys.length) return null;
  return md[keys[keys.length - 1]] ?? null;
}

export function trendAcrossMonths(md: Record<string, Record<string, number>>, key: string): { first: number; last: number; change: number } {
  const keys = monthKeys(md);
  let first = 0;
  let last = 0;
  for (const k of keys) {
    const v = num(md[k]?.[key]);
    if (v !== 0 || first !== 0) {
      if (first === 0 && last === 0) first = v;
      last = v;
    }
  }
  return { first, last, change: last - first };
}

export function standardRoadmap(items: { d30: string[]; d60: string[]; d90: string[] }): string {
  return section("30 / 60 / 90-Day Roadmap",
    numberedPlan("Days 1–30 (Stabilize)", items.d30) +
    numberedPlan("Days 31–60 (Optimize)", items.d60) +
    numberedPlan("Days 61–90 (Scale / Fundraise)", items.d90)
  );
}
