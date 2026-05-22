// ========================================================
// CONSOLIDATED CFO MODEL – Summary with Ratios & Insights
// Sheet 2 of Cash Flow Statement Excel
// ========================================================

export const CONSOLIDATED_MONTHS = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export type ConsolidatedMonth = (typeof CONSOLIDATED_MONTHS)[number];

export type RAGClassification = "Strong" | "Acceptable" | "Weak" | "Red";

export interface ConsolidatedMonthData {
  month: string;
  openingCash: number;
  netCashFlow: number;
  endingCash: number;
  pat: number;
  ebitda: number;
  cfoPat: number;
  cfoEbitda: number;
  classification: RAGClassification;
  insight: string;
}

export interface ConsolidatedCFOResults {
  monthlyData: Record<string, ConsolidatedMonthData>;
  monthsAdded: string[];
  openingCash: number;
  summary: {
    totalNetCashFlow: number;
    finalEndingCash: number;
    avgCfoPat: number;
    avgCfoEbitda: number;
    overallClassification: RAGClassification;
  };
}

// ================== CLASSIFICATION LOGIC ==================

function getRAGClassification(cfoPat: number): RAGClassification {
  if (cfoPat > 1.2) return "Strong";
  if (cfoPat >= 0.8) return "Acceptable";
  if (cfoPat > 0) return "Weak";
  return "Red";
}

function getRAGInsight(classification: RAGClassification): string {
  switch (classification) {
    case "Strong":
      return "🟢 Strong cash-backed profits and a strong cash conversion";
    case "Acceptable":
      return "🟡 Acceptable but needs monitoring";
    case "Weak":
      return "🟠 Weak Amber - Profits not fully converting to cash";
    case "Red":
      return "🔴 Red - Profits unreliable / cash negative";
    default:
      return "No data";
  }
}

// ================== CALCULATION ENGINE ==================

export function calculateConsolidatedCFO(
  cashflowOpsData: Record<string, any> | null,
  openingCash: number = 0
): ConsolidatedCFOResults {
  const monthlyData: Record<string, ConsolidatedMonthData> = {};
  const addedMonths: string[] = [];
  let runningCash = openingCash;
  
  let totalCfoPat = 0;
  let totalCfoEbitda = 0;
  let count = 0;

  CONSOLIDATED_MONTHS.forEach((month) => {
    const ops = cashflowOpsData?.monthlyData?.[month];
    if (!ops) return;

    addedMonths.push(month);
    
    const netCashFlow = Number(ops["Net Cash Flow"]) || Number(ops["Net Cash Flow from Operating Activities (CFO)"]) || 0;
    const pat = Number(ops["Profit After Tax (PAT)"]) || Number(ops["Net Profit/Loss"]) || 0;
    const ebitda = Number(ops["EBITDA"]) || 0;
    
    const cfoPat = pat !== 0 ? netCashFlow / pat : 0;
    const cfoEbitda = ebitda !== 0 ? netCashFlow / ebitda : 0;
    
    const classification = getRAGClassification(cfoPat);
    const endingCash = runningCash + netCashFlow;
    
    monthlyData[month] = {
      month,
      openingCash: runningCash,
      netCashFlow,
      endingCash,
      pat,
      ebitda,
      cfoPat,
      cfoEbitda,
      classification,
      insight: getRAGInsight(classification),
    };
    
    runningCash = endingCash;
    
    if (!isNaN(cfoPat)) {
      totalCfoPat += cfoPat;
      totalCfoEbitda += cfoEbitda;
      count++;
    }
  });

  const avgCfoPat = count > 0 ? totalCfoPat / count : 0;
  const avgCfoEbitda = count > 0 ? totalCfoEbitda / count : 0;

  return {
    monthlyData,
    monthsAdded: addedMonths,
    openingCash,
    summary: {
      totalNetCashFlow: runningCash - openingCash,
      finalEndingCash: runningCash,
      avgCfoPat,
      avgCfoEbitda,
      overallClassification: getRAGClassification(avgCfoPat),
    },
  };
}
