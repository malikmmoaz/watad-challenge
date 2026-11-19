import AxeBuilder from "@axe-core/playwright";
import { test, expect, tid } from "./fixtures";

// Twelve-month cash flow in the case file: built from the bank statements, simulated-AI
// notes pinned to months that link to the evidence, a data-table fallback, the time axis
// left to right in both languages, axe-clean, and no layout shift.

for (const locale of ["en", "ar"] as const) {
  test(`cash-flow chart with notes, evidence and a data table (${locale})`, async ({ page }) => {
    await page.addInitScript((l) => window.localStorage.setItem("watad-locale", l), locale);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/credit/cases/cc_514");
    await expect(page.locator("html")).not.toHaveClass(/i18n-pending/);
    await tid(page, "credit-run-checks").click();

    const chart = tid(page, "credit-cashflow");
    await expect(chart).toBeVisible();
    await expect(chart).toContainText(locale === "ar" ? "محاكاة" : "Simulated");

    // Time runs left to right even in Arabic: the plot is LTR and the first month sits left of the last.
    const plot = chart.locator('svg[role="img"]');
    await expect(plot).toHaveAttribute("aria-label", /.+/);
    expect(await plot.evaluate((el) => getComputedStyle(el.parentElement!).direction)).toBe("ltr");
    // All twelve months fit the frame at any width (every other one labelled on phones), oldest on the left.
    const labels = plot.locator("text[data-month]");
    const xs = await labels.evaluateAll((els) => els.map((e) => Number(e.getAttribute("x"))));
    expect(xs.length).toBeGreaterThanOrEqual(4);
    expect(xs[0]!).toBeLessThan(xs[xs.length - 1]!);
    const months = await labels.evaluateAll((els) => els.map((e) => e.getAttribute("data-month")!));
    expect([...months].sort()).toEqual(months);
    const frame = await plot.evaluate((el) => ({ svg: el.getBoundingClientRect().width, box: el.parentElement!.getBoundingClientRect().width }));
    expect(frame.svg).toBeLessThanOrEqual(frame.box + 1);
    // Axis labels are readable: 12px as rendered.
    expect(await labels.first().evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(11);
    // The overdrawn month is marked in the closing-balance strip.
    await expect(plot.locator("circle[data-overdrawn]")).not.toHaveCount(0);

    // Notes: returned cheques and the overdrawn month for this file, each linking to the bank-statement evidence.
    const notes = tid(page, "credit-cashflow-notes").locator("li");
    await expect(notes.first()).toBeVisible();
    await expect(tid(page, "credit-cashflow-notes").locator('li[data-kind="returned_cheque"]').first()).toBeVisible();
    await expect(tid(page, "credit-cashflow-notes").locator('li[data-kind="overdrawn"]')).toHaveCount(1);
    const link = notes.first().locator("a");
    const href = (await link.getAttribute("href"))!;
    expect(href).toMatch(/^#.+-bank_/);
    await expect(page.locator(`[id="${href.slice(1)}"]`)).toHaveCount(1);
    await expect(chart).not.toContainText("(s)");

    // The data table fallback, twelve rows; opening it moves nothing above it.
    const box = () => plot.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top + window.scrollY, height: r.height }; });
    const before = await box();
    await chart.locator("summary").click();
    await expect(tid(page, "credit-cashflow-table").locator("tbody tr")).toHaveCount(12);
    expect(await box()).toEqual(before);

    const { violations } = await new AxeBuilder({ page }).include('[data-testid="credit-cashflow"]').withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  });
}

test("a clean account says nothing unusual", async ({ page }) => {
  await page.goto("/credit/cases/cc_511");
  await tid(page, "credit-run-checks").click();
  await expect(tid(page, "credit-cashflow-notes")).toBeVisible();
  await expect(tid(page, "credit-cashflow-notes").locator("li")).toHaveCount(0);
});
