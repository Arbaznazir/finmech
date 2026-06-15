// ========================================================
// UNIT ECONOMICS BASICS – FULL EXCEL MATCH
// Month-by-month → CAC, LTV, ARPU, Payback, Churn,
// Growth Rate + RAG classification
// ========================================================

export const MONTHS_ORDER = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
] as const;

export type MonthName = (typeof MONTHS_ORDER)[number];

export interface UEMonthInputs {
  [key: string]: number | string;
  "Sales Revenue": number;
  "Marketing Spend": number;
  "Customers at the beginning": number;
  "New Customers": number;
  "Churned Customers": number;
}

export const INPUT_FIELDS: { key: string; label: string; category: string; prefix: string }[] = [
  { key: "Sales Revenue", label: "Sales Revenue", category: "Revenue", prefix: "$" },
  { key: "Marketing Spend", label: "Marketing Spend", category: "Revenue", prefix: "$" },
  { key: "Customers at the beginning", label: "Customers at Beginning", category: "Customers", prefix: "#" },
  { key: "New Customers", label: "New Customers", category: "Customers", prefix: "#" },
  { key: "Churned Customers", label: "Churned Customers", category: "Customers", prefix: "#" },
];

export function createEmptyInputs(): Record<string, number> {
  const empty: Record<string, number> = {};
  INPUT_FIELDS.forEach((f) => { empty[f.key] = 0; });
  return empty;
}

export interface ComputedUEMonth {
  [key: string]: number | string;
  "Sales Revenue": number;
  "Marketing Spend": number;
  "Customers at the beginning": number;
  "New Customers": number;
  "Churned Customers": number;
  "Total Customers": number;
  "Total Active Customers (Monthly)": number;
  "CAC": number;
  "ARPU": number;
  "Churn Rate %": number;
  "LTV": number;
  "CAC Payback Period (Months)": number;
  "Growth Rate %": number;
  "KPI Summary Dashboard": string;
}

export type RAGStatus = "GREEN" | "AMBER" | "RED";

export interface MonthStatus {
  month: string;
  rag: RAGStatus;
  ltvCacRatio: number;
  churnRate: number;
  growthRate: number;
}

export interface UEInsights {
  overall: string;
  overallColor: string;
  guidance: string[];
  healthScore: number;
  unitEconomicsGrade: "excellent" | "good" | "weak" | "critical";
}

export interface MonthStatusWithInsights extends MonthStatus {
  insights: UEInsights;
}

export interface UnitEconomicsResults {
  monthlyData: Record<string, ComputedUEMonth>;
  status: MonthStatusWithInsights[];
  monthsAdded: string[];
}

// ================== RAG & INSIGHTS ==================

function getRAG(m: Record<string, number | string>): RAGStatus {
  const cac = Number(m["CAC"]) || 0;
  const ltv = Number(m["LTV"]) || 0;
  const ltvCac = cac > 0 ? ltv / cac : 0;
  const churn = Number(m["Churn Rate %"]) || 0;
  const growth = Number(m["Growth Rate %"]) || 0;

  if (ltvCac > 3 && churn < 5 && growth > 20) return "GREEN";
  if (ltvCac > 1 && churn < 10) return "AMBER";
  return "RED";
}

