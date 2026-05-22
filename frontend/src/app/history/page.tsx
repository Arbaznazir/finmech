"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Trash2, ExternalLink, ChevronLeft, ChevronRight, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/store";
import api from "@/lib/api";
import { TIER_INFO } from "@/lib/models-data";

interface Calculation {
  id: string;
  modelSlug: string;
  modelName: string;
  tier: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ========== HELPERS ==========

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isMonthlyData(obj: Record<string, unknown>): boolean {
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
    "April", "May_full", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"];
  const keys = Object.keys(obj);
  return keys.length > 0 && keys.some((k) => months.includes(k));
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    if (Math.abs(v) >= 1000) return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
    if (v % 1 !== 0) return v.toFixed(2);
    return v.toLocaleString();
  }
  if (typeof v === "string") return v;
  if (isPlainObject(v)) return JSON.stringify(v);
  return String(v);
}

// Flatten nested data into rows for CSV
function flattenToRows(data: Record<string, any>, prefix = ""): { key: string; value: string }[] {
  const rows: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(data)) {
    const label = prefix ? `${prefix} > ${k}` : k;
    if (isPlainObject(v)) {
      rows.push(...flattenToRows(v as Record<string, any>, label));
    } else if (Array.isArray(v)) {
      rows.push({ key: label, value: v.map(String).join(", ") });
    } else {
      rows.push({ key: label, value: formatVal(v) });
    }
  }
  return rows;
}

// ========== EXPORT FUNCTIONS ==========

function exportCSV(calc: Calculation) {
  const lines: string[] = [];
  lines.push(`Model,${calc.modelName}`);
  lines.push(`Tier,${calc.tier}`);
  lines.push(`Date,${new Date(calc.createdAt).toLocaleString()}`);
  lines.push("");

  // Check if inputs are monthly (nested month keys)
  if (isPlainObject(calc.inputs) && isMonthlyData(calc.inputs)) {
    // Monthly inputs — build a table: rows = fields, cols = months
    const months = Object.keys(calc.inputs);
    const allFields = new Set<string>();
    months.forEach((m) => {
      if (isPlainObject(calc.inputs[m])) Object.keys(calc.inputs[m] as Record<string, unknown>).forEach((f) => allFields.add(f));
    });
    lines.push(`INPUTS,${months.join(",")}`);
    allFields.forEach((field) => {
      const vals = months.map((m) => {
        const md = calc.inputs[m] as Record<string, unknown> | undefined;
        return md ? formatVal(md[field]) : "";
      });
      lines.push(`"${field}",${vals.join(",")}`);
    });
  } else {
    lines.push("INPUTS");
    flattenToRows(calc.inputs).forEach((r) => lines.push(`"${r.key}","${r.value}"`));
  }

  lines.push("");

  // Outputs
  if (isPlainObject(calc.outputs)) {
    const out = calc.outputs as Record<string, unknown>;
    // Check for monthlyData key
    if (out.monthlyData && isPlainObject(out.monthlyData)) {
      const md = out.monthlyData as Record<string, Record<string, unknown>>;
      const months = Object.keys(md);
      const allFields = new Set<string>();
      months.forEach((m) => { if (isPlainObject(md[m])) Object.keys(md[m]).forEach((f) => allFields.add(f)); });
      lines.push(`RESULTS (Monthly),${months.join(",")}`);
      allFields.forEach((field) => {
        const vals = months.map((m) => formatVal(md[m]?.[field]));
        lines.push(`"${field}",${vals.join(",")}`);
      });
      // Also add annual/summary if present
      const summaryKeys = Object.keys(out).filter((k) => k !== "monthlyData");
      if (summaryKeys.length > 0) {
        lines.push("");
        lines.push("RESULTS (Summary)");
        summaryKeys.forEach((k) => {
          if (isPlainObject(out[k])) {
            flattenToRows(out[k] as Record<string, any>, k).forEach((r) => lines.push(`"${r.key}","${r.value}"`));
          } else {
            lines.push(`"${k}","${formatVal(out[k])}"`);
          }
        });
      }
    } else {
      lines.push("RESULTS");
      flattenToRows(calc.outputs).forEach((r) => lines.push(`"${r.key}","${r.value}"`));
    }
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${calc.modelSlug}-${new Date(calc.createdAt).toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Inline SVG chart helpers ──────────────────────────────────────────────────

function svgBarChart(labels: string[], values: number[], color: string, title: string, w = 700, h = 180): string {
  if (!values.length) return "";
  const max = Math.max(...values, 1);
  const padL = 10, padR = 10, padT = 30, padB = 30;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const bw = Math.max(8, (chartW / values.length) * 0.55);
  const gap = chartW / values.length;

  const bars = values.map((v, i) => {
    const bh = (v / max) * chartH;
    const x = padL + i * gap + (gap - bw) / 2;
    const y = padT + chartH - bh;
    const lbl = labels[i] || "";
    const valStr = v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v));
    return `
      <rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${color}" rx="3"/>
      <text x="${x + bw / 2}" y="${y - 4}" text-anchor="middle" font-size="8" fill="#555">${valStr}</text>
      <text x="${x + bw / 2}" y="${padT + chartH + 14}" text-anchor="middle" font-size="8" fill="#888">${lbl}</text>`;
  }).join("");

  return `<div style="margin:16px 0">
    <p style="font-size:11px;font-weight:600;color:#555;margin:0 0 4px">${title}</p>
    <svg width="${w}" height="${h}" style="max-width:100%;display:block">
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#ddd" stroke-width="1"/>
      <line x1="${padL}" y1="${padT + chartH}" x2="${padL + chartW}" y2="${padT + chartH}" stroke="#ddd" stroke-width="1"/>
      ${bars}
    </svg>
  </div>`;
}

function svgLineChart(labels: string[], series: { name: string; values: number[]; color: string }[], title: string, w = 700, h = 160): string {
  if (!series.length || !series[0].values.length) return "";
  const allVals = series.flatMap((s) => s.values);
  const max = Math.max(...allVals, 1);
  const min = Math.min(...allVals.filter((v) => v > 0), 0);
  const padL = 10, padR = 10, padT = 24, padB = 24;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const n = series[0].values.length;

  const lines = series.map((s) => {
    const pts = s.values.map((v, i) => {
      const x = padL + (i / Math.max(n - 1, 1)) * chartW;
      const y = padT + chartH - ((v - min) / (max - min || 1)) * chartH;
      return `${x},${y}`;
    }).join(" ");
    const dots = s.values.map((v, i) => {
      const x = padL + (i / Math.max(n - 1, 1)) * chartW;
      const y = padT + chartH - ((v - min) / (max - min || 1)) * chartH;
      return `<circle cx="${x}" cy="${y}" r="3" fill="${s.color}"/>`;
    }).join("");
    return `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2"/>${dots}`;
  }).join("");

  const xLabels = labels.map((lbl, i) => {
    const x = padL + (i / Math.max(n - 1, 1)) * chartW;
    return `<text x="${x}" y="${padT + chartH + 14}" text-anchor="middle" font-size="8" fill="#888">${lbl}</text>`;
  }).join("");

  const legend = series.map((s, i) =>
    `<rect x="${10 + i * 90}" y="4" width="10" height="8" fill="${s.color}" rx="2"/>
     <text x="${24 + i * 90}" y="12" font-size="9" fill="#555">${s.name}</text>`
  ).join("");

  return `<div style="margin:16px 0">
    <p style="font-size:11px;font-weight:600;color:#555;margin:0 0 4px">${title}</p>
    <svg width="${w}" height="${h + 20}" style="max-width:100%;display:block">
      <g transform="translate(0,18)">${legend}</g>
      <g transform="translate(0,20)">
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}" stroke="#ddd" stroke-width="1"/>
        <line x1="${padL}" y1="${padT + chartH}" x2="${padL + chartW}" y2="${padT + chartH}" stroke="#ddd" stroke-width="1"/>
        ${lines}${xLabels}
      </g>
    </svg>
  </div>`;
}

function svgDonutChart(segments: { name: string; value: number; color: string }[], title: string, w = 340, h = 180): string {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (!total) return "";
  const cx = 90, cy = h / 2 - 10, r = 60, ir = 36;
  let angle = -Math.PI / 2;
  const arcs = segments.map((seg) => {
    const slice = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + slice), y2 = cy + r * Math.sin(angle + slice);
    const ix1 = cx + ir * Math.cos(angle), iy1 = cy + ir * Math.sin(angle);
    const ix2 = cx + ir * Math.cos(angle + slice), iy2 = cy + ir * Math.sin(angle + slice);
    const large = slice > Math.PI ? 1 : 0;
    const pct = ((seg.value / total) * 100).toFixed(1);
    const lx = cx + (r + 12) * Math.cos(angle + slice / 2);
    const ly = cy + (r + 12) * Math.sin(angle + slice / 2);
    const arc = `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ir} ${ir} 0 ${large} 0 ${ix1} ${iy1} Z" fill="${seg.color}"/>`;
    const label = slice > 0.25 ? `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="7" fill="#555">${pct}%</text>` : "";
    angle += slice;
    return arc + label;
  }).join("");
  const legendItems = segments.map((seg, i) => {
    const lx = cx + r + 24, ly = 20 + i * 16;
    return `<rect x="${lx}" y="${ly}" width="8" height="8" fill="${seg.color}" rx="2"/><text x="${lx + 11}" y="${ly + 7}" font-size="8" fill="#555">${seg.name} (${((seg.value/total)*100).toFixed(1)}%)</text>`;
  }).join("");
  return `<div style="margin:16px 0">
    <p style="font-size:11px;font-weight:600;color:#555;margin:0 0 4px">${title}</p>
    <svg width="${w}" height="${h}" style="max-width:100%;display:block">
      ${arcs}${legendItems}
    </svg>
  </div>`;
}

// ── Model-specific analysis generator ────────────────────────────────────────

function generateAnalysis(calc: Calculation): string {
  const slug = calc.modelSlug;
  const out = calc.outputs as Record<string, any>;
  const inp = calc.inputs as Record<string, any>;
  const lines: string[] = [];

  const p = (txt: string) => `<p style="margin:6px 0;font-size:12px;color:#333;line-height:1.6">${txt}</p>`;
  const bullet = (txt: string) => `<li style="font-size:12px;color:#333;line-height:1.8">${txt}</li>`;

  if (slug === "revenue-model") {
    const monthly = Number(out.monthlyRevenue) || 0;
    const annual = Number(out.annualRevenue) || 0;
    const units = Number(out.monthlyUnitsSold) || 0;
    const price = Number(out.pricePerUnit) || 0;
    const lifetime = Number(out.customerLifetimeMonths) || 0;
    lines.push(p(`This model calculated a <strong>monthly revenue of ${formatVal(monthly)}</strong> and <strong>annual revenue of ${formatVal(annual)}</strong>, driven by ${units.toLocaleString()} units sold per month at ${formatVal(price)} per unit.`));
    lines.push(p(`With a customer lifetime of ${lifetime} months, each customer contributes approximately <strong>${formatVal(monthly > 0 && units > 0 ? (price * lifetime) : 0)}</strong> over their lifetime.`));
    if (annual > 1000000) lines.push(p(`<strong>⚠ Strong revenue signal:</strong> Annual revenue exceeds $1M — ensure your cost structure scales accordingly.`));
    if (lifetime < 6) lines.push(p(`<strong>⚠ Short customer lifetime (${lifetime} mo):</strong> Focus on retention — even a 2x improvement in lifetime significantly increases LTV.`));
    if (lifetime >= 12) lines.push(p(`<strong>✓ Healthy retention:</strong> A ${lifetime}-month lifetime suggests solid product-market fit and customer stickiness.`));
  } else if (slug.includes("break-even") || slug === "break-even-basic") {
    const beUnits = Number(out.breakEvenUnits || out["Break-Even Units"]) || 0;
    const beRevenue = Number(out.breakEvenRevenue || out["Break-Even Revenue"]) || 0;
    const margin = Number(out.contributionMargin || out["Contribution Margin"]) || 0;
    lines.push(p(`The break-even point is <strong>${beUnits.toLocaleString()} units</strong>, requiring <strong>${formatVal(beRevenue)}</strong> in revenue to cover all fixed costs.`));
    if (margin > 0) lines.push(p(`The contribution margin of <strong>${formatVal(margin)}</strong> per unit means every unit sold beyond break-even directly contributes to profit.`));
    lines.push(p(`<strong>Implication:</strong> Reducing fixed costs or increasing unit price will lower the break-even threshold and accelerate profitability.`));
  } else if (slug.includes("costing")) {
    const totalCost = Number(out.totalCost || out["Total Cost"]) || 0;
    const unitCost = Number(out.costPerUnit || out["Cost Per Unit"]) || 0;
    const fixedCost = Number(inp.fixedCosts || inp["Fixed Costs"] || 0);
    const varCost = Number(inp.variableCostPerUnit || inp["Variable Cost Per Unit"] || 0);
    lines.push(p(`Total operating cost is <strong>${formatVal(totalCost)}</strong> with a per-unit cost of <strong>${formatVal(unitCost)}</strong>.`));
    if (fixedCost && varCost) {
      const fixedPct = (fixedCost / (totalCost || 1) * 100).toFixed(0);
      lines.push(p(`Fixed costs represent approximately <strong>${fixedPct}%</strong> of total costs. A higher fixed-cost ratio means faster profit growth beyond break-even.`));
    }
    lines.push(p(`<strong>Recommendation:</strong> Compare unit cost against your selling price — a minimum 30–50% gross margin is recommended for a sustainable business.`));
  } else if (slug.includes("unit-economics")) {
    const md = out.monthlyData as Record<string, any> | undefined;
    if (md) {
      const months = Object.keys(md);
      const cacVals = months.map((m) => Number(md[m]?.["CAC"]) || 0);
      const ltvVals = months.map((m) => Number(md[m]?.["LTV"]) || 0);
      const lastMonth = months[months.length - 1];
      const lastCAC = Number(md[lastMonth]?.["CAC"]) || 0;
      const lastLTV = Number(md[lastMonth]?.["LTV"]) || 0;
      const ratio = lastCAC > 0 ? (lastLTV / lastCAC).toFixed(1) : "N/A";
      lines.push(p(`Across ${months.length} months of data, the latest CAC is <strong>${formatVal(lastCAC)}</strong> and LTV is <strong>${formatVal(lastLTV)}</strong>, giving an LTV/CAC ratio of <strong>${ratio}x</strong>.`));
      if (Number(ratio) >= 3) lines.push(p(`<strong>✓ Excellent:</strong> An LTV/CAC ratio above 3x indicates a very efficient acquisition engine — you're generating strong returns on marketing spend.`));
      else if (Number(ratio) >= 1) lines.push(p(`<strong>⚠ Marginal:</strong> LTV/CAC is between 1x and 3x. Target ≥3x by reducing CAC (better targeting) or increasing LTV (higher price, longer retention).`));
      else lines.push(p(`<strong>🚨 Warning:</strong> LTV/CAC below 1x means you're losing money on every customer. Revisit pricing, acquisition channels, or retention strategy immediately.`));
      const avgChurn = months.reduce((s, m) => s + (Number(md[m]?.["Churn Rate"]) || 0), 0) / months.length;
      lines.push(p(`Average monthly churn rate across the period: <strong>${avgChurn.toFixed(1)}%</strong>. ${avgChurn > 10 ? "⚠ High churn — investigate onboarding and product stickiness." : avgChurn < 3 ? "✓ Excellent retention." : "Moderate churn — room for improvement."}`));
      const cacTrend = cacVals[cacVals.length - 1] - cacVals[0];
      lines.push(p(`CAC ${cacTrend > 0 ? `increased by ${formatVal(cacTrend)} over the period — monitor acquisition efficiency` : `decreased by ${formatVal(Math.abs(cacTrend))} — improving acquisition efficiency`}.`));
    }
  } else if (slug.includes("burn-runway")) {
    const runway = Number(out.runwayMonths || out["Runway (Months)"]) || 0;
    const burn = Number(out.monthlyBurn || out["Monthly Burn"]) || 0;
    const cash = Number(inp.cashBalance || inp["Cash Balance"] || inp.currentCash || 0);
    lines.push(p(`Current monthly burn is <strong>${formatVal(burn)}</strong> with a runway of <strong>${runway} months</strong> (${(runway / 12).toFixed(1)} years).`));
    if (runway < 6) lines.push(p(`<strong>🚨 Critical:</strong> Less than 6 months of runway. Immediate fundraising or cost reduction is required.`));
    else if (runway < 12) lines.push(p(`<strong>⚠ Watch:</strong> Under 12 months of runway — begin fundraising conversations now (typically takes 4–6 months).`));
    else lines.push(p(`<strong>✓ Healthy runway:</strong> Over a year of runway gives you time to reach milestones before your next raise.`));
    if (cash > 0) lines.push(p(`At the current burn rate, the ${formatVal(cash)} cash balance will be depleted in approximately ${runway} months.`));
  } else if (slug.includes("dcf")) {
    const npv = Number(out.npv || out["NPV"]) || 0;
    const irr = Number(out.irr || out["IRR"]) || 0;
    const wacc = Number(inp.discountRate || inp["Discount Rate (WACC)"] || inp.wacc || 0);
    lines.push(p(`The Discounted Cash Flow analysis yields a <strong>Net Present Value (NPV) of ${formatVal(npv)}</strong>.`));
    if (npv > 0) lines.push(p(`<strong>✓ Positive NPV:</strong> The investment creates value at the given discount rate (${wacc}%). The project is financially justified.`));
    else lines.push(p(`<strong>🚨 Negative NPV:</strong> At a ${wacc}% discount rate, the investment destroys value. Consider renegotiating terms or finding ways to accelerate cash flows.`));
    if (irr > 0) lines.push(p(`The IRR of <strong>${irr.toFixed(1)}%</strong> ${irr > wacc ? `exceeds the WACC of ${wacc}% — value-creating` : `is below the WACC of ${wacc}% — value-destroying at this rate`}.`));
  } else if (slug.includes("cap-table")) {
    lines.push(p(`This cap table analysis shows the ownership distribution across all stakeholders.`));
    const rows = flattenToRows(calc.outputs).filter((r) => r.key.toLowerCase().includes("founder") || r.key.toLowerCase().includes("ownership") || r.key.toLowerCase().includes("dilut"));
    rows.slice(0, 4).forEach((r) => lines.push(bullet(`${r.key}: <strong>${r.value}</strong>`)));
    lines.push(p(`<strong>Key principle:</strong> Founders should aim to retain >50% ownership through Series A and >30% at IPO. Review dilution impact carefully before each round.`));
  } else if (slug.includes("funding")) {
    const raise = Number(out.totalRaise || out["Total Raise"]) || 0;
    const postMoney = Number(out.postMoneyValuation || out["Post-Money Valuation"]) || 0;
    lines.push(p(`This funding round analysis shows a raise of <strong>${formatVal(raise)}</strong> at a post-money valuation of <strong>${formatVal(postMoney)}</strong>.`));
    lines.push(p(`<strong>Dilution consideration:</strong> Ensure the use of funds is clearly mapped to milestones that justify the next valuation step-up.`));
  } else {
    // Generic analysis for all other models
    const rows = flattenToRows(calc.outputs).filter((r) => r.value !== "—" && r.value !== "0");
    if (rows.length > 0) {
      lines.push(p(`This <strong>${calc.modelName}</strong> calculation produced ${rows.length} key output metrics. The most significant results are highlighted in the Results table below.`));
      rows.slice(0, 3).forEach((r) => lines.push(bullet(`<strong>${r.key}</strong>: ${r.value}`)));
      lines.push(p(`Review each metric against your business targets and industry benchmarks to assess performance and identify areas for improvement.`));
    }
  }

  if (!lines.length) return "";
  const bullets = lines.filter((l) => l.startsWith("<li")).join("");
  const paras   = lines.filter((l) => l.startsWith("<p")).join("");
  return `
    <div style="margin-top:28px;padding:16px 20px;background:#f8f9ff;border-left:4px solid #6d28d9;border-radius:4px;page-break-inside:avoid">
      <h3 style="margin:0 0 12px;font-size:13px;color:#6d28d9;text-transform:uppercase;letter-spacing:1px">Analysis &amp; Interpretation</h3>
      ${paras}
      ${bullets ? `<ul style="margin:8px 0 0 16px;padding:0">${bullets}</ul>` : ""}
    </div>`;
}

