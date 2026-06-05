import type { HintDef } from "@/lib/field-hints";
import { standardHint } from "@/lib/standard-model-hints";

function tip(what: string, why = "This drives the calculation in this model."): HintDef {
  return { what, why };
}

/** Founder-friendly tooltips for investor-grade models (inputs + results) */
export const INVESTOR_MODEL_HINTS: Record<string, HintDef> = {
  // ── Unit Economics Advanced (inputs) ──
  "Beginning Customers": tip(
    "Number of active paying customers at the start of the month.",
    "Starting cohort size for growth, churn, and MRR calculations."
  ),
  "New Customers Acquired": tip(
    "New paying customers acquired during the month.",
    "Combined with marketing spend to calculate CAC."
  ),
  "Customers Churned": tip(
    "Customers who stopped paying or cancelled during the month.",
    "Used to calculate churn rate, retention, and churned MRR."
  ),
  "ARPU (Monthly)": tip(
    "Average Revenue Per User/Customer per month.",
    "Multiplied by customer count to get gross revenue and MRR."
  ),
  "Variable Cost per Customer": tip(
    "Monthly cost that increases with every customer — hosting, support, payment fees, etc.",
    "Scaled by customer count to get total variable cost."
  ),
  "Marketing Spend": tip(
    "Total money spent on acquiring new customers — ads, sales, promotions.",
    "Divided by new customers to calculate CAC."
  ),
  "Fixed Costs": tip(
    "Monthly costs that do not change with customer count — salaries, rent, software.",
    "Subtracted from contribution margin to reach profitability."
  ),

  // camelCase aliases
  beginningCustomers: tip(
    "Number of active paying customers at the start of the month.",
    "Starting cohort size for growth, churn, and MRR calculations."
  ),
  newCustomers: tip(
    "New paying customers acquired during the month.",
    "Combined with marketing spend to calculate CAC."
  ),
  customersChurned: tip(
    "Customers who stopped paying or cancelled during the month.",
    "Used to calculate churn rate, retention, and churned MRR."
  ),
  arpu: tip(
    "Average Revenue Per User/Customer per month.",
    "Multiplied by customer count to get gross revenue and MRR."
  ),
  variableCostPerCustomer: tip(
    "Monthly cost that increases with every customer — hosting, support, payment fees, etc.",
    "Scaled by customer count to get total variable cost."
  ),
  marketingSpend: tip(
    "Total money spent on acquiring new customers — ads, sales, promotions.",
    "Divided by new customers to calculate CAC."
  ),
  fixedCosts: tip(
    "Monthly costs that do not change with customer count — salaries, rent, software.",
    "Subtracted from contribution margin to reach profitability."
  ),

  // ── Unit Economics Advanced (results) ──
  "Ending Customers": tip(
    "Total active customers at the end of the month.",
    "Beginning customers + new − churned."
  ),
  "Gross Revenue": tip(
    "Total revenue generated in the month.",
    "ARPU × average active customers (investor-grade revenue tracking)."
  ),
  "Contribution Margin": tip(
    "Revenue left after variable costs.",
    "Money available to cover fixed costs and profit."
  ),
  "Contribution Margin %": tip(
    "What percentage of revenue is left after variable costs.",
    "Higher % = more scalable unit economics."
  ),
  "Churn Rate": tip(
    "Percentage of customers lost during the month.",
    "Lower churn = longer customer lifetime and higher LTV."
  ),
  "Retention %": tip(
    "Percentage of customers retained (100% − churn rate).",
    "Key SaaS health metric — investors target 90%+ monthly retention."
  ),
  "LTV/CAC Ratio": tip(
    "LTV divided by CAC.",
    "If LTV is significantly higher than CAC, your unit economics are healthy."
  ),
  "CAC Payback (Months)": tip(
    "How many months it takes to recover the cost of acquiring a customer.",
    "CAC ÷ ARPU — under 12 months is investor-friendly."
  ),
  "Beginning MRR": tip(
    "Monthly Recurring Revenue at the start of the month.",
    "Baseline for MRR growth and retention analysis."
  ),
  "New MRR": tip(
    "MRR added from new customers acquired this month.",
    "Growth component of ending MRR."
  ),
  "Churned MRR": tip(
    "MRR lost from customers who churned this month.",
    "Drag on MRR growth — lower is better."
  ),
  "Ending MRR": tip(
    "Monthly Recurring Revenue at month end.",
    "Key SaaS metric — tracks predictable revenue base."
  ),
  "MRR Growth %": tip(
    "Percentage growth in Monthly Recurring Revenue.",
    "Sustained MRR growth is a core investor metric."
  ),
  "Gross Revenue Retention (GRR)": tip(
    "Gross Revenue Retention — how much revenue you kept from existing customers (excluding expansion).",
    "100% = no revenue lost from churn/downgrades."
  ),
  "Net Revenue Retention (NRR)": tip(
    "Net Revenue Retention — revenue retained plus expansion from existing customers.",
    "120%+ NRR is considered best-in-class for SaaS."
  ),
  "Rule of 40": tip(
    "Growth % + profit margin %.",
    "Quick benchmark for SaaS business health — 40+ is good."
  ),
  "Revenue Growth %": tip(
    "Month-over-month revenue growth rate.",
    "Combined with margin in Rule of 40 score."
  ),
  "Customer Growth %": tip(
    "Month-over-month customer count growth.",
    "Shows whether your customer base is expanding."
  ),
  "RAG Status": tip(
    "Overall unit economics health — GREEN, AMBER, or RED.",
    "Based on LTV/CAC, churn, CAC payback, and Rule of 40."
  ),

  // Annual summary keys
  totalRevenue: tip("Total revenue across all months in the period.", "Top-line performance for the full year."),
  totalContributionMargin: tip("Total contribution margin across all months.", "Cash generated before fixed costs."),
  endingCustomers: tip("Active customers at the end of the final month.", "Current customer base size."),
  endingMRR: tip("MRR at the end of the final month.", "Current recurring revenue run rate."),
  avgCAC: tip("Average Customer Acquisition Cost across the period.", "Lower average CAC improves unit economics."),
  avgLTV: tip("Average Lifetime Value across the period.", "Higher LTV relative to CAC = healthier business."),
  avgLTVCAC: tip("Average LTV/CAC ratio across the period.", "3×+ average is investor-grade healthy."),
  avgChurnRate: tip("Average monthly churn rate across the period.", "Lower average churn = better retention."),
  avgGRR: tip("Average Gross Revenue Retention across the period.", "Measures revenue kept from existing customers."),
  avgNRR: tip("Average Net Revenue Retention across the period.", "Includes expansion revenue from existing customers."),
  avgContributionMargin: tip("Average contribution margin % across the period.", "Shows scalable unit economics."),
  avgRuleOf40: tip("Average Rule of 40 score across the period.", "40%+ average indicates balanced growth and profitability."),

  // camelCase result aliases
  endingCustomersResult: tip("Total active customers at the end of the month.", "Beginning customers + new − churned."),
  grossRevenue: tip("Total revenue generated in the month.", "From Income Statement or ARPU × customers."),
  contributionMarginPct: tip("What percentage of revenue is left after variable costs.", "Higher % = more scalable unit economics."),
  ltvCacRatio: tip("If LTV is significantly higher than CAC, your unit economics are healthy.", "Investors look for 3×+ as a benchmark."),
  cacPaybackMonths: tip("How many months it takes to recover the cost of acquiring a customer.", "Under 12 months is investor-friendly."),
  mrrGrowthPct: tip("Percentage growth in Monthly Recurring Revenue.", "Sustained MRR growth is a core investor metric."),
  grr: tip("Gross Revenue Retention — revenue kept from existing customers excluding expansion.", "100% = no revenue lost from churn."),
  nrr: tip("Net Revenue Retention — revenue retained plus expansion from existing customers.", "120%+ is best-in-class for SaaS."),

  // ── Funding Model (investor refresh) ──
  revenue: tip(
    "Total revenue for the month (from Income Statement).",
    "Starting point for contribution and cash flow analysis."
  ),
  variableCost: tip(
    "Costs that increase with sales (from Common Utility / Income Statement).",
    "Subtracted from revenue along with COGS."
  ),
  fixedCost: tip(
    "Fixed monthly costs — salaries, rent, software, etc.",
    "Subtracted from contribution to get EBITDA."
  ),
  inventory: tip(
    "Value of stock/inventory you are holding.",
    "Part of working capital tied up in goods."
  ),
  receivables: tip(
    "Money customers owe you (Trade Receivables).",
    "Increase means more cash is waiting to be collected."
  ),
  payables: tip(
    "Money you owe suppliers (Trade Payables).",
    "Offsets working capital need."
  ),
  changeInWC: tip(
    "Increase or decrease in working capital (cash tied up in operations).",
    "Positive change reduces free cash flow."
  ),
  capex: tip(
    "Capital expenditure — money spent on long-term assets.",
    "Cash outflow for equipment, technology, or facilities."
  ),
  netCashFlow: tip(
    "Actual cash generated or burned in the month.",
    "EBITDA minus change in WC minus CapEx."
  ),
  cumulativeCash: tip(
    "Running cash balance after all inflows and outflows.",
    "Shows when you hit your lowest cash point."
  ),
  "Net Cash Flow": tip(
    "Actual cash generated or burned in the month.",
    "EBITDA minus change in WC minus CapEx."
  ),
  "Cumulative Cash": tip(
    "Running cash balance after all inflows and outflows.",
    "Shows when you hit your lowest cash point."
  ),
  totalFundingRequired: tip(
    "How much money you need to raise (including contingency buffer).",
    "Max cash deficit + safety margin — your fundraising target."
  ),
  fundingRequired: tip(
    "Funding needed to cover the maximum cash deficit.",
    "Before contingency buffer is added."
  ),
  maxCashDeficit: tip(
    "Lowest cumulative cash point during the analysis period.",
    "The cash gap that funding must cover."
  ),
  contingency: tip(
    "Safety buffer added on top of the funding requirement.",
    "Typically 10–20% to cover unexpected costs or delays."
  ),

  // ── Burn & Runway (investor refresh) ──
  "Fixed Expenses": tip(
    "Costs that stay the same every month regardless of sales.",
    "Must be covered even at zero revenue — key driver of gross burn."
  ),
  "Variable Expenses": tip(
    "Costs that increase when you sell more.",
    "Scales with revenue volume."
  ),
  "Recurring Revenue": tip(
    "Revenue expected to repeat next month — subscriptions, retainers.",
    "Higher recurring share = more predictable and investor-friendly revenue."
  ),
  "Gross Burn": tip(
    "Total cash going out every month before revenue.",
    "Total expenses — your full monthly spend rate."
  ),
  "Net Burn": tip(
    "Actual monthly cash loss (Total Expenses − Total Revenue).",
    "The number that determines how fast you deplete cash."
  ),
  "Runway (months)": tip(
    "How many months you can survive with current cash at current burn rate.",
    "Cumulative cash ÷ average net burn."
  ),
  runwayMonths: tip(
    "How many months you can survive with current cash at current burn rate.",
    "Above 12 months = healthy; below 6 months = critical."
  ),
  "Recurring Revenue ratio": tip(
    "% of revenue that is predictable and repeats.",
    "Higher = more stable, investor-friendly revenue quality."
  ),
  recurringRevenueRatio: tip(
    "% of revenue that is predictable and repeats.",
    "Higher = more stable, investor-friendly revenue quality."
  ),
  "CLASSIFICATION": tip(
    "GREEN = Healthy | AMBER = Warning | RED = Danger zone.",
    "Based on runway length, burn rate, and recurring revenue quality."
  ),
  classification: tip(
    "GREEN = Healthy | AMBER = Warning | RED = Danger zone.",
    "Based on runway length, burn rate, and recurring revenue quality."
  ),
  "Avg Net Burn (to date)": tip(
    "Average net burn across all months entered so far.",
    "Used for a smoother runway estimate."
  ),
  "Total Expenses": tip(
    "Sum of fixed and variable expenses for the month.",
    "Compared to revenue to get net profit/loss and burn."
  ),
  "Total Revenue": tip(
    "Total revenue for the month including recurring and miscellaneous.",
    "Subtracted from expenses to calculate net burn."
  ),
  "Net Profit/Loss": tip(
    "Revenue minus total expenses for the month.",
    "Positive = cash-flow positive; negative = burning cash."
  ),
};

export function investorHint(key: string): HintDef | undefined {
  return INVESTOR_MODEL_HINTS[key] ?? standardHint(key);
}
