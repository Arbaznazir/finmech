// ========================================================
// BALANCE SHEET MODEL – FULL EXCEL MATCH
// Month-by-month → quarterly + annual roll-ups
// Ratios, balance check, status logic
// ========================================================

export const MONTHS_ORDER = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export type MonthName = (typeof MONTHS_ORDER)[number];

export interface BSMonthInputs {
  [key: string]: number;
  // Non-Current Assets
  "Property, Plant & Equipment (Net)": number;
  "Capital Work in Progress": number;
  "Investments (Long-Term)": number;
  "Lease Assets (if applicable)": number;
  "Other Non-Current Assets": number;
  "Deferred Tax Assets": number;
  "Intangible Assets": number;
  "Intangible Assets Under Development": number;
  // Current Assets
  "Cash & Cash Equivalents (Cash at bank included)": number;
  "Trade Receivables (Debtors)": number;
  "Inventory / Stock": number;
  "Short-term Financial Assets": number;
  "Other Current Assets": number;
  "GST Input/Refunds Receivable": number;
  // Equity
  "Owner's Capital / Share Capital": number;
  "Share Premium": number;
  "Reserves & Surplus / Retained Earnings": number;
  // Non-Current Liabilities
  "Long-Term Borrowings": number;
  "Lease Liabilities (Long-Term)": number;
  "Deferred Tax Liabilities": number;
  "Other Non-Current Liabilities": number;
  // Current Liabilities
  "Trade Payables (Creditors)": number;
  "Short-Term Loans & Borrowings": number;
  "Accrued Expenses / Outstanding Expenses": number;
  "Tax/GST Payable": number;
  "Current Maturity of Long-term Debt": number;
  "Employee Payables": number;
  "Other Current Liabilities": number;
}

export const INPUT_FIELDS: { key: string; label: string; category: string }[] = [
  // Non-Current Assets
  { key: "Property, Plant & Equipment (Net)", label: "Property, Plant & Equipment (Net)", category: "Non-Current Assets" },
  { key: "Capital Work in Progress", label: "Capital Work in Progress", category: "Non-Current Assets" },
  { key: "Investments (Long-Term)", label: "Investments (Long-Term)", category: "Non-Current Assets" },
  { key: "Lease Assets (if applicable)", label: "Lease Assets", category: "Non-Current Assets" },
  { key: "Other Non-Current Assets", label: "Other Non-Current Assets", category: "Non-Current Assets" },
  { key: "Deferred Tax Assets", label: "Deferred Tax Assets", category: "Non-Current Assets" },
  { key: "Intangible Assets", label: "Intangible Assets", category: "Non-Current Assets" },
  { key: "Intangible Assets Under Development", label: "Intangible Assets Under Dev.", category: "Non-Current Assets" },
  // Current Assets
  { key: "Cash & Cash Equivalents (Cash at bank included)", label: "Cash & Cash Equivalents", category: "Current Assets" },
  { key: "Trade Receivables (Debtors)", label: "Trade Receivables (Debtors)", category: "Current Assets" },
  { key: "Inventory / Stock", label: "Inventory / Stock", category: "Current Assets" },
  { key: "Short-term Financial Assets", label: "Short-term Financial Assets", category: "Current Assets" },
  { key: "Other Current Assets", label: "Other Current Assets", category: "Current Assets" },
  { key: "GST Input/Refunds Receivable", label: "GST Input/Refunds Receivable", category: "Current Assets" },
  // Equity
  { key: "Owner's Capital / Share Capital", label: "Owner's Capital / Share Capital", category: "Equity" },
  { key: "Share Premium", label: "Share Premium", category: "Equity" },
  { key: "Reserves & Surplus / Retained Earnings", label: "Reserves & Surplus / Retained Earnings", category: "Equity" },
  // Non-Current Liabilities
  { key: "Long-Term Borrowings", label: "Long-Term Borrowings", category: "Non-Current Liabilities" },
  { key: "Lease Liabilities (Long-Term)", label: "Lease Liabilities (Long-Term)", category: "Non-Current Liabilities" },
  { key: "Deferred Tax Liabilities", label: "Deferred Tax Liabilities", category: "Non-Current Liabilities" },
  { key: "Other Non-Current Liabilities", label: "Other Non-Current Liabilities", category: "Non-Current Liabilities" },
  // Current Liabilities
  { key: "Trade Payables (Creditors)", label: "Trade Payables (Creditors)", category: "Current Liabilities" },
  { key: "Short-Term Loans & Borrowings", label: "Short-Term Loans & Borrowings", category: "Current Liabilities" },
  { key: "Accrued Expenses / Outstanding Expenses", label: "Accrued Expenses / Outstanding", category: "Current Liabilities" },
  { key: "Tax/GST Payable", label: "Tax/GST Payable", category: "Current Liabilities" },
  { key: "Current Maturity of Long-term Debt", label: "Current Maturity of Long-term Debt", category: "Current Liabilities" },
  { key: "Employee Payables", label: "Employee Payables", category: "Current Liabilities" },
  { key: "Other Current Liabilities", label: "Other Current Liabilities", category: "Current Liabilities" },
];