// ── Chart config: thematic groups ────────────────────────────────────────────
// Each group: { title, type, keys[], colors[] }
// Keys are tried in order; any present & non-zero are included.

const CHART_GROUPS: { title: string; type: "bar" | "line"; keys: string[]; colors: string[] }[] = [
  // ── Income Statement ──
  { title: "Monthly Revenue & Net Profit",  type: "line", keys: ["Gross Revenue","Net Profit"],                                                                                                              colors: ["#3b82f6","#22c55e"] },
  { title: "Margin Trends",                 type: "line", keys: ["Gross Margin %","EBITDA Margin %","Net Margin %"],                                                                                        colors: ["#22c55e","#f59e0b","#a78bfa"] },
  { title: "Revenue vs Cost Structure",     type: "line", keys: ["Gross Revenue","Total of COGS","Total Operating Expenses"],                                                                               colors: ["#3b82f6","#ef4444","#f59e0b"] },
  { title: "EBITDA & EBIT",                 type: "bar",  keys: ["EBITDA","EBIT","PBT","Net Profit"],                                                                                                     colors: ["#f59e0b","#6d28d9","#0d9488","#22c55e"] },
  { title: "Fixed vs Variable Costs",       type: "bar",  keys: ["Total Fixed Costs","Total variable Costs"],                                                                                               colors: ["#6d28d9","#ef4444"] },
  // ── Unit Economics ──
  { title: "CAC vs LTV",                    type: "line", keys: ["CAC","LTV"],                                                                                                                               colors: ["#ef4444","#22c55e"] },
  { title: "LTV/CAC Ratio",                 type: "line", keys: ["LTV/CAC Ratio"],                                                                                                                           colors: ["#22c55e"] },
  { title: "Customers",                     type: "bar",  keys: ["Total Customers","Ending Customers"],                                                                                                      colors: ["#3b82f6","#6d28d9"] },
  { title: "Churn & Growth",                type: "line", keys: ["Churn Rate %","Churn Rate","Growth Rate %","Customer Growth %"],                                                                          colors: ["#ef4444","#ef4444","#22c55e","#22c55e"] },
  { title: "Contribution Margin",           type: "bar",  keys: ["Contribution Margin"],                                                                                                                     colors: ["#0d9488"] },
  { title: "Retention (GRR / NRR)",         type: "line", keys: ["Gross Revenue Retention (GRR)","Net Revenue Retention (NRR)","Retention %"],                                                             colors: ["#6d28d9","#22c55e","#3b82f6"] },
  { title: "Rule of 40 & Margin %",         type: "line", keys: ["Rule of 40","Contribution Margin %"],                                                                                                      colors: ["#6d28d9","#0d9488"] },
  // ── MRR ──
  { title: "MRR Trend",                     type: "line", keys: ["Beginning MRR","Ending MRR","New MRR","Churned MRR"],                                                                                     colors: ["#6d28d9","#22c55e","#3b82f6","#ef4444"] },
  // ── Movements / Cash ──
  { title: "Working Capital & Cash",        type: "line", keys: ["Working Capital (Closing)","Cash from Operations","Free Cash Flow"],                                                                      colors: ["#0d9488","#6d28d9","#22c55e"] },
  { title: "Receivables, Inventory & Payables", type: "line", keys: ["Trade Receivables (Closing)","Inventory (Closing)","Trade Payables (Closing)"],                                                   colors: ["#3b82f6","#f59e0b","#ef4444"] },
  { title: "Cash Conversion Cycle",         type: "line", keys: ["Days Sales Outstanding (DSO)","Days Inventory Outstanding (DIO)","Days Payable Outstanding (DPO)","Cash Conversion Cycle"],            colors: ["#3b82f6","#f59e0b","#ef4444","#6d28d9"] },
  // ── Balance Sheet ──
  { title: "Assets vs Liabilities",         type: "bar",  keys: ["TOTAL ASSETS","TOTAL LIABILITIES","Total Equity"],                                                                                       colors: ["#3b82f6","#ef4444","#22c55e"] },
  { title: "Current Assets vs Liabilities", type: "line", keys: ["Total Current Assets","Total Current Liabilities"],                                                                                      colors: ["#22c55e","#ef4444"] },
  { title: "Non-Current Assets",            type: "bar",  keys: ["Total Non-Current Assets","Total Non-Current Liabilities"],                                                                              colors: ["#6d28d9","#f59e0b"] },
  // ── Cash Flow Statement ──
  { title: "Cash Flow Components",          type: "bar",  keys: ["Net Cash Flow from Operating Activities (CFO)","Cash Flow from Investing Activities (CFI)","Cash Flow from Financing Activities (CFF)"], colors: ["#22d3ee","#a78bfa","#f59e0b"] },
  { title: "Ending Cash Balance",           type: "line", keys: ["Ending Cash"],                                                                                                                             colors: ["#22d3ee"] },
  { title: "Net Cash Flow",                 type: "bar",  keys: ["Net Cash Flow"],                                                                                                                           colors: ["#22c55e"] },
  // ── Funding Model (monthlyData) ──
  { title: "Revenue vs Expenses",           type: "bar",  keys: ["Revenue","Total Revenue","Total Expenses"],                                                                                              colors: ["#22c55e","#22c55e","#ef4444"] },
  { title: "Cumulative Cash",               type: "line", keys: ["Cumulative Cash"],                                                                                                                         colors: ["#3b82f6"] },
  { title: "Net Cash Flow",                 type: "bar",  keys: ["Net Cash Flow"],                                                                                                                           colors: ["#22c55e"] },
];

// ── Chart section generator ───────────────────────────────────────────────────

