/**
 * Output fields available for Smart Result conditions (per model).
 * Admin picks from these when building rules.
 */

import { MODELS } from './models.js';

/** Free models first — standalone added in a later phase */
export const SMART_RESULT_TIERS = [
  { id: 'free', label: 'Free Models' },
  { id: 'standalone', label: 'Standalone Models' },
];

export const FREE_MODEL_OUTPUT_FIELDS = {
  'revenue-model': [
    { key: 'monthlyRevenue', label: 'Monthly Revenue', type: 'number', hint: 'Total revenue earned per month (₹).', example: '500000' },
    { key: 'annualRevenue', label: 'Annual Revenue', type: 'number', hint: 'Monthly revenue × 12 (₹).', example: '6000000' },
    { key: 'monthlyUnitsSold', label: 'Monthly Units Sold', type: 'number', hint: 'How many units are sold each month.', example: '200' },
    { key: 'pricePerUnit', label: 'Price Per Unit', type: 'number', hint: 'Selling price for one unit (₹).', example: '2500' },
    { key: 'customerLifetimeMonths', label: 'Customer Lifetime (Months)', type: 'number', hint: 'How long a customer stays active.', example: '12' },
    { key: 'monthlyPurchaseRate', label: 'Monthly Purchase Rate', type: 'number', hint: 'How often customers buy per month.', example: '0.25' },
  ],
  'costing-model': [
    { key: 'totalFixedCosts', label: 'Total Fixed Costs', type: 'number', hint: 'Rent, salaries, subscriptions — costs that don\'t change with units (₹/month).', example: '150000' },
    { key: 'totalVariableCostPerUnit', label: 'Variable Cost Per Unit', type: 'number', hint: 'Cost to make or deliver one unit (₹).', example: '800' },
    { key: 'totalVariableCost', label: 'Total Variable Cost', type: 'number', hint: 'Variable cost × units sold (₹/month).', example: '160000' },
    { key: 'totalMonthlyCost', label: 'Total Monthly Cost', type: 'number', hint: 'Fixed + variable costs combined (₹/month).', example: '310000' },
    { key: 'unitsSold', label: 'Units Sold', type: 'number', hint: 'Units sold in the simulation.', example: '200' },
  ],
  'break-even-pro': [
    { key: 'breakEvenUnits', label: 'Break-even Units', type: 'number', hint: 'Units you must sell to cover all costs.', example: '500' },
    { key: 'breakEvenRevenue', label: 'Break-even Revenue', type: 'number', hint: 'Revenue needed to break even (₹).', example: '1250000' },
    { key: 'contributionPerUnit', label: 'Contribution Per Unit', type: 'number', hint: 'Price minus variable cost — profit per unit before fixed costs (₹).', example: '1200' },
    { key: 'profitAtUnits', label: 'Profit at Units', type: 'number', hint: 'Profit or loss at the units you entered (₹).', example: '50000' },
    { key: 'revenueAtUnits', label: 'Revenue at Units', type: 'number', hint: 'Revenue at the units you entered (₹).', example: '600000' },
    { key: 'isProfitable', label: 'Is Profitable', type: 'boolean', hint: 'Yes if profit at entered units is positive.', example: 'true' },
    { key: 'status', label: 'Status', type: 'text', hint: 'GREEN = profitable at entered units, RED = loss.', example: 'GREEN' },
  ],
  'break-even-basic': [
    { key: 'breakEvenUnits', label: 'Break-even Units', type: 'number', hint: 'Units you must sell to cover all costs.', example: '500' },
    { key: 'breakEvenRevenue', label: 'Break-even Revenue', type: 'number', hint: 'Revenue needed to break even (₹).', example: '1250000' },
    { key: 'contributionPerUnit', label: 'Contribution Per Unit', type: 'number', hint: 'Price minus variable cost (₹).', example: '1200' },
    { key: 'profitAtUnits', label: 'Profit at Units', type: 'number', hint: 'Profit or loss at entered units (₹).', example: '50000' },
  ],
  'know-your-numbers': [
    { key: 'readinessPercentage', label: 'Readiness %', type: 'number', hint: 'Overall finance readiness score (0–100%).', example: '75' },
    { key: 'totalScore', label: 'Total Score', type: 'number', hint: 'Points scored across all questions.', example: '18' },
    { key: 'maxPossible', label: 'Max Possible Score', type: 'number', hint: 'Maximum points achievable.', example: '24' },
    { key: 'readinessStatus', label: 'Readiness Status', type: 'text', hint: 'Label like Strong, Developing, or Needs Work.', example: 'Strong' },
    { key: 'statusColor', label: 'Status Color', type: 'text', hint: 'green, amber, or red — traffic-light health.', example: 'green' },
  ],
};

