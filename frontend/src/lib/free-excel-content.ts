/** Excel-exact copy from FINMECH-UPGRADED/1.Free Models — do not paraphrase. */

export const REVENUE_EXACT = {
  inputs: {
    pricePerUnit: "Selling price per product/service unit",
    customersPerMonth: "Number of customers acquired monthly",
    unitsPerCustomer: "Average units purchased per customer",
    purchaseFrequencyPerYear: "How many times a customer buys annually",
    customerLifetimeMonths: "How much is one customer worth to me over time?",
  },
  metrics: {
    monthlyPurchaseRate: {
      formula: "Purchase Frequency (per year) / 12",
      meaning: "How frequently does a typical customer buy from me every month?",
    },
    monthlyUnitsSold: {
      formula: "Customers × Units per Customer",
      meaning: "How many items did we actually sell this month?",
    },
    monthlyRevenue: {
      formula: "Units Sold × Price",
      meaning: "How much money did we earn from customers this month?",
    },
    annualRevenue: {
      formula: "Monthly Revenue × 12",
      meaning: "How much did the business earn in an entire year?",
    },
  },
} as const;

export const COSTING_EXACT = {
  fixedIntro: "These are costs that do not change with sales volume.",
  variableIntro:
    "These costs may vary from time to time both qualitatively and quantitively",
  fixedItems: {
    salaries: "Staff salaries",
    officeRent: "Office or factory rent",
    utilities: "Electricity, internet bills",
    softwareSubscriptions: "SaaS Tools like Finmech subscription",
    administrativeCosts: "Accounting, Legal costs",
    otherFixedCosts: "Miscll.",
  },
  variableItems: {
    rawMaterial: "Production Cost",
    packaging: "Boxes, wrapping",
    shippingLogistics: "Delivery costs",
    salesCommission: "Affiliate Commission costs",
    paymentGatewayFees: "Transaction fees",
    otherVariableCosts: "Miscll.",
  },
  simulation: {
    unitsSold: { formula: "Input" },
    totalVariableCost: { formula: "Units × Variable Cost per Unit" },
    totalMonthlyCost: { formula: "Fixed Cost + Variable Cost" },
  },
} as const;

export const BREAK_EVEN_FREE_EXACT = {
  pricePerUnit: {
    question: "How can we increase price?",
    meaning:
      "The selling price charged to the customer for one unit of the product or service. E.g price of one product / one subscription",
  },
  variableCostPerUnit: {
    question: "How can we reduce Variable Cost?",
    meaning:
      "The cost that increases directly with each unit sold. These costs occur only when you produce or sell a unit. E.g. cost of manufacturing one product / unit",
  },
  fixedCostMonthly: {
    question: "How can we control Fixed Cost?",
    meaning:
      "Costs that do not change with the number of units sold. They exist even if sales are zero. E.g Salaries, rent etc",
  },
  contributionPerUnit: {
    formula: "Price per unit - Variable Cost",
    meaning:
      "This is the amount each sale contributes toward covering fixed costs and profit. Every time you sell one unit, you recover ₹1000 of fixed costs.",
  },
  breakEvenUnits: {
    formula: "Fixed Cost / Contirbution Per Unit",
    meaning: "Number of units you must sell to cover all fixed costs.",
  },
  breakEvenRevenue: {
    formula: "Break-even units x Price per unit",
    meaning: "The business must generate ₹4.5 lakh revenue to cover all costs.",
  },
} as const;

/** Excel CHECKLIST column G formula (rows 4–27). */
export function checklistAdvisoryComment(rawScore: number): string {
  if (rawScore === 2) return "Strong control in place";
  if (rawScore === 1) return "Needs improvement ; partially addressed";
  return "High risk - immediate action required";
}

/** Excel CHECKLIST I7 advisory summary formula. */
export function checklistStatusAdvisory(status: string): string {
  if (status === "FINANCE-READY") {
    return "Focus on scaling, governance and investor readiness";
  }
  if (status === "GROWTH RISK") {
    return "Immediate focus needed on cash flow, unit economics, and controls";
  }
  return "Urgent corrective action required: cash, compliance and cost discipline";
}

export const RAG_COLORS = {
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
} as const;

export function ragForChecklistScore(rawScore: number): keyof typeof RAG_COLORS {
  if (rawScore === 2) return "green";
  if (rawScore === 1) return "amber";
  return "red";
}
