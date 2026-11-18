import type { DocPage } from "./types";

const REPO = "https://github.com/malikmmoaz/watad-challenge";

/**
 * /how-we-built. PLACEHOLDER COPY: every string starting with "[Draft]" is a
 * prompt for the real text (owner: Safina, #17). Set `draft: false` when written.
 */
export const howWeBuilt: DocPage = {
  title: "How we built it",
  summary: "A team of AI agents, each with a role, working through issues, pull requests, reviews and CI.",
  draft: true,
  sections: [
    {
      id: "team",
      title: "The team",
      lead: "[Draft] One sentence: who the team is and who directs it.",
      blocks: [
        {
          kind: "table",
          caption: "Agents and what each owns",
          columns: ["Agent", "Role", "Owns"],
          rows: [
            ["Safina", "Product manager", "[Draft]"],
            ["Tariq", "Tech lead", "[Draft]"],
            ["Layla", "Product designer", "[Draft]"],
            ["Omar", "Procurement engineer", "[Draft]"],
            ["Hana", "Credit engineer", "[Draft]"],
            ["Noor", "QA and demo", "[Draft]"],
          ],
        },
      ],
    },
    {
      id: "process",
      title: "The process",
      lead: "[Draft] One sentence: how a piece of work goes from issue to production.",
      blocks: [
        {
          kind: "steps",
          items: [
            { title: "Issue", text: "[Draft]" },
            { title: "Branch and small pull request", text: "[Draft]" },
            { title: "CI: lint, typecheck, unit tests, end-to-end", text: "[Draft]" },
            { title: "Review by a teammate", text: "[Draft]" },
            { title: "Merge and deploy", text: "[Draft]" },
          ],
        },
      ],
    },
    {
      id: "timeline",
      title: "24 hours",
      lead: "[Draft] One sentence: how the 24 hours were spent.",
      blocks: [
        {
          kind: "steps",
          items: [
            { when: "Hours 0 to 2", title: "[Draft]" },
            { when: "Hours 2 to 10", title: "[Draft]" },
            { when: "Hours 10 to 17", title: "[Draft]" },
            { when: "Hours 17 to 24", title: "[Draft]" },
          ],
        },
      ],
    },
    {
      id: "trail",
      title: "The trail",
      lead: "[Draft] One sentence: everything is checkable in the repository.",
      blocks: [
        {
          kind: "links",
          items: [
            { label: "Issues", href: `${REPO}/issues?q=is%3Aissue`, note: "[Draft]" },
            { label: "Pull requests and reviews", href: `${REPO}/pulls?q=is%3Apr`, note: "[Draft]" },
            { label: "CI runs", href: `${REPO}/actions`, note: "[Draft]" },
            { label: "Decision records", href: `${REPO}/tree/main/docs/adr`, note: "[Draft]" },
            { label: "Changelog", href: `${REPO}/blob/main/CHANGELOG.md`, note: "[Draft]" },
          ],
        },
      ],
    },
    {
      id: "lessons",
      title: "What we would do differently",
      lead: "[Draft] One sentence, honest.",
      blocks: [{ kind: "list", items: [{ title: "[Draft]", text: "[Draft]" }, { title: "[Draft]", text: "[Draft]" }] }],
    },
  ],
};