function generateInsights(metrics: {
  ltv: number;
  cac: number;
  ltvCacRatio: number;
  churnRate: number;
  arpu: number;
  cacPaybackMonths: number;
  growthRate: number;
}): UEInsights {
  const { ltv, cac, ltvCacRatio, churnRate, arpu, cacPaybackMonths, growthRate } = metrics;
  const guidance: string[] = [];
  let healthScore = 100;
  let unitEconomicsGrade: "excellent" | "good" | "weak" | "critical" = "excellent";

  // LTV/CAC Ratio Analysis
  if (ltvCacRatio > 3) {
    guidance.push("✓ Excellent LTV/CAC Ratio (> 3x) — Very attractive unit economics for investors. Each customer generates 3x+ their acquisition cost.");
  } else if (ltvCacRatio > 1.5) {
    healthScore -= 15;
    unitEconomicsGrade = "good";
    guidance.push("📊 Good LTV/CAC Ratio (1.5-3x) — Unit economics are viable. Aim to reach 3x+ for optimal investor appeal.");
  } else if (ltvCacRatio >= 1) {
    healthScore -= 30;
    unitEconomicsGrade = "weak";
    guidance.push("⚠️ Weak LTV/CAC Ratio (1-1.5x) — Marginal unit economics. Focus on increasing LTV or reducing CAC.");
  } else {
    healthScore -= 50;
    unitEconomicsGrade = "critical";
    guidance.push("🚨 Critical LTV/CAC Ratio (< 1x) — Losing money on every customer! Immediate action required: reduce CAC or increase LTV.");
  }

  // Churn Rate Analysis
  if (churnRate < 2) {
    guidance.push("✓ Excellent Retention (< 2% churn) — Very sticky product with strong customer loyalty.");
  } else if (churnRate < 5) {
    healthScore -= 5;
    if (unitEconomicsGrade === "excellent") unitEconomicsGrade = "good";
    guidance.push("✓ Good Retention (2-5% churn) — Healthy customer retention. Continue nurturing relationships.");
  } else if (churnRate < 10) {
    healthScore -= 15;
    unitEconomicsGrade = unitEconomicsGrade === "excellent" ? "good" : "weak";
    guidance.push("⚠️ Moderate Churn (5-10%) — Retention needs work. Implement customer success programs.");
  } else {
    healthScore -= 30;
    unitEconomicsGrade = unitEconomicsGrade === "critical" ? "critical" : "weak";
    guidance.push("🚨 High Churn (> 10%) — Leaky bucket problem! Fix retention before scaling marketing spend.");
  }

  // CAC Payback Analysis
  if (cacPaybackMonths < 6) {
    guidance.push("✓ Fast CAC Payback (< 6 months) — Quick capital recovery. Cash-efficient growth model.");
  } else if (cacPaybackMonths < 12) {
    healthScore -= 5;
    guidance.push("📊 Moderate CAC Payback (6-12 months) — Reasonable payback period. Monitor cash flow closely.");
  } else if (cacPaybackMonths < 18) {
    healthScore -= 15;
    unitEconomicsGrade = unitEconomicsGrade === "excellent" ? "good" : unitEconomicsGrade;
    guidance.push("⚠️ Slow CAC Payback (12-18 months) — Long capital tie-up. Consider reducing CAC or increasing ARPU.");
  } else {
    healthScore -= 25;
    unitEconomicsGrade = unitEconomicsGrade === "critical" ? "critical" : "weak";
    guidance.push("🚨 Very Slow CAC Payback (> 18 months) — Capital-intensive acquisition. Requires significant funding.");
  }

  // Growth Rate Analysis
  if (growthRate > 20) {
    guidance.push("✓ Strong Growth (> 20% MoM) — Excellent traction. Keep scaling what's working.");
  } else if (growthRate > 10) {
    guidance.push("📊 Solid Growth (10-20% MoM) — Good momentum. Test channels to accelerate further.");
  } else if (growthRate > 0) {
    healthScore -= 10;
    guidance.push("⚠️ Slow Growth (0-10% MoM) — Growth is stalling. Investigate bottlenecks.");
  } else {
    healthScore -= 20;
    unitEconomicsGrade = unitEconomicsGrade === "critical" ? "critical" : "weak";
    guidance.push("🚨 Negative Growth — Customer base is shrinking! Critical issue requiring immediate attention.");
  }

  // ARPU Analysis
  if (arpu > 0 && arpu < cac * 0.5) {
    guidance.push("💡 Action: ARPU is very low relative to CAC. Consider upsells, pricing tiers, or premium features.");
  }

  // Specific recommendations
  if (ltvCacRatio < 3 && cac > 0) {
    const cacReductionTarget = Math.round((1 - (ltvCacRatio / 3)) * 100);
    guidance.push(`💡 Action: To reach 3x LTV/CAC, either reduce CAC by ${cacReductionTarget}% or increase LTV by ${Math.round((3/ltvCacRatio - 1) * 100)}%.`);
  }

  if (churnRate > 5 && cacPaybackMonths > 12) {
    guidance.push("🚨 Double Warning: High churn + slow payback = unsustainable model. Fix retention first, then optimize acquisition.");
  }

  // Determine overall status
  let overall: string;
  let overallColor: string;

  if (healthScore >= 80) {
    overall = "Excellent unit economics! Strong LTV/CAC, low churn, healthy growth.";
    overallColor = "text-success";
  } else if (healthScore >= 60) {
    overall = "Good unit economics with room for improvement in some areas.";
    overallColor = "text-amber-400";
  } else if (healthScore >= 40) {
    overall = "Weak unit economics. Focus on fixing fundamentals before scaling.";
    overallColor = "text-orange-400";
  } else {
    overall = "Critical unit economics issues. Business model needs restructuring.";
    overallColor = "text-danger";
  }

  // Add health score to guidance
  guidance.unshift(`📊 Unit Economics Health Score: ${Math.max(0, healthScore)}/100`);

  return {
    overall,
    overallColor,
    guidance,
    healthScore: Math.max(0, healthScore),
    unitEconomicsGrade,
  };
}

