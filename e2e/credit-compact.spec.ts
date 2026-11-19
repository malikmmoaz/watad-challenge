import { test, expect, tid } from "./fixtures";

// The compact case file: top factors next to the score, one row per factor with its why, effect and
// evidence one click away, and evidence links that open the collapsed document they point at.

test("top factors, factor detail on demand, and evidence opens its document", async ({ page }) => {
  await page.goto("/credit/cases/cc_512");
  await tid(page, "credit-run-checks").click();

  const top = tid(page, "credit-top-factors");
  await expect(top.getByTestId("credit-top-strongest").locator("li")).toHaveCount(3);
  await expect(top.getByTestId("credit-top-weakest").locator("li")).toHaveCount(2);

  // A factor row shows the bar and its one-line evidence; the why and the effect open on demand.
  const first = tid(page, "credit-factors").locator(":scope > li").first();
  await expect(first.getByText("Why it matters:")).toBeHidden();
  await first.locator("summary").click();
  await expect(first.getByText("Why it matters:")).toBeVisible();
  await expect(first.getByTestId("credit-factor-impact")).toBeVisible();

  // A top-factor link opens the row it names.
  const weakest = top.getByTestId("credit-top-weakest").locator("a").first();
  const target = (await weakest.getAttribute("href"))!.slice(1);
  await weakest.click();
  await expect(page.locator(`[id="${target}"] details`)).toHaveAttribute("open", "");

  // An evidence link into a collapsed document opens it at the field.
  const gate = tid(page, "credit-gates").locator("a[href^='#']").first();
  const field = (await gate.getAttribute("href"))!.slice(1);
  await expect(page.locator(`[id="${field}"]`)).toBeHidden();
  await gate.click();
  await expect(page.locator(`[id="${field}"]`)).toBeVisible();
});
