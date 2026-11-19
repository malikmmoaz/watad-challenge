import AxeBuilder from "@axe-core/playwright";
import { test, expect, ready } from "./fixtures";
import { PAGES } from "./pages";

// Accessibility (axe-core, WCAG 2.2 A/AA): fail on serious or critical issues on the
// main page of each role, the explanation pages and the main journey forms. Minor and moderate ones are
// attached to the report so they stay visible without blocking merges.



for (const p of PAGES) {
  test(`a11y: ${p.name} has no serious or critical issues`, async ({ page, appLocale }, info) => {
    // Audit the settled page: entry animations fade text in, and a contrast check taken
    // mid-fade reports false failures (seen in WebKit).
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(p.path);
    await ready(page);
    // The page says which language and direction it is in (WCAG 3.1.1; screen readers pick the voice).
    await expect(page.locator("html")).toHaveAttribute("lang", appLocale);
    await expect(page.locator("html")).toHaveAttribute("dir", appLocale === "ar" ? "rtl" : "ltr");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      // cacheComponents keeps earlier routes in the DOM, hidden; only audit what is shown.
      .exclude("[hidden]")
      .analyze();
    const summary = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
      targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
    }));
    await info.attach("axe-violations.json", { body: JSON.stringify(summary, null, 2), contentType: "application/json" });
    const blocking = summary.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(blocking, `serious/critical a11y issues on ${p.path}`).toEqual([]);
  });
}
