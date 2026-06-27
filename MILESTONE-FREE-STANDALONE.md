# FinMech — Milestone: Free & Standalone Models

**Status:** Draft — scope & deliverables to be confirmed by client  
**Last updated:** 2026-06-20  
**Source of truth for copy & formulas:** `FINMECH-UPGRADED/`

---

## Milestone scope

This milestone covers **all Free tier models** and **all Standalone tier models** only.

| Tier | Count | Excel folder |
|------|-------|--------------|
| Free | 4 | `FINMECH-UPGRADED/1.Free Models/` |
| Standalone | 11 | `FINMECH-UPGRADED/2.Stand alone models/` |
| **Total** | **15 models** | |

**Out of scope for this milestone:** Standard tier, Investor Grade tier, pricing changes, new models.

---

## Four deliverables

### 1. Calculation accuracy (101% Excel match)

Every formula, roll-up, ratio, RAG threshold, and edge case must match the corresponding Excel workbook **exactly** — not approximate, not “close enough.”

**Rules**

- Same inputs → same outputs as Excel (to the penny / unit Excel uses).
- Monthly → quarterly → annual roll-ups must follow Excel logic.
- Status colours (GREEN / AMBER / RED) must use Excel thresholds.
- Currency: **₹** everywhere in UI, charts, tables, and PDFs.
- No app-only metrics unless explicitly approved.

**Verification method**

- [ ] Fixed test input sets per model (from Excel examples + edge cases).
- [ ] Side-by-side comparison: app output vs Excel for every key cell.
- [ ] Sign-off column in model checklist below.

---

### 2. Excel-exact outputs & copy

All on-screen results, labels, hints, advisory text, and table headers must use the **exact wording** from Excel — no AI narrative, no paraphrasing, no “Smart Results” blocks.

**Applies to**

- Input field labels & tooltips
- Result tables (column headers, row labels)
- Meaning / explanation columns
- RAG advisory comments
- PDF body text (see §4 for summary rules)

**Rules**

- Copy lives in code constants (e.g. `free-excel-content.ts`, generated Excel extracts) — not hard-coded in components ad hoc.
- Dynamic values (user’s numbers) may replace Excel **example** figures in sentences where Excel uses placeholders; wording structure stays identical.
- Graphs/charts: keep visualisations; axis labels and legends use ₹ formatting.

**Current baseline (partial)**

| Area | Status |
|------|--------|
| Free models — Excel copy constants | Started (`frontend/src/lib/free-excel-content.ts`) |
| Free PDFs — no AI narrative | Done for free tier |
| Standalone PDFs — Excel-only copy | Partial — some models still use generated advisory |
| Standalone on-screen copy | Per-model — needs audit |

---

### 3. FAQ system (admin-managed)

FAQs are **content managed by admin**, not hard-coded in the frontend.

#### 3.1 FAQ categories (hierarchy)

| Level | Scope | Example |
|-------|--------|---------|
| **Global** | Whole product | “What is FinMech?”, “How does pricing work?” |
| **Tier — general** | All models in a tier | “Free models — general”, “Standalone — general” |
| **Model — specific** | One model | “Break-Even Model — how is contribution calculated?” |

**Tiers for tier-level FAQs:** `free`, `standalone`, `standard`, `investor`  
*(Standard & Investor FAQ slots can be built now but populated later.)*

#### 3.2 Admin capabilities

Admin can:

- [ ] **Add** FAQ (question + answer)
- [ ] **Edit** question or answer
- [ ] **Remove** FAQ
- [ ] **Reorder** FAQs (optional but recommended)
- [ ] Assign FAQ to: `global` \| `tier` \| `model`
- [ ] For `tier`: pick tier slug
- [ ] For `model`: pick model slug (from `frontend/src/lib/models-data.ts`)

#### 3.3 User experience

- FAQs shown as **accordion / expandable list**
- User **clicks question** → answer expands below
- Only one open at a time (or multiple — TBD by client)
- Placement (TBD):
  - [ ] Global FAQ page
  - [ ] Per-tier section on Models page
  - [ ] Per-model page (sidebar or bottom section)

#### 3.4 Technical outline (for implementation)

**Backend**

