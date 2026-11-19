# Brief checklist

Every line of the challenge brief ("Digital procurement platform", `procurement_platform_challenge.pdf`) as a checkable item, verified against the **live Vercel link** (not localhost).
Owner: Noor (QA). Tracking issue: #16. Gaps are reported to Safina and filed as issues.

Wording note: the brief says "bids"; the app says "offers", which is Watad's own term. Same thing.

**How to read it**

- Status: `☐` not checked yet · `✅` passes on live · `⚠️` partial (issue linked) · `❌` missing (issue linked)
- "Brief" rows are what the challenge asks for, each traceable to a sentence quoted in the last section (Q1-Q13). "Ours" rows are the differentiators we added on top; they must not break a Brief row.
- Each row is checked at desktop (1440) and mobile (390) widths. A row passes only if both do.
- E2E column: the Playwright smoke test that covers it (`e2e/*.spec.ts`), if any.

Last full pass: 19 Nov 02:45 UTC, pass 5, Arabic gate (97/98 rows) · Live link: https://watad-challenge.vercel.app

Browsers tested (18 Nov 19:30, production after the redesign, full e2e suite incl. axe and keyboard): Chromium desktop 1440 + Pixel 7 on every PR; Firefox desktop 37/37; WebKit (Safari engine) desktop 37/37 and iPhone 14 34/34 (+3 desktop-only keyboard tests skipped). #80 and #81 verified fixed. Re-run: Actions → "Cross-browser e2e" → Run workflow.

## A. Platform and access

| ID | Type | Requirement | Owner | Issue | E2E | Status |
|----|------|-------------|-------|-------|-----|--------|
| A1 | Brief | One live, public Vercel app; opens without an account or setup | Tariq | #3 | all | ✅ |
| A2 | Brief | Three roles reachable from the same link: contractor, supplier, credit manager | Tariq | #1 | all | ✅ |
| A3 | Brief | Roles are easy to explore: reviewer can switch role at any time (role switcher visible on every page) | Tariq | #1 | all | ✅ |
| A4 | Brief | The credit manager is an independent third party with a separate workspace, distinct from contractor and supplier | Hana | #13 | credit | ✅ |
| A5 | Brief | Realistic Saudi sample data: cities and delivery sites, distributors, materials and units, SAR prices, Saudi documents | Tariq | #1 | – | ✅ |
| A6 | Ours | Sample companies are fictional (no real supplier or contractor named as a customer) | Tariq | #1 | – | ✅ |
| A7 | Ours | Money shown in SAR, with 15% VAT shown explicitly wherever a total appears | Omar | #11 | contractor | ✅ |
| A8 | Brief | Every simulated AI output is clearly labelled as simulated, at the place it appears | Omar, Hana | #8 #13 | contractor, credit | ✅ |
| A9 | Ours | No dead ends: every page has a next step or a way back; no 404 or error page reachable from the UI | all | – | all | ✅ |
| A10 | Ours | Usable at 390 px wide: no horizontal scroll, tables readable, primary actions reachable | Layla | #7 | mobile project | ✅ |
| A11 | Ours | No console errors or failed requests on any journey page | all | – | all | ✅ |
| A12 | Brief | State created in one role is visible in the others within the same session (RFQ → supplier inbox, offer → contractor, application → credit queue) | Tariq | #1 | all | ✅ |
| A13 | Brief | Useful from the first visit: the landing page says what the platform is and each role opens on live work (open RFQs, an inbox with requests, a queue with cases), never an empty state | Layla, Tariq | #1 #7 | smoke | ✅ |

## B. Contractor: RFQ → offers → PO

