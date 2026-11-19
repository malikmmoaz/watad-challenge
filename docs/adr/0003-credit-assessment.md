# ADR 0003: Credit assessment, pricing and draws

Status: accepted · 2026-11-18, updated 2026-11-19 · Owner: Hana · Issues #12, #13, #14

## Context

Contractors buy materials on credit; an independent credit manager decides who gets a credit cap and how large. The flow mirrors Abwab, Watad's credit partner: gated checks, policy rules, a score and band, approve / request more information / decline, top factors, an AI-drafted memo and a decision log. Agents prepare, humans decide. Everything here is sample data and simulated AI.

## Decision

**A pure, deterministic engine** in [`src/domain/credit`](../../src/domain/credit): no I/O, no clock (`asOf` is passed in), whole SAR inside, halalas at the boundary. Entry point `assessCase(profile, asOf)` in [`engine.ts`](../../src/domain/credit/engine.ts); tests in [`engine.test.ts`](../../src/domain/credit/engine.test.ts), [`workflow.test.ts`](../../src/domain/credit/workflow.test.ts), [`draws.test.ts`](../../src/domain/credit/draws.test.ts).

**Gated checks, cheapest first** ([`checks.ts`](../../src/domain/credit/checks.ts)): CR (SAR 0) → ZATCA VAT (5) → bank statements (15) → audited financials via Qawaem (25) → SIMAH (60, last). The first failure stops the chain and the costlier checks are not run. A failure is *adverse* (leads to decline) or *incomplete* (leads to more information requested). Revenue is cross-checked three ways: VAT-declared vs bank inflows net of 15% VAT vs financials; a gap above 15% is flagged, above 35% fails as incomplete.

**Ten weighted factors, summing to 100** ([`scorecard.ts`](../../src/domain/credit/scorecard.ts)). Each is scored 0..1 on piecewise-linear scales and carries its weight, points, why it matters, a detail line and evidence links to extracted document fields.

| Factor | Weight | Why it weighs this much |
|---|---|---|
| Liquidity | 15 | Instalments are met from cash before the project pays out |
| Payment history (SIMAH + on-platform) | 15 | Best single predictor of repaying this facility |
| Payer quality | 12 | The contractor repays when its own client pays |
| Leverage and profitability | 10 | Thin margins on heavy debt leave no cushion |
| Backlog vs capacity | 10 | Too little work, or overtrading, both stop repayment |
| WIP health | 10 | Unbilled work and overdue receivables hide losses |
| Bank cash-flow behaviour | 10 | Returned cheques and overdrawn days show real conduct |
| Concentration | 8 | One payer's delay stops everything |
| Track record and classification | 5 | Proven delivery at this size |
| Compliance and disputes | 5 | Zakat, GOSI, VAT filings and legal cases |

[`impact.ts`](../../src/domain/credit/impact.ts) shows per factor the score, band and limit at full marks and without it, so the manager sees how each factor moves the outcome.

**Bands and limit.** A ≥ 80, B ≥ 65, C ≥ 50, D below (D declines). Limit = lowest of 10% of net worth, 10% of working capital and monthly purchases × term / 30, times the band multiplier (A 1, B 0.75, C 0.5, D 0), rounded down to SAR 1,000 and never above the request.

**Policy rules** beside the score ([`engine.ts`](../../src/domain/credit/engine.ts)): decline if under 2 years trading or an unsettled SIMAH default; request more information if tenor over 90 days, Zakat or GOSI expired, or a document tamper flag; conditions if one payer is over 70% of backlog, the request exceeds the computed limit, or financials are unaudited. Proposed decision: adverse → decline; incomplete → request more information; band D or no capacity → decline; otherwise approve, with conditions if any condition rule fired.

**Murabaha pricing** ([`murabaha.ts`](../../src/domain/credit/murabaha.ts), [`money.ts`](../../src/domain/money.ts)): a flat profit rate per 30 days by band (A 1.25%, B 1.5%, C 1.9%), fixed for the facility's tenor when approved. APR = profit rate × 365 / tenor, always shown beside it (band A, 60 days: 2.5% → 15.2% APR). The markup is fixed at the sale and does not grow if payment is late. Never "interest".

