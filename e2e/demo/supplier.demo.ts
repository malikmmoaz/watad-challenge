import { expect } from "@playwright/test";
import { test, tid, beat, show, press, type } from "./helpers";

test("3-supplier-offer-and-po", async ({ page }) => {
  await page.goto("/supplier");
  await beat(page, 2000);
  await show(page, tid(page, "supplier-po-row"), 1800);
  const row = page.getByTestId("inbox-row").filter({ visible: true }).filter({ hasText: "rfq_1044" });
  await show(page, row, 1200);
  await press(page, row.getByTestId("inbox-open"));
  await beat(page, 1200);
  // Start from the 90-day benchmark (#159), then undercut it on rebar: the supplier still sets the price.
  await press(page, tid(page, "offer-start-benchmark"));
  await beat(page, 1200);
  const prices = page.getByTestId("offer-line-price").filter({ visible: true });
  await expect(prices.nth(1)).toHaveValue("15.81");
  await type(page, prices.nth(0), "2925");
  await type(page, tid(page, "offer-delivery"), "2500");
  await type(page, tid(page, "offer-lead-time"), "3");
  await show(page, tid(page, "offer-summary"), 2000);
  await press(page, tid(page, "offer-submit"));
  await expect(tid(page, "offer-submitted")).toBeVisible();
  await beat(page, 1500);
  await page.goto("/supplier");
  await beat(page, 900);
  const po = page.getByTestId("supplier-po-row").filter({ visible: true }).filter({ hasText: "po_3011" });
  await press(page, po.getByTestId("supplier-po-open"));
  await beat(page, 1200);
  await press(page, tid(page, "po-action"));
  await beat(page, 2500);
});
