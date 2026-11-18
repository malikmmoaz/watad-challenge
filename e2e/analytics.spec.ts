import type { Page } from "@playwright/test";
import { test, expect, tid, enterAs } from "./fixtures";

// Proves the PostHog funnels (#5): every catalogued procurement event fires exactly once per
// user action, with the typed properties in src/lib/analytics/events.ts, and carries only ids,
// counts and enums. A test-only sink records track() calls with or without a PostHog key.

type Entry = { event: string; properties: Record<string, unknown> };

test.beforeEach(async ({ page }) => {
  // Kept in sessionStorage so it survives full page loads within the journey.
  await page.addInitScript(() => {
    window.__WATAD_ANALYTICS_SINK__ = {
      push: (entry) => {
        const all = JSON.parse(sessionStorage.getItem("__sink") ?? "[]");
        all.push(entry);
        sessionStorage.setItem("__sink", JSON.stringify(all));
      },
    };
  });
});

const events = async (page: Page): Promise<Entry[]> => page.evaluate(() => JSON.parse(sessionStorage.getItem("__sink") ?? "[]"));
const only = async (page: Page, name: string) => (await events(page)).filter((e) => e.event === name);

/** Exactly one event of this name, with exactly these property keys. */
async function once(page: Page, name: string, keys: string[]) {
  const list = await only(page, name);
  expect(list, `${name} fires exactly once`).toHaveLength(1);
  expect(Object.keys(list[0]!.properties).sort(), `${name} properties`).toEqual([...keys].sort());
  return list[0]!.properties;
}

test("procurement funnel: RFQ -> shortlist -> sent", async ({ page }) => {
  await enterAs(page, "contractor");
  await tid(page, "rfq-new").click();
  await tid(page, "rfq-upload-sample").click();
  await expect(tid(page, "rfq-line")).toHaveCount(5);
  expect(await once(page, "rfq_started", ["source"])).toEqual({ source: "upload" });
  expect(await once(page, "rfq_parsed", ["line_count", "simulated_ai"])).toEqual({ line_count: 5, simulated_ai: true });

  await tid(page, "rfq-required-in-14").click();
  await tid(page, "rfq-wants-credit").check();
  await tid(page, "rfq-confirm").click();
  const rfqId = (await tid(page, "rfq-id").textContent())!.trim();
  await tid(page, "rfq-choose-suppliers").click();
  await expect(tid(page, "shortlist-row").first()).toBeVisible();
  const viewed = await once(page, "shortlist_viewed", ["rfq_id", "supplier_count"]);
  expect(viewed.rfq_id).toBe(rfqId);
  expect(viewed.supplier_count).toBe(await tid(page, "shortlist-row").count());

  await tid(page, "shortlist-send").click();
  await expect(tid(page, "shortlist-sent")).toBeVisible();
  const sent = await once(page, "rfq_sent", ["rfq_id", "line_count", "invited_suppliers", "wants_credit"]);
  expect(sent).toMatchObject({ rfq_id: rfqId, line_count: 5, wants_credit: true });
  expect(sent.invited_suppliers).toBeGreaterThan(0);
  // Sending does not re-fire the shortlist view.
  expect(await only(page, "shortlist_viewed")).toHaveLength(1);
});

