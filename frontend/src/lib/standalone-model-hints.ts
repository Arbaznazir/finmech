import { FIELD_HINTS, type HintDef } from "@/lib/field-hints";

function tip(what: string, why = "This drives the calculation in this model."): HintDef {
  return { what, why };
}

/** Founder-friendly tooltips for standalone-tier models (inputs + results) */
export const STANDALONE_MODEL_HINTS: Record<string, HintDef> = {
  // ── Income Statement (inputs) ──
  "Operational Revenue (Recurring Receipts)": tip(
    "Recurring revenue from subscriptions, retainers, or repeat customers.",
    "Predictable income that investors value highly."
  ),
  "Operational Revenue (Variable revenue including interest income)": tip(
    "One-time or variable revenue, including interest income.",
    "Helps separate steady income from lumpy or one-off sales."
  ),
  "COGS (Direct Costs)": tip(
    "Direct costs to deliver your product or service — raw materials, manufacturing, shipping.",
    "Subtracted from revenue to calculate gross profit."
  ),
  "Freight & Logistics": tip(
    "Cost of transporting goods to customers or from suppliers.",
    "Part of direct cost — affects your true margin per unit delivered."
  ),
  "Other Variable Costs": tip(
    "Direct costs that scale with volume — contract labour, commissions, subcontracting.",
    "Ensures gross profit reflects all variable production costs."
  ),
  "Salaries & Benefits": tip(
    "Monthly payroll — salaries, PF, ESIC, and employee benefits.",
    "Usually the largest operating expense in the P&L."
  ),
  "Rent & Utilities": tip(
    "Office or factory rent plus electricity, water, internet, and phone.",
    "Fixed overhead that must be covered regardless of sales."
  ),
  "Professional & Legal Fees": tip(
    "Fees paid to CA, lawyers, auditors, and consultants.",
    "Regular compliance and advisory costs for running the business."
  ),
  "Technology & IT Costs": tip(
    "Software subscriptions, cloud hosting, and IT maintenance.",
    "Key cost driver for tech-enabled businesses."
  ),
  "Marketing & Advertising": tip(
    "Spend on ads, content, PR, events, and customer acquisition.",
    "Directly linked to CAC — should drive proportional revenue growth."
  ),
  "Travel": tip(
    "Business travel — flights, hotels, client visits, conferences.",
    "Operating expense that affects EBITDA and burn rate."
  ),
  "Miscll Operating expenses": tip(
    "Miscellaneous operating expenses not captured elsewhere.",
    "Ensures total operating expenses are complete."
  ),
  "Depreciation & Amortization": tip(
    "Non-cash charge for wear-and-tear of fixed and intangible assets.",
    "Reduces EBIT but does not affect cash flow directly."
  ),
  "Interest Expense": tip(
    "Interest paid on business loans and credit facilities.",
    "Reduces profit before tax — signals leverage level."
  ),
  "Other Non-Operating Expenses": tip(
    "Expenses outside core operations — forex losses, penalties, etc.",
    "Separated from operating performance in the P&L."
  ),
  "Tax Expense": tip(
    "Income tax provision for the period.",
    "Final deduction before arriving at net profit (PAT)."
  ),

  // ── Income Statement (results) ──
  "Gross Revenue": tip("Total revenue from recurring and variable sources.", "Top-line number before any costs are deducted."),
  "Total of COGS": tip("Sum of all direct costs — COGS, freight, and other variable costs.", "Deducted from revenue to get gross profit."),
  "Gross Profit": tip("Revenue left after direct costs. Core profitability before overhead.", "Shows how efficiently you deliver your product."),
  "Gross Margin %": tip("Gross profit as a percentage of revenue.", "Higher margin = more room to cover fixed costs and profit."),
  "Total Operating Expenses": tip("Sum of salaries, rent, marketing, and all operating costs.", "Must be covered after gross profit to reach EBITDA."),
  "EBITDA": tip("Earnings before interest, tax, depreciation and amortisation.", "Best measure of operating performance and cash-generating ability."),
  "EBITDA Margin %": tip("EBITDA as a percentage of revenue.", "Shows operating efficiency before financing and tax effects."),
  "EBIT": tip("Operating profit after depreciation.", "Shows core business profitability on an accrual basis."),
  "PBT": tip("Profit before tax.", "Important for tax planning and investor reporting."),
  "Net Profit": tip("Net profit after tax (PAT). The real bottom line for owners.", "What remains for reinvestment or distribution."),
  "Net Margin %": tip("Net profit as a percentage of revenue.", "Ultimate profitability measure after all costs and tax."),

  // ── Balance Sheet (results) ──
  "Working Capital": tip(
    "Short-term financial cushion = current assets minus current liabilities.",
    "Positive working capital means healthy day-to-day operations."
  ),
  "Current Ratio": tip(
    "Current assets divided by current liabilities.",
    "Can the business pay short-term obligations with current assets?"
  ),
  "Quick Ratio": tip(
    "Liquid assets (excluding inventory) divided by current liabilities.",
    "Can the business pay immediate obligations without selling inventory?"
  ),
  "Debt/Equity Ratio": tip(
    "Total liabilities divided by total equity.",
    "How much the business is financed by debt vs owners' capital."
  ),
  "Proprietary Ratio": tip(
    "Shareholders' funds as a proportion of total assets.",
    "Higher ratio = less reliance on external debt."
  ),
  "BALANCE CHECK": tip(
    "Difference between total assets and total equity plus liabilities.",
    "Should be zero — a non-zero value means the balance sheet doesn't balance."
  ),
  "TOTAL ASSETS": tip("Sum of all non-current and current assets.", "Everything the business owns."),
  "Total Equity": tip("Owners' capital plus retained earnings.", "Net worth belonging to shareholders."),
  "TOTAL LIABILITIES": tip("Total equity plus all liabilities.", "Must equal total assets."),

  // ── Burn & Runway (inputs) ──
  "Fixed Expenses": tip(
    "Costs that stay the same every month — salaries, rent, software.",
    "Must be covered regardless of revenue level."
  ),
  "Variable Expenses": tip(
    "Costs that increase when you sell more — raw material, shipping, commission.",
    "Scales with sales volume."
  ),
  "Recurring Revenue": tip(
    "Revenue expected to repeat next month — subscriptions, retainers.",
    "Predictable income that improves runway calculations."
  ),
  "Miscll. revenue": tip(
    "One-time or non-recurring revenue for the month.",
    "Added to recurring revenue for total monthly revenue."
  ),
  "Opening Cash Balance": tip(
    "Cash in the bank at the start of the tracking period.",
    "Starting point for cumulative cash and runway calculations."
  ),

  // ── Burn & Runway (results) ──
  "Gross Burn": tip("Total cash going out every month before revenue.", "Shows your full monthly spend rate."),
  "Net Burn": tip("Actual cash loss per month after revenue.", "The number that determines how fast you deplete cash."),
  "Runway (months)": tip(
    "How many months you can survive at the current net burn rate.",
    "Cumulative cash divided by average net burn."
  ),
  "CLASSIFICATION": tip(
    "GREEN = Healthy | AMBER = Warning | RED = Danger zone.",
    "Based on runway length and profitability trend."
  ),
  "Cumulative Cash": tip("Running cash balance after each month's net profit or loss.", "Tracks whether you are building or depleting cash."),
  "Avg Net Burn (to date)": tip("Average monthly net burn across all months entered.", "Used for a smoother runway estimate."),

  // ── Funding Model (inputs + results) ──
  "Revenue": tip("Total revenue for the month.", "Starting point for contribution and cash flow."),
  "Cost of Goods Sold (COGS)": tip(
    "Cost of Goods Sold — direct costs to deliver your product or service.",
    "First deduction from revenue."
  ),
  "Variable Cost": tip(
    "Costs that increase with sales — marketing, commission, payment gateway, etc.",
    "Subtracted along with COGS to get contribution."
  ),
  "Fixed Cost": tip(
    "Costs that stay the same every month — salaries, rent, software.",
    "Subtracted from contribution to get EBITDA."
  ),
  "Inventory": tip("Value of stock held at month end.", "Part of working capital tied up in goods."),
  "Trade Receivables": tip("Money owed by customers (debtors).", "Cash not yet collected — increases working capital need."),
  "Trade Payables": tip("Money owed to suppliers (creditors).", "Offsets working capital — you haven't paid yet."),
  "CapEx": tip(
    "Capital expenditure — buying assets, equipment, or technology.",
    "Cash outflow that doesn't appear in the P&L immediately."
  ),
  "Change in WC": tip(
    "Increase or decrease in money tied up in inventory + receivables − payables.",
    "Positive change means more cash is locked in the business."
  ),
  "Opening Cash": tip("Cash and bank balance at the start of the funding analysis.", "Determines runway before new funding arrives."),
  "contingencyPct": tip("Buffer percentage added on top of the max cash deficit.", "Covers unexpected costs or delays — typically 10–20%."),
  "Contribution": tip("Revenue minus COGS and variable costs.", "Cash generated before fixed costs and working capital."),
  "Net Cash Flow": tip("EBITDA minus change in WC minus CapEx.", "Actual cash generated or consumed in the month."),
  "maxCashDeficit": tip("Lowest cumulative cash point (if negative).", "The cash gap you need to fund."),
  "fundingRequired": tip("Maximum cash deficit before contingency.", "Minimum funding to avoid running out of cash."),
  "contingency": tip("Buffer added on top of the max deficit.", "Safety margin for unforeseen expenses."),
  "totalFundingRequired": tip(
    "How much money you need to raise or arrange to cover the cash gap plus buffer.",
    "Max deficit + contingency — your fundraising target."
  ),

  // ── Business Viability Dashboard ──
  averagePricePerUnit: tip(
    "Average selling price per unit or per customer per month.",
    "Multiplied by units sold to get total revenue."
  ),
  variableCostPerUnit: tip(
    "Direct cost to deliver one unit or serve one customer.",
    "Subtracted from price to get contribution per unit."
  ),
  monthlyFixedCosts: tip(
    "Costs that don't change with sales volume — salaries, rent, software, etc.",
    "Must be covered by total contribution to reach profit."
  ),
  unitsSoldPerMonth: tip(
    "Number of units or customers served per month.",
    "Drives total revenue and variable cost."
  ),
  contributionPerUnit: tip(
    "How much each sale contributes toward covering fixed costs and profit.",
    "Price minus variable cost per unit."
  ),
  contributionMarginPct: tip(
    "Contribution per unit as a percentage of price.",
    "Higher margin = fewer units needed to break even."
  ),
  totalRevenue: tip("Price per unit × units sold per month.", "Top-line sales for the period."),
  totalVariableCost: tip("Variable cost per unit × units sold.", "Direct costs that scale with volume."),
  netProfitLoss: tip("Total contribution minus fixed costs.", "Positive = profitable; negative = loss-making."),
  netProfitMarginPct: tip("Net profit or loss as a percentage of revenue.", "Shows overall profitability at current volume."),
  breakEvenUnits: tip(
    "Minimum number of units you must sell every month to cover all costs.",
    "Fixed costs ÷ contribution per unit."
  ),
  breakEvenRevenue: tip(
    "Minimum revenue needed to cover all fixed and variable costs.",
    "Break-even units × price per unit."
  ),
  marginOfSafetyPct: tip(
    "How much sales can drop before you start losing money.",
    "Higher margin of safety = more buffer against revenue decline."
  ),
  breakEvenUtilisationPct: tip(
    "Break-even units as a percentage of current units sold.",
    "Below 80% is healthy — you have room before hitting break-even."
  ),

  // ── Unit Economics (inputs) ──
  "Sales Revenue": tip(
    "Total revenue earned from all customers in the month.",
    "Divided by active customers to get ARPU."
  ),
  "Marketing Spend": tip(
    "Total money spent on acquiring new customers — ads, campaigns, etc.",
    "Divided by new customers to get CAC."
  ),
  "Customers at the beginning": tip(
    "Active customer count at the start of the month.",
    "Starting point for growth and churn calculations."
  ),
  "New Customers": tip(
    "Customers acquired during the month.",
    "Used with marketing spend to calculate CAC."
  ),
  "Churned Customers": tip(
    "Customers who stopped using your product or service this month.",
    "Used to calculate churn rate and LTV."
  ),

  // ── Unit Economics (results) ──
  "CAC": tip(
    "Customer Acquisition Cost — how much it costs to get one new customer.",
    "Marketing spend ÷ new customers acquired."
  ),
  "LTV": tip(
    "Lifetime Value — total revenue you expect from one customer over their lifetime.",
    "Higher LTV relative to CAC means healthy unit economics."
  ),
  "ARPU": tip(
    "Average Revenue Per User — monthly revenue per active customer.",
    "Sales revenue ÷ average active customers."
  ),
  "Churn Rate %": tip(
    "Percentage of customers who stop using your product every month.",
    "Lower churn = longer customer lifetime and higher LTV."
  ),
  "CAC Payback Period (Months)": tip(
    "How many months it takes to recover the cost of acquiring a customer.",
    "CAC ÷ ARPU — shorter is better."
  ),
  "Growth Rate %": tip(
    "Month-on-month customer growth rate.",
    "Shows whether your customer base is expanding."
  ),
  "Total Customers": tip("Customers at beginning + new − churned.", "End-of-month active customer count."),
  "Total Active Customers (Monthly)": tip(
    "Average of beginning and ending customers for the month.",
    "Used as the denominator for ARPU."
  ),

  // ── Pitch Deck KPIs (inputs) ──
  grossMonthlyRevenue: tip("Total gross revenue for the month.", "Starting point for margin and burn calculations."),
  recurringRevenue: tip(
    "Revenue that is expected to repeat next month — subscriptions, retainers.",
    "Higher recurring share = more predictable business."
  ),
  cogs: tip("Direct costs to deliver your product or service.", "Subtracted from revenue for gross margin."),
  monthlyMarketingSpend: tip(
    "Total spend on customer acquisition — ads, campaigns, etc.",
    "Divided by new customers to get CAC."
  ),
  variableCosts: tip("All variable operating costs for the month.", "Used in contribution margin calculation."),
  fixedCosts: tip("Monthly fixed costs — salaries, rent, software.", "Part of total burn calculation."),
  customersAddedMonthly: tip("New customers acquired this month.", "Denominator for CAC calculation."),
  activeCustomers: tip("Total active customers at month end.", "Denominator for ARPU calculation."),
  arpu: tip("Average revenue per customer per month.", "Multiplied by lifetime months to estimate LTV."),
  averageCustomerLifetime: tip(
    "Average number of months a customer stays with you.",
    "Used to estimate customer lifetime value."
  ),
  cashAvailable: tip("Cash in the bank today.", "Divided by net burn to calculate runway."),
  monthlyDebt: tip("Monthly debt repayment obligation.", "Affects net cash position and runway."),

  // ── Pitch Deck KPIs (results) ──
  grossMargin: tip("Revenue left after direct costs (COGS). Higher is better.", "Key metric investors look at first."),
  contributionMarginAfterCAC: tip(
    "How much each rupee of revenue contributes after variable costs.",
    "Shows operating leverage before fixed costs."
  ),
  cac: tip(
    "Customer Acquisition Cost — how much you spend to get one new customer.",
    "Should be recoverable within 12–18 months via LTV."
  ),
  ltv: tip(
    "Lifetime Value — total revenue expected from one customer over their lifetime.",
    "ARPU × average customer lifetime in months."
  ),
  ltvCacRatio: tip(
    "LTV divided by CAC.",
    "If LTV is 3×+ higher than CAC, your unit economics are healthy."
  ),
  cacPaybackMonths: tip(
    "How many months it takes to recover the cost of acquiring a customer.",
    "CAC ÷ ARPU — investors prefer under 12 months."
  ),
  netBurn: tip(
    "Actual monthly cash loss after all revenue and expenses.",
    "Negative net burn means you are cash-flow positive."
  ),
  runwayMonths: tip(
    "How many months you can survive with current cash at current burn rate.",
    "Cash available ÷ net burn."
  ),
  burnMultiple: tip(
    "Net burn divided by gross monthly revenue.",
    "Shows how efficiently you convert spend into revenue."
  ),
  recurringRevenueRatio: tip(
    "Percentage of revenue that is predictable and repeats every month.",
    "Higher ratio = more investor-friendly revenue quality."
  ),
  cashEfficiencyRatio: tip(
    "Revenue divided by total costs.",
    "Above 1.0 means revenue exceeds total spend."
  ),

  // ── DCF Valuation (inputs) ──
  baseYearRevenue: tip(
    "Last completed year's actual revenue.",
    "Starting point for the 5-year revenue projection."
  ),
  revenueGrowthY1: tip("Expected revenue growth rate in Year 1.", "Applied to base year revenue."),
  revenueGrowthY2: tip("Expected revenue growth rate in Year 2.", "Compounds on prior year revenue."),
  revenueGrowthY3: tip("Expected revenue growth rate in Year 3.", "Compounds on prior year revenue."),
  revenueGrowthY4: tip("Expected revenue growth rate in Year 4.", "Compounds on prior year revenue."),
  revenueGrowthY5: tip("Expected revenue growth rate in Year 5.", "Final projection year before terminal value."),
  ebitdaMargin: tip(
    "Operating profitability as a percentage of revenue.",
    "Applied each year to projected revenue to get EBITDA."
  ),
  depreciationPctOfRevenue: tip("Depreciation charge as a percentage of revenue.", "Non-cash expense reducing EBIT."),
  capexPctOfRevenue: tip("Capital expenditure as a percentage of revenue.", "Cash outflow reducing free cash flow."),
  workingCapitalPctOfRevenue: tip(
    "Working capital requirement as a percentage of revenue.",
    "Change in WC reduces free cash flow."
  ),
  taxRate: tip("Corporate tax rate applied to EBIT.", "Reduces profit to get NOPAT."),
  riskFreeRate: tip("Return on risk-free government bonds.", "Base component of cost of equity (CAPM)."),
  equityRiskPremium: tip("Extra return investors expect over risk-free rate.", "Multiplied by beta for cost of equity."),
  beta: tip("Measure of stock volatility relative to the market.", "Higher beta = higher cost of equity."),
  costOfDebt: tip("Interest rate on the company's debt.", "Weighted with equity cost to get WACC."),
  marketValueOfEquity: tip("Current market value of shareholders' equity.", "Weight in WACC calculation."),
  marketValueOfDebt: tip(
    "Current market value of outstanding debt.",
    "Used in WACC weighting and deducted from enterprise value to get equity value."
  ),
  terminalGrowthRate: tip(
    "Long-term sustainable growth rate after 5 years, usually 2–4%.",
    "Used to calculate terminal value via Gordon Growth Model."
  ),

  // ── DCF Valuation (results) ──
  costOfEquity: tip("Return required by equity investors (CAPM).", "Risk-free rate + beta × equity risk premium."),
  afterTaxCostOfDebt: tip("Cost of debt after tax shield.", "Interest is tax-deductible, reducing effective cost."),
  wacc: tip(
    "Weighted Average Cost of Capital — the return investors expect.",
    "Discount rate used to present-value future cash flows."
  ),
  enterpriseValue: tip(
    "Total value of the business — equity plus debt.",
    "Sum of discounted FCFF plus terminal value."
  ),
  equityValue: tip(
    "Value belonging to shareholders after deducting debt.",
    "Enterprise value minus net debt."
  ),
  valuePerShare: tip("Equity value divided by total shares outstanding.", "Implied fair price per share."),
  terminalValue: tip(
    "Value of all cash flows beyond the 5-year projection period.",
    "Often 60–80% of total enterprise value."
  ),
  pvOfFCFF: tip("Present value of that year's free cash flow.", "Discounted at WACC back to today."),
  pvOfTerminalValue: tip("Present value of the terminal value.", "Discounted back 5 years at WACC."),
  totalPVOfFCFF: tip("Sum of present values of FCFF for Years 1–5.", "Core component of enterprise value."),

  // ── Cap Table Mechanics ──
  roundName: tip("Name of the funding round — Seed, Series A, etc.", "Identifies each dilution event."),
  preMoney: tip(
    "Company valuation before the new investment is added.",
    "Used to calculate price per share and new shares issued."
  ),
  investment: tip(
    "Amount invested in this round.",
    "Divided by price per share to get new shares issued."
  ),
  preSeed: tip("Pre-money valuation for the Seed round.", "Valuation before Seed investment."),
  invSeed: tip("Investment amount for the Seed round.", "Cash injected at Seed stage."),
  preA: tip("Pre-money valuation for Series A.", "Valuation before Series A investment."),
  invA: tip("Investment amount for Series A.", "Cash injected at Series A."),
  preB: tip("Pre-money valuation for Series B.", "Valuation before Series B investment."),
  invB: tip("Investment amount for Series B.", "Cash injected at Series B."),
  exitVal: tip("Total company value at exit — acquisition or IPO.", "Used to calculate shareholder payouts."),
  exitValue: tip(
    "Total company value at exit — acquisition or IPO price.",
    "Multiplied by ownership % to get each shareholder's payout."
  ),
  shares: tip("Number of equity shares held by this shareholder.", "Ownership % = shares ÷ total shares."),
  pricePerShare: tip("Price paid per share in a funding round.", "Pre-money valuation ÷ existing shares."),
  ownership: tip("Percentage of the company owned by each shareholder.", "Recalculated after each funding round."),
  payout: tip("Cash received by each shareholder at exit.", "Exit value × ownership percentage."),
  postMoney: tip("Company valuation after investment is added.", "Pre-money + investment amount."),
  newShares: tip("Shares issued to new investors in this round.", "Investment ÷ price per share."),
};

export function standaloneHint(key: string | number): HintDef | undefined {
  const k = String(key);
  return STANDALONE_MODEL_HINTS[k] ?? FIELD_HINTS[k];
}
