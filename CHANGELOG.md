# Changelog

All notable changes, grouped by release. Issue and PR numbers refer to github.com/malikmmoaz/watad-challenge.

## Unreleased

_Changes merged after this section was written are listed here and folded into 1.0.0 when it is tagged at the 12:20 UTC freeze._

## 1.0.0 · 2026-11-19

The first release: a construction materials procurement platform for Saudi Arabia, three roles in one link (contractor, supplier, independent credit manager), in English and Arabic, on sample data with simulated AI.

### Contractor

- Create an RFQ by uploading an RFQ / BOQ (simulated AI extraction, labelled and editable) or by picking from the catalog; confirm quantities, specs, delivery site, date and terms (#8).
- Explainable, credit-aware supplier shortlist on each RFQ: why / why not per supplier, a reserved slot for a vetted new supplier, the available credit cap, a blind-comparison option, and sending the RFQ to the suppliers you pick (#9).
- Compare offers side by side on landed cost incl. delivery and 15% VAT, price vs benchmark, coverage, lead time, terms, reliability and local content, with a score breakdown, blind mode and a suggested basket split (sample RFQ `rfq_1045` saves SAR 7,705) (#11, #14).
- Each offer shows whether it fits the credit cap ("Fits your credit cap" / "Over your credit cap by SAR x") (#14).
- Place the PO by bank transfer or pay with credit (Murabaha draw, supplier paid directly), with a confirmation and a status timeline (#11).
- Home opens on live work and key figures: open RFQs, offers to compare, POs on the way, credit cap left (#7).

### Supplier

- Matched requests with the reasons for the match; open one and submit or revise an offer with price, quantity, availability, brand or alternative, delivery fee, lead time, payment terms and Made in Saudi, against the benchmark (#10).
- Run a won PO: accept, dispatch, invoice; on credit orders the supplier is paid directly from the contractor's credit cap (#10).
- Purchase orders list on the home, orders needing your action first, each with status and total (#62). Home opens on key figures: requests waiting, offers submitted, POs to fulfil, on-time rate (#7).

### Credit

- Contractor credit application: requested cap and term, contracts in hand, Saudi documents (CR, ZATCA VAT, Zakat, SIMAH, audited financials, bank statements, GOSI, classification) each with a one-line reason, SIMAH consent (#12).
- Progress tracker: submitted, checks running, under review, more information requested, decided; with outcome, reasons, conditions and the Murabaha markup with APR (#12).
- Independent credit manager workspace: queue of applications; case file with gated checks (cheapest first, SIMAH last), extracted document fields with confidence, a 10-factor scorecard with why each factor matters and links to evidence, policy rules, proposed limit, a simulated AI panel (revenue consistency, tamper flags, drafted credit memo), approve / request more information / decline with reasons, and a decision log (#13).
- Credit drawn per purchase order: the contractor's ledger of draws (order total, Murabaha markup with APR, due date, status) with repayment that releases the cap; the credit manager sees utilisation, open and overdue draws and the next repayment (#14).

### Arabic and right to left

- EN / ع toggle in every app bar and on the landing page, remembered in the browser; every screen in Arabic, right to left (ADR 0005).
- Money and dates per language with Latin digits and the Gregorian calendar in Arabic; Sharia-compliant wording throughout (profit rate / Murabaha markup with APR, never "interest").
- Arabic typography: Noto Sans Arabic with Public Sans for Latin, a slightly larger scale, never letter-spaced; the Arabic font loads only when Arabic is on screen.
- No English flash for Arabic readers: the page is shown once it has rendered in Arabic, including content that streams in after the first paint.
- About and How we built it in Arabic.

### Design and experience

- The "attested document" design language (paper, pine bar, one action green, stamp-ink blue for evidence), shared UI components and a live reference at `/design-system`.
- Landing page: a bold headline, the three roles one click away with what is waiting for each, a live product preview by role, the flow in four steps, and a trust section.
- Reviewer guide on each role: three steps with links, Hide guide, and Restart tour in the app bar (#16).
- About and How we built it pages: business model, priorities, stack, use of AI, assumptions, research, the team and its process, linked from the landing page and the app bars (#17).
- Phones: offer comparison becomes one card per offer below 1024 px; the new RFQ page and the app bar never scroll sideways, down to 320 px in both languages (#29, #120).
- Seeded Saudi sample data: fictional contractors and distributors, materials with benchmark prices, RFQs, offers, purchase orders and credit cases.

### Platform

- Product analytics with PostHog (EU): anonymous, typed event catalog for the procurement and credit funnels, off when no key is set; a dashboard with both funnels (#5).
- Monitoring with Better Stack: uptime monitor on the live link, a public status page, and browser errors reported to error tracking (#4).
- Security headers on every page (CSP limited to our origin, PostHog EU and Better Stack, no framing, strict referrer and permissions policy, HSTS); designed not-found and error pages that report errors and offer to reset the demo data.
- CI on every PR: lint, typecheck, unit tests and build; end-to-end tests on desktop and phone in English and Arabic, including axe WCAG 2.2 AA and keyboard-only journeys; Lighthouse budgets (median of 5, one automatic retry).
- Dependencies on current patch releases (posthog-js held one patch back by the supply-chain release-age policy); `pnpm audit` reports no known vulnerabilities.

### Fixed

- A purchase order can no longer be paid with credit above what is left of the cap; the PO draft explains why and offers bank transfer, a basket split or a higher cap. Available credit is always derived as cap minus drawn (#55).
- The new RFQ page scrolled sideways on phones (#29); Arabic role pages scrolled sideways at 320 px (#120).

### Docs

- Architecture decisions: ADR 0001 stack, 0002 procurement ranking, 0003 credit assessment, 0004 browser state and observability, 0005 Arabic and right to left.
- `docs/incidents.md`: blameless notes on what went wrong while building and what we changed.