| ID | Type | Requirement | Owner | Issue | E2E | Status |
|----|------|-------------|-------|-------|-----|--------|
| B1 | Brief | Contractor can upload an RFQ/BOQ document | Omar | #8 | contractor | ✅ |
| B2 | Brief | Upload produces editable line items (simulated extraction, labelled) | Omar | #8 | contractor | ✅ |
| B3 | Brief | Contractor can instead pick items from a catalog | Omar | #8 | contractor | ✅ |
| B4 | Brief | Contractor confirms quantities | Omar | #8 | contractor | ✅ |
| B5 | Brief | Contractor confirms specs | Omar | #8 | contractor | ✅ |
| B6 | Brief | Contractor confirms delivery (site and date) | Omar | #8 | contractor | ✅ |
| B7 | Brief | Both entry paths (upload, catalog) end in a confirmed RFQ sent to suppliers | Omar | #8 | contractor | ✅ |
| B8 | Brief | Contractor sees the offers received for an RFQ | Omar | #11 | contractor | ✅ |
| B9 | Brief | Each offer shows price, availability, lead time and payment terms | Omar | #11 | contractor | ✅ |
| B10 | Brief | Contractor can compare offers side by side | Omar | #11 | contractor | ✅ |
| B11 | Brief | Contractor can choose an offer | Omar | #11 | contractor | ✅ |
| B12 | Brief | Contractor can place a PO from the chosen offer | Omar | #11 | contractor | ✅ |
| B12a | Brief | Placing the PO gives a clear confirmation (PO number, supplier, total, what happens next) | Omar | #11 | contractor | ✅ |
| B13 | Brief | PO has a clear, visible status that progresses (issued → accepted → dispatched → delivered → invoiced) | Omar | #11 | contractor | ✅ |
| B14 | Ours | Explainable supplier shortlist: ranked on spec fit, serves site, reliability, likely to respond, price vs benchmark, accepts credit cap; why / why not per supplier | Omar | #9 | contractor | ✅ |
| B15 | Ours | Shortlist reserves a slot for a new supplier; contractor picks the invitees | Omar | #9 | – | ✅ |
| B16 | Ours | Multi-factor comparison: landed cost incl. delivery and 15% VAT, lead time, terms, reliability, local content, benchmark flag | Omar | #11 | contractor | ✅ |
| B17 | Ours | Blind comparison toggle hides supplier names | Omar | #11 | – | ✅ |
| B18 | Ours | Basket split: award lines to different suppliers | Omar | #11 | – | ✅ |
| B19 | Ours | Totals are arithmetically right: lines + delivery = subtotal, VAT = 15% of subtotal, total = subtotal + VAT (checked by hand on two offers) | Omar | #11 | – | ✅ |

## C. Supplier: inbox → offer

