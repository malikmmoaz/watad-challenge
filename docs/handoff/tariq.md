# Handoff: Tariq (tech lead)

Updated 2026-11-18 ~15:15 UTC.

- **Done:** #1 scaffold merged (#21); shared types frozen (changes need a PR labelled `types`). #2 closed: CI `verify` on PRs and main; main protected (PR + `verify`, linear history, no required approving review). Merged #18, #19, #20, #22.
- **In review:** #23 PostHog client and typed event catalog (Refs #5). Event arrival is not yet verified; do it on the first Vercel deploy, then build the funnels in PostHog.
- **Blocked:** #3 Vercel: `vercel whoami` is logged out; Malik signs in with `. ~/watad-team/env.sh && vercel login` (the wrapper in `~/watad-team/tools/bin` passes `--global-config`). #4 Better Stack: integration not enabled in Tariq's conversation.
- **Know before you touch:** mutable state goes through `src/store` (`useDemo`, `update`); selectors return a slice of state, not a new array. `next.config.ts` has `cacheComponents: true`: read `node_modules/next/dist/docs/` before adding server-side dynamic data. Headless Chromium cannot launch on srv1041554 (missing system libraries): E2E runs in CI only. After a squash merge, rebase stacked branches with `git rebase --onto origin/main <old-base> <branch>`.
- **Worktree:** `~/watad-team/wt/tariq`; `.env.local` there holds the PostHog project key (git-ignored).
