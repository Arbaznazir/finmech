// ========================================================
// COSTING MODEL (FREE) – FULL EXCEL MATCH
// Receives monthlyUnitsSold from Revenue Model
// Supplies totalVariableCostPerUnit + totalFixedCosts
// to Break-even Model
// ========================================================

export interface CostingInputs {
  // Fixed Costs
  salaries: number;
  officeRent: number;
  utilities: number;
  softwareSubscriptions: number;
  administrativeCosts: number;
  otherFixedCosts: number;
  // Variable Costs per Unit
  rawMaterial: number;
  packaging: number;
  shippingLogistics: number;
  salesCommission: number;
  paymentGatewayFees: number;
  otherVariableCosts: number;
  // Units (can be auto-filled from Revenue)
  unitsSold: number;
}

export interface CostingResults {
  totalFixedCosts: number;
  totalVariableCostPerUnit: number;
  totalVariableCost: number;
  totalMonthlyCost: number;
  unitsSold: number;
}

export const FIXED_COST_FIELDS: { key: keyof CostingInputs; label: string }[] = [
  { key: "salaries", label: "Salaries" },
  { key: "officeRent", label: "Office Rent" },
  { key: "utilities", label: "Utilities" },
  { key: "softwareSubscriptions", label: "Software Subscriptions" },
  { key: "administrativeCosts", label: "Administrative Costs" },
  { key: "otherFixedCosts", label: "Other Fixed Costs" },
];

export const VARIABLE_COST_FIELDS: { key: keyof CostingInputs; label: string }[] = [
  { key: "rawMaterial", label: "Raw Material" },
  { key: "packaging", label: "Packaging" },
  { key: "shippingLogistics", label: "Shipping / Logistics" },
  { key: "salesCommission", label: "Sales Commission" },
  { key: "paymentGatewayFees", label: "Payment Gateway Fees" },
  { key: "otherVariableCosts", label: "Other Variable Costs" },
];

export function createEmptyCostingInputs(): CostingInputs {
  return {
    salaries: 0, officeRent: 0, utilities: 0,
    softwareSubscriptions: 0, administrativeCosts: 0, otherFixedCosts: 0,
    rawMaterial: 0, packaging: 0, shippingLogistics: 0,
    salesCommission: 0, paymentGatewayFees: 0, otherVariableCosts: 0,
    unitsSold: 0,
  };
}

export function calculateCosting(inputs: CostingInputs): CostingResults {
  const totalFixedCosts =
    inputs.salaries + inputs.officeRent + inputs.utilities +
    inputs.softwareSubscriptions + inputs.administrativeCosts + inputs.otherFixedCosts;

  const totalVariableCostPerUnit =
    inputs.rawMaterial + inputs.packaging + inputs.shippingLogistics +
    inputs.salesCommission + inputs.paymentGatewayFees + inputs.otherVariableCosts;

  const totalVariableCost = totalVariableCostPerUnit * inputs.unitsSold;
  const totalMonthlyCost = totalFixedCosts + totalVariableCost;

  return {
    totalFixedCosts: Math.round(totalFixedCosts),
    totalVariableCostPerUnit: Math.round(totalVariableCostPerUnit * 100) / 100,
    totalVariableCost: Math.round(totalVariableCost),
    totalMonthlyCost: Math.round(totalMonthlyCost),
    unitsSold: inputs.unitsSold,
  };
}
