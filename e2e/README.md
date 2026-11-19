# E2E smoke tests (Playwright)

Owner: Noor (#15). A few strong tests per journey; desktop (1440) and mobile (Pixel 7) Chromium.

```sh
pnpm e2e                                   # builds, serves on :3110, runs everything
E2E_PREBUILT=1 pnpm e2e                    # reuse an existing `pnpm build`
PLAYWRIGHT_BASE_URL=https://<preview> pnpm e2e   # test a Vercel preview or the live link
```

Rules for stable tests:

- Find elements with `tid(page, "<area>-<thing>")` from `fixtures.ts`, never bare `getByTestId`.
  `cacheComponents` keeps visited routes in the DOM (hidden), so a test id can exist twice after navigation.
- Every test fails on console errors or uncaught page errors (fixture in `fixtures.ts`).
- No sleeps; assert on visible state.

On srv1041554 Chromium needs a few shared libraries that are not installed system-wide. They are unpacked
(no root, no apt install) in `~/watad-team/.cache/chromium-libs`; run with
`LD_LIBRARY_PATH=~/watad-team/.cache/chromium-libs/root/usr/lib/x86_64-linux-gnu`.
CI installs them with `playwright install --with-deps`.

## Arabic and right to left (ADR 0005)

- Projects `desktop-ar` and `mobile-ar` run with `appLocale: "ar"`: the fixture stores `watad-locale=ar` before the page loads; call `ready(page)` (or use `enterAs`) to wait until `html.i18n-pending` is gone.
- Locale-proof specs only (listed in `playwright.config.ts`): `a11y` (axe, plus `lang`/`dir`), `rtl` (no sideways scroll at 320 and 390 px), `untranslated` (no English words outside names, codes and figures). Add a journey spec to the Arabic projects once it selects by test id or role and takes expected copy from `src/i18n` (`inLocale(appLocale, { en, ar })`).
- Known gaps are listed at the top of `rtl.spec.ts` and `untranslated.spec.ts` with their issue or owner. **Remove your page's line in the PR that fixes it.**
