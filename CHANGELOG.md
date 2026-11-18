# Changelog

## Unreleased

- Contractor credit application: requested cap and term, contracts in hand, Saudi documents each with a one-line reason, SIMAH consent; progress tracker (submitted, checks running, under review, more info requested, decided) with outcome, reasons, conditions and Murabaha markup with APR.
- Landing page with a role switcher for contractor, supplier and credit manager; no login.
- Seeded Saudi sample data: fictional contractors and distributors, materials with benchmark prices, RFQs, offers, a purchase order paid with credit, and three credit cases.
- Contractor: create an RFQ by uploading an RFQ / BOQ (simulated AI extraction, labelled, editable) or picking from the catalog; confirm quantities, specs, delivery site, date and terms (#8).
- Design system: the "attested document" look (green-tinted paper, pine bar, one action green, stamp-ink blue for evidence), shared UI components, and a live reference at `/design-system`.
- Product analytics with PostHog (EU): anonymous, typed event catalog, off when no key is set.
- Contractor: explainable, credit-aware supplier shortlist on each RFQ, with why / why not per supplier, a reserved slot for a vetted new supplier, the available credit cap, a blind-comparison option, and sending the RFQ to the suppliers you pick (#9).