/** Plain-English comparison options shown in admin (mapped to operator ids) */
export const SIMPLE_COMPARISONS = {
  number: [
    { id: 'gt', label: 'is above' },
    { id: 'gte', label: 'is at least' },
    { id: 'lt', label: 'is below' },
    { id: 'lte', label: 'is at most' },
    { id: 'eq', label: 'is exactly' },
    { id: 'between', label: 'is between' },
  ],
  boolean: [
    { id: 'eq_true', label: 'is Yes (profitable / true)' },
    { id: 'eq_false', label: 'is No (not profitable / false)' },
  ],
  text: [
    { id: 'eq', label: 'is exactly' },
    { id: 'contains', label: 'contains' },
    { id: 'neq', label: 'is not' },
  ],
};

export const OPERATORS = [
  { id: 'gt', label: 'Greater than (>)' },
  { id: 'gte', label: 'Greater or equal (≥)' },
  { id: 'lt', label: 'Less than (<)' },
  { id: 'lte', label: 'Less or equal (≤)' },
  { id: 'eq', label: 'Equals (=)' },
  { id: 'neq', label: 'Not equal (≠)' },
  { id: 'between', label: 'Between (inclusive)' },
  { id: 'contains', label: 'Text contains' },
];

export const PRESET_COLORS = [
  { id: '#16a34a', label: 'Green' },
  { id: '#d97706', label: 'Amber' },
  { id: '#dc2626', label: 'Red' },
  { id: '#2563eb', label: 'Blue' },
  { id: '#7c3aed', label: 'Purple' },
  { id: '#0f172a', label: 'Dark' },
];

