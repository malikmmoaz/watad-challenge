import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { seedState } from "@/data";
import { tour } from "./tour";

/** Static routes under src/app, plus the dynamic ones filled from seed ids. */
function routes(dir = join(__dirname, "../app"), base = ""): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...routes(p, `${base}/${name}`));
    else if (name === "page.tsx") out.push(base || "/");
  }
  return out;
}

const seedIds = new Set<string>([...seedState.rfqs.map((r) => r.id), ...seedState.creditCases.map((c) => c.id), ...seedState.purchaseOrders.map((p) => p.id)]);

function resolves(href: string): boolean {
  const known = routes();
  if (known.includes(href)) return true;
  return known.some((r) => {
    const re = new RegExp(`^${r.replace(/\[[^/]+\]/g, "([^/]+)")}$`);
    const m = href.match(re);
    return !!m && m.slice(1).every((id) => seedIds.has(id));
  });
}

describe("reviewer tour content", () => {
  const panels = Object.values(tour.panels);

  it("has one panel per role, keyed by its role", () => {
    expect(Object.keys(tour.panels).sort()).toEqual(["contractor", "credit", "supplier"]);
    for (const [key, p] of Object.entries(tour.panels)) expect(p.role).toBe(key);
  });

  it("keeps every step short enough to read at a glance", () => {
    for (const p of panels) {
      expect(p.steps).toHaveLength(3);
      for (const s of p.steps) {
        expect(s.title.length).toBeLessThanOrEqual(40);
        expect(s.text.length).toBeLessThanOrEqual(220);
        expect(Boolean(s.href)).toBe(Boolean(s.linkLabel));
      }
    }
  });

  it("links only to real routes and seeded records", () => {
    const hrefs = panels.flatMap((p) => [...p.steps.flatMap((s) => (s.href ? [s.href] : [])), p.next.href]);
    for (const h of hrefs) expect(resolves(h), h).toBe(true);
  });

  it("uses the platform's wording", () => {
    const text = JSON.stringify(tour);
    expect(text).not.toMatch(/\binterest\b/i);
    expect(text).not.toMatch(/\bquotes?\b/i);
    expect(tour.storageKey).toContain(`v${tour.version}`);
  });
});