function generateCharts(calc: Calculation): string {
  const out = calc.outputs as Record<string, any>;
  const slug = calc.modelSlug;
  const charts: string[] = [];

  const MONTHS_PDF = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];
  const md = out?.monthlyData as Record<string, any> | undefined;
  if (md) {
    const savedMonths = Object.keys(md).filter((m) => Object.values(md[m] || {}).some((v) => Number(v) !== 0));
    // Always use full fiscal year as x-axis, zero-filling gaps — matches model page
    const months = MONTHS_PDF;
    if (savedMonths.length > 0) {
      const isCommonUtil = slug.includes("common-utility");
      if (!isCommonUtil) {
        for (const group of CHART_GROUPS) {
          const presentKeys = group.keys.filter((k) => months.some((m) => Number(md[m]?.[k]) !== 0));
          if (!presentKeys.length) continue;
          if (group.type === "bar" && presentKeys.length === 1) {
            const vals = months.map((m) => Number(md[m]?.[presentKeys[0]]) || 0);
            if (vals.some((v) => v !== 0))
              charts.push(svgBarChart(months, vals, group.colors[0], group.title));
          } else if (presentKeys.length > 0) {
            const series = presentKeys.map((k, i) => ({
              name: k,
              values: months.map((m) => Number(md[m]?.[k]) || 0),
              color: group.colors[i % group.colors.length],
            })).filter((s) => s.values.some((v) => v !== 0));
            if (series.length === 1 && group.type === "bar")
              charts.push(svgBarChart(months, series[0].values, series[0].color, group.title));
            else if (series.length > 0)
              charts.push(svgLineChart(months, series, group.title));
          }
        }
      }

      // ── Income Statement special charts ──
      if (slug.includes("income") || slug.includes("p-l") || slug.includes("pl") || slug.includes("common-utility")) {
        // Annual Summary bar
        const annual = out?.annual as Record<string, number> | undefined;
        if (annual) {
          const annKeys = ["Gross Revenue","Gross Profit","EBITDA","EBIT","Net Profit"];
          const annVals = annKeys.map((k) => Number(annual[k]) || 0);
          if (annVals.some((v) => v !== 0))
            charts.push(svgBarChart(annKeys.map((k) => k.replace(" ","\n")), annVals, "#6d28d9", "Annual Summary"));
        }
        // P&L Composition donut (use first populated month's costs)
        const firstMonth = savedMonths[0] || months[0];
        const fm = md[firstMonth] as Record<string, number> | undefined;
        if (fm) {
          const cogsV = Number(fm["Total of COGS"]) || 0;
          const fixedV = Number(fm["Total Fixed Costs"]) || 0;
          const varV = Number(fm["Total variable Costs"]) || 0;
          const opexV = Number(fm["Total Operating Expenses"]) || 0;
          const segs = [
            { name: "COGS", value: cogsV, color: "#ef4444" },
            { name: "OPEX", value: opexV, color: "#a78bfa" },
            { name: "Fixed", value: fixedV, color: "#6d28d9" },
          ].filter((s) => s.value > 0);
          if (segs.length > 1) charts.push(svgDonutChart(segs, "P&L Cost Composition"));
          // OPEX breakdown donut
          const opexSegs = [
            { name: "Salaries", value: Number(fm["Salaries & Benefits"]) || 0, color: "#6d28d9" },
            { name: "Rent & Utils", value: Number(fm["Rent & Utilities"]) || 0, color: "#3b82f6" },
            { name: "Marketing", value: Number(fm["Marketing & Advertising"]) || 0, color: "#f59e0b" },
            { name: "Tech & IT", value: Number(fm["Technology & IT Costs"]) || 0, color: "#0d9488" },
            { name: "Legal & Prof.", value: Number(fm["Professional & Legal Fees"]) || 0, color: "#22c55e" },
            { name: "Travel", value: Number(fm["Travel"]) || 0, color: "#ec4899" },
            { name: "Miscl.", value: Number(fm["Miscll Operating expenses"]) || 0, color: "#94a3b8" },
          ].filter((s) => s.value > 0);
          if (opexSegs.length > 1) charts.push(svgDonutChart(opexSegs, `OPEX Breakdown (${firstMonth})`));
        }
      }
    }
  }

  // ── Burn/Runway: charts from status[] array ──
  const statusArr = out?.status as Record<string, any>[] | undefined;
  if (Array.isArray(statusArr) && statusArr.length > 0 && statusArr[0]?.month) {
    const sMonths = statusArr.map((s) => String(s.month));
    const cashVals = statusArr.map((s) => Number(s.cumulativeCash) || 0);
    const burnVals = statusArr.map((s) => Number(s.netBurn) || 0);
    const runwayVals = statusArr.map((s) => {
      const r = Number(s.runway);
      return isFinite(r) ? Math.min(r, 36) : 36;
    });
    if (cashVals.some((v) => v !== 0))
      charts.push(svgLineChart(sMonths, [{ name: "Cumulative Cash", values: cashVals, color: "#3b82f6" }], "Cumulative Cash Position"));
    if (burnVals.some((v) => v !== 0))
      charts.push(svgBarChart(sMonths, burnVals, "#ef4444", "Monthly Net Burn"));
    if (runwayVals.some((v) => v > 0))
      charts.push(svgLineChart(sMonths, [{ name: "Runway (mo)", values: runwayVals, color: "#f59e0b" }], "Runway Trend (months)"));
  }

  // ── Income Statement (standalone — saves annual + derived) ──
  if (slug === "income-statement") {
    const annual = out?.annual as Record<string, number> | undefined;
    const derived = out?.derived as Record<string, number> | undefined;
    if (annual) {
      const plSegs = [
        { name: "COGS", value: Math.abs(Number(annual["Total of COGS"]) || 0), color: "#ef4444" },
        { name: "OpEx", value: Math.abs(Number(annual["Total Operating Expenses"]) || 0), color: "#f59e0b" },
        { name: "D&A", value: Math.abs(Number(annual["Depreciation & Amortization"]) || 0), color: "#a78bfa" },
        { name: "Interest", value: Math.abs(Number(annual["Interest Expense"]) || 0), color: "#60a5fa" },
        { name: "Net Profit", value: Math.max(0, Number(annual["Net Profit"]) || 0), color: "#34d399" },
      ].filter(s => s.value > 0);
      if (plSegs.length > 1) charts.push(svgDonutChart(plSegs, "Annual P&L Composition"));
      const annKeys = ["Gross Revenue","Gross Profit","EBITDA","EBIT","Net Profit"];
      const annVals = annKeys.map(k => Number(annual[k]) || 0);
      if (annVals.some(v => v !== 0))
        charts.push(svgBarChart(annKeys, annVals, "#60a5fa", "Annual Summary"));
      const rev = Number(annual["Gross Revenue"]) || 0;
      const cogs = Math.abs(Number(annual["Total of COGS"]) || 0);
      const opex = Math.abs(Number(annual["Total Operating Expenses"]) || 0);
      const da = Math.abs(Number(annual["Depreciation & Amortization"]) || 0);
      const interest2 = Math.abs(Number(annual["Interest Expense"]) || 0);
      const tax = Math.abs(Number(annual["Tax"]) || 0);
      const netP = Number(annual["Net Profit"]) || 0;
      if (rev > 0)
        charts.push(svgBarChart(
          ["Revenue","COGS","OpEx","D&A","Interest","Tax","Net Profit"],
          [rev, cogs, opex, da, interest2, tax, Math.abs(netP)],
          "#60a5fa", "Revenue to Net Profit Waterfall"));
    }
    if (derived) {
      const gmPct = Math.max(0, (Number(derived.grossMarginAnnual) || 0) * 100);
      const ebitdaPct = Math.max(0, (Number(derived.ebitdaMarginAnnual) || 0) * 100);
      const netPct = Math.max(0, (Number(derived.netMarginAnnual) || 0) * 100);
      if (gmPct > 0 || ebitdaPct > 0 || netPct > 0)
        charts.push(svgBarChart(["Gross Margin","EBITDA Margin","Net Margin"], [gmPct, ebitdaPct, netPct], "#34d399", "Annual Margins (%)"));
    }
  }

  // ── Cash Flow Statement (monthlyData with CFO/CFI/CFF/Ending Cash) ──
  if (slug === "cash-flow-statement" && md) {
    const savedMonths = Object.keys(md).filter((m) => Object.values(md[m] || {}).some((v) => Number(v) !== 0));
    if (savedMonths.length > 0) {
      const months = savedMonths;
      // CFO/CFI/CFF stacked bar
      const cfoVals = months.map((m) => Number(md[m]?.["Net Cash Flow from Operating Activities (CFO)"]) || 0);
      const cfiVals = months.map((m) => Number(md[m]?.["Cash Flow from Investing Activities (CFI)"]) || 0);
      const cffVals = months.map((m) => Number(md[m]?.["Cash Flow from Financing Activities (CFF)"]) || 0);
      if (cfoVals.some((v) => v !== 0) || cfiVals.some((v) => v !== 0) || cffVals.some((v) => v !== 0)) {
        charts.push(svgLineChart(months,
          [{ name: "CFO", values: cfoVals, color: "#22d3ee" },
           { name: "CFI", values: cfiVals, color: "#a78bfa" },
           { name: "CFF", values: cffVals, color: "#f59e0b" }],
          "Monthly CFO, CFI & CFF"));
      }
      // Ending Cash line
      const endingVals = months.map((m) => Number(md[m]?.["Ending Cash"]) || 0);
      if (endingVals.some((v) => v !== 0)) {
        charts.push(svgLineChart(months,
          [{ name: "Ending Cash", values: endingVals, color: "#22d3ee" }],
          "Ending Cash Trend"));
      }
      // Net Cash Flow bar
      const netVals = months.map((m) => Number(md[m]?.["Net Cash Flow"]) || 0);
      if (netVals.some((v) => v !== 0)) {
        charts.push(svgBarChart(months, netVals, "#34d399", "Monthly Net Cash Flow"));
      }
      // Annual composition donut
      const annual = out?.annual as Record<string, number> | undefined;
      if (annual) {
        const cfSegs = [
          { name: "CFO", value: Math.abs(Number(annual["Net Cash Flow from Operating Activities (CFO)"]) || 0), color: "#22d3ee" },
          { name: "CFI", value: Math.abs(Number(annual["Cash Flow from Investing Activities (CFI)"]) || 0), color: "#a78bfa" },
          { name: "CFF", value: Math.abs(Number(annual["Cash Flow from Financing Activities (CFF)"]) || 0), color: "#f59e0b" },
        ].filter((s) => s.value > 0);
        if (cfSegs.length > 1) charts.push(svgDonutChart(cfSegs, "Annual Cash Flow Composition"));
      }
    }
  }

  // ── Cashflow Ops (sub-model of Cash Flow Statement) ──
  if (slug === "cashflow-ops" && md) {
    const cfMonths = Object.keys(md).filter((m) => Object.values(md[m] || {}).some((v) => Number(v) !== 0));
    if (cfMonths.length > 0) {
      // CFO/CFI/CFF lines
      const cfoVals = cfMonths.map((m) => Number(md[m]?.["Net Cash Flow from Operating Activities (CFO)"]) || 0);
      const cfiVals = cfMonths.map((m) => Number(md[m]?.["Cash Flow from Investing Activities (CFI)"]) || 0);
      const cffVals = cfMonths.map((m) => Number(md[m]?.["Cash Flow from Financing Activities (CFF)"]) || 0);
      if (cfoVals.some((v) => v !== 0) || cfiVals.some((v) => v !== 0) || cffVals.some((v) => v !== 0)) {
        charts.push(svgLineChart(cfMonths,
          [{ name: "CFO", values: cfoVals, color: "#22d3ee" },
           { name: "CFI", values: cfiVals, color: "#a78bfa" },
           { name: "CFF", values: cffVals, color: "#f59e0b" }],
          "Monthly CFO, CFI & CFF"));
      }
      // Ending Cash line
      const endingVals = cfMonths.map((m) => Number(md[m]?.["Closing Balance"]) || 0);
      if (endingVals.some((v) => v !== 0)) {
        charts.push(svgLineChart(cfMonths,
          [{ name: "Closing Balance", values: endingVals, color: "#22d3ee" }],
          "Closing Balance Trend"));
      }
      // Net Cash Flow bar
      const netVals = cfMonths.map((m) => Number(md[m]?.["Net Cash Flow"]) || 0);
      if (netVals.some((v) => v !== 0)) {
        charts.push(svgBarChart(cfMonths, netVals, "#34d399", "Monthly Net Cash Flow"));
      }
    }
  }

  // ── Consolidated CFO (sub-model of Cash Flow Statement) ──
  if (slug === "consolidated-cfo" && md) {
    const cfoMonths = Object.keys(md);
    if (cfoMonths.length > 0) {
      // CFO/PAT trend
      const patVals = cfoMonths.map((m) => Number(md[m]?.cfoPat) || 0);
      if (patVals.some((v) => v !== 0)) {
        charts.push(svgLineChart(cfoMonths,
          [{ name: "CFO/PAT", values: patVals, color: "#f59e0b" }],
          "CFO/PAT Ratio Trend"));
      }
      // Ending Cash trend
      const endVals = cfoMonths.map((m) => Number(md[m]?.endingCash) || 0);
      if (endVals.some((v) => v !== 0)) {
        charts.push(svgLineChart(cfoMonths,
          [{ name: "Ending Cash", values: endVals, color: "#22d3ee" }],
          "Ending Cash Trend"));
      }
    }
  }

  // ── Flat outputs: all model types ──────────────────────────────────────────
  if (!md) {
    const inp = calc.inputs as Record<string, any>;

    // ── Revenue Model ──
    if (slug === "revenue-model") {
      const monthly = Number(out.monthlyRevenue) || 0;
      if (monthly > 0) {
        const labels = ["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12"];
        const cumul = Array.from({ length: 12 }, (_, i) => monthly * (i + 1));
        charts.push(svgBarChart(labels, Array(12).fill(monthly), "#a78bfa", "12-Month Revenue Projection"));
        charts.push(svgLineChart(labels,
          [{ name: "Monthly", values: Array(12).fill(monthly), color: "#a78bfa" },
           { name: "Cumulative", values: cumul, color: "#34d399" }],
          "Monthly vs Cumulative Revenue"));
        const annual = Number(out.annualRevenue) || monthly * 12;
        charts.push(svgDonutChart([
          { name: "Monthly Revenue", value: monthly, color: "#a78bfa" },
          { name: "Remaining Annual", value: annual - monthly, color: "#34d399" },
        ], "Revenue Composition"));
      }
    }

    // ── Break-Even (all tiers: break-even-basic, std-break-even, inv-break-even) ──
    if (slug.includes("break-even")) {
      const beUnits = Number(out.breakEvenUnits) || 0;
      const price = Number(out.pricePerUnit || inp.pricePerUnit || inp.sellingPricePerUnit) || 0;
      const varCost = Number(out.variableCostPerUnit || inp.variableCostPerUnit) || 0;
      const fixed = Number(out.fixedCostMonthly || inp.fixedCostMonthly || inp.fixedCosts) || 0;
      const contrib = Number(out.contributionPerUnit) || (price - varCost);
      if (beUnits > 0 && price > 0) {
        const step = Math.max(1, Math.floor(beUnits * 1.8 / 10));
        const units = Array.from({ length: 11 }, (_, i) => i * step);
        charts.push(svgLineChart(units.map(String),
          [{ name: "Revenue", values: units.map(u => u * price), color: "#34d399" },
           { name: "Total Cost", values: units.map(u => fixed + u * varCost), color: "#ef4444" }],
          "Revenue vs Total Cost"));
        // Projection uses results.projection if available
        const proj = out.projection as { units: number; revenue: number; totalCost: number; profit: number }[] | undefined;
        if (Array.isArray(proj) && proj.length) {
          charts.push(svgBarChart(proj.map(r => r.units.toLocaleString()), proj.map(r => r.profit), "#34d399", "Profit / Loss by Units"));
        }
      }
      if (price > 0 || varCost > 0 || fixed > 0) {
        charts.push(svgBarChart(
          ["Price/Unit", "Var Cost/Unit", "Contribution/Unit"],
          [price, varCost, contrib],
          "#60a5fa", "Contribution Breakdown"));
        if (fixed > 0 || varCost > 0)
          charts.push(svgDonutChart([
            { name: "Fixed Costs", value: fixed, color: "#f59e0b" },
            { name: "Variable Costs", value: varCost * (beUnits || 1), color: "#ef4444" },
          ].filter(s => s.value > 0), "Cost Structure"));
      }
    }

    // ── Costing Model ──
    if (slug === "costing-model") {
      const fixed = Number(out.totalFixedCosts) || 0;
      const variable = Number(out.totalVariableCost) || 0;
      if (fixed > 0 || variable > 0)
        charts.push(svgDonutChart([
          { name: "Fixed Costs", value: fixed, color: "#f59e0b" },
          { name: "Variable Costs", value: variable, color: "#ef4444" },
        ].filter(s => s.value > 0), "Fixed vs Variable Costs"));
      const salaries = Number(inp.salaries) || 0;
      const rent = Number(inp.officeRent) || 0;
      const utils = Number(inp.utilities) || 0;
      const sw = Number(inp.softwareSubscriptions) || 0;
      const admin = Number(inp.administrativeCosts) || 0;
      const other = Number(inp.otherFixedCosts) || 0;
      const costItems = [salaries, rent, utils, sw, admin, other];
      if (costItems.some(v => v > 0))
        charts.push(svgBarChart(["Salaries","Rent","Utilities","Software","Admin","Other Fixed"], costItems, "#f59e0b", "Cost Breakdown"));
    }

    // ── Business Snapshot (std + inv) ──
    if (slug.includes("business-snapshot")) {
      const revenue = Number(inp.monthlyRevenue) || 0;
      const burn = Number(inp.burnRate) || 0;
      const cash = Number(inp.cashBalance) || 0;
      const ltv = Number(inp.ltv) || 0;
      const cac = Number(inp.cac) || 0;
      const healthScore = Number(out.healthScore) || 0;
      if (revenue > 0 || burn > 0 || cash > 0)
        charts.push(svgBarChart(
          ["Revenue/mo","Cash Balance","Burn Rate","LTV","CAC"],
          [revenue, cash, burn, ltv, cac],
          "#60a5fa", "Key Metrics Overview"));
      if (revenue > 0 && burn > 0)
        charts.push(svgDonutChart([
          { name: "Revenue", value: revenue, color: "#34d399" },
          { name: "Burn Rate", value: burn, color: "#ef4444" },
        ], "Revenue vs Burn"));
      const recv = Number(inp.receivables) || 0;
      const inv = Number(inp.inventory) || 0;
      const pay = Number(inp.payables) || 0;
      if (recv > 0 || inv > 0 || pay > 0)
        charts.push(svgDonutChart([
          { name: "Receivables", value: recv, color: "#60a5fa" },
          { name: "Inventory", value: inv, color: "#f59e0b" },
          { name: "Payables", value: pay, color: "#ef4444" },
        ].filter(s => s.value > 0), "Working Capital Composition"));
      if (healthScore > 0)
        charts.push(svgBarChart(["Health Score"], [healthScore], "#34d399", `Health Score: ${healthScore}%`));
    }

    // ── Know Your Numbers ──
    if (slug === "know-your-numbers") {
      const score = Number(out.readinessPercentage) || 0;
      const sections = out.sectionScores as { section: string; percentage: number }[] | undefined;
      if (Array.isArray(sections) && sections.length > 0) {
        charts.push(svgBarChart(sections.map(s => s.section), sections.map(s => Math.round(s.percentage)), "#a78bfa", "Score by Section"));
      }
      if (score > 0)
        charts.push(svgBarChart(["Readiness Score"], [score], "#a78bfa", `Readiness: ${Math.round(score)}%`));
    }

    // ── Cap Table ──
    if (slug.includes("cap-table")) {
      const shareholders = out.shareholderData as { name: string; ownershipPct: number; investment: number }[] | undefined;
      if (Array.isArray(shareholders) && shareholders.length > 0) {
        charts.push(svgDonutChart(shareholders.map((s, i) => ({
          name: s.name,
          value: Math.round(s.ownershipPct * 100) / 100,
          color: ["#3b82f6","#22c55e","#f59e0b","#a78bfa","#ef4444","#0d9488","#ec4899","#94a3b8"][i % 8],
        })), "Shareholder Ownership"));
        charts.push(svgBarChart(shareholders.map(s => s.name), shareholders.map(s => s.investment), "#3b82f6", "Shareholder Investment"));
      }
    }

    // ── DCF Valuation ──
    if (slug.includes("dcf")) {
      const proj = out.projection as { year: string; revenue: number; ebitda: number; fcff: number; pvOfFCFF: number }[] | undefined;
      if (Array.isArray(proj) && proj.length > 0) {
        charts.push(svgBarChart(proj.map(r => r.year), proj.map(r => r.revenue), "#60a5fa", "Revenue Projection"));
        charts.push(svgLineChart(proj.map(r => r.year),
          [{ name: "FCFF", values: proj.map(r => r.fcff), color: "#f59e0b" },
           { name: "PV of FCFF", values: proj.map(r => r.pvOfFCFF), color: "#a78bfa" }],
          "FCFF vs PV of FCFF"));
        const ev = Number(out.enterpriseValue) || 0;
        const eq = Number(out.equityValue) || 0;
        if (ev > 0 && eq > 0)
          charts.push(svgDonutChart([
            { name: "Equity Value", value: eq, color: "#34d399" },
            { name: "Debt", value: ev - eq, color: "#ef4444" },
          ].filter(s => s.value > 0), "Enterprise vs Equity Value"));
      }
    }

    // ── Funding Model summary (only scalars saved) ──
    if (slug.includes("funding-model")) {
      const summ = (out.openingCash !== undefined ? out : null) as Record<string, any> | null;
      if (summ) {
        const opening = Number(summ.openingCash) || 0;
        const deficit = Number(summ.maxCashDeficit) || 0;
        const req = Number(summ.fundingRequired) || 0;
        const contingency = Number(summ.contingency) || 0;
        const total = Number(summ.totalFunding) || 0;
        if (total > 0)
          charts.push(svgBarChart(
            ["Opening Cash","Max Deficit","Funding Req","Contingency","Total Funding"],
            [opening, Math.abs(deficit), req, contingency, total],
            "#60a5fa", "Funding Summary"));
      }
    }
  }

  if (!charts.length) return "";
  return `<div style="margin-top:28px;page-break-inside:avoid">
    <h3 style="font-size:14px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Charts</h3>
    ${charts.join("")}
  </div>`;
}

