import { test, expect, tid, enterAs, switchTo, expectNoHorizontalScroll, ROLES } from "./fixtures";

// Scaffold-level smoke (#1): landing, three role areas, role switcher.
// Journey specs (contractor, supplier, credit) build on these helpers as #8-#13 land.

test("landing shows the three roles and the sample-data note", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const role of ROLES) {
    await expect(tid(page, `role-${role}`)).toBeVisible();
  }
  await expect(page.getByText(/sample data/i).first()).toBeVisible();
  await expectNoHorizontalScroll(page);
});

for (const role of ROLES) {
  test(`${role} area opens from the landing page`, async ({ page }) => {
    await enterAs(page, role);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/simulated AI/i).first()).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}

test("role switcher moves between all three roles from one link", async ({ page }) => {
  await enterAs(page, "contractor");
  await switchTo(page, "supplier");
  await switchTo(page, "credit");
  await switchTo(page, "contractor");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
});
