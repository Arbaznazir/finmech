import type { HintDef } from "@/lib/field-hints";

/** Founder-friendly single-line tooltips for free-tier models */
function tip(what: string, why = "This drives the calculation in this model."): HintDef {
  return { what, why };
}

export const FREE_MODEL_HINTS: Record<string, HintDef> = {
  // ── Revenue Model (inputs) ──
  pricePerUnit: tip(
    "The selling price charged to the customer for one unit of the product or service.",
    "Multiplied by units sold to get monthly and annual revenue."
  ),
  customersPerMonth: tip(
    "Number of new customers you acquire every month.",
    "More customers directly increases units sold and revenue."
  ),
  unitsPerCustomer: tip(
    "Average number of units one customer buys in a single purchase.",
    "Combined with customer count to estimate total monthly units."
  ),
  purchaseFrequencyPerYear: tip(
    "How many times a typical customer buys from you in a year.",
    "Converted to a monthly purchase rate for revenue projection."
  ),
  customerLifetimeMonths: tip(
    "How long one customer stays with you on average, in months.",
    "Useful for estimating long-term customer value and retention."
  ),

  // ── Revenue Model (results) ──
  monthlyPurchaseRate: tip(
    "Average purchases per customer per month (annual frequency ÷ 12).",
    "Shows how often customers buy after spreading yearly frequency across months."
  ),
  monthlyUnitsSold: tip(
    "Total units sold in one month = customers per month × units per customer.",
    "The volume driver behind your monthly revenue."
  ),
  monthlyRevenue: tip(
    "Revenue earned in one month = monthly units sold × price per unit.",
    "Your core top-line number for cash planning and growth tracking."
  ),
  annualRevenue: tip(
    "Total revenue if monthly performance continues for 12 months.",
    "Annualises monthly revenue for year-one planning and comparisons."
  ),

  // ── Costing Model (inputs) ──
  salaries: tip(
    "Monthly salaries of all employees (fixed cost).",
    "Usually the largest fixed cost — must be covered every month regardless of sales."
  ),
  officeRent: tip(
    "Office or factory rent — does not change with sales.",
    "A fixed overhead that affects break-even and monthly burn."
  ),
  utilities: tip(
    "Electricity, water, internet, and other utility bills (fixed).",
    "Recurring overhead that stays roughly stable month to month."
  ),
  softwareSubscriptions: tip(
    "Monthly SaaS and software tools (fixed).",
    "Tools your team needs to operate — counted as fixed operating cost."
  ),
  administrativeCosts: tip(
    "General admin expenses — stationery, petty cash, misc office costs.",
    "Small fixed costs that still add to your monthly overhead."
  ),
  otherFixedCosts: tip(
    "Any other monthly costs that do not vary with units sold.",
    "Captures fixed costs not listed in other categories."
  ),
  rawMaterial: tip(
    "Direct material cost to produce one unit.",
    "Core variable cost — rises with every additional unit you make or sell."
  ),
  packaging: tip(
    "Packaging cost per unit sold.",
    "Part of variable cost that scales with production volume."
  ),
  shippingLogistics: tip(
    "Logistics and delivery cost per unit sold.",
    "Delivery cost that increases as you ship more units."
  ),
  salesCommission: tip(
    "Sales commission or affiliate payout per unit.",
    "Variable selling cost — only paid when a sale happens."
  ),
  paymentGatewayFees: tip(
    "Payment processing fees per unit (e.g. Razorpay, Stripe).",
    "Typically a small % of transaction value, counted per unit here."
  ),
  otherVariableCosts: tip(
    "Any other cost that increases directly with each unit sold.",
    "Ensures your full variable cost per unit is captured."
  ),
  unitsSold: tip(
    "Number of units you plan to sell this month (for simulation).",
    "Used to calculate total variable cost = variable cost per unit × units sold."
  ),

  // ── Costing Model (results) ──
  totalFixedCosts: tip(
    "Sum of all monthly fixed costs — salaries, rent, software, etc.",
    "Must be covered before any profit is possible."
  ),
  totalVariableCostPerUnit: tip(
    "Total direct cost to produce or deliver one unit.",
    "Subtracted from price to understand contribution per sale."
  ),
  totalVariableCost: tip(
    "Total variable cost for the month = variable cost per unit × units sold.",
    "Scales with volume — higher sales mean higher variable spend."
  ),
  totalMonthlyCost: tip(
    "Total operating cost for the month = fixed costs + total variable cost.",
    "Your full monthly cost base before profit."
  ),

  // ── Break-even Model (inputs) ──
  variableCostPerUnit: tip(
    "Cost that increases directly with each unit sold (raw material, shipping, commission, etc.).",
    "Subtracted from price to get contribution margin per unit."
  ),
  fixedCostMonthly: tip(
    "Costs that do not change with sales volume (salaries, rent, software, etc.).",
    "The monthly overhead you must cover before reaching break-even."
  ),
  unitsSoldForProjection: tip(
    "Units you expect to sell in a month — used for profit/loss projection.",
    "Shows profit or loss at your expected sales volume vs break-even."
  ),

  // ── Break-even Model (results) ──
  contributionPerUnit: tip(
    "Amount each sale contributes toward covering fixed costs and profit.",
    "Price minus variable cost — higher contribution means fewer units to break even."
  ),
  breakEvenUnits: tip(
    "Minimum number of units you must sell to cover all costs (no profit, no loss).",
    "Fixed costs ÷ contribution per unit."
  ),
  breakEvenRevenue: tip(
    "Minimum revenue required to cover all fixed and variable costs.",
    "Break-even units × price per unit."
  ),
  profitAtUnits: tip(
    "Estimated profit or loss at your projected unit sales.",
    "Revenue at projected units minus total cost at that volume."
  ),

  // ── Know Your Numbers (results) ──
  readinessPercentage: tip(
    "Your overall financial readiness score as a percentage of the maximum possible.",
    "Higher score = stronger financial discipline and investor readiness."
  ),
  readinessStatus: tip(
    "Readiness band — FINANCE-READY, GROWTH RISK, or SURVIVAL RISK.",
    "Summarises where you stand and how urgently you need to improve."
  ),
  totalScore: tip(
    "Weighted score from all checklist answers (Yes = 2, Partial = 1, No = 0).",
    "Combined with question weights to produce your readiness percentage."
  ),
  maxPossible: tip(
    "Maximum score if every answer were Yes (2 points × question weight).",
    "The denominator used to calculate your readiness percentage."
  ),

  // ── Know Your Numbers (questions by id) ──
  cf_q1: tip("Do you know exactly how much cash is available in the business today?"),
  cf_q2: tip("Do you know your average monthly burn rate?"),
  cf_q3: tip("Do you have enough cash reserve to cover at least 3 months of expenses?"),
  cf_q4: tip("Do you have a 12–24 month financial forecast for cash flow?"),
  rv_q1: tip("Do you track receivables and how long customers take to pay?"),
  rv_q2: tip("Do you know revenue by product, service line, or customer segment?"),
  rv_q3: tip("Do you track month-on-month revenue growth?"),
  co_q1: tip("Have you clearly separated fixed vs variable costs?"),
  co_q2: tip("Do you know your variable cost per unit?"),
  co_q3: tip("Do you review costs regularly to find savings?"),
  ue_q1: tip("Do you know your Gross Margin %?"),
  ue_q2: tip("Do you know your Customer Lifetime Value (LTV)?"),
  ue_q3: tip("Is your LTV/CAC ratio healthy (ideally 3× or higher)?"),
  fc_q1: tip("Do you have a 12–24 month financial forecast?"),
  fc_q2: tip("Do you update your financial model when assumptions change?"),
  fc_q3: tip("Do you scenario-plan best, base, and worst cases?"),
  cm_q1: tip("Are your books updated within the last 30 days?"),
  cm_q2: tip("Are GST, TDS, and income tax filings tracked on a calendar?"),
  cm_q3: tip("Do you have a qualified accountant or CFO supporting you?"),
  fr_q1: tip("Do you have a pitch deck with credible financial projections?"),
  fr_q2: tip("Do you know how much funding you need and exactly how it will be used?"),
  fr_q3: tip("Is your cap table clean, current, and investor-ready?"),
  ct_q1: tip("Are personal and business finances completely separated?"),
  ct_q2: tip("Do you reconcile bank statements every month?"),
  ct_q3: tip("Do you track clear financial KPIs on a dashboard or report?"),
};

export function freeHint(key: string | number): HintDef | undefined {
  return FREE_MODEL_HINTS[String(key)];
}
