import type { Page } from "@playwright/test";
import { test, expect, tid, enterAs, switchTo } from "./fixtures";

// Credit journey (#13, PR #35): contractor applies -> independent credit manager runs checks, reads the
// scorecard, requests more information -> contractor answers -> manager approves. Checklist rows E1-E16, D3-D5.

async function applyAsContractor(page: Page) {
  await enterAs(page, "contractor");
  await tid(page, "contractor-credit-link").click();
  await tid(page, "credit-apply-start").click();
  await tid(page, "credit-apply-cap").fill("750000");
  await tid(page, "credit-apply-purpose").fill("Rebar and ready-mix for Al Narjis Schools Complex, phase 2");
  await tid(page, "credit-apply-sample-docs").click();
  await tid(page, "credit-apply-simah-consent").check();
  await tid(page, "credit-apply-declaration").check();
  await tid(page, "credit-apply-submit").click();
  await expect(page).toHaveURL(/\/contractor\/credit#(cc_\w+)$/);
  return new URL(page.url()).hash.slice(1);
}

async function decide(page: Page, outcome: "approve" | "request_info" | "decline", reason: string) {
  await tid(page, `credit-outcome-${outcome}`).check({ force: true });
  await tid(page, "credit-decision-reason").fill(reason);
  const override = tid(page, "credit-decision-override");
  if (await override.count()) await override.fill("Manager judgement for the e2e journey; documents reviewed by hand.");
  await tid(page, "credit-decision-submit").click();
}

test("apply, request more information, answer it, approve", async ({ page }) => {
  test.setTimeout(45_000);
  const caseId = await applyAsContractor(page);

  // Independent credit manager: queue -> case file.
  await switchTo(page, "credit");
  const row = tid(page, `credit-queue-row-${caseId}`);
  await expect(row).toBeVisible();
  await row.getByRole("link").first().click();
  await expect(page).toHaveURL(new RegExp(`/credit/cases/${caseId}$`));

  await expect(tid(page, "credit-run-checks")).toContainText(/simulated AI/i);
  await tid(page, "credit-run-checks").click();
  await expect(tid(page, "credit-gates")).toBeVisible();

  // Every factor: why it matters + effect on score, band and limit (brief: "why each factor matters and how it affects the outcome").
  const factors = tid(page, "credit-factors").locator(":scope > li");
  await expect(factors).toHaveCount(10);
  for (const f of await factors.all()) {
    await expect(f).toContainText("Why it matters:");
    await expect(f.getByTestId("credit-factor-impact")).toContainText(/score .*band .*limit/i);
  }
  await expect(tid(page, "credit-ai-panel")).toContainText(/simulated/i);

  // The brief's three actions, by name.
  const form = tid(page, "credit-decision-form");
  for (const name of ["Approve", "Request more information", "Decline"]) {
    await expect(form.getByText(name, { exact: true })).toBeVisible();
  }

  // Reasons are required.
  await tid(page, "credit-outcome-request_info").check({ force: true });
  await tid(page, "credit-decision-submit").click();
  await expect(form).toContainText(/write the reason/i);
  await tid(page, "credit-decision-items").fill("Bank statements for the second operating account, Jan-Jun");
  await decide(page, "request_info", "Revenue in the bank statements is 18% below the VAT returns; we need the second account.");
  await expect(tid(page, "credit-case-status")).toHaveAttribute("data-status", "more_info_requested");

  // Contractor sees the request with its reason and answers.
  await switchTo(page, "contractor");
  await page.goto(`/contractor/credit#${caseId}`);
  const card = tid(page, `credit-case-${caseId}`);
  await expect(card.getByTestId("credit-tracker-status")).toHaveAttribute("data-status", "more_info_requested");
  await expect(card.getByTestId("credit-more-info")).toContainText("second account");
  await card.getByLabel(/note to the credit manager/i).fill("Uploaded the Al Rajhi statements, Jan-Jun.");
  await card.getByTestId("credit-more-info-send").click();
  await expect(card.getByTestId("credit-more-info")).toHaveCount(0);

  // The answer sends the case back to document review: the manager re-runs checks, then approves with a reason.
  await page.goto(`/credit/cases/${caseId}`);
  await expect(tid(page, "credit-decision-log")).toContainText(/more information provided/i);
  await tid(page, "credit-run-checks").click();
  await decide(page, "approve", "Statements reconcile with VAT returns; strong contracts in hand with government payers.");
  await expect(tid(page, "credit-case-status")).toHaveAttribute("data-status", "approved");
  await expect(tid(page, "credit-decision-log")).toContainText(/approve/i);

  await page.goto(`/contractor/credit#${caseId}`);
  await expect(tid(page, `credit-case-${caseId}`).getByTestId("credit-outcome")).toContainText("Statements reconcile");
});
