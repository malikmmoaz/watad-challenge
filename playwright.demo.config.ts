import { defineConfig } from "@playwright/test";

/**
 * Demo recordings for the README (#16): one short video per role journey,
 * recorded against a LOCAL production build on 127.0.0.1. Never production:
 * automated traffic tripped Vercel's bot protection on 18 Nov (docs/incidents.md).
 *
 *   pnpm demo            # build, record, convert to docs/demo/*.mp4 and *.gif
 *
 * Not part of `pnpm e2e`: these files end in .demo.ts.
 */
const port = Number(process.env.E2E_PORT ?? 3110);
const baseURL = `http://127.0.0.1:${port}`;
const start = `pnpm exec next start -H 127.0.0.1 -p ${port}`;

export default defineConfig({
  testDir: "./e2e/demo",
  testMatch: /.*\.demo\.ts/,
  outputDir: "./e2e/.demo-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: [["list"]],
  use: {
    baseURL,
    testIdAttribute: "data-testid",
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    video: { mode: "on", size: { width: 1280, height: 720 } },
    locale: "en-SA",
    timezoneId: "Asia/Riyadh",
    colorScheme: "light",
  },
  webServer: {
    command: process.env.E2E_PREBUILT ? start : `pnpm build && ${start}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
