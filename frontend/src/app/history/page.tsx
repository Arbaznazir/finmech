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
import {
  exportCalculationPDF,
  formatVal,
  flattenToRows,
  isPlainObject,
  isMonthlyData,
  CHART_GROUPS,
} from "@/lib/calculation-pdf";

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

function exportPDF(calc: Calculation) {
  exportCalculationPDF(calc);
}

function exportCSV(calc: Calculation) {
  const lines: string[] = [];
  lines.push(`Model,${calc.modelName}`);
  lines.push(`Tier,${calc.tier}`);
  lines.push(`Date,${new Date(calc.createdAt).toLocaleString()}`);
  lines.push("");

  if (isPlainObject(calc.inputs) && isMonthlyData(calc.inputs)) {
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

  if (isPlainObject(calc.outputs)) {
    const out = calc.outputs as Record<string, unknown>;
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
