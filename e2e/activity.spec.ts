import AxeBuilder from "@axe-core/playwright";
import { test, expect, tid, enterAs, switchTo } from "./fixtures";

// Cross-role activity feed: the bell in the app bar lists what the other roles did.

test("bell: unread count, panel of deep links, Escape returns focus, mark all as read", async ({ page }) => {
  await enterAs(page, "contractor");
  const bell = tid(page, "activity-bell");
  // First visit: the last day of seed activity counts as new.
  await expect(tid(page, "activity-count")).toBeVisible();
  await expect(bell).toHaveAccessibleName(/^Activity, \d+ unread$/);

  await bell.click();
  await expect(bell).toHaveAttribute("aria-expanded", "true");
  const panel = tid(page, "activity-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { name: "What changed" })).toBeVisible();
  await expect(tid(page, "activity-item").first()).toHaveAttribute("href", /^\/contractor\//);

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(bell).toBeFocused();

  await bell.click();
  await tid(page, "activity-mark-read").click();
  await expect(tid(page, "activity-count")).toHaveCount(0);
  await expect(bell).toHaveAccessibleName("Activity");
  await expect(tid(page, "activity-mark-read")).toBeDisabled();
  await expect(page.locator('[data-testid="activity-item"][data-unread="true"]')).toHaveCount(0);

  // A deep link opens the item and closes the panel.
  const first = tid(page, "activity-item").first();
  const href = await first.getAttribute("href");
  await first.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(tid(page, "activity-panel")).toHaveCount(0);
});

test("cross-role: a supplier's offer shows up unread in the contractor's bell", async ({ page }) => {
  // The contractor has read everything.
  await enterAs(page, "contractor");
  await tid(page, "activity-bell").click();
  await tid(page, "activity-mark-read").click();
  await page.keyboard.press("Escape");
  await expect(tid(page, "activity-count")).toHaveCount(0);

  // The supplier sends an offer on rfq_1044.
  await switchTo(page, "supplier");
  await tid(page, "inbox-open").filter({ hasText: "Villas 13 to 24" }).click();
  await tid(page, "offer-line-price").nth(0).fill("3380");
  await tid(page, "offer-lead-time").fill("3");
  await tid(page, "offer-submit").click();
  await expect(tid(page, "offer-submitted")).toHaveAttribute("data-status", "submitted");

  // Back as the contractor: one new item, linking to the comparison.
  await switchTo(page, "contractor");
  await expect(tid(page, "activity-count")).toHaveText("1");
  await tid(page, "activity-bell").click();
  const item = page.locator('[data-testid="activity-item"][data-unread="true"]').filter({ visible: true });
  await expect(item).toHaveCount(1);
  await expect(item).toContainText("Rawasi Building Materials Trading sent an offer on Villas 13 to 24");
  await expect(item).toHaveAttribute("href", "/contractor/rfq/rfq_1044");
});

test("bell panel has no serious or critical accessibility issues, English and Arabic", async ({ page }) => {
  await enterAs(page, "supplier");
  for (const locale of ["en", "ar"]) {
    if (locale === "ar") {
      await tid(page, "locale-toggle").click();
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    }
    await tid(page, "activity-bell").click();
    await expect(tid(page, "activity-panel")).toBeVisible();
    if (locale === "ar") await expect(tid(page, "activity-panel")).toContainText("ما الجديد");
    const results = await new AxeBuilder({ page }).include('[data-testid="activity-panel"]').include('[data-testid="activity-bell"]').analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), locale).toEqual([]);
    await page.keyboard.press("Escape");
  }
});

test("on a 390 px phone the panel stays inside the screen, English and Arabic", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterAs(page, "contractor");
  for (const locale of ["en", "ar"]) {
    if (locale === "ar") {
      await tid(page, "locale-toggle").click();
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    }
    await tid(page, "activity-bell").click();
    const box = (await tid(page, "activity-panel").boundingBox())!;
    expect(box.x, locale).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, locale).toBeLessThanOrEqual(390);
    await page.keyboard.press("Escape");
  }
});

test("Arabic phones: the bell does not push the app bar to more rows (390: one row; 320: bell beside EN, no sideways scroll)", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("watad-locale", "ar"));
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await enterAs(page, "contractor");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const header = page.locator("header").filter({ has: page.getByTestId("activity-bell") }).filter({ visible: true });
    const top = async (name: RegExp | string) => (await header.getByRole("button", { name }).first().boundingBox())!.y;
    const bell = (await tid(page, "activity-bell").boundingBox())!.y;
    if (width === 390) expect(Math.abs((await top("إعادة")) - bell), `${width}px`).toBeLessThan(4);
    expect(Math.abs((await tid(page, "locale-toggle").boundingBox())!.y - bell), `${width}px`).toBeLessThan(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `${width}px`).toBeLessThanOrEqual(0);
  }
});
