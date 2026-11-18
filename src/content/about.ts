import type { DocPage } from "./types";

const REPO = "https://github.com/malikmmoaz/watad-challenge";

/**
 * /about. PLACEHOLDER COPY: every string starting with "[Draft]" is a prompt
 * for the real text (owner: Safina, #17). Set `draft: false` when it is written.
 */
export const about: DocPage = {
  title: "About this demo",
  summary: "What the platform is, who pays, what we built first, and what is simulated.",
  draft: true,
  sections: [
    {
      id: "business-model",
      title: "Business model",
      lead: "[Draft] One sentence: who pays the platform, and why it is worth it to them.",
      blocks: [
        {
          kind: "table",
          caption: "Who pays and why",
          columns: ["Party", "Pays", "Why it is worth it"],
          rows: [
            ["Contractor", "[Draft]", "[Draft]"],
            ["Supplier", "[Draft]", "[Draft]"],
            ["Financier", "[Draft]", "[Draft]"],
          ],
        },
        { kind: "note", title: "Neutral platform", text: "[Draft] The platform sells no materials and lends no money; say how that shapes the fees." },
      ],
    },
    {
      id: "priorities",
      title: "Priorities",
      lead: "[Draft] One sentence: what we built first, and the rule we used to cut.",
      blocks: [
        {
          kind: "list",
          ordered: true,
          items: [
            { title: "[Draft] First priority", text: "[Draft] Why it came first." },
            { title: "[Draft] Second priority", text: "[Draft] Why." },
            { title: "[Draft] Third priority", text: "[Draft] Why." },
          ],
        },
        { kind: "list", items: [{ title: "[Draft] What we cut", text: "[Draft] And what it would take to add." }] },
      ],
    },
    {
      id: "stack",
      title: "Stack",
      lead: "[Draft] One sentence: the stack in plain words and the reason for it.",
      blocks: [
        {
          kind: "facts",
          items: [
            { label: "Framework", value: "Next.js 16 (App Router), React 19", note: "[Draft] Why." },
            { label: "Language", value: "TypeScript, strict", note: "[Draft] Why." },
            { label: "Styling", value: "Tailwind CSS 4 with role-named tokens", note: "[Draft] Why." },
            { label: "Data", value: "Seeded sample data, state in the browser", note: "[Draft] Why there is no backend." },
            { label: "Tests", value: "Vitest unit tests, Playwright end-to-end", note: "[Draft] Why." },
            { label: "Delivery", value: "GitHub Actions, Vercel", note: "[Draft] Why." },
          ],
        },
        { kind: "links", items: [{ label: "ADR 0001: stack", href: `${REPO}/blob/main/docs/adr/0001-stack.md` }] },
      ],
    },
    {
      id: "ai",
      title: "Use of AI",
      lead: "[Draft] One sentence: AI in the product is simulated and labelled; AI tools built the product.",
      blocks: [
        {
          kind: "table",
          caption: "AI in the product",
          columns: ["Where", "In this demo", "In production it would be"],
          rows: [
            ["Reading an uploaded RFQ", "Simulated, labelled", "[Draft]"],
            ["Reviewing credit documents", "Simulated, labelled", "[Draft]"],
            ["Drafting the credit memo", "Simulated, labelled", "[Draft]"],
          ],
        },
        { kind: "prose", paragraphs: ["[Draft] Which AI tools were used to build this, and for what."] },
      ],
    },
    {
      id: "assumptions",
      title: "Assumptions",
      lead: "[Draft] One sentence: the few assumptions the whole design rests on.",
      blocks: [
        {
          kind: "list",
          items: [
            { title: "[Draft] Assumption", text: "[Draft] What changes if it is wrong." },
            { title: "[Draft] Assumption", text: "[Draft] What changes if it is wrong." },
            { title: "[Draft] Assumption", text: "[Draft] What changes if it is wrong." },
          ],
        },
      ],
    },
    {
      id: "research",
      title: "Research",
      lead: "[Draft] One sentence: what we learned about construction procurement and credit in Saudi Arabia.",
      blocks: [
        {
          kind: "table",
          caption: "From research to features",
          columns: ["What we learned", "What we built because of it"],
          rows: [
            ["[Draft]", "[Draft]"],
            ["[Draft]", "[Draft]"],
            ["[Draft]", "[Draft]"],
          ],
        },
        { kind: "note", title: "A note on wording", text: "[Draft] Why the app says \"offers\" and writes \"offers (bids)\" on first mention." },
      ],
    },
  ],
};