/** One-click starters — admin can pick, tweak message, and save */
export const SMART_RESULT_TEMPLATES = {
  'revenue-model': [
    {
      id: 'strong-annual',
      title: 'Strong annual revenue',
      description: 'When annual revenue crosses ₹10 lakh',
      message: 'Strong revenue signal — annual revenue exceeds ₹10 lakh. Ensure your cost structure scales with growth.',
      color: '#16a34a',
      combineMode: 'all',
      conditions: [{ field: 'annualRevenue', op: 'gt', value: 1000000 }],
    },
    {
      id: 'low-lifetime',
      title: 'Short customer lifetime',
      description: 'When customers stay less than 6 months',
      message: 'Short customer lifetime — focus on retention. Even a small improvement in lifetime significantly increases revenue.',
      color: '#d97706',
      combineMode: 'all',
      conditions: [{ field: 'customerLifetimeMonths', op: 'lt', value: 6 }],
    },
    {
      id: 'healthy-lifetime',
      title: 'Healthy retention',
      description: 'When customer lifetime is 12+ months',
      message: 'Healthy retention — a 12+ month customer lifetime suggests solid product-market fit.',
      color: '#16a34a',
      combineMode: 'all',
      conditions: [{ field: 'customerLifetimeMonths', op: 'gte', value: 12 }],
    },
  ],
  'costing-model': [
    {
      id: 'high-fixed',
      title: 'High fixed costs',
      description: 'When fixed costs exceed ₹2 lakh/month',
      message: 'Fixed costs are high — every extra unit sold after break-even contributes more to profit. Focus on volume.',
      color: '#d97706',
      combineMode: 'all',
      conditions: [{ field: 'totalFixedCosts', op: 'gt', value: 200000 }],
    },
    {
      id: 'high-unit-cost',
      title: 'High variable cost per unit',
      description: 'When variable cost per unit is above ₹1,000',
      message: 'Variable cost per unit is high — review raw materials, packaging, and delivery costs.',
      color: '#dc2626',
      combineMode: 'all',
      conditions: [{ field: 'totalVariableCostPerUnit', op: 'gt', value: 1000 }],
    },
  ],
  'break-even-pro': [
    {
      id: 'profitable',
      title: 'Profitable',
      whenLabel: 'When the user makes a profit',
      description: 'When the scenario shows a profit',
      message: 'Profitable at your entered sales volume — you are above break-even. Monitor contribution margin as you scale.',
      color: '#16a34a',
      combineMode: 'all',
      conditions: [{ field: 'isProfitable', op: 'eq', value: true }],
    },
    {
      id: 'not-profitable',
      title: 'Not profitable',
      whenLabel: 'When the user is still making a loss',
      description: 'When the scenario shows a loss',
      message: 'Not yet profitable at entered units — you need more sales or lower costs to reach break-even.',
      color: '#d97706',
      combineMode: 'all',
      conditions: [{ field: 'isProfitable', op: 'eq', value: false }],
    },
    {
      id: 'status-green',
      title: 'Status is green',
      whenLabel: 'When status shows GREEN',
      description: 'When status shows GREEN',
      message: 'GREEN status — your entered volume covers costs. Good foundation to build from.',
      color: '#16a34a',
      combineMode: 'all',
      conditions: [{ field: 'status', op: 'eq', value: 'GREEN' }],
    },
    {
      id: 'high-be-units',
      title: 'High break-even',
      whenLabel: 'When break-even is above 1,000 units',
      description: 'When break-even units exceed 1,000',
      message: 'Break-even requires many units — consider raising price or reducing fixed costs to lower the threshold.',
      color: '#d97706',
      combineMode: 'all',
      conditions: [{ field: 'breakEvenUnits', op: 'gt', value: 1000 }],
    },
  ],
  'break-even-basic': [
    {
      id: 'profitable-basic',
      title: 'Profitable at entered units',
      description: 'When profit at units is positive',
      message: 'Profitable at your entered sales volume — you are above break-even.',
      color: '#16a34a',
      combineMode: 'all',
      conditions: [{ field: 'profitAtUnits', op: 'gt', value: 0 }],
    },
    {
      id: 'loss-basic',
      title: 'Loss at entered units',
      description: 'When profit at units is negative',
      message: 'Still below break-even at entered units — increase sales or reduce costs.',
      color: '#d97706',
      combineMode: 'all',
      conditions: [{ field: 'profitAtUnits', op: 'lt', value: 0 }],
    },
  ],
  'know-your-numbers': [
    {
      id: 'ready-green',
      title: 'Strong readiness (green)',
      description: 'When status color is green',
      message: 'Strong finance readiness — you have solid foundations. Keep tracking key numbers monthly.',
      color: '#16a34a',
      combineMode: 'all',
      conditions: [{ field: 'statusColor', op: 'eq', value: 'green' }],
    },
    {
      id: 'needs-work',
      title: 'Needs work (red)',
      description: 'When status color is red',
      message: 'Finance readiness needs attention — review the checklist gaps and prioritise the lowest-scoring areas.',
      color: '#dc2626',
      combineMode: 'all',
      conditions: [{ field: 'statusColor', op: 'eq', value: 'red' }],
    },
    {
      id: 'amber-zone',
      title: 'Developing (amber)',
      description: 'When readiness is between 50% and 75%',
      message: 'Developing readiness — you are on the right track. Close the remaining gaps to reach strong status.',
      color: '#d97706',
      combineMode: 'all',
      conditions: [{ field: 'readinessPercentage', op: 'between', value: 50, value2: 75 }],
    },
  ],
};

