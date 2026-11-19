# Handoff: Omar (procurement)

Owner of #8 RFQ/BOQ + catalog, #9 shortlist, #10 supplier portal, #11 offer comparison + PO.

## Current state (19 Nov, 06:20 UTC). Read this first; the sections below are history.
- **All merged, nothing open.** Decisions are in [ADR 0002](../adr/0002-procurement-ranking.md) (ranking, comparison,
  credit at PO, inputs, access) and [ADR 0006](../adr/0006-tax-invoice-zatca-qr.md) (tax invoice, ZATCA Phase 1 QR).
- **Tonight, after the Arabic train (#109 to #137):**
  - #140 cross-role activity feed (bell in `RoleNav`, `src/lib/activity/feed.ts`); #148 its analytics events.
  - #146 printable PO and simplified tax invoice with the ZATCA Phase 1 QR (`src/lib/invoice/zatca-qr.ts`);
    #150 bilingual title; #155 invoice lines as cards on phones.
  - #151 input hardening (`src/lib/procurement/rfq-draft.ts`); #152 coverage report in CI (report only);
    #156 offer errors read from the supplier dictionary.
  - #157 comparison clarity; #158 Latin digits in seed Arabic names and a shorter phone comparison;
    #159 offer form starts from the 90-day benchmark.
  - #164 credit is never dropped silently when an order does not fit the cap (with Hana's #163).
  - #165 a company opens only its own POs and tax invoices; #166 number inputs read their text (WebKit).
- **i18n pattern:** dictionaries `src/i18n/procurement.ts`, `supplier.ts`, `activity.ts`, `invoice.ts`
  (`defineMessages(en, ar)`); screens use `useProcurementI18n()`. Guards in `src/i18n/procurement-dicts.test.ts`:
  placeholder parity, Arabic is Arabic, no فائدة/"interest", no Arabic-Indic digits, every seed title/site/note has Arabic.
- **Cross-browser:** run Actions → "Cross-browser e2e" with `base_url` empty (local build; production is refused).
  WebKit needs keystrokes for number inputs in tests (`fixtures.typeNumber`); the keyboard catalog journey is skipped
  on WebKit (Safari keeps focus on `<body>`).
- **How I test on srv1041554:**
  - e2e from my own shell needs `HOME=/home/nuphos`, node22 on PATH, `. ~/watad-team/env.sh`, and
    `LD_LIBRARY_PATH=~/watad-team/.cache/chromium-libs/root/usr/lib/x86_64-linux-gnu`.
  - Use `E2E_PORT=3147` (my port) and `E2E_PREBUILT=1` to reuse a build; include `desktop-ar` for the 320 px RTL checks.
- **Rules I keep:** no automated traffic to production; verify the merged diff on main before reporting; stage named
  files only (worktrees share refs); retarget stacked PRs to main before merging their base; refresh the GitHub
  credentials when `gh` returns 401 (they expire within the hour).

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

## #11 offers comparison + PO (branch `feat/11-offers-po`, stacked on `feat/9-shortlist-ui`)
- `src/lib/procurement/po.ts` (pure, 13 tests): quote, credit eligibility, place POs (single offer or
  basket split, Murabaha credit draw reduces the cap), advance status issued -> paid.
- `offer-comparison.tsx` on the RFQ page once sent; `po-detail.tsx` at `/contractor/po/[id]`.
- "Demo: next step" on the PO page moves the status until the supplier side (#10) does it for real.
- Browser-verified on rfq_1042: compare, blind, breakdown, choose, pay with credit, confirmation,
  timeline to paid, RFQ awarded. No console errors on any contractor page (fixed a thead hydration bug).

## #10 supplier portal (branch `feat/10-supplier-portal`, stacked on `feat/11-offers-po`)
- `src/lib/procurement/supplier-offer.ts` (pure, 12 tests): offer validation, submit/revise/withdraw,
  who acts on each PO step (`PO_ACTIONS`, `poActionFor`, `actOnPurchaseOrder`; credit POs auto-paid on invoice).
- `/supplier/rfq/[id]` (`supplier-rfq.tsx`): request, why matched, offer (bid) form, submitted offer,
  won/not-selected state. Only invited suppliers can open it.
- `/supplier/po/[id]` reuses `PoDetail` with `viewer="supplier"`; each role sees its own action
  (`po-action`) and a quiet demo shortcut for the other party's step (`po-advance`).
- Seed: `rfq_1044` open and sent to Rawasi (the demo supplier) so the supplier portal has work.
- Inbox list is Layla's #30 (`inbox-row`); its titles need to link to `/supplier/rfq/[id]`.
- Browser-verified: supplier offers on rfq_1044 -> contractor chooses, pays with credit -> supplier
  accepts, dispatches -> contractor confirms delivery -> supplier invoices -> paid. No console errors.

## #14 credit fit (branch `feat/14-credit-fit`)
- `creditFit()` in `po.ts` (cap − drawn, read before the draw); comparison rows show it via the
  table's optional `creditFit` prop (`offer-credit-fit`, `data-fits`). Hana owns repayments, the
  draws ledger and utilisation.
- `po_placed.within_credit_cap` now reads the cap before drawing; supplier form uses shared `termsKey`.
- Seed `rfq_1045` (Nakheel full, Sawari rebar, Sahra blocks) produces a split saving SAR 7,015 (since the 19 Nov rebar repricing);
  `seed-scenarios.test.ts` guards it and rfq_1044.
- Files released to Layla for restyling: rfq-builder, rfq-shortlist, supplier-rfq, po-detail.

## State at 17:00 UTC
- Merged: #20, #22, #28, #33, #36, #39, #44, #51, #57, #58 (Noor), #59, #65. #65 (supplier PO list, #62) merged too.
- Design decisions for ranking, comparison, basket split and credit fit: `docs/adr/0002-procurement-ranking.md`.
- Seed scenarios the demo relies on are guarded by `src/lib/procurement/seed-scenarios.test.ts`.
- Rule I follow after two misses: check the merged diff on main and the live site before reporting a fix done.
- Polish pass waits for Layla's design checklist (~18:00 UTC).

## Test ids (stable; translations never changed them)
- Test ids: `shortlist-row`, `shortlist-excluded` (both with `data-supplier`), `shortlist-select`,
  `shortlist-new-slot`, `shortlist-score`, `shortlist-why`, `shortlist-why-not`, `rfq-blind-toggle`,
  `shortlist-send`, `shortlist-sent`, `offer-row`, `offer-supplier`, `offer-landed`, `offer-score`,
  `offer-choose`, `offers-blind-toggle`, `offer-split-choose`, `po-draft`, `po-draft-total`, `po-pay-credit`,
  `po-pay-bank`, `po-murabaha`, `po-place`, `po-confirmation`, `po-number`, `po-status` (data-status),
  `po-timeline-link`, `po-row`, `po-advance`, `po-total`, `rfq-status`, `credit-cap-available`, `rfq-choose-suppliers`, `rfq-new`, `rfq-tab-upload|catalog`, `rfq-upload`, `rfq-upload-sample`, `rfq-catalog-add`,
  `rfq-line`, `rfq-line-qty`, `rfq-site`, `rfq-city`, `rfq-required-by`, `rfq-required-in-7|14|30`,
  `rfq-wants-credit`, `rfq-confirm`, `rfq-confirmed`, `rfq-id`, `rfq-row`.
  Supplier: `offer-form`, `offer-line`, `offer-line-price`, `offer-delivery`, `offer-lead-time`,
  `offer-terms`, `offer-summary`, `offer-submit`, `offer-submitted` (data-status), `offer-revise`,
  `offer-withdraw`, `supplier-po-link`, `po-action`.