export function createEmptyInputs(): BSMonthInputs {
  const empty: Record<string, number> = {};
  INPUT_FIELDS.forEach((f) => { empty[f.key] = 0; });
  return empty as BSMonthInputs;
}

// Computed fields
export interface ComputedBSMonth extends BSMonthInputs {
  "Total Non-Current Assets": number;
  "Total Current Assets": number;
  "TOTAL ASSETS": number;
  "Total Equity": number;
  "Total Non-Current Liability": number;
  "Total Current Liability": number;
  "TOTAL LIABILITIES": number;
  "BALANCE CHECK": number;
  "Working Capital": number;
  "Current Ratio": number;
  "Quick Ratio": number;
  "Debt/Equity Ratio": number;
  "Proprietary Ratio": number;
}

export interface MonthStatus {
  month: string;
  balanceCheck: number;
  workingCapital: number;
  currentRatio: number;
  status: "GREEN" | "RED";
}

export interface BalanceSheetInsights {
  overall: string;
  overallColor: string;
  guidance: string[];
  healthScore: number; // 0-100
}

export interface BalanceSheetResults {
  monthlyData: Record<string, ComputedBSMonth>;
  quarters: Record<string, Record<string, number>>;
  annual: Record<string, number>;
  status: MonthStatus[];
  monthsAdded: string[];
  insights: BalanceSheetInsights;
}

// ================== CALCULATION ENGINE ==================

function computeMonth(m: Record<string, number>): ComputedBSMonth {
  const c = { ...m } as any;

  // NON-CURRENT ASSETS
  c["Total Non-Current Assets"] =
    (m["Property, Plant & Equipment (Net)"] || 0) +
    (m["Capital Work in Progress"] || 0) +
    (m["Investments (Long-Term)"] || 0) +
    (m["Lease Assets (if applicable)"] || 0) +
    (m["Other Non-Current Assets"] || 0) +
    (m["Deferred Tax Assets"] || 0) +
    (m["Intangible Assets"] || 0) +
    (m["Intangible Assets Under Development"] || 0);

  // CURRENT ASSETS
  c["Total Current Assets"] =
    (m["Cash & Cash Equivalents (Cash at bank included)"] || 0) +
    (m["Trade Receivables (Debtors)"] || 0) +
    (m["Inventory / Stock"] || 0) +
    (m["Short-term Financial Assets"] || 0) +
    (m["Other Current Assets"] || 0) +
    (m["GST Input/Refunds Receivable"] || 0);

  c["TOTAL ASSETS"] = c["Total Non-Current Assets"] + c["Total Current Assets"];

  // EQUITY
  c["Total Equity"] =
    (m["Owner's Capital / Share Capital"] || 0) +
    (m["Share Premium"] || 0) +
    (m["Reserves & Surplus / Retained Earnings"] || 0);

  // NON-CURRENT LIABILITIES
  c["Total Non-Current Liability"] =
    (m["Long-Term Borrowings"] || 0) +
    (m["Lease Liabilities (Long-Term)"] || 0) +
    (m["Deferred Tax Liabilities"] || 0) +
    (m["Other Non-Current Liabilities"] || 0);

  // CURRENT LIABILITIES
  c["Total Current Liability"] =
    (m["Trade Payables (Creditors)"] || 0) +
    (m["Short-Term Loans & Borrowings"] || 0) +
    (m["Accrued Expenses / Outstanding Expenses"] || 0) +
    (m["Tax/GST Payable"] || 0) +
    (m["Current Maturity of Long-term Debt"] || 0) +
    (m["Employee Payables"] || 0) +
    (m["Other Current Liabilities"] || 0);

  c["TOTAL LIABILITIES"] = c["Total Equity"] + c["Total Non-Current Liability"] + c["Total Current Liability"];

  // BALANCE CHECK
  c["BALANCE CHECK"] = c["TOTAL ASSETS"] - c["TOTAL LIABILITIES"];

  // RATIOS
  const ca = c["Total Current Assets"];
  const cl = c["Total Current Liability"];
  const inv = m["Inventory / Stock"] || 0;
  const equity = c["Total Equity"];
  const debt = c["Total Non-Current Liability"] + c["Total Current Liability"];

  c["Working Capital"] = ca - cl;
  c["Current Ratio"] = cl > 0 ? ca / cl : 0;
  c["Quick Ratio"] = cl > 0 ? (ca - inv) / cl : 0;
  c["Debt/Equity Ratio"] = equity > 0 ? debt / equity : 0;
  c["Proprietary Ratio"] = c["TOTAL ASSETS"] > 0 ? equity / c["TOTAL ASSETS"] : 0;

  return c as ComputedBSMonth;
}

