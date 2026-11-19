import type { DocPage } from "./types";

const REPO = "https://github.com/malikmmoaz/watad-challenge";

/** /about. Copy owner: Safina (#17). Each section should read in under a minute. */
export const about: DocPage = {
  title: "About this demo",
  summary: "What the platform is, who pays and why, what we built first, and what is simulated.",
  draft: false,
  sections: [
    {
      id: "business-model",
      title: "Business model",
      lead: "Suppliers pay a small fee on orders they win, and the credit partner pays per financed order; contractors use it free, because their demand is what brings both.",
      blocks: [
        {
          kind: "table",
          caption: "Who pays and why",
          columns: ["Party", "Pays", "Why it is worth it"],
          rows: [
            [
              "Contractor",
              "Nothing to request offers or place orders. Pays the Murabaha markup only on orders it chooses to finance.",
              "Comparable offers in one place, a traceable choice, and credit at the moment of purchase instead of a separate bank process.",
            ],
            [
              "Supplier",
              "A success fee on the value of awarded orders (we assume about 1 to 2%). No listing fee.",
              "Qualified demand matched to its materials and delivery area, and, on financed orders, payment on invoice instead of waiting for the contractor.",
            ],
            [
              "Credit partner",
              "An origination fee per financed order.",
              "A steady flow of contractors whose purchases, documents and delivery history are already verified, at a lower cost to acquire and assess.",
            ],
          ],
        },
        {
          kind: "note",
          title: "Neutral platform",
          text: "The platform sells no materials and lends no money. It earns only when an order is awarded or financed, so it has no reason to favour a supplier or to push credit a contractor does not need.",
        },
      ],
    },
    {
      id: "priorities",
      title: "Priorities",
      lead: "We built the full order path for all three roles first, then the credit that pays for it, and cut anything a reviewer could not see working in one sitting.",
      blocks: [
        {
          kind: "list",
          ordered: true,
          items: [
            {
              title: "One order, end to end, across all three roles",
              text: "RFQ, offers, comparison, purchase order and delivery: the core of procurement, and what makes the platform useful on day one.",
            },
            {
              title: "Credit you can trace",
              text: "An application, an independent credit manager's case file, a score whose every factor shows its effect, and a decision with reasons.",
            },
            {
              title: "Credit inside the order",
              text: "Credit is drawn per purchase order and the supplier is paid directly, which is where procurement and fintech meet.",
            },
            {
              title: "Production habits from the first hour",
              text: "Tests, CI, previews, analytics and monitoring, so the demo behaves like a product, not a mock-up.",
            },
          ],
        },
        {
          kind: "list",
          items: [
            {
              title: "What we cut",
              text: "Real accounts and a database, real AI calls, and submitting invoices to ZATCA (Phase 2). The simplified tax invoice with its Phase 1 QR is built; Phase 2 needs a backend and a certified integration, not a different design.",
            },
          ],
        },
      ],
    },
    {
      id: "stack",
      title: "Stack",
      lead: "A standard, typed web stack that deploys in minutes, so the 24 hours went into the product rather than the plumbing.",
      blocks: [
        {
          kind: "facts",
          items: [
            { label: "Framework", value: "Next.js 16 (App Router), React 19", note: "One codebase for pages and logic, first-class on Vercel." },
            { label: "Language", value: "TypeScript, strict", note: "Shared, frozen types let five agents build in parallel without breaking each other." },
            { label: "Styling", value: "Tailwind CSS 4 with role-named tokens", note: "One design system, so every screen looks like the same product." },
            { label: "Data", value: "Seeded sample data, state in the browser", note: "No backend: every reviewer gets the same realistic data and nothing to sign in to." },
            { label: "Tests", value: "Vitest unit tests, Playwright end-to-end", note: "Scoring, ranking and money are unit-tested; each role's journey is tested in a real browser." },
            { label: "Delivery", value: "GitHub Actions, Vercel, PostHog, Better Stack", note: "Every pull request is checked and previewed; production is measured and monitored." },
          ],
        },
        { kind: "links", items: [{ label: "ADR 0001: stack", href: `${REPO}/blob/main/docs/adr/0001-stack.md` }] },
      ],
    },
    {
      id: "ai",
      title: "Use of AI",
      lead: "AI in the app is simulated and labelled wherever it appears; the app itself was built by a team of AI agents, directed and reviewed by a human.",
      blocks: [
        {
          kind: "table",
          caption: "AI in the product",
          columns: ["Where", "In this demo", "In production it would be"],
          rows: [
            ["Reading an uploaded RFQ or bill of quantities", "Simulated, labelled", "A document model extracting lines, quantities and specs, each line confirmed by the contractor."],
            ["Reviewing credit documents", "Simulated, labelled", "Extraction and cross-checks (CR, VAT returns, bank statements), with flags for the credit manager."],
            ["Drafting the credit memo", "Simulated, labelled", "A drafted memo citing its evidence. The credit manager decides, and must give a reason to override it."],
          ],
        },
        {
          kind: "prose",
          paragraphs: [
            "AI tools built this: six Claude Code agents (product manager, tech lead, designer, two engineers and QA) ran in Nuphos on a shared server, each in its own Git worktree. They wrote the code and tests, reviewed each other's pull requests, and ran CI. A human, Malik, set direction, approved anything touching his accounts, and made the product calls.",
            "Layla, the designer, used the impeccable design skill to build the design system. See How we built it for the process and the full trail.",
          ],
        },
      ],
    },
    {
      id: "assumptions",
      title: "Assumptions",
      lead: "Three assumptions carry the design; if one is wrong, the shape of the product changes.",
      blocks: [
        {
          kind: "list",
          items: [
            {
              title: "Contractors' main pain is cash flow, not finding suppliers",
              text: "If it is finding suppliers, the shortlist and supplier network matter more than credit, and we would lead with them.",
            },
            {
              title: "Suppliers will pay for qualified demand and faster payment",
              text: "If they will not, fees move to the contractor as a subscription, which slows adoption.",
            },
            {
              title: "A credit partner will fund per order against verified purchases",
              text: "If it funds only facilities, credit becomes a separate product and the per-order draw disappears.",
            },
          ],
        },
      ],
    },
    {
      id: "research",
      title: "Research",
      lead: "Saudi contractors buy on credit, wait long to be paid, and work under strict document and Sharia-compliant financing rules; each of these shaped a feature.",
      blocks: [
        {
          kind: "table",
          caption: "From research to features",
          columns: ["What we learned", "What we built because of it"],
          rows: [
            ["Contractors are often paid late by project owners, so materials are bought on supplier credit.", "Credit drawn per purchase order, with the supplier paid directly on invoice."],
            ["Lenders assess with standard Saudi documents: CR, ZATCA VAT returns, Zakat certificate, SIMAH report, GOSI, audited financials.", "An application that asks for exactly these, and says why each one matters."],
            ["Islamic finance dominates; Murabaha is a common structure for buying goods.", "Financing shown as Murabaha markup and profit rate with APR. The app never says \"interest\"."],
            ["Price alone misleads: lead time, delivery to site and payment terms decide real cost.", "A comparison on landed cost incl. delivery and 15% VAT, lead time against the site's need date, and terms."],
            ["Local content (Made in Saudi) is a growing requirement on projects.", "Made in Saudi share shown per offer."],
            ["Every B2B sale needs a ZATCA-compliant tax invoice, and buyers and sellers work in Arabic first.", "A simplified tax invoice with a Phase 1 QR (labelled sample), printable POs, and the whole app in Arabic, right to left, with an EN / ع toggle."],
          ],
        },
        {
          kind: "note",
          title: "A note on wording",
          text: "The brief says \"bids\". The app says \"offers\", Watad's own term, and writes \"offers (bids)\" on first mention.",
        },
      ],
    },
  ],
};
