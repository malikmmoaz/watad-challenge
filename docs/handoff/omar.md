# Handoff: Omar (procurement)

Owner of #8 RFQ/BOQ + catalog, #9 shortlist, #10 supplier portal, #11 offer comparison + PO.

## Done
- `src/lib/procurement/shortlist.ts`: explainable, credit-aware shortlist (pure). 22 unit tests.
- `src/lib/procurement/comparison.ts`: landed cost, benchmark flag, scored comparison, blind labels, basket split (pure). 34 unit tests.

## State
- Written against Tariq's shared types (`@/domain/types`, `@/domain/money`). Needs one extra
  `ShortlistReasonCode`: `"responsiveness"` (requested on #1).
- Tests were run in the worktree with the scaffold's dependencies; CI runs once #1 is on main.

## Next
- #8 RFQ upload (simulated BOQ parsing, labelled) and catalog picker, then #9 shortlist UI,
  #11 comparison / PO / timeline, #10 supplier inbox and offer form.
- Test ids for Noor: `rfq-upload`, `rfq-catalog-add`, `rfq-confirm`, `offer-row`, `offer-choose`,
  `po-place`, `po-confirmation`, `po-number`, `po-status`, `inbox-row`, `offer-submit`.
