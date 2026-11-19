import type { Page } from "@playwright/test";
import { test, expect, tid, enterAs, typeNumber } from "./fixtures";

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

/** The properties of every event of this name, in order. */
const props = async (page: Page, name: string) => (await only(page, name)).map((e) => e.properties);

/**
 * Exactly one event of this name, with exactly these property keys. Events fired from effects
 * after hydration land later in WebKit (#181), so wait for the first one, then check that no
 * second one follows within 300 ms.
 */
async function once(page: Page, name: string, keys: string[]) {
  await expect.poll(async () => (await only(page, name)).length, { message: `${name} fires exactly once` }).toBe(1);
  await page.waitForTimeout(300);
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
  await typeNumber(tid(page, "offer-line-price").nth(0), "2925");
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
  await expect.poll(() => props(page, "po_status_changed")).toEqual(["confirmed", "dispatched", "delivered", "paid"].map((status) => ({ po_id: poId, status })));
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
  // Never silent: bank transfer is a choice the contractor makes.
  await tid(page, "po-pay-bank").check();
  await tid(page, "po-place").click();
  await expect(tid(page, "po-confirmation")).toBeVisible();
  expect(await once(page, "po_placed", ["po_id", "payment_method", "within_credit_cap"])).toMatchObject({ payment_method: "bank_transfer", within_credit_cap: false });
});

test("analytics carry ids, counts and enums only (no names or free text)", async ({ page }) => {
  await enterAs(page, "supplier");
  await page.goto("/supplier/rfq/rfq_1044");
  await typeNumber(tid(page, "offer-line-price").nth(0), "2925");
  await tid(page, "offer-submit").click();
  await expect(tid(page, "offer-submitted")).toBeVisible();
  await page.goto("/contractor/rfq/rfq_1044");
  await tid(page, "offer-choose").first().click();
  await tid(page, "po-place").click();
  await expect(tid(page, "po-confirmation")).toBeVisible();
  const text = JSON.stringify(await events(page));
  for (const forbidden of ["Rawasi", "Najd", "Al Malqa", "SAR", "Riyadh"]) expect(text, `no "${forbidden}" in analytics`).not.toContain(forbidden);
});

