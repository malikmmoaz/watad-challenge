import { reference, seedState } from "@/data";
import { SAMPLE_CASES } from "@/domain/credit/samples";
import { test, expect, ready } from "./fixtures";
import { PAGES } from "./pages";

// Arabic (ADR 0005): every visible word on a page is Arabic, except names, codes and figures.
// Fails with the English words it found, so a missed string is easy to locate.

/** Pages still being translated: remove a line in the PR that converts that area. */
const NOT_YET_TRANSLATED: Record<string, string> = {
  // Checked on main 47e12d2 (19 Nov, 01:35 UTC), every page run without skips.
  "/contractor": "contractor home KPIs and copy: Omar (homes, in progress)",
  "/supplier": "supplier home KPIs and copy: Omar (homes, in progress)",
  "/credit/cases/cc_502": "seed free text in the sample case findings: Hana (in progress)",
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
  walk(SAMPLE_CASES); // the credit engine's sample applicants
  return words;
}

/** Product and standard names that stay in Latin script in Arabic text. */
const PROPER = new Set(
  ["Watad", "Abwab", "Next.js", "React", "TypeScript", "Tailwind", "Vercel", "GitHub", "PostHog", "Playwright", "Vitest", "ESLint",
    "Lighthouse", "axe", "Better", "Stack", "Claude", "Anthropic", "Nuphos", "WCAG", "pnpm", "ffmpeg", "Noto", "Sans", "Arabic", "Naskh"].map((w) => w.toLowerCase()),
);
const UNITS = new Set(["mm", "cm", "m", "kg", "t", "km", "x"]);
/** Product names made of ordinary words: allowed only as the whole phrase. */
const PHRASES = ["Claude Code", "App Router", "GitHub Actions", "Git", "impeccable"];
const inPhrase = (token: string, where: string) =>
  PHRASES.some((ph) => where.includes(ph) && ph.split(" ").some((w) => w.toLowerCase() === token.toLowerCase()));

const allowed = (token: string, names: Set<string>) =>
  /[\d_]/.test(token) || // ids and figures: rfq_1042, po_3011, INV-mwm..., A615, 12mm
  /^[A-Z]{2,6}s?$/.test(token) || // codes: VAT, ZATCA, SIMAH, GOSI, RFQ, BOQ, APR, SAR, PO, CR
  /\.(pdf|csv|xlsx?|txt)$/i.test(token) ||
  /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(token) || // hostnames, e.g. the demo's own address
  UNITS.has(token.toLowerCase()) ||
  PROPER.has(token.toLowerCase()) ||
  names.has(token.toLowerCase()) ||
  (token.includes("-") && token.split("-").every((part) => names.has(part.toLowerCase()))); // Al-Hijaz

for (const p of PAGES.concat([{ name: "404", path: "/does-not-exist" }])) {
  test(`untranslated: ${p.name} has no English words in Arabic`, async ({ page, appLocale, errors }) => {
    test.skip(appLocale !== "ar", "Arabic projects only");
    test.fixme(p.path in NOT_YET_TRANSLATED, NOT_YET_TRANSLATED[p.path]);
    const names = sampleDataNames();
    await page.goto(p.path);
    await ready(page);
    const found = await page.evaluate(() => {
      const out: { word: string; where: string; text: string }[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!el || !el.offsetParent) continue;
        // Intentional Latin: marked English, not for translation, or code.
        if (el.closest('[lang="en"], [translate="no"], code, kbd, pre, script, style')) continue;
        for (const m of (n.textContent ?? "").match(/[A-Za-z][\w.'’-]*/g) ?? []) out.push({ word: m.replace(/[.'’-]+$/, ""), where: (n.textContent ?? "").trim().slice(0, 60), text: n.textContent ?? "" });
      }
      return out;
    });
    // The 404 page answers 404 by design; the browser logs that as a console error.
    if (p.path === "/does-not-exist") errors.splice(0, errors.length, ...errors.filter((e) => !/status of 404/.test(e)));
    const english = found.filter((f) => !allowed(f.word, names) && !inPhrase(f.word, f.text));
    const summary = [...new Map(english.map((f) => [f.word, f.where])).entries()].slice(0, 15).map(([w, where]) => `"${w}" in "${where}"`);
    expect(summary, `English words on ${p.path} in Arabic`).toEqual([]);
  });
}
