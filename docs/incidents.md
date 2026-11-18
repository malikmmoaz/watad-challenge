# Incidents and how we handled them

Short, blameless notes on things that went wrong while building, what we did, and what changed so they don't happen again. Newest first.

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
