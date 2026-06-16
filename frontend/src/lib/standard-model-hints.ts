import type { HintDef } from "@/lib/field-hints";
import { standaloneHint } from "@/lib/standalone-model-hints";

function tip(what: string, why = "This drives the calculation in this model."): HintDef {
  return { what, why };
}

/** Founder-friendly tooltips for standard-tier models (inputs + results) */
export const STANDARD_MODEL_HINTS: Record<string, HintDef> = {
  // ── Common Utility (aliases + hub-specific) ──
  operationalRecurring: tip(
    "Recurring revenue from subscriptions, retainers, or repeat customers.",
    "Most valuable type of revenue — feeds all linked Standard models."
  ),
  operationalVariable: tip(
    "One-time or non-recurring revenue — project fees, interest income, etc.",
    "Separated from recurring revenue for quality-of-earnings analysis."
  ),
  grossRevenue: tip(
    "Total revenue before any deductions.",
    "Top-line number used for growth tracking across all Standard models."
  ),
  totalCOGS: tip(
    "All direct costs to deliver your product or service.",
    "Manufacturing, freight, and other variable production costs combined."
  ),
  totalFixedCosts: tip(
    "Costs that don't change with sales volume — salaries, rent, software, etc.",
    "Pushed to Break-even and Burn models from this hub."
  ),
  totalVariableCosts: tip(
    "Costs that increase directly with revenue — COGS plus variable operating expenses.",
    "Used by linked models for contribution and burn calculations."
  ),
  "Total Fixed Costs": tip(
    "Costs that don't change with sales volume — salaries, rent, software, etc.",
    "Pushed to Break-even and Burn models from this hub."
  ),
  "Total variable Costs": tip(
    "Costs that increase directly with revenue — COGS plus variable operating expenses.",
    "Used by linked models for contribution and burn calculations."
  ),
  "Total OPEX": tip(
    "Total operating expenses — salaries, rent, marketing, and all overhead.",
    "Subtracted from gross profit to reach EBITDA."
  ),

  // ── Business Snapshot (inputs) ──
  monthlyRevenue: tip(
    "Monthly revenue — reflects current sales momentum and market traction.",
    "Healthy, growing revenue shows demand traction and effective go-to-market."
  ),
  revenueGrowth: tip(
    "Month-over-month or quarter-over-quarter growth in revenue.",
    "Healthy growth shows market traction and effective sales execution."
  ),
  grossMargin: tip(
    "Revenue left after direct costs, as a percentage.",
    "Higher margin = stronger unit economics and pricing power."
  ),
  netMargin: tip(
    "Net profit as a percentage of revenue after all expenses and tax.",
    "Shows overall profitability after full cost structure."
  ),
  ebitdaMargin: tip(
    "Operating profitability before interest, tax, and depreciation.",
    "Best measure of core business efficiency."
  ),
  cashBalance: tip(
    "Cash available in the business today.",
    "Starting point for runway and liquidity scoring."
  ),
  burnRate: tip(
    "Net cash loss per month after revenue.",
    "Lower and controlled burn is better — key input for runway."
  ),
  burn: tip(
    "Net cash loss per month.",
    "Lower and controlled burn improves liquidity score."
  ),
  totalCustomers: tip(
    "Total active customers at month end.",
    "Used alongside LTV and CAC for unit economics health."
  ),
  ltv: tip(
    "Lifetime Value — total revenue expected from one customer.",
    "Compared to CAC to assess sustainable growth."
  ),
  cac: tip(
    "Customer Acquisition Cost — spend to acquire one new customer.",
    "Should be recoverable via LTV within 12–18 months."
  ),
  receivables: tip(
    "Money owed by customers (trade debtors).",
    "High receivables tie up cash — affects working capital health."
  ),
  inventory: tip(
    "Value of stock held.",
    "Part of working capital — excess inventory locks up cash."
  ),
  payables: tip(
    "Money owed to suppliers (trade creditors).",
    "Offsets working capital need — longer payables can improve cash flow."
  ),
  changeInWC: tip(
    "Change in working capital — receivables + inventory − payables.",
    "Positive change means more cash is tied up in operations."
  ),
  ccc: tip(
    "Cash Conversion Cycle — days to convert inventory and receivables back into cash.",
    "Lower is better — shows how efficiently you manage working capital."
  ),
  contributionMargin: tip(
    "How much each rupee of revenue contributes after variable costs.",
    "High contribution margin = scalable, efficient business model."
  ),

  // ── Business Snapshot (results) ──
  healthScore: tip(
    "Overall Business Health Index — average of revenue, margin, runway, and LTV/CAC scores.",
    "75%+ = Healthy, 50–74% = Caution, below 50% = Critical."
  ),
  finalScore: tip(
    "Overall Business Health Index (average of all dimension scores).",
    "85+ = Healthy, 50–70 = Needs Improvement, below 50 = At Risk."
  ),
  healthLabel: tip(
    "Health band — HEALTHY, CAUTION, or CRITICAL.",
    "Summarises whether the business can operate sustainably at current metrics."
  ),
  runway: tip(
    "How many months the business can survive with current cash at current burn rate.",
    "Above 6 months = healthy liquidity; below 3 months = critical."
  ),
  ltcCacRatio: tip(
    "LTV divided by CAC.",
    "3×+ is healthy — below 1× means you lose money on each customer acquired."
  ),
  revenueStatus: tip(
    "RAG status for monthly revenue level.",
    "GREEN = strong revenue base; RED = revenue too low to sustain operations."
  ),
  marginStatus: tip(
    "RAG status for gross margin strength.",
    "GREEN = strong pricing power; RED = margins too thin to cover fixed costs."
  ),
  runwayStatus: tip(
    "RAG status based on cash runway months.",
    "GREEN = 12+ months; AMBER = 6–12 months; RED = under 6 months."
  ),
  ltcCacStatus: tip(
    "RAG status for LTV/CAC ratio.",
    "GREEN = 3×+; AMBER = 1–3×; RED = below 1×."
  ),
  growthScore: tip(
    "Score based on revenue growth momentum and consistency.",
    "Higher score = stronger top-line trajectory."
  ),
  profitScore: tip(
    "Score based on gross margin and EBITDA margin strength.",
    "Higher score = healthier unit economics and pricing."
  ),
  liquidityScore: tip(
    "Score based on runway and working capital health.",
    "Higher score = more cash buffer and financial flexibility."
  ),
  contributionScore: tip(
    "Score based on contribution margin strength.",
    "Higher score = each sale contributes more toward fixed costs and profit."
  ),
  insights: tip(
    "Actionable recommendations based on your RAG scores.",
    "Prioritise RED items first — they pose the greatest business risk."
  ),

  // ── Working Capital Movements ──
  "Trade Receivables (Opening)": tip(
    "Receivables balance at the start of the month.",
    "Compared to closing balance to calculate change in receivables."
  ),
  "Trade Receivables (Closing)": tip(
    "Receivables balance at month end — money customers still owe you.",
    "Increase means more cash is tied up waiting for payment."
  ),
  "Inventory (Opening)": tip(
    "Inventory value at the start of the month.",
    "Opening balance for calculating inventory movement."
  ),
  "Inventory (Closing)": tip(
    "Inventory value at month end.",
    "Increase means more cash locked in stock."
  ),
  "Trade Payables (Opening)": tip(
    "Payables balance at the start of the month.",
    "Opening balance for calculating payables movement."
  ),
  "Trade Payables (Closing)": tip(
    "Payables balance at month end — money you owe suppliers.",
    "Increase can temporarily improve cash flow."
  ),
  "Change in Receivables": tip(
    "Increase or decrease in receivables during the month.",
    "Increase reduces cash — customers are paying slower."
  ),
  "Change in Inventory": tip(
    "Increase or decrease in inventory during the month.",
    "Increase uses cash to build stock."
  ),
  "Change in Payables": tip(
    "Increase or decrease in payables during the month.",
    "Increase preserves cash — you are delaying supplier payments."
  ),
  "Working Capital (Closing)": tip(
    "Receivables + inventory − payables at month end.",
    "Money tied up in day-to-day operations."
  ),
  "Change in Working Capital": tip(
    "Net change in working capital for the month.",
    "Positive change means more cash locked in the business."
  ),
  "Cash from Operations": tip(
    "Cash generated from core business operations.",
    "Gross profit adjusted for working capital changes."
  ),
  "Free Cash Flow": tip(
    "Cash from operations minus capital expenditure.",
    "True cash available after maintaining the business."
  ),
  "Days Sales Outstanding (DSO)": tip(
    "Average days to collect payment from customers.",
    "Lower DSO = faster cash collection."
  ),
  "Days Inventory Outstanding (DIO)": tip(
    "Average days inventory sits before being sold.",
    "Lower DIO = faster inventory turnover."
  ),
  "Days Payable Outstanding (DPO)": tip(
    "Average days taken to pay suppliers.",
    "Higher DPO = longer payment terms (more cash retained)."
  ),
  "Cash Conversion Cycle": tip(
    "DSO + DIO − DPO — days to convert investments back into cash.",
    "Lower CCC = healthier working capital management."
  ),

  // ── Standard Break-even (results) ──
  isProfitable: tip(
    "Whether projected unit sales exceed break-even point.",
    "GREEN = profitable at projected volume; RED = still below break-even."
  ),
  revenueAtUnits: tip(
    "Total revenue at your projected unit sales.",
    "Compared to total cost to show profit or loss at that volume."
  ),
  totalCostAtUnits: tip(
    "Total fixed + variable cost at projected unit sales.",
    "Subtracted from revenue to get profit or loss."
  ),
};

export function standardHint(key: string | number): HintDef | undefined {
  const k = String(key);
  return STANDARD_MODEL_HINTS[k] ?? standaloneHint(k);
}
