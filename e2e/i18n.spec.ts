import AxeBuilder from "@axe-core/playwright";
import { test as plain } from "@playwright/test";
import { test, expect, tid, enterAs, expectNoHorizontalScroll, settled } from "./fixtures";

// Arabic and right-to-left (ADR 0005): the EN / ع toggle in the app bar.

test("the toggle switches the app bar to Arabic and right-to-left, and back", async ({ page }) => {
  await enterAs(page, "contractor");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await tid(page, "locale-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(tid(page, "role-switcher-supplier")).toHaveText("المورّد");
  await expect(tid(page, "locale-toggle")).toContainText("EN");
  await expect(tid(page, "locale-toggle")).toHaveAccessibleName(/^EN\b/);
  await expectNoHorizontalScroll(page);

  await tid(page, "locale-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(tid(page, "role-switcher-supplier")).toHaveText("Supplier");
});

test("the Arabic choice survives a reload and the page is shown", async ({ page }) => {
  await enterAs(page, "supplier");
  await tid(page, "locale-toggle").click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).not.toHaveClass(/i18n-pending/);
  await expect(page.locator("body")).toBeVisible();
  await expect(tid(page, "role-switcher-contractor")).toHaveText("المقاول");
  // Other pages follow the stored choice.
  await page.goto("/about");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(tid(page, "site-nav")).toContainText("كيف بنيناه");
});

// Plain Playwright test: the 404 document logs a console error by design.
plain("Arabic pages have no serious or critical accessibility issues", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("watad-locale", "ar"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of ["/contractor", "/does-not-exist"]) {
    await page.goto(path);
    await expect(page.locator("html")).not.toHaveClass(/i18n-pending/);
    // axe runs over several ticks: start it only once nothing is still being revealed (WebKit).
    await settled(page);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target}`);
    expect(blocking, `serious/critical a11y issues on ${path} (ar)`).toEqual([]);
  }
});

test("About and How we built it read in Arabic with the same sections", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("watad-locale", "ar"));
  for (const path of ["/about", "/how-we-built"]) {
    await page.goto(path);
    await expect(page.locator("html")).not.toHaveClass(/i18n-pending/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/[؀-ۿ]/);
    expect(await page.getByTestId("doc-section").count()).toBeGreaterThanOrEqual(5);
    await expect(page.getByRole("navigation", { name: "في هذه الصفحة" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  }
  // Anchors are shared across languages.
  await page.goto("/about#business-model");
  await expect(page.locator("#business-model")).toBeVisible();
});
