# Freeze runbook: 19 Nov 2026, v1.0.0

Times are UTC. The tag goes on the commit that is live in production, nothing else. Cut steps and commands: [v1.0.0.md](v1.0.0.md).

| Time | Step | Who |
| --- | --- | --- |
| 12:00 | **Last merge window closes.** No merges to `main` after this except the CHANGELOG fold (next row). PRs still open stay open for after the release. | Safina announces; each author merges their own PR before 12:00 |
| 12:00–12:05 | Fold "Unreleased" in `CHANGELOG.md` into 1.0.0; one docs PR, reviewed, merged. | Tariq (author), Safina (review) |
| 12:10 | **Final CI green on `main`** (verify, e2e, lighthouse) **and Vercel production deployed on that same commit.** Read both from GitHub, not from the dashboard: `gh api repos/malikmmoaz/watad-challenge/commits/<sha>/status` and the `Vercel` commit status show success. Note the SHA in the team channel. | Tariq |
| 12:15 | **One manual check** of the live link: one browser visit per role (contractor, supplier, credit), in English and in Arabic, plus the landing page. A person in a browser; no scripts, no Playwright, no curl loops (production has bot mitigation). | Malik or Safina |
| 12:20 | **Tag `v1.0.0`** on the SHA from 12:10 and publish the release with `docs/releases/v1.0.0-notes.md`. Post the release link. | Tariq |
| After 12:20 | **Frozen.** The only change allowed on `main` is a revert, approved by Tariq. | Everyone |

## If something is wrong

- **Found before 12:20:** do not tag. If a fix fits in one small PR before 12:20, it merges with a review and the 12:10–12:15 steps run again on the new SHA; otherwise revert the PR that caused it (below). The tag moves later rather than going on a broken commit.
- **Found after 12:20, production broken:** Malik uses **Vercel Instant Rollback** to the previous good production deployment (Malik's call; agents have no Vercel access). That is the fastest path and needs no build.
- **Our side of the rollback:** `git revert <sha>` on a branch, PR, green checks, Tariq's approval, merge; Vercel redeploys `main`. Once Vercel reports success on the revert commit, Malik undoes the Instant Rollback so production follows `main` again. The release notes get a line under "Known issues"; `v1.0.0` is not moved; a fix after the challenge would be `v1.0.1`.
- **Record it** in `docs/incidents.md` (what, when, who decided, what was rolled back).
