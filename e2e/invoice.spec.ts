import AxeBuilder from "@axe-core/playwright";
import { reference } from "@/data";
import { test, expect, tid, enterAs, switchTo } from "./fixtures";

// Printable PO and the simplified tax invoice with the ZATCA Phase 1 QR (sample, never sent to ZATCA).

/** Read the QR's base64 TLV back into its five fields. */
function decode(b64: string): string[] {
  const bytes = Buffer.from(b64, "base64");
  const out: string[] = [];
  for (let i = 0; i < bytes.length; ) {
    const len = bytes[i + 1]!;
    out.push(bytes.subarray(i + 2, i + 2 + len).toString("utf8"));
    i += 2 + len;
  }
  return out;
}

test("an invoiced PO links to its tax invoice: sample label, QR with the ZATCA fields, VAT totals", async ({ page }) => {
  await enterAs(page, "contractor");
  await page.goto("/contractor/po/po_3007");
  await tid(page, "po-invoice-link").click();
  await expect(page).toHaveURL(/\/contractor\/po\/po_3007\/invoice$/);
  const inv = tid(page, "tax-invoice");
  await expect(inv).toContainText("Simplified tax invoice");
  await expect(inv).toContainText("INV-2026-0412");
  // Bilingual, as Saudi tax invoices are: the Arabic title sits right under the English heading.
  await expect(tid(page, "invoice-title-alt")).toHaveText("فاتورة ضريبية مبسطة");
  await expect(tid(page, "invoice-title-alt")).toHaveAttribute("lang", "ar");
  await expect(tid(page, "invoice-sample")).toContainText("Sample: not submitted to ZATCA");

  const qr = tid(page, "invoice-qr");
  await expect(qr.locator("path")).toHaveCount(1);
  const fields = decode((await qr.getAttribute("data-payload"))!);
  const seller = reference.suppliers.find((s) => s.vatNumber === fields[1])!;
  expect(seller, "seller VAT number belongs to a sample supplier").toBeTruthy();
  expect(fields[0]).toBe(seller.nameAr);
  expect(fields[2]).toBe("2026-11-13T09:30:00Z");
  // Totals on the page match the QR (SAR 1,234.56 -> 1234.56).
  const plain = async (id: string) => (await tid(page, id).innerText()).replace(/[^\d.]/g, "");
  expect(fields[3]).toBe(await plain("invoice-total"));
  expect(fields[4]).toBe(await plain("invoice-vat"));
  await expect(tid(page, "invoice-line").first()).toBeVisible();
});

test("before invoicing there is no invoice; after the supplier invoices, the link and QR appear", async ({ page }) => {
  await enterAs(page, "contractor");
  await page.goto("/contractor/po/po_3011/invoice");
  await expect(tid(page, "invoice-not-yet")).toBeVisible();
  await page.goto("/contractor/po/po_3011");
  await expect(tid(page, "po-invoice-link")).toHaveCount(0);

  // Supplier dispatches, contractor confirms delivery, supplier invoices.
  await switchTo(page, "supplier");
  await page.goto("/supplier/po/po_3011");
  await tid(page, "po-action").click(); // dispatch
  await tid(page, "po-advance").click(); // demo: contractor confirms delivery
  await tid(page, "po-action").click(); // issue invoice
  await expect(tid(page, "po-invoice-link")).toBeVisible();
  await tid(page, "po-invoice-link").click();
  await expect(page).toHaveURL(/\/supplier\/po\/po_3011\/invoice$/);
  const fields = decode((await tid(page, "invoice-qr").getAttribute("data-payload"))!);
  expect(fields[0]).toBe("رواسي لتجارة مواد البناء");
  expect(fields).toHaveLength(5);
});

test("print: only the document is on paper (no app bar, guide or buttons)", async ({ page }) => {
  await enterAs(page, "contractor");
  await page.goto("/contractor/po/po_3007/invoice");
  await expect(tid(page, "tax-invoice")).toBeVisible();
  await expect(tid(page, "invoice-print")).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByTestId("role-switcher")).toBeHidden();
  await expect(page.getByTestId("reviewer-guide")).toBeHidden();
  await expect(page.getByTestId("invoice-print")).toBeHidden();
  await expect(page.getByTestId("invoice-back")).toBeHidden();
  await expect(tid(page, "invoice-qr")).toBeVisible();
  await expect(tid(page, "invoice-sample")).toBeVisible();

  await page.emulateMedia({ media: "screen" });
  await page.goto("/contractor/po/po_3007");
  await expect(tid(page, "po-print")).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByTestId("po-print")).toBeHidden();
  await expect(tid(page, "po-total")).toBeVisible();
});

test("PO and tax invoice have no serious or critical accessibility issues, English and Arabic", async ({ page }) => {
  await enterAs(page, "contractor");
  for (const locale of ["en", "ar"]) {
    if (locale === "ar") {
      await tid(page, "locale-toggle").click();
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    }
    for (const path of ["/contractor/po/po_3007", "/contractor/po/po_3007/invoice"]) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      if (path.endsWith("invoice")) {
        await expect(tid(page, "invoice-qr").locator("path")).toHaveCount(1);
        if (locale === "ar") await expect(tid(page, "tax-invoice")).toContainText("فاتورة ضريبية مبسطة");
        if (locale === "ar") await expect(tid(page, "invoice-title-alt")).toHaveText("Simplified tax invoice");
      }
      const results = await new AxeBuilder({ page }).include("main").analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), `${locale} ${path}`).toEqual([]);
    }
  }
});
