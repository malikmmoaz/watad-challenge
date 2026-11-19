import { expect } from "@playwright/test";
import { test, tid, beat, show, press } from "./helpers";

test("5-arabic-contractor-po", async ({ page }) => {
  await page.goto("/contractor");
  await beat(page, 1500);
  // EN / ع toggle in the app bar: the whole app switches to Arabic, right to left.
  await press(page, tid(page, "locale-toggle"));
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await beat(page, 2200);
  await page.goto("/contractor/rfq/rfq_1042");
  await expect(page.locator("html")).not.toHaveClass(/i18n-pending/);
  await beat(page, 1000);
  await show(page, tid(page, "offer-row"), 2500);
  await press(page, tid(page, "offer-choose"));
  await press(page, tid(page, "po-pay-credit"));
  await show(page, tid(page, "po-draft"), 2500);
  await press(page, tid(page, "po-place"));
  await expect(tid(page, "po-confirmation")).toBeVisible();
  await show(page, tid(page, "po-confirmation"), 3000);
});
