// AUTO-GENERATED from FINMECH-UPGRADED Excel files. Do not edit by hand.
// Run: python3 scripts/generate-excel-content.py

export const IS_EXACT = {
  ragByColor: {
    GREEN: `GREEN-Great trend! You are outperforming baseline expectations.`,
    RED: `RED-Crossed a critical threshold.Take corrective action without delay`,
    AMBER: `AMBER-This trend requires attention`,
  } as const,
  mentoringGuidance: [
    `Margins falling for two months; urgently revisit pricing strategy.`,
    `Interest consuming EBITDA; capital structure needs correction.`,
    `Interest consuming GBITDA; capital structure needs correction.`,
    `Business metrics aligned; prepare pitch deck and investor outreach.`,
  ],
};

export const BS_EXACT = {
  tallyBalanced: `Balance Sheet TALLIES.Let us know what these numbers say`,
  tallyUnbalanced: `Balance Sheet DOES NOT TALLY. Results would be faulty. Check input data!`,
  scenarioGreen: `Liquidity buffers are adequate-Capital structure is stable-Business is growth ready. Now focus on scaling, efficiency and reserves`,
  analyticsGreen: `Financial signals indicate a validated and stable business model. Cash flows are predictable, burn is controlled, and the runway provides strategic flexibility.`,
  analyticsRed: `Analytics indicate a high-risk financial position characterised by rapid cash burn, short runway, and a rigid cost structure. The immediate analytical priority is cash preservation and survival.`,
  structuralRed: `Structural liquidity mismatch- High financial risk-Immediate action required, Focus on Survival, restructuring and Capital infusion`,
  action: {
    GREEN: `Focus on optimising unit economics and automate processes. This is the right stage to build cash buffers, professionalise reporting, and initiate investor-readiness discussions.`,
    AMBER: `Focus on  identifying cost leakages, improve revenue mix, and closely monitor burn trends.  Analytics here are a warning system, meant to trigger early corrective action before risk escalates`,
    RED: `All growth assumptions should be suspended in favour of survival forecasting. Cost–benefit analysis must justify every penny spent. To extend surivival runway, consider cost reduction and bridge funding`,
  },
};

export const BURN_EXACT = {
  fieldWhat: {
    "Fixed Expenses": `Salaries, rent, admin costs, software subscriptions, insurance`,
    "Variable Expenses": `Raw materials, delivery costs, commissions, payment gateway fees`,
    "Total Expenses": `Fixed Expenses + Variable Expenses`,
    "Recurring Revenue": `Subscriptions, retainers, AMC, SaaS fees`,
    "Miscll. revenue": `Project fees, grants, interest, asset sale`,
    "Total Revenue": `Recurring Revenue + Miscellaneous Revenue`,
    "Net Profit/Loss": `Total Revenue – Total Expenses`,
    "Cumulative Cash": `Opening Cash + Net Profit/Loss – Capex – Loan repayments`,
    "Gross Burn": `Total Expenses (monthly)`,
    "Net Burn": `Total Expenses – Total Revenue`,
    "Avg Net Burn (to date)": `Sum of Net Burn ÷ Number of months`,
    "Net Burn Ratio": `Net Burn ÷ Total Revenue`,
    "Recurring Revenue ratio": `Recurring Revenue ÷ Total Revenue`,
    "Variable Cost Ratio": `Variable Expenses ÷ Total Revenue`,
    "Fixed expenses Ratio": `Fixed Expenses / Total Revenue`,
    "Runway (months)": `Cumulative Cash ÷ Avg Net Burn`,
  },
  fieldWhy: {
    "Fixed Expenses": `Indicates operating leverage and break-even pressure`,
    "Variable Expenses": `Indicates scalability efficiency`,
    "Total Expenses": `Overall cost discipline indicator`,
    "Recurring Revenue": `Business stability & valuation strength`,
    "Miscll. revenue": `Revenue volatility risk`,
    "Total Revenue": `Core top-line performance`,
    "Net Profit/Loss": `Profit or Loss!
A loss-making business  with improving net burn can be acceptable`,
    "Cumulative Cash": `Survival Indicator-
Shows how long the business can breathe`,
    "Gross Burn": `Cash Outflow Speed-
Shows cost appetite`,
    "Net Burn": `Actual cash erosion per month-
If negative cash is increasing.
A profitable business with high net burn is dangerous`,
    "Avg Net Burn (to date)": `Trend Stability-
Used for runway calculation`,
    "Net Burn Ratio": `For every $100 I earn, how much cash am I losing`,
    "Recurring Revenue ratio": `Measures revenue quality, not just revenue size.
High recurring revenue reduces stress, burn, and founder dependency`,
    "Variable Cost Ratio": `A unit-economics efficiency indicator`,
    "Fixed expenses Ratio": `How heavy is my permanent monthly burden?
Measures risk during downturns.`,
    "Runway (months)": `Time before Cash exhaustion-
Runway tells you how much time you have to fix mistakes`,
  },
  classification: {
    GREEN: {
      overall: `Good Job-Above-par financial performance with predictable recurring revenue, controlled cash burn, efficient cost structure, and a comfortable runway- Sure signs of stability and growth.`,
      guidance: [
        `Business model is validated and financially healthy. Focus on disciplined scaling, strengthening processes, building cash reserves and Prioritise high-ROI growth spends. You can initiate investor-readiness discussions for reinvesting in growth.`,
      ],
    },
    AMBER: {
      overall: `“The business is running, but warning lights are on. If corrective action is not taken now, it may slide into danger.”`,
      guidance: [
        `“Some income repeats, some doesn’t. Revenue is uncertain.”`,
      ],
    },
    RED: {
      overall: `Alarm zone. Cash burn is high, runway is limited, or rigid fixed costs are dominating. Insufficient revenue traction.`,
      guidance: [
        `Sustainability is at risk. Immediate corrective action is required. Rationalise; Eliminate all non-essential costs, pause expansion, focus on fast-revenue cycles. Do strategic restructuring to extend survival runway. Focus on survival before growth.`,
      ],
    },
  },
};