/** Inner pages shown as "Parent Name (Page Name)" in admin */
export const MODEL_PAGE_GROUPS = {
  'cash-flow-statement': {
    parentName: 'Cash Flow Statement',
    pages: [
      { slug: 'cashflow-ops', pageName: 'Cashflow Operations' },
      { slug: 'consolidated-cfo', pageName: 'Consolidated CFO' },
    ],
  },
  'cap-table': {
    parentName: 'Cap Table Mechanics',
    pages: [
      { slug: 'cap-table', pageName: 'Rounds & Simulation' },
      { slug: 'cap-table-format', pageName: 'Original & Dilution' },
      { slug: 'cap-table-exit', pageName: 'Exit Waterfall' },
    ],
  },
};

export const STANDALONE_MODEL_OUTPUT_FIELDS = {
  'income-statement': [
    { key: 'derived.grossMarginAnnual', label: 'Gross Margin % (Annual)', type: 'number', hint: 'Annual gross margin percentage.', example: '45' },
    { key: 'derived.ebitdaMarginAnnual', label: 'EBITDA Margin % (Annual)', type: 'number', example: '18' },
    { key: 'derived.netMarginAnnual', label: 'Net Margin % (Annual)', type: 'number', example: '12' },
    { key: 'status.rag', label: 'Overall RAG Status', type: 'text', hint: 'GREEN, AMBER, or RED.', example: 'GREEN' },
  ],
  'balance-sheet': [
    { key: 'status.rag', label: 'Overall RAG Status', type: 'text', example: 'GREEN' },
    { key: 'derived.currentRatioAnnual', label: 'Current Ratio (Annual)', type: 'number', example: '1.5' },
    { key: 'derived.debtEquityAnnual', label: 'Debt / Equity (Annual)', type: 'number', example: '0.8' },
  ],
  'burn-runway': [
    { key: 'insights.healthScore', label: 'Health Score', type: 'number', hint: '0–100 burn & runway health.', example: '70' },
    { key: 'insights.classification', label: 'Classification', type: 'text', example: 'GREEN' },
    { key: 'insights.runwayTrend', label: 'Runway Trend', type: 'text', example: 'declining' },
    { key: 'insights.cashOutlook', label: 'Cash Outlook', type: 'text', example: 'adequate' },
  ],
  'break-even': [
    { key: 'breakEvenUnits', label: 'Break-even Units', type: 'number', example: '500' },
    { key: 'contributionMargin', label: 'Contribution Margin %', type: 'number', example: '40' },
    { key: 'insights.healthScore', label: 'Health Score', type: 'number', example: '75' },
    { key: 'insights.difficulty', label: 'Difficulty', type: 'text', example: 'moderate' },
  ],
  'cashflow-ops': [
    { key: 'summary.totalNetCashFlow', label: 'Total Net Cash Flow', type: 'number', example: '250000' },
    { key: 'summary.finalEndingCash', label: 'Final Ending Cash', type: 'number', example: '500000' },
  ],
  'consolidated-cfo': [
    { key: 'summary.overallPatBand', label: 'CFO/PAT Band', type: 'text', hint: 'green, amber, weak-amber, or red.', example: 'green' },
    { key: 'summary.finalEndingCash', label: 'Final Ending Cash', type: 'number', example: '400000' },
    { key: 'summary.avgCfoPat', label: 'Avg CFO/PAT Ratio', type: 'number', example: '1.2' },
  ],
  'viability-dashboard': [
    { key: 'insights.healthScore', label: 'Health Score', type: 'number', example: '80' },
    { key: 'insights.viabilityLevel', label: 'Viability Level', type: 'text', example: 'strong' },
    { key: 'netProfitLoss', label: 'Net Profit / Loss', type: 'number', example: '50000' },
    { key: 'marginOfSafetyPct', label: 'Margin of Safety %', type: 'number', example: '25' },
    { key: 'contributionStatus', label: 'Contribution Status', type: 'text', example: 'GREEN' },
  ],
  'unit-economics': [
    { key: 'insights.healthScore', label: 'Health Score', type: 'number', example: '72' },
    { key: 'insights.ltvCacRatio', label: 'LTV/CAC Ratio', type: 'number', example: '3.5' },
    { key: 'insights.overall', label: 'Overall Status Text', type: 'text', example: 'Healthy unit economics' },
  ],
  'pitchdeck-kpis': [
    { key: 'insights.healthScore', label: 'Health Score', type: 'number', example: '68' },
    { key: 'insights.overall', label: 'Overall KPI Status', type: 'text', example: 'Investor-ready' },
    { key: 'summary.grossMargin', label: 'Gross Margin %', type: 'number', example: '65' },
  ],
  'dcf-valuation': [
    { key: 'enterpriseValue', label: 'Enterprise Value', type: 'number', example: '25000000' },
    { key: 'equityValue', label: 'Equity Value', type: 'number', example: '24000000' },
    { key: 'valuePerShare', label: 'Value Per Share', type: 'number', example: '24' },
    { key: 'wacc.wacc', label: 'WACC %', type: 'number', example: '12' },
  ],
  'funding-model': [
    { key: 'summary.fundingRequired', label: 'Funding Required', type: 'number', example: '1500000' },
    { key: 'summary.maxCashDeficit', label: 'Max Cash Deficit', type: 'number', example: '-800000' },
    { key: 'summary.finalCash', label: 'Final Cash', type: 'number', example: '200000' },
    { key: 'summary.totalEBITDA', label: 'Total EBITDA', type: 'number', example: '1200000' },
  ],
  'cap-table': [
    { key: 'founderOwnershipPct', label: 'Founder Ownership %', type: 'number', example: '55' },
    { key: 'investorOwnershipPct', label: 'Investor Ownership %', type: 'number', example: '35' },
    { key: 'totalDilutionPct', label: 'Total Dilution %', type: 'number', example: '25' },
  ],
  'cap-table-format': [
    { key: 'postMoneyValuation', label: 'Post-money Valuation', type: 'number', example: '8000000' },
    { key: 'promoterHoldingPct', label: 'Promoter Holding %', type: 'number', example: '60' },
    { key: 'investorHoldingPct', label: 'Investor Holding %', type: 'number', example: '40' },
  ],
  'cap-table-exit': [
    { key: 'totalProceeds', label: 'Total Exit Proceeds', type: 'number', example: '30000000' },
    { key: 'founderProceeds', label: 'Founder Proceeds', type: 'number', example: '15000000' },
    { key: 'investorProceeds', label: 'Investor Proceeds', type: 'number', example: '12000000' },
  ],
};

