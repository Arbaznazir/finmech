// ========================================================
// CONSOLIDATED CFO – Excel sheet "Consolidated CFS"
// Pulls operating closing balance from CashflowOps;
// investing/financing inputs on this sheet; CFO/PAT RAG bands
// ========================================================

import { cfsEbitdaMeaning, cfsOverallInsight, cfsPatMeaning } from "@/lib/excel-model-content";
import type { CFOpsResults } from "@/lib/cashflow-ops-model";

export const CONSOLIDATED_MONTHS = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export type ConsolidatedMonth = (typeof CONSOLIDATED_MONTHS)[number];

/** Excel colour bands for CFO/PAT (rows 26–29) */
export type CfsPatBand = "green" | "amber" | "weak-amber" | "red";

export interface ConsolidatedMonthInputs {
  "Purchase of Assets": number;
  "Sale of Assets": number;
  "Equity raised": number;
  "Loan Taken": number;
  "Loan repaid": number;
  "Dividends paid": number;
}

export const CONSOLIDATED_INPUT_FIELDS: { key: keyof ConsolidatedMonthInputs; label: string; category: string }[] = [
  { key: "Purchase of Assets", label: "Purchase of Assets", category: "Investing" },
  { key: "Sale of Assets", label: "Sale of Assets", category: "Investing" },
  { key: "Equity raised", label: "Equity raised", category: "Financing" },
  { key: "Loan Taken", label: "Loan Taken", category: "Financing" },
  { key: "Loan repaid", label: "Loan repaid", category: "Financing" },
  { key: "Dividends paid", label: "Dividends paid", category: "Financing" },
];

export function createEmptyConsolidatedInputs(): ConsolidatedMonthInputs {
  return {
    "Purchase of Assets": 0,
    "Sale of Assets": 0,
    "Equity raised": 0,
    "Loan Taken": 0,
    "Loan repaid": 0,
    "Dividends paid": 0,
  };
}

export interface ConsolidatedMonthData {
  month: string;
  beginningCash: number;
  cfo: number;
  cfi: number;
  cff: number;
  netCashFlow: number;
  endingCash: number;
  pat: number;
  ebitda: number;
  cfoPat: number | null;
  cfoEbitda: number | null;
  patBand: CfsPatBand;
  ebitdaBand: CfsPatBand;
  insight: string;
}

export interface ConsolidatedCFOResults {
  monthlyData: Record<string, ConsolidatedMonthData>;
  monthsAdded: string[];
  beginningCash: number;
  summary: {
    totalNetCashFlow: number;
    finalEndingCash: number;
    avgCfoPat: number;
    avgCfoEbitda: number;
    overallPatBand: CfsPatBand;
    overallInsight: string;
  };
}

export function cfsPatBand(cfoPat: number): CfsPatBand {
  if (cfoPat > 1.2) return "green";
  if (cfoPat >= 0.8) return "amber";
  if (cfoPat > 0) return "weak-amber";
  return "red";
}

export function cfsEbitdaBand(cfoEbitda: number): CfsPatBand {
  if (cfoEbitda > 0.8) return "green";
  if (cfoEbitda >= 0.5) return "amber";
  if (cfoEbitda > 0) return "weak-amber";
  return "red";
}

export function cfsBandTextClass(band: CfsPatBand): string {
  if (band === "green") return "text-success";
  if (band === "amber") return "text-amber-400";
  if (band === "weak-amber") return "text-orange-400";
  return "text-danger";
}

export function cfsBandCardClass(band: CfsPatBand): string {
  if (band === "green") return "bg-success/5 border-success/30";
  if (band === "amber") return "bg-amber-400/5 border-amber-400/30";
  if (band === "weak-amber") return "bg-orange-400/5 border-orange-400/30";
  return "bg-danger/5 border-danger/30";
}

export function cfsBandLabel(band: CfsPatBand): string {
  if (band === "green") return "🟢 Green";
  if (band === "amber") return "🟡 Amber";
  if (band === "weak-amber") return "🟠 Weak Amber";
  return "🔴 Red";
}