test("credit funnel: apply -> case opened -> checks -> evidence -> decision -> answer -> repay", async ({ page }) => {
  // Contractor applies.
  await enterAs(page, "contractor");
  await page.goto("/contractor/credit/apply");
  await expect(tid(page, "credit-apply-form")).toBeVisible();
  expect(await once(page, "credit_application_started", [])).toEqual({});
  await tid(page, "credit-apply-cap").fill("2000000");
  await tid(page, "credit-apply-purpose").fill("Rebar and ready-mix for Al Narjis Schools Complex, phase 2");
  await tid(page, "credit-apply-sample-docs").click();
  await tid(page, "credit-apply-sample-docs").click(); // attaching the same files again adds nothing
  await expect.poll(async () => (await only(page, "credit_document_uploaded")).length).toBe(8);
  await page.waitForTimeout(300); // as in once(): no late duplicates after the eighth
  const uploaded = await props(page, "credit_document_uploaded");
  expect(uploaded).toHaveLength(8);
  expect(new Set(uploaded.map((p) => p.document_type)).size).toBe(8);
  for (const p of uploaded) expect(Object.keys(p)).toEqual(["document_type"]);
  await tid(page, "credit-apply-simah-consent").check();
  await tid(page, "credit-apply-declaration").check();
  await tid(page, "credit-apply-submit").click();
  await expect(page).toHaveURL(/\/contractor\/credit#(cc_\w+)$/);
  const caseId = new URL(page.url()).hash.slice(1);
  expect(await once(page, "credit_application_submitted", ["case_id", "document_count"])).toEqual({ case_id: caseId, document_count: 8 });

  // Credit manager opens the case and runs the (simulated) checks.
  await page.goto(`/credit/cases/${caseId}`);
  await expect(tid(page, "credit-run-checks")).toBeVisible();
  expect(await once(page, "credit_case_opened", ["case_id"])).toEqual({ case_id: caseId });
  expect(await only(page, "credit_memo_viewed")).toHaveLength(0);
  await tid(page, "credit-run-checks").click();
  await expect(tid(page, "credit-decision-form")).toBeVisible();
  const checks = await once(page, "credit_checks_run", ["case_id", "band", "proposed_outcome", "provisional", "simulated_ai"]);
  expect(checks).toMatchObject({ case_id: caseId, simulated_ai: true });
  expect(["A", "B", "C", "D"]).toContain(checks.band);
  expect(["approve", "request_info", "decline"]).toContain(checks.proposed_outcome);
  expect(await once(page, "credit_memo_viewed", ["case_id", "simulated_ai"])).toEqual({ case_id: caseId, simulated_ai: true });

  await tid(page, "credit-gates").getByRole("link").first().click();
  const evidence = await once(page, "credit_evidence_opened", ["case_id", "document_type"]);
  expect(evidence.case_id).toBe(caseId);

  // Decision: request more information.
  await tid(page, "credit-outcome-request_info").check({ force: true });
  await tid(page, "credit-decision-items").fill("Bank statements for the second operating account");
  await tid(page, "credit-decision-reason").fill("Bank inflows need the second account to reconcile with VAT-declared sales.");
  const override = tid(page, "credit-decision-override");
  const overriding = (await override.count()) > 0;
  if (overriding) await override.fill("Manager wants the second account before deciding.");
  await tid(page, "credit-decision-submit").click();
  await expect(tid(page, "credit-case-status")).toHaveAttribute("data-status", "more_info_requested");
  expect(await once(page, "credit_decision_made", ["case_id", "outcome", "overrode_ai"])).toEqual({ case_id: caseId, outcome: "request_info", overrode_ai: overriding });
  expect(await only(page, "credit_case_opened"), "deciding does not re-open the case").toHaveLength(1);

  // Contractor answers, then repays the seeded credit draw.
  await page.goto("/contractor/credit");
  const card = tid(page, `credit-case-${caseId}`);
  await card.locator("textarea").fill("Attached the second account.");
  await card.getByTestId("credit-more-info-send").click();
  await expect(card.getByTestId("credit-more-info")).toHaveCount(0);
  expect(await once(page, "credit_info_provided", ["case_id", "file_count", "has_note"])).toEqual({ case_id: caseId, file_count: 0, has_note: true });

  await tid(page, "credit-repay-po_3007").click();
  await expect(tid(page, "credit-draw-po_3007")).toHaveAttribute("data-state", "repaid");
  expect(await once(page, "draw_repaid", ["po_id", "repaid_before_due", "tenor_days"])).toEqual({ po_id: "po_3007", repaid_before_due: true, tenor_days: 60 });

  // Credit events carry ids, counts and enums only.
  const text = JSON.stringify((await events(page)).filter((e) => e.event.startsWith("credit_") || e.event === "draw_repaid"));
  for (const forbidden of ["Najd", "Narjis", "SAR", "second account", "Reem"]) expect(text, `no "${forbidden}" in credit analytics`).not.toContain(forbidden);
});

test("activity feed, tax invoice and printing: one event per action, enums and ids only", async ({ page }) => {
  // window.print() opens a dialog; the test only needs to know it was asked for.
  await page.addInitScript(() => {
    window.print = () => sessionStorage.setItem("__printed", String(Number(sessionStorage.getItem("__printed") ?? "0") + 1));
  });
  await enterAs(page, "contractor");

  await tid(page, "activity-bell").click();
  const opened = await once(page, "activity_feed_opened", ["role", "unread"]);
  expect(opened.role).toBe("contractor");
  expect(["0", "1", "2-5", "6+"]).toContain(opened.unread);
  await tid(page, "activity-item").first().click();
  const item = await once(page, "activity_item_opened", ["role", "kind", "was_unread"]);
  expect(item.role).toBe("contractor");
  expect(typeof item.kind).toBe("string");
  expect(typeof item.was_unread).toBe("boolean");

  await page.goto("/contractor/po/po_3007");
  await tid(page, "po-print").click();
  expect(await once(page, "po_printed", ["po_id", "document", "locale"])).toEqual({ po_id: "po_3007", document: "po", locale: "en" });

  await tid(page, "po-invoice-link").click();
  await expect(tid(page, "invoice-qr")).toBeVisible();
  expect(await once(page, "invoice_viewed", ["po_id", "viewer", "locale"])).toEqual({ po_id: "po_3007", viewer: "contractor", locale: "en" });
  // Switching language is not a second view; printing in Arabic carries the reader's locale.
  await tid(page, "locale-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await tid(page, "invoice-print").click();
  await expect.poll(async () => (await only(page, "invoice_viewed")).length).toBe(1);
  await expect.poll(() => props(page, "po_printed")).toEqual([
    { po_id: "po_3007", document: "po", locale: "en" },
    { po_id: "po_3007", document: "invoice", locale: "ar" },
  ]);
  expect(await page.evaluate(() => sessionStorage.getItem("__printed"))).toBe("2");

  const text = JSON.stringify(await events(page));
  for (const forbidden of ["Rawasi", "Najd", "Sahra", "SAR", "ر.س", "INV-", "300000"]) expect(text, `no "${forbidden}" in analytics`).not.toContain(forbidden);
});

test("credit what-if: one event per committed lever change and on reset, never the value", async ({ page }) => {
  await page.goto("/credit/cases/cc_511");
  await tid(page, "credit-run-checks").click();
  await expect(tid(page, "credit-what-if")).toBeVisible();

  // Three key presses on one slider: three commits (keyup), each the lever name only.
  await tid(page, "credit-what-if-simah").focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowLeft");
  await tid(page, "credit-what-if-vat").click();
  await expect.poll(() => props(page, "credit_whatif_changed")).toEqual([
    { case_id: "cc_511", lever: "simah_score" },
    { case_id: "cc_511", lever: "simah_score" },
    { case_id: "cc_511", lever: "simah_score" },
    { case_id: "cc_511", lever: "vat_reconciled" },
  ]);

  await tid(page, "credit-what-if-reset").click();
  expect(await once(page, "credit_whatif_reset", ["case_id"])).toEqual({ case_id: "cc_511" });
});

test("credit what-if: no event when a lever does not actually move", async ({ page }) => {
  await page.goto("/credit/cases/cc_511");
  await tid(page, "credit-run-checks").click();
  await tid(page, "credit-what-if-years").focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("Home"); // already at the start: no change, no event
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => props(page, "credit_whatif_changed")).toEqual([{ case_id: "cc_511", lever: "years_trading" }]);
});
