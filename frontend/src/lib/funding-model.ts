// ========================================================
// FUNDING MODEL – FULL EXCEL MATCH (Operating Model sheet)
// Month-by-month cash flow → Working Capital → Net Cash →
// Cumulative Cash → Max Deficit → Funding Required + Contingency
// ========================================================

export const MONTHS_ORDER = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export type MonthName = (typeof MONTHS_ORDER)[number];

export type FundingFieldKey =
  | "Revenue"
  | "Cost of Goods Sold (COGS)"
  | "Variable Cost"
  | "Fixed Cost"
  | "Inventory"
  | "Trade Receivables"
  | "Trade Payables"
  | "CapEx";

export type FundingMonthInputs = Record<FundingFieldKey, number>;

export const INPUT_FIELDS: { key: FundingFieldKey; label: string; category: string; prefix: string }[] = [
  { key: "Revenue", label: "Revenue", category: "P&L", prefix: "₹" },
  { key: "Cost of Goods Sold (COGS)", label: "COGS", category: "P&L", prefix: "₹" },
  { key: "Variable Cost", label: "Variable Cost", category: "P&L", prefix: "₹" },
  { key: "Fixed Cost", label: "Fixed Cost", category: "P&L", prefix: "₹" },
  { key: "Inventory", label: "Inventory", category: "Working Capital", prefix: "₹" },
  { key: "Trade Receivables", label: "Trade Receivables", category: "Working Capital", prefix: "₹" },
  { key: "Trade Payables", label: "Trade Payables", category: "Working Capital", prefix: "₹" },
  { key: "CapEx", label: "CapEx", category: "Cash Flow", prefix: "₹" },
];

export function createEmptyInputs(): Record<string, number> {
  const empty: Record<string, number> = {};
  INPUT_FIELDS.forEach((f) => { empty[f.key] = 0; });
  return empty;
}

export interface ComputedFundingMonth {
  [key: string]: number;
  Revenue: number;
  "Cost of Goods Sold (COGS)": number;
  "Variable Cost": number;
  "Fixed Cost": number;
  Contribution: number;
  EBITDA: number;
  Inventory: number;
  "Trade Receivables": number;
  "Trade Payables": number;
  "Inventory Days": number;
  "Receivable Days": number;
  "Payable Days": number;
  "WC Inventory": number;
  "WC Receivables": number;
  "WC Payables": number;
  "Working Capital": number;
  "Change in WC": number;
  CapEx: number;
  "Net Cash Flow": number;
  "Cumulative Cash": number;
}

export interface MonthDays {
  month: string;
  inventoryDays: number;
  receivableDays: number;
  payableDays: number;
  cashConversionCycle: number;
}

export interface FundingSummary {
  maxCashDeficit: number;
  fundingRequired: number;
  contingency: number;
  totalFunding: number;
  openingCash: number;
  contingencyPct: number;
  totalRevenue: number;
  totalCOGS: number;
  totalVariableCost: number;
  totalContribution: number;
  totalFixedCost: number;
  totalEBITDA: number;
  totalCapEx: number;
  totalChangeInWC: number;
  finalCash: number;
  avgInventoryDays: number;
  avgReceivableDays: number;
  avgPayableDays: number;
  avgCashConversionCycle: number;
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
  { key: "Inventory Days", label: "Inventory Days", bold: false },
  { key: "Receivable Days", label: "Receivable Days", bold: false },
  { key: "Payable Days", label: "Payable Days", bold: false },
  { key: "Working Capital", label: "Working Capital", bold: true },
  { key: "Change in WC", label: "Change in WC", bold: false },
  { key: "CapEx", label: "CapEx", bold: false },
  { key: "Net Cash Flow", label: "Net Cash Flow", bold: true },
  { key: "Cumulative Cash", label: "Cumulative Cash", bold: true },
];

