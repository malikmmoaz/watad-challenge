# Watad challenge: construction materials procurement demo

A three-role demo for Saudi construction materials procurement: **contractor**, **supplier** and **independent credit manager**, in one app with a role switcher and no login. RFQ → offers → purchase order, with a credit cap drawn per PO.

All companies, prices and credit files are **sample data**. AI features are **simulated** and labelled.

Live link: _added with the first Vercel deploy (#3)._

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

Vercel: production from `main`, a preview per PR. No environment variables are needed to run the app.
