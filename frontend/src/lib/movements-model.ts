// ========================================================
// MOVEMENTS TEMPLATE – Working Capital & Cash Movements
// Month-by-month tracking of Receivables, Inventory, Payables
// with Change in Working Capital & Cash from Operations
// ========================================================

export const MONTHS_ORDER = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export type MonthName = (typeof MONTHS_ORDER)[number];

export interface MovementsMonthInputs {
  [key: string]: number;
  "Revenue": number;
  "COGS": number;
  "Trade Receivables (Opening)": number;
  "Trade Receivables (Closing)": number;
  "Inventory (Opening)": number;
  "Inventory (Closing)": number;
  "Trade Payables (Opening)": number;
  "Trade Payables (Closing)": number;
  "CapEx": number;
}

export const INPUT_FIELDS: { key: string; label: string; category: string; prefix: string }[] = [
  // Revenue & COGS — auto-filled from Common Utility
  { key: "Revenue", label: "Revenue", category: "Income (from Common Utility)", prefix: "₹" },
  { key: "COGS", label: "COGS", category: "Income (from Common Utility)", prefix: "₹" },
  // Working Capital
  { key: "Trade Receivables (Opening)", label: "Trade Receivables (Opening)", category: "Trade Receivables", prefix: "₹" },
  { key: "Trade Receivables (Closing)", label: "Trade Receivables (Closing)", category: "Trade Receivables", prefix: "₹" },
  { key: "Inventory (Opening)", label: "Inventory (Opening)", category: "Inventory", prefix: "₹" },
  { key: "Inventory (Closing)", label: "Inventory (Closing)", category: "Inventory", prefix: "₹" },
  { key: "Trade Payables (Opening)", label: "Trade Payables (Opening)", category: "Trade Payables", prefix: "₹" },
  { key: "Trade Payables (Closing)", label: "Trade Payables (Closing)", category: "Trade Payables", prefix: "₹" },
  // CapEx
  { key: "CapEx", label: "Capital Expenditure", category: "Investing", prefix: "₹" },
];

export function createEmptyInputs(): MovementsMonthInputs {
  return {
    "Revenue": 0,
    "COGS": 0,
    "Trade Receivables (Opening)": 0,
    "Trade Receivables (Closing)": 0,
    "Inventory (Opening)": 0,
    "Inventory (Closing)": 0,
    "Trade Payables (Opening)": 0,
    "Trade Payables (Closing)": 0,
    "CapEx": 0,
  };
}

// ================== COMPUTED FIELDS ==================

export interface ComputedMovementsMonth extends MovementsMonthInputs {
  "Change in Receivables": number;
  "Change in Inventory": number;
  "Change in Payables": number;
  "Working Capital (Closing)": number;
  "Change in Working Capital": number;
  "Gross Profit": number;
  "Cash from Operations": number;
  "Free Cash Flow": number;
  "Days Sales Outstanding (DSO)": number;
  "Days Inventory Outstanding (DIO)": number;
  "Days Payable Outstanding (DPO)": number;
  "Cash Conversion Cycle": number;
}

export interface MovementsResults {
  monthlyData: Record<string, ComputedMovementsMonth>;
  monthsAdded: string[];
  annual: {
    totalRevenue: number;
    totalCOGS: number;
    totalGrossProfit: number;
    totalChangeInWC: number;
    totalCFO: number;
    totalCapEx: number;
    totalFCF: number;
    avgDSO: number;
    avgDIO: number;
    avgDPO: number;
    avgCCC: number;
    closingReceivables: number;
    closingInventory: number;
    closingPayables: number;
  };
}

// ================== CALCULATION ENGINE ==================

