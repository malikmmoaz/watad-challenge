---
version: 1
slug: "src-app-design-system-page-tsx"
primary_target: "src/app/design-system/page.tsx"
related_targets: ["src/components/ui"]
---

# Surface brief: product UI (all three roles) and the /design-system reference route

Scope: every authenticated-style working screen for contractor, supplier and credit manager. Visitor mode: Operate. The landing page with the role switcher inherits this world.

Audience and job: a contractor procurement lead comparing offers and placing a PO; a supplier sales desk answering an RFQ; an independent credit manager working a case file. Each opens on populated sample data, never an empty state.

Constraints: Watad's terms in all copy; simulated AI and sample data labelled; SAR with 15% VAT; "profit rate" with APR, never "interest"; light theme (office desk, daylight, laptop).

Decision round: the brief pinned the look ("calm, trustworthy, fintech meets construction"), and the harness cannot hold the decision page open, so the assigned direction was built without an attended choice. Re-roll remains available on request.

## Direction contract

THESIS: every number on screen can show the paper it came from. Refuses the grey dashboard with one blue accent and a row of metric cards.

OWN-WORLD: the Saudi attested document (Commercial Registration, ZATCA and Zakat certificates). Pale green-tinted security-paper ground, a pine-green rail, one action green, stamp-ink blue for evidence, safety amber and red only for state. Public Sans throughout, tabular figures, mono only for document and order numbers. Hairline rules, small radii, two plies only.

STORY: the visitor sees what needs deciding, reads the reasons beside it, and acts once.

FIRST VIEWPORT: pine rail at left with role and navigation; a document header with title, serial and status; the working table or case file below; the primary action at top right of the header.

FORM: grounded candidate 5 of 7, the attested certificate. seed:8c9d915b5921fd84

Signature move: the attestation seal. An evidence-backed value carries a small ink seal and source reference that opens the document; decisions print as a stamp in the decision log.

Raises:
- From the warm consumer surface: action green appears only on things that can be pressed.
- From labanotation: length is duration; lead time and elapsed status are drawn to scale.
- From the cassette j-card: the credit cap is a hard edge; a draw that would overflow shows the overflow.
- From the acetate manual: ply is the only rank; page and one raised leaf, no nested cards.
- From the character catalog: every supplier and offer shows the same fields in the same order.
- From the split-flap board: table columns never move; state restyles the row without breaking the grid.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