- Table/collection: `faqs`
  - `id`, `scope` (`global` | `tier` | `model`)
  - `tierSlug?`, `modelSlug?`
  - `question`, `answer` (markdown or plain text — TBD)
  - `sortOrder`, `isPublished`
  - `createdAt`, `updatedAt`
- REST: `GET /api/faqs` (public, filtered), CRUD under `/api/admin/faqs` (admin only)

**Frontend**

- Admin tab on `/admin` — “FAQs” panel (alongside Users, Invoices, Stats, Pricing)
- Public FAQ components consume API

**Current state:** No FAQ system exists yet.

---

### 4. PDF summary (per model)

Every model’s downloadable PDF must include a **model-specific summary section** — separate content per model, not one generic block.

**Rules**

- Summary text sourced from Excel / approved copy — **not** AI-generated “Smart Results”
- Summary appears in a consistent place in every PDF (e.g. top of report or dedicated “Summary” page)
- Summary reflects **this model’s** key outputs (not cross-model narrative unless model is a hub)
- ₹ formatting, same branding as rest of PDF

**Per-model summary content (to be defined / extracted from Excel)**

| Model | Summary includes (draft — client to confirm) | Status |
|-------|-----------------------------------------------|--------|
| Revenue Model | Annual/monthly revenue, units, customer value | ☐ |
| Costing Model | Fixed vs variable split, cost per unit, total monthly cost | ☐ |
| Break-Even (Free) | BE units, BE revenue, contribution, margin of safety | ☐ |
| Know Your Numbers | Overall score, category breakdown, readiness status | ☐ |
| Income Statement | Revenue, EBITDA, PAT, key margins | ☐ |
| Balance Sheet | Total assets/liabilities, working capital, key ratios | ☐ |
| Burn & Runway | Net burn, runway months, cumulative cash, RAG | ☐ |
| Break-Even (Standalone) | Same as free + projection highlights | ☐ |
| Cash Flow Statement | CFO/CFI/CFF totals, ending cash, key ratios | ☐ |
| Business Viability Dashboard | Contribution, margins, BE, margin of safety, RAG | ☐ |
| Unit Economics | CAC, LTV, LTV/CAC, payback, churn | ☐ |
| Pitch Deck KPIs | KPI flags, RAG summary | ☐ |
| DCF Valuation | EV, equity value, WACC, terminal value | ☐ |
| Funding Model | Max deficit, funding required, contingency, final cash | ☐ |
| Cap Table | Shareholders, dilution, exit waterfall highlights | ☐ |

**Current baseline:** Some standalone PDFs include numeric summary blocks; free PDFs use Excel sections without a unified “Summary” header. Standard/Investor PDFs still use AI executive summaries — **not in this milestone**.

---

## Model inventory & checklist

Use **Status** columns: `Not started` → `In progress` → `QA` → `Done`

### Free models (4)

| # | App slug | Model name | Excel file | Calcs | Copy | PDF summary | FAQs | Notes |
|---|----------|------------|------------|-------|------|-------------|------|-------|
| 1 | `revenue-model` | Revenue Model | `Revenue Model.xlsx` | ☐ | ☐ | ☐ | ☐ | |
| 2 | `costing-model` | Costing Model | `Costing Model.xlsx` | ☐ | ☐ | ☐ | ☐ | |
| 3 | `break-even-pro` | Break-Even Model | `Break-even Model- Only calculator.xlsx` | ☐ | ☐ | ☐ | ☐ | |
| 4 | `know-your-numbers` | Know Your Business Numbers | `Know your Business Numbers.xlsx` | ☐ | ☐ | ☐ | ☐ | |

### Standalone models (11)

