# ADR 0002: Procurement ranking, comparison and credit fit

Status: accepted · 2026-11-18, revised 2026-11-19 (sections 2, 4, 5, 6) · Owner: Omar

## Context

The contractor picks suppliers for an RFQ, compares their offers and places a PO, optionally paid from a credit cap. Reviewers judge whether the platform is neutral and whether it can explain itself, so every ranking has to show its reasons. Everything below is pure TypeScript in `src/lib/procurement/` with Vitest tests; the UI only renders the results. Money is integer halalas ([ADR 0001](0001-stack.md)).

## Decision

**1. Explainable shortlist** ([`shortlist.ts`](../../src/lib/procurement/shortlist.ts), [tests](../../src/lib/procurement/shortlist.test.ts)).
- **Hard gates:** a supplier that stocks none of the requested categories, or does not deliver to the site's city, is never shortlisted. It still appears under "Not shortlisted" with its reasons.
- **Match score out of 100,** from weighted factors: category fit 20, delivers to city 15, on-time 12, fill rate 8, likely to respond 10, price vs 90-day benchmark 15 (from the supplier's past offers), credit cap 10, payment terms 5, local content 5. Each factor yields a reason with its points: "why" (✓) when it earns enough of its weight (60% for most factors; full category coverage; 50% for price), otherwise partial (–) or zero (✗).
- **No history is neutral, not bad:** a vetted supplier with fewer than 5 completed orders scores half marks on reliability and says so.
- **Slots:** 5 slots, and the top 3 are pre-ticked. One slot is reserved for the best eligible vetted newcomer. If no newcomer is eligible, the slot goes back to the ranking. The contractor decides who receives the RFQ.
- **Credit counts only when relevant:** not accepting platform credit scores zero only when the contractor wants to pay with credit.

**2. Offer comparison** ([`comparison.ts`](../../src/lib/procurement/comparison.ts), [tests](../../src/lib/procurement/comparison.test.ts)).
- **Landed cost** = goods + the supplier's delivery fee, then 15% VAT on both.
- **Benchmark flag:** price vs the 90-day benchmark for the same quantities; within ±3% is "in line".
- **Score out of 100:** cost 40, coverage 15, lead time 15 (zero if late for the required-by date), reliability 15, payment terms 10, local content 5.
- **Local content** gets a 10% preference on *evaluated* cost for ranking only; the price paid never changes.
- **Partial offers** are priced for what they can supply and scored against the benchmark for the same quantities, so supplying less never looks cheaper.
- **Blind mode:** labels ("Supplier A…") follow offer id, never price or rank.
- **Badges say what they compare** (#157): the cost badge is awarded among offers that cover every line, so it reads "Lowest cost for the whole order", and a partial offer's total says what it covers ("for 2 of 3 lines"). A cheaper partial offer next to the badge no longer looks like a contradiction.

**3. Basket split** (`suggestBasketSplit`, same files; seed scenario [`rfq_1045`](../../src/lib/procurement/seed-scenarios.test.ts)). Tries every combination of up to 3 offers and gives each line to the cheapest offer in the combination. Each supplier used adds its own delivery fee. A split is suggested only when it beats the best single full offer by at least SAR 250, or when no single offer covers everything. Placing it creates one PO per supplier.

**4. Credit fit and the draw** ([`po.ts`](../../src/lib/procurement/po.ts), [tests](../../src/lib/procurement/po.test.ts)).
- **Available is always `cap − drawn`** (`availableCredit` in [`src/domain/credit/facility.ts`](../../src/domain/credit/facility.ts)). #55 came from reading a stored `available` field that went stale; #57 stopped procurement reading it and Hana's #63 removed the field, so there is one definition for every screen.
- **Pay with credit** is allowed only if every supplier on the order accepts platform credit and the total incl. VAT fits that amount. `placePurchaseOrders` enforces this in the domain, not only in the UI.
- **Never switch payment silently** (#164, with Hana's cap fix #163). `creditEligibility` says *why* credit cannot pay: `no_cap`, `supplier_refuses` or `over_cap`. The draft explains it once, in figures, and offers only what helps: a split and a higher cap when over the cap, applying for a cap when there is none, neither when a supplier refuses credit. If credit was planned (or selected) and does not fit, nothing is preselected and Place waits until the contractor picks bank transfer; the confirmation records why credit was not used. The RFQ page does not say "you plan to pay from your cap" under "this RFQ is above it".
- **A draw is a Murabaha sale:** a flat profit rate for the tenor, shown with its APR. The financier pays the supplier directly when it invoices.
- **Who acts on a PO:** supplier accepts, dispatches and invoices; contractor confirms delivery ([`supplier-offer.ts`](../../src/lib/procurement/supplier-offer.ts)).

**5. What a reviewer can type** ([`rfq-draft.ts`](../../src/lib/procurement/rfq-draft.ts), [`number-input.ts`](../../src/lib/number-input.ts), [`supplier-offer.ts`](../../src/lib/procurement/supplier-offer.ts); #151, #156, #159, #166).
- **Bounds:** quantities are finite, above zero, at most 1,000,000 per line, and whole for bags, pieces and rolls (tonnes, m³, m and m² take decimals). Offer unit prices and delivery fees are capped at SAR 1,000,000; lead time and validity are whole days. One pure module is used by the RFQ builder and the offer validator, and the validator's English messages come from the supplier dictionary, so the Arabic cannot drift.
- **Reading inputs:** number fields are parsed from their text (`numberFromInput`), not `valueAsNumber`, which WebKit did not report reliably (typed prices were lost on Safari).
- **Offers start from the benchmark:** each unit price shows its 90-day benchmark as the placeholder, and "Start from the 90-day benchmark (sample)" fills the empty lines (typed prices are kept). The supplier still sets the price; the button only removes a blank first screen.
- **Double submit:** Confirm RFQ ignores a second click while saving (ids come from the clock); placing a second PO on an awarded RFQ is refused in the domain.

**6. Each company sees only its own orders** (#165). A supplier opens only requests it was invited to (already), and only its own purchase orders and tax invoices; a contractor only its own. Otherwise the page shows "Order not available" and renders nothing of the order. In the demo the check is against the role's persona in the browser; in production it is a server-side authorisation rule on every PO and invoice read.

## Alternatives considered

- **A single "best price" sort.** Rejected: it hides lead time, reliability and terms, and gives a supplier who undercuts but delivers late the top spot. The weighted score keeps price dominant (40) but explainable.
- **An ML or LLM ranking.** Rejected for the demo: the weights would not be explainable or reproducible, and every input is structured data. Simulated AI is used only where input is unstructured (the BOQ reader).
- **Hiding unqualified suppliers.** Rejected: showing why a supplier was excluded is what makes a neutral platform credible.
- **A greedy basket split** (cheapest per line). Rejected: it ignores extra delivery fees and can suggest a split that costs more. An exhaustive search over at most 3 suppliers is cheap for RFQ sizes.
- **Keeping a stored `available` field.** That is what caused #55; deriving it from `cap − drawn` (and removing the field, #63) removes the class of bug.
- **Falling back to bank transfer automatically when credit does not fit.** Rejected (#164): the contractor planned to pay from credit, so changing the payment method is their decision; the draft explains and waits.
- **Prefilling offer prices with the benchmark.** Rejected in favour of placeholders plus an explicit "Start from the benchmark (sample)" button: a silently prefilled price could be submitted unread.

## Consequences

- Weights are constants, easy to tune and covered by tests that check they sum to 100. A customer could configure them later.
- Exhaustive split search is exponential in offers. Fine up to ~15 offers per RFQ; beyond that, cap the candidates by score first.
- Benchmarks and supplier performance are sample data. In production they would come from the platform's own order history.
