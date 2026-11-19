import { test, expect, tid, enterAs } from "./fixtures";

// The core credit story: a contractor with a SAR 1,500,000 cap applies for a higher one, the
// credit manager approves it, and the next purchase order is paid on credit. A higher-cap
// application starts at the current cap, must ask for more, and an approval never lowers the cap.

test("apply for a higher cap, approve it, then pay a purchase order on credit", async ({ page }) => {
  test.setTimeout(60_000);
  await enterAs(page, "contractor");
  await page.goto("/contractor/credit");
  await tid(page, "credit-apply-start").click();

  // The form starts at the current cap and will not take less.
  const cap = tid(page, "credit-apply-cap");
  await expect(cap).toHaveValue("1500000");
  await expect(page.getByText("Your current cap is SAR 1,500,000.00")).toBeVisible();
  await cap.fill("750000");
  await tid(page, "credit-apply-purpose").fill("Rebar and ready-mix for Al Narjis Schools Complex, phase 2");
  await tid(page, "credit-apply-sample-docs").click();
  await tid(page, "credit-apply-simah-consent").check();
  await tid(page, "credit-apply-declaration").check();
  await tid(page, "credit-apply-submit").click();
  await expect(page.getByText("Ask for more than your current cap of SAR 1,500,000.00.")).toBeVisible();
  await cap.fill("2000000");
  await tid(page, "credit-apply-submit").click();
  await expect(page).toHaveURL(/\/contractor\/credit#(cc_\w+)$/);
  const caseId = new URL(page.url()).hash.slice(1);
  // While waiting, the contractor is told what happens next.
  await expect(tid(page, `credit-case-${caseId}`).getByTestId("credit-next")).toContainText("What happens next");

  // The credit manager sees the current cap next to the one being approved.
  await page.goto(`/credit/cases/${caseId}`);
  await tid(page, "credit-run-checks").click();
  await tid(page, "credit-outcome-approve").check({ force: true });
  await tid(page, "credit-decision-cap").fill("1800000");
  await expect(tid(page, "credit-decision-current-cap")).toHaveText("Current cap SAR 1,500,000.00 → approving SAR 1,800,000.00");
  await tid(page, "credit-decision-cap").fill("1000000");
  await expect(tid(page, "credit-decision-current-cap")).toContainText("the cap stays at SAR 1,500,000.00");
  await tid(page, "credit-decision-cap").fill("1800000");
  await tid(page, "credit-decision-reason").fill("Backlog and liquidity support a higher cap; SIMAH clean.");
  const override = tid(page, "credit-decision-override");
  if (await override.count()) await override.fill("Manager judgement after reviewing the documents.");
  await tid(page, "credit-decision-submit").click();
  await expect(tid(page, "credit-decision-log")).toContainText("Credit cap raised from 1,500,000 to 1,800,000 SAR");

  // The contractor sees the cap raised, not replaced.
  await page.goto(`/contractor/credit#${caseId}`);
  const card = tid(page, `credit-case-${caseId}`);
  // The block leads with the cap: the new figure, and what it was.
  await expect(card.getByTestId("credit-for-you-cap")).toContainText("SAR 1,800,000.00");
  await expect(card.getByTestId("credit-for-you-cap")).toContainText("was SAR 1,500,000.00");
  await expect(card.getByTestId("credit-cap-change")).toHaveCount(0);
  // What this means for them: the cap before and after, band and Murabaha markup with APR, and the reasons in plain words.
  const forYou = card.getByTestId("credit-for-you");
  await expect(forYou.getByTestId("credit-for-you-cap")).toHaveAttribute("data-changed", "true");
  await expect(forYou.getByTestId("credit-for-you-cap")).toContainText("SAR 1,800,000.00");
  await expect(forYou.getByTestId("credit-for-you-rate")).toContainText("APR");
  await expect(forYou).not.toContainText(/interest/i);
  await expect(card.getByTestId("credit-reasons-for")).toBeVisible();

  // The next purchase order (SAR 560,993.00) fits and is paid on credit.
  await page.goto("/contractor/rfq/rfq_1042");
  await tid(page, "offer-choose").first().click();
  await expect(tid(page, "po-pay-credit")).toBeEnabled();
  await expect(tid(page, "po-pay-credit")).toBeChecked();
  await tid(page, "po-place").click();
  await expect(tid(page, "po-confirmation")).toContainText(/supplier paid directly/i);
});

test("draws read as cards on a phone, in Arabic, without sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => window.localStorage.setItem("watad-locale", "ar"));
  await page.goto("/contractor/credit");
  await expect(page.locator("html")).not.toHaveClass(/i18n-pending/);
  const draw = tid(page, "credit-draw-po_3007");
  await expect(draw).toBeVisible();
  await expect(draw).toContainText("ر.س");
  await expect(tid(page, "credit-repay-po_3007")).toBeVisible();
  const box = await draw.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
