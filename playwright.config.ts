import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke tests (#15). Three journeys, kept fast and stable.
 *
 * Target:
 *  - PLAYWRIGHT_BASE_URL set -> test that deployment (Vercel preview or the live link).
 *  - unset                   -> build and serve the app locally on E2E_PORT (default 3110,
 *                               inside the team's 3100-3199 range; 3100 stays free for `pnpm dev`).
 *    E2E_PREBUILT=1 skips the build when `.next` is already fresh.
 */
const port = Number(process.env.E2E_PORT ?? 3110);
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL ?? `http://127.0.0.1:${port}`;
const isCI = !!process.env.CI;
const start = `pnpm exec next start -H 127.0.0.1 -p ${port}`;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.results",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: isCI
    ? [["github"], ["html", { outputFolder: "e2e/.report", open: "never" }]]
    : [["list"], ["html", { outputFolder: "e2e/.report", open: "never" }]],
  use: {
    baseURL,
    testIdAttribute: "data-testid",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    locale: "en-SA",
    timezoneId: "Asia/Riyadh",
    // Vercel deployment protection bypass for previews, if enabled (value comes from a CI secret).
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
      : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    // Chromium at a phone viewport: one browser download, still catches layout breaks.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    // Cross-browser (opt-in with E2E_ALL_BROWSERS=1; run by .github/workflows/cross-browser.yml, not required CI).
    ...(process.env.E2E_ALL_BROWSERS
      ? [
          { name: "firefox", use: { ...devices["Desktop Firefox"], viewport: { width: 1440, height: 900 } } },
          { name: "webkit", use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } } },
          { name: "webkit-mobile", use: { ...devices["iPhone 14"] } },
        ]
      : []),
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: process.env.E2E_PREBUILT ? start : `pnpm build && ${start}`,
        url: baseURL,
        // Never reuse: a server left over from an earlier run can serve a stale build.
        reuseExistingServer: false,
        timeout: 180_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
