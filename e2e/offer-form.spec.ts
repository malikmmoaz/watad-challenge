import { test, expect, tid, enterAs, typeNumber } from "./fixtures";

// Supplier offer form: a reviewer can start from the 90-day benchmark instead of inventing prices.

test("benchmark placeholders, and one click starts every empty price at its benchmark", async ({ page }) => {
  await enterAs(page, "supplier");
  await page.goto("/supplier/rfq/rfq_1044");
  const prices = tid(page, "offer-line-price");
  await expect(prices).toHaveCount(2);
  // Placeholders show each line's benchmark (rebar 12 mm SAR 3,445.00/t, OPC SAR 15.81/bag).
  await expect(prices.nth(0)).toHaveAttribute("placeholder", "3445.00");
  await expect(prices.nth(1)).toHaveAttribute("placeholder", "15.81");
  await expect(tid(page, "offer-summary")).toContainText("SAR 0.00");

  // A price the supplier already typed is kept; only empty lines are filled.
  await typeNumber(prices.nth(1), "15.2");
  await tid(page, "offer-start-benchmark").click();
  await expect(prices.nth(0)).toHaveValue("3445");
  await expect(prices.nth(1)).toHaveValue("15.2");
  await expect(tid(page, "offer-start-benchmark")).toBeDisabled();
  await expect(tid(page, "offer-summary")).not.toContainText("= SAR 0.00");

  await tid(page, "offer-submit").click();
  await expect(tid(page, "offer-submitted")).toHaveAttribute("data-status", "submitted");
});

test("the start button reads in Arabic", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("watad-locale", "ar"));
  await enterAs(page, "supplier");
  await page.goto("/supplier/rfq/rfq_1044");
  await expect(tid(page, "offer-start-benchmark")).toHaveText("ابدأ من السعر المرجعي لآخر 90 يومًا (بيانات تجريبية)");
});
