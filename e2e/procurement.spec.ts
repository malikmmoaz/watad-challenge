import { test, expect, tid, enterAs, switchTo, expectNoHorizontalScroll } from "./fixtures";

// Procurement journey (#9, #10, #11): shortlist -> supplier offer -> comparison -> PO with
// credit -> status timeline to paid. Checklist rows B8-B12a, C1-C4, A8, A10.

test("explainable shortlist: why / why not, newcomer slot, send to picked suppliers", async ({ page }) => {
  await enterAs(page, "contractor");
  await tid(page, "rfq-new").click();
  await tid(page, "rfq-tab-catalog").click();
  await page.locator('[data-testid="rfq-catalog-add"][data-material="mat_rebar_16"]').filter({ visible: true }).click();
  await page.locator('[data-testid="rfq-catalog-add"][data-material="mat_cement_opc"]').filter({ visible: true }).click();
  await tid(page, "rfq-line-qty").nth(0).fill("20");
  await tid(page, "rfq-line-qty").nth(1).fill("900");
  await tid(page, "rfq-required-in-14").click();
  await tid(page, "rfq-wants-credit").check();
  await tid(page, "rfq-confirm").click();
  await tid(page, "rfq-choose-suppliers").click();

  await expect(tid(page, "credit-cap-available")).toContainText("SAR");
  const rows = tid(page, "shortlist-row");
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThanOrEqual(3);
  await expect(tid(page, "shortlist-new-slot")).toHaveCount(1);
  await expect(tid(page, "shortlist-why").first()).toContainText(/Delivers to Riyadh/);
  // Every excluded supplier carries its own reasons.
  await page.getByText(/Not shortlisted \(\d+\) and why/).click();
  await expect(tid(page, "shortlist-excluded").first()).toBeVisible();
  await expect(tid(page, "shortlist-excluded").first().getByTestId("shortlist-why-not")).not.toBeEmpty();

  await tid(page, "rfq-blind-toggle").check();
  await tid(page, "shortlist-send").click();
  await expect(tid(page, "shortlist-sent")).toContainText(/blind comparison on/);
  await expect(tid(page, "rfq-status")).toHaveText(/sent/i);
  await expectNoHorizontalScroll(page);
});

test("supplier sees only invited requests and cannot open others", async ({ page }) => {
  await enterAs(page, "supplier");
  await expect(tid(page, "inbox-row").first()).toBeVisible();
  await expect(tid(page, "inbox-open").filter({ hasText: "Villas 13 to 24" })).toBeVisible();
  await page.goto("/supplier/rfq/rfq_1043");
  await expect(page.getByRole("heading", { level: 1, name: "Request not available" })).toBeVisible();
  await expect(tid(page, "offer-form")).toHaveCount(0);
});

test("end to end: supplier offer, contractor PO paid with credit, supplier paid directly", async ({ page }) => {
  // Supplier answers the open request with an offer (bid).
  await enterAs(page, "supplier");
  await tid(page, "inbox-open").filter({ hasText: "Villas 13 to 24" }).click();
  await expect(page.getByText("Your offer (bid)")).toBeVisible();
  await tid(page, "offer-submit").click();
  await expect(page.getByText(/(Quote|Enter) a unit price for at least one line\./)).toBeVisible();
  await tid(page, "offer-line-price").nth(0).fill("3380");
  await tid(page, "offer-line-price").nth(1).fill("15.4");
  await tid(page, "offer-delivery").fill("2500");
  await tid(page, "offer-lead-time").fill("3");
  // (3,380 x 24 + 15.40 x 1,800) = 108,840 goods + 2,500 delivery + 15% VAT = 128,041
  await expect(tid(page, "offer-summary")).toContainText("SAR 128,041.00");
  await tid(page, "offer-submit").click();
  await expect(tid(page, "offer-submitted")).toHaveAttribute("data-status", "submitted");

  // Contractor compares and places the PO, paying from the credit cap.
  await switchTo(page, "contractor");
  await page.goto("/contractor/rfq/rfq_1044");
  await expect(page.getByText(/Compare offers \(bids\)/)).toBeVisible();
  await expect(tid(page, "offer-row")).toHaveCount(1);
  await tid(page, "offer-choose").first().click();
  await expect(tid(page, "po-pay-credit")).toBeChecked();
  await expect(tid(page, "po-murabaha")).toContainText(/profit rate/);
  await tid(page, "po-place").click();
  await expect(tid(page, "po-confirmation")).toContainText("SAR 128,041.00");
  await expect(tid(page, "po-confirmation")).toContainText(/supplier paid directly/i);
  await expect(tid(page, "po-status")).toHaveAttribute("data-status", "placed");
  const po = (await tid(page, "po-number").first().textContent())!.trim();
  expect(po).toMatch(/^po_/);

  // Supplier accepts and dispatches; contractor confirms delivery; supplier invoices.
  await page.goto(`/supplier/po/${po}`);
  await tid(page, "po-action").click();
  await expect(tid(page, "po-status")).toHaveAttribute("data-status", "confirmed");
  await tid(page, "po-action").click();
  await expect(tid(page, "po-status")).toHaveAttribute("data-status", "dispatched");
  await page.goto(`/contractor/po/${po}`);
  await tid(page, "po-action").click();
  await expect(tid(page, "po-status")).toHaveAttribute("data-status", "delivered");
  await page.goto(`/supplier/po/${po}`);
  await tid(page, "po-action").click();

  // A credit PO is paid to the supplier by the financier as soon as it invoices.
  await expect(tid(page, "po-status")).toHaveAttribute("data-status", "paid");
  await expect(page.getByText(/Directly by the financier, /)).toBeVisible();
  await expect(tid(page, "po-action")).toHaveCount(0);
  await expectNoHorizontalScroll(page);
});

test("comparison: landed cost incl. VAT, blind mode, the RFQ is awarded once", async ({ page }) => {
  await enterAs(page, "contractor");
  await page.goto("/contractor/rfq/rfq_1042");
  await expect(tid(page, "offer-row")).toHaveCount(3);
  await expect(tid(page, "offer-row").first()).toContainText(/SAR/);
  await tid(page, "offers-blind-toggle").check();
  await expect(tid(page, "offer-supplier").first()).toHaveText(/^Supplier [A-C]$/);
  await tid(page, "offers-blind-toggle").uncheck();
  await tid(page, "offer-choose").first().click();
  await tid(page, "po-pay-bank").check();
  await tid(page, "po-place").click();
  await expect(tid(page, "po-confirmation")).toContainText(/Bank transfer/);
  await page.reload();
  await expect(tid(page, "po-row")).toHaveCount(1);
  await expect(tid(page, "offer-choose")).toHaveCount(0);
});
