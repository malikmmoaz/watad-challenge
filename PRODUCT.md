# Product

<!-- impeccable:product-schema 1 -->

> Source: the team charter and challenge brief set by Watad (watad.vip) for this 24-hour build. Facts below are taken from that brief; anything marked *(assumption)* was inferred by the design agent and not separately confirmed.

## Platform

web

## Stack

Next.js (App Router), React, TypeScript strict, Tailwind CSS v4, deployed as one live app on Vercel. Chosen by the tech lead.

## Users

Three roles in one app, switched from the landing page:

- **Contractor**: a procurement lead at a Saudi construction contractor. Has a bill of quantities or an RFQ document and a site delivery date; needs comparable offers, a purchase order, and, when cash is tight, credit to pay the supplier.
- **Supplier**: a sales desk at a building-materials distributor. Receives RFQs, submits offers (price, availability, lead time, payment terms), fulfils POs.
- **Credit manager**: an independent third-party credit officer. Reviews a contractor's credit application, the documents and evidence behind it, and records an approve, refer (request more information) or decline decision with reasons.

Reviewers of the challenge submission are a fourth audience: they walk through all three roles in one sitting *(assumption: on a laptop, in a browser)*.

## Product Purpose

A construction-materials procurement platform for Saudi Arabia: RFQ, then offers, then PO, with credit available on the PO. Success is a contractor getting from an uploaded RFQ to a placed PO with a clear reason for the choice, and a credit decision that anyone can trace back to its evidence.

## Positioning

A neutral platform: it does not sell materials and does not lend. Suppliers compete on comparable offers; credit is decided by an independent credit manager; credit is drawn per PO and the supplier is paid directly. AI prepares (parses RFQs, reviews documents, drafts the credit memo); humans decide.

## Operating Context

- Flow: contractor uploads an RFQ or picks from the catalog, confirms quantities, specs and delivery; suppliers submit offers; contractor compares on several factors, chooses, places a PO and tracks its status.
- Credit: contractor applies with documents and tracks the application; the credit manager works a case file with gated checks, policy rules, a score and band, top factors, an AI-drafted credit memo and a decision log.
- Saudi documents: Commercial Registration (CR), ZATCA VAT returns, Zakat certificate, SIMAH credit report, audited financials (Qawaem), bank statements, GOSI certificate, contractor classification.
- Money is SAR with 15% VAT shown.

## Capabilities and Constraints

- Terminology is Watad's: "offers" (not quotes or bids), "credit cap", "neutral platform", RFQ, PO.
- Financing language: "profit rate" or "Murabaha markup" alongside APR. Never "interest".
- AI features are simulated and must be labelled as simulated wherever they appear. Sample data must be labelled as sample data.
- Distributor names are fictional. Sample data is realistic for Saudi Arabia.
- The product never criticises Watad; it presents itself as the next version of Watad's flow.
- No role may open on an empty state: every role lands on populated sample data.
- Arabic and right-to-left layout are optional, a small toggle if time allows. *(Undecided.)*

## Brand Commitments

Brief-pinned: a calm, trustworthy look that sits between fintech and construction. No logo, brand colours or typeface were supplied.

## Evidence on Hand

No real customers, testimonials, prices, benchmarks or credit outcomes exist. All companies, offers, documents, scores and decisions in the app are sample data and must not be presented as real.

## Product Principles

1. Every recommendation shows its reasons: a shortlist match, an offer ranking and a credit score each link to the facts behind them.
2. Agents prepare, humans decide: AI output is a draft with a named human action next to it.
3. Neutral by construction: no supplier is favoured by the layout, and credit is visibly independent of the sale.
4. Money is exact: SAR amounts, VAT and financing cost are always shown in full, never rounded away.
5. One vocabulary across all three roles, so a PO or a credit cap reads the same to everyone.

## Accessibility & Inclusion

WCAG 2.2 AA as the target: text contrast, visible keyboard focus, labelled controls, status never carried by colour alone. *(assumption: target level chosen by the design agent.)*
