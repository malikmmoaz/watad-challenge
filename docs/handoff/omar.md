# Handoff: Omar (procurement)

Owner of #8 RFQ/BOQ + catalog, #9 shortlist, #10 supplier portal, #11 offer comparison + PO.

## Done
- `src/lib/procurement/shortlist.ts`: explainable, credit-aware shortlist (pure). 22 unit tests.
- `src/lib/procurement/comparison.ts`: landed cost, benchmark flag, scored comparison, blind labels, basket split (pure). 34 unit tests.

## State
- Branch `feat/9-shortlist-logic`, stacked on `feat/1-scaffold` (rebase on main once #1 merges).
- Uses the shared types (`@/domain/types`, `@/domain/money`); `responsiveness` reason code and
  `ShortlistEntry.newSupplierSlot` are in the scaffold.
- On srv1041554: 66 unit tests pass (56 procurement), typecheck and lint clean.

## Next
- #8 RFQ upload (simulated BOQ parsing, labelled) and catalog picker, then #9 shortlist UI,
  #11 comparison / PO / timeline, #10 supplier inbox and offer form.
- Test ids for Noor: `rfq-upload`, `rfq-catalog-add`, `rfq-confirm`, `offer-row`, `offer-choose`,
  `po-place`, `po-confirmation`, `po-number`, `po-status`, `inbox-row`, `offer-submit`.
