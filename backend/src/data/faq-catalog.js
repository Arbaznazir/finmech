/**
 * Default FAQ copy — merged when no DB rows exist for a scope.
 * Admin edits are stored in the Faq table and take precedence.
 */

import { MODELS } from './models.js';

export const FAQ_TIERS = [
  { id: 'free', label: 'Free Models' },
  { id: 'standalone', label: 'Standalone Models' },
  { id: 'standard', label: 'Standard Models' },
  { id: 'investor', label: 'Investor Grade' },
];

export const DEFAULT_FAQS = {
  global: [
    {
      question: 'What is FinMech?',
      answer:
        'FinMech is a financial modelling platform for startups and SMEs. It provides Excel-matched calculators for revenue, costing, statements, valuation, fundraising, and investor-ready reporting.',
      sortOrder: 0,
    },
    {
      question: 'How does pricing work?',
      answer:
        'Free models are available without an account. Standalone models can be purchased individually or as bundles. Standard and Investor Grade tiers unlock integrated suites with linked data across models.',
      sortOrder: 1,
    },
    {
      question: 'Do calculations match Excel?',
      answer:
        'Yes. Free and Standalone models are built to match the FINMECH Excel workbooks exactly — same inputs, formulas, and output labels.',
      sortOrder: 2,
    },
  ],
  tier: {
    free: [
      {
        question: 'Do I need an account for Free models?',
        answer: 'No. Free models are available immediately from the Models page with no sign-up required.',
        sortOrder: 0,
      },
      {
        question: 'Can I download PDF reports from Free models?',
        answer: 'Yes. After calculating, you can export a PDF summary that reflects the model outputs.',
        sortOrder: 1,
      },
    ],
    standalone: [
      {
        question: 'What makes Standalone models different?',
        answer:
          'Each Standalone model is a full professional workbook — Income Statement, DCF, Cap Table, and more — runnable independently without needing other models.',
        sortOrder: 0,
      },
      {
        question: 'Can I buy only one Standalone model?',
        answer: 'Yes. Purchase individual models or choose a bundle from the Pricing page.',
        sortOrder: 1,
      },
    ],
    standard: [
      {
        question: 'What is the Standard tier?',
        answer:
          'Standard is an integrated suite where models share data through the Common Utility hub — enter once, use across linked models.',
        sortOrder: 0,
      },
    ],
    investor: [
      {
        question: 'What is Investor Grade?',
        answer:
          'Investor Grade is the full fundraising pack — advanced DCF, cap table, funding model, business snapshot, and linked investor-ready outputs.',
        sortOrder: 0,
      },
    ],
  },
};

/** Starter per-model FAQs (empty by default — admin fills via panel) */
export function listModelsForFaqAdmin() {
  return Object.values(MODELS).map((m) => ({
    modelSlug: m.slug,
    name: m.name,
    tier: m.tier,
  }));
}

export function getDefaultFaqs(scope, { tierSlug, modelSlug } = {}) {
  if (scope === 'global') return DEFAULT_FAQS.global;
  if (scope === 'tier' && tierSlug) return DEFAULT_FAQS.tier[tierSlug] ?? [];
  return [];
}