export const BREAK_EVEN_EXACT = {
  pricePerUnit: { question: `How can we increase price?`, what: `The selling price charged to the customer for one unit of the product or service. E.g price of one product / one subscription` },
  variableCostPerUnit: { question: `How can we reduce Variable Cost?`, what: `The cost that increases directly with each unit sold. These costs occur only when you produce or sell a unit. E.g. cost of manufacturing one product / unit` },
  fixedCostMonthly: { question: `How can we control Fixed Cost?`, what: `Costs that do not change with the number of units sold. They exist even if sales are zero. E.g Salaries, rent etc` },
  contributionPerUnit: { question: `Price per unit - Variable Cost`, what: `This is the amount each sale contributes toward covering fixed costs and profit. Every time you sell one unit, you recover ₹1000 of fixed costs.` },
  breakEvenUnits: { question: `Fixed Cost / Contirbution Per Unit`, what: `Number of units you must sell to cover all fixed costs.` },
  breakEvenRevenue: { question: `Break-even units x Price per unit`, what: `The business must generate ₹4.5 lakh revenue to cover all costs.` },
};

export const VIABILITY_EXACT: Record<string, Record<string, { meaning: string; mentoring: string }>> = {
  "Contribution Margin %": {
    GREEN: { meaning: `Strong unit economics. Each sale contributes significantly toward covering fixed costs.`, mentoring: `Focus on scaling sales and customer acquisition. Maintain pricing discipline.` },
  },
  "Net Profit Margin %": {
    RED: { meaning: `Business is close to profitability but fixed costs are still high relative to revenue.`, mentoring: `Improve operational efficiency and increase sales volume to cross profitability threshold. Immediate focus required on cost restructuring, revenue acceleration, or pivoting the business model.` },
  },
  "Break-even Utilisation %": {
    GREEN: { meaning: `Business reaches break-even well below full capacity, indicating strong operating leverage.`, mentoring: `Focus on expanding market reach and scaling production.` },
  },
  "Margin of Safety %": {
    RED: { meaning: `Business has limited tolerance for sales fluctuations.`, mentoring: `Strengthen sales pipeline and diversify revenue sources.` },
  },
};

