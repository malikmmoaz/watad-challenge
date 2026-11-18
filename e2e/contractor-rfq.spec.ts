import { test, expect, tid, enterAs, expectNoHorizontalScroll } from "./fixtures";

// Contractor journey, part 1 (#8, PR #22): RFQ from a BOQ upload or the catalog, confirmed.
// Checklist rows B1-B7, A8 (simulated AI labelled), A13 (no empty first visit).

test("contractor opens on live work, not an empty state", async ({ page }) => {
  await enterAs(page, "contractor");
  await expect(tid(page, "rfq-row").first()).toBeVisible();
  await expect(page.getByText("No RFQs yet.")).toHaveCount(0);
});

test("upload a BOQ file: simulated reader fills editable lines, RFQ is confirmed", async ({ page, isMobile }) => {
  test.fixme(isMobile, "#29: Confirm RFQ cannot be clicked on phones while the table overflows");
  await enterAs(page, "contractor");
  const before = await tid(page, "rfq-row").count();
  await tid(page, "rfq-new").click();
  await expect(page.getByRole("heading", { level: 1, name: /new request for quotation/i })).toBeVisible();
  await expect(page.getByText("Simulated AI").first()).toBeVisible();

  await tid(page, "rfq-upload").setInputFiles({
    name: "boq-tower-b.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Deformed rebar 12 mm; 24; tonne\nOrdinary Portland Cement 50 kg bag; 400; bag\n"),
  });
  await expect(tid(page, "rfq-extraction")).toContainText(/from the file/i);
  await expect(tid(page, "rfq-extraction")).toContainText(/simulated ai/i);
  await expect(tid(page, "rfq-line")).toHaveCount(2);

  // Confirm quantities, specs and delivery (B4-B6).
  await tid(page, "rfq-line-qty").first().fill("30");
  await expect(tid(page, "rfq-estimate")).toContainText(/SAR/);
  await tid(page, "rfq-site").fill("Al Narjis Tower B, Riyadh");
  await tid(page, "rfq-required-in-14").click();
  await tid(page, "rfq-confirm").click();

  await expect(tid(page, "rfq-confirmed")).toBeVisible();
  await expect(tid(page, "rfq-id")).toHaveText(/^rfq_/);
  await expect(tid(page, "rfq-confirmed")).toContainText("Al Narjis Tower B, Riyadh");

  await page.getByRole("link", { name: "Back to my RFQs" }).click();
  await expect(tid(page, "rfq-row")).toHaveCount(before + 1);
  await expect(tid(page, "rfq-row").first()).toContainText("from upload");
});

test("pick from the catalog: confirm is blocked until the RFQ is complete", async ({ page, isMobile }) => {
  // On phones the overflowing line items table (#29) makes the page zoom out and
  // "Confirm RFQ" cannot be clicked. Re-enable on mobile with the #29 fix.
  test.fixme(isMobile, "#29");
  await enterAs(page, "contractor");
  await tid(page, "rfq-new").click();
  await tid(page, "rfq-tab-catalog").click();
  await expect(tid(page, "rfq-confirm")).toBeDisabled();

  await tid(page, "rfq-catalog-add").first().click();
  await tid(page, "rfq-catalog-add").nth(1).click();
  await expect(tid(page, "rfq-line")).toHaveCount(2);
  await tid(page, "rfq-line-qty").first().fill("0");
  await expect(tid(page, "rfq-confirm")).toBeDisabled();
  await tid(page, "rfq-line-qty").first().fill("120");
  await tid(page, "rfq-site").fill("King Salman Park, Riyadh");
  await tid(page, "rfq-required-in-30").click();
  await tid(page, "rfq-confirm").click();

  await expect(tid(page, "rfq-confirmed")).toContainText("2 line items");
  await page.getByRole("link", { name: "Back to my RFQs" }).click();
  await expect(tid(page, "rfq-row").first()).toContainText("from catalog");
});

test("new RFQ page fits a phone screen", async ({ page, isMobile }) => {
  test.fail(isMobile, "#29: line items table overflows by ~120px on phones; remove this line with the fix");
  await page.goto("/contractor/rfq/new");
  await tid(page, "rfq-upload-sample").click();
  await expect(tid(page, "rfq-line").first()).toBeVisible();
  await expectNoHorizontalScroll(page);
});
