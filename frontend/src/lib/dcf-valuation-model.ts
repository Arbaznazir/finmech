export interface DCFInputs {
  // Base Year
  baseYearRevenue: number;

  // Growth & Margins (clean - no % placeholders)
  revenueGrowthY1: number;
  revenueGrowthY2: number;
  revenueGrowthY3: number;
  revenueGrowthY4: number;
  revenueGrowthY5: number;

  ebitdaMargin: number;             // e.g. 0.212
  depreciationPct: number;          // e.g. 0.1082
  capexPct: number;                 // e.g. 0.02
  workingCapitalPct: number;        // e.g. 0.13

  // WACC Inputs (Tax Rate lives here only)
  taxRate: number;                  // 0.20
  riskFreeRate: number;
  equityRiskPremium: number;
  beta: number;
  costOfDebt: number;
  debt: number;
  equityMarketValue: number;

  // Terminal
  terminalGrowthRate: number;
}

export interface DCFYearData {
  year: string;
  revenue: number;
  ebitda: number;
  depreciation: number;
  ebit: number;
  nopat: number;
  capex: number;
  changeInWC: number;
  fcff: number;
  pvOfFCFF: number;
}

export interface WACCResult {
  costOfEquity: number;
  equityWeight: number;
  debtWeight: number;
  afterTaxCostOfDebt: number;
  wacc: number;
}

export interface DCFResults {
  wacc: WACCResult;
  years: DCFYearData[];
  totalPVofFCFF: number;
  terminalValue: number;
  pvOfTerminalValue: number;
  enterpriseValue: number;
  equityValue: number;
  valuePerShare: number;
}

export const createDefaultInputs = (): DCFInputs => ({
  baseYearRevenue: 5000000,
  revenueGrowthY1: 0.10,
  revenueGrowthY2: 0.10,
  revenueGrowthY3: 0.10,
  revenueGrowthY4: 0.10,
  revenueGrowthY5: 0.10,
  ebitdaMargin: 0.212,
  depreciationPct: 0.1082,
  capexPct: 0.02,
  workingCapitalPct: 0.13,
  taxRate: 0.20,
  riskFreeRate: 0.07,
  equityRiskPremium: 0.02,
  beta: 0.01,
  costOfDebt: 0.09,
  debt: 2711500,
  equityMarketValue: 4500000,
  terminalGrowthRate: 0.03,
});

export class DCFValuationModel {
  private inputs: DCFInputs;

  constructor(inputs: DCFInputs) {
    this.inputs = inputs;
  }

  // ==================== WACC ====================
  calculateWACC(): WACCResult {
    const { riskFreeRate, equityRiskPremium, beta, costOfDebt, taxRate, debt, equityMarketValue } = this.inputs;

    const costOfEquity = riskFreeRate + (beta * equityRiskPremium);
    const totalValue = equityMarketValue + debt;

    const equityWeight = equityMarketValue / totalValue;
    const debtWeight = debt / totalValue;
    const afterTaxCostOfDebt = costOfDebt * (1 - taxRate);

    const wacc = (equityWeight * costOfEquity) + (debtWeight * afterTaxCostOfDebt);

    return {
      costOfEquity,
      equityWeight,
      debtWeight,
      afterTaxCostOfDebt,
      wacc
    };
  }

  // ==================== DCF PROJECTION (Excel DCF Engine) ====================
  calculateDCF(): DCFResults {
    const {
      baseYearRevenue,
      ebitdaMargin,
      depreciationPct,
      capexPct,
      workingCapitalPct,
      taxRate,
      terminalGrowthRate,
      debt,
      equityMarketValue,
    } = this.inputs;
    const waccResult = this.calculateWACC();
    const wacc = waccResult.wacc;
    const annualCapex = baseYearRevenue * capexPct;

    const growthInputs = [
      this.inputs.revenueGrowthY1,
      this.inputs.revenueGrowthY2,
      this.inputs.revenueGrowthY3,
      this.inputs.revenueGrowthY4,
      this.inputs.revenueGrowthY5,
    ];
    const projectionGrowths = [
      growthInputs[0],
      growthInputs[1],
      growthInputs[2],
      growthInputs[3],
      growthInputs[3],
    ];

    const years: DCFYearData[] = [];
    let previousRevenue = baseYearRevenue;
    let totalPVofFCFF = 0;

    for (let i = 0; i < 5; i++) {
      const revenue = previousRevenue * (1 + projectionGrowths[i]);
      const ebitda = revenue * ebitdaMargin;
      const depreciation = revenue * depreciationPct;
      const ebit = ebitda - depreciation;
      const nopat = ebit * (1 - taxRate);
      const capex = annualCapex;
      const changeInWC = (revenue - previousRevenue) * workingCapitalPct;
      const fcff = nopat + depreciation - capex - changeInWC;
      const pvOfFCFF = wacc > 0 ? fcff / (1 + wacc) : 0;

      totalPVofFCFF += pvOfFCFF;

      years.push({
        year: `Year ${i + 1}`,
        revenue,
        ebitda,
        depreciation,
        ebit,
        nopat,
        capex,
        changeInWC,
        fcff,
        pvOfFCFF,
      });

      previousRevenue = revenue;
    }

    const lastYearFCFF = years[4].fcff;
    const terminalValue =
      wacc > terminalGrowthRate
        ? (lastYearFCFF * (1 + terminalGrowthRate)) / (wacc - terminalGrowthRate)
        : 0;
    const pvOfTerminalValue = wacc > 0 ? terminalValue / (1 + wacc) : 0;

    const enterpriseValue = totalPVofFCFF + pvOfTerminalValue;
    const equityValue = enterpriseValue - debt;
    const valuePerShare = equityValue / 180_000;

    return {
      wacc: waccResult,
      years,
      totalPVofFCFF,
      terminalValue,
      pvOfTerminalValue,
      enterpriseValue,
      equityValue,
      valuePerShare,
    };
  }
}

// Convenience function for simple usage
export function calculateDCF(inputs: DCFInputs): DCFResults {
  const model = new DCFValuationModel(inputs);
  return model.calculateDCF();
}