const STANDALONE_TEMPLATES = {
  'burn-runway': [
    {
      id: 'burn-green',
      title: 'Healthy burn (GREEN)',
      whenLabel: 'When classification is GREEN',
      description: 'Strong burn & runway profile',
      message: 'Healthy burn profile — recurring revenue and runway are in a strong zone. Keep monitoring monthly.',
      color: '#16a34a',
      combineMode: 'all',
      conditions: [{ field: 'insights.classification', op: 'eq', value: 'GREEN' }],
    },
    {
      id: 'burn-critical',
      title: 'Critical runway',
      whenLabel: 'When runway trend is critical',
      description: 'Less than 3 months runway trend',
      message: 'Critical runway — act now on fundraising or cost reduction. Less than 3 months of cash at current burn.',
      color: '#dc2626',
      combineMode: 'all',
      conditions: [{ field: 'insights.runwayTrend', op: 'eq', value: 'critical' }],
    },
  ],
  'viability-dashboard': [
    {
      id: 'viability-strong',
      title: 'Strong viability',
      whenLabel: 'When viability is strong',
      description: 'Health score 80+',
      message: 'Strong business viability — contribution, margins, and break-even position look healthy.',
      color: '#16a34a',
      combineMode: 'all',
      conditions: [{ field: 'insights.viabilityLevel', op: 'eq', value: 'strong' }],
    },
    {
      id: 'viability-weak',
      title: 'Weak viability',
      whenLabel: 'When viability is weak or critical',
      description: 'Needs urgent attention',
      message: 'Viability needs attention — review contribution margin, fixed costs, and units sold assumptions.',
      color: '#dc2626',
      combineMode: 'all',
      conditions: [{ field: 'insights.viabilityLevel', op: 'eq', value: 'weak' }],
    },
  ],
  'break-even': [
    {
      id: 'be-hard',
      title: 'Hard to break even',
      whenLabel: 'When break-even is very challenging',
      description: 'High break-even difficulty',
      message: 'Break-even is challenging — consider raising price, cutting fixed costs, or increasing volume targets.',
      color: '#d97706',
      combineMode: 'all',
      conditions: [{ field: 'insights.difficulty', op: 'eq', value: 'very-hard' }],
    },
  ],
  'consolidated-cfo': [
    {
      id: 'cfo-green',
      title: 'Strong CFO/PAT',
      whenLabel: 'When CFO/PAT band is green',
      description: 'Healthy cash conversion',
      message: 'Strong CFO/PAT ratio — cash generation is healthy relative to profit.',
      color: '#16a34a',
      combineMode: 'all',
      conditions: [{ field: 'summary.overallPatBand', op: 'eq', value: 'green' }],
    },
    {
      id: 'cfo-red',
      title: 'Weak CFO/PAT',
      whenLabel: 'When CFO/PAT band is red',
      description: 'Cash conversion concern',
      message: 'Weak CFO/PAT — profits are not converting to cash well. Review receivables, payables, and working capital.',
      color: '#dc2626',
      combineMode: 'all',
      conditions: [{ field: 'summary.overallPatBand', op: 'eq', value: 'red' }],
    },
  ],
  'income-statement': [
    {
      id: 'is-green',
      title: 'Strong margins (GREEN)',
      whenLabel: 'When overall status is GREEN',
      description: 'Healthy P&L margins',
      message: 'Strong margin profile — gross, EBITDA, and net margins are in a healthy range.',
      color: '#16a34a',
      combineMode: 'all',
      conditions: [{ field: 'status.rag', op: 'eq', value: 'GREEN' }],
    },
  ],
  'funding-model': [
    {
      id: 'funding-needed',
      title: 'Funding gap',
      whenLabel: 'When funding required is above ₹10 lakh',
      description: 'Material funding need',
      message: 'A funding gap exists — plan your raise to cover the maximum cash deficit plus contingency.',
      color: '#d97706',
      combineMode: 'all',
      conditions: [{ field: 'summary.fundingRequired', op: 'gt', value: 1000000 }],
    },
  ],
};

