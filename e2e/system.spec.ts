import { test, expect } from "@playwright/test";

// Production hardening: security headers and the not-found page.
// Uses the plain Playwright test: a 404 document logs a console error by design.

test("every page sends the security headers", async ({ request }) => {
  for (const path of ["/", "/contractor", "/does-not-exist"]) {
    const res = await request.get(path);
    const h = res.headers();
    expect(h["content-security-policy"], path).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"], path).toContain("https://eu.i.posthog.com");
    expect(h["x-frame-options"], path).toBe("DENY");
    expect(h["x-content-type-options"], path).toBe("nosniff");
    expect(h["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"], path).toContain("camera=()");
    expect(h["x-powered-by"], path).toBeUndefined();
  }
});

test("unknown pages show the designed not-found page with a way back", async ({ page }) => {
  const res = await page.goto("/contractor/rfq-that-does-not-exist/x");
  expect(res?.status()).toBe(404);
  await expect(page.getByTestId("not-found")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page is not part of the demo");
  await page.getByRole("link", { name: "Supplier" }).click();
  await expect(page).toHaveURL(/\/supplier$/);
});
