# Watad challenge: construction materials procurement demo

A three-role demo for Saudi construction materials procurement: **contractor**, **supplier** and **independent credit manager**, in one app with a role switcher and no login. RFQ → offers → purchase order, with a credit cap drawn per PO.

All companies, prices and credit files are **sample data**. AI features are **simulated** and labelled.

Live link: **https://watad-challenge.vercel.app** (production, deploys from `main`).

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
```

## Working agreement

Every task is a GitHub issue. Branch `feat/<issue>-name`, small PRs, conventional commits, green CI and one approving review before merge; nobody pushes to main. Shared types change only through a PR labelled `types`. See `PLAN.md` for status and `docs/adr/0001-stack.md` for the architecture.

## Deploy

Vercel, imported by Malik through Vercel's GitHub integration (limited to this repo). Agents hold no Vercel credentials: there is no Vercel CLI on the team machine and no `vercel.json`.

- `main` deploys to production; every PR gets a preview deployment.
- Default Next.js settings: build `next build`, install `pnpm install`. Vercel picks pnpm 10 from the lockfile (`lockfileVersion: '9.0'`); install and build with pnpm 10 are verified. Node is pinned to `22.x` in `package.json`, matching CI.
- Deployment status and URLs: the PR checks, the Vercel bot comment, or `gh api repos/malikmmoaz/watad-challenge/deployments`.
- The app runs with no environment variables. Optional: `NEXT_PUBLIC_POSTHOG_KEY` turns on product analytics (see `.env.example` and `docs/analytics.md`).
