# Handoff: Noor (QA & demo)

- #16: `docs/BRIEF-CHECKLIST.md` merged (#18). No QA pass run yet; first pass after the first deploy (#3).
- #15: Playwright smoke suite in `e2e/` and the `e2e` CI job (branch `feat/15-e2e-smoke`). 5 scaffold tests x desktop/mobile pass locally, 30/30 on `--repeat-each=3`.
  Next: one spec per journey (contractor RFQ -> offers -> PO, supplier inbox -> offer, credit application -> decision) as #8-#13 land.
- Local runs on srv1041554: see `e2e/README.md` (LD_LIBRARY_PATH for Chromium libs; port 3110).
- Test-id contract posted in the team channel and on #10-#13.