// ================== ENGINE ==================

export function calculateUnitEconomics(
  monthsData: Record<string, Record<string, number>>
): UnitEconomicsResults {
  const computed: Record<string, ComputedUEMonth> = {};
  const addedMonths: string[] = [];
  let prevCustomers = 0;

  MONTHS_ORDER.forEach((month) => {
    if (!monthsData[month]) return;
    addedMonths.push(month);

    const raw = monthsData[month];
    const m: Record<string, number | string> = { ...raw };

    const salesRevenue = Number(raw["Sales Revenue"]) || 0;
    const marketingSpend = Number(raw["Marketing Spend"]) || 0;
    const custBegin = Number(raw["Customers at the beginning"]) || prevCustomers;
    const newCust = Number(raw["New Customers"]) || 0;
    const churned = Number(raw["Churned Customers"]) || 0;

    m["Sales Revenue"] = salesRevenue;
    m["Marketing Spend"] = marketingSpend;
    m["Customers at the beginning"] = custBegin;
    m["New Customers"] = newCust;
    m["Churned Customers"] = churned;

    // Core customer metrics
    const totalCustomers = custBegin + newCust - churned;
    m["Total Customers"] = totalCustomers;
    m["Total Active Customers (Monthly)"] = (custBegin + totalCustomers) / 2;

    // KPIs
    m["CAC"] = newCust > 0 ? marketingSpend / newCust : 0;
    const activeCustomers = Number(m["Total Active Customers (Monthly)"]);
    m["ARPU"] = activeCustomers > 0 ? salesRevenue / activeCustomers : 0;

    // FIXED: Churn Rate uses beginning customers (matching Excel)
    const churnRate = custBegin > 0 ? churned / custBegin : 0;
    m["Churn Rate %"] = churnRate * 100;
    m["LTV"] = churnRate > 0 ? Number(m["ARPU"]) / churnRate : 0;

    m["CAC Payback Period (Months)"] = Number(m["ARPU"]) > 0 ? Number(m["CAC"]) / Number(m["ARPU"]) : 0;

    m["Growth Rate %"] = custBegin > 0
      ? ((totalCustomers - custBegin) / custBegin) * 100
      : 0;

    prevCustomers = totalCustomers;

    m["KPI Summary Dashboard"] = getRAG(m);

    computed[month] = m as unknown as ComputedUEMonth;
  });

  const status: MonthStatusWithInsights[] = addedMonths.map((month) => {
    const c = computed[month];
    const cac = Number(c["CAC"]) || 0;
    const ltv = Number(c["LTV"]) || 0;
    const arpu = Number(c["ARPU"]) || 0;
    const churnRate = Number(c["Churn Rate %"]) || 0;
    const growthRate = Number(c["Growth Rate %"]) || 0;
    const cacPayback = Number(c["CAC Payback Period (Months)"]) || 0;
    const ltvCacRatio = cac > 0 ? ltv / cac : 0;

    // Generate insights for this month
    const insights = generateInsights({
      ltv,
      cac,
      ltvCacRatio,
      churnRate,
      arpu,
      cacPaybackMonths: cacPayback,
      growthRate,
    });

    return {
      month,
      rag: c["KPI Summary Dashboard"] as RAGStatus,
      ltvCacRatio,
      churnRate,
      growthRate,
      insights,
    };
  });

  return { monthlyData: computed, status, monthsAdded: addedMonths };
}

export const OUTPUT_FIELDS: { key: string; label: string; format: "currency" | "number" | "percent" | "months" | "rag" }[] = [
  { key: "Total Customers", label: "Total Customers", format: "number" },
  { key: "Total Active Customers (Monthly)", label: "Active Customers (Avg)", format: "number" },
  { key: "CAC", label: "CAC", format: "currency" },
  { key: "ARPU", label: "ARPU", format: "currency" },
  { key: "Churn Rate %", label: "Churn Rate", format: "percent" },
  { key: "LTV", label: "LTV", format: "currency" },
  { key: "CAC Payback Period (Months)", label: "CAC Payback (Months)", format: "months" },
  { key: "Growth Rate %", label: "Growth Rate", format: "percent" },
  { key: "KPI Summary Dashboard", label: "RAG Status", format: "rag" },
];
