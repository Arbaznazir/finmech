// ========================================================
// DCF VALUATION MODEL – FULL EXCEL MATCH
// WACC + 5-year projection + Terminal Value +
// Enterprise/Equity Value
// ========================================================

export interface DCFInputs {
  baseYearRevenue: number;
  revenueGrowthY1: number;
  revenueGrowthY2: number;
  revenueGrowthY3: number;
  revenueGrowthY4: number;
  revenueGrowthY5: number;
  ebitdaMargin: number;
  depreciationPctOfRevenue: number;
  capexPctOfRevenue: number;
  workingCapitalPctOfRevenue: number;
  riskFreeRate: number;
  equityRiskPremium: number;
  beta: number;
  costOfDebt: number;
  taxRate: number;
  terminalGrowthRate: number;
  marketValueOfEquity: number;
  marketValueOfDebt: number;
}

export interface ProjectionRow {
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

export interface DCFResults {
  // WACC
  costOfEquity: number;
  afterTaxCostOfDebt: number;
  equityWeight: number;
  debtWeight: number;
  wacc: number;
  // Projection
  projection: ProjectionRow[];
  // Valuation
  terminalValue: number;
  pvOfTerminalValue: number;
  totalPVOfFCFF: number;
  enterpriseValue: number;
  equityValue: number;
  // Inputs echoed
  baseYearRevenue: number;
  terminalGrowthRate: number;
}

export const INPUT_FIELDS: { key: keyof DCFInputs; label: string; category: string; type: "currency" | "percent" | "number" | "decimal" }[] = [
  // Revenue
  { key: "baseYearRevenue", label: "Base Year Revenue", category: "Revenue Assumptions", type: "currency" },
  { key: "revenueGrowthY1", label: "Revenue Growth Y1 (%)", category: "Revenue Assumptions", type: "percent" },
  { key: "revenueGrowthY2", label: "Revenue Growth Y2 (%)", category: "Revenue Assumptions", type: "percent" },
  { key: "revenueGrowthY3", label: "Revenue Growth Y3 (%)", category: "Revenue Assumptions", type: "percent" },
  { key: "revenueGrowthY4", label: "Revenue Growth Y4 (%)", category: "Revenue Assumptions", type: "percent" },
  { key: "revenueGrowthY5", label: "Revenue Growth Y5 (%)", category: "Revenue Assumptions", type: "percent" },
  // Margins & OpEx
  { key: "ebitdaMargin", label: "EBITDA Margin (%)", category: "Operating Assumptions", type: "percent" },
  { key: "depreciationPctOfRevenue", label: "Depreciation (% of Revenue)", category: "Operating Assumptions", type: "percent" },
  { key: "capexPctOfRevenue", label: "CapEx (% of Revenue)", category: "Operating Assumptions", type: "percent" },
  { key: "workingCapitalPctOfRevenue", label: "Working Capital (% of Revenue)", category: "Operating Assumptions", type: "percent" },
  { key: "taxRate", label: "Tax Rate (%)", category: "Operating Assumptions", type: "percent" },
  // WACC
  { key: "riskFreeRate", label: "Risk-Free Rate (%)", category: "WACC Assumptions", type: "percent" },
  { key: "equityRiskPremium", label: "Equity Risk Premium (%)", category: "WACC Assumptions", type: "percent" },
  { key: "beta", label: "Beta", category: "WACC Assumptions", type: "decimal" },
  { key: "costOfDebt", label: "Cost of Debt (%)", category: "WACC Assumptions", type: "percent" },
  { key: "marketValueOfEquity", label: "Market Value of Equity", category: "WACC Assumptions", type: "currency" },
  { key: "marketValueOfDebt", label: "Market Value of Debt", category: "WACC Assumptions", type: "currency" },
  // Terminal
  { key: "terminalGrowthRate", label: "Terminal Growth Rate (%)", category: "Terminal Value", type: "percent" },
];

export function createDefaultInputs(): DCFInputs {
  return {
    baseYearRevenue: 0,
    revenueGrowthY1: 0, revenueGrowthY2: 0, revenueGrowthY3: 0,
    revenueGrowthY4: 0, revenueGrowthY5: 0,
    ebitdaMargin: 0,
    depreciationPctOfRevenue: 0,
    capexPctOfRevenue: 0,
    workingCapitalPctOfRevenue: 0,
    riskFreeRate: 0,
    equityRiskPremium: 0,
    beta: 0,
    costOfDebt: 0,
    taxRate: 0,
    terminalGrowthRate: 0,
    marketValueOfEquity: 0,
    marketValueOfDebt: 0,
  };
}

export function calculateDCF(inputs: DCFInputs): DCFResults {
  const {
    baseYearRevenue,
    revenueGrowthY1, revenueGrowthY2, revenueGrowthY3,
    revenueGrowthY4, revenueGrowthY5,
    ebitdaMargin, depreciationPctOfRevenue,
    capexPctOfRevenue, workingCapitalPctOfRevenue,
    riskFreeRate, equityRiskPremium, beta,
    costOfDebt, taxRate, terminalGrowthRate,
    marketValueOfEquity, marketValueOfDebt,
  } = inputs;

  // Convert percentages to decimals
  const growths = [revenueGrowthY1, revenueGrowthY2, revenueGrowthY3, revenueGrowthY4, revenueGrowthY5].map((g) => g / 100);
  const ebitdaM = ebitdaMargin / 100;
  const depPct = depreciationPctOfRevenue / 100;
  const capexPct = capexPctOfRevenue / 100;
  const wcPct = workingCapitalPctOfRevenue / 100;
  const rf = riskFreeRate / 100;
  const erp = equityRiskPremium / 100;
  const cod = costOfDebt / 100;
  const tax = taxRate / 100;
  const tg = terminalGrowthRate / 100;

  // WACC
  const totalValue = marketValueOfEquity + marketValueOfDebt;
  const equityWeight = totalValue > 0 ? marketValueOfEquity / totalValue : 0.5;
  const debtWeight = totalValue > 0 ? marketValueOfDebt / totalValue : 0.5;
  const costOfEquity = rf + (beta * erp);
  const afterTaxCostOfDebt = cod * (1 - tax);
  const wacc = (equityWeight * costOfEquity) + (debtWeight * afterTaxCostOfDebt);

  // 5-Year Projection
  const projection: ProjectionRow[] = [];
  let revenue = baseYearRevenue;

  for (let year = 0; year < 5; year++) {
    revenue *= (1 + growths[year]);

    const ebitda = revenue * ebitdaM;
    const depreciation = revenue * depPct;
    const ebit = ebitda - depreciation;
    const nopat = ebit * (1 - tax);
    const capex = revenue * capexPct;
    const deltaWC = revenue * wcPct;
    const fcff = nopat + depreciation - capex - deltaWC;

    projection.push({
      year: `Year ${year + 1}`,
      revenue: Math.round(revenue),
      ebitda: Math.round(ebitda),
      depreciation: Math.round(depreciation),
      ebit: Math.round(ebit),
      nopat: Math.round(nopat),
      capex: Math.round(capex),
      deltaWC: Math.round(deltaWC),
      fcff: Math.round(fcff),
      pvOfFCFF: 0,
    });
  }

  // Terminal Value (Gordon Growth)
  const lastFCFF = projection[4].fcff;
  const terminalValue = wacc > tg ? lastFCFF * (1 + tg) / (wacc - tg) : 0;

  // Present Values
  let totalPVOfFCFF = 0;
  projection.forEach((row, i) => {
    const pv = row.fcff / Math.pow(1 + wacc, i + 1);
    row.pvOfFCFF = Math.round(pv);
    totalPVOfFCFF += pv;
  });

  const pvOfTerminalValue = wacc > tg ? terminalValue / Math.pow(1 + wacc, 5) : 0;
  const enterpriseValue = totalPVOfFCFF + pvOfTerminalValue;
  const equityValue = enterpriseValue - marketValueOfDebt;

  return {
    costOfEquity,
    afterTaxCostOfDebt,
    equityWeight,
    debtWeight,
    wacc,
    projection,
    terminalValue: Math.round(terminalValue),
    pvOfTerminalValue: Math.round(pvOfTerminalValue),
    totalPVOfFCFF: Math.round(totalPVOfFCFF),
    enterpriseValue: Math.round(enterpriseValue),
    equityValue: Math.round(equityValue),
    baseYearRevenue,
    terminalGrowthRate: tg,
  };
}
