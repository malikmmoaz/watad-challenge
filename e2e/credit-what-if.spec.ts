import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { test, expect, tid } from "./fixtures";

// What-if on the credit manager's scorecard: move a few facts, see score, band, limit and
// Murabaha pricing respond. A simulation: labelled, resettable, no layout shift, axe-clean.

const resultCell = (page: Page, row: number, col: 1 | 2) => tid(page, "credit-what-if-result").locator("tbody tr").nth(row).locator("td").nth(col - 1);

for (const locale of ["en", "ar"] as const) {
  test(`what-if moves the outcome live and resets (${locale})`, async ({ page }) => {
    await page.addInitScript((l) => window.localStorage.setItem("watad-locale", l), locale);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/credit/cases/cc_511");
    await expect(page.locator("html")).not.toHaveClass(/i18n-pending/);
    await tid(page, "credit-run-checks").click();
    const panel = tid(page, "credit-what-if");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(locale === "ar" ? "محاكاة، لا تُحفظ" : "Simulation, not saved");

    // Today's score in the simulation is the scorecard's score.
    const today = (await resultCell(page, 0, 1).innerText()).trim();
    await expect(resultCell(page, 0, 2)).toHaveText(today);
    await expect(tid(page, "credit-what-if-reset")).toBeDisabled();

    // Keyboard: SIMAH score to its minimum. No layout shift while the result changes.
    // Position in the document (not the viewport: focusing the slider may scroll the page).
    const box = () => panel.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: r.top + window.scrollY, height: r.height }; });
    const before = await box();
    await tid(page, "credit-what-if-simah").focus();
    await page.keyboard.press("Home");
    await expect(resultCell(page, 0, 2)).not.toHaveText(today);
    expect(Number((await resultCell(page, 0, 2).innerText()).trim())).toBeLessThan(Number(today));
    const after = await box();
    expect(after.height).toBe(before.height);
    expect(after.top).toBe(before.top);

    // The real decision is untouched.
    await expect(tid(page, "credit-case-status")).toHaveAttribute("data-status", "in_assessment");

    // Fewer years trading than policy allows: the simulated decision turns to decline.
    await tid(page, "credit-what-if-years").focus();
    await page.keyboard.press("Home");
    await expect(resultCell(page, 2, 2)).toHaveText(locale === "ar" ? "رفض" : "decline");

    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).exclude("[hidden]").analyze();
    expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);

    await tid(page, "credit-what-if-reset").click();
    await expect(resultCell(page, 0, 2)).toHaveText(today);
    await expect(tid(page, "credit-what-if-reset")).toBeDisabled();
  });
}
