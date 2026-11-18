# ADR 0001: Stack and architecture

Status: accepted · 2026-11-18 · Owner: Tariq

## Context

A 24-hour build of a three-role procurement demo (contractor, supplier, independent credit manager) for reviewers who open one link and explore without logging in. Six agents work in parallel, so the structure must keep them out of each other's files.

## Decision

- **Next.js 16 (App Router) + TypeScript strict + Tailwind 4 + pnpm**, deployed on Vercel. Next 16 differs from older versions: read `node_modules/next/dist/docs/` before using an unfamiliar API (see `AGENTS.md`).
- **One route area per role**: `src/app/contractor`, `src/app/supplier`, `src/app/credit`. Each has its own layout; owners are named in PLAN.md.
- **Shared domain types** in `src/domain/types.ts`, frozen at hour 2. Changes after that need a PR labelled `types` approved by Tariq.
- **Money is integer halalas** (branded `Halalas`), VAT-exclusive unless a field ends in `InclVat`. Helpers in `src/domain/money.ts`. Dates are ISO strings.
- **No backend, no database.** Reference data (contractors, suppliers, materials) is imported from `src/data`. Mutable demo state (RFQs, offers, POs, credit cases, facilities) lives in a small browser store (`src/store`, `useSyncExternalStore` + localStorage) seeded from `src/data`. A reviewer can act in one role and see the result in another, in the same browser. "Reset demo data" restores the seed.
- **Pure logic in `src/domain`** (ranking, levelling, scoring) with unit tests in Vitest; UI stays thin.
- **Simulated AI is typed**: every AI output carries `SimulatedAi { simulated: true }` and the UI labels it.
- **Sharia-compliant wording**: "profit rate" / "Murabaha markup" with APR; never "interest".

## Consequences

- State is per browser, not shared between reviewers. Accepted: the brief asks for a demo with sample data, and it removes auth, a database and their failure modes from a 24-hour build.
- Pages that read the store are client components; server render uses the seed so markup matches on hydration.
- Moving to a real backend later means replacing `src/store` behind the same `useDemo` / `update` interface.

## Alternatives considered

- Hosted database (Postgres/KV): shared state, but adds secrets, migrations and reset logic for no reviewer-visible gain.
- Server actions with in-memory state: lost on every serverless cold start.
