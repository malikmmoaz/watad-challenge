# Changelog

## Unreleased

- Landing page with a role switcher for contractor, supplier and credit manager; no login.
- Seeded Saudi sample data: fictional contractors and distributors, materials with benchmark prices, RFQs, offers, a purchase order paid with credit, and three credit cases.
- Contractor: create an RFQ by uploading an RFQ / BOQ (simulated AI extraction, labelled, editable) or picking from the catalog; confirm quantities, specs, delivery site, date and terms (#8).
- Design system: the "attested document" look (green-tinted paper, pine bar, one action green, stamp-ink blue for evidence), shared UI components, and a live reference at `/design-system`.
- Product analytics with PostHog (EU): anonymous, typed event catalog, off when no key is set.
