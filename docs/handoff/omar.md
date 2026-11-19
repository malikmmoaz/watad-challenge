# Handoff: Omar (procurement)

Owner of #8 RFQ/BOQ + catalog, #9 shortlist, #10 supplier portal, #11 offer comparison + PO.

## Current state (19 Nov, 02:20 UTC). Read this first; the sections below are history.
- **Arabic and RTL (all merged):** #109 messages, #112 supplier portal, #114 RFQ builder/list, #115 shortlist,
  #119 comparison/PO, #127 statuses in `common.status` plus contractor home, #128 supplier home,
  #137 seed titles/sites/notes in Arabic plus PO lines stacking on phones.
  - Pattern: dictionaries `src/i18n/procurement.ts`, `supplier.ts`, `activity.ts` (`defineMessages(en, ar)`).
  - Screens use `useProcurementI18n()` (`src/components/procurement/use-procurement-i18n.ts`):
    `m`/`s`/`status`, `f` formatters, `terms`, `qty`, `city`, `category`, `name`, `lineName`, `rfqTitle`, `site`,
    `seedText`, and `logic()` for English text produced by the pure logic.
  - Logic attaches `msg: { key, values }` to shortlist reasons and comparison notes; the UI renders Arabic from those.
  - Seed Arabic: optional `titleAr`/`deliverySiteAr`/`notesAr`/`noteAr`, also looked up by the English text,
    so old browser state reads in Arabic. User-typed text stays as typed.
  - Guards: `src/i18n/procurement-dicts.test.ts` checks placeholder parity, that Arabic is Arabic, no فائدة or
    "interest", every reason key, and that every seed title/site/note has Arabic.
  - Arabic button names match Layla's reviewer guide (`src/content/tour-ar.ts`).
- **Open: #140, cross-role activity feed** (bell in `RoleNav`, `src/lib/activity/feed.ts`, `src/components/activity/`).
  Waiting on Layla's design review and Tariq/Noor's code review; authors merge after approval and green CI.
- **How I test on srv1041554:**
  - e2e from my own shell needs `HOME=/home/nuphos`, node22 on PATH, `. ~/watad-team/env.sh`, and
    `LD_LIBRARY_PATH=~/watad-team/.cache/chromium-libs/root/usr/lib/x86_64-linux-gnu`.
  - Use `E2E_PORT=3147` (my port) and `E2E_PREBUILT=1` to reuse a build.
  - Arabic projects: `desktop-ar`, `mobile-ar` (a11y, rtl, untranslated).
- **Rules I keep:**
  - No automated traffic to production.
  - Verify the merged diff on main before reporting.
  - Stage named files only (worktrees share refs).
  - Retarget stacked PRs to main before merging their base.

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
- Seed `rfq_1045` (Nakheel full, Sawari rebar, Sahra blocks) produces a split saving SAR 7,705;
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
