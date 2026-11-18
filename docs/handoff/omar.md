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

## #8 RFQ upload + catalog (branch `feat/8-rfq-catalog`, stacked on `feat/9-shortlist-logic`)
- `/contractor/rfq/new` (`src/components/procurement/rfq-builder.tsx`): upload or catalog, editable
  lines, delivery and terms, confirm saves a draft RFQ to the demo store. `RfqList` on `/contractor`.
- `src/lib/procurement/boq.ts`: simulated "BOQ reader" (CSV/TXT really parsed, other files get a
  fixed sample extraction). 15 unit tests.
- Verified: tests, typecheck, lint, `next build`, both pages return 200 with the test ids.
  NOT verified: clicking through in a real browser (no browser on the server); Noor's e2e covers it.
- Each worktree needs its own `pnpm install --frozen-lockfile` (Turbopack rejects a symlinked node_modules).

## Next
- #9 shortlist UI on the draft RFQ (choose who receives it), then #11 comparison / PO / timeline,
  #10 supplier inbox and offer form.
- Test ids: `rfq-new`, `rfq-tab-upload|catalog`, `rfq-upload`, `rfq-upload-sample`, `rfq-catalog-add`,
  `rfq-line`, `rfq-line-qty`, `rfq-site`, `rfq-city`, `rfq-required-by`, `rfq-required-in-7|14|30`,
  `rfq-wants-credit`, `rfq-confirm`, `rfq-confirmed`, `rfq-id`, `rfq-row`. Still to come: `offer-row`,
  `offer-choose`, `po-place`, `po-confirmation`, `po-number`, `po-status`, `inbox-row`, `offer-submit`.
