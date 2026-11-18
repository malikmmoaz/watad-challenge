import { test as base, expect, type Page } from "@playwright/test";

export type Role = "contractor" | "supplier" | "credit";
export const ROLES: Role[] = ["contractor", "supplier", "credit"];

// Third-party noise that is not ours to fix (analytics blocked in CI, etc.).
const IGNORED = [/posthog/i, /betterstack|logtail/i, /favicon/i, /Failed to load resource.*(40[13]|net::ERR_BLOCKED)/i];

/**
 * Shared fixture: fails a test on uncaught page errors or console errors,
 * so every smoke test also covers checklist row A11.
 */
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      page.on("console", (m) => {
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

/** Enter the app as a role from the landing page, the way a reviewer does. */
export async function enterAs(page: Page, role: Role) {
  await page.goto("/");
  await tid(page, `role-${role}`).click();
  await expect(page).toHaveURL(new RegExp(`/${role}(/|$)`));
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