// ── Section header helper ─────────────────────────────────────────────────────

function sectionHeader(title: string, icon: string, color = "#6d28d9", bg = "#f5f0ff"): string {
  return `<div style="display:flex;align-items:center;gap:10px;margin:32px 0 14px;padding:10px 16px;background:${bg};border-left:4px solid ${color};border-radius:0 8px 8px 0">
    <span style="font-size:18px">${icon}</span>
    <span style="font-size:12px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:1.5px">${title}</span>
  </div>`;
}

// ── Metric card row (for key outputs) ────────────────────────────────────────

function metricCards(items: { label: string; value: string; color?: string }[]): string {
  const cards = items.slice(0, 8).map(({ label, value, color = "#6d28d9" }) =>
    `<div style="flex:1;min-width:130px;background:linear-gradient(135deg,${color}18,${color}08);border:1px solid ${color}33;border-radius:12px;padding:14px 16px;text-align:center">
      <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${label}</div>
      <div style="font-size:18px;font-weight:800;color:${color}">${value}</div>
    </div>`
  ).join("");
  return `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px">${cards}</div>`;
}

// ── Main exportPDF ────────────────────────────────────────────────────────────

function exportPDF(calc: Calculation) {
  const tierInfo = TIER_INFO[calc.tier] || TIER_INFO.free;
  const PURPLE = "#6d28d9";
  const TEAL   = "#0d9488";
  const AMBER  = "#d97706";

  // Tier accent colour
  const tierColor = calc.tier === "investor" ? AMBER : calc.tier === "standard" ? PURPLE : calc.tier === "standalone" ? TEAL : "#16a34a";

  // ── Key metric cards from flat outputs ──
  let heroCards = "";
  if (isPlainObject(calc.outputs)) {
    const out = calc.outputs as Record<string, unknown>;
    const flat = Object.entries(out)
      .filter(([, v]) => typeof v === "number" && v !== 0)
      .slice(0, 6)
      .map(([k, v]) => ({ label: k, value: formatVal(v), color: tierColor }));
    if (flat.length) heroCards = metricCards(flat);
  }

  // ── Inputs table ──
  let inputsHTML = "";
  if (isPlainObject(calc.inputs) && isMonthlyData(calc.inputs)) {
    const months = Object.keys(calc.inputs);
    const allFields = new Set<string>();
    months.forEach((m) => { if (isPlainObject(calc.inputs[m])) Object.keys(calc.inputs[m] as Record<string, unknown>).forEach((f) => allFields.add(f)); });
    inputsHTML = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead><tr style="background:${tierColor};color:#fff">
        <th style="text-align:left;padding:8px 10px;font-weight:600">Field</th>
        ${months.map((m) => `<th style="text-align:right;padding:8px 10px;font-weight:600">${m}</th>`).join("")}
      </tr></thead><tbody>
      ${[...allFields].map((field, i) => `<tr style="background:${i % 2 === 0 ? "#fafafa" : "#fff"}">
        <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#444;font-weight:500">${field}</td>
        ${months.map((m) => { const mdata = calc.inputs[m] as Record<string, unknown> | undefined; return `<td style="text-align:right;padding:6px 10px;border-bottom:1px solid #eee;color:#222">${mdata ? formatVal(mdata[field]) : "—"}</td>`; }).join("")}
      </tr>`).join("")}
      </tbody></table></div>`;
  } else {
    const rows = flattenToRows(calc.inputs).filter((r) => r.value !== "0" && r.value !== "");
    const half = Math.ceil(rows.length / 2);
    const left  = rows.slice(0, half);
    const right = rows.slice(half);
    const maxRows = Math.max(left.length, right.length);
    inputsHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px">
      ${Array.from({ length: maxRows }, (_, i) => {
        const l = left[i];
        const r = right[i];
        return `<tr style="background:${i % 2 === 0 ? "#fafafa" : "#fff"}">
          ${l ? `<td style="padding:7px 10px;border-bottom:1px solid #eee;color:#555;width:28%">${l.key}</td>
                 <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:${tierColor};width:22%">${l.value}</td>` : `<td colspan="2" style="padding:7px 10px"></td>`}
          <td style="width:4%"></td>
          ${r ? `<td style="padding:7px 10px;border-bottom:1px solid #eee;color:#555;width:28%">${r.key}</td>
                 <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:${tierColor};width:22%">${r.value}</td>` : `<td colspan="2" style="padding:7px 10px"></td>`}
        </tr>`;
      }).join("")}
    </table>`;
  }

  // ── Outputs table ──
  let outputsHTML = "";
  if (isPlainObject(calc.outputs)) {
    const out = calc.outputs as Record<string, unknown>;
    if (out.monthlyData && isPlainObject(out.monthlyData)) {
      const md = out.monthlyData as Record<string, Record<string, unknown>>;
      const months = Object.keys(md);
      const allFields = new Set<string>();
      months.forEach((m) => { if (isPlainObject(md[m])) Object.keys(md[m]).forEach((f) => allFields.add(f)); });
      outputsHTML = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr style="background:${tierColor};color:#fff">
          <th style="text-align:left;padding:8px 10px;font-weight:600">Metric</th>
          ${months.map((m) => `<th style="text-align:right;padding:8px 10px;font-weight:600">${m}</th>`).join("")}
        </tr></thead><tbody>
        ${[...allFields].map((field, i) => `<tr style="background:${i % 2 === 0 ? "#fafafa" : "#fff"}">
          <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#444;font-weight:500">${field}</td>
          ${months.map((m) => `<td style="text-align:right;padding:6px 10px;border-bottom:1px solid #eee;color:#222">${formatVal(md[m]?.[field])}</td>`).join("")}
        </tr>`).join("")}
        </tbody></table></div>`;
      const PDF_SKIP = new Set(["monthlyData", "status", "monthsAdded", "monthsWithData"]);
      const statusEntry = out["status"] as { month?: string; rag?: string }[] | undefined;
      const statusHTML = Array.isArray(statusEntry) && statusEntry.length > 0
        ? `${sectionHeader("Monthly Status", "🚦", "#6d28d9", "#f5f0ff")}<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">${
            statusEntry.map((s) => {
              const color = s.rag === "GREEN" ? "#16a34a" : s.rag === "AMBER" ? "#d97706" : "#dc2626";
              const bg    = s.rag === "GREEN" ? "#f0fdf4" : s.rag === "AMBER" ? "#fffbeb" : "#fef2f2";
              return `<span style="background:${bg};border:1px solid ${color}44;color:${color};font-size:10px;font-weight:700;padding:4px 10px;border-radius:100px">${s.month ?? ""} · ${s.rag ?? ""}</span>`;
            }).join("")
          }</div>` : "";
      const summaryKeys = Object.keys(out).filter((k) => !PDF_SKIP.has(k));
      if (summaryKeys.length > 0 || statusHTML) {
        const summaryRows = summaryKeys.flatMap((k) => isPlainObject(out[k]) ? flattenToRows(out[k] as Record<string, any>, k) : Array.isArray(out[k]) ? [] : [{ key: k, value: formatVal(out[k]) }]);
        outputsHTML += statusHTML;
        if (summaryRows.length > 0) outputsHTML += `${sectionHeader("Summary", "📊", TEAL, "#f0fdfa")}
          <table style="width:100%;border-collapse:collapse;font-size:12px">
          ${summaryRows.map((r, i) => `<tr style="background:${i % 2 === 0 ? "#fafafa" : "#fff"}">
            <td style="padding:7px 12px;border-bottom:1px solid #eee;color:#555">${r.key}</td>
            <td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:${TEAL}">${r.value}</td>
          </tr>`).join("")}
          </table>`;
      }
    } else {
      const rows = flattenToRows(calc.outputs).filter((r) => r.value !== "—");
      const half = Math.ceil(rows.length / 2);
      const left  = rows.slice(0, half);
      const right = rows.slice(half);
      const maxRows = Math.max(left.length, right.length);
      outputsHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px">
        ${Array.from({ length: maxRows }, (_, i) => {
          const l = left[i];
          const r = right[i];
          return `<tr style="background:${i % 2 === 0 ? "#fafafa" : "#fff"}">
            ${l ? `<td style="padding:7px 10px;border-bottom:1px solid #eee;color:#555;width:28%">${l.key}</td>
                   <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:${tierColor};width:22%">${l.value}</td>` : `<td colspan="2"></td>`}
            <td style="width:4%"></td>
            ${r ? `<td style="padding:7px 10px;border-bottom:1px solid #eee;color:#555;width:28%">${r.key}</td>
                   <td style="padding:7px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:700;color:${tierColor};width:22%">${r.value}</td>` : `<td colspan="2"></td>`}
          </tr>`;
        }).join("")}
      </table>`;
    }
  }

  const chartsHTML   = generateCharts(calc);
  const analysisHTML = generateAnalysis(calc);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${calc.modelName} — FinMech Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    *, *::before, *::after { box-sizing: border-box; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      @page { margin: 14mm 12mm; size: A4; }
      .page-break { page-break-before: always; }
      .no-break { page-break-inside: avoid; }
      .cover { page-break-after: always; }
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #1a1a2e; margin: 0; padding: 0; background: #fff; font-size: 13px;
    }

    /* ── Cover Page ── */
    .cover {
      min-height: 100vh;
      background: linear-gradient(145deg, #0f0c29 0%, #1a0e4e 45%, #100e3a 100%);
      display: flex; flex-direction: column; justify-content: space-between;
      padding: 60px 56px; color: #fff; position: relative; overflow: hidden;
    }
    .cover::before {
      content: '';
      position: absolute; top: -120px; right: -120px;
      width: 520px; height: 520px;
      background: radial-gradient(circle, ${tierColor}55 0%, transparent 70%);
      border-radius: 50%;
    }
    .cover::after {
      content: '';
      position: absolute; bottom: -80px; left: -80px;
      width: 380px; height: 380px;
      background: radial-gradient(circle, #0d948844 0%, transparent 70%);
      border-radius: 50%;
    }
    .cover-brand {
      display: flex; align-items: center; gap: 12px; position: relative; z-index: 1;
    }
    .cover-logo {
      width: 40px; height: 40px; background: ${tierColor};
      border-radius: 10px; display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 900; color: #fff;
    }
    .cover-brand-name {
      font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #fff;
    }
    .cover-center { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 60px 0 40px; }
    .cover-tag {
      display: inline-block; background: ${tierColor}33; border: 1px solid ${tierColor}66;
      color: ${tierColor === AMBER ? "#fbbf24" : "#a78bfa"}; font-size: 10px; font-weight: 700;
      letter-spacing: 2px; text-transform: uppercase; padding: 5px 14px; border-radius: 100px;
      margin-bottom: 20px; width: fit-content;
    }
    .cover-title {
      font-size: 42px; font-weight: 900; letter-spacing: -1px;
      line-height: 1.1; color: #fff; margin: 0 0 16px;
    }
    .cover-subtitle {
      font-size: 14px; color: rgba(255,255,255,0.55); line-height: 1.6; max-width: 480px;
    }
    .cover-meta {
      display: flex; gap: 32px; margin-top: 40px; position: relative; z-index: 1;
    }
    .cover-meta-item { border-left: 2px solid ${tierColor}; padding-left: 14px; }
    .cover-meta-label { font-size: 9px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
    .cover-meta-value { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); }
    .cover-bottom { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: flex-end; }
    .cover-divider { width: 60px; height: 3px; background: ${tierColor}; border-radius: 2px; margin-bottom: 20px; }
    .cover-confidential { font-size: 9px; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 2px; }

    /* ── Body ── */
    .body-wrap { max-width: 900px; margin: 0 auto; padding: 36px 44px; }
    .section { margin-bottom: 32px; }
    .section-header {
      display: flex; align-items: center; gap: 10px;
      margin: 0 0 16px; padding: 10px 16px;
      border-radius: 0 10px 10px 0; border-left: 4px solid;
    }
    .section-icon { font-size: 16px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }

    /* ── Hero cards ── */
    .hero-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 8px; }
    .hero-card {
      flex: 1; min-width: 120px; border-radius: 12px; padding: 16px 18px; text-align: center;
      border: 1px solid; position: relative; overflow: hidden;
    }
    .hero-card-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .hero-card-value { font-size: 20px; font-weight: 900; }

    /* ── Tables ── */
    table { width: 100%; border-collapse: collapse; }
    thead tr { color: #fff; }
    thead th { padding: 9px 11px; font-size: 11px; font-weight: 600; }
    tbody td { padding: 7px 11px; font-size: 11px; border-bottom: 1px solid #f0f0f0; }
    tbody tr:last-child td { border-bottom: none; }

    /* ── Analysis box ── */
    .analysis-box {
      background: linear-gradient(135deg, #f5f0ff, #fff);
      border: 1px solid #d4b8ff; border-left: 5px solid ${PURPLE};
      border-radius: 0 12px 12px 0; padding: 20px 24px; margin-top: 32px;
    }
    .analysis-title {
      font-size: 11px; font-weight: 700; color: ${PURPLE};
      text-transform: uppercase; letter-spacing: 2px; margin: 0 0 14px;
      display: flex; align-items: center; gap: 8px;
    }
    .analysis-box p { font-size: 12px; color: #333; line-height: 1.7; margin: 6px 0; }
    .analysis-box ul { margin: 8px 0 0 18px; padding: 0; }
    .analysis-box li { font-size: 12px; color: #333; line-height: 1.8; }

    /* ── Charts section ── */
    .charts-section { margin-top: 32px; }

    /* ── Footer ── */
    .footer {
      margin-top: 48px; padding-top: 16px;
      border-top: 1px solid #eee;
      display: flex; justify-content: space-between; align-items: center;
    }
    .footer-brand { font-size: 11px; font-weight: 700; color: ${PURPLE}; }
    .footer-text { font-size: 9px; color: #bbb; text-align: center; flex: 1; padding: 0 16px; }
    .footer-page { font-size: 10px; color: #ccc; }
  </style>
</head>
<body>

  <!-- ══════════ COVER PAGE ══════════ -->
  <div class="cover">
    <div class="cover-brand">
      <div class="cover-logo">F</div>
      <div class="cover-brand-name">FinMech</div>
    </div>

    <div class="cover-center">
      <div class="cover-tag">${tierInfo.name} Plan &nbsp;·&nbsp; Financial Report</div>
      <h1 class="cover-title">${calc.modelName}</h1>
      <p class="cover-subtitle">A comprehensive financial analysis report including inputs, results, data visualisations, and expert interpretation of your calculations.</p>
      <div class="cover-meta">
        <div class="cover-meta-item">
          <div class="cover-meta-label">Generated On</div>
          <div class="cover-meta-value">${new Date(calc.createdAt).toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" })}</div>
        </div>
        <div class="cover-meta-item">
          <div class="cover-meta-label">Time</div>
          <div class="cover-meta-value">${new Date(calc.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</div>
        </div>
        <div class="cover-meta-item">
          <div class="cover-meta-label">Model Type</div>
          <div class="cover-meta-value">${tierInfo.name}</div>
        </div>
      </div>
    </div>

    <div class="cover-bottom">
      <div>
        <div class="cover-divider"></div>
        <div class="cover-confidential">Confidential &nbsp;·&nbsp; For Internal Use Only</div>
      </div>
      <div style="text-align:right;font-size:9px;color:rgba(255,255,255,0.25)">
        Powered by FinMech<br/>${new Date().getFullYear()}
      </div>
    </div>
  </div>

  <!-- ══════════ REPORT BODY ══════════ -->
  <div class="body-wrap">

    ${heroCards ? `
    <div class="section no-break">
      <div class="section-header" style="background:#f5f0ff;border-color:${PURPLE}">
        <span class="section-icon">⚡</span>
        <span class="section-title" style="color:${PURPLE}">Key Highlights</span>
      </div>
      ${heroCards}
    </div>` : ""}

    <div class="section no-break">
      <div class="section-header" style="background:#f0f9ff;border-color:#0284c7">
        <span class="section-icon">📋</span>
        <span class="section-title" style="color:#0284c7">Inputs</span>
      </div>
      ${inputsHTML}
    </div>

    <div class="section">
      <div class="section-header" style="background:#f0fdf4;border-color:#16a34a">
        <span class="section-icon">📈</span>
        <span class="section-title" style="color:#16a34a">Results</span>
      </div>
      ${outputsHTML}
    </div>

    ${chartsHTML ? `
    <div class="charts-section no-break">
      <div class="section-header" style="background:#fffbeb;border-color:${AMBER}">
        <span class="section-icon">📊</span>
        <span class="section-title" style="color:${AMBER}">Data Visualisation</span>
      </div>
      ${chartsHTML.replace('<div style="margin-top:28px;page-break-inside:avoid"><h3 style="font-size:14px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Charts</h3>', '<div>')}
    </div>` : ""}

    ${analysisHTML.replace(
      '<div style="margin-top:28px;padding:16px 20px;background:#f8f9ff;border-left:4px solid #6d28d9;border-radius:4px;page-break-inside:avoid">',
      '<div class="analysis-box no-break">'
    ).replace(
      '<h3 style="margin:0 0 12px;font-size:13px;color:#6d28d9;text-transform:uppercase;letter-spacing:1px">Analysis &amp; Interpretation</h3>',
      '<div class="analysis-title">🔍 Analysis &amp; Interpretation</div>'
    )}

    <div class="footer">
      <div class="footer-brand">FinMech</div>
      <div class="footer-text">This report was generated by FinMech on ${new Date().toLocaleDateString()}. All figures are based on user-provided inputs. Verify independently before making financial decisions.</div>
      <div class="footer-page">${new Date().getFullYear()}</div>
    </div>
  </div>

</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 800);
}

// ========== DATA RENDERER ==========

// ── Inline history charts (React/ECharts) ────────────────────────────────────

const SKIP_KEYS = new Set(["status", "monthsAdded", "monthsWithData"]);

const FISCAL_MONTHS = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];

function HistoryCharts({ outputs, inputs, modelSlug }: { outputs: Record<string, any>; inputs: Record<string, any>; modelSlug: string }) {
  const charts = useMemo(() => {
    const md = outputs?.monthlyData as Record<string, any> | undefined;
    const hasStatus = Array.isArray(outputs?.status) && (outputs.status as any[]).length > 0;
    if (!md && !hasStatus && !modelSlug.includes("break-even") && !modelSlug.includes("business-snapshot") && !modelSlug.includes("costing-model") && !modelSlug.includes("revenue-model") && !modelSlug.includes("know-your-numbers") && !modelSlug.includes("cap-table") && !modelSlug.includes("dcf") && !modelSlug.includes("funding-model") && modelSlug !== "income-statement" && modelSlug !== "cash-flow-statement" && modelSlug !== "cashflow-ops" && modelSlug !== "consolidated-cfo") return [];
    // Find which months have any data
    const savedMonths = !md ? [] : Object.keys(md).filter((m) =>
      Object.values(md[m] || {}).some((v) => Number(v) !== 0)
    );
    // Use full fiscal year order as x-axis, zero-filling gaps (matches model page behaviour)
    const months = FISCAL_MONTHS;

    const result: { title: string; option: object; tall?: boolean }[] = [];
    const FMT = (v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(Math.round(v));
    const TIP = { trigger: "axis" as const, backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 10 } };
    const isCommonUtil = modelSlug.includes("common-utility");

    if (md && savedMonths.length > 0 && !isCommonUtil) {
      for (const group of CHART_GROUPS) {
        const presentKeys = group.keys.filter((k) =>
          months.some((m) => Number(md![m]?.[k]) !== 0)
        );
        if (!presentKeys.length) continue;

        const seriesData = presentKeys.map((k, i) => {
          const vals = months.map((m) => Number(md![m]?.[k]) || 0);
          const color = group.colors[i % group.colors.length];
          if (!vals.some((v) => v !== 0) && !savedMonths.some((m) => (md![m]?.[k]) !== undefined)) return null;
          if (group.type === "bar" && presentKeys.length === 1) {
            return { name: k, type: "bar" as const, data: vals.map((v) => ({ value: v, itemStyle: { color, borderRadius: [3,3,0,0] } })) };
          }
          const seriesType: "bar" | "line" = group.type === "bar" ? "bar" : "line";
          return { name: k, type: seriesType, data: vals, smooth: true, lineStyle: { color, width: 2 }, itemStyle: { color, borderRadius: group.type === "bar" ? [3,3,0,0] : undefined }, symbol: "circle", symbolSize: 4 };
        }).filter(Boolean);

        if (!seriesData.length) continue;
        const hasLegend = presentKeys.length > 1;
        result.push({
          title: group.title,
          option: {
            tooltip: TIP,
            ...(hasLegend ? { legend: { data: presentKeys, textStyle: { color: "#aaa", fontSize: 9 }, top: 0, itemWidth: 10, itemHeight: 8 } } : {}),
            grid: { top: hasLegend ? 28 : 10, right: 8, bottom: 28, left: 54 },
            xAxis: { type: "category", data: months, axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
            yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
            series: seriesData,
          },
        });
      }
    }

    // ── Burn/Runway: charts from status[] ──
    const statusArr = outputs?.status as Record<string, any>[] | undefined;
    if (Array.isArray(statusArr) && statusArr.length > 0 && statusArr[0]?.month) {
      const sMonths = statusArr.map((s: any) => String(s.month));
      const cashVals = statusArr.map((s: any) => Number(s.cumulativeCash) || 0);
      const burnVals = statusArr.map((s: any) => Number(s.netBurn) || 0);
      const runwayVals = statusArr.map((s: any) => {
        const r = Number(s.runway);
        return isFinite(r) ? Math.min(r, 36) : 36;
      });
      const TIP = { trigger: "axis" as const, backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 10 } };
      const FMT2 = (v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(Math.round(v));
      if (cashVals.some((v) => v !== 0)) result.push({
        title: "Cumulative Cash Position",
        option: {
          tooltip: TIP,
          grid: { top: 10, right: 8, bottom: 28, left: 54 },
          xAxis: { type: "category", data: sMonths, axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
          yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT2 }, splitLine: { lineStyle: { color: "#222" } } },
          series: [{ type: "line", smooth: true, data: cashVals, lineStyle: { color: "#3b82f6", width: 2 }, areaStyle: { color: "rgba(59,130,246,0.15)" }, itemStyle: { color: "#3b82f6" }, symbol: "circle", symbolSize: 4 }],
        },
      });
      if (burnVals.some((v) => v !== 0)) result.push({
        title: "Monthly Net Burn",
        option: {
          tooltip: TIP,
          grid: { top: 10, right: 8, bottom: 28, left: 54 },
          xAxis: { type: "category", data: sMonths, axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
          yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT2 }, splitLine: { lineStyle: { color: "#222" } } },
          series: [{ type: "bar", data: burnVals.map((v) => ({ value: v, itemStyle: { color: v > 0 ? "#ef4444" : "#22c55e", borderRadius: [3,3,0,0] } })) }],
        },
      });
      if (runwayVals.some((v) => v > 0)) result.push({
        title: "Runway Trend (months)",
        option: {
          tooltip: TIP,
          grid: { top: 10, right: 8, bottom: 28, left: 40 },
          xAxis: { type: "category", data: sMonths, axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
          yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: (v: number) => `${v}mo` }, splitLine: { lineStyle: { color: "#222" } } },
          series: [{ type: "line", smooth: true, data: runwayVals, lineStyle: { color: "#f59e0b", width: 2 }, itemStyle: { color: "#f59e0b" }, symbol: "circle", symbolSize: 4 }],
        },
      });
    }

    // ── Income Statement special charts ──
    const isIS = modelSlug.includes("income") || modelSlug.includes("p-l") || modelSlug.includes("pl") || modelSlug.includes("common-utility");
    if (isIS && md) {
      // Monthly Revenue & Net Profit (chart 1)
      const revVals = months.map((m) => Number(md[m]?.["Gross Revenue"]) || 0);
      const netVals = months.map((m) => Number(md[m]?.["Net Profit"]) || 0);
      if (revVals.some((v) => v !== 0) || netVals.some((v) => v !== 0)) result.push({
        title: "Monthly Revenue & Net Profit",
        option: {
          tooltip: TIP,
          legend: { data: ["Revenue","Net Profit"], textStyle: { color: "#aaa", fontSize: 9 }, top: 0, itemWidth: 10, itemHeight: 8 },
          grid: { top: 28, right: 8, bottom: 28, left: 54 },
          xAxis: { type: "category", data: months, axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
          yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
          series: [
            { name: "Revenue", type: "bar", data: revVals.map((v) => ({ value: v, itemStyle: { color: "#3b82f6", borderRadius: [3,3,0,0] } })) },
            { name: "Net Profit", type: "line", smooth: true, data: netVals, lineStyle: { color: "#22c55e", width: 2 }, itemStyle: { color: "#22c55e" }, symbol: "circle", symbolSize: 4 },
          ],
        },
      });
      // Margin Trends (chart 2)
      const gmVals = months.map((m) => Number(md![m]?.["Gross Margin %"]) || 0);
      const ebVals = months.map((m) => Number(md![m]?.["EBITDA Margin %"]) || 0);
      const nmVals = months.map((m) => Number(md![m]?.["Net Margin %"]) || 0);
      if (gmVals.some((v) => v !== 0) || ebVals.some((v) => v !== 0) || nmVals.some((v) => v !== 0)) result.push({
        title: "Margin Trends",
        option: {
          tooltip: TIP,
          legend: { data: ["Gross %","EBITDA %","Net %"], textStyle: { color: "#aaa", fontSize: 9 }, top: 0, itemWidth: 10, itemHeight: 8 },
          grid: { top: 28, right: 8, bottom: 28, left: 44 },
          xAxis: { type: "category", data: months, axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
          yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: (v: number) => `${v}%` }, splitLine: { lineStyle: { color: "#222" } } },
          series: [
            { name: "Gross %", type: "line", smooth: true, data: gmVals, lineStyle: { color: "#22c55e", width: 2 }, itemStyle: { color: "#22c55e" }, symbol: "circle", symbolSize: 4 },
            { name: "EBITDA %", type: "line", smooth: true, data: ebVals, lineStyle: { color: "#f59e0b", width: 2 }, itemStyle: { color: "#f59e0b" }, symbol: "circle", symbolSize: 4 },
            { name: "Net %", type: "line", smooth: true, data: nmVals, lineStyle: { color: "#a78bfa", width: 2 }, itemStyle: { color: "#a78bfa" }, symbol: "circle", symbolSize: 4 },
          ],
        },
      });
      // Revenue vs Cost Structure (chart 5)
      const cogsVals = months.map((m) => Math.abs(Number(md![m]?.["Total of COGS"]) || 0));
      const opexVals = months.map((m) => Math.abs(Number(md![m]?.["Total Operating Expenses"]) || 0));
      if (revVals.some((v) => v !== 0) || cogsVals.some((v) => v !== 0) || opexVals.some((v) => v !== 0)) result.push({
        title: "Revenue vs Cost Structure",
        option: {
          tooltip: TIP,
          legend: { data: ["Revenue","COGS","OPEX"], textStyle: { color: "#aaa", fontSize: 9 }, top: 0, itemWidth: 10, itemHeight: 8 },
          grid: { top: 28, right: 8, bottom: 28, left: 54 },
          xAxis: { type: "category", data: months, axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
          yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
          series: [
            { name: "Revenue", type: "line", smooth: true, data: revVals, lineStyle: { color: "#3b82f6", width: 2 }, itemStyle: { color: "#3b82f6" }, symbol: "circle", symbolSize: 4 },
            { name: "COGS", type: "bar", stack: "cost", data: cogsVals.map((v) => ({ value: v, itemStyle: { color: "#ef4444" } })) },
            { name: "OPEX", type: "bar", stack: "cost", data: opexVals.map((v) => ({ value: v, itemStyle: { color: "#f59e0b" } })) },
          ],
        },
      });
      // Annual Summary
      const annual = outputs?.annual as Record<string, number> | undefined;
      if (annual) {
        const annKeys = ["Gross Revenue","Gross Profit","EBITDA","EBIT","Net Profit"];
        const annVals = annKeys.map((k) => Number(annual[k]) || 0);
        const annColors = ["#22c55e","#22c55e","#f59e0b","#a78bfa","#ef4444"];
        if (annVals.some((v) => v !== 0)) result.push({
          title: "Annual Summary",
          option: {
            tooltip: TIP,
            grid: { top: 28, right: 8, bottom: 36, left: 56 },
            xAxis: { type: "category", data: annKeys, axisLabel: { color: "#888", fontSize: 9, interval: 0, rotate: 15 }, axisLine: { lineStyle: { color: "#333" } } },
            yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
            series: [{ type: "bar", data: annVals.map((v, i) => ({ value: v, itemStyle: { color: annColors[i], borderRadius: [3,3,0,0] } })) }],
          },
        });
      }
      // P&L Composition donut
      const firstMonth = savedMonths[0] || months[0];
      const fm = md![firstMonth] as Record<string, number> | undefined;
      if (fm) {
        const cogsV = Number(fm["Total of COGS"]) || 0;
        const fixedV = Number(fm["Total Fixed Costs"]) || 0;
        const varV = Number(fm["Total variable Costs"]) || 0;
        const segs = [
          { name: "COGS", value: cogsV, color: "#ef4444" },
          { name: "Variable Costs", value: varV, color: "#a78bfa" },
          { name: "Fixed Costs", value: fixedV, color: "#f59e0b" },
        ].filter((s) => s.value > 0);
        if (segs.length > 1) result.push({
          title: "Annual P&L Composition",
          option: {
            tooltip: { trigger: "item" as const, backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 10 }, formatter: "{b}: {d}%" },
            legend: { orient: "vertical" as const, right: 0, top: "center", textStyle: { color: "#aaa", fontSize: 9 } },
            series: [{ type: "pie", radius: ["40%","70%"], center: ["40%","50%"], data: segs.map((s) => ({ name: s.name, value: s.value, itemStyle: { color: s.color } })), label: { color: "#aaa", fontSize: 9 } }],
          },
        });
        // OPEX Breakdown donut
        const opexSegs = [
          { name: "Salaries", value: Number(fm["Salaries & Benefits"]) || 0, color: "#6d28d9" },
          { name: "Rent & Utils", value: Number(fm["Rent & Utilities"]) || 0, color: "#3b82f6" },
          { name: "Marketing", value: Number(fm["Marketing & Advertising"]) || 0, color: "#f59e0b" },
          { name: "Tech & IT", value: Number(fm["Technology & IT Costs"]) || 0, color: "#0d9488" },
          { name: "Legal & Prof.", value: Number(fm["Professional & Legal Fees"]) || 0, color: "#22c55e" },
          { name: "Travel", value: Number(fm["Travel"]) || 0, color: "#ec4899" },
          { name: "Miscl.", value: Number(fm["Miscll Operating expenses"]) || 0, color: "#94a3b8" },
        ].filter((s) => s.value > 0);
        if (opexSegs.length > 1) result.push({
          title: `OPEX Breakdown (${firstMonth})`,
          option: {
            tooltip: { trigger: "item" as const, backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 10 }, formatter: "{b}: {d}%" },
            legend: { orient: "vertical" as const, right: 0, top: "center", textStyle: { color: "#aaa", fontSize: 9 } },
            series: [{ type: "pie", radius: ["40%","70%"], center: ["40%","50%"], data: opexSegs.map((s) => ({ name: s.name, value: s.value, itemStyle: { color: s.color } })), label: { color: "#aaa", fontSize: 9 } }],
          },
        });
      }
    }

    // ── Flat outputs: all model types (no monthlyData) ──────────────────────
    if (!md) {
      const inp = inputs || {};
      const PIE = { trigger: "item" as const, backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 10 } };
      const COLORS = ["#3b82f6","#22c55e","#f59e0b","#a78bfa","#ef4444","#0d9488","#ec4899","#94a3b8"];

      // Revenue Model
      if (modelSlug === "revenue-model") {
        const monthly = Number(outputs.monthlyRevenue) || 0;
        if (monthly > 0) {
          const labels = ["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12"];
          const cumul = Array.from({ length: 12 }, (_, i) => monthly * (i + 1));
          result.push({ title: "12-Month Revenue Projection", option: {
            tooltip: TIP, grid: { top: 28, right: 8, bottom: 28, left: 54 },
            xAxis: { type: "category", data: labels, axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
            yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
            legend: { data: ["Monthly","Cumulative"], textStyle: { color: "#aaa", fontSize: 9 }, top: 0 },
            series: [
              { name: "Monthly", type: "bar", data: Array(12).fill(monthly).map(v => ({ value: v, itemStyle: { color: "#a78bfa", borderRadius: [3,3,0,0] } })) },
              { name: "Cumulative", type: "line", smooth: true, data: cumul, lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" }, symbol: "circle", symbolSize: 4 },
            ],
          }});
          const annual = Number(outputs.annualRevenue) || monthly * 12;
          result.push({ title: "Revenue Composition", option: {
            tooltip: PIE,
            series: [{ type: "pie", radius: ["40%","70%"], center: ["50%","50%"],
              data: [
                { name: "Monthly Revenue", value: monthly, itemStyle: { color: "#a78bfa" } },
                { name: "Remaining Annual", value: annual - monthly, itemStyle: { color: "#34d399" } },
              ], label: { color: "#aaa", fontSize: 9 },
            }],
          }});
        }
      }

      // Break-Even (all tiers)
      if (modelSlug.includes("break-even")) {
        const beUnits = Number(outputs.breakEvenUnits) || 0;
        const price = Number(outputs.pricePerUnit) || 0;
        const varCost = Number(outputs.variableCostPerUnit) || 0;
        const fixed = Number(outputs.fixedCostMonthly) || 0;
        const contrib = Number(outputs.contributionPerUnit) || (price - varCost);
        const proj = outputs.projection as { units: number; revenue: number; totalCost: number; profit: number }[] | undefined;
        if (price > 0 && beUnits > 0) {
          const step = Math.max(1, Math.floor(beUnits * 1.8 / 10));
          const uArr = Array.from({ length: 11 }, (_, i) => i * step);
          result.push({ title: "Revenue vs Total Cost", option: {
            tooltip: TIP, legend: { data: ["Revenue","Total Cost"], textStyle: { color: "#aaa", fontSize: 9 }, top: 0 },
            grid: { top: 28, right: 8, bottom: 28, left: 54 },
            xAxis: { type: "category", data: uArr.map(String), axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
            yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
            series: [
              { name: "Revenue", type: "line", smooth: true, data: uArr.map(u => u * price), lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" }, symbol: "circle", symbolSize: 4 },
              { name: "Total Cost", type: "line", smooth: true, data: uArr.map(u => fixed + u * varCost), lineStyle: { color: "#ef4444", width: 2 }, itemStyle: { color: "#ef4444" }, symbol: "circle", symbolSize: 4 },
            ],
          }});
        }
        if (Array.isArray(proj) && proj.length > 0) {
          result.push({ title: "Profit / Loss by Units", option: {
            tooltip: TIP, grid: { top: 10, right: 8, bottom: 28, left: 54 },
            xAxis: { type: "category", data: proj.map(r => r.units.toLocaleString()), axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
            yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
            series: [{ type: "bar", data: proj.map(r => ({ value: r.profit, itemStyle: { color: r.profit >= 0 ? "#34d399" : "#ef4444", borderRadius: [3,3,0,0] } })) }],
          }});
          result.push({ title: "Cost Structure", option: {
            tooltip: PIE,
            series: [{ type: "pie", radius: ["40%","70%"], center: ["50%","50%"], label: { color: "#aaa", fontSize: 9 },
              data: [
                { name: "Fixed Cost", value: fixed, itemStyle: { color: "#f59e0b" } },
                { name: "Variable Cost", value: varCost * beUnits, itemStyle: { color: "#ef4444" } },
              ].filter(d => d.value > 0),
            }],
          }});
        }
        if (price > 0 || varCost > 0 || contrib > 0) {
          result.push({ title: "Contribution Breakdown", option: {
            tooltip: TIP, grid: { top: 10, right: 8, bottom: 36, left: 54 },
            xAxis: { type: "category", data: ["Price/Unit","Var Cost/Unit","Contribution/Unit","Fixed Cost"], axisLabel: { color: "#888", fontSize: 9, interval: 0, rotate: 12 }, axisLine: { lineStyle: { color: "#333" } } },
            yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
            series: [{ type: "bar", data: [
              { value: price, itemStyle: { color: "#60a5fa", borderRadius: [3,3,0,0] } },
              { value: varCost, itemStyle: { color: "#ef4444", borderRadius: [3,3,0,0] } },
              { value: contrib, itemStyle: { color: "#34d399", borderRadius: [3,3,0,0] } },
              { value: fixed, itemStyle: { color: "#f59e0b", borderRadius: [3,3,0,0] } },
            ]}],
          }});
        }
        const cmRatio = price > 0 ? Math.round((contrib / price) * 1000) / 10 : 0;
        if (cmRatio > 0) result.push({ title: "Contribution Margin Ratio", option: {
          series: [{ type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: 100,
            pointer: { show: true, length: "60%", width: 4, itemStyle: { color: "#60a5fa" } },
            axisLine: { lineStyle: { width: 20, color: [[0.25, "#ef4444"],[0.5, "#f59e0b"],[1, "#34d399"]] } },
            axisTick: { show: false }, splitLine: { show: false },
            axisLabel: { color: "#888", fontSize: 9, distance: 25 },
            detail: { formatter: "{value}%", color: "#e0e0e0", fontSize: 18, offsetCenter: [0,"70%"] },
            data: [{ value: cmRatio }],
          }],
        }});
      }

      // Costing Model
      if (modelSlug === "costing-model") {
        const fixed = Number(outputs.totalFixedCosts) || 0;
        const variable = Number(outputs.totalVariableCost) || 0;
        if (fixed > 0 || variable > 0) result.push({ title: "Fixed vs Variable Costs", option: {
          tooltip: PIE,
          series: [{ type: "pie", radius: ["40%","70%"], center: ["50%","50%"], label: { color: "#aaa", fontSize: 9 },
            data: [
              { name: "Fixed Costs", value: fixed, itemStyle: { color: "#f59e0b" } },
              { name: "Variable Costs", value: variable, itemStyle: { color: "#ef4444" } },
            ].filter(d => d.value > 0),
          }],
        }});
        const costData = [
          { label: "Salaries", value: Number(outputs.salaries || inp.salaries) || 0, color: "#f59e0b" },
          { label: "Rent", value: Number(outputs.officeRent || inp.officeRent) || 0, color: "#fb923c" },
          { label: "Utilities", value: Number(outputs.utilities || inp.utilities) || 0, color: "#fbbf24" },
          { label: "Software", value: Number(outputs.softwareSubscriptions || inp.softwareSubscriptions) || 0, color: "#a78bfa" },
          { label: "Admin", value: Number(outputs.administrativeCosts || inp.administrativeCosts) || 0, color: "#60a5fa" },
          { label: "Other Fixed", value: Number(outputs.otherFixedCosts || inp.otherFixedCosts) || 0, color: "#94a3b8" },
        ].filter(d => d.value > 0);
        if (costData.length > 0) result.push({ title: "Cost Breakdown", option: {
          tooltip: TIP, grid: { top: 10, right: 8, bottom: 8, left: 74 },
          yAxis: { type: "category", data: costData.map(d => d.label), axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
          xAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
          series: [{ type: "bar", data: costData.map(d => ({ value: d.value, itemStyle: { color: d.color, borderRadius: [0,4,4,0] } })) }],
        }});
      }

      // Business Snapshot (std + inv)
      if (modelSlug.includes("business-snapshot")) {
        const revenue = Number(outputs.monthlyRevenue || inp.monthlyRevenue) || 0;
        const burn = Number(outputs.burnRate || inp.burnRate) || 0;
        const cash = Number(outputs.cashBalance || inp.cashBalance) || 0;
        const ltv = Number(outputs.ltv || inp.ltv) || 0;
        const cac = Number(outputs.cac || inp.cac) || 0;
        const healthScore = Number(outputs.healthScore) || 0;
        const revenueStatus = String(outputs.revenueStatus || "");
        const marginStatus = String(outputs.marginStatus || "");
        const runwayStatus = String(outputs.runwayStatus || "");
        const ltcCacStatus = String(outputs.ltcCacStatus || "");
        const statusToScore = (s: string) => s === "GREEN" ? 5 : s === "AMBER" ? 3 : s === "RED" ? 1 : 0;
        const radarVals = [revenueStatus, marginStatus, runwayStatus, ltcCacStatus].map(statusToScore);
        if (radarVals.some(v => v > 0)) result.push({ title: "Business Health Radar", option: {
          radar: {
            indicator: [{ name: "Revenue", max: 5 },{ name: "Margins", max: 5 },{ name: "Runway", max: 5 },{ name: "LTV/CAC", max: 5 }],
            axisName: { color: "#aaa", fontSize: 9 },
            splitArea: { areaStyle: { color: ["transparent"] } },
            splitLine: { lineStyle: { color: "#333" } },
            axisLine: { lineStyle: { color: "#444" } },
          },
          series: [{ type: "radar", data: [{ value: radarVals, name: "Score", areaStyle: { color: "rgba(96,165,250,0.2)" }, lineStyle: { color: "#60a5fa", width: 2 }, itemStyle: { color: "#60a5fa" } }] }],
        }});
        if (healthScore > 0) result.push({ title: "Health Score", option: {
          series: [{ type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: 100,
            pointer: { show: true, length: "60%", width: 4, itemStyle: { color: "#60a5fa" } },
            axisLine: { lineStyle: { width: 20, color: [[0.33, "#ef4444"],[0.66, "#f59e0b"],[1, "#34d399"]] } },
            axisTick: { show: false }, splitLine: { show: false },
            axisLabel: { color: "#888", fontSize: 9, distance: 25 },
            detail: { formatter: "{value}%", color: "#e0e0e0", fontSize: 18, offsetCenter: [0,"70%"] },
            data: [{ value: healthScore }],
          }],
        }});
        const metricData = [
          { label: "Revenue/mo", value: revenue, color: "#60a5fa" },
          { label: "Cash Balance", value: cash, color: "#34d399" },
          { label: "Burn Rate", value: burn, color: "#ef4444" },
          { label: "LTV", value: ltv, color: "#a78bfa" },
          { label: "CAC", value: cac, color: "#f59e0b" },
        ].filter(d => d.value > 0);
        if (metricData.length > 0) result.push({ title: "Key Metrics Overview", option: {
          tooltip: TIP, grid: { top: 10, right: 8, bottom: 8, left: 84 },
          yAxis: { type: "category", data: metricData.map(d => d.label), axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
          xAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
          series: [{ type: "bar", data: metricData.map(d => ({ value: d.value, itemStyle: { color: d.color, borderRadius: [0,4,4,0] } })) }],
        }});
        if (revenue > 0 && burn > 0) result.push({ title: "Revenue vs Burn", option: {
          tooltip: PIE,
          series: [{ type: "pie", radius: ["40%","70%"], center: ["50%","50%"], label: { color: "#aaa", fontSize: 9 },
            data: [
              { name: "Revenue", value: revenue, itemStyle: { color: "#34d399" } },
              { name: "Burn Rate", value: burn, itemStyle: { color: "#ef4444" } },
            ],
          }],
        }});
        const recv = Number(outputs.receivables || inp.receivables) || 0;
        const invV = Number(outputs.inventory || inp.inventory) || 0;
        const payV = Number(outputs.payables || inp.payables) || 0;
        if (recv > 0 || invV > 0 || payV > 0) result.push({ title: "Working Capital Composition", option: {
          tooltip: PIE,
          series: [{ type: "pie", radius: ["40%","70%"], center: ["50%","50%"], label: { color: "#aaa", fontSize: 9 },
            data: [
              { name: "Receivables", value: recv, itemStyle: { color: "#60a5fa" } },
              { name: "Inventory", value: invV, itemStyle: { color: "#f59e0b" } },
              { name: "Payables", value: payV, itemStyle: { color: "#a78bfa" } },
            ].filter(d => d.value > 0),
          }],
        }});
      }

      // Know Your Numbers
      if (modelSlug === "know-your-numbers") {
        const sections = outputs.sectionScores as { section: string; percentage: number }[] | undefined;
        const score = Number(outputs.readinessPercentage) || 0;
        if (Array.isArray(sections) && sections.length > 0) {
          result.push({ title: "Score by Section", option: {
            tooltip: TIP, grid: { top: 10, right: 8, bottom: 8, left: 90 },
            yAxis: { type: "category", data: sections.map(s => s.section), axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
            xAxis: { type: "value", max: 100, axisLabel: { color: "#888", fontSize: 9, formatter: (v: number) => `${v}%` }, splitLine: { lineStyle: { color: "#222" } } },
            series: [{ type: "bar", data: sections.map((s, i) => ({ value: Math.round(s.percentage), itemStyle: { color: COLORS[i % COLORS.length], borderRadius: [0,4,4,0] } })) }],
          }});
          result.push({ title: "Section Radar", option: {
            radar: {
              indicator: sections.map(s => ({ name: s.section, max: 100 })),
              axisName: { color: "#aaa", fontSize: 9 },
              splitArea: { areaStyle: { color: ["transparent"] } },
              splitLine: { lineStyle: { color: "#333" } },
              axisLine: { lineStyle: { color: "#444" } },
            },
            series: [{ type: "radar", data: [{ value: sections.map(s => Math.round(s.percentage)), name: "Score", areaStyle: { color: "rgba(167,139,250,0.2)" }, lineStyle: { color: "#a78bfa", width: 2 }, itemStyle: { color: "#a78bfa" } }] }],
          }});
        }
        if (score > 0) result.push({ title: "Readiness Gauge", option: {
          series: [{ type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: 100,
            pointer: { show: true, length: "60%", width: 4, itemStyle: { color: "#a78bfa" } },
            axisLine: { lineStyle: { width: 20, color: [[0.5, "#ef4444"],[0.8, "#f59e0b"],[1, "#34d399"]] } },
            axisTick: { show: false }, splitLine: { show: false },
            axisLabel: { color: "#888", fontSize: 9, distance: 25 },
            detail: { formatter: "{value}%", color: "#e0e0e0", fontSize: 18, offsetCenter: [0,"70%"] },
            data: [{ value: Math.round(score) }],
          }],
        }});
      }

      // DCF Valuation
      if (modelSlug.includes("dcf")) {
        const proj = outputs.projection as { year: string; revenue: number; ebitda: number; fcff: number; pvOfFCFF: number }[] | undefined;
        if (Array.isArray(proj) && proj.length > 0) {
          result.push({ title: "Revenue & EBITDA Projection", option: {
            tooltip: TIP, legend: { data: ["Revenue","EBITDA"], textStyle: { color: "#aaa", fontSize: 9 }, top: 0 },
            grid: { top: 28, right: 8, bottom: 28, left: 54 },
            xAxis: { type: "category", data: proj.map(r => r.year), axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
            yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
            series: [
              { name: "Revenue", type: "bar", data: proj.map(r => ({ value: r.revenue, itemStyle: { color: "#60a5fa", borderRadius: [3,3,0,0] } })) },
              { name: "EBITDA", type: "line", smooth: true, data: proj.map(r => r.ebitda), lineStyle: { color: "#34d399", width: 2 }, itemStyle: { color: "#34d399" }, symbol: "circle", symbolSize: 4 },
            ],
          }});
          result.push({ title: "FCFF vs PV of FCFF", option: {
            tooltip: TIP, legend: { data: ["FCFF","PV of FCFF"], textStyle: { color: "#aaa", fontSize: 9 }, top: 0 },
            grid: { top: 28, right: 8, bottom: 28, left: 54 },
            xAxis: { type: "category", data: proj.map(r => r.year), axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
            yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
            series: [
              { name: "FCFF", type: "bar", data: proj.map(r => ({ value: r.fcff, itemStyle: { color: "#f59e0b", borderRadius: [3,3,0,0] } })) },
              { name: "PV of FCFF", type: "bar", data: proj.map(r => ({ value: r.pvOfFCFF, itemStyle: { color: "#a78bfa", borderRadius: [3,3,0,0] } })) },
            ],
          }});
          const ev = Number(outputs.enterpriseValue) || 0;
          const eq = Number(outputs.equityValue) || 0;
          const wacc = Number(outputs.wacc) || 0;
          if (ev > 0 || eq > 0) result.push({ title: "Enterprise vs Equity Value", option: {
            tooltip: PIE,
            series: [{ type: "pie", radius: ["40%","70%"], center: ["50%","50%"], label: { color: "#aaa", fontSize: 9 },
              data: [
                { name: "Equity Value", value: eq, itemStyle: { color: "#34d399" } },
                { name: "Debt", value: Math.max(ev - eq, 0), itemStyle: { color: "#ef4444" } },
              ].filter(d => d.value > 0),
            }],
          }});
          if (wacc > 0) result.push({ title: "WACC", option: {
            series: [{ type: "gauge", startAngle: 200, endAngle: -20, min: 0, max: 25,
              pointer: { show: true, length: "60%", width: 4, itemStyle: { color: "#60a5fa" } },
              axisLine: { lineStyle: { width: 20, color: [[0.4, "#34d399"],[0.7, "#f59e0b"],[1, "#ef4444"]] } },
              axisTick: { show: false }, splitLine: { show: false },
              axisLabel: { color: "#888", fontSize: 9, distance: 25, formatter: (v: number) => `${v}%` },
              detail: { formatter: (v: number) => `${v}%`, color: "#e0e0e0", fontSize: 18, offsetCenter: [0,"70%"] },
              data: [{ value: Math.round(wacc * 1000) / 10 }],
            }],
          }});
        }
      }

      // Cap Table
      if (modelSlug.includes("cap-table")) {
        const shs = outputs.shareholders as { name: string; ownershipPct: number; investment: number }[] | undefined;
        if (Array.isArray(shs) && shs.length > 0) {
          result.push({ title: "Shareholder Ownership", option: {
            tooltip: PIE,
            series: [{ type: "pie", radius: ["40%","70%"], center: ["50%","50%"], label: { color: "#aaa", fontSize: 9 },
              data: shs.map((s, i) => ({ name: s.name, value: Math.round(s.ownershipPct * 100) / 100, itemStyle: { color: COLORS[i % COLORS.length] } })),
            }],
          }});
          result.push({ title: "Shareholder Investment", option: {
            tooltip: TIP, grid: { top: 10, right: 8, bottom: 28, left: 54 },
            xAxis: { type: "category", data: shs.map(s => s.name), axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
            yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
            series: [{ type: "bar", data: shs.map((s, i) => ({ value: s.investment, itemStyle: { color: COLORS[i % COLORS.length], borderRadius: [3,3,0,0] } })) }],
          }});
        }
      }

      // Income Statement (standalone — saves annual + derived)
      if (modelSlug === "income-statement") {
        const annual = outputs.annual as Record<string, number> | undefined;
        const derived = outputs.derived as Record<string, number> | undefined;
        const PIE2 = { trigger: "item" as const, backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 10 } };
        if (annual) {
          const plSegs = [
            { name: "COGS", value: Math.abs(Number(annual["Total of COGS"]) || 0), color: "#ef4444" },
            { name: "OpEx", value: Math.abs(Number(annual["Total Operating Expenses"]) || 0), color: "#f59e0b" },
            { name: "D&A", value: Math.abs(Number(annual["Depreciation & Amortization"]) || 0), color: "#a78bfa" },
            { name: "Interest", value: Math.abs(Number(annual["Interest Expense"]) || 0), color: "#60a5fa" },
            { name: "Net Profit", value: Math.max(0, Number(annual["Net Profit"]) || 0), color: "#34d399" },
          ].filter(s => s.value > 0);
          if (plSegs.length > 1) result.push({ title: "Annual P&L Composition", option: {
            tooltip: PIE2,
            series: [{ type: "pie", radius: ["40%","70%"], center: ["50%","50%"], label: { color: "#aaa", fontSize: 9 },
              data: plSegs.map(s => ({ name: s.name, value: s.value, itemStyle: { color: s.color } })),
            }],
          }});
          const annKeys = ["Gross Revenue","Gross Profit","EBITDA","EBIT","Net Profit"];
          const annVals = annKeys.map(k => Number(annual[k]) || 0);
          const annColors = ["#60a5fa","#34d399","#a78bfa","#f59e0b","#ef4444"];
          if (annVals.some(v => v !== 0)) result.push({ title: "Annual Summary", option: {
            tooltip: TIP,
            grid: { top: 10, right: 8, bottom: 36, left: 54 },
            xAxis: { type: "category", data: annKeys, axisLabel: { color: "#888", fontSize: 9, rotate: 12, interval: 0 }, axisLine: { lineStyle: { color: "#333" } } },
            yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
            series: [{ type: "bar", data: annVals.map((v, i) => ({ value: v, itemStyle: { color: annColors[i], borderRadius: [3,3,0,0] } })) }],
          }});
          const rev = Number(annual["Gross Revenue"]) || 0;
          const cogs = Math.abs(Number(annual["Total of COGS"]) || 0);
          const opex = Math.abs(Number(annual["Total Operating Expenses"]) || 0);
          const da = Math.abs(Number(annual["Depreciation & Amortization"]) || 0);
          const interest = Math.abs(Number(annual["Interest Expense"]) || 0);
          const tax = Math.abs(Number(annual["Tax"]) || 0);
          const netProfit = Number(annual["Net Profit"]) || 0;
          if (rev > 0) result.push({ title: "Revenue to Net Profit Waterfall", option: {
            tooltip: TIP,
            grid: { top: 10, right: 8, bottom: 40, left: 54 },
            xAxis: { type: "category", data: ["Revenue","COGS","OpEx","D&A","Interest","Tax","Net Profit"], axisLabel: { color: "#888", fontSize: 9, rotate: 15, interval: 0 }, axisLine: { lineStyle: { color: "#333" } } },
            yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
            series: [{ type: "bar", data: [
              { value: rev, itemStyle: { color: "#60a5fa", borderRadius: [3,3,0,0] } },
              { value: cogs, itemStyle: { color: "#ef4444", borderRadius: [3,3,0,0] } },
              { value: opex, itemStyle: { color: "#f59e0b", borderRadius: [3,3,0,0] } },
              { value: da, itemStyle: { color: "#a78bfa", borderRadius: [3,3,0,0] } },
              { value: interest, itemStyle: { color: "#94a3b8", borderRadius: [3,3,0,0] } },
              { value: tax, itemStyle: { color: "#fb923c", borderRadius: [3,3,0,0] } },
              { value: Math.abs(netProfit), itemStyle: { color: netProfit >= 0 ? "#34d399" : "#ef4444", borderRadius: [3,3,0,0] } },
            ]}],
          }});
        }
        if (derived) {
          const gmPct = Math.max(0, (Number(derived.grossMarginAnnual) || 0) * 100);
          const ebitdaPct = Math.max(0, (Number(derived.ebitdaMarginAnnual) || 0) * 100);
          const netPct = Math.max(0, (Number(derived.netMarginAnnual) || 0) * 100);
          if (gmPct > 0 || ebitdaPct > 0 || netPct > 0) result.push({ title: "Annual Margins", option: {
            tooltip: TIP,
            grid: { top: 10, right: 8, bottom: 8, left: 90 },
            yAxis: { type: "category", data: ["Net Margin","EBITDA Margin","Gross Margin"], axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
            xAxis: { type: "value", max: 100, axisLabel: { color: "#888", fontSize: 9, formatter: (v: number) => `${v}%` }, splitLine: { lineStyle: { color: "#222" } } },
            series: [{ type: "bar", data: [
              { value: netPct, itemStyle: { color: "#34d399", borderRadius: [0,4,4,0] } },
              { value: ebitdaPct, itemStyle: { color: "#a78bfa", borderRadius: [0,4,4,0] } },
              { value: gmPct, itemStyle: { color: "#60a5fa", borderRadius: [0,4,4,0] } },
            ]}],
          }});
        }
      }

      // Cash Flow Statement (monthlyData + status)
      if (modelSlug === "cash-flow-statement" && md) {
        const cfMonths = savedMonths.length > 0 ? savedMonths : Object.keys(md);
        if (cfMonths.length > 0) {
          const PIE_CF = { trigger: "item" as const, backgroundColor: "#1a1a2e", borderColor: "#333", textStyle: { color: "#e0e0e0", fontSize: 10 } };
          // CFO/CFI/CFF line chart
          const cfoData = cfMonths.map(m => Number(md[m]?.["Net Cash Flow from Operating Activities (CFO)"]) || 0);
          const cfiData = cfMonths.map(m => Number(md[m]?.["Cash Flow from Investing Activities (CFI)"]) || 0);
          const cffData = cfMonths.map(m => Number(md[m]?.["Cash Flow from Financing Activities (CFF)"]) || 0);
          if (cfoData.some(v => v !== 0) || cfiData.some(v => v !== 0) || cffData.some(v => v !== 0)) {
            result.push({ title: "Monthly CFO, CFI & CFF", option: {
              tooltip: TIP, legend: { data: ["CFO","CFI","CFF"], textStyle: { color: "#aaa", fontSize: 9 }, top: 0 },
              grid: { top: 28, right: 8, bottom: 28, left: 54 },
              xAxis: { type: "category", data: cfMonths, axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
              series: [
                { name: "CFO", type: "line", smooth: true, data: cfoData, lineStyle: { color: "#22d3ee", width: 2 }, itemStyle: { color: "#22d3ee" }, symbol: "circle", symbolSize: 4 },
                { name: "CFI", type: "line", smooth: true, data: cfiData, lineStyle: { color: "#a78bfa", width: 2 }, itemStyle: { color: "#a78bfa" }, symbol: "circle", symbolSize: 4 },
                { name: "CFF", type: "line", smooth: true, data: cffData, lineStyle: { color: "#f59e0b", width: 2 }, itemStyle: { color: "#f59e0b" }, symbol: "circle", symbolSize: 4 },
              ],
            }});
          }
          // Ending Cash trend
          const endingData = cfMonths.map(m => Number(md[m]?.["Ending Cash"]) || 0);
          if (endingData.some(v => v !== 0)) {
            result.push({ title: "Ending Cash Trend", option: {
              tooltip: TIP,
              grid: { top: 10, right: 8, bottom: 28, left: 54 },
              xAxis: { type: "category", data: cfMonths, axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{ type: "line", smooth: true, data: endingData, lineStyle: { color: "#22d3ee", width: 2 }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(34,211,238,0.3)" }, { offset: 1, color: "rgba(34,211,238,0)" }] } }, itemStyle: { color: "#22d3ee" }, symbol: "circle", symbolSize: 4 }],
            }});
          }
          // Net Cash Flow bar
          const netData = cfMonths.map(m => Number(md[m]?.["Net Cash Flow"]) || 0);
          if (netData.some(v => v !== 0)) {
            result.push({ title: "Monthly Net Cash Flow", option: {
              tooltip: TIP,
              grid: { top: 10, right: 8, bottom: 28, left: 54 },
              xAxis: { type: "category", data: cfMonths, axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{ type: "bar", data: netData.map(v => ({ value: v, itemStyle: { color: v >= 0 ? "#34d399" : "#ef4444", borderRadius: [3,3,0,0] } })) }],
            }});
          }
          // Annual composition donut
          const annualCF = outputs.annual as Record<string, number> | undefined;
          if (annualCF) {
            const cfSegs = [
              { name: "CFO", value: Math.abs(Number(annualCF["Net Cash Flow from Operating Activities (CFO)"]) || 0), color: "#22d3ee" },
              { name: "CFI", value: Math.abs(Number(annualCF["Cash Flow from Investing Activities (CFI)"]) || 0), color: "#a78bfa" },
              { name: "CFF", value: Math.abs(Number(annualCF["Cash Flow from Financing Activities (CFF)"]) || 0), color: "#f59e0b" },
            ].filter(s => s.value > 0);
            if (cfSegs.length > 1) result.push({ title: "Annual Cash Flow Composition", option: {
              tooltip: PIE_CF,
              series: [{ type: "pie", radius: ["40%","70%"], center: ["50%","50%"], label: { color: "#aaa", fontSize: 9 },
                data: cfSegs.map(s => ({ name: s.name, value: s.value, itemStyle: { color: s.color } })),
              }],
            }});
          }
        }
      }

      // Cashflow Ops (sub-model of Cash Flow Statement)
      if (modelSlug === "cashflow-ops" && md) {
        const cfMonths = savedMonths.length > 0 ? savedMonths : Object.keys(md);
        if (cfMonths.length > 0) {
          // CFO/CFI/CFF lines
          const cfoData = cfMonths.map(m => Number(md[m]?.["Net Cash Flow from Operating Activities (CFO)"]) || 0);
          const cfiData = cfMonths.map(m => Number(md[m]?.["Cash Flow from Investing Activities (CFI)"]) || 0);
          const cffData = cfMonths.map(m => Number(md[m]?.["Cash Flow from Financing Activities (CFF)"]) || 0);
          if (cfoData.some(v => v !== 0) || cfiData.some(v => v !== 0) || cffData.some(v => v !== 0)) {
            result.push({ title: "Monthly CFO, CFI & CFF", option: {
              tooltip: TIP, legend: { data: ["CFO","CFI","CFF"], textStyle: { color: "#aaa", fontSize: 9 }, top: 0 },
              grid: { top: 28, right: 8, bottom: 28, left: 54 },
              xAxis: { type: "category", data: cfMonths, axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
              series: [
                { name: "CFO", type: "line", smooth: true, data: cfoData, lineStyle: { color: "#22d3ee", width: 2 }, itemStyle: { color: "#22d3ee" }, symbol: "circle", symbolSize: 4 },
                { name: "CFI", type: "line", smooth: true, data: cfiData, lineStyle: { color: "#a78bfa", width: 2 }, itemStyle: { color: "#a78bfa" }, symbol: "circle", symbolSize: 4 },
                { name: "CFF", type: "line", smooth: true, data: cffData, lineStyle: { color: "#f59e0b", width: 2 }, itemStyle: { color: "#f59e0b" }, symbol: "circle", symbolSize: 4 },
              ],
            }});
          }
          // Closing Balance trend
          const closingData = cfMonths.map(m => Number(md[m]?.["Closing Balance"]) || 0);
          if (closingData.some(v => v !== 0)) {
            result.push({ title: "Closing Balance Trend", option: {
              tooltip: TIP,
              grid: { top: 10, right: 8, bottom: 28, left: 54 },
              xAxis: { type: "category", data: cfMonths, axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{ type: "line", smooth: true, data: closingData, lineStyle: { color: "#22d3ee", width: 2 }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(34,211,238,0.3)" }, { offset: 1, color: "rgba(34,211,238,0)" }] } }, itemStyle: { color: "#22d3ee" }, symbol: "circle", symbolSize: 4 }],
            }});
          }
          // Net Cash Flow bar
          const netCFData = cfMonths.map(m => Number(md[m]?.["Net Cash Flow"]) || 0);
          if (netCFData.some(v => v !== 0)) {
            result.push({ title: "Monthly Net Cash Flow", option: {
              tooltip: TIP,
              grid: { top: 10, right: 8, bottom: 28, left: 54 },
              xAxis: { type: "category", data: cfMonths, axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{ type: "bar", data: netCFData.map(v => ({ value: v, itemStyle: { color: v >= 0 ? "#34d399" : "#ef4444", borderRadius: [3,3,0,0] } })) }],
            }});
          }
        }
      }

      // Consolidated CFO (sub-model of Cash Flow Statement)
      if (modelSlug === "consolidated-cfo" && md) {
        const cfoMonths = Object.keys(md);
        const cfData = md as Record<string, any>;
        if (cfoMonths.length > 0) {
          // CFO/PAT trend
          const patData = cfoMonths.map(m => Number(cfData[m]?.cfoPat) || 0);
          if (patData.some(v => v !== 0)) {
            result.push({ title: "CFO/PAT Ratio Trend", option: {
              tooltip: TIP,
              grid: { top: 15, right: 15, bottom: 30, left: 50 },
              xAxis: { type: "category", data: cfoMonths, axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", min: 0, max: 2, axisLabel: { color: "#888", fontSize: 9 }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{
                type: "line", smooth: true, data: patData,
                lineStyle: { color: "#f59e0b", width: 2 },
                itemStyle: { color: (params: any) => {
                  const val = params.value as number;
                  if (val > 1.2) return "#34d399";
                  if (val > 0.8) return "#f59e0b";
                  if (val > 0) return "#fb923c";
                  return "#ef4444";
                }},
                symbol: "circle", symbolSize: 8,
                markLine: {
                  data: [
                    { yAxis: 1.2, lineStyle: { color: "#34d399", type: "dashed" }, label: { show: false } },
                    { yAxis: 0.8, lineStyle: { color: "#f59e0b", type: "dashed" }, label: { show: false } },
                  ],
                  symbol: "none",
                },
              }],
            }});
          }
          // Ending Cash trend
          const endingData = cfoMonths.map(m => Number(cfData[m]?.endingCash) || 0);
          if (endingData.some(v => v !== 0)) {
            result.push({ title: "Ending Cash Trend", option: {
              tooltip: TIP,
              grid: { top: 10, right: 8, bottom: 28, left: 54 },
              xAxis: { type: "category", data: cfoMonths, axisLabel: { color: "#888", fontSize: 9 }, axisLine: { lineStyle: { color: "#333" } } },
              yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
              series: [{ type: "line", smooth: true, data: endingData, lineStyle: { color: "#f59e0b", width: 2 }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(245,158,11,0.3)" }, { offset: 1, color: "rgba(245,158,11,0)" }] } }, itemStyle: { color: "#f59e0b" }, symbol: "circle", symbolSize: 4 }],
            }});
          }
        }
      }

      // Funding Model (summary scalars)
      if (modelSlug.includes("funding-model") && !md) {
        const opening = Number(outputs.openingCash) || 0;
        const deficit = Number(outputs.maxCashDeficit) || 0;
        const req = Number(outputs.fundingRequired) || 0;
        const contingency = Number(outputs.contingency) || 0;
        const total = Number(outputs.totalFunding) || 0;
        if (total > 0 || opening > 0) result.push({ title: "Funding Summary", option: {
          tooltip: TIP, grid: { top: 10, right: 8, bottom: 36, left: 54 },
          xAxis: { type: "category", data: ["Opening Cash","Max Deficit","Funding Req","Contingency","Total Funding"], axisLabel: { color: "#888", fontSize: 9, interval: 0, rotate: 12 }, axisLine: { lineStyle: { color: "#333" } } },
          yAxis: { type: "value", axisLabel: { color: "#888", fontSize: 9, formatter: FMT }, splitLine: { lineStyle: { color: "#222" } } },
          series: [{ type: "bar", data: [
            { value: opening, itemStyle: { color: "#60a5fa", borderRadius: [3,3,0,0] } },
            { value: Math.abs(deficit), itemStyle: { color: "#ef4444", borderRadius: [3,3,0,0] } },
            { value: req, itemStyle: { color: "#f59e0b", borderRadius: [3,3,0,0] } },
            { value: contingency, itemStyle: { color: "#a78bfa", borderRadius: [3,3,0,0] } },
            { value: total, itemStyle: { color: "#34d399", borderRadius: [3,3,0,0] } },
          ]}],
        }});
      }
    }

    return result;
  }, [outputs, modelSlug]);

  if (!charts.length) return null;

  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Charts</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {charts.map((c) => (
          <div key={c.title} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">{c.title}</p>
            <ReactECharts option={c.option} style={{ height: 180 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── RAG status badge renderer ─────────────────────────────────────────────────

function StatusTable({ status }: { status: { month: string; rag: string; [k: string]: unknown }[] }) {
  if (!status?.length) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Monthly Status</h4>
      <div className="flex flex-wrap gap-2">
        {status.map((s) => (
          <div key={s.month} className={`rounded-lg px-3 py-1.5 text-xs font-semibold border ${
            s.rag === "GREEN" ? "bg-success/10 text-success border-success/30" :
            s.rag === "AMBER" ? "bg-amber-400/10 text-amber-400 border-amber-400/30" :
            "bg-danger/10 text-danger border-danger/30"
          }`}>
            {s.month} · {s.rag}
          </div>
        ))}
      </div>
    </div>
  );
}

function DataSection({ title, data }: { title: string; data: Record<string, any> }) {
  // Check if it's monthly data (keys are month names)
  if (isMonthlyData(data)) {
    const months = Object.keys(data);
    const allFields = new Set<string>();
    months.forEach((m) => { if (isPlainObject(data[m])) Object.keys(data[m] as Record<string, unknown>).forEach((f) => allFields.add(f)); });
    if (allFields.size === 0) return null;

    return (
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h4>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-xs border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Field</th>
                {months.map((m) => <th key={m} className="text-right py-2 px-2 text-muted-foreground font-medium whitespace-nowrap">{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...allFields].map((field) => (
                <tr key={field} className="border-b border-border/50">
                  <td className="py-1.5 pr-3 text-muted-foreground whitespace-nowrap">{field}</td>
                  {months.map((m) => {
                    const md = data[m] as Record<string, unknown> | undefined;
                    return <td key={m} className="text-right py-1.5 px-2 font-medium tabular-nums">{md ? formatVal(md[field]) : ""}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Flat key-value — skip noisy keys, handle arrays of objects (status)
  const flat: { key: string; value: unknown }[] = [];
  const nested: { key: string; value: Record<string, unknown> }[] = [];
  let statusArr: { month: string; rag: string }[] | null = null;

  for (const [k, v] of Object.entries(data)) {
    if (SKIP_KEYS.has(k)) continue;
    if (k === "status" || (Array.isArray(v) && v.length > 0 && isPlainObject(v[0]))) {
      statusArr = v as { month: string; rag: string }[];
      continue;
    }
    if (Array.isArray(v)) continue; // skip other arrays
    if (isPlainObject(v)) {
      nested.push({ key: k, value: v as Record<string, unknown> });
    } else if (v !== "" && v !== 0 && v !== "0") {
      flat.push({ key: k, value: v });
    }
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h4>
      {statusArr && <div className="mb-4"><StatusTable status={statusArr} /></div>}
      {flat.length > 0 && (
        <div className="space-y-1.5">
          {flat.map(({ key, value }) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{key}</span>
              <span className="font-semibold tabular-nums">{formatVal(value)}</span>
            </div>
          ))}
        </div>
      )}
      {nested.map(({ key, value }) => (
        <div key={key} className="mt-4">
          <DataSection title={key} data={value as Record<string, any>} />
        </div>
      ))}
    </div>
  );
}

// ========== PAGE ==========

export default function HistoryPage() {
  const { user, hydrate } = useAuth();
  const router = useRouter();
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => {
        const token = localStorage.getItem("finmech_token");
        if (!token) router.push("/login");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, router]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      api.get(`/calculations?page=${page}&limit=15`).then((res) => {
        setCalculations(res.data.calculations);
        setPagination(res.data.pagination);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [user, page]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/calculations/${id}`);
      setCalculations(calculations.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary" /> Calculation History
        </h1>
        <p className="text-muted-foreground mt-2">All your past calculations in one place. Expand any entry to view full data or export as PDF/CSV.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : calculations.length === 0 ? (
        <div className="text-center py-20">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No calculations yet</h2>
          <p className="text-muted-foreground mb-6">Run your first calculation and it will appear here</p>
          <Link
            href="/models"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors"
          >
            Explore Models
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {calculations.map((calc) => {
              const tierInfo = TIER_INFO[calc.tier] || TIER_INFO.free;
              const isExpanded = expandedId === calc.id;

              return (
                <div key={calc.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div
                    className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : calc.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{calc.modelName}</h3>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${tierInfo.bgColor} ${tierInfo.color}`}>
                            {tierInfo.name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(calc.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); exportPDF(calc); }}
                        title="Export PDF"
                        className="rounded-lg p-2 hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); exportCSV(calc); }}
                        title="Export CSV"
                        className="rounded-lg p-2 hover:bg-success/10 transition-colors text-muted-foreground hover:text-success"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/models/${calc.modelSlug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg p-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Open model"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(calc.id); }}
                        className="rounded-lg p-2 hover:bg-danger/10 transition-colors text-muted-foreground hover:text-danger"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border p-5 bg-background/30 space-y-6">
                      <DataSection title="Inputs" data={calc.inputs} />
                      <DataSection title="Results" data={calc.outputs} />
                      <HistoryCharts outputs={calc.outputs} inputs={calc.inputs as Record<string, any>} modelSlug={calc.modelSlug} />
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <button onClick={() => exportPDF(calc)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/20 transition-colors">
                          <FileText className="h-3.5 w-3.5" /> Download PDF
                        </button>
                        <button onClick={() => exportCSV(calc)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-success/10 text-success px-3 py-1.5 text-xs font-medium hover:bg-success/20 transition-colors">
                          <FileSpreadsheet className="h-3.5 w-3.5" /> Download CSV
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                disabled={page === pagination.pages}
                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