export const UE_EXACT = {
  fieldWhat: {
    "Sales Revenue": `Total revenue earned during the month from all customers. This is the primary indicator of market acceptance and pricing effectiveness.`,
    "Marketing Spend": `Total amount spent on acquiring customers during the month (ads, campaigns, commissions, promotions).`,
    "Customers at the beginning": `Number of active customers carried forward from the previous month.`,
    "New Customers": `Customers acquired during the month through marketing, sales, referrals, or partnerships.`,
    "Churned Customers": `Customers who stopped using or paying during the month.`,
    "Total Customers": `Closing customer base for the month after accounting for new and churned customers.`,
    "Total Active Customers (Monthly": `Average number of months a customer stays active before churning.`,
    "CAC": `Average cost incurred to acquire one new customer.`,
    "LTV": `Total gross profit expected from a customer over their entire relationship.`,
    "ARPU- Average Revenue Per User / Unit (Monthly)": `Average monthly revenue generated per active customer.`,
    "CAC Payback Period (Months)": `Number of months required to recover customer acquisition cost from gross profits.`,
    "Churn Rate %": `Percentage of customers lost during the month relative to opening customers.`,
    "Growth Rate %": `Net customer growth rate after accounting for churn.`,
  },
  fieldWhy: {
    "Sales Revenue": `Revenue growth validates demand. Flat or declining revenue signals weak product–market fit or pricing issues.`,
    "Marketing Spend": `Marketing spend is only healthy when it converts into customers efficiently. High spend without customer growth destroys capital.`,
    "Customers at the beginning": `This is the base used to measure churn and growth. A shrinking base indicates retention problems.`,
    "New Customers": `Shows demand generation strength. Must be evaluated together with CAC and churn, not in isolation.`,
    "Churned Customers": `Churn reflects product value, service quality, and customer satisfaction. High churn negates growth.`,
    "Total Customers": `Indicates whether the business is expanding or shrinking in absolute terms.`,
    "Total Active Customers (Monthly": `Ensures ARPU is calculated fairly and not overstated.`,
    "CAC": `CAC determines how expensive growth is. Lower CAC improves scalability and investor confidence.`,
    "LTV": `LTV defines how valuable a customer truly is. It must comfortably exceed CAC for sustainability.`,
    "ARPU- Average Revenue Per User / Unit (Monthly)": `Higher ARPU improves profitability and reduces dependence on aggressive customer acquisition.`,
    "CAC Payback Period (Months)": `Shorter payback improves cash flow and reduces capital risk.`,
    "Churn Rate %": `High churn means the business is leaking value and must fix retention before scaling.`,
    "Growth Rate %": `Shows true expansion momentum. Growth without retention is unsustainable.`,
  },
  ragCommentary: {
    "CAC": {
      GREEN: `Acquisition efficient. Marketing spend is converting well into customers.`,
      RED: `CAC too high. Revisit channels, targeting and messaging.`,
    },
    "LTV": {
      RED: `LTV too low relative to CAC. Model not sustainable.`,
      GREEN: `Strong unit economics. Customers generate high lifetime value.`,
      AMBER: `Unit economics viable but need improvement.`,
    },
    "ARPU- Average Revenue Per User / Unit (Monthly)": {
      GREEN: `Monetisation improving. Customer value per user is rising.`,
      AMBER: `Monetisation stable but not improving.`,
      RED: `Falling ARPU. Pricing, discounts or customer quality issues.`,
    },
    "CAC Payback Period (Months)": {
      AMBER: `Acceptable recovery period.`,
      GREEN: `Capital recovers fast. Strong cash discipline.`,
      RED: `Slow recovery. Cash stress likely.`,
    },
    "Churn Rate %": {
      RED: `Leaky bucket. Fix retention before scaling.`,
      AMBER: `Retention needs work.`,
      GREEN: `Strong customer stickiness.`,
    },
    "Growth Rate %": {
      GREEN: `Healthy growth momentum.`,
      RED: `Weak growth. Business stagnating.`,
    },
  },
};

export const PITCHDECK_EXACT = {
  metricCommentary: {
    "Gross Margin": `WEAK: Low margins constrain profitable growth.`,
    "Contribution Margin": `WEAK: Contribution insufficient to fund growth.`,
    "CAC": `BEST-IN-CLASS: Customer acquisition highly efficient.`,
    "LTV": `WEAK: Limited value extraction from customers.`,
    "LTV/CAC": `WEAK: Unit economics unattractive for growth capital.`,
    "Recurring Revenue Ratio": `IMPROVING: Partial revenue stability achieved.`,
    "Net Burn": `BEST-IN-CLASS: Burn tightly controlled. Try generating more cash.`,
    "Runway (Months)": `WEAK: Funding risk within short horizon.`,
  },
  smartReportLines: [
    `Gross Margin: WEAK: Low margins constrain profitable growth.`,
    `Revenue per Customer: BEST-IN-CLASS: Strong monetisation per customer.`,
    `CAC Shock (+20%): BEST-IN-CLASS: Unit economics comfortably absorb CAC inflation.`,
    `Burn Multiple: IMPROVING: Growth efficiency acceptable but needs discipline.`,
    `Contribution Margin: WEAK: Contribution insufficient to fund growth.`,
    `Servicing Cost per Customer: WEAK: Cost-heavy service model.`,
    `Margin under Price Cut 
(-10%): BEST-IN-CLASS: Strong pricing power; margins remain healthy under pressure.`,
    `Cash Efficiency Ratio: WEAK: cash consumption not translating into revenue.`,
    `CAC: BEST-IN-CLASS: Customer acquisition highly efficient.`,
    `Revenue Growth Sensitivity: Revenue growth lacks responsiveness. Structural drivers need correction.`,
    `Runway under Revenue Drop (-20%): WEAK: Revenue shock creates immediate survival risk.`,
    `Fixed Cost Ratio: WEAK: High fixed costs reduce resilience and flexibility.`,
    `LTV: WEAK: Limited value extraction from customers.`,
    `Cost Regidity Ratio: WEAK: High operating rigidity. Fixed costs dominate, limiting scalability and increasing downside risk during revenue shocks.`,
    `Churn-adjusted LTV: BEST-IN-CLASS: Strong retention-adjusted customer value.`,
    `Survival Score: BEST-IN-CLASS: Business structurally resilient across growth cycles.`,
    `LTV/CAC: WEAK: Unit economics unattractive for growth capital.`,
    `CAC Payback (Months): BEST-IN-CLASS: Rapid capital recovery enables aggressive scaling.`,
    `Recurring Revenue Ratio: IMPROVING: Partial revenue stability achieved.`,
    `Net Burn: BEST-IN-CLASS: Burn tightly controlled. Try generating more cash.`,
    `Runway (Months): WEAK: Funding risk within short horizon.`,
  ],
  definitions: {
    revenue_that_repeats_predictably: `Revenue that repeats predictably (subscriptions, retainers, contracts).`,
    costs_that_rise_directly_with_volume: `Costs that rise directly with volume (materials, delivery, commissions).`,
    costs_that_do_not_change_immediately_with_scale: `Costs that do not change immediately with scale (rent, core salaries, software).`,
    average_duration: `Average duration (in months) a customer stays active.`,
  },
};