| ID | Type | Requirement | Owner | Issue | E2E | Status |
|----|------|-------------|-------|-------|-----|--------|
| C1 | Brief | Supplier (in the platform's network) sees only the requests relevant to them: invited / matched on material and delivery area | Omar | #10 | supplier | ✅ |
| C2 | Brief | Supplier can open an RFQ and see items, quantities, specs, delivery site and date | Omar | #10 | supplier | ✅ |
| C3 | Brief | Supplier submits an offer with price | Omar | #10 | supplier | ✅ |
| C4 | Brief | …with availability (stock) | Omar | #10 | supplier | ✅ |
| C5 | Brief | …with lead time | Omar | #10 | supplier | ✅ |
| C6 | Brief | …with payment terms | Omar | #10 | supplier | ✅ |
| C7 | Brief | A submitted offer appears on the contractor side for that RFQ | Omar | #10 | supplier | ✅ |
| C8 | Ours | Supplier sees the award and the PO, and can move the PO status forward | Omar | #10 | – | ✅ |
| C9 | Ours | Offer captures local content | Omar | #10 | – | ✅ |
| C10 | Ours | Supplier sees when a PO is paid on credit and that they are paid directly | Hana | #14 | – | ✅ |

## D. Contractor: credit application

| ID | Type | Requirement | Owner | Issue | E2E | Status |
|----|------|-------------|-------|-------|-----|--------|
| D1 | Brief | Contractor can apply for credit | Hana | #12 | credit | ✅ |
| D2 | Brief | Application takes the documents we think matter (CR, VAT returns, Zakat certificate, SIMAH consent, Qawaem financials, bank statements, GOSI, classification, contracts in hand) | Hana | #12 | credit | ✅ |
| D3 | Brief | Contractor can track the application's progress | Hana | #12 | credit | ✅ |
| D4 | Brief | Contractor sees the outcome and the reasons | Hana | #12 | credit | ✅ |
| D5 | Ours | A request for more information reaches the contractor and they can respond | Hana | #12 | – | ✅ |
| D8 | Ours | Each requested document says why it matters (what it proves to the credit manager) | Hana | #12 | – | ✅ |
| D6 | Ours | Application states requested credit cap and tenor | Hana | #12 | credit | ✅ |
| D7 | Brief | A submitted application appears in the credit manager's queue | Hana | #12 | credit | ✅ |

## E. Credit manager workspace

| ID | Type | Requirement | Owner | Issue | E2E | Status |
|----|------|-------------|-------|-------|-----|--------|
| E1 | Brief | Credit manager has a separate workspace with a queue of applications | Hana | #13 | credit | ✅ |
| E2 | Brief | Reviews the submitted documents | Hana | #13 | credit | ✅ |
| E3 | Brief | Supporting evidence is shown for each finding | Hana | #13 | credit | ✅ |
| E4 | Brief | Our chosen risk factors are shown | Hana | #13 | credit | ✅ |
| E5 | Brief | A credit risk score is shown | Hana | #13 | credit | ✅ |
| E6 | Brief | A proposed decision is shown | Hana | #13 | credit | ✅ |
| E6a | Brief | Every factor explains why it matters | Hana | #13 | credit | ✅ |
| E6b | Brief | Every factor shows how it affects the outcome (weight, points contributed, effect on score/band/limit) | Hana | #13 | credit | ✅ |
| E7 | Brief | Shows how AI would assist with document review and with the assessment; labelled simulated | Hana | #13 | credit | ✅ |
| E8 | Brief | Can approve, with clear reasons | Hana | #13 | credit | ✅ |
| E9 | Brief | Can decline, with clear reasons | Hana | #13 | – | ✅ |
| E10 | Brief | Can request more information, with clear reasons | Hana | #13 | – | ✅ |
| E11 | Ours | The human decides: the proposed decision can be overridden, and the decision is recorded with who/when/why | Hana | #13 | – | ✅ |
| E12 | Ours | Gated checks and policy rules run before scoring | Hana | #13 | – | ✅ |
| E13 | Ours | 10-factor weighted scorecard; every factor links to its evidence in the documents | Hana | #13 | credit | ✅ |
| E14 | Ours | Score maps to a band and a recommended limit | Hana | #13 | – | ✅ |
| E15 | Ours | Concrete AI document review: extraction, cross-document consistency checks, tamper flags, draft credit memo | Hana | #13 | – | ✅ |
| E16 | Ours | Decision log; four sample cases covering approve, refer, decline and more-info | Hana | #13 | – | ✅ |

## F. Credit wired into procurement

| ID | Type | Requirement | Owner | Issue | E2E | Status |
|----|------|-------------|-------|-------|-----|--------|
| F1 | Ours | Approved credit cap is visible to the contractor on shortlist and offers | Hana, Omar | #14 | – | ✅ |
| F2 | Ours | PO can be paid with credit; the draw reduces the available cap | Hana, Omar | #14 | contractor | ✅ |
| F3 | Ours | Supplier is paid directly by the credit provider | Hana | #14 | – | ✅ |
| F4 | Ours | Cost of credit shown as profit rate / Murabaha markup with APR | Hana | #14 | – | ✅ |
| F5 | Ours | A PO larger than the available cap is handled (blocked or part-paid), not silently accepted | Hana | #14 | – | ✅ |

## G. In-app explanation pages

| ID | Type | Requirement | Owner | Issue | E2E | Status |
|----|------|-------------|-------|-------|-----|--------|
| G1 | Brief | Business model explained in the app, briefly: who pays and why | Safina | #17 | – | ✅ |
| G2 | Brief | Priorities explained (what we built first and why, what we cut) | Safina | #17 | – | ✅ |
| G3 | Brief | Stack choices explained (what and why) | Safina | #17 | – | ✅ |
| G4 | Brief | Use of AI tools explained: how AI tools were used to build this, plus what AI in the product is simulated vs would be real | Safina | #17 | – | ✅ |
| G5 | Brief | Key assumptions listed | Safina | #17 | – | ✅ |
| G6 | Ours | How the team built it: team, timeline, links to issues, PRs, CI runs, ADRs | Safina | #17 | – | ✅ |
| G7 | Ours | Links to analytics and uptime dashboards / status page work for a logged-out reviewer | Tariq | #4 #5 | – | ⚠️ #4 |
| G8 | Brief | These pages are in the app and linked from the landing page | Safina | #17 | smoke | ✅ |
| G10 | Brief | Research shown: what we learned about construction procurement and credit in Saudi Arabia, and how it shaped the product | Safina | #17 | – | ✅ |
| G11 | Brief | Explanations are brief: each topic readable in under a minute | Safina | #17 | – | ✅ |
| G9 | Ours | Reviewer walkthrough: `docs/WALKTHROUGH.md` and in-app tour, 3 minutes per role | Noor | #16 | – | ✅ |

## H. Language and tone

Checked by searching the live app and the repo.

| ID | Requirement | Status |
|----|-------------|--------|
| H1 | Watad's terms throughout: "offers" (not quotes/bids), "credit cap", "neutral platform" | ✅ |
| H2 | "profit rate" / "Murabaha markup" with APR; the word "interest" does not appear in a credit context | ✅ |
| H3 | Nothing criticises Watad or Abwab; we present the next version of the flow | ✅ |
| H4 | No lorem ipsum, placeholder text, TODOs or broken images on any reviewer-reachable page | ✅ |
| H5 | No secrets, real personal data or real company financials in the repo or the app | ✅ |

## I. Arabic and right to left

Ours (Safina's priority, ADR 0005). Checked on a local production build in the `desktop-ar` and `mobile-ar` e2e projects, never against production.

| ID | Type | Requirement | Owner | Issue | E2E | Status |
|----|------|-------------|-------|-------|-----|--------|
| I1 | Ours | Full Arabic with RTL: an **EN / ع** toggle in both app bars; the choice survives a reload and applies on every page | Tariq | #108 | i18n | ✅ |
| I2 | Ours | `<html lang dir>` match the language on every page (`ar` / `rtl`, `en` / `ltr`) | Tariq | #108 | a11y (en + ar) | ✅ |
| I3 | Ours | No serious or critical axe issues in Arabic on all 11 pages, desktop and phone | all | #108 | a11y (ar) | ✅ |
| I4 | Ours | Every visible word is Arabic, except names, codes and figures from an allow-list | Omar, Hana, Layla, Safina | #109 | untranslated | ✅ |
| I5 | Ours | No sideways scroll in Arabic at 320 and 390 px | Tariq | #120 | rtl | ✅ |
| I6 | Ours | Money (riyal sign), numbers and dates formatted for Arabic, Latin digits, Gregorian calendar | Tariq | #108 | – | ✅ |
| I7 | Ours | Directional icons, bars and meters mirror in RTL; numbers stay left-to-right | Layla | #106 | – | ✅ |
| I8 | Ours | One journey per role completes in Arabic (contractor RFQ to PO, supplier offer, credit decision) | Noor | #15 | – | ✅ |

## What reviewers look for

Not pass/fail; judged at each full pass and reported to Safina with examples.

| ID | Criterion (from the brief) | Where it shows | Notes |
|----|----------------------------|----------------|-------|
| R1 | Product thinking and sensible priorities for a platform useful from day one | A13, G2 | |
| R2 | Intuitive UX | A3, A9, A10, walkthrough timing | |
| R3 | Business sense | G1, F1-F5 | |
| R4 | Creativity: our own ideas in the product | B14-B18, E12-E16, F | |
| R5 | Understanding of construction technology | B, C: units, specs, delivery, landed cost | |
| R6 | Understanding of fintech | D, E, F: documents, factors, Murabaha | |
| R7 | Thoughtful research, shown and linked to product choices | G10 | |

## Pass log

| When (UTC) | Build / commit | Result | Notes |
|------------|----------------|--------|-------|
| 18 Nov 16:05 | production, main `ad5fec5` | 73/90 pass · 4 partial · 11 fail · 2 not checked | Fails: in-app explanation pages (#17) and the walkthrough (#16, scheduled). Partial: supplier form wording and "quote" (#46, rows C3 and H1), basket split not visible with seed data (#47), comparison table at 412 (#48). Not checked: E9 decline by hand, F5 PO above the cap. Every page clean at 1440 and 412: no sideways page scroll, no console errors, no failed requests; "interest" never appears. |
| 18 Nov 16:25 | production, after #41 and #49 | 85/90 pass · 2 partial · 3 fail | Fixed since pass 1: About and How-we-built pages (#41: G1–G6, G8, G10, G11), offer cards on phones (#49, closes #48: A10). Checked now: E9 decline by hand passes; F5 fails, a PO over the available cap is still placed on credit (#55). Still partial: #46 (C3, H1; fix in #58). Re-checked 16:30: basket split passes (#47 closed, B18), and the full #14 credit path including repayment restores the cap. Still failing: G7 dashboards for reviewers (#4/#5), G9 walkthrough (#16, scheduled). |
| 18 Nov 16:42 | production, after #58 and #59 | 88/90 pass · 1 partial · 1 fail | Wording fixed and verified: "Your offer (bid)", "Price the lines…", "Enter a unit price…", "Usually prices…", "Thank you for your offer" (#46 and #10 closed; C3, H1). Walkthrough merged (#61); G9 stays partial until the in-app guide ships (copy in #64, panel by Layla). F5 re-checked 16:50: Pay with credit is disabled above the available cap, with the reason; the PO goes by bank transfer (#55 closed, via #57/#63). Supplier home now lists purchase orders (#65, closes #62). Still failing: G7 dashboards for reviewers (waiting on Better Stack approval). |
| 18 Nov 19:35 | production, main `5044548` (after the redesign #60/#68/#69/#78/#79) | 89/90 pass · 0 partial · 1 fail | Full e2e suite on production at 1440 + 412: all green (smoke, RFQ, credit, credit loop, procurement, analytics, system, keyboard; axe 0 serious/critical on 11 pages at both widths). Reviewer guide live on all three roles: 3 steps, links resolve, Hide persists, Restart tour works (G9 ✅). Walkthrough labels all present; one drift fixed: `cc_502` now needs **Run checks** first. Cross-browser: Firefox, WebKit desktop and iPhone 14 all green; #80 (narrow phones) and #81 (Safari keyboard tabs) verified fixed. Still failing: G7 dashboard links for reviewers (Better Stack approval). |
| 19 Nov 02:45 | local production build of main `8889669` (Arabic gate) | 97/98 pass · 1 partial · 0 fail | **Arabic gate passed**: untranslated + mono 23/23 on desktop and phone with no known gaps left; RTL 11/11 at 320/390 px; axe in Arabic 11/11 on both widths; i18n + credit-ar 7/7. Arabic journeys: contractor compare → PO on credit (demo clip 5), credit application → decision (credit-ar), supplier offer → PO dispatched (offer total 128,041.00 ر.س. with VAT). Money with the riyal sign and Latin digits, Gregorian dates in Arabic. G7 partial: How we built it links a public status page (Better Stack, 200 for a logged-out reader); no public analytics dashboard. |

## Brief text and traceability

The brief, sentence by sentence, with the rows that cover it.

| Q | Brief | Rows |
|---|-------|------|
| Q0 | "Make it feel useful from the first visit, and bring your own ideas to the product." | A13, R4 |
| Q1 | "Let contractors upload an RFQ (request for quotation) or select materials from a catalog, then confirm quantities, specifications and delivery requirements." | B1-B7 |
| Q2 | "Let suppliers in the platform's network review relevant requests and submit bids with prices, availability, lead times and payment terms." | C1-C7 |
| Q3 | "Let contractors compare bids, choose a supplier and place a purchase order, with clear confirmation and status." | B8-B13 |
| Q4 | "Let contractors request credit, submit the documents you think matter and follow the progress and outcome of their application." | D1-D4, D7 |
| Q5 | "Give an independent third-party credit manager/admin a separate workspace to review applications. This role is distinct from the contractor and supplier." | A4, E1 |
| Q6 | "Show the assessment through the UI: documents, supporting evidence, your chosen risk factors, a credit risk score and a proposed decision." | E2-E6 |
| Q7 | "Explain why each factor matters and how it affects the outcome." | E6a, E6b |
| Q8 | "Show how AI would assist with document review and assessment." | E7 |
| Q9 | "Let the credit manager approve, decline or request more information, with clear reasons." | E8-E10 |
| Q10 | "Send a live app deployed on Vercel or Netlify within two days. Make all three roles easy to explore through one link." | A1-A3, A12 |
| Q11 | "Use realistic sample data and clearly label any simulated AI results." | A5, A8 |
| Q12 | "In the app, briefly explain your business model (who pays and why), priorities, stack choices, use of AI tools and key assumptions." | G1-G5, G8, G11 |
| Q13 | "Thoughtful research is a plus: show what you learned and how it shaped the product." | G10 |