export function calculateFunding(
  monthsData: Record<string, Record<string, number>>,
  openingCash: number = 0,
  contingencyPct: number = 15,
): FundingResults & { days: MonthDays[] } {
  const computed: Record<string, ComputedFundingMonth> = {};
  const addedMonths: string[] = [];
  const days: MonthDays[] = [];

  let previousWC = 0;
  let previousCumulative = 0;
  let anchorInventoryDays = 0;
  let isFirst = true;

  let totalRevenue = 0;
  let totalCOGS = 0;
  let totalVariableCost = 0;
  let totalContribution = 0;
  let totalFixedCost = 0;
  let totalEBITDA = 0;
  let totalCapEx = 0;
  let totalChangeInWC = 0;
  let totalInventoryDays = 0;
  let totalReceivableDays = 0;
  let totalPayableDays = 0;
  let totalCCC = 0;

  MONTHS_ORDER.forEach((month) => {
    if (!monthsData[month]) return;
    addedMonths.push(month);

    const raw = monthsData[month];
    const revenue = Number(raw.Revenue) || 0;
    const cogs = Number(raw["Cost of Goods Sold (COGS)"]) || 0;
    const varCost = Number(raw["Variable Cost"]) || 0;
    const fixedCost = Number(raw["Fixed Cost"]) || 0;
    const inventory = Number(raw.Inventory) || 0;
    const tradeRec = Number(raw["Trade Receivables"]) || 0;
    const tradePay = Number(raw["Trade Payables"]) || 0;
    const capex = Number(raw.CapEx) || 0;

    // Excel: Contribution = Revenue − Variable Cost (COGS tracked separately)
    const contribution = revenue - varCost;
    const ebitda = contribution - fixedCost;

    const inventoryDays = cogs > 0 ? (inventory / cogs) * 365 : 0;
    const receivableDays = revenue > 0 ? (tradeRec / revenue) * 365 : 0;
    const payableDays = cogs > 0 ? (tradePay / cogs) * 365 : 0;

    if (isFirst) {
      anchorInventoryDays = inventoryDays;
    }

    const wcInventory = anchorInventoryDays > 0 ? (receivableDays / anchorInventoryDays) * inventoryDays : 0;
    const wcReceivables = anchorInventoryDays > 0 ? (inventoryDays / anchorInventoryDays) * receivableDays : 0;
    const wcPayables = anchorInventoryDays > 0 ? (receivableDays / anchorInventoryDays) * payableDays : 0;
    const workingCapital = wcInventory + wcReceivables - wcPayables;

    const changeWC = isFirst ? workingCapital : workingCapital - previousWC;
    const netCashFlow = ebitda - changeWC - capex;

    const cumulativeCash = isFirst
      ? openingCash + netCashFlow
      : previousCumulative + netCashFlow;

    computed[month] = {
      Revenue: revenue,
      "Cost of Goods Sold (COGS)": cogs,
      "Variable Cost": varCost,
      "Fixed Cost": fixedCost,
      Contribution: contribution,
      EBITDA: ebitda,
      Inventory: inventory,
      "Trade Receivables": tradeRec,
      "Trade Payables": tradePay,
      "Inventory Days": inventoryDays,
      "Receivable Days": receivableDays,
      "Payable Days": payableDays,
      "WC Inventory": wcInventory,
      "WC Receivables": wcReceivables,
      "WC Payables": wcPayables,
      "Working Capital": workingCapital,
      "Change in WC": changeWC,
      CapEx: capex,
      "Net Cash Flow": netCashFlow,
      "Cumulative Cash": cumulativeCash,
    };

    const ccc = inventoryDays + receivableDays - payableDays;
    days.push({
      month,
      inventoryDays,
      receivableDays,
      payableDays,
      cashConversionCycle: ccc,
    });

    previousWC = workingCapital;
    previousCumulative = cumulativeCash;
    isFirst = false;

    totalRevenue += revenue;
    totalCOGS += cogs;
    totalVariableCost += varCost;
    totalContribution += contribution;
    totalFixedCost += fixedCost;
    totalEBITDA += ebitda;
    totalCapEx += capex;
    totalChangeInWC += changeWC;
    totalInventoryDays += inventoryDays;
    totalReceivableDays += receivableDays;
    totalPayableDays += payableDays;
    totalCCC += ccc;
  });

  const monthCount = addedMonths.length || 1;
  const cashValues = addedMonths.map((mo) => computed[mo]["Cumulative Cash"]);

  // Excel D16:D19 — MIN of cumulative cash (can be positive when no deficit)
  const maxCashDeficit = cashValues.length > 0 ? Math.min(...cashValues) : 0;
  const fundingRequired = -maxCashDeficit;
  const contingency = fundingRequired * (contingencyPct / 100);
  const totalFunding = fundingRequired + contingency;
  const finalCash = cashValues.length > 0 ? cashValues[cashValues.length - 1] : openingCash;

  return {
    monthlyData: computed,
    monthsAdded: addedMonths,
    days,
    summary: {
      maxCashDeficit,
      fundingRequired,
      contingency,
      totalFunding,
      openingCash,
      contingencyPct,
      totalRevenue,
      totalCOGS,
      totalVariableCost,
      totalContribution,
      totalFixedCost,
      totalEBITDA,
      totalCapEx,
      totalChangeInWC,
      finalCash,
      avgInventoryDays: totalInventoryDays / monthCount,
      avgReceivableDays: totalReceivableDays / monthCount,
      avgPayableDays: totalPayableDays / monthCount,
      avgCashConversionCycle: totalCCC / monthCount,
    },
  };
}