function computeMonth(m: Record<string, number>): ComputedMovementsMonth {
  const computed = { ...m } as any;

  const rev = m["Revenue"] || 0;
  const cogs = m["COGS"] || 0;

  // Changes in working capital items
  computed["Change in Receivables"] = (m["Trade Receivables (Closing)"] || 0) - (m["Trade Receivables (Opening)"] || 0);
  computed["Change in Inventory"] = (m["Inventory (Closing)"] || 0) - (m["Inventory (Opening)"] || 0);
  computed["Change in Payables"] = (m["Trade Payables (Closing)"] || 0) - (m["Trade Payables (Opening)"] || 0);

  // Working Capital = Receivables + Inventory - Payables (closing balances)
  computed["Working Capital (Closing)"] =
    (m["Trade Receivables (Closing)"] || 0) +
    (m["Inventory (Closing)"] || 0) -
    (m["Trade Payables (Closing)"] || 0);

  // Change in WC = increase in receivables + increase in inventory - increase in payables
  computed["Change in Working Capital"] =
    computed["Change in Receivables"] +
    computed["Change in Inventory"] -
    computed["Change in Payables"];

  // Gross Profit
  computed["Gross Profit"] = rev - cogs;

  // Cash from Operations = Gross Profit - Change in WC
  computed["Cash from Operations"] = computed["Gross Profit"] - computed["Change in Working Capital"];

  // Free Cash Flow = CFO - CapEx
  computed["Free Cash Flow"] = computed["Cash from Operations"] - (m["CapEx"] || 0);

  // Efficiency ratios (days, using 30-day month)
  const dailyRev = rev / 30;
  const dailyCOGS = cogs / 30;

  computed["Days Sales Outstanding (DSO)"] = dailyRev > 0
    ? (m["Trade Receivables (Closing)"] || 0) / dailyRev
    : 0;

  computed["Days Inventory Outstanding (DIO)"] = dailyCOGS > 0
    ? (m["Inventory (Closing)"] || 0) / dailyCOGS
    : 0;

  computed["Days Payable Outstanding (DPO)"] = dailyCOGS > 0
    ? (m["Trade Payables (Closing)"] || 0) / dailyCOGS
    : 0;

  computed["Cash Conversion Cycle"] =
    computed["Days Sales Outstanding (DSO)"] +
    computed["Days Inventory Outstanding (DIO)"] -
    computed["Days Payable Outstanding (DPO)"];

  return computed as ComputedMovementsMonth;
}

export function calculateMovements(
  monthsData: Record<string, Record<string, number>>
): MovementsResults {
  const computed: Record<string, ComputedMovementsMonth> = {};
  const addedMonths: string[] = [];

  MONTHS_ORDER.forEach((month) => {
    if (monthsData[month]) {
      computed[month] = computeMonth(monthsData[month]);
      addedMonths.push(month);
    }
  });

  // Annual aggregates
  let totalRevenue = 0, totalCOGS = 0, totalGrossProfit = 0;
  let totalChangeInWC = 0, totalCFO = 0, totalCapEx = 0, totalFCF = 0;
  let sumDSO = 0, sumDIO = 0, sumDPO = 0, sumCCC = 0;
  let closingReceivables = 0, closingInventory = 0, closingPayables = 0;

  addedMonths.forEach((month) => {
    const c = computed[month];
    totalRevenue += c["Revenue"];
    totalCOGS += c["COGS"];
    totalGrossProfit += c["Gross Profit"];
    totalChangeInWC += c["Change in Working Capital"];
    totalCFO += c["Cash from Operations"];
    totalCapEx += c["CapEx"];
    totalFCF += c["Free Cash Flow"];
    sumDSO += c["Days Sales Outstanding (DSO)"];
    sumDIO += c["Days Inventory Outstanding (DIO)"];
    sumDPO += c["Days Payable Outstanding (DPO)"];
    sumCCC += c["Cash Conversion Cycle"];
  });

  const n = addedMonths.length || 1;
  // Use last month's closing balances
  if (addedMonths.length > 0) {
    const last = computed[addedMonths[addedMonths.length - 1]];
    closingReceivables = last["Trade Receivables (Closing)"];
    closingInventory = last["Inventory (Closing)"];
    closingPayables = last["Trade Payables (Closing)"];
  }

  return {
    monthlyData: computed,
    monthsAdded: addedMonths,
    annual: {
      totalRevenue,
      totalCOGS,
      totalGrossProfit,
      totalChangeInWC,
      totalCFO,
      totalCapEx,
      totalFCF,
      avgDSO: sumDSO / n,
      avgDIO: sumDIO / n,
      avgDPO: sumDPO / n,
      avgCCC: sumCCC / n,
      closingReceivables,
      closingInventory,
      closingPayables,
    },
  };
}

// Output fields for display
export const OUTPUT_FIELDS: { key: string; label: string; format: "currency" | "days" | "number" }[] = [
  { key: "Gross Profit", label: "Gross Profit", format: "currency" },
  { key: "Change in Receivables", label: "Δ Receivables", format: "currency" },
  { key: "Change in Inventory", label: "Δ Inventory", format: "currency" },
  { key: "Change in Payables", label: "Δ Payables", format: "currency" },
  { key: "Working Capital (Closing)", label: "Working Capital", format: "currency" },
  { key: "Change in Working Capital", label: "Δ Working Capital", format: "currency" },
  { key: "Cash from Operations", label: "Cash from Operations", format: "currency" },
  { key: "Free Cash Flow", label: "Free Cash Flow", format: "currency" },
  { key: "Days Sales Outstanding (DSO)", label: "DSO", format: "days" },
  { key: "Days Inventory Outstanding (DIO)", label: "DIO", format: "days" },
  { key: "Days Payable Outstanding (DPO)", label: "DPO", format: "days" },
  { key: "Cash Conversion Cycle", label: "Cash Conversion Cycle", format: "days" },
];
