# Changelog

## Unreleased

- Contractor: each offer shows whether it fits the credit cap ("Fits your credit cap" / "Over your credit cap by SAR x", from cap minus drawn); sample RFQ rfq_1045 shows a basket split saving SAR 7,705 (#14).
- Fixed: the new RFQ page no longer scrolls sideways on phones; line items stack as cards below the small breakpoint (#29).
- Contractor credit application: requested cap and term, contracts in hand, Saudi documents each with a one-line reason, SIMAH consent; progress tracker (submitted, checks running, under review, more info requested, decided) with outcome, reasons, conditions and Murabaha markup with APR.
- Credit manager workspace: queue of applications; case file with gated checks (cheapest first, SIMAH last), extracted document fields with confidence, 10-factor scorecard with why each factor matters and links to evidence, policy rules, proposed limit, simulated AI panel (revenue consistency, tamper flags, drafted credit memo), approve / refer / decline with reasons, decision log. Four sample cases added to the queue.
- Landing page with a role switcher for contractor, supplier and credit manager; no login.
- Seeded Saudi sample data: fictional contractors and distributors, materials with benchmark prices, RFQs, offers, a purchase order paid with credit, and three credit cases.
- Contractor: create an RFQ by uploading an RFQ / BOQ (simulated AI extraction, labelled, editable) or picking from the catalog; confirm quantities, specs, delivery site, date and terms (#8).
- Design system: the "attested document" look (green-tinted paper, pine bar, one action green, stamp-ink blue for evidence), shared UI components, and a live reference at `/design-system`.
- Product analytics with PostHog (EU): anonymous, typed event catalog, off when no key is set.
- Contractor: explainable, credit-aware supplier shortlist on each RFQ, with why / why not per supplier, a reserved slot for a vetted new supplier, the available credit cap, a blind-comparison option, and sending the RFQ to the suppliers you pick (#9).
- Contractor: compare offers (bids) side by side on landed cost incl. delivery and 15% VAT, price vs benchmark, coverage, lead time, terms, reliability and local content, with a score breakdown, blind mode and a suggested basket split; place the PO by bank transfer or pay with credit (Murabaha draw, supplier paid directly), with a confirmation and a status timeline (#11).
- Contractor and supplier open on live work: RFQs with offer counts, credit cap and latest PO status; supplier requests with match reasons (#7).
- Supplier: open a matched request, submit or revise an offer (bid) with price, quantity, availability, brand or alternative, delivery fee, lead time, payment terms and Made in Saudi, see it against the benchmark, and run the won PO: accept, dispatch, invoice (paid directly from the contractor's credit cap on credit orders) (#10).
- About and How we built it pages: layout and components in place, linked from the landing page and the role bar, with the business model, priorities, stack, AI use, assumptions, research and the team's process (#17).
- Landing page redesigned as one ruled sheet: a larger headline, the three roles one click away with what is waiting for each, and the flow shown in four steps with live components on the sample data.
- Offer comparison stacks into one card per offer below 1024 px wide, with "Choose offer" on each card; no sideways scrolling on phones or tablets (#7).