test("procurement funnel: offer -> compared -> awarded -> PO with credit -> every status", async ({ page }) => {
  await enterAs(page, "supplier");
  await page.goto("/supplier/rfq/rfq_1044");
  await tid(page, "offer-line-price").nth(0).fill("3380");
  await tid(page, "offer-line-price").nth(1).fill("15.4");
  await tid(page, "offer-submit").click();
  await expect(tid(page, "offer-submitted")).toBeVisible();
  const offer = await once(page, "offer_submitted", ["rfq_id", "offer_id", "local_content", "terms"]);
  expect(offer).toMatchObject({ rfq_id: "rfq_1044", local_content: true, terms: "platform_credit_60" });
  expect(String(offer.offer_id)).toMatch(/^off_/);

  await page.goto("/contractor/rfq/rfq_1044");
  await expect(tid(page, "offer-row")).toHaveCount(1);
  expect(await once(page, "offers_compared", ["rfq_id", "offer_count"])).toEqual({ rfq_id: "rfq_1044", offer_count: 1 });

  await tid(page, "offer-choose").first().click();
  await tid(page, "po-place").click();
  const poId = (await tid(page, "po-number").first().textContent())!.trim();
  expect(await once(page, "offer_awarded", ["rfq_id", "offer_id", "rank"])).toEqual({ rfq_id: "rfq_1044", offer_id: offer.offer_id, rank: 1 });
  expect(await once(page, "po_placed", ["po_id", "payment_method", "within_credit_cap"])).toEqual({
    po_id: poId,
    payment_method: "platform_credit",
    within_credit_cap: true,
  });
  // The confirmation replaces the comparison: no second "compared".
  expect(await only(page, "offers_compared")).toHaveLength(1);

  // Every PO step is one event, in order (credit POs are paid as soon as they are invoiced).
  await page.goto(`/supplier/po/${poId}`);
  await tid(page, "po-action").click();
  await expect(tid(page, "po-status")).toHaveAttribute("data-status", "confirmed");
  await tid(page, "po-action").click();
  await expect(tid(page, "po-status")).toHaveAttribute("data-status", "dispatched");
  await page.goto(`/contractor/po/${poId}`);
  await tid(page, "po-action").click();
  await expect(tid(page, "po-status")).toHaveAttribute("data-status", "delivered");
  await page.goto(`/supplier/po/${poId}`);
  await tid(page, "po-action").click();
  await expect(tid(page, "po-status")).toHaveAttribute("data-status", "paid");
  const statuses = (await only(page, "po_status_changed")).map((e) => e.properties);
  expect(statuses).toEqual(["confirmed", "dispatched", "delivered", "paid"].map((status) => ({ po_id: poId, status })));
});

test("over the credit cap: po_placed says it did not fit", async ({ page }) => {
  await enterAs(page, "contractor");
  await page.goto("/contractor/rfq/rfq_1042");
  await tid(page, "offers-blind-toggle").check();
  await tid(page, "offers-blind-toggle").uncheck();
  await page.evaluate(() => {
    const k = "watad-demo-state-v1";
    const s = JSON.parse(localStorage.getItem(k)!);
    s.creditFacilities.find((f: { contractorId: string }) => f.contractorId === "con_najd").drawn = 145_000_000; // SAR 1.45M of 1.5M
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload();
  await tid(page, "offer-row").filter({ hasText: "Rawasi" }).getByTestId("offer-choose").click();
  await expect(tid(page, "po-credit-blocked")).toBeVisible();
  await tid(page, "po-place").click();
  await expect(tid(page, "po-confirmation")).toBeVisible();
  expect(await once(page, "po_placed", ["po_id", "payment_method", "within_credit_cap"])).toMatchObject({ payment_method: "bank_transfer", within_credit_cap: false });
});

test("analytics carry ids, counts and enums only (no names or free text)", async ({ page }) => {
  await enterAs(page, "supplier");
  await page.goto("/supplier/rfq/rfq_1044");
  await tid(page, "offer-line-price").nth(0).fill("3380");
  await tid(page, "offer-submit").click();
  await expect(tid(page, "offer-submitted")).toBeVisible();
  await page.goto("/contractor/rfq/rfq_1044");
  await tid(page, "offer-choose").first().click();
  await tid(page, "po-place").click();
  await expect(tid(page, "po-confirmation")).toBeVisible();
  const text = JSON.stringify(await events(page));
  for (const forbidden of ["Rawasi", "Najd", "Al Malqa", "SAR", "Riyadh"]) expect(text, `no "${forbidden}" in analytics`).not.toContain(forbidden);
});