**Per-PO draws and repayment** ([`draws.ts`](../../src/domain/credit/draws.ts), [`po.ts`](../../src/lib/procurement/po.ts)): each credit PO draws its VAT-inclusive total from the cap; the financier pays the supplier directly. Repaying (principal + fixed markup) releases the principal back to the cap. Available credit is always derived as cap − drawn ([`facility.ts`](../../src/domain/credit/facility.ts), #55, #63); a new approval carries existing draws over (#42).

**Simulated-AI boundary** ([`to-case.ts`](../../src/domain/credit/to-case.ts), [`workflow.ts`](../../src/domain/credit/workflow.ts)): "Run checks" plays the AI preparing the file: extracted fields with confidence, gates, scorecard, consistency, tamper flags and a drafted memo, all marked `simulated: true` and labelled in the UI. Only `decide()` sets approved, declined or more information requested. Every outcome needs a reason the contractor reads; departing from the AI proposal needs a written override reason, stored with `overrodeAi`.

**A higher cap never lowers the cap** ([`workflow.ts`](../../src/domain/credit/workflow.ts), #163). An approval replaces the contractor's facility, so an approval *below* the current cap used to cut it silently: Najd Horizon's SAR 1.5M cap fell to SAR 750k and its next purchase order no longer fitted. Now `decide()` keeps the higher of the current and the approved cap and applies the new assessment's band, Murabaha rate and conditions; draws carry over. The decision log records "Credit cap raised from X to Y SAR" or "kept at X", and `capChange()` reads it back for the contractor. The apply form starts at the current cap and only accepts more; the decision panel shows "current cap → approving" and a caution when below it. When a purchase order does not fit what is left, the PO draft says why in numbers and waits for an explicit choice (Omar, #164): credit is never dropped silently. Lowering a cap is a separate credit action, not a side effect of an approval; it is not built.

**What-if reuses the engine** ([`what-if.ts`](../../src/domain/credit/what-if.ts), #144). Five levers (VAT/bank/financials reconciled, SIMAH score, overdue receivables, returned cheques, years trading) are applied to a *copy* of the profile and `assessCase()` runs again on the same `asOf` the checks used: same rules, same bands, same limit and pricing, no second model. The panel is labelled "Simulation, not saved", never touches the case or the decision, and only appears when re-running the engine reproduces the stored score (±1), so a hand-written seed scorecard is never contradicted. Analytics record which lever moved, never its value.

**Cash flow and its annotations** ([`cashflow.ts`](../../src/domain/credit/cashflow.ts), #147). Twelve months are derived from the extracted bank figures (annual inflows, average balance, volatility, returned cheques, overdrawn days), seeded by the case id: inflows sum to the annual total and the mean closing balance is the average balance, exactly. The "simulated AI" notes are plain, tested rules over those months (a one-off inflow at least 1.5× the median month, a seasonal dip at most 0.8×, months with returned cheques, the lowest balance when overdrawn more than 15 days), each linking to the bank-statement field it rests on. They describe; they do not score: the scorecard never reads them. The time axis runs left to right with Latin digits in Arabic too (DESIGN.md).

**What the contractor sees** ([`application-tracker.tsx`](../../src/components/credit/application-tracker.tsx), #171). An approval explains itself: cap, band and Murabaha markup with APR, each with what it was (`outcomeTerms()`: the latest earlier approval for the cap and terms before, this case for after), and from when it applies. The structured reason codes are shown in plain words, split into what counted for the contractor and what held it back, above the credit manager's own note, labelled as theirs: the agents' reasons and the human's words stay distinct. While waiting, the tracker says what happens next.

**Arabic** (ADR 0005, #123, #135, #154). The engine writes its findings through a `CreditLang` (English by default, byte-identical), so the Arabic screens re-render the stored assessment rather than translating text. Latin digits and the Gregorian calendar; «٪» and «ر.س.»; never «فائدة». Dictionary tests keep Arabic credit strings free of «%» and of a full stop after an amount.

## Consequences

- Every number on screen comes from tested pure functions and traces back to a document field.
- Thresholds, weights, multipliers and rates are our assumptions for the demo, not a validated credit model; they are named constants so a risk team can change them in one place.
- An approval cannot reduce a cap; a real reduction would need its own reviewed action and notice to the contractor.
- The what-if, the cash-flow months and the "what this means for you" terms are all recomputed from the same engine and the stored profile, so they cannot drift from the scorecard; the cost is that they only exist for sample contractors with an engine profile.
- Engine profiles for the sample contractors live in [`src/data/credit-profiles.ts`](../../src/data/credit-profiles.ts); a new application from another contractor has no profile and cannot be scored.

## What a real Abwab-style integration would change

- Documents go to real extraction (OCR plus document AI) and forensics, with human review of low-confidence fields; source-of-truth pulls replace uploads where possible: Wathq for CR, ZATCA for VAT and Zakat, Qawaem for financials, GOSI, open banking (SAMA framework) for statements, and SIMAH by API with the consent recorded.
- Weights and cut-offs are calibrated on repayment outcomes and monitored for drift; the LLM drafts the memo from the structured assessment only and never sets the score.
- Approvals follow a delegated authority matrix (larger exposures to a senior manager), with an audit trail, four-eyes review of overrides and Sharia board sign-off on the Murabaha contract.
- Draws, repayments and late-payment handling move to the financier's ledger, with SIMAH reporting and collections; the store in `src/store` is replaced behind the same interface (ADR 0001).