function sumMonths(
  data: Record<string, Record<string, number>>,
  months: string[]
): Record<string, number> {
  const sum: Record<string, number> = {};
  months.forEach((month) => {
    const d = data[month];
    if (!d) return;
    Object.keys(d).forEach((key) => {
      if (typeof d[key] === "number") {
        sum[key] = (sum[key] || 0) + d[key];
      }
    });
  });
  return sum;
}

export function calculateBalanceSheet(
  monthsData: Record<string, Record<string, number>>,
  cumulativeNetProfits?: Record<string, number>,
): BalanceSheetResults {
  const computed: Record<string, ComputedBSMonth> = {};
  const addedMonths: string[] = [];

  MONTHS_ORDER.forEach((month) => {
    if (monthsData[month]) {
      const mData = { ...monthsData[month] };
      // Add cumulative net profit to Retained Earnings if provided
      if (cumulativeNetProfits?.[month] !== undefined) {
        mData["Reserves & Surplus / Retained Earnings"] =
          (mData["Reserves & Surplus / Retained Earnings"] || 0) + cumulativeNetProfits[month];
      }
      computed[month] = computeMonth(mData);
      addedMonths.push(month);
    }
  });

  const quarters: Record<string, Record<string, number>> = {
    "Q1 (Apr–Jun)": sumMonths(computed, ["Apr", "May", "Jun"]),
    "Q2 (Jul–Sep)": sumMonths(computed, ["Jul", "Aug", "Sep"]),
    "Q3 (Oct–Dec)": sumMonths(computed, ["Oct", "Nov", "Dec"]),
    "Q4 (Jan–Mar)": sumMonths(computed, ["Jan", "Feb", "Mar"]),
  };

  const annual = sumMonths(computed, [...MONTHS_ORDER]);

  const status: MonthStatus[] = addedMonths.map((month) => ({
    month,
    balanceCheck: computed[month]["BALANCE CHECK"],
    workingCapital: computed[month]["Working Capital"],
    currentRatio: computed[month]["Current Ratio"],
    status: Math.abs(computed[month]["BALANCE CHECK"]) < 1 ? "GREEN" as const : "RED" as const,
  }));

  // Generate comprehensive insights
  const insights = generateInsights(computed, addedMonths, annual, status);

  return { monthlyData: computed, quarters, annual, status, monthsAdded: addedMonths, insights };
}

