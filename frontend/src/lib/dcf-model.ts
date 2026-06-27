// ========================================================
// DCF VALUATION MODEL – FULL EXCEL MATCH
// Sheet: DCF Engine — WACC + 5-year FCFF + Terminal Value
// ========================================================

import { DCF_EXACT } from "@/lib/excel-exact-content.generated";

export interface DCFInputs {
  baseYearRevenue: number;
  revenueGrowthY1: number;
  revenueGrowthY2: number;
  revenueGrowthY3: number;
  revenueGrowthY4: number;
  revenueGrowthY5: number;
  ebitdaMargin: number;
  depreciationPctOfRevenue: number;
  annualCapex: number;
  workingCapitalPctOfRevenue: number;
  sharePrice: number;
  dilutedShares: number;
  debt: number;
  riskFreeRate: number;
  equityRiskPremium: number;
  beta: number;
  costOfDebt: number;
  taxRate: number;
  terminalGrowthRate: number;
}

export interface DCFYearRow {
  year: string;
  revenue: number;
  ebitda: number;
  depreciation: number;
  ebit: number;
  nopat: number;
  capex: number;
  deltaWC: number;
  fcff: number;
  pvOfFCFF: number;
}

export interface WACCResult {
  costOfEquity: number;
  afterTaxCostOfDebt: number;
  equityWeight: number;
  debtWeight: number;
  wacc: number;
  marketValueOfEquity: number;
}

export type HealthScenario = "BASE CASE" | "UPSIDE CASE" | "DOWNSIDE CASE";

export interface DCFResults {
  wacc: WACCResult;
  years: DCFYearRow[];
  totalPVofFCFF: number;
  terminalValue: number;
  pvOfTerminalValue: number;
  enterpriseValue: number;
  equityValue: number;
  valuePerShare: number;
  averageRevenueGrowth: number;
  ebitdaMarginDecimal: number;
  revenueGrowthScenario: HealthScenario;
  ebitdaMarginScenario: HealthScenario;
  insights: {
    interpretation: string;
    mentoring: string;
    scenarioLabel: string;
  };
}

export const INPUT_FIELDS: {
  key: keyof DCFInputs;
  label: string;
  category: string;
  type: "currency" | "percent" | "number" | "decimal";
}[] = [
  { key: "baseYearRevenue", label: "Base Year Revenue", category: "Basic Assumptions", type: "currency" },
  { key: "revenueGrowthY1", label: "Revenue Growth Y1 (%)", category: "Revenue Assumptions", type: "percent" },
  { key: "revenueGrowthY2", label: "Revenue Growth Y2 (%)", category: "Revenue Assumptions", type: "percent" },
  { key: "revenueGrowthY3", label: "Revenue Growth Y3 (%)", category: "Revenue Assumptions", type: "percent" },
  { key: "revenueGrowthY4", label: "Revenue Growth Y4 (%)", category: "Revenue Assumptions", type: "percent" },
  { key: "revenueGrowthY5", label: "Revenue Growth Y5 (%)", category: "Revenue Assumptions", type: "percent" },
  { key: "ebitdaMargin", label: "EBITDA Margin (%)", category: "Operating Assumptions", type: "percent" },
  { key: "depreciationPctOfRevenue", label: "Depreciation (% of Revenue)", category: "Operating Assumptions", type: "percent" },
  { key: "annualCapex", label: "Annual CapEx", category: "Operating Assumptions", type: "currency" },
  { key: "workingCapitalPctOfRevenue", label: "Working Capital (% of Revenue)", category: "Operating Assumptions", type: "percent" },
  { key: "sharePrice", label: "Share Price", category: "Capital Structure", type: "currency" },
  { key: "dilutedShares", label: "Diluted Shares Outstanding", category: "Capital Structure", type: "number" },
  { key: "debt", label: "Market Value of Debt", category: "Capital Structure", type: "currency" },
  { key: "riskFreeRate", label: "Risk-Free Rate (%)", category: "WACC Assumptions", type: "percent" },
  { key: "equityRiskPremium", label: "Equity Risk Premium (%)", category: "WACC Assumptions", type: "percent" },
  { key: "beta", label: "Beta", category: "WACC Assumptions", type: "decimal" },
  { key: "costOfDebt", label: "Cost of Debt (%)", category: "WACC Assumptions", type: "percent" },
  { key: "taxRate", label: "Tax Rate (%)", category: "WACC Assumptions", type: "percent" },
  { key: "terminalGrowthRate", label: "Terminal Growth Rate (%)", category: "Terminal Value", type: "percent" },
];

export function createDefaultInputs(): DCFInputs {
  return {
    baseYearRevenue: 5_000_000,
    revenueGrowthY1: 10,
    revenueGrowthY2: 10,
    revenueGrowthY3: 10,
    revenueGrowthY4: 10,
    revenueGrowthY5: 10,
    ebitdaMargin: 21.2,
    depreciationPctOfRevenue: 10.82,
    annualCapex: 100_000,
    workingCapitalPctOfRevenue: 13,
    sharePrice: 25,
    dilutedShares: 180_000,
    debt: 2_711_500,
    riskFreeRate: 7,
    equityRiskPremium: 2,
    beta: 0.01,
    costOfDebt: 9,
    taxRate: 20,
    terminalGrowthRate: 3,
  };
}

function pct(v: number): number {
  return v / 100;
}

function revenueGrowthScenario(avg: number): HealthScenario {
  if (avg > 0.08 && avg < 0.15) return "BASE CASE";
  if (avg > 0.14) return "UPSIDE CASE";
  return "DOWNSIDE CASE";
}

