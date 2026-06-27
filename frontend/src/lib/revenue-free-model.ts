// ========================================================
// REVENUE MODEL (FREE) – FULL EXCEL MATCH
// Interlinked: supplies pricePerUnit + monthlyUnitsSold
// to Costing & Break-even models
// ========================================================

export interface RevenueInputs {
  pricePerUnit: number;
  customersPerMonth: number;
  unitsPerCustomer: number;
  purchaseFrequencyPerYear: number;
  customerLifetimeMonths: number;
}

export interface RevenueResults {
  pricePerUnit: number;
  monthlyPurchaseRate: number;
  monthlyUnitsSold: number;
  monthlyRevenue: number;
  annualRevenue: number;
  customerLifetimeMonths: number;
}

export const REVENUE_FIELDS: { key: keyof RevenueInputs; label: string; prefix: string; step: string }[] = [
  { key: "pricePerUnit", label: "Price Per Unit", prefix: "₹", step: "0.01" },
  { key: "customersPerMonth", label: "Customers Per Month", prefix: "#", step: "1" },
  { key: "unitsPerCustomer", label: "Units Per Customer", prefix: "#", step: "1" },
  { key: "purchaseFrequencyPerYear", label: "Purchase Frequency / Year", prefix: "#", step: "1" },
  { key: "customerLifetimeMonths", label: "Customer Lifetime (Months)", prefix: "#", step: "1" },
];

export function createEmptyRevenueInputs(): RevenueInputs {
  return {
    pricePerUnit: 0,
    customersPerMonth: 0,
    unitsPerCustomer: 0,
    purchaseFrequencyPerYear: 0,
    customerLifetimeMonths: 12,
  };
}

export function calculateRevenue(inputs: RevenueInputs): RevenueResults {
  const {
    pricePerUnit, customersPerMonth, unitsPerCustomer,
    purchaseFrequencyPerYear, customerLifetimeMonths,
  } = inputs;

  const monthlyPurchaseRate = purchaseFrequencyPerYear / 12;
  const monthlyUnitsSold = customersPerMonth * unitsPerCustomer;
  const monthlyRevenue = monthlyUnitsSold * pricePerUnit;
  const annualRevenue = monthlyRevenue * 12;

  return {
    pricePerUnit,
    monthlyPurchaseRate,
    monthlyUnitsSold,
    monthlyRevenue: Math.round(monthlyRevenue),
    annualRevenue: Math.round(annualRevenue),
    customerLifetimeMonths,
  };
}
