import type { Page } from "@playwright/test";
import { test, expect, tid, enterAs } from "./fixtures";

// Credit at PO time is never dropped silently (Safina, with Hana's #1): when an order does not fit
// the cap, the RFQ page and the PO draft say so, the draft offers the alternatives, and bank
// transfer is an explicit choice, recorded on the confirmation.

/** Leave SAR 50,000 of Najd's SAR 1.5M cap, so rfq_1042's offers (about SAR 0.5M) do not fit. */
async function capNearlyUsed(page: Page) {
  await page.evaluate(() => {
    const k = "watad-demo-state-v1";
    const s = JSON.parse(localStorage.getItem(k) ?? "null");
    s.creditFacilities.find((f: { contractorId: string }) => f.contractorId === "con_najd").drawn = 145_000_000;
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload();
}

test("over the cap: the RFQ page does not contradict itself, the draft explains and waits for a choice", async ({ page }) => {
  await enterAs(page, "contractor");
  await page.goto("/contractor/rfq/rfq_1042");
  // Persist the seed first, then use most of the cap.
  await tid(page, "offers-blind-toggle").check();
  await tid(page, "offers-blind-toggle").uncheck();
  await capNearlyUsed(page);

  await expect(tid(page, "credit-plan")).toContainText("but this RFQ is above what is left of it");
  await expect(tid(page, "credit-plan")).not.toHaveText("You plan to pay this order from your credit cap.");

  await tid(page, "offer-row").filter({ hasText: "Rawasi" }).getByTestId("offer-choose").click();
  const alert = tid(page, "po-credit-blocked");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("above what is left of your credit cap (SAR 50,000.00 of SAR 1,500,000.00)");
  await expect(alert.getByTestId("po-blocked-apply")).toContainText("apply for a higher credit cap");
  // The reason is said once (in the alert), not again under the radio.
  await expect(page.getByText("above what is left of your credit cap")).toHaveCount(1);

  // Nothing is chosen for the contractor: credit cannot be used, bank is not pre-selected, Place waits.
  await expect(tid(page, "po-pay-credit")).toBeDisabled();
  await expect(tid(page, "po-pay-credit")).not.toBeChecked();
  await expect(tid(page, "po-pay-bank")).not.toBeChecked();
  await expect(tid(page, "po-place")).toBeDisabled();
  await expect(tid(page, "po-choose-method")).toHaveText("Choose how to pay before placing the order.");

  await tid(page, "po-pay-bank").check();
  await expect(tid(page, "po-place")).toBeEnabled();
  await tid(page, "po-place").click();
  await expect(tid(page, "po-confirmation")).toContainText("Not used: this order did not fit your credit cap, so you chose bank transfer");
});

test("within the cap nothing changes: credit is preselected and the order places on credit", async ({ page }) => {
  await enterAs(page, "contractor");
  await page.goto("/contractor/rfq/rfq_1042");
  await expect(tid(page, "credit-plan")).toHaveText("You plan to pay this order from your credit cap.");
  await tid(page, "offer-row").filter({ hasText: "Rawasi" }).getByTestId("offer-choose").click();
  await expect(tid(page, "po-credit-blocked")).toHaveCount(0);
  await expect(tid(page, "po-pay-credit")).toBeChecked();
  await expect(tid(page, "po-place")).toBeEnabled();
  await tid(page, "po-place").click();
  await expect(tid(page, "po-confirmation")).toContainText("supplier paid directly");
});

test("a supplier that refuses credit: the alert says so, and does not suggest a split or a higher cap", async ({ page }) => {
  await enterAs(page, "contractor");
  await page.goto("/contractor/rfq/rfq_1042");
  await tid(page, "offer-row").filter({ hasText: "Khaleej" }).getByTestId("offer-choose").click();
  const alert = tid(page, "po-credit-blocked");
  await expect(alert).toContainText("does not accept platform credit");
  await expect(alert.getByTestId("po-blocked-split")).toHaveCount(0);
  await expect(alert.getByTestId("po-blocked-apply")).toHaveCount(0);
  await expect(tid(page, "po-place")).toBeDisabled();
  await tid(page, "po-pay-bank").check();
  await expect(tid(page, "po-place")).toBeEnabled();
});
