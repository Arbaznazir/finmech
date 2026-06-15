// ========================================================
// BURN & RUNWAY MONITOR – FULL EXCEL MATCH
// Month-by-month → cumulative cash, burn rates, runway,
// ratios & GREEN/AMBER/RED classification
// ========================================================

export const MONTHS_ORDER = [
  "April", "May", "June", "July", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export type MonthName = (typeof MONTHS_ORDER)[number];

export interface BurnMonthInputs {
  [key: string]: number | string;
  "Fixed Expenses": number;
  "Variable Expenses": number;
  "Recurring Revenue": number;
  "Miscll. revenue": number;
}

export const INPUT_FIELDS: { key: string; label: string; category: string }[] = [
  { key: "Fixed Expenses", label: "Fixed Expenses", category: "Expenses" },
  { key: "Variable Expenses", label: "Variable Expenses", category: "Expenses" },
  { key: "Recurring Revenue", label: "Recurring Revenue", category: "Revenue" },
  { key: "Miscll. revenue", label: "Miscellaneous Revenue", category: "Revenue" },
];

export function createEmptyInputs(): BurnMonthInputs {
  return {
    "Fixed Expenses": 0,
    "Variable Expenses": 0,
    "Recurring Revenue": 0,
    "Miscll. revenue": 0,
  };
}

export interface ComputedBurnMonth extends BurnMonthInputs {
  "Total Expenses": number;
  "Total Revenue": number;
  "Net Profit/Loss": number;
  "Cumulative Cash": number;
  "Gross Burn": number;
  "Net Burn": number;
  "Avg Net Burn (to date)": number;
  "Net Burn Ratio": number;
  "Recurring Revenue ratio": number;
  "Variable Cost Ratio": number;
  "Fixed expenses Ratio": number;
  "Runway (months)": number;
  "CLASSIFICATION": string;
}

export type Classification = "GREEN" | "AMBER" | "RED";

export interface MonthStatus {
  month: string;
  classification: Classification;
  runway: number;
  netBurn: number;
  cumulativeCash: number;
}

export interface BurnRunwayInsights {
  overall: string;
  overallColor: string;
  guidance: string[];
  healthScore: number; // 0-100
  runwayTrend: "improving" | "stable" | "declining" | "critical";
  cashOutlook: "surplus" | "adequate" | "constrained" | "deficit";
}

export interface BurnRunwayResults {
  monthlyData: Record<string, ComputedBurnMonth>;
  status: MonthStatus[];
  monthsAdded: string[];
  openingCash: number;
  insights: BurnRunwayInsights;
}

// ================== CLASSIFICATION LOGIC ==================

function getClassification(m: Record<string, number>): Classification {
  const recurringRatio = m["Recurring Revenue ratio"] || 0;
  const netBurnRatio = m["Net Burn Ratio"] || 0;
  const runway = m["Runway (months)"] || 0;

  if (recurringRatio >= 0.70 && runway >= 12 && netBurnRatio <= 0.30) {
    return "GREEN";
  } else if (recurringRatio >= 0.40 && runway >= 6 && netBurnRatio <= 0.60) {
    return "AMBER";
  }
  return "RED";
}

// ================== CALCULATION ENGINE ==================

export function calculateBurnRunway(
  monthsData: Record<string, Record<string, number>>,
  openingCash: number
): BurnRunwayResults {
  const computed: Record<string, ComputedBurnMonth> = {};
  const addedMonths: string[] = [];
  let cumulativeCash = openingCash;

  MONTHS_ORDER.forEach((month, globalIdx) => {
    if (!monthsData[month]) return;

    const m = { ...monthsData[month] } as any;
    addedMonths.push(month);

    // Core calculations
    m["Total Expenses"] = (m["Fixed Expenses"] || 0) + (m["Variable Expenses"] || 0);
    m["Total Revenue"] = (m["Recurring Revenue"] || 0) + (m["Miscll. revenue"] || 0);
    m["Net Profit/Loss"] = m["Total Revenue"] - m["Total Expenses"];

    // Cumulative Cash
    cumulativeCash += m["Net Profit/Loss"];
    m["Cumulative Cash"] = cumulativeCash;

    // Burn Metrics
    m["Gross Burn"] = m["Total Expenses"];
    m["Net Burn"] = Math.max(0, m["Total Expenses"] - m["Total Revenue"]);

    // Avg Net Burn (to date)
    const monthsSoFar = addedMonths.length;
    const totalNetBurnSoFar = addedMonths.reduce(
      (sum, mName) => sum + ((computed[mName]?.["Net Burn"] ?? 0) + (mName === month ? m["Net Burn"] : 0)),
      0
    );
    // Simpler: recalculate from all computed months + current
    let runningNetBurn = 0;
    addedMonths.forEach((mn) => {
      if (mn === month) runningNetBurn += m["Net Burn"];
      else runningNetBurn += computed[mn]["Net Burn"];
    });
    m["Avg Net Burn (to date)"] = runningNetBurn / monthsSoFar;

    // Ratios
    const totalRev = m["Total Revenue"];
    m["Net Burn Ratio"] = totalRev > 0 ? m["Net Burn"] / totalRev : 0;
    m["Recurring Revenue ratio"] = totalRev > 0 ? (m["Recurring Revenue"] || 0) / totalRev : 0;
    m["Variable Cost Ratio"] = totalRev > 0 ? (m["Variable Expenses"] || 0) / totalRev : 0;
    m["Fixed expenses Ratio"] = totalRev > 0 ? (m["Fixed Expenses"] || 0) / totalRev : 0;

    // Runway
    const avgNetBurn = m["Avg Net Burn (to date)"];
    m["Runway (months)"] = avgNetBurn > 0 ? m["Cumulative Cash"] / avgNetBurn : Infinity;

    // Classification
    m["CLASSIFICATION"] = getClassification(m);

    computed[month] = m as ComputedBurnMonth;
  });

  const status: MonthStatus[] = addedMonths.map((month) => ({
    month,
    classification: computed[month]["CLASSIFICATION"] as Classification,
    runway: computed[month]["Runway (months)"],
    netBurn: computed[month]["Net Burn"],
    cumulativeCash: computed[month]["Cumulative Cash"],
  }));

  // Generate comprehensive insights
  const insights = generateInsights(computed, addedMonths, status, openingCash);

  return { monthlyData: computed, status, monthsAdded: addedMonths, openingCash, insights };
}

function generateInsights(
  computed: Record<string, ComputedBurnMonth>,
  addedMonths: string[],
  status: MonthStatus[],
  openingCash: number
): BurnRunwayInsights {
  const guidance: string[] = [];
  let overall: string;
  let overallColor: string;
  let healthScore = 100;
  let runwayTrend: "improving" | "stable" | "declining" | "critical" = "stable";
  let cashOutlook: "surplus" | "adequate" | "constrained" | "deficit" = "adequate";

  // Check if any data entered
  if (addedMonths.length === 0) {
    return {
      overall: "Enter your monthly data to see burn & runway analysis.",
      overallColor: "text-muted-foreground",
      guidance: ["Start by entering opening cash and monthly revenue/expense data."],
      healthScore: 0,
      runwayTrend: "stable",
      cashOutlook: "adequate",
    };
  }

  // Get latest month data
  const latestMonth = addedMonths[addedMonths.length - 1];
  const latest = computed[latestMonth];
  const latestStatus = status[status.length - 1];

  // Cash position analysis
  const finalCash = latest["Cumulative Cash"];
  if (finalCash < 0) {
    healthScore -= 40;
    cashOutlook = "deficit";
    guidance.push("🚨 Cash Deficit — You've burned through your opening cash. Immediate fundraising or cost-cutting required.");
  } else if (finalCash < openingCash * 0.2) {
    healthScore -= 25;
    cashOutlook = "constrained";
    guidance.push("⚠️ Low Cash Reserve — Less than 20% of opening cash remains. Plan fundraising now.");
  } else if (finalCash > openingCash * 1.5) {
    cashOutlook = "surplus";
    guidance.push("✓ Cash Surplus — You've grown your cash position. Consider reinvestment or expansion.");
  }

  // Runway analysis
  const runway = latestStatus.runway;
  if (runway === Infinity) {
    healthScore = Math.min(100, healthScore + 10);
    guidance.push("✓ Infinite Runway — Revenue covers all expenses. You're self-sustaining!");
    runwayTrend = "improving";
  } else if (runway < 3) {
    healthScore -= 35;
    runwayTrend = "critical";
    guidance.push("🚨 Critical Runway (< 3 months) — You're running on fumes. Emergency action needed.");
  } else if (runway < 6) {
    healthScore -= 20;
    runwayTrend = "declining";
    guidance.push("⚠️ Low Runway (< 6 months) — Start fundraising or reduce burn immediately.");
  } else if (runway < 12) {
    healthScore -= 5;
    guidance.push("⚠️ Moderate Runway (6-12 months) — Monitor closely and plan ahead.");
  } else {
    guidance.push("✓ Healthy Runway (> 12 months) — Good financial buffer for operations.");
  }

  // Trend analysis - compare first half to second half
  if (addedMonths.length >= 3) {
    const midPoint = Math.floor(addedMonths.length / 2);
    const firstHalf = addedMonths.slice(0, midPoint);
    const secondHalf = addedMonths.slice(midPoint);
    
    const firstHalfBurn = firstHalf.reduce((sum, m) => sum + computed[m]["Net Burn"], 0) / firstHalf.length;
    const secondHalfBurn = secondHalf.reduce((sum, m) => sum + computed[m]["Net Burn"], 0) / secondHalf.length;
    
    if (secondHalfBurn < firstHalfBurn * 0.8) {
      guidance.push("✓ Improving Trend — Net burn is decreasing. You're moving toward profitability.");
      if (runwayTrend !== "critical") runwayTrend = "improving";
    } else if (secondHalfBurn > firstHalfBurn * 1.2) {
      healthScore -= 15;
      guidance.push("⚠️ Worsening Trend — Net burn is increasing. Review expense growth.");
      if (runwayTrend !== "critical") runwayTrend = "declining";
    }
  }

  // Recurring Revenue analysis
  const recurringRatio = latest["Recurring Revenue ratio"] || 0;
  if (recurringRatio >= 0.7) {
    guidance.push("✓ High Recurring Revenue (>70%) — Predictable revenue stream reduces cash risk.");
  } else if (recurringRatio < 0.3) {
    healthScore -= 10;
    guidance.push("⚠️ Low Recurring Revenue (<30%) — Heavy reliance on variable income creates uncertainty.");
  }

  // Net Burn Ratio analysis
  const netBurnRatio = latest["Net Burn Ratio"] || 0;
  if (netBurnRatio > 1) {
    healthScore -= 20;
    guidance.push("🚨 High Net Burn Ratio — Expenses exceed revenue by over 100%. Unsustainable.");
  } else if (netBurnRatio > 0.5) {
    healthScore -= 10;
    guidance.push("⚠️ Elevated Net Burn Ratio — Expenses significantly exceed revenue.");
  } else if (netBurnRatio < 0.1 && latest["Net Burn"] > 0) {
    guidance.push("✓ Controlled Burn — Low net burn ratio indicates efficient operations.");
  }

  // Fixed vs Variable expense analysis
  const fixedRatio = latest["Fixed expenses Ratio"] || 0;
  const variableRatio = latest["Variable Cost Ratio"] || 0;
  if (fixedRatio > 0.8 && latest["Total Revenue"] > 0) {
    guidance.push("📊 High Fixed Cost Structure — Limited flexibility. Consider converting fixed to variable costs.");
  } else if (variableRatio > fixedRatio && latest["Total Revenue"] > 0) {
    guidance.push("✓ Flexible Cost Structure — Variable costs dominate, providing operational flexibility.");
  }

  // Classification breakdown
  const greenMonths = status.filter(s => s.classification === "GREEN").length;
  const amberMonths = status.filter(s => s.classification === "AMBER").length;
  const redMonths = status.filter(s => s.classification === "RED").length;
  const totalMonths = status.length;

  if (redMonths > totalMonths * 0.5) {
    healthScore -= 15;
    guidance.push(`⚠️ Mostly RED Months (${redMonths}/${totalMonths}) — Financial health is poor overall.`);
  } else if (greenMonths > totalMonths * 0.6) {
    guidance.push(`✓ Mostly GREEN Months (${greenMonths}/${totalMonths}) — Consistent financial health.`);
  }

  // Cash flow volatility
  if (addedMonths.length >= 3) {
    const cashFlows = addedMonths.map(m => computed[m]["Net Profit/Loss"]);
    const avgCashFlow = cashFlows.reduce((a, b) => a + b, 0) / cashFlows.length;
    const variance = cashFlows.reduce((sum, cf) => sum + Math.pow(cf - avgCashFlow, 2), 0) / cashFlows.length;
    const volatility = Math.sqrt(variance);
    
    if (volatility > Math.abs(avgCashFlow) * 2) {
      guidance.push("⚠️ High Cash Flow Volatility — Unpredictable swings make planning difficult.");
    }
  }

  // Determine overall status
  if (healthScore >= 80) {
    overall = "Excellent burn management! Strong runway and healthy cash position.";
    overallColor = "text-success";
  } else if (healthScore >= 60) {
    overall = "Moderate financial health. Monitor runway and optimize burn rate.";
    overallColor = "text-amber-400";
  } else if (healthScore >= 40) {
    overall = "Financial stress detected. Take action to extend runway.";
    overallColor = "text-orange-400";
  } else {
    overall = "Critical financial situation. Immediate intervention required.";
    overallColor = "text-danger";
  }

  // Add health score to guidance
  guidance.unshift(`📊 Burn Health Score: ${Math.max(0, healthScore)}/100`);

  // Default guidance
  if (guidance.length <= 1) {
    guidance.push("📊 Continue tracking monthly to monitor runway trends.");
  }

  return {
    overall,
    overallColor,
    guidance,
    healthScore: Math.max(0, healthScore),
    runwayTrend,
    cashOutlook,
  };
}

// Output fields for display
export const OUTPUT_FIELDS: { key: string; label: string; format: "currency" | "ratio" | "months" | "classification" }[] = [
  { key: "Total Expenses", label: "Total Expenses", format: "currency" },
  { key: "Total Revenue", label: "Total Revenue", format: "currency" },
  { key: "Net Profit/Loss", label: "Net Profit/Loss", format: "currency" },
  { key: "Cumulative Cash", label: "Cumulative Cash", format: "currency" },
  { key: "Gross Burn", label: "Gross Burn", format: "currency" },
  { key: "Net Burn", label: "Net Burn", format: "currency" },
  { key: "Avg Net Burn (to date)", label: "Avg Net Burn (to date)", format: "currency" },
  { key: "Net Burn Ratio", label: "Net Burn Ratio", format: "ratio" },
  { key: "Recurring Revenue ratio", label: "Recurring Revenue Ratio", format: "ratio" },
  { key: "Variable Cost Ratio", label: "Variable Cost Ratio", format: "ratio" },
  { key: "Fixed expenses Ratio", label: "Fixed Expenses Ratio", format: "ratio" },
  { key: "Runway (months)", label: "Runway (months)", format: "months" },
  { key: "CLASSIFICATION", label: "Classification", format: "classification" },
];
