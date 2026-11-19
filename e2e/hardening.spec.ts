import { seedState } from "@/data";
import { test, expect, tid, enterAs } from "./fixtures";

/** A copy of `o` without the given keys (to fake data saved before those fields existed). */
const without = <T extends object>(o: T, ...keys: string[]): T => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k))) as T;

// Edge cases a reviewer might poke before the freeze (Safina, 19 Nov): odd quantities, a double
// submit, the back button after a PO, a reload mid-flow and demo state saved by an older build.
// The fixture fails any test that logs a console or page error.

test("RFQ quantities: part of a bag, a huge number and an empty field all block confirming, with a reason", async ({ page }) => {
  await enterAs(page, "contractor");
  await tid(page, "rfq-new").click();
  await tid(page, "rfq-tab-catalog").click();
  await page.locator('[data-testid="rfq-catalog-add"][data-material="mat_cement_opc"]').filter({ visible: true }).click();
  await tid(page, "rfq-site").fill("Al Malqa Villas, Plot 14, Riyadh");
  await tid(page, "rfq-required-in-14").click();
  const qty = tid(page, "rfq-line-qty").first();
  const confirm = tid(page, "rfq-confirm");

  await qty.fill("1.5");
  await expect(confirm).toBeDisabled();
  await expect(page.getByText("Bags, pieces and rolls are ordered in whole numbers")).toBeVisible();
  await expect(qty).toHaveAttribute("aria-invalid", "true");

  await qty.fill("5000000");
  await expect(confirm).toBeDisabled();
  await expect(page.getByText("Quantities are at most 1,000,000 per line")).toBeVisible();

  await qty.fill("");
  await expect(confirm).toBeDisabled();
  await expect(page.getByText("Every line needs a quantity above zero")).toBeVisible();

  await qty.fill("1500");
  await expect(confirm).toBeEnabled();
  await expect(qty).not.toHaveAttribute("aria-invalid", "true");
});

test("a double click on Confirm RFQ creates one RFQ", async ({ page }) => {
  await enterAs(page, "contractor");
  const before = await tid(page, "rfq-row").count();
  await tid(page, "rfq-new").click();
  await tid(page, "rfq-tab-catalog").click();
  await tid(page, "rfq-catalog-add").first().click();
  await tid(page, "rfq-line-qty").first().fill("12");
  await tid(page, "rfq-site").fill("Al Narjis Schools Complex, Gate 2, Riyadh");
  await tid(page, "rfq-required-in-14").click();
  // The second click may land on "Choose suppliers", which takes the place of Confirm: that is fine.
  await tid(page, "rfq-confirm").dblclick();
  // Stored state holds every seed RFQ (the list shows only this contractor's open ones): one more.
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("watad-demo-state-v1") ?? "{}").rfqs?.length ?? 0)).toBe(seedState.rfqs.length + 1);
  await page.goto("/contractor");
  await expect(tid(page, "rfq-row")).toHaveCount(before + 1);
  // One line, one material: the title is singular.
  await expect(tid(page, "rfq-row").first()).toContainText(": 1 material");
});

test("after placing a PO, Back and reload cannot place a second one", async ({ page }) => {
  await enterAs(page, "contractor");
  await page.goto("/contractor/rfq/rfq_1042");
  await tid(page, "offer-choose").first().click();
  await tid(page, "po-place").click();
  await expect(tid(page, "po-confirmation")).toBeVisible();

  await page.goBack();
  await page.goForward();
  await page.reload();
  // The RFQ is awarded: no Choose buttons, one PO for it.
  await expect(tid(page, "po-row")).toHaveCount(1);
  await expect(tid(page, "offer-choose")).toHaveCount(0);
  const pos = await page.evaluate(
    () => (JSON.parse(localStorage.getItem("watad-demo-state-v1") ?? "{}").purchaseOrders as { rfqId: string }[]).filter((p) => p.rfqId === "rfq_1042").length,
  );
  expect(pos).toBe(1);
});

test("demo state saved by an older build (missing collections, no Arabic fields) still loads every role", async ({ page }) => {
  // What an earlier deploy might have left: only some collections, and seed RFQs and PO notes
  // from before the Arabic fields existed.
  const older = {
    rfqs: seedState.rfqs.map((r) => without(r, "titleAr", "deliverySiteAr", "notesAr")),
    purchaseOrders: seedState.purchaseOrders.map((p) => ({ ...p, timeline: p.timeline.map((e) => without(e, "noteAr")) })),
  };
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem("__seeded")) {
      localStorage.setItem("watad-demo-state-v1", s);
      localStorage.setItem("watad-locale", "ar");
      sessionStorage.setItem("__seeded", "1");
    }
  }, JSON.stringify(older));
  await enterAs(page, "contractor");
  for (const path of ["/contractor", "/contractor/rfq/rfq_1042", "/supplier", "/supplier/rfq/rfq_1044", "/credit"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  // Seed titles still read in Arabic through the lookup by English text.
  await page.goto("/supplier");
  await expect(page.getByText("الفلل من 13 إلى 24: بلاطات الدور الأرضي").first()).toBeVisible();
  await page.goto("/contractor/po/po_3011");
  await expect(page.getByText("حديد التسليح في 20 نوفمبر، والإسمنت في 21 نوفمبر")).toBeVisible();
});
