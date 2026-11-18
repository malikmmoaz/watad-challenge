# Handoff: Tariq (tech lead)

Updated 2026-11-18, hour 1.

- **Done:** scaffold on `feat/1-scaffold` (Next 16, strict TS, Tailwind 4, Vitest). Lint, typecheck, 10 unit tests and build pass on srv1041554; dev server answers on 3100 for `/`, `/contractor`, `/supplier`, `/credit`.
- **Next:** open the PR for #1 (needs the GitHub integration re-enabled in Tariq's chat), get a review, merge, freeze types, then branch protection (#2) and Vercel (#3, needs Malik to sign in).
- **Know before you touch:** mutable state goes through `src/store` (`useDemo`, `update`); selectors must return a slice of state, not a new array. `next.config.ts` has `cacheComponents: true`: read the Next 16 docs in `node_modules/next/dist/docs/` before adding server-side dynamic data.
- **Temporary branch** `tmp/tariq-drafts` was used to move drafted files onto the server; delete it once #1 merges.
