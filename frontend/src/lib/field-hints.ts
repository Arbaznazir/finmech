// ============================================================
// FIELD HINTS ,  Indian CA / Startup-friendly explanations
// Used across all investor-grade and standard-grade models
// ============================================================

export interface HintDef {
  what: string;
  why: string;
  how?: string;
}

export const FIELD_HINTS: Record<string, HintDef> = {

  // ── INCOME STATEMENT ──────────────────────────────────────
  "Operational Revenue (Recurring Receipts)": {
    what: "Regular, predictable income your business earns every month ,  like subscriptions, retainer fees, or AMC charges.",
    why: "Recurring revenue is the backbone of valuation. Investors and bankers prefer businesses with steady, reliable income over one-time sales.",
    how: "From your GST sales register, pick invoices that repeat monthly. In Tally, this appears under 'Sales ,  Service' or 'Recurring Billing'.",
  },
  "Operational Revenue (Variable revenue including interest income)": {
    what: "Income that varies month to month ,  project-based work, export income, bank interest, or one-time sales.",
    why: "Helps separate predictable revenue from lumpy income. Investors discount variable revenue more heavily in valuations.",
    how: "Check your bank statement for interest credits. Variable project income comes from your sales invoices in Tally/Zoho.",
  },
  "COGS (Direct Costs)": {
    what: "Direct cost of producing what you sell ,  raw materials, direct labour, packing material, freight inward.",
    why: "COGS is deducted from Revenue to get Gross Profit. Lower COGS = higher margins = stronger business.",
    how: "In Tally, go to Purchase Accounts → Direct Expenses. In GST returns, this is your B2B input purchases.",
  },
  "Freight & Logistics": {
    what: "Cost of transporting goods to customers or from suppliers ,  courier, freight forwarding, last-mile delivery.",
    why: "Often overlooked but eats into margins. Helps calculate your true cost per unit delivered.",
    how: "Check outward freight invoices or logistics partner bills (Delhivery, Blue Dart, etc.).",
  },
  "Other Variable Costs": {
    what: "Any direct cost that changes with production volume but doesn't fit the categories above ,  e.g. contract labour, subcontracting, commissions.",
    why: "Ensures your Gross Profit is accurate. Missing variable costs overstates margins.",
    how: "Look in Tally under 'Direct Expenses' or 'Cost of Goods Sold' group.",
  },
  "Salaries & Benefits": {
    what: "Monthly payroll ,  employee salaries, PF (Provident Fund), ESIC, gratuity, and allowances.",
    why: "Usually the largest operating expense. Critical for burn rate and profitability analysis.",
    how: "From your payroll software (Razorpay Payroll, GreytHR, Keka) or Tally payroll module. Include both CTC components and employer contributions.",
  },
  "Rent & Utilities": {
    what: "Monthly office/warehouse rent, electricity bills, water charges, internet, and phone bills.",
    why: "Fixed overhead that must be covered even at zero revenue. Important for break-even calculation.",
    how: "Rent agreement + utility bills. In Tally, check 'Rent', 'Electricity Charges', 'Telephone Expenses'.",
  },
  "Marketing & Advertising": {
    what: "Money spent on getting customers ,  Google/Meta Ads, content creation, PR, events, influencers, SEO tools.",
    why: "Directly linked to Customer Acquisition Cost (CAC). Higher marketing spend should drive proportional revenue growth.",
    how: "Pull from your ad platform dashboards (Google Ads, Meta Business Manager) or from Tally under 'Advertisement Expenses'.",
  },
  "Travel": {
    what: "Business travel ,  flights, hotels, local conveyance, client visits, conference attendance.",
    why: "Part of operating expenses. For investor decks, high travel costs relative to revenue raise questions.",
    how: "From expense reports or Tally under 'Travelling Expenses'.",
  },
  "Professional & Legal Fees": {
    what: "Fees paid to CA, lawyers, consultants, auditors, company secretaries.",
    why: "Regular compliance costs for Indian companies (GST filing, ROC filing, audit). Shows governance maturity.",
    how: "From invoices from your CA firm, legal counsel, or MCA compliance records.",
  },
  "Technology & IT Costs": {
    what: "Software subscriptions (SaaS tools), cloud hosting (AWS/GCP/Azure), IT maintenance, licenses.",
    why: "For tech companies, this is a key cost driver. Shows the digital infrastructure investment.",
    how: "From your credit card bills or vendor invoices ,  Zoho, AWS, Microsoft 365, etc.",
  },
  "Depreciation & Amortization": {
    what: "Annual wear-and-tear of fixed assets (machinery, computers, vehicles) spread across their useful life. Amortization is the same for intangible assets like software or patents.",
    why: "Under Companies Act 2013 and Income Tax Act, depreciation reduces taxable profit. It's a non-cash expense ,  doesn't affect cash flow but impacts P&L and tax liability.",
    how: "From your Fixed Asset Register. Your CA calculates this using SLM or WDV method as per Schedule II of Companies Act.",
  },
  "Interest Expense": {
    what: "Interest paid on business loans ,  term loans, working capital limits (CC/OD), vehicle loans.",
    why: "Reduces your Profit Before Tax (PBT). High interest costs signal over-leveraging. Banks assess interest coverage ratio.",
    how: "From your loan statements (bank or NBFC). In Tally, check 'Interest on Loans' under Finance Charges.",
  },
  "Tax Expense": {
    what: "Corporate Income Tax payable ,  25% for domestic companies (under Section 115BAA) or 30% + surcharge for others. Includes advance tax, TDS, and deferred tax.",
    why: "Net Profit (PAT) is calculated after tax. Investors look at PAT margins for true profitability.",
    how: "From your CA's tax computation or provisional P&L. Advance tax challans (Form 280) show actual payments.",
  },
  "Miscll Operating expenses": {
    what: "Miscellaneous operating costs not covered above ,  office supplies, staff welfare, printing, postage.",
    why: "Captures the tail-end of your cost structure. Helps in complete expense mapping.",
    how: "From Tally under 'Miscellaneous Expenses' or 'Office Expenses'.",
  },

  // ── BURN & RUNWAY ─────────────────────────────────────────
  "Recurring Revenue": {
    what: "Steady monthly income from subscriptions, retainers, or recurring contracts.",
    why: "The most important revenue type for runway calculation ,  it reduces your effective burn rate every month.",
    how: "From your billing system. SaaS MRR, retainer invoices, or AMC contracts.",
  },
  "Miscll. revenue": {
    what: "One-time or irregular income ,  project completions, consulting fees, referral income.",
    why: "Adds to total revenue but cannot be relied upon for runway planning. Treated separately from recurring.",
    how: "From one-off invoices or bank receipts not part of regular subscriptions.",
  },
  "Fixed Expenses": {
    what: "Costs that stay the same regardless of revenue ,  salaries, rent, EMIs, software subscriptions.",
    why: "These must be paid even if revenue is zero. They determine the minimum monthly cash outflow.",
    how: "Auto-filled from Income Statement if connected. Otherwise, sum up payroll + rent + fixed subscriptions.",
  },
  "Variable Expenses": {
    what: "Costs that rise or fall with business activity ,  COGS, commissions, performance marketing.",
    why: "Variable costs scale with revenue, making them easier to cut in a downturn than fixed costs.",
    how: "Auto-filled from Income Statement if connected. Otherwise, check COGS + variable marketing spend.",
  },
  "Opening Cash Balance": {
    what: "The cash and bank balance at the start of the financial year or the period you're analysing.",
    why: "Runway = Cash Balance ÷ Monthly Net Burn. Your opening cash is the starting point of this calculation.",
    how: "From your bank statement on 1st April (financial year start) or from your Balance Sheet opening balance.",
  },

  // ── BREAK-EVEN ────────────────────────────────────────────
  "pricePerUnit": {
    what: "The selling price of one unit of your product or service.",
    why: "Break-even units = Fixed Costs ÷ (Price − Variable Cost). Price is the foundation of this formula.",
    how: "From your price list or invoices. For services, define 'one unit' as one hour, one project, or one subscription.",
  },
  "variableCostPerUnit": {
    what: "The direct cost to produce or deliver one unit ,  materials, packaging, direct labour, delivery.",
    why: "Subtracted from Price to get Contribution Margin. Higher contribution = fewer units needed to break even.",
    how: "Divide your total variable costs by units produced. From COGS breakdown in Tally.",
  },
  "fixedCostMonthly": {
    what: "Total fixed overheads per month ,  salaries, rent, EMIs, software, insurance.",
    why: "Break-even point = Fixed Costs ÷ Contribution Margin per Unit. Auto-filled from Income Statement.",
    how: "Auto-filled from your Income Statement (Common Utility). Or manually sum up all fixed monthly bills.",
  },
  "unitsSoldForProjection": {
    what: "The number of units you expect to sell per month for the projection scenario.",
    why: "Used to project profit/loss at your expected sales volume ,  shows how far you are from break-even.",
    how: "From your sales forecast or last month's actual sales data.",
  },

  // ── UNIT ECONOMICS ────────────────────────────────────────
  "Starting Customers": {
    what: "Number of paying customers at the beginning of the month.",
    why: "Base for calculating churn, growth, and retention metrics.",
    how: "From your CRM (Zoho CRM, HubSpot, Freshsales) or billing software. Count only active paying accounts.",
  },
  "New Customers": {
    what: "New customers acquired during the month.",
    why: "Drives growth rate. Combined with CAC, shows cost-efficiency of your acquisition engine.",
    how: "From your CRM new deals closed, or new subscription activations in your billing system.",
  },
  "Churned Customers": {
    what: "Customers who cancelled or did not renew during the month.",
    why: "Churn rate is the #1 health metric for subscription businesses. High churn destroys LTV and CAC payback.",
    how: "From your CRM cancellation records or billing platform (Razorpay, Chargebee, Stripe).",
  },
  "Starting MRR": {
    what: "Monthly Recurring Revenue at the start of the month.",
    why: "Starting point for MRR movement analysis ,  shows how revenue evolves month over month.",
    how: "From your billing dashboard. In Chargebee/Stripe, this is the 'MRR at period start' metric.",
  },
  "New MRR": {
    what: "New Monthly Recurring Revenue from customers acquired this month.",
    why: "New MRR shows the health of your sales pipeline. Investors track this closely.",
    how: "New customers this month × their average monthly subscription value.",
  },
  "Churned MRR": {
    what: "Revenue lost from customers who cancelled or downgraded this month.",
    why: "Even with high new MRR, high churned MRR can make net MRR growth negative ,  a red flag for investors.",
    how: "From your billing platform. Cancellations + downgrades from this month.",
  },
  "Expansion MRR": {
    what: "Additional revenue from existing customers who upgraded, bought add-ons, or expanded usage.",
    why: "Expansion MRR > Churned MRR = Net Negative Churn, the holy grail for SaaS businesses.",
    how: "From billing platform. Upsells, cross-sells, or seat expansions this month.",
  },
  "CAC (Sales & Marketing Spend)": {
    what: "Total money spent on Sales and Marketing this month ,  ads, salaries of sales staff, events.",
    why: "CAC = Total Sales & Marketing Spend ÷ New Customers. Shows the cost to acquire one customer.",
    how: "Auto-filled from Income Statement Marketing spend. Add sales team salaries if not included.",
  },
  "Fixed Costs": {
    what: "Monthly fixed overhead ,  salaries, rent, software subscriptions, EMIs.",
    why: "Used to calculate Contribution Margin and Rule of 40. Auto-filled from Income Statement.",
    how: "Auto-filled from Common Utility Income Statement. Shows your minimum monthly cash requirement.",
  },
  "Average Revenue Per User (ARPU)": {
    what: "Average monthly revenue generated per customer = Total MRR ÷ Total Active Customers.",
    why: "ARPU drives LTV. Higher ARPU with stable churn = exponentially higher customer lifetime value.",
    how: "Calculated automatically. To improve it, focus on upselling or pricing strategy.",
  },

  // ── MOVEMENTS ────────────────────────────────────────────
  "Revenue": {
    what: "Total revenue billed to customers this month (including credit sales not yet collected).",
    why: "Base for DSO calculation. Revenue ≠ Cash collected. The difference is your receivables.",
    how: "From your sales invoices this month. Same as Gross Revenue in Income Statement.",
  },
  "COGS": {
    what: "Cost of goods sold this month ,  direct material, direct labour, direct overheads.",
    why: "Base for DIO and DPO calculation. COGS drives inventory and payables cycles.",
    how: "From Purchase register + direct expense accounts in Tally.",
  },
  "Trade Receivables (Opening)": {
    what: "Money owed by customers at the start of the month (unpaid invoices from previous months).",
    why: "Used to calculate change in receivables and cash actually collected from customers.",
    how: "From your Debtor Ledger in Tally. Opening balance = prior month's closing balance.",
  },
  "Trade Receivables (Closing)": {
    what: "Money owed by customers at the end of the month ,  what hasn't been collected yet.",
    why: "Rising receivables = customers paying slower = cash getting stuck. DSO measures this.",
    how: "From Tally Debtor Ledger closing balance. Also visible in GSTR-2A reconciliation.",
  },
  "Inventory (Opening)": {
    what: "Value of stock held at the start of the month.",
    why: "Used to calculate DIO (Days Inventory Outstanding) ,  how many days stock sits before being sold.",
    how: "From your Stock Summary in Tally or warehouse management system.",
  },
  "Inventory (Closing)": {
    what: "Value of stock at end of month after sales and purchases.",
    why: "High closing inventory means cash is locked in stock. DIO tracks this efficiency.",
    how: "Physical stock count × cost price, or from Tally Stock Summary.",
  },
  "Trade Payables (Opening)": {
    what: "Money owed to suppliers at the start of the month.",
    why: "Used to calculate DPO ,  how long you take to pay suppliers. Higher DPO = better working capital.",
    how: "From Tally Creditor Ledger opening balance.",
  },
  "Trade Payables (Closing)": {
    what: "Money owed to suppliers at the end of the month.",
    why: "DPO = (Closing Payables ÷ COGS) × 30. Paying suppliers slowly conserves cash.",
    how: "From Tally Creditor Ledger closing balance.",
  },
  "CapEx": {
    what: "Capital Expenditure ,  money spent buying or improving long-term assets (machinery, computers, vehicles, fit-outs).",
    why: "CapEx reduces Free Cash Flow. Investors track CapEx to assess asset intensity of the business.",
    how: "From Fixed Asset register additions this month. In Tally, check Capital Account → Assets purchased.",
  },

  // ── CASH FLOW ────────────────────────────────────────────
  "Net Profit (PAT)": {
    what: "Profit After Tax ,  what's left after all expenses and taxes. The bottom line of your P&L.",
    why: "Starting point for indirect cash flow statement (as per AS 3 / Ind AS 7). Auto-filled from Income Statement.",
    how: "Auto-filled from Common Utility Income Statement.",
  },
  "Depreciation & Amortization (Add-back)": {
    what: "Non-cash charge for asset wear-and-tear. Added back to profit because no actual cash was paid.",
    why: "Since depreciation reduces profit but doesn't reduce cash, it's added back in cash flow from operations.",
    how: "Auto-filled from Income Statement. Your CA calculates this under Schedule II, Companies Act 2013.",
  },
  "Change in Receivables": {
    what: "Increase or decrease in money owed by customers. Increase = cash not collected yet.",
    why: "If receivables rise, it means revenue was billed but not collected ,  reducing operating cash flow.",
    how: "Auto-filled from Movements model. = Closing Receivables − Opening Receivables.",
  },
  "Change in Inventory": {
    what: "Increase or decrease in stock value. Increase = cash used to build inventory.",
    why: "Cash tied up in inventory reduces operating cash flow. Important for product companies.",
    how: "Auto-filled from Movements model. = Closing Inventory − Opening Inventory.",
  },
  "Change in Payables": {
    what: "Increase or decrease in supplier dues. Increase = you're using supplier credit (good for cash).",
    why: "Rising payables improve cash flow because you're delaying cash outflow to suppliers.",
    how: "Auto-filled from Movements model. = Closing Payables − Opening Payables.",
  },
  "Loan Drawdown": {
    what: "New loan amount received this month ,  term loan disbursement, working capital limit drawn.",
    why: "Cash inflow under Financing Activities. Shows how much external debt is funding the business.",
    how: "From bank credit advice or loan disbursement letter from your bank/NBFC.",
  },
  "Loan Repayment": {
    what: "Principal portion of EMI paid on existing loans this month (not interest ,  that's in P&L).",
    why: "Cash outflow under Financing Activities. High repayments reduce available cash.",
    how: "From your loan amortization schedule. EMI = Principal + Interest; only principal is repayment here.",
  },
  "Equity Raised": {
    what: "Fresh share capital raised from investors this month ,  angel round, VC investment, rights issue.",
    why: "Cash inflow under Financing Activities. Equity raised doesn't need repayment, unlike debt.",
    how: "From share allotment documents, Form PAS-3 (ROC filing), or bank credit of investor funds.",
  },

  // ── BALANCE SHEET ────────────────────────────────────────
  "Cash & Cash Equivalents (Cash at bank included)": {
    what: "Total liquid assets ,  current account balance, savings account, FD with less than 3 months maturity, petty cash.",
    why: "Auto-filled from Cash Flow model. Most critical asset for a startup ,  insufficient cash = business at risk.",
    how: "From your bank statement closing balance + any cash-in-hand from petty cash register.",
  },
  "Trade Receivables (Debtors)": {
    what: "Money owed to you by customers for goods/services already delivered but not yet paid.",
    why: "Auto-filled from Movements model. High receivables = cash stuck with customers. Age analysis recommended.",
    how: "Tally Debtor Ledger, GSTR-1 (sales register) cross-referenced with collections.",
  },
  "Inventory / Stock": {
    what: "Value of raw materials, WIP (work-in-progress), and finished goods in hand.",
    why: "Auto-filled from Movements model. Inventory is a current asset but cash is locked until sold.",
    how: "Physical verification + Tally Stock Summary. Valued at Cost or NRV, whichever is lower (AS 2).",
  },
  "Other Current Assets": {
    what: "Short-term assets like advance tax paid, input GST credit (ITC), prepaid expenses, security deposits.",
    why: "Completes the current assets picture. GST ITC is significant for Indian businesses and often overlooked.",
    how: "From Tally ,  Advance Tax ledger, GST ITC (2A), Prepaid Expenses, and Security Deposit accounts.",
  },
  "Property, Plant & Equipment (Net)": {
    what: "Fixed assets at cost minus accumulated depreciation ,  office furniture, machines, computers, vehicles.",
    why: "Shows the long-term asset base. Net PP&E = Gross Block − Accumulated Depreciation per your Fixed Asset Register.",
    how: "From Fixed Asset Register. Mandatory schedule under Companies Act 2013 Schedule II.",
  },
  "Other Non-Current Assets": {
    what: "Long-term assets not classified elsewhere ,  goodwill, long-term deposits, deferred tax assets.",
    why: "Deferred Tax Asset arises when book profit < taxable profit. Goodwill from acquisitions is also here.",
    how: "From your CA's balance sheet or Schedule 3 under Companies Act 2013.",
  },
  "Trade Payables (Creditors)": {
    what: "Money owed to suppliers for goods/services received but not yet paid.",
    why: "Auto-filled from Movements model. Healthy payables = you have supplier credit. Stretched payables = cash stress.",
    how: "From Tally Creditor Ledger. Cross-check with GSTR-2A (purchase register).",
  },
  "Short-Term Borrowings": {
    what: "Loans repayable within 12 months ,  CC/OD limits, short-term demand loans, current portion of term loans.",
    why: "Part of Current Liabilities. High short-term debt vs cash = liquidity risk.",
    how: "From bank statements, working capital limit sanction letters, or CA balance sheet.",
  },
  "Other Current Liabilities": {
    what: "Dues payable within 12 months ,  GST payable, TDS payable, advance from customers, salary payable, PF/ESIC dues.",
    why: "Includes statutory dues (GST, TDS, PF) which carry penal interest if unpaid. Critical compliance item.",
    how: "From Tally ,  Duties & Taxes group, Statutory Liabilities, and Advance from Customers.",
  },
  "Long-Term Debt": {
    what: "Loans repayable after 12 months ,  term loans from banks, debentures, NCD, NBFC loans.",
    why: "Long-term debt is used to fund capital expenditure. D/E ratio = Total Debt ÷ Equity.",
    how: "From loan sanction letters and repayment schedules. CA includes this in Schedule 3 liabilities.",
  },
  "Share Capital": {
    what: "Money invested by founders and investors by purchasing equity shares of the company.",
    why: "Permanent capital ,  doesn't need repayment. Forms the equity base. Shown at face value (₹10 or ₹1 per share).",
    how: "From your MOA, Share Certificate, or Form PAS-3 filed with ROC. Also in CA-prepared balance sheet.",
  },
  "Retained Earnings / Reserves": {
    what: "Cumulative profits retained in the business (not distributed as dividends). Auto-calculated from Net Profit history.",
    why: "Shows how much profit has been ploughed back. Strong retained earnings = financial resilience.",
    how: "Auto-calculated. Manually verify from your P&L surplus carried forward in CA's balance sheet.",
  },

  // ── DCF VALUATION ────────────────────────────────────────
  "Base Revenue": {
    what: "Your current annual revenue ,  the starting point for all future revenue projections in the DCF model.",
    why: "All 5-year projections are derived by growing this number at your specified growth rate.",
    how: "From your latest audited P&L or provisional accounts. Annual Gross Revenue.",
  },
  "Revenue Growth Rate (%)": {
    what: "Expected year-on-year revenue growth percentage for the next 5 years.",
    why: "The single most impactful assumption in a DCF. Higher growth = higher valuation. Must be realistic.",
    how: "Based on last 3 years' CAGR or sector benchmarks. Typical SaaS: 30, 80%. Manufacturing: 15, 25%.",
  },
  "EBITDA Margin (%)": {
    what: "EBITDA as a % of Revenue. EBITDA = Earnings Before Interest, Tax, Depreciation & Amortization.",
    why: "Proxy for operational cash generation. EBITDA × EV/EBITDA multiple = Enterprise Value.",
    how: "From Income Statement: EBITDA ÷ Gross Revenue × 100. Auto-populated if Income Statement is filled.",
  },
  "Tax Rate (%)": {
    what: "Effective corporate tax rate ,  25.17% for domestic companies under Section 115BAA, or 30% + surcharge for others.",
    why: "After-tax NOPAT is used in FCFF calculation. Tax rate directly impacts valuation.",
    how: "Check with your CA. Most startups under Rs 400 Cr turnover opt for 25.17% (Section 115BAA).",
  },
  "Discount Rate / WACC (%)": {
    what: "Weighted Average Cost of Capital ,  the minimum return expected by all capital providers (equity + debt).",
    why: "All future cash flows are discounted at WACC to find present value. Higher WACC = lower valuation.",
    how: "Typically 12, 18% for Indian startups. Your CA or investment banker can calculate this using CAPM.",
  },
  "Terminal Growth Rate (%)": {
    what: "The sustainable long-term growth rate after the 5-year projection period ,  usually GDP growth rate.",
    why: "Terminal Value typically accounts for 60, 80% of DCF valuation. Getting this right is critical.",
    how: "India's nominal GDP growth is typically 10, 12%. Use 5, 7% to be conservative.",
  },
  "Net Debt": {
    what: "Total interest-bearing debt minus cash and cash equivalents. Net Debt = Loans − Cash.",
    why: "Subtracted from Enterprise Value to arrive at Equity Value. Negative net debt = net cash position.",
    how: "From your Balance Sheet: Long-term loans + Short-term loans − Cash & Bank balances.",
  },
  "Cost of Equity (%)": {
    what: "Return expected by equity shareholders ,  calculated using CAPM: Risk-free rate + Beta × Market risk premium.",
    why: "Used to calculate WACC. Indian startups typically use 15, 20% cost of equity.",
    how: "Risk-free rate ≈ 10-year GOI bond yield (~7%). Beta for your sector from NSE data. Market premium ~6%.",
  },
  "Cost of Debt (%)": {
    what: "Interest rate on your outstanding loans ,  weighted average across all borrowings.",
    why: "After-tax cost of debt = Interest Rate × (1 − Tax Rate). Debt is usually cheaper than equity.",
    how: "From your loan sanction letters. Typical bank rates: 10, 14% for MSMEs, 8, 11% for larger companies.",
  },
  "Equity Weight (%)": {
    what: "Proportion of total capital financed by equity = Equity ÷ (Equity + Debt).",
    why: "Used to calculate WACC. More equity = higher WACC (equity is more expensive than debt).",
    how: "From Balance Sheet: Total Equity ÷ (Total Equity + Total Interest-Bearing Debt) × 100.",
  },
  "CapEx % of Revenue": {
    what: "Capital expenditure as a percentage of revenue ,  shows asset intensity of your business.",
    why: "CapEx reduces Free Cash Flow to Firm (FCFF). Asset-light businesses command premium valuations.",
    how: "From Cash Flow statement: CapEx ÷ Revenue × 100. Typical SaaS: 2, 5%, Manufacturing: 8, 15%.",
  },

  // ── FUNDING MODEL ────────────────────────────────────────
  "Funds Required": {
    what: "Total capital you need to raise in this funding round.",
    why: "Determines dilution and post-money valuation. Must be backed by a clear use-of-funds plan.",
    how: "Build a 18, 24 month cash flow model. Funding Required = Total Cash Outflows − Projected Cash Inflows.",
  },
  "Pre-Money Valuation": {
    what: "What the company is valued at before the new investment comes in.",
    why: "Investor's ownership % = Investment ÷ (Pre-Money + Investment). Higher pre-money = less dilution.",
    how: "Negotiated with investors. Can be derived from revenue multiples, DCF, or comparable transactions.",
  },
  "Existing Debt": {
    what: "Total outstanding loans on the company's books at the time of raising equity.",
    why: "Investors deduct debt from enterprise value to arrive at equity value. High debt reduces equity value.",
    how: "From your Balance Sheet ,  all term loans, working capital loans, and other interest-bearing liabilities.",
  },

  // ── BUSINESS SNAPSHOT ────────────────────────────────────
  "monthlyRevenue": {
    what: "Total revenue earned in the most recent month.",
    why: "Base metric for health score. Auto-filled from Income Statement.",
    how: "Auto-filled from Common Utility. Gross Revenue of the latest month with data.",
  },
  "grossMargin": {
    what: "Gross Profit as % of Revenue. Gross Profit = Revenue − COGS.",
    why: "Shows efficiency of your core product/service. Good benchmark: >50% for services, >30% for products.",
    how: "Auto-filled from Income Statement. (Revenue − COGS) ÷ Revenue × 100.",
  },
  "netMargin": {
    what: "Net Profit as % of Revenue after all expenses and taxes.",
    why: "Ultimate profitability measure. Target >10% for healthy business.",
    how: "Auto-filled from Income Statement. Net Profit ÷ Revenue × 100.",
  },
  "cashBalance": {
    what: "Total cash and bank balance currently available.",
    why: "Determines runway. If cash hits zero, business stops. Auto-filled from Burn & Runway model.",
    how: "Auto-filled from Burn & Runway model. Verify against latest bank statement.",
  },
  "burnRate": {
    what: "Monthly Net Burn ,  how much cash the business consumes per month after all income.",
    why: "Runway = Cash Balance ÷ Monthly Burn Rate. Investors fund to extend runway.",
    how: "Auto-filled from Burn & Runway model. Net Burn = Total Expenses − Total Revenue (if expenses > revenue).",
  },
  "totalCustomers": {
    what: "Total active paying customers at end of latest month.",
    why: "Revenue × Customers drives LTV. Growing customer base signals product-market fit.",
    how: "Auto-filled from Unit Economics model. Count from CRM or billing platform.",
  },
  "ltv": {
    what: "Customer Lifetime Value ,  total revenue expected from a customer over their entire relationship.",
    why: "LTV ÷ CAC ≥ 3 is the investor benchmark. Shows long-term unit economics health.",
    how: "Auto-filled from Unit Economics model. LTV = ARPU ÷ Monthly Churn Rate.",
  },
  "cac": {
    what: "Customer Acquisition Cost ,  total sales & marketing spend ÷ new customers acquired.",
    why: "Must be recovered within the customer's lifetime. CAC payback < 12 months is excellent.",
    how: "Auto-filled from Unit Economics model. Total S&M Spend ÷ New Customers This Month.",
  },
  "arr": {
    what: "Annual Recurring Revenue ,  annualised value of your subscription/recurring revenue contracts.",
    why: "Primary valuation driver for SaaS businesses. EV/ARR multiples used in funding rounds.",
    how: "Auto-filled from Income Statement. MRR × 12, or sum of all annual contract values.",
  },
  "enterpriseValue": {
    what: "Total value of the business (equity + debt − cash). What an acquirer would pay.",
    why: "Auto-filled from DCF model. Enterprise Value ÷ Revenue = EV/Revenue multiple.",
    how: "Auto-filled from DCF Valuation model.",
  },
  "nrr": {
    what: "Net Revenue Retention ,  revenue retained and expanded from existing customers (excluding new customers).",
    why: ">100% NRR means existing customers are generating more revenue even without new sales ,  a top investor signal.",
    how: "Auto-filled from Unit Economics model. (Starting MRR + Expansion − Churn) ÷ Starting MRR × 100.",
  },

  // ── CAP TABLE ────────────────────────────────────────────
  "shares": {
    what: "Number of equity shares held by this shareholder.",
    why: "Ownership % = Shares Held ÷ Total Shares × 100. More shares = more ownership and voting rights.",
    how: "From your Register of Members (Form MGT-1) maintained under Companies Act 2013. Or from Share Certificates.",
  },
  "investment": {
    what: "Total capital invested by this shareholder ,  either as share application money or consideration paid.",
    why: "Used for ROI/Multiple calculation in exit waterfall. Investment amount determines return multiple.",
    how: "From shareholders agreement, term sheet, or Form PAS-3 (Return of Allotment) filed with ROC.",
  },
  "roundName": {
    what: "Name of the funding round ,  Pre-Seed, Seed, Angel, Series A, Series B, etc.",
    why: "Identifies the stage of investment. Each round has different dilution and valuation benchmarks.",
    how: "From your term sheet or shareholders agreement. Standard nomenclature in Indian startup ecosystem.",
  },
  "investmentAmount": {
    what: "Total amount being invested in this round.",
    why: "New Shares = Investment ÷ Price Per Share. Determines investor ownership and founder dilution.",
    how: "From term sheet or shareholders agreement. Typically in INR.",
  },
  "pricePerShare": {
    what: "Price paid per equity share in this funding round.",
    why: "Used to calculate new shares issued and implied pre/post-money valuation.",
    how: "From term sheet: Pre-Money Valuation ÷ Total Shares Before Round = Price Per Share.",
  },
  "exitValue": {
    what: "Expected valuation at exit ,  acquisition price or IPO market cap.",
    why: "Each shareholder's payout = (Shares ÷ Total Shares) × Exit Value. Determines return multiples.",
    how: "From M&A transaction comparables, IPO price discovery, or negotiated acquisition price.",
  },

  // ── STANDARD MODELS (same as investor where applicable) ──
  "Opening Cash": {
    what: "Cash and bank balance at the start of the analysis period.",
    why: "Starting point for cumulative cash calculation. Runway begins from this amount.",
    how: "From bank statement on day 1 of the period, or from your Balance Sheet.",
  },
  "Revenue Growth (%)": {
    what: "Expected month-over-month revenue growth rate.",
    why: "Drives future revenue projections. Conservative assumptions build credibility with investors.",
    how: "Based on past trends or sales pipeline. Typical early-stage: 10, 20% MoM.",
  },
  "Churn Rate (%)": {
    what: "Percentage of customers who cancel/don't renew each month.",
    why: "Even 5% monthly churn = 46% annual churn ,  catastrophic for a subscription business. Must be minimised.",
    how: "Churned Customers This Month ÷ Total Customers at Start of Month × 100.",
  },
};
