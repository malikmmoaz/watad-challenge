import type { Page } from "@playwright/test";
import { test, expect, tid, enterAs, expectNoHorizontalScroll } from "./fixtures";

// Contractor journey, part 2 (#12, PR #27): apply for credit, track it, see the outcome, answer a request for more info.
// Checklist rows D1-D8, A8.

const STORE_KEY = "watad-demo-state-v1";

async function openCredit(page: Page) {
  await enterAs(page, "contractor");
  await tid(page, "contractor-credit-link").click();
  await expect(page).toHaveURL(/\/contractor\/credit$/);
  await expect(tid(page, "credit-facility")).toBeVisible();
  await expectNoHorizontalScroll(page);
}

test("credit page shows the facility and a decided application with reasons", async ({ page }) => {
  await openCredit(page);
  await expect(tid(page, "credit-facility")).toContainText(/Murabaha/i);
  await expect(tid(page, "credit-facility")).toContainText(/APR/);
  await expect(tid(page, "credit-facility")).not.toContainText(/interest/i);
  const decided = tid(page, "credit-case-cc_501");
  await expect(decided.getByTestId("credit-tracker-status")).toHaveAttribute("data-status", "approved");
  await expect(decided.getByTestId("credit-outcome")).toBeVisible();
  await expect(decided.getByTestId("credit-outcome")).not.toBeEmpty();
});

test("apply with documents and SIMAH consent, then answer a request for more info", async ({ page }) => {
  await openCredit(page);
  await tid(page, "credit-apply-start").click();
  await expect(page).toHaveURL(/\/contractor\/credit\/apply$/);

  // Every document says why it matters; empty submit is refused.
  const docs = page.locator('[data-testid^="credit-doc-"]:visible');
  expect(await docs.count()).toBeGreaterThanOrEqual(9);
  await expectNoHorizontalScroll(page);
  await tid(page, "credit-apply-submit").click();
  await expect(page).toHaveURL(/\/apply$/);
  await expect(page.getByText(/SIMAH consent is required/i)).toBeVisible();

  await tid(page, "credit-apply-cap").fill("2000000");
  await tid(page, "credit-apply-purpose").fill("Rebar and ready-mix for Al Narjis Schools Complex, phase 2");
  await tid(page, "credit-apply-sample-docs").click();
  await tid(page, "credit-apply-simah-consent").check();
  await tid(page, "credit-apply-declaration").check();
  await tid(page, "credit-apply-submit").click();

  // Lands on the credit page, scrolled to the new application.
  await expect(page).toHaveURL(/\/contractor\/credit#cc_\w+$/);
  const submitted = page.locator('[data-testid^="credit-case-"]:visible').filter({
    has: page.locator('[data-testid="credit-tracker-status"][data-status="submitted"]'),
  });
  await expect(submitted).toHaveCount(1);
  const caseId = (await submitted.getAttribute("data-testid"))!.replace("credit-case-", "");

  // The credit manager asks for more information (their workspace is #13; set the decision directly).
  await page.evaluate(
    ([key, id]) => {
      const s = JSON.parse(localStorage.getItem(key)!);
      s.creditCases = s.creditCases.map((c: { id: string }) =>
        c.id === id
          ? { ...c, status: "more_info_requested", decision: { outcome: "request_info", decidedBy: "Credit manager", decidedAt: new Date().toISOString(), reasonCodes: [], reasonText: "Please upload the bank statements for the second operating account.", requestedItems: ["Bank statements, second account"], overrodeAi: false } }
          : c,
      );
      localStorage.setItem(key, JSON.stringify(s));
    },
    [STORE_KEY, caseId],
  );
  await page.reload();
  const card = tid(page, `credit-case-${caseId}`);
  await expect(card.getByTestId("credit-tracker-status")).toHaveAttribute("data-status", "more_info_requested");
  await expect(card.getByTestId("credit-more-info")).toContainText("second operating account");
  await card.getByLabel(/note to the credit manager/i).fill("Uploaded the Al Rajhi statements, Jan-Jun.");
  await card.getByTestId("credit-more-info-send").click();
  await expect(card.getByTestId("credit-tracker-status")).not.toHaveAttribute("data-status", "more_info_requested");
  await expect(card.getByTestId("credit-more-info")).toHaveCount(0);
});