| # | App slug | Model name | Excel file | Calcs | Copy | PDF summary | FAQs | Notes |
|---|----------|------------|------------|-------|------|-------------|------|-------|
| 5 | `income-statement` | Income Statement | `1.Income Statement.xlsx` | ☐ | ☐ | ☐ | ☐ | |
| 6 | `balance-sheet` | Balance Sheet | `2.Balance Sheet.xlsx` | ☐ | ☐ | ☐ | ☐ | |
| 7 | `burn-runway` | Burn & Runway Monitor | `3.Burn and Runway Monitor.xlsx` | ☐ | ☐ | ☐ | ☐ | |
| 8 | `cash-flow-statement` | Cash Flow Statement | `4.Cash Flow Statement.xlsx` | ☐ | ☐ | ☐ | ☐ | |
| 9 | `break-even` | Break-Even Analysis | `5.Break-even Model.xlsx` | ☐ | ☐ | ☐ | ☐ | |
| 10 | `viability-dashboard` | Business Viability Dashboard Pro | `6.Business Viability Dashboard Pro.xlsx` | ☐ | ☐ | ☐ | ☐ | |
| 11 | `unit-economics` | Unit Economics | `7.Unit Economics Basics.xlsx` | ☐ | ☐ | ☐ | ☐ | |
| 12 | `pitchdeck-kpis` | Pitch Deck KPIs | `8.Pitchdeck KPIs.xlsx` | ☐ | ☐ | ☐ | ☐ | |
| 13 | `dcf-valuation` | DCF Valuation Model | `9.DCF Valuation Model.xlsx` | ☐ | ☐ | ☐ | ☐ | |
| 14 | `funding-model` | Funding Model | `10.Funding Model.xlsx` | ☐ | ☐ | ☐ | ☐ | |
| 15 | `cap-table` | Cap Table Mechanics | `11.Cap Table mechanics.xlsx` | ☐ | ☐ | ☐ | ☐ | |

---

## FAQ inventory (to be filled by admin / client)

### Global FAQs

| # | Question | Answer | Status |
|---|----------|--------|--------|
| 1 | | | Draft |
| 2 | | | Draft |

### Tier — Free (general)

| # | Question | Answer | Status |
|---|----------|--------|--------|
| 1 | | | Draft |

### Tier — Standalone (general)

| # | Question | Answer | Status |
|---|----------|--------|--------|
| 1 | | | Draft |

### Per-model FAQs

_Add rows per model as content is ready. One table per model or a single sheet — client preference._

**Template (repeat per model):**

#### `{model-slug}` — e.g. `revenue-model`

| # | Question | Answer | Status |
|---|----------|--------|--------|
| 1 | | | Draft |

---

## Definition of done (milestone sign-off)

- [ ] All **15 models**: calculations verified against Excel with documented test cases
- [ ] All **15 models**: on-screen copy matches Excel (no AI / Smart Results text)
- [ ] All **15 models**: PDF includes model-specific summary from approved copy
- [ ] FAQ system live: admin CRUD + public accordion UI
- [ ] At least **global + tier-general** FAQs populated (client/admin)
- [ ] Per-model FAQs: populated for models client prioritises (or all 15 — TBD)
- [ ] No regressions: navigation, ₹ charts, tier access, PDF download

---

## Client notes & additions

_Use this section to add requirements, priorities, or copy paste from Excel. Tell dev what to provide next._

```
(Add your notes here)
```

**Open questions**

1. PDF summary — exact Excel sheet/cell for each model’s summary text, or new approved copy?
2. FAQ answer format — plain text or rich text / markdown?
3. FAQ placement — dedicated `/faq` page, on model pages, both?
4. Per-model FAQs — required for all 15 at launch, or phased?
5. Break-even free vs standalone — same Excel copy or different workbooks (they are different files)?
6. Any models where app-added charts should be **removed** to match Excel only?

---

## Reference — key codebase paths

| Purpose | Path |
|---------|------|
| Model registry | `frontend/src/lib/models-data.ts` |
| Free Excel copy | `frontend/src/lib/free-excel-content.ts` |
| Free PDF | `frontend/src/lib/free-model-pdf.ts` |
| Standalone PDF | `frontend/src/lib/standalone-model-pdf.ts` |
| Shared PDF / analysis | `frontend/src/lib/pdf-analysis-shared.ts` |
| Admin dashboard | `frontend/src/app/admin/page.tsx` |
| Excel workbooks | `FINMECH-UPGRADED/` |

---

## Phased delivery (suggested)

| Phase | Focus |
|-------|--------|
| **A** | Calculation audit + fixes — all 15 models |
| **B** | Excel-exact copy — UI + results tables |
| **C** | PDF summaries — per model |
| **D** | FAQ backend + admin UI |
| **E** | FAQ public UI + content population |
| **F** | QA pass + client sign-off |

_Phase order can change based on client priority._