const ALL_OUTPUT_FIELDS = {
  ...FREE_MODEL_OUTPUT_FIELDS,
  ...STANDALONE_MODEL_OUTPUT_FIELDS,
};

const ALL_TEMPLATES = {
  ...SMART_RESULT_TEMPLATES,
  ...STANDALONE_TEMPLATES,
};

function resolveDisplayName(slug) {
  for (const group of Object.values(MODEL_PAGE_GROUPS)) {
    const page = group.pages.find((p) => p.slug === slug);
    if (page) return `${group.parentName} (${page.pageName})`;
  }
  const m = MODELS[slug];
  return m?.name ?? slug;
}

function slugToLabel(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function listFreeModels() {
  return Object.keys(FREE_MODEL_OUTPUT_FIELDS).map((slug) => {
    const m = MODELS[slug];
    const name = m?.name ?? slugToLabel(slug);
    return {
      modelSlug: slug,
      name,
      displayName: name,
      tier: 'free',
      outputFields: FREE_MODEL_OUTPUT_FIELDS[slug],
    };
  });
}

function listStandaloneModels() {
  return Object.keys(STANDALONE_MODEL_OUTPUT_FIELDS)
    .map((slug) => ({
      modelSlug: slug,
      name: MODELS[slug]?.name ?? slug,
      displayName: resolveDisplayName(slug),
      tier: 'standalone',
      outputFields: STANDALONE_MODEL_OUTPUT_FIELDS[slug],
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function listModelsForSmartResultAdmin(tierFilter) {
  if (tierFilter === 'free') return listFreeModels();
  if (tierFilter === 'standalone') return listStandaloneModels();
  return [...listFreeModels(), ...listStandaloneModels()];
}

export function getOutputFieldsForModel(modelSlug) {
  return ALL_OUTPUT_FIELDS[modelSlug] ?? [];
}

export function getTemplatesForModel(modelSlug) {
  return ALL_TEMPLATES[modelSlug] ?? [];
}