function loadIncomeStatementMonth(
  month: string,
  incomeStatement: Record<string, unknown> | null | undefined,
): { pat: number; ebitda: number } {
  const md = incomeStatement?.monthlyData as Record<string, Record<string, number>> | undefined;
  const m = md?.[month];
  if (!m) return { pat: 0, ebitda: 0 };
  return {
    pat: Number(m["Net Profit"]) || 0,
    ebitda: Number(m["EBITDA"]) || 0,
  };
}

export function calculateConsolidatedCFO(
  cashflowOps: CFOpsResults | null,
  consolidatedInputs: Record<string, ConsolidatedMonthInputs>,
  beginningCash = 0,
  incomeStatement?: Record<string, unknown> | null,
): ConsolidatedCFOResults {
  const monthlyData: Record<string, ConsolidatedMonthData> = {};
  const addedMonths: string[] = [];
  let runningEnding = beginningCash;
  let totalCfoPat = 0;
  let totalCfoEbitda = 0;
  let ratioCount = 0;

  CONSOLIDATED_MONTHS.forEach((month) => {
    const ops = cashflowOps?.monthlyData?.[month];
    const inputs = consolidatedInputs[month];
    if (!ops && !inputs) return;

    addedMonths.push(month);
    const inp = inputs ?? createEmptyConsolidatedInputs();

    // Excel D3 = CashflowOps closing balance for the month
    const cfo = Number(ops?.["Closing Balance"]) || 0;
    const cfi = inp["Sale of Assets"] - inp["Purchase of Assets"];
    const cff =
      inp["Equity raised"] +
      inp["Loan Taken"] -
      inp["Loan repaid"] -
      inp["Dividends paid"];

    const netCashFlow = cfo + cfi + cff;
    const monthBeginning = runningEnding;
    const endingCash = monthBeginning + netCashFlow;
    runningEnding = endingCash;

    const { pat, ebitda } = loadIncomeStatementMonth(month, incomeStatement);
    const cfoPat = pat !== 0 ? cfo / pat : null;
    const cfoEbitda = ebitda !== 0 ? cfo / ebitda : null;

    const patBand = cfoPat !== null ? cfsPatBand(cfoPat) : "red";
    const ebitdaBand = cfoEbitda !== null ? cfsEbitdaBand(cfoEbitda) : "red";
    const insight =
      cfoPat !== null
        ? cfsOverallInsight(cfoPat)
        : cfsPatMeaning(0);

    monthlyData[month] = {
      month,
      beginningCash: monthBeginning,
      cfo,
      cfi,
      cff,
      netCashFlow,
      endingCash,
      pat,
      ebitda,
      cfoPat,
      cfoEbitda,
      patBand,
      ebitdaBand,
      insight,
    };

    if (cfoPat !== null && !Number.isNaN(cfoPat)) {
      totalCfoPat += cfoPat;
      ratioCount++;
    }
    if (cfoEbitda !== null && !Number.isNaN(cfoEbitda)) {
      totalCfoEbitda += cfoEbitda;
    }
  });

  const avgCfoPat = ratioCount > 0 ? totalCfoPat / ratioCount : 0;
  const avgCfoEbitda = ratioCount > 0 ? totalCfoEbitda / ratioCount : 0;
  const overallPatBand = cfsPatBand(avgCfoPat);

  return {
    monthlyData,
    monthsAdded: addedMonths,
    beginningCash,
    summary: {
      totalNetCashFlow: runningEnding - beginningCash,
      finalEndingCash: runningEnding,
      avgCfoPat,
      avgCfoEbitda,
      overallPatBand,
      overallInsight: cfsOverallInsight(avgCfoPat),
    },
  };
}

export const CONSOLIDATED_OUTPUT_FIELDS = [
  { key: "cfo", label: "Cash Flow from Operating Activities (CFO)" },
  { key: "cfi", label: "Cash Flow from Investing Activities (CFI)" },
  { key: "cff", label: "Cash Flow from Financing Activities (CFF)" },
  { key: "netCashFlow", label: "Net Cash Flow" },
  { key: "endingCash", label: "Ending Cash" },
  { key: "cfoPat", label: "CFO/PAT" },
  { key: "cfoEbitda", label: "CFO/EBIDTA" },
] as const;
