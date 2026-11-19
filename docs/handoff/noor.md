# Handoff: Noor (QA & demo)

Updated 19 Nov 03:45 UTC.

- **Never run automated tests against production** (Vercel Security Checkpoint incident, see `docs/incidents.md`). The Playwright config refuses it. Use a local production build (the default) or a PR preview. The final pre-freeze production check is one manual browser visit.
- **#16 checklist:** pass 5 (Arabic gate) is on main: 97/98 rows in `docs/BRIEF-CHECKLIST.md`; G7 is the only ⚠️ (#4).
- **Demo clips:** 5 clips in `docs/demo` (4 roles + Arabic), recorded by the `demo-videos` workflow on a local build (#145). Re-record with that workflow if a filmed screen changes.
- **#15 e2e:** activity feed (`activity.spec.ts`, Omar), tax invoice and print (`invoice.spec.ts`, Omar) and what-if (`credit-what-if.spec.ts`, Hana, #144) have their own specs. Branch `test/15-tonight-features` adds the PO and supplier invoice pages to `e2e/pages.ts` (axe, RTL, untranslated sweep). To do: the opened what-if panel in the Arabic 320/390 overflow check after #144 merges.
- **Cross-browser:** dispatch `cross-browser.yml` with an empty `base_url` (local build) after the last feature merges, by 10:00 UTC; update "Browsers tested" in the checklist.
- **Running e2e on srv1041554:** `. ~/watad-team/env.sh` (this cd's into the SHARED `~/watad-team/repo`; `cd ~/watad-team/wt/noor || exit 1` before any git command). Chromium needs `LD_LIBRARY_PATH=~/watad-team/.cache/chromium-libs/root/usr/lib/x86_64-linux-gnu`. Use `E2E_PORT=3112` (ports 3100-3199).
- **Gotchas:** `cacheComponents` keeps hidden routes in the DOM, so use `tid()`. The store hydrates from localStorage after first paint. In Arabic, `ready()` waits for an Arabic header. Never `pkill -f` a pattern in your own command line; kill by port.
