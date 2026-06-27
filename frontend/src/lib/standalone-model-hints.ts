import { EXCEL_FIELD_HINTS } from "@/lib/excel-model-content";
import { FIELD_HINTS, type HintDef } from "@/lib/field-hints";

function tip(what: string, why = "This drives the calculation in this model."): HintDef {
  return { what, why };
}

/** Founder-friendly tooltips for standalone-tier models (inputs + results) */
export const STANDALONE_MODEL_HINTS: Record<string, HintDef> = {
  // ── Income Statement (inputs) ──
  historicalPeriod: tip(
    "Prior-period baseline (e.g. last financial year or opening month before your forecast).",
    "Lets you compare current months and annual totals against a reference period."
  ),
  "Operational Revenue (Recurring Receipts)": tip(
    "Recurring revenue from subscriptions, retainers, or repeat customers.",
    "Predictable income that investors value highly."
  ),
  "Operational Revenue (Variable revenue including interest income)": tip(
    "One-time or variable revenue, including interest income.",
    "Helps separate steady income from lumpy or one-off sales."
  ),
  "COGS (Direct Costs)": tip(
    "Direct costs to deliver your product or service: raw materials, manufacturing, shipping.",
    "Subtracted from revenue to calculate gross profit."
  ),
  "Freight & Logistics": tip(
    "Cost of transporting goods to customers or from suppliers.",
    "Part of direct cost; affects your true margin per unit delivered."
  ),
  "Other Variable Costs": tip(
    "Direct costs that scale with volume: contract labour, commissions, subcontracting.",
    "Ensures gross profit reflects all variable production costs."
  ),
  "Salaries & Benefits": tip(
    "Monthly payroll: salaries, PF, ESIC, and employee benefits.",
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
    "Should drive proportional revenue growth when acquisition is working."
  ),
  "Travel": tip(
    "Business travel: flights, hotels, client visits, conferences.",
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
    "Reduces profit before tax; signals leverage level."
  ),
  "Other Non-Operating Expenses": tip(
    "Expenses outside core operations: forex losses, penalties, etc.",
    "Separated from operating performance in the P&L."
  ),
  "Tax Expense": tip(
    "Income tax provision for the period.",
    "Final deduction before arriving at net profit (PAT)."
  ),

  // ── Income Statement (results) ──
  "Gross Revenue": tip("Total revenue from recurring and variable sources.", "Top-line number before any costs are deducted."),
  "Total of COGS": tip("Sum of all direct costs: COGS, freight, and other variable costs.", "Deducted from revenue to get gross profit."),
  "Gross Profit": tip("Revenue left after direct costs. Core profitability before overhead.", "Shows how efficiently you deliver your product."),
  "Gross Margin %": tip("Gross profit as a percentage of revenue.", "Higher margin means more room to cover fixed costs and profit."),
  "Total Operating Expenses": tip("Sum of salaries, rent, marketing, and all operating costs.", "Must be covered after gross profit to reach EBITDA."),
  "EBITDA": tip("Earnings before interest, tax, depreciation and amortisation.", "Best measure of operating performance and cash-generating ability."),
  "EBITDA Margin %": tip("EBITDA as a percentage of revenue.", "Shows operating efficiency before financing and tax effects."),
  "EBIT": tip("Operating profit after depreciation (EBITDA minus D&A).", "Shows core business profitability on an accrual basis."),
  "PBT": tip("Profit before tax (EBIT minus interest and non-operating expenses).", "Important for tax planning and investor reporting."),
  "Net Profit": tip("Net profit after tax (PAT). The real bottom line for owners.", "What remains for reinvestment or distribution."),
  "Net Margin %": tip("Net profit as a percentage of revenue.", "Ultimate profitability measure after all costs and tax."),
  "Total Fixed Costs": tip(
    "Costs that stay relatively fixed: salaries, rent, IT, depreciation, interest.",
    "High fixed cost ratio increases break-even pressure."
  ),
  "Total variable Costs": tip(
    "Costs that scale with revenue: COGS, marketing, travel, and misc operating.",
    "Shows how much spend rises with sales volume."
  ),
  fixedCostPct: tip("Fixed costs as a percentage of revenue for the period.", "Lower is better for operating leverage."),
  variableCostPct: tip("Variable costs as a percentage of revenue for the period.", "Tracks scalability of your cost base."),
  revenueGrowthQ2Q: tip("Quarter-on-quarter revenue growth rate.", "Shows momentum between the last two quarters with data."),
  isHealthScore: tip("Composite score based on margins, profitability, and cost structure.", "Higher score means healthier P&L fundamentals."),

  // ── Balance Sheet (inputs) ──
  "Capital Work in Progress": tip("Assets under construction not yet ready for use.", "Moves to PP&E when commissioned."),
  "Investments (Long-Term)": tip("Long-term financial investments held over 12 months.", "Non-current asset; not for day-to-day operations."),
  "Lease Assets (if applicable)": tip("Right-of-use assets under Ind AS 116 lease accounting.", "Matched by lease liabilities on the liability side."),
  "Deferred Tax Assets": tip("Tax benefit expected in future when timing differences reverse.", "Non-current asset from deferred tax accounting."),
  "Intangible Assets": tip("Patents, trademarks, software, and other non-physical assets.", "Amortised over useful life."),
  "Intangible Assets Under Development": tip("Intangible assets being built but not yet in use.", "Capitalised when ready for use."),
  "Short-term Financial Assets": tip("Investments and deposits due within 12 months.", "Part of current assets; adds liquidity."),
  "GST Input/Refunds Receivable": tip("GST input tax credit or refunds due from the government.", "Common current asset for Indian businesses."),
  "Owner's Capital / Share Capital": tip("Face value of shares issued to founders and investors.", "Core equity capital on the balance sheet."),
  "Share Premium": tip("Amount received above face value on share issuance.", "Part of shareholders' funds."),
  "Reserves & Surplus / Retained Earnings": tip("Accumulated profits retained in the business.", "Grows with PAT and shrinks with dividends or losses."),
  "Long-Term Borrowings": tip("Term loans and debt repayable after 12 months.", "Non-current liability; key leverage metric."),
  "Lease Liabilities (Long-Term)": tip("Lease obligations due beyond 12 months.", "Paired with lease assets under Ind AS 116."),
  "Deferred Tax Liabilities": tip("Tax payable in future periods due to timing differences.", "Non-current liability."),
  "Other Non-Current Liabilities": tip("Long-term obligations not classified elsewhere.", "Review for contingent or deferred items."),
  "Short-Term Loans & Borrowings": tip("Working capital loans and overdrafts due within 12 months.", "Current liability; affects liquidity ratios."),
  "Accrued Expenses / Outstanding Expenses": tip("Expenses incurred but not yet paid.", "Current liability; common for salaries and utilities."),
  "Tax/GST Payable": tip("Income tax and GST dues payable to the government.", "Current liability; must be funded from cash."),
  "Current Maturity of Long-term Debt": tip("Principal portion of long-term debt due within 12 months.", "Reclassified from non-current to current."),
  "Employee Payables": tip("Salaries, bonuses, and statutory dues owed to employees.", "Current liability."),
  "Other Current Liabilities": tip("Short-term obligations not captured elsewhere.", "Completes the current liabilities picture."),

  // ── Balance Sheet (results) ──
  "Total Non-Current Assets": tip("Sum of all long-term assets.", "Shows the long-term asset base of the business."),
  "Total Current Assets": tip("Sum of all short-term assets.", "Available to meet near-term obligations."),
  "Total Non-Current Liability": tip("Sum of all long-term liabilities.", "Debt and obligations due beyond 12 months."),
  "Total Current Liability": tip("Sum of all short-term liabilities.", "Obligations due within 12 months."),
  "Working Capital": tip(
    "Short-term financial cushion: current assets minus current liabilities.",
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
    "Higher ratio means less reliance on external debt."
  ),
  "BALANCE CHECK": tip(
    "Difference between total assets and total equity plus liabilities.",
    "Should be zero; a non-zero value means the balance sheet does not balance."
  ),
  "TOTAL ASSETS": tip("Sum of all non-current and current assets.", "Everything the business owns."),
  "Total Equity": tip("Owners' capital plus retained earnings.", "Net worth belonging to shareholders."),
  "TOTAL LIABILITIES": tip("Total equity plus all liabilities.", "Must equal total assets."),
  bsHealthScore: tip("Composite score based on liquidity, leverage, and balance accuracy.", "Higher score means stronger balance sheet health."),

  // ── Burn & Runway (inputs) ──
  "Fixed Expenses": tip(
    "Costs that stay the same every month ,  salaries, rent, software.",
    "Must be covered regardless of revenue level."
  ),
  "Variable Expenses": tip(
    "Costs that increase when you sell more ,  raw material, shipping, commission.",
    "Scales with sales volume."
  ),
  "Recurring Revenue": tip(
    "Revenue expected to repeat next month ,  subscriptions, retainers.",
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
  "Total Expenses": tip(
    "Fixed plus variable expenses paid in cash this month.",
    "Overall cost discipline indicator for the business."
  ),
  "Total Revenue": tip(
    "Recurring plus miscellaneous revenue collected this month.",
    "Top-line cash inflow before expenses are deducted."
  ),
  "Net Profit/Loss": tip(
    "Total revenue minus total expenses for the month.",
    "Positive = cash surplus; negative = cash loss that reduces cumulative cash."
  ),
  "Net Burn Ratio": tip(
    "Net burn divided by total revenue.",
    "Shows how much of revenue is consumed by excess spending ,  lower is healthier."
  ),
  "Recurring Revenue ratio": tip(
    "Recurring revenue as a share of total revenue.",
    "Higher ratio means more predictable, investor-friendly income."
  ),
  "Variable Cost Ratio": tip(
    "Variable expenses divided by total revenue.",
    "Measures scalability ,  lower ratio leaves more room for fixed costs and profit."
  ),
  "Fixed expenses Ratio": tip(
    "Fixed expenses divided by total revenue.",
    "High ratio signals operating leverage pressure and limited cost flexibility."
  ),
  burnHealthScore: tip(
    "Composite score (0, 100) based on runway, cash position, burn trend, and revenue quality.",
    "Higher score = healthier burn management."
  ),
  runwayTrend: tip(
    "Whether runway is improving, stable, declining, or critical vs prior months.",
    "Based on net burn trend and latest runway length."
  ),
  cashOutlook: tip(
    "Overall cash position outlook ,  surplus, adequate, constrained, or deficit.",
    "Derived from cumulative cash vs opening balance."
  ),

  // ── Funding Model (inputs + results) ──
  "Revenue": tip("Total revenue for the month.", "Starting point for contribution and cash flow."),
  "Cost of Goods Sold (COGS)": tip(
    "Cost of Goods Sold ,  direct costs to deliver your product or service.",
    "First deduction from revenue."
  ),
  "Variable Cost": tip(
    "Costs that increase with sales ,  marketing, commission, payment gateway, etc.",
    "Subtracted along with COGS to get contribution."
  ),
  "Fixed Cost": tip(
    "Costs that stay the same every month ,  salaries, rent, software.",
    "Subtracted from contribution to get EBITDA."
  ),
  "Inventory": tip("Value of stock held at month end.", "Part of working capital tied up in goods."),
  "Trade Receivables": tip("Money owed by customers (debtors).", "Cash not yet collected ,  increases working capital need."),
  "Trade Payables": tip("Money owed to suppliers (creditors).", "Offsets working capital ,  you haven't paid yet."),
  "CapEx": tip(
    "Capital expenditure ,  buying assets, equipment, or technology.",
    "Cash outflow that doesn't appear in the P&L immediately."
  ),
  "Change in WC": tip(
    "Increase or decrease in money tied up in inventory + receivables − payables.",
    "Positive change means more cash is locked in the business."
  ),
  "Opening Cash": tip("Cash and bank balance at the start of the funding analysis.", "Determines runway before new funding arrives."),
  "contingencyPct": tip("Buffer percentage added on top of the max cash deficit.", "Covers unexpected costs or delays ,  typically 10, 20%."),
  "Contribution": tip("Revenue minus COGS and variable costs.", "Cash generated before fixed costs and working capital."),
  "Net Cash Flow": tip(
    "Total change in cash for the period ,  operating, investing, and financing combined.",
    "Positive = cash built up; negative = cash consumed."
  ),
  "maxCashDeficit": tip("Lowest cumulative cash point (if negative).", "The cash gap you need to fund."),
  "fundingRequired": tip("Maximum cash deficit before contingency.", "Minimum funding to avoid running out of cash."),
  "contingency": tip("Buffer added on top of the max deficit.", "Safety margin for unforeseen expenses."),
  "totalFundingRequired": tip(
    "How much money you need to raise or arrange to cover the cash gap plus buffer.",
    "Max deficit + contingency ,  your fundraising target."
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
    "Costs that don't change with sales volume ,  salaries, rent, software, etc.",
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
    "Below 80% is healthy ,  you have room before hitting break-even."
  ),

  // ── Unit Economics (inputs) ──
  "Sales Revenue": tip(
    "Total revenue earned from all customers in the month.",
    "Divided by active customers to get ARPU."
  ),
  "Marketing Spend": tip(
    "Total money spent on acquiring new customers ,  ads, campaigns, etc.",
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
    "Customer Acquisition Cost ,  how much it costs to get one new customer.",
    "Marketing spend ÷ new customers acquired."
  ),
  "LTV": tip(
    "Lifetime Value ,  total revenue you expect from one customer over their lifetime.",
    "Higher LTV relative to CAC means healthy unit economics."
  ),
  "ARPU": tip(
    "Average Revenue Per User ,  monthly revenue per active customer.",
    "Sales revenue ÷ average active customers."
  ),
  "Churn Rate %": tip(
    "Percentage of customers who stop using your product every month.",
    "Lower churn = longer customer lifetime and higher LTV."
  ),
  "CAC Payback Period (Months)": tip(
    "How many months it takes to recover the cost of acquiring a customer.",
    "CAC ÷ ARPU ,  shorter is better."
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
  "KPI Summary Dashboard": tip(
    "Overall RAG status from LTV/CAC, monthly churn %, and customer growth %.",
    "GREEN = all three metrics healthy; AMBER = at least one needs attention; RED = fix fundamentals before scaling."
  ),

  // ── Pitch Deck KPIs (inputs) ──
  grossMonthlyRevenue: tip("Total gross revenue for the month.", "Starting point for margin and burn calculations."),
  recurringRevenue: tip(
    "Revenue that is expected to repeat next month ,  subscriptions, retainers.",
    "Higher recurring share = more predictable business."
  ),
  cogs: tip("Direct costs to deliver your product or service.", "Subtracted from revenue for gross margin."),
  monthlyMarketingSpend: tip(
    "Total spend on customer acquisition ,  ads, campaigns, etc.",
    "Divided by new customers to get CAC."
  ),
  variableCosts: tip("All variable operating costs for the month.", "Used in contribution margin calculation."),
  fixedCosts: tip("Monthly fixed costs ,  salaries, rent, software.", "Part of total burn calculation."),
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
    "Customer Acquisition Cost ,  how much you spend to get one new customer.",
    "Should be recoverable within 12, 18 months via LTV."
  ),
  ltv: tip(
    "Lifetime Value ,  total revenue expected from one customer over their lifetime.",
    "ARPU × average customer lifetime in months."
  ),
  ltvCacRatio: tip(
    "LTV divided by CAC.",
    "If LTV is 3×+ higher than CAC, your unit economics are healthy."
  ),
  cacPaybackMonths: tip(
    "How many months it takes to recover the cost of acquiring a customer.",
    "CAC ÷ ARPU ,  investors prefer under 12 months."
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
  annualCapex: tip("Annual capital expenditure in absolute currency.", "Excel applies the same CapEx amount each projection year (E20)."),
  capexPctOfRevenue: tip("Capital expenditure as a percentage of revenue.", "Cash outflow reducing free cash flow."),
  sharePrice: tip("Current market price per share.", "Multiplied by diluted shares to get market value of equity for WACC."),
  dilutedShares: tip("Total diluted shares outstanding.", "Used for market cap and value-per-share output."),
  debt: tip(
    "Current market value of outstanding debt.",
    "Used in WACC weighting and deducted from enterprise value to get equity value."
  ),
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
    "Long-term sustainable growth rate after 5 years, usually 2, 4%.",
    "Used to calculate terminal value via Gordon Growth Model."
  ),

  // ── DCF Valuation (results) ──
  costOfEquity: tip("Return required by equity investors (CAPM).", "Risk-free rate + beta × equity risk premium."),
  afterTaxCostOfDebt: tip("Cost of debt after tax shield.", "Interest is tax-deductible, reducing effective cost."),
  wacc: tip(
    "Weighted Average Cost of Capital ,  the return investors expect.",
    "Discount rate used to present-value future cash flows."
  ),
  enterpriseValue: tip(
    "Total value of the business ,  equity plus debt.",
    "Sum of discounted FCFF plus terminal value."
  ),
  equityValue: tip(
    "Value belonging to shareholders after deducting debt.",
    "Enterprise value minus net debt."
  ),
  valuePerShare: tip("Equity value divided by total shares outstanding.", "Implied fair price per share."),
  terminalValue: tip(
    "Value of all cash flows beyond the 5-year projection period.",
    "Often 60, 80% of total enterprise value."
  ),
  pvOfFCFF: tip("Present value of that year's free cash flow.", "Discounted at WACC back to today."),
  pvOfTerminalValue: tip("Present value of the terminal value.", "Excel discounts TV by 1/(1+WACC) — same single-period factor as FCFF rows."),
  totalPVOfFCFF: tip("Sum of present values of FCFF for Years 1, 5.", "Core component of enterprise value."),

  // ── Cap Table Mechanics ──
  roundName: tip("Name of the funding round ,  Seed, Series A, etc.", "Identifies each dilution event."),
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
  exitVal: tip("Total company value at exit ,  acquisition or IPO.", "Used to calculate shareholder payouts."),
  exitValue: tip(
    "Total company value at exit ,  acquisition or IPO price.",
    "Multiplied by ownership % to get each shareholder's payout."
  ),
  shares: tip("Number of equity shares held by this shareholder.", "Ownership % = shares ÷ total shares."),
  pricePerShare: tip("Price paid per share in a funding round.", "Pre-money valuation ÷ existing shares."),
  ownership: tip("Percentage of the company owned by each shareholder.", "Recalculated after each funding round."),
  payout: tip("Cash received by each shareholder at exit.", "Exit value × ownership percentage."),
  postMoney: tip("Company valuation after investment is added.", "Pre-money + investment amount."),
  newShares: tip("Shares issued to new investors in this round.", "Investment ÷ price per share."),

  // ── Cash Flow Statement ,  Operations (inputs) ──
  "Business receipts": tip(
    "Cash collected from customers for goods or services sold this month.",
    "Core operating cash inflow ,  use actual bank collections, not billed revenue."
  ),
  "Other cash receipts (including interest income)": tip(
    "Other cash received ,  interest on deposits, refunds, grants, or misc income.",
    "Added to business receipts to get total operating cash inflow."
  ),
  "COGS (Raw Materials, Manufacturing, shipping)": tip(
    "Cash paid for raw materials, manufacturing, and direct shipping costs.",
    "Largest variable cash outflow for product businesses."
  ),
  "Frieght & Logistics": tip(
    "Cash paid for freight, courier, and logistics this month.",
    "Part of operating cash outflows, affects true cash cost of delivery."
  ),
  "Salaries & Wages": tip(
    "Cash paid for salaries, wages, and employee benefits this month.",
    "Usually the largest recurring operating cash outflow."
  ),
  "Technology and IT costs": tip(
    "Cash paid for software subscriptions, cloud hosting, and IT support.",
    "Key cost for tech-enabled businesses; part of operating outflows."
  ),
  "Professional and Legal Fees": tip(
    "Cash paid to CA, lawyers, auditors, and consultants.",
    "Compliance and advisory costs deducted from operating cash flow."
  ),
  "Travel & Entertainment": tip(
    "Cash spent on business travel, client meetings, and entertainment.",
    "Operating outflow that reduces net CFO."
  ),
  "Other Miscll operating expenses": tip(
    "Miscellaneous operating expenses paid in cash not captured elsewhere.",
    "Ensures total operating outflows are complete."
  ),
  "Interest expenses": tip(
    "Cash interest paid on loans and credit facilities this month.",
    "Financing cost paid in cash ,  reduces operating cash outflow headroom."
  ),
  "Income Tax expenses (including Provision)": tip(
    "Cash paid for income tax and advance tax this month.",
    "Tax outflow ,  use actual tax payments, not just P&L provision."
  ),
  "Purchase of Assets": tip(
    "Cash spent buying fixed assets ,  equipment, furniture, vehicles, computers.",
    "Investing outflow (CFI). CapEx reduces available cash."
  ),
  "Sale of Assets": tip(
    "Cash received from selling fixed assets this month.",
    "Investing inflow ,  offsets purchase of assets in CFI."
  ),
  "Equity raised": tip(
    "Cash received from new equity investment ,  angel, VC, or rights issue.",
    "Financing inflow (CFF). Does not need repayment unlike debt."
  ),
  "Loan Taken": tip(
    "Cash received from new loan drawdowns ,  term loan, WC limit, or overdraft.",
    "Financing inflow. Shows how much debt is funding the business."
  ),
  "Loan repaid": tip(
    "Principal portion of loan repayments paid in cash this month (not interest).",
    "Financing outflow ,  reduces cash available for operations."
  ),
  "Dividends paid": tip(
    "Cash distributed to shareholders as dividends this month.",
    "Financing outflow ,  cash returned to owners rather than reinvested."
  ),
  "Depreciation and Amortization": tip(
    "Non-cash depreciation charge from the P&L (for EBITDA calculation only).",
    "Added back to CFO to derive EBITDA, no actual cash movement."
  ),

  // ── Cash Flow Statement ,  Operations (results) ──
  "Total Cash inflow": tip(
    "Sum of business receipts and other cash receipts.",
    "Total operating cash collected before any outflows."
  ),
  "Total Outflows": tip(
    "Sum of all operating cash payments ,  COGS, salaries, rent, tax, etc.",
    "Total cash spent on day-to-day operations this month."
  ),
  "Net Cash Flow from Operating Activities (CFO)": tip(
    "Operating cash flow = total inflows minus total outflows.",
    "Shows whether core operations are generating or consuming cash."
  ),
  "Cash Flow from Investing Activities (CFI)": tip(
    "Net cash from asset purchases and sales (sale minus purchase).",
    "Negative CFI means cash invested in long-term assets."
  ),
  "Cash Flow from Financing Activities (CFF)": tip(
    "Net cash from equity, loans raised, repayments, and dividends.",
    "Shows how funding and debt service affect cash position."
  ),
  "Closing Balance": tip(
    "Cash in bank at month end = opening balance + net cash flow.",
    "Running cash position ,  critical for runway and solvency."
  ),
  "Ending Cash": tip(
    "Cash in bank at month end after all inflows and outflows.",
    "Same as closing balance ,  tracks cumulative liquidity."
  ),
  "Profit After Tax (PAT)": tip(
    "Net profit after tax from the P&L for this month.",
    "Compared with CFO to assess cash conversion quality."
  ),
  "CFO / PAT": tip(
    "Operating cash flow divided by profit after tax.",
    "Above 1.0 means profits are fully converting to cash; below 0.8 is a warning."
  ),
  "CFO / EBITDA": tip(
    "Operating cash flow divided by EBITDA.",
    "Measures how much of operating earnings turns into actual cash."
  ),

  // ── Cash Flow Statement ,  Consolidated CFO (summary) ──
  totalNetCashFlow: tip(
    "Total change in cash across all months entered.",
    "Final ending cash minus opening cash."
  ),
  finalEndingCash: tip(
    "Cash balance at the end of the last month with data.",
    "Your closing liquidity position after all flows."
  ),
  avgCfoPat: tip(
    "Average CFO/PAT ratio across all months entered.",
    "Overall cash conversion quality ,  drives the RAG classification."
  ),
  avgCfoEbitda: tip(
    "Average CFO/EBITDA ratio across all months entered.",
    "Shows how consistently operating earnings convert to cash."
  ),
  overallClassification: tip(
    "RAG grade based on average CFO/PAT: Strong > 1.2, Acceptable 0.8, 1.2, Weak 0, 0.8, Red < 0.",
    "Quick health check on whether reported profits are backed by cash."
  ),
  cfoPat: tip(
    "This month's operating cash flow divided by profit after tax.",
    "Key ratio for cash conversion ,  compare month to month for trends."
  ),
  cfoEbitda: tip(
    "This month's operating cash flow divided by EBITDA.",
    "Alternative cash conversion measure using operating earnings."
  ),
};

export function standaloneHint(key: string | number): HintDef | undefined {
  const k = String(key);
  return EXCEL_FIELD_HINTS[k] ?? STANDALONE_MODEL_HINTS[k] ?? FIELD_HINTS[k];
}
