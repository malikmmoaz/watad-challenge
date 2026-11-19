import { expect } from "@playwright/test";
import { test, tid, beat, show, press, type } from "./helpers";

test("4-credit-manager-decision", async ({ page }) => {
  await page.goto("/credit");
  await beat(page, 2000);
  await press(page, page.getByTestId("credit-queue-row-cc_502").filter({ visible: true }).getByRole("link").first());
  await beat(page, 1200);
  await press(page, tid(page, "credit-run-checks"));
  await expect(tid(page, "credit-factors")).toBeVisible({ timeout: 15_000 });
  await show(page, tid(page, "credit-gates"), 1800);
  await show(page, tid(page, "credit-factors"), 3000);
  await show(page, tid(page, "credit-ai-panel"), 2500);
  await show(page, tid(page, "credit-decision-form"), 1000);
  await page.getByTestId("credit-outcome-request_info").filter({ visible: true }).first().check({ force: true });
  await beat(page, 700);
  await type(page, tid(page, "credit-decision-items"), "Bank statements for the second operating account, Jan-Jun");
  await type(page, tid(page, "credit-decision-reason"), "Revenue in the bank statements is below the VAT returns; we need the second account.");
  const override = page.getByTestId("credit-decision-override").filter({ visible: true });
  if (await override.count()) await type(page, override.first(), "Manager judgement after reading the statements.");
  await press(page, tid(page, "credit-decision-submit"));
  await expect(tid(page, "credit-case-status")).toHaveAttribute("data-status", "more_info_requested");
  await show(page, tid(page, "credit-decision-log"), 2500);
});
