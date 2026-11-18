import { expect } from "@playwright/test";
import { test, tid, beat, show, press, type } from "./helpers";

test("1-contractor-rfq", async ({ page }) => {
  await page.goto("/");
  await beat(page, 1800);
  await press(page, page.getByTestId("role-contractor").first());
  await expect(page).toHaveURL(/\/contractor$/);
  await beat(page, 1500);
  await press(page, tid(page, "rfq-new"));
  await beat(page, 900);
  await press(page, tid(page, "rfq-upload-sample"));
  await show(page, tid(page, "rfq-line"), 2200);
  await type(page, tid(page, "rfq-site"), "Al Narjis Tower B, Riyadh");
  await press(page, tid(page, "rfq-required-in-14"));
  await press(page, tid(page, "rfq-confirm"));
  await expect(tid(page, "rfq-confirmed")).toBeVisible();
  await beat(page, 1500);
  await press(page, tid(page, "rfq-choose-suppliers"));
  await show(page, tid(page, "shortlist-row"), 2500);
  await show(page, tid(page, "shortlist-new-slot"), 2000);
  await show(page, tid(page, "shortlist-send"), 1500);
});

test("2-contractor-po-on-credit", async ({ page }) => {
  await page.goto("/contractor/rfq/rfq_1042");
  await beat(page, 1200);
  await show(page, tid(page, "offer-row"), 2500);
  await press(page, tid(page, "offer-choose"));
  await press(page, tid(page, "po-pay-credit"));
  await show(page, tid(page, "po-draft"), 2500);
  await press(page, tid(page, "po-place"));
  await expect(tid(page, "po-confirmation")).toBeVisible();
  await show(page, tid(page, "po-confirmation"), 3000);
});
