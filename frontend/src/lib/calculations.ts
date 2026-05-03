export function calculateModel(
  slug: string,
  inputs: Record<string, number | string>
): Record<string, number | string> {
  const n = (key: string) => Number(inputs[key]) || 0;

  switch (slug) {
    // FREE MODELS — all use dedicated engines
    // break-even-basic uses dedicated engine (breakeven-free-model.ts)
    // costing-model uses dedicated engine (costing-free-model.ts)
    // revenue-model uses dedicated engine (revenue-free-model.ts)
    // know-your-numbers uses dedicated engine (checklist-model.ts)

    // income-statement uses dedicated engine (income-statement-model.ts)
    // std-income-statement / inv-income-statement will also use it when added

    // balance-sheet uses dedicated engine (balance-sheet-model.ts)

    // burn-runway uses dedicated engine (burn-runway-model.ts)

    // cash-flow-statement uses dedicated engine (cashflow-model.ts)

    // break-even-pro uses dedicated engine (breakeven-model.ts)

    // viability-dashboard uses dedicated engine (viability-model.ts)

    // unit-economics uses dedicated engine (unit-economics-model.ts)

    // pitchdeck-kpis uses dedicated engine (pitchdeck-model.ts)

    // dcf-valuation uses dedicated engine (dcf-model.ts)

    // funding-model uses dedicated engine (funding-model.ts)

    // cap-table uses dedicated engine (captable-model.ts)

    default:
      return { error: "Model calculation not implemented yet" };
  }
}