function generateInsights(
  computed: Record<string, ComputedBSMonth>,
  addedMonths: string[],
  annual: Record<string, number>,
  status: MonthStatus[]
): BalanceSheetInsights {
  const guidance: string[] = [];
  let overall: string;
  let overallColor: string;
  let healthScore = 100;

  // Check if any data entered
  if (addedMonths.length === 0) {
    return {
      overall: "Enter your balance sheet data to see financial health analysis.",
      overallColor: "text-muted-foreground",
      guidance: ["Start by entering asset and liability data for at least one month."],
      healthScore: 0,
    };
  }

  // Balance check issues
  const unbalancedMonths = status.filter(s => s.status === "RED").length;
  if (unbalancedMonths > 0) {
    healthScore -= unbalancedMonths * 15;
    guidance.push(`⚠️ ${unbalancedMonths} month(s) have balance sheet errors — Assets ≠ Liabilities + Equity.`);
  }

  // Current Ratio analysis
  const avgCurrentRatio = status.length > 0
    ? status.reduce((sum, s) => sum + s.currentRatio, 0) / status.length
    : 0;

  if (avgCurrentRatio < 1) {
    healthScore -= 20;
    guidance.push("⚠️ Current Ratio below 1 — insufficient current assets to cover short-term liabilities.");
  } else if (avgCurrentRatio < 1.5) {
    healthScore -= 10;
    guidance.push("⚠️ Current Ratio between 1-1.5 — limited liquidity buffer for emergencies.");
  } else if (avgCurrentRatio >= 2) {
    guidance.push("✓ Strong Current Ratio (>2) — excellent short-term liquidity position.");
  } else {
    guidance.push("✓ Adequate Current Ratio (>1.5) — reasonable liquidity buffer.");
  }

  // Working Capital analysis
  const totalWorkingCapital = annual["Working Capital"] || 0;
  const totalCurrentAssets = annual["Total Current Assets"] || 0;
  const workingCapitalRatio = totalCurrentAssets > 0 ? totalWorkingCapital / totalCurrentAssets : 0;

  if (totalWorkingCapital < 0) {
    healthScore -= 25;
    guidance.push("🚨 Negative Working Capital — critical cash flow risk! Immediate action required.");
  } else if (workingCapitalRatio < 0.2) {
    healthScore -= 10;
    guidance.push("⚠️ Low Working Capital — consider improving receivables collection or reducing payables.");
  }

  // Debt/Equity analysis
  const debtEquity = annual["Debt/Equity Ratio"] || 0;
  if (debtEquity > 3) {
    healthScore -= 20;
    guidance.push("⚠️ High Debt/Equity Ratio (>3) — heavily leveraged. Consider debt reduction.");
  } else if (debtEquity > 1.5) {
    healthScore -= 10;
    guidance.push("⚠️ Elevated Debt/Equity Ratio (>1.5) — monitor debt servicing capacity.");
  } else if (debtEquity <= 1 && debtEquity > 0) {
    guidance.push("✓ Conservative Debt/Equity Ratio (≤1) — balanced capital structure.");
  }

  // Proprietary Ratio (Equity/Assets)
  const proprietaryRatio = annual["Proprietary Ratio"] || 0;
  if (proprietaryRatio < 0.3) {
    healthScore -= 15;
    guidance.push("⚠️ Low Proprietary Ratio (<30%) — heavy reliance on external funding.");
  } else if (proprietaryRatio > 0.6) {
    guidance.push("✓ High Proprietary Ratio (>60%) — strong owner equity position.");
  }

  // Quick Ratio (excluding inventory)
  const avgQuickRatio = addedMonths.length > 0
    ? addedMonths.reduce((sum, m) => sum + computed[m]["Quick Ratio"], 0) / addedMonths.length
    : 0;

  if (avgQuickRatio < 0.8) {
    healthScore -= 10;
    guidance.push("⚠️ Quick Ratio below 0.8 — limited liquid assets excluding inventory.");
  } else if (avgQuickRatio >= 1) {
    guidance.push("✓ Quick Ratio ≥1 — can meet short-term obligations without selling inventory.");
  }

  // Asset composition insights
  const nonCurrentAssets = annual["Total Non-Current Assets"] || 0;
  const currentAssets = annual["Total Current Assets"] || 0;
  const totalAssets = annual["TOTAL ASSETS"] || 0;

  if (totalAssets > 0) {
    const nonCurrentRatio = nonCurrentAssets / totalAssets;
    if (nonCurrentRatio > 0.8) {
      guidance.push("📊 Asset-heavy business — high fixed assets may indicate capital-intensive operations.");
    } else if (nonCurrentRatio < 0.2) {
      guidance.push("📊 Asset-light business — low fixed assets, likely service/trading oriented.");
    }
  }

  // Cash position
  const totalCash = annual["Cash & Cash Equivalents (Cash at bank included)"] || 0;
  const currentLiabilities = annual["Total Current Liability"] || 0;
  const cashToCLRatio = currentLiabilities > 0 ? totalCash / currentLiabilities : 0;

  if (cashToCLRatio < 0.1 && totalCash > 0) {
    guidance.push("⚠️ Low cash position relative to current liabilities — potential liquidity crunch.");
  } else if (cashToCLRatio > 0.5) {
    guidance.push("✓ Strong cash buffer — well positioned for short-term obligations.");
  }

  // Inventory analysis
  const inventory = annual["Inventory / Stock"] || 0;
  const receivables = annual["Trade Receivables (Debtors)"] || 0;
  const inventoryToReceivables = receivables > 0 ? inventory / receivables : 0;

  if (inventoryToReceivables > 2) {
    guidance.push("⚠️ High inventory relative to receivables — check for slow-moving stock.");
  }

  // Determine overall status
  if (healthScore >= 80) {
    overall = "Strong financial health! Your balance sheet shows solid fundamentals.";
    overallColor = "text-success";
  } else if (healthScore >= 60) {
    overall = "Moderate financial health. Some areas need attention.";
    overallColor = "text-amber-400";
  } else if (healthScore >= 40) {
    overall = "Financial health concerns detected. Review highlighted issues.";
    overallColor = "text-orange-400";
  } else {
    overall = "Significant financial health issues. Immediate corrective action recommended.";
    overallColor = "text-danger";
  }

  // Add health score to guidance
  guidance.unshift(`📊 Financial Health Score: ${Math.max(0, healthScore)}/100`);

  // Default guidance if nothing specific
  if (guidance.length <= 1) {
    guidance.push("📊 Continue monitoring monthly to track financial health improvements.");
  }

  return { overall, overallColor, guidance, healthScore: Math.max(0, healthScore) };
}

