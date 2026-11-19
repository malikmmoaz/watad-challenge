import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { test, expect, tid, settled } from "./fixtures";

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

    // Today's score in the simulation is the scorecard's score; nothing is tinted yet.
    const today = (await resultCell(page, 0, 1).innerText()).trim();
    const simScore = tid(page, "credit-what-if-value-score");
    await expect(simScore).toHaveText(today);
    await expect(tid(page, "credit-what-if-sim-score")).toHaveAttribute("data-move", "same");
    await expect(tid(page, "credit-what-if-reset")).toBeDisabled();

    // Keyboard: SIMAH score to its minimum. No layout shift while the result changes.
    // Position in the document (not the viewport: focusing the slider may scroll the page).
    // Whole pixels: engines differ by fractions of a pixel (Firefox: 3591.3999 vs 3591.4001).
    const box = () => panel.evaluate((el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top + window.scrollY), height: Math.round(r.height) }; });
    await settled(page, panel);
    const before = await box();
    await tid(page, "credit-what-if-simah").focus();
    await page.keyboard.press("Home");
    await expect(simScore).not.toHaveText(today);
    const lower = Number((await simScore.innerText()).trim());
    expect(lower).toBeLessThan(Number(today));
    // What moved is visible: a signed delta and a "worse" tint on the changed cell.
    await expect(tid(page, "credit-what-if-delta-score")).toContainText(`\u2212${Number(today) - lower}`);
    await expect(tid(page, "credit-what-if-sim-score")).toHaveAttribute("data-move", "worse");
    const after = await box();
    // Within half a pixel: Firefox reports sub-pixel positions that differ in the last decimals.
    expect(Math.abs(after.height - before.height)).toBeLessThan(0.5);
    expect(Math.abs(after.top - before.top)).toBeLessThan(0.5);

    // The real decision is untouched.
    await expect(tid(page, "credit-case-status")).toHaveAttribute("data-status", "in_assessment");

    // Fewer years trading than policy allows: the simulated decision turns to decline.
    await tid(page, "credit-what-if-years").focus();
    await page.keyboard.press("Home");
    await expect(tid(page, "credit-what-if-value-decision")).toHaveText(locale === "ar" ? "رفض" : "Decline");
    await expect(tid(page, "credit-what-if-sim-decision")).toHaveAttribute("data-move", "worse");

    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).exclude("[hidden]").analyze();
    expect(violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);

    await tid(page, "credit-what-if-reset").click();
    await expect(simScore).toHaveText(today);
    await expect(tid(page, "credit-what-if-sim-score")).toHaveAttribute("data-move", "same");
    await expect(tid(page, "credit-what-if-reset")).toBeDisabled();
  });
}
