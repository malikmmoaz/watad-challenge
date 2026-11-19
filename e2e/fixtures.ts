import { test as base, expect, type Locator, type Page } from "@playwright/test";

export type Role = "contractor" | "supplier" | "credit";
/** App language (ADR 0005). The Arabic projects in playwright.config.ts set "ar". */
export type AppLocale = "en" | "ar";
export const ROLES: Role[] = ["contractor", "supplier", "credit"];

// Third-party noise that is not ours to fix (analytics blocked in CI, etc.).
const IGNORED = [/posthog/i, /betterstack|logtail/i, /favicon/i, /Failed to load resource.*(40[13]|net::ERR_BLOCKED)/i];

/**
 * Shared fixture: fails a test on uncaught page errors or console errors,
 * so every smoke test also covers checklist row A11.
 */
export const test = base.extend<{ errors: string[]; appLocale: AppLocale; localeSetup: void }>({
  appLocale: ["en", { option: true }],
  // Store the locale before any page script runs, as a returning Arabic reader would have it.
  localeSetup: [
    async ({ page, appLocale }, use) => {
      if (appLocale === "ar") await page.addInitScript(() => window.localStorage.setItem("watad-locale", "ar"));
      await use();
    },
    { auto: true },
  ],
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => {
        // WebKit reports a same-origin request cancelled by a navigation as "... due to access
        // control checks": Next.js route prefetches (?_rsc=) and blob: worker URLs (/<uuid>, e.g. the
        // analytics recorder). Nothing breaks for the user; Chromium and Firefox stay silent.
        if (/(_rsc=\S*|\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}) due to access control checks/.test(e.message)) return;
        errors.push(`pageerror: ${e.message}`);
      });
      page.on("console", (m) => {
        // Firefox: a web font download aborted by a navigation (NS_BINDING_ABORTED = 2152398850).
        if (/downloadable font: download failed.*status=2152398850/.test(m.text())) return;
        if (m.type() === "error" && !IGNORED.some((re) => re.test(m.text()))) {
          errors.push(`console: ${m.text()}`);
        }
      });
      await use(errors);
      expect(errors, "no console or page errors during the journey").toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * Test id lookup limited to visible elements. With `cacheComponents` on, Next keeps
 * previously visited routes in the DOM (hidden), so the same test id can exist twice
 * after a client-side navigation. Always find things through this helper.
 */
export function tid(page: Page, id: string) {
  return page.getByTestId(id).filter({ visible: true });
}

/**
 * Wait until the page is shown in the stored locale: for Arabic, the boot script hides
 * the body (`html.i18n-pending`) until React has re-rendered in Arabic.
 */
export async function ready(page: Page) {
  await expect(page.locator("html")).not.toHaveClass(/i18n-pending/);
  // The boot script's safety net can lift i18n-pending before React has rendered Arabic
  // (seen under heavy load). In Arabic, also wait until the page header reads Arabic.
  if ((await page.locator("html").getAttribute("lang")) === "ar") {
    await page.waitForFunction(() => {
      const header = document.querySelector("header");
      return !header || /[\u0600-\u06FF]/.test(header.innerText);
    });
  }
}

/**
 * Wait until the page has stopped moving: web fonts loaded (WebKit fetches a font file only
 * when a glyph first needs it, and the swap can re-wrap a line), no streamed boundary still
 * hidden for the Arabic switch (`data-i18n-hydrated="false"`), and two frames painted.
 * With `target`, also wait until its position in the document holds still (whole pixels).
 * Use before axe (it runs over several ticks) and before any "nothing moved" measurement.
 */
export async function settled(page: Page, target?: Locator) {
  await page.waitForFunction(() => document.querySelectorAll('[data-i18n-hydrated="false"]').length === 0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  });
  if (target) {
    // Same whole-pixel position 300 ms apart (up to ~6 s): late layout has finished.
    const top = () => target.evaluate((el) => Math.round(el.getBoundingClientRect().top + window.scrollY));
    let last = await top();
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(300);
      const now = await top();
      if (now === last) return;
      last = now;
    }
    throw new Error(`settled(): ${target} kept moving`);
  }
}

/** Pick the expected text for the current locale. */
export const inLocale = <T>(locale: AppLocale, text: { en: T; ar: T }): T => text[locale];

/** Enter the app as a role from the landing page, the way a reviewer does. */
export async function enterAs(page: Page, role: Role) {
  await page.goto("/");
  await ready(page);
  await tid(page, `role-${role}`).click();
  await expect(page).toHaveURL(new RegExp(`/${role}(/|$)`));
  await ready(page);
}

/** Switch role from inside the app using the role switcher in the header. */
export async function switchTo(page: Page, role: Role) {
  await tid(page, `role-switcher-${role}`).click();
  await expect(page).toHaveURL(new RegExp(`/${role}(/|$)`));
  await expect(tid(page, `role-switcher-${role}`)).toHaveAttribute("aria-current", "page");
}

/** No horizontal scroll at the current viewport (checklist row A10). */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "page should not scroll horizontally").toBeLessThanOrEqual(1);
}

export { expect };
