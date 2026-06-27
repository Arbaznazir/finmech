/**
 * Sellable standalone products — one per FINMECH-UPGRADED workbook.
 * Sub-routes (e.g. cashflow-ops) are included in the parent product, not priced separately.
 */
export const STANDALONE_PRODUCTS = [
  { slug: "income-statement", name: "Income Statement" },
  { slug: "balance-sheet", name: "Balance Sheet" },
  { slug: "burn-runway", name: "Burn & Runway Monitor" },
  {
    slug: "cash-flow-statement",
    name: "Cash Flow Statement",
    includes: ["Cashflow Operations", "Consolidated CFO"],
  },
  { slug: "break-even", name: "Break-even Model" },
  { slug: "viability-dashboard", name: "Business Viability Dashboard Pro" },
  { slug: "unit-economics", name: "Unit Economics" },
  { slug: "pitchdeck-kpis", name: "Pitch Deck KPIs" },
  { slug: "dcf-valuation", name: "DCF Valuation Model" },
  { slug: "funding-model", name: "Funding Model" },
  { slug: "cap-table", name: "Cap Table Mechanics" },
] as const;

export const STANDALONE_PRODUCT_SLUGS = new Set(
  STANDALONE_PRODUCTS.map((p) => p.slug)
);

/** Child app routes that inherit access from the parent workbook product. */
export const STANDALONE_CHILD_ACCESS: Record<string, string> = {
  "cashflow-ops": "cash-flow-statement",
  "consolidated-cfo": "cash-flow-statement",
};

export function standaloneProductParent(slug: string): string | undefined {
  return STANDALONE_CHILD_ACCESS[slug];
}

export function hasPurchasedStandalone(
  purchased: string[],
  slug: string
): boolean {
  if (purchased.includes(slug)) return true;
  const parent = standaloneProductParent(slug);
  return parent ? purchased.includes(parent) : false;
}

export const PRICING_CONSULTATION_EMAIL = "hello@finmech.in";
