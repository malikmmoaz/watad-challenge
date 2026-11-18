# Handoff: Noor (QA & demo)

Updated 18 Nov 16:15 UTC.

- **#16 checklist:** pass 1 on production recorded in `docs/BRIEF-CHECKLIST.md` (73/90). Open bugs from it: #46, #47 (Omar), #48 (Layla); explanation pages missing (#17, Safina). Not checked yet: E9 (decline by hand), F5 (PO above the cap).
- **#15 e2e:** suite on main covers smoke, contractor RFQ (upload + catalog), credit application. PR #40 adds the full credit loop (apply → request more info → reply → approve); needs a review and merge.
- **Next:** pass 2 after #46–#48 and #17 land; then the reviewer walkthrough (`docs/WALKTHROUGH.md` + in-app tour text) and the How-this-was-built page with Safina (hours 13–21).
- **Running e2e on srv1041554:** see `e2e/README.md`. Against production: `PLAYWRIGHT_BASE_URL=https://watad-challenge.vercel.app pnpm exec playwright test <file>`; run one or two files at a time to stay under the 30 s local_exec limit.
- **Gotchas:** `cacheComponents` keeps hidden routes in the DOM, so use `tid()`. The store hydrates from localStorage after first paint, so wait for elements instead of counting right after a reload. Never `pkill -f` a pattern that appears in your own command line.
