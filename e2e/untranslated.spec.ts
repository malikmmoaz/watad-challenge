import { reference, seedState } from "@/data";
import { test, expect, ready } from "./fixtures";
import { PAGES } from "./pages";

// Arabic (ADR 0005): every visible word on a page is Arabic, except names, codes and figures.
// Fails with the English words it found, so a missed string is easy to locate.

/** Pages still being translated: remove a line in the PR that converts that area. */
const NOT_YET_TRANSLATED: Record<string, string> = {
  "/": "landing: Layla (part 3)",
  "/contractor": "procurement: Omar (#109)",
  "/contractor/rfq/new": "procurement: Omar (#109)",
  "/contractor/rfq/rfq_1042": "procurement: Omar (#109)",
  "/supplier": "supplier: Omar (#109)",
  "/supplier/rfq/rfq_1044": "supplier: Omar (#109)",
  "/contractor/credit": "credit: Hana",
  "/contractor/credit/apply": "credit: Hana",
  "/credit": "credit: Hana",
  "/credit/cases/cc_502": "credit: Hana",
  "/about": "Arabic copy is in src/content/about.ar.ts (#111) but the page doesn't render it yet",
  "/how-we-built": "Arabic copy is in src/content/how-we-built.ar.ts (#111) but the page doesn't render it yet",
};

/** Names from the sample data: companies, brands, projects, sites, specs, files. Allowed as they are. */
function sampleDataNames(): Set<string> {
  const words = new Set<string>();
  const NAME_KEYS = /^(name|title|spec|brands|brandsStocked|deliverySite|deliveryCity|city|sourceFileName|fileName|projectName|applicantName)$/;
  const walk = (v: unknown, key = "") => {
    if (typeof v === "string") {
      if (NAME_KEYS.test(key)) for (const w of v.match(/[A-Za-z][A-Za-z'’]*/g) ?? []) words.add(w.toLowerCase());
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(reference);
  walk(seedState);
  return words;
}

/** Product and standard names that stay in Latin script in Arabic text. */
const PROPER = new Set(
  ["Watad", "Abwab", "Next.js", "React", "TypeScript", "Tailwind", "Vercel", "GitHub", "PostHog", "Playwright", "Vitest", "ESLint",
    "Lighthouse", "axe", "Better", "Stack", "Claude", "Anthropic", "Nuphos", "WCAG", "pnpm", "ffmpeg", "Noto", "Sans", "Arabic", "Naskh"].map((w) => w.toLowerCase()),
);
const UNITS = new Set(["mm", "cm", "m", "kg", "t", "km", "x"]);

const allowed = (token: string, names: Set<string>) =>
  /[\d_]/.test(token) || // ids and figures: rfq_1042, po_3011, INV-mwm..., A615, 12mm
  /^[A-Z]{2,6}s?$/.test(token) || // codes: VAT, ZATCA, SIMAH, GOSI, RFQ, BOQ, APR, SAR, PO, CR
  /\.(pdf|csv|xlsx?|txt)$/i.test(token) ||
  UNITS.has(token.toLowerCase()) ||
  PROPER.has(token.toLowerCase()) ||
  names.has(token.toLowerCase());

for (const p of PAGES.concat([{ name: "404", path: "/does-not-exist" }])) {
  test(`untranslated: ${p.name} has no English words in Arabic`, async ({ page, appLocale, errors }) => {
    test.skip(appLocale !== "ar", "Arabic projects only");
    test.fixme(p.path in NOT_YET_TRANSLATED, NOT_YET_TRANSLATED[p.path]);
    const names = sampleDataNames();
    await page.goto(p.path);
    await ready(page);
    const found = await page.evaluate(() => {
      const out: { word: string; where: string }[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!el || !el.offsetParent) continue;
        // Intentional Latin: marked English, not for translation, or code.
        if (el.closest('[lang="en"], [translate="no"], code, kbd, pre, script, style')) continue;
        for (const m of (n.textContent ?? "").match(/[A-Za-z][\w.'’-]*/g) ?? []) out.push({ word: m.replace(/[.'’-]+$/, ""), where: (n.textContent ?? "").trim().slice(0, 60) });
      }
      return out;
    });
    // The 404 page answers 404 by design; the browser logs that as a console error.
    if (p.path === "/does-not-exist") errors.splice(0, errors.length, ...errors.filter((e) => !/status of 404/.test(e)));
    const english = found.filter((f) => !allowed(f.word, names));
    const summary = [...new Map(english.map((f) => [f.word, f.where])).entries()].slice(0, 15).map(([w, where]) => `"${w}" in "${where}"`);
    expect(summary, `English words on ${p.path} in Arabic`).toEqual([]);
  });
}
