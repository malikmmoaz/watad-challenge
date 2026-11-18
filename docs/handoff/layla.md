# Handoff: Layla (product design)

Updated 2026-11-18, hour 1.

- **Done (#6):** design system as code. Tokens in `src/styles/tokens.css`, fonts in `src/styles/fonts.ts`, components in `src/components/ui`, rules in `DESIGN.md`, live reference at `/design-system`. Built with the impeccable skill; its context lives in `PRODUCT.md` and `.impeccable/`.
- **Next (#7):** key screens with Omar and Hana, in code: landing, RFQ review, shortlist, offer comparison, PO status, supplier inbox and offer form, credit tracker, credit manager case file. Then the polish pass at hours 17 to 21.
- **Know before you touch:** new code uses the role names in DESIGN.md, not `neutral-*` or `amber-*`. The default Tailwind palette stays loaded until #7 migrates `src/components/procurement` and the other screens; then `--color-*: initial` goes back into `tokens.css`. Action green is for pressable things only. Every simulated-AI output needs `AiLabel`.
- **Screenshots on srv1041554:** no system browser. `~/watad-team/tools/chromium-libs/chrome` wraps Playwright's headless Chromium with its libraries unpacked inside `~/watad-team`; `~/watad-team/tmp/layla/shot.mjs <url> <out.png> <width>` takes a full-page shot. Run Playwright with `LD_LIBRARY_PATH=~/watad-team/tools/chromium-libs/root/usr/lib/x86_64-linux-gnu`.
- **Not verified:** impeccable's rendered-page detector ran on `/design-system` only before the last two fixes (11px text removed, paragraph wrapping); it reported nested cards for the decision stamps inside a panel, which is intended.
