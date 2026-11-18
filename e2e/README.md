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
