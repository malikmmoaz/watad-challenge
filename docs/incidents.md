# Incidents and how we handled them

Short, blameless notes on things that went wrong while building, what we did, and what changed so they don't happen again. Newest first.

## 2026-11-18 · Our own automated traffic tripped Vercel's bot protection

**What happened.** From about 20:45 UTC the live site answered `403` with `x-vercel-mitigated: challenge`: Vercel's Security Checkpoint was challenging visitors. Reviewers opening the link would have met a challenge page instead of the app. Agents have no Vercel access, so the checkpoint itself is handled by Malik in the Vercel Firewall.

**Likely cause.** Automated requests from the team against production through the day, all from one machine (srv1041554) or CI: Playwright runs with `PLAYWRIGHT_BASE_URL` set to the live site (cross-browser runs, design sweeps, verification of fixes), `curl` loops over the routes after each deploy, and headless browsers checking analytics and headers. Tariq ran several of these himself to verify merges on production. To bot mitigation this looks like scraping.

Timeline of the heaviest automated traffic, reported by each agent (UTC, all headless Chromium from srv1041554 unless noted):
- ~16:05–16:50 · QA checklist passes 1–3: the full e2e suite at 1440 and 412 plus scripted journeys and route sweeps, 3–4 workers (Noor)
- ~17:40–18:10 · cross-browser workflow runs against production triggered by pushes to `qa/cross-browser` (Noor)
- 18:15–18:20 · narrow-width runs on `/` (5 widths) and screenshots (Layla)
- 18:27, 18:30, 19:17, 19:21 · cross-browser workflow dispatched against production from CI (Firefox, WebKit, WebKit mobile)
- ~18:59 and ~19:15 · verification of merged PRs: 2 viewports, then a 16-screen audit plus phone shots (Omar)
- ~19:15–19:35 · QA pass 4 after the redesign: the full e2e suite at 1440 and 412, 4 workers, plus guide and walkthrough checks (Noor)
- ~19:55 · design audit, 16 pages × 2 widths, about 32 page loads (Layla)
- 20:22–20:26 · final design sweep, 16 pages × 3 widths, about 48 page loads (Layla)
- through the day, and ~20:30 · route checks with `curl` after each merge, and a 320 px check of 5 credit pages (Tariq)
- ~20:45 · production starts answering `403` with `x-vercel-mitigated: challenge`
- ~20:53–21:05 · after the challenge had lifted: the full e2e suite after #99 (about 75 tests, 2–3 workers) and a few single status checks, before the stop rule reached Noor; production stayed `200` (Noor)

Hana's runs all used local builds.

**What we did.**
1. Every agent was told directly to stop all automated requests to production.
2. The cross-browser workflow no longer defaults to production: it builds and serves the app inside the job, accepts a PR preview URL, and refuses the production URL.
3. `playwright.config.ts` throws if `PLAYWRIGHT_BASE_URL` points at production, so no local run can do it by accident.
4. Lighthouse was already safe: it audits a local production build on 127.0.0.1.

**What we changed.**
- Automated checks (e2e, accessibility, Lighthouse, cross-browser, smoke loops) run against a local production build or a PR preview, never production.
- Production is checked by people in a real browser, and by Vercel's deployment status on the commit.

## 2026-11-18 · Stacked PRs closed when their base branch was deleted

**What happened.** Four PRs (#68 homes, #69 reviewer guide, #78 procurement polish, #79 credit restyle) were stacked on the landing redesign's branch `feat/7-landing-v2` (#60). After Malik approved #60, Tariq merged it with `gh pr merge --squash --delete-branch`. Deleting the base branch made GitHub **close** the four stacked PRs instead of retargeting them to `main`.

**Impact.** About 10 minutes of merge-train delay. No code was lost: every branch and commit still existed, and production was never affected (it kept serving the last green `main`).

**What we did.**
1. Recreated `feat/7-landing-v2` at #60's last head (`8b573c2`) through the GitHub API.
2. Reopened the four PRs and changed their base to `main`.
3. Rebased each onto `main` with `git rebase --onto origin/main origin/feat/7-landing-v2`, so only each PR's own commits were replayed.
4. #78 had merged several versions of the landing branch, so a rebase conflicted with #60's own commits. Instead we replayed exactly its own change (`git diff <landing tip it merged> <head> | git apply -3`) as one commit on `main`, kept Omar as the author, and noted the old head on the PR.
5. Merged in order, each with all required checks green (verify, e2e incl. axe, lighthouse), then deleted the restored branch.

**What we changed.**
- Before merging a PR that others are stacked on, retarget the stacked PRs to `main` first (or merge without `--delete-branch` and delete afterwards).
- Rebase stacked branches with `--onto`; if a branch has merged its base more than once, replay its diff instead of its history.
- During a merge train, only the merger pushes to the branches in the train (announced in the team channel), after two concurrent pushes crossed.

## 2026-11-18 · Accessibility check failed on text caught mid-animation

**What happened.** After the landing redesign (#60) added entrance animations, the axe accessibility check failed on another PR (#69) with colour-contrast errors on the landing's showcase tabs. #60's own run had passed. The check had sampled text while it was still fading in.

**What we did.** Merged Noor's #83 ahead of the planned order: axe now audits the settled page with reduced motion, after running animations finish. Layla's #84 then made entrances move without fading text, so text is at full contrast in every frame for real users too. `main` with everything combined is green.

**What we changed.** DESIGN.md: entrance motion never animates text opacity.

## 2026-11-18 · Available credit went stale (#55)

**What happened.** A purchase order larger than the contractor's available credit could be accepted, because `CreditFacility.available` was stored and not always updated when credit was drawn or a new cap was approved.

**What we did.** #57 made procurement compute the cap; #63 removed the stored field from the shared types (the first change to the frozen types, labelled `types`), so available credit is always `cap − drawn` via `availableCredit()`.

**What we changed.** Derived values are never stored (ADR 0004).
