import { test, expect, ready } from "./fixtures";
import { PAGES } from "./pages";

// Right to left (ADR 0005): in Arabic, no page scrolls sideways on narrow phones.
// Lists the elements that stick out past the left or right edge, to make a failure actionable.

const WIDTHS = [320, 390];


for (const p of PAGES) {
  test(`rtl: ${p.name} fits ${WIDTHS.join(" and ")} px without sideways scroll`, async ({ page, appLocale }, info) => {
    test.skip(appLocale !== "ar", "Arabic projects only");
    test.skip(info.project.name !== "desktop-ar", "widths are set here; one project is enough");
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(p.path);
      await ready(page);
      const result = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const out: string[] = [];
        // Inside a scrolling or clipping box (tables, carousels) is fine: it doesn't widen the page.
        const clipped = (el: HTMLElement) => {
          for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
            if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(a).overflowX)) return true;
          }
          return false;
        };
        for (const el of document.querySelectorAll<HTMLElement>("body *")) {
          if (!el.offsetParent || clipped(el)) continue;
          const r = el.getBoundingClientRect();
          const parent = el.parentElement?.getBoundingClientRect();
          // Report the outermost element that sticks out, not all its children.
          const sticksOut = r.width > 0 && (r.right > vw + 1 || r.left < -1);
          const parentInside = !parent || (parent.right <= vw + 1 && parent.left >= -1);
          if (sticksOut && parentInside) out.push(`${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ").slice(0, 3).join(".")} [${Math.round(r.left)}..${Math.round(r.right)}]`);
        }
        return { overflow: document.documentElement.scrollWidth - vw, offenders: out.slice(0, 5) };
      });
      expect(result.overflow, `${p.path} at ${width} px scrolls sideways; sticking out: ${result.offenders.join(", ")}`).toBeLessThanOrEqual(1);
    }
  });
}
