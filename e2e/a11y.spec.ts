import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures";

// Accessibility (axe-core, WCAG 2.2 A/AA): fail on serious or critical issues on the
// main page of each role, the explanation pages and the main journey forms. Minor and moderate ones are
// attached to the report so they stay visible without blocking merges.

const PAGES = [
  { name: "landing", path: "/" },
  { name: "contractor home", path: "/contractor" },
  { name: "supplier home", path: "/supplier" },
  { name: "credit manager queue", path: "/credit" },
  { name: "about", path: "/about" },
  { name: "how we built it", path: "/how-we-built" },
  // Journey pages: the forms and tables a reviewer works through.
  { name: "new RFQ form", path: "/contractor/rfq/new" },
  { name: "offer comparison", path: "/contractor/rfq/rfq_1042" },
  { name: "credit application", path: "/contractor/credit/apply" },
  { name: "supplier offer form", path: "/supplier/rfq/rfq_1044" },
  { name: "credit case file", path: "/credit/cases/cc_502" },
];

for (const p of PAGES) {
  test(`a11y: ${p.name} has no serious or critical issues`, async ({ page }, info) => {
    await page.goto(p.path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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