function ebitdaMarginScenario(margin: number): HealthScenario {
  if (margin > 0.1 && margin < 0.19) return "BASE CASE";
  if (margin > 0.2) return "UPSIDE CASE";
  return "DOWNSIDE CASE";
}

function scenarioInsights(scenario: HealthScenario) {
  switch (scenario) {
    case "UPSIDE CASE":
      return {
        interpretation: DCF_EXACT.interpretationUpside,
        mentoring: DCF_EXACT.mentoringUpside,
      };
    case "DOWNSIDE CASE":
      return {
        interpretation: DCF_EXACT.interpretationDownside,
        mentoring: DCF_EXACT.mentoringDownside,
      };
    default:
      return {
        interpretation: DCF_EXACT.interpretationBase,
        mentoring: DCF_EXACT.mentoringBase,
      };
  }
}

export function calculateDCF(inputs: DCFInputs): DCFResults {
  const {
    baseYearRevenue,
    revenueGrowthY1,
    revenueGrowthY2,
    revenueGrowthY3,
    revenueGrowthY4,
    revenueGrowthY5,
    ebitdaMargin,
    depreciationPctOfRevenue,
    annualCapex,
    workingCapitalPctOfRevenue,
    sharePrice,
    dilutedShares,
    debt,
    riskFreeRate,
    equityRiskPremium,
    beta,
    costOfDebt,
    taxRate,
    terminalGrowthRate,
  } = inputs;

  const growthInputs = [
    pct(revenueGrowthY1),
    pct(revenueGrowthY2),
    pct(revenueGrowthY3),
    pct(revenueGrowthY4),
    pct(revenueGrowthY5),
  ];
  // Excel B49 uses E14 (Y4 growth) for Year 5 revenue — not E15
  const projectionGrowths = [
    growthInputs[0],
    growthInputs[1],
    growthInputs[2],
    growthInputs[3],
    growthInputs[3],
  ];

  const ebitdaM = pct(ebitdaMargin);
  const depPct = pct(depreciationPctOfRevenue);
  const wcPct = pct(workingCapitalPctOfRevenue);
  const rf = pct(riskFreeRate);
  const erp = pct(equityRiskPremium);
  const cod = pct(costOfDebt);
  const tax = pct(taxRate);
  const tg = pct(terminalGrowthRate);

  const marketValueOfEquity = sharePrice * dilutedShares;
  const totalValue = marketValueOfEquity + debt;
  const equityWeight = totalValue > 0 ? marketValueOfEquity / totalValue : 0;
  const debtWeight = totalValue > 0 ? debt / totalValue : 0;
  const costOfEquity = rf + beta * erp;
  const afterTaxCostOfDebt = cod * (1 - tax);
  const waccRate =
    totalValue > 0
      ? equityWeight * costOfEquity + debtWeight * afterTaxCostOfDebt
      : 0;

  const wacc: WACCResult = {
    costOfEquity,
    afterTaxCostOfDebt,
    equityWeight,
    debtWeight,
    wacc: waccRate,
    marketValueOfEquity,
  };

  const years: DCFYearRow[] = [];
  let previousRevenue = baseYearRevenue;
  let totalPVofFCFF = 0;

  for (let i = 0; i < 5; i++) {
    const revenue = previousRevenue * (1 + projectionGrowths[i]);
    const ebitda = revenue * ebitdaM;
    const depreciation = revenue * depPct;
    const ebit = ebitda - depreciation;
    const nopat = ebit * (1 - tax);
    const capex = annualCapex;
    const deltaWC = (revenue - previousRevenue) * wcPct;
    const fcff = nopat + depreciation - capex - deltaWC;
    // Excel J45:J49 — single-period discount 1/(1+WACC), not compounded
    const pvOfFCFF = waccRate > 0 ? fcff / (1 + waccRate) : 0;

    totalPVofFCFF += pvOfFCFF;

    years.push({
      year: `Year ${i + 1}`,
      revenue,
      ebitda,
      depreciation,
      ebit,
      nopat,
      capex,
      deltaWC,
      fcff,
      pvOfFCFF,
    });

    previousRevenue = revenue;
  }

  const lastFCFF = years[4].fcff;
  const terminalValue = waccRate > tg ? (lastFCFF * (1 + tg)) / (waccRate - tg) : 0;
  const pvOfTerminalValue = waccRate > 0 ? terminalValue / (1 + waccRate) : 0;
  const enterpriseValue = totalPVofFCFF + pvOfTerminalValue;
  const equityValue = enterpriseValue - debt;
  const valuePerShare = dilutedShares > 0 ? equityValue / dilutedShares : 0;

  const averageRevenueGrowth =
    growthInputs.reduce((sum, g) => sum + g, 0) / growthInputs.length;
  const revScenario = revenueGrowthScenario(averageRevenueGrowth);
  const marginScenario = ebitdaMarginScenario(ebitdaM);
  const { interpretation, mentoring } = scenarioInsights(revScenario);

  return {
    wacc,
    years,
    totalPVofFCFF,
    terminalValue,
    pvOfTerminalValue,
    enterpriseValue,
    equityValue,
    valuePerShare,
    averageRevenueGrowth,
    ebitdaMarginDecimal: ebitdaM,
    revenueGrowthScenario: revScenario,
    ebitdaMarginScenario: marginScenario,
    insights: {
      interpretation,
      mentoring,
      scenarioLabel: revScenario,
    },
  };
}
