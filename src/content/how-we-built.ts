import type { DocPage } from "./types";

const REPO = "https://github.com/malikmmoaz/watad-challenge";

/** /how-we-built. Copy owner: Safina (#17). Each section should read in under a minute. */
export const howWeBuilt: DocPage = {
  title: "How we built it",
  summary: "A team of AI agents, each with a role, working through issues, pull requests, reviews and CI.",
  draft: false,
  sections: [
    {
      id: "team",
      title: "The team",
      lead: "Six Claude Code agents, each with one role, directed by one human, Malik, who set the goals and approved anything touching his accounts.",
      blocks: [
        {
          kind: "table",
          caption: "Agents and what each owns",
          columns: ["Agent", "Role", "Owns"],
          rows: [
            ["Safina", "Product manager", "The brief, priorities and issues; unblocking; this page and About."],
            ["Tariq", "Tech lead", "Scaffold and shared types, CI, deploys, analytics, monitoring, merges."],
            ["Layla", "Product designer", "Design system, landing page, polish of every screen."],
            ["Omar", "Procurement engineer", "RFQ, shortlist, offers, comparison, purchase orders, supplier portal."],
            ["Hana", "Credit engineer", "Scoring engine, credit application, credit manager workspace."],
            ["Noor", "QA and demo", "Brief checklist, end-to-end tests, reviews against the brief."],
          ],
        },
      ],
    },
    {
      id: "process",
      title: "The process",
      lead: "Every change went from a GitHub issue to a small pull request, through automated checks and a teammate's review, to production.",
      blocks: [
        {
          kind: "steps",
          items: [
            { title: "Issue", text: "Each task is an issue with an owner and acceptance criteria, quoted from the brief where it applies." },
            { title: "Branch and small pull request", text: "One branch per issue, in the agent's own worktree. Commits carry the agent's name." },
            { title: "CI: lint, typecheck, unit tests, end-to-end", text: "Required on main: nothing merges with a red check. Every pull request also gets a Vercel preview." },
            { title: "Review by a teammate", text: "Another agent reviews against the code and the brief and signs it \"Review by <name>\"." },
            { title: "Merge and deploy", text: "Squash-merged into main, which deploys to production automatically." },
          ],
        },
        {
          kind: "note",
          title: "One identity, many names",
          text: "All agents push through one GitHub App, so GitHub shows a single author. Who did what is in the commit names, the signed pull requests and the review comments.",
        },
      ],
    },
    {
      id: "timeline",
      title: "24 hours",
      lead: "The first two hours went into foundations, then the three roles were built in parallel, then joined and polished against the brief.",
      blocks: [
        {
          kind: "steps",
          items: [
            { when: "Hours 0 to 2", title: "Plan, scaffold and frozen types; design system; first deploy; all core logic unit-tested." },
            { when: "Hours 2 to 10", title: "The three roles built in parallel: RFQ to purchase order, supplier portal, credit application and credit manager." },
            { when: "Hours 10 to 17", title: "Credit joined to procurement; end-to-end journeys across roles; analytics and monitoring." },
            { when: "Hours 17 to 22", title: "Polish, a full pass against the brief, these pages, then code freeze." },
          ],
        },
      ],
    },
    {
      id: "trail",
      title: "The trail",
      lead: "Everything on this page can be checked in the public repository.",
      blocks: [
        {
          kind: "links",
          items: [
            { label: "Issues", href: `${REPO}/issues?q=is%3Aissue`, note: "Every task, with owner and acceptance criteria." },
            { label: "Pull requests and reviews", href: `${REPO}/pulls?q=is%3Apr`, note: "Each change, who wrote it, and who reviewed it." },
            { label: "CI runs", href: `${REPO}/actions`, note: "Lint, typecheck, unit and end-to-end tests on every change." },
            { label: "Decision records", href: `${REPO}/tree/main/docs/adr`, note: "Why the main technical choices were made." },
            { label: "Changelog", href: `${REPO}/blob/main/CHANGELOG.md`, note: "What changed, in order." },
          ],
        },
      ],
    },
    {
      id: "lessons",
      title: "What we would do differently",
      lead: "Most of our friction came from setup and parallel work, not from the product.",
      blocks: [
        {
          kind: "list",
          items: [
            {
              title: "Set up the runtime and access before kickoff",
              text: "The first hour went into machine access, sign-ins and per-agent permissions. A ready environment would have saved it.",
            },
            {
              title: "Give each agent its own Git identity",
              text: "A shared identity meant reviews had to be comments instead of GitHub approvals.",
            },
            {
              title: "Merge smaller and sooner",
              text: "Pull requests opened in parallel against a moving main often needed rebasing. A fixed merge order, set early, helped.",
            },
          ],
        },
      ],
    },
  ],
};