// Output fields for display tables
export const OUTPUT_FIELDS: { key: string; label: string; format: "currency" | "ratio" | "check"; section: string }[] = [
  // Assets
  { key: "Total Non-Current Assets", label: "Total Non-Current Assets", format: "currency", section: "Assets" },
  { key: "Total Current Assets", label: "Total Current Assets", format: "currency", section: "Assets" },
  { key: "TOTAL ASSETS", label: "TOTAL ASSETS", format: "currency", section: "Assets" },
  // Equity & Liabilities
  { key: "Total Equity", label: "Total Equity", format: "currency", section: "Equity & Liabilities" },
  { key: "Total Non-Current Liability", label: "Total Non-Current Liabilities", format: "currency", section: "Equity & Liabilities" },
  { key: "Total Current Liability", label: "Total Current Liabilities", format: "currency", section: "Equity & Liabilities" },
  { key: "TOTAL LIABILITIES", label: "TOTAL EQUITY & LIABILITIES", format: "currency", section: "Equity & Liabilities" },
  // Check & Ratios
  { key: "BALANCE CHECK", label: "Balance Check (should be 0)", format: "check", section: "Verification & Ratios" },
  { key: "Working Capital", label: "Working Capital", format: "currency", section: "Verification & Ratios" },
  { key: "Current Ratio", label: "Current Ratio", format: "ratio", section: "Verification & Ratios" },
  { key: "Quick Ratio", label: "Quick Ratio", format: "ratio", section: "Verification & Ratios" },
  { key: "Debt/Equity Ratio", label: "Debt/Equity Ratio", format: "ratio", section: "Verification & Ratios" },
  { key: "Proprietary Ratio", label: "Proprietary Ratio", format: "ratio", section: "Verification & Ratios" },
];
