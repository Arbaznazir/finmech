// ========================================================
// FUNDING MODEL – FULL EXCEL MATCH
// Month-by-month cash flow → Working Capital →
// Net Cash Flow → Cumulative Cash → Max Deficit →
// Funding Required + Contingency
// ========================================================

export const MONTHS_ORDER = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export type MonthName = (typeof MONTHS_ORDER)[number];

export interface FundingMonthInputs {
  [key: string]: number;
  "Revenue": number;
  "Cost of Goods Sold (COGS)": number;
  "Variable Cost": number;
  "Fixed Cost": number;
  "Inventory": number;
  "Trade Receivables": number;
  "Trade Payables": number;
  "CapEx": number;
  "Change in WC": number;
}

export const INPUT_FIELDS: { key: string; label: string; category: string; prefix: string }[] = [
  { key: "Revenue", label: "Revenue", category: "P&L", prefix: "$" },
  { key: "Cost of Goods Sold (COGS)", label: "COGS", category: "P&L", prefix: "$" },
  { key: "Variable Cost", label: "Variable Cost", category: "P&L", prefix: "$" },
  { key: "Fixed Cost", label: "Fixed Cost", category: "P&L", prefix: "$" },
  { key: "Inventory", label: "Inventory", category: "Working Capital", prefix: "$" },
  { key: "Trade Receivables", label: "Trade Receivables", category: "Working Capital", prefix: "$" },
  { key: "Trade Payables", label: "Trade Payables", category: "Working Capital", prefix: "$" },
  { key: "CapEx", label: "CapEx", category: "Cash Flow", prefix: "$" },
  { key: "Change in WC", label: "Change in WC", category: "Cash Flow", prefix: "$" },
];

export function createEmptyInputs(): Record<string, number> {
  const empty: Record<string, number> = {};
  INPUT_FIELDS.forEach((f) => { empty[f.key] = 0; });
  return empty;
}

export interface ComputedFundingMonth {
  [key: string]: number;
  "Revenue": number;
  "Cost of Goods Sold (COGS)": number;
  "Variable Cost": number;
  "Fixed Cost": number;
  "Contribution": number;
  "EBITDA": number;
  "Inventory": number;
  "Trade Receivables": number;
  "Trade Payables": number;
  "Working Capital": number;
  "CapEx": number;
  "Change in WC": number;
  "Net Cash Flow": number;
  "Cumulative Cash": number;
}

export interface FundingSummary {
  maxCashDeficit: number;
  fundingRequired: number;
  contingency: number;
  totalFunding: number;
  openingCash: number;
  contingencyPct: number;
}

export interface FundingResults {
  monthlyData: Record<string, ComputedFundingMonth>;
  monthsAdded: string[];
  summary: FundingSummary;
}

export const OUTPUT_FIELDS: { key: string; label: string; bold: boolean }[] = [
  { key: "Revenue", label: "Revenue", bold: false },
  { key: "Cost of Goods Sold (COGS)", label: "COGS", bold: false },
  { key: "Variable Cost", label: "Variable Cost", bold: false },
  { key: "Contribution", label: "Contribution", bold: true },
  { key: "Fixed Cost", label: "Fixed Cost", bold: false },
  { key: "EBITDA", label: "EBITDA", bold: true },
  { key: "Inventory", label: "Inventory", bold: false },
  { key: "Trade Receivables", label: "Trade Receivables", bold: false },
  { key: "Trade Payables", label: "Trade Payables", bold: false },
  { key: "Working Capital", label: "Working Capital", bold: true },
  { key: "CapEx", label: "CapEx", bold: false },
  { key: "Change in WC", label: "Change in WC", bold: false },
  { key: "Net Cash Flow", label: "Net Cash Flow", bold: true },
  { key: "Cumulative Cash", label: "Cumulative Cash", bold: true },
];

export function calculateFunding(
  monthsData: Record<string, Record<string, number>>,
  openingCash: number = 0,
  contingencyPct: number = 15,
): FundingResults {
  const computed: Record<string, ComputedFundingMonth> = {};
  const addedMonths: string[] = [];
  let cumulativeCash = openingCash;

  MONTHS_ORDER.forEach((month) => {
    if (!monthsData[month]) return;
    addedMonths.push(month);

    const raw = monthsData[month];
    const m: Record<string, number> = { ...raw };

    const revenue = Number(raw["Revenue"]) || 0;
    const cogs = Number(raw["Cost of Goods Sold (COGS)"]) || 0;
    const varCost = Number(raw["Variable Cost"]) || 0;
    const fixedCost = Number(raw["Fixed Cost"]) || 0;

    m["Revenue"] = revenue;
    m["Cost of Goods Sold (COGS)"] = cogs;
    m["Variable Cost"] = varCost;
    m["Fixed Cost"] = fixedCost;

    m["Contribution"] = revenue - cogs - varCost;
    m["EBITDA"] = m["Contribution"] - fixedCost;

    const inventory = Number(raw["Inventory"]) || 0;
    const tradeRec = Number(raw["Trade Receivables"]) || 0;
    const tradePay = Number(raw["Trade Payables"]) || 0;
    m["Inventory"] = inventory;
    m["Trade Receivables"] = tradeRec;
    m["Trade Payables"] = tradePay;
    m["Working Capital"] = inventory + tradeRec - tradePay;

    const capex = Number(raw["CapEx"]) || 0;
    const changeWC = Number(raw["Change in WC"]) || 0;
    m["CapEx"] = capex;
    m["Change in WC"] = changeWC;

    m["Net Cash Flow"] = m["EBITDA"] - capex - changeWC;

    cumulativeCash += m["Net Cash Flow"];
    m["Cumulative Cash"] = cumulativeCash;

    computed[month] = m as ComputedFundingMonth;
  });

  // Summary
  const cashValues = addedMonths.map((mo) => computed[mo]["Cumulative Cash"]);
  const maxCashDeficit = Math.min(0, ...cashValues);
  const fundingRequired = Math.abs(maxCashDeficit);
  const contingency = fundingRequired * (contingencyPct / 100);
  const totalFunding = fundingRequired + contingency;

  return {
    monthlyData: computed,
    monthsAdded: addedMonths,
    summary: {
      maxCashDeficit: Math.round(maxCashDeficit),
      fundingRequired: Math.round(fundingRequired),
      contingency: Math.round(contingency),
      totalFunding: Math.round(totalFunding),
      openingCash,
      contingencyPct,
    },
  };
}
