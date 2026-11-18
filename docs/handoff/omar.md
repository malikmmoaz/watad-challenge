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
  Browser-verified (see below).
- Each worktree needs its own `pnpm install --frozen-lockfile` (Turbopack rejects a symlinked node_modules).

## #9 shortlist UI (branch `feat/9-shortlist-ui`, stacked on `feat/8-rfq-catalog`)
- `/contractor/rfq/[id]` (`src/components/procurement/rfq-shortlist.tsx`): RFQ summary, credit cap
  panel (available cap, Murabaha markup with APR), shortlist with why / why not and points, newcomer
  slot, not-shortlisted list with reasons, blind toggle, "Send RFQ" sets status `sent` + invitees.
  Sent RFQs show the suppliers actually invited, not a recomputed shortlist.
- `priceIndexFromOffers` derives each supplier's price vs benchmark from its past offers.
- Seed: added `sup_nakheel` (vetted, 2 orders) so the reserved newcomer slot shows in the demo.
- Verified: 106 tests, typecheck, lint, build; SSR of rfq_1042 lists its 3 invitees.
- Browser walkthrough (headless Chromium via Noor's Playwright + Layla's libs, script kept out of git):
  sample BOQ -> 5 labelled lines -> confirm -> shortlist (5 rows, newcomer slot, cap) -> untick, blind,
  send -> status sent, survives reload; catalog path -> confirm -> listed on /contractor. No console errors.
  Run: LD_LIBRARY_PATH=~/watad-team/tools/chromium-libs/root/usr/lib/x86_64-linux-gnu node <script>,
  requiring ~/watad-team/wt/noor/node_modules/@playwright/test.

## Next
- #9 shortlist UI on the draft RFQ (choose who receives it), then #11 comparison / PO / timeline,
  #10 supplier inbox and offer form.
- Test ids: `shortlist-row`, `shortlist-excluded` (both with `data-supplier`), `shortlist-select`,
  `shortlist-new-slot`, `shortlist-score`, `shortlist-why`, `shortlist-why-not`, `rfq-blind-toggle`,
  `shortlist-send`, `shortlist-sent`, `rfq-status`, `credit-cap-available`, `rfq-choose-suppliers`, `rfq-new`, `rfq-tab-upload|catalog`, `rfq-upload`, `rfq-upload-sample`, `rfq-catalog-add`,
  `rfq-line`, `rfq-line-qty`, `rfq-site`, `rfq-city`, `rfq-required-by`, `rfq-required-in-7|14|30`,
  `rfq-wants-credit`, `rfq-confirm`, `rfq-confirmed`, `rfq-id`, `rfq-row`. Still to come: `offer-row`,
  `offer-choose`, `po-place`, `po-confirmation`, `po-number`, `po-status`, `inbox-row`, `offer-submit`.