export const CFS_EXACT = {
  strongOverall: `🟢 Strong Cash backed profits and a strong cash conversion`,
  cfoPatInterpretation: [
    { range: `> 1.2`, colour: `🟢 Green`, meaning: `Strong cash-backed profits` },
    { range: `0.8 – 1.2`, colour: `🟡 Amber`, meaning: `Acceptable but needs monitoring` },
    { range: `0 – 0.8`, colour: `🟠 Weak Amber`, meaning: `Profits not fully converting to cash` },
    { range: `< 0`, colour: `🔴 Red`, meaning: `Profits unreliable / cash negative` },
  ],
  cfoEbitdaInterpretation: [
    { range: `> 0.8`, colour: `🟢 Green`, meaning: `Strong cash conversion` },
    { range: `0.5 – 0.8`, colour: `🟡 Amber`, meaning: `Moderate conversion` },
    { range: `0 – 0.5`, colour: `🟠 Weak Amber`, meaning: `Poor conversion` },
    { range: `< 0`, colour: `🔴 Red`, meaning: `Cash burn despite EBITDA` },
  ],
};

export const DCF_EXACT = {
  mentoringBase: `Mentoring Perspective: 
The Base Case suggests that:
I. The business fundamentals are sound.
II. Valuation upside will not emerge without conscious execution improvements
III. Management focus should shift from topline continuity to margin discipline, cash conversion, and risk reduction.
The Base Case is not a weakness, it is a diagnostic benchmark.`,
  mentoringUpside: `Mentoring Perspective: 
This valuation outcome highlights that:
I. The business has meaningful latent value
II. Management actions can materially influence valuation within a reasonable time horizon.
Focus areas should include:
I. pricing discipline
II. cost structure rationalisation
III. receivables and inventory control
IV. governance and predictability
V. The Upside Case is earned through discipline, not optimism.`,
  mentoringDownside: `Mentoring Perspective: 
This scenario does not imply failure, but highlights vulnerability:
I. Fixed cost rigidity and cash discipline become critical
II. Survival and liquidity take precedence over valuation maximisation
III. Early corrective action can prevent permanent value loss.
The Downside Case exists to protect capital, not to predict pessimism.`,
  interpretationBase: `Interpretation of Results-
The Base Case valuation represents a fair and realistic assessment of the business value today. It indicates that the business is:
I. Operationally stable.
II. Cash-generative at the current scale.
III. Neither materially over-leveraged nor structurally weak.
However, value creation in this scenario remains incremental rather than transformative.`,
  interpretationUpside: `Interpretation of Results-
The Upside Case demonstrates that valuation expansion is primarily driven by quality of execution, not aggressive assumptions.
The model indicates that:
I. Margin and cash flow improvements contribute more to value than growth alone.
II. Risk reduction has a compounding positive effect on valuation
III. Terminal value improves due to enhanced business sustainability.`,
  interpretationDownside: `Interpretation of Results-
The Downside Case illustrates how value erosion accelerates when multiple pressures act simultaneously.
The analysis shows that:
I. Cash flow stress emerges faster than revenue decline
II. Working capital expansion amplifies valuation damage
III. Increased risk perception significantly depresses long-term value.`,
};
