# Watad challenge: construction materials procurement demo

A three-role demo for Saudi construction materials procurement: **contractor**, **supplier** and **independent credit manager**, in one app with a role switcher and no login. RFQ → offers → purchase order, with a credit cap drawn per PO.

All companies, prices and credit files are **sample data**. AI features are **simulated** and labelled.

Live link: **https://watad-challenge.vercel.app** (production, deploys from `main`).

## Explore the three roles in 5 minutes

Open **https://watad-challenge.vercel.app**. No login: pick a role on the landing page, and switch at any time from the bar at the top. Everything you do is saved in your browser, so an action in one role shows up in the others. **Reset demo data** (top bar) restores the samples.

**1. Contractor (about 2 minutes), as Najd Horizon Contracting Co.**
- **New RFQ**: upload a BOQ (or use the sample file) and watch the simulated BOQ reader fill editable line items, or pick from the catalog. Confirm quantities, site and date.
- **Choose suppliers**: the shortlist explains why each distributor is in or out, and whether the order fits your credit cap.
- Open **Structure package — Block C** (`rfq_1042`): compare 3 offers on landed cost incl. 15% VAT, lead time, terms and reliability, then **Choose offer** and place the purchase order, **paying with credit**. The supplier is paid directly; you see the Murabaha markup, APR and due date.
- **Credit cap, applications and progress**: the cap, the draws on it, **Repay**, and **Apply for a higher cap** with the Saudi document set.

**2. Supplier (about 1 minute), as Rawasi Building Materials Trading**
- The inbox shows only requests you were matched to, with why. Open **Villas 13 to 24** (`rfq_1044`) and **Submit offer**: price, stock, lead time, payment terms, local content.
- Awarded orders: move the PO through accepted, dispatched and invoiced.

**3. Credit manager (about 2 minutes), independent of buyer and seller**
- **Credit applications**: the queue. Open **Hijaz Peaks Building Est.** (`cc_502`): gated checks (CR, VAT, bank, financials, SIMAH last), extracted fields with the page they came from, the scorecard with top factors, and the simulated AI credit memo.
- **Record decision**: approve, request more information or decline, with reasons. The contractor sees the outcome on their credit page.

Then read **About** and **How we built it** (top bar). The full reviewer path, with what to notice at each step, is in [docs/WALKTHROUGH.md](docs/WALKTHROUGH.md).

## Run

```bash
pnpm install
pnpm dev        # http://localhost:3100
```

On the team machine, start every command with `. ~/watad-team/env.sh` and use ports 3100–3199 only.

## Check

```bash
pnpm lint
pnpm typecheck
pnpm test       # Vitest unit tests
pnpm build
```

CI runs the same four on every PR and on main (`.github/workflows/ci.yml`).

## Structure

```
src/app/            landing page with role switcher
src/app/contractor  contractor area
src/app/supplier    supplier area
src/app/credit      credit manager area
src/domain          shared types (frozen), money helpers, pure logic + tests
src/data            seeded sample data
src/store           browser demo store (useDemo, update, resetDemo)
src/components      shared UI
docs/adr            lasting decisions
docs/handoff        per-agent handoff notes
docs/incidents.md   what went wrong while building and how we handled it
```

## Working agreement

Every task is a GitHub issue. Branch `feat/<issue>-name`, small PRs, conventional commits, green CI and one approving review before merge; nobody pushes to main. Shared types change only through a PR labelled `types`. See `PLAN.md` for status and `docs/adr/0001-stack.md` for the architecture.

## Deploy

Vercel, imported by Malik through Vercel's GitHub integration (limited to this repo). Agents hold no Vercel credentials: there is no Vercel CLI on the team machine and no `vercel.json`.

- `main` deploys to production; every PR gets a preview deployment.
- Default Next.js settings: build `next build`, install `pnpm install`. Vercel picks pnpm 10 from the lockfile (`lockfileVersion: '9.0'`); install and build with pnpm 10 are verified. Node is pinned to `22.x` in `package.json`, matching CI.
- Deployment status and URLs: the PR checks, the Vercel bot comment, or `gh api repos/malikmmoaz/watad-challenge/deployments`.
- The app runs with no environment variables. Optional: `NEXT_PUBLIC_POSTHOG_KEY` turns on product analytics (see `.env.example` and `docs/analytics.md`).
