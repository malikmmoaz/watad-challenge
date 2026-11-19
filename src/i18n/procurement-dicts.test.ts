import { describe, expect, it } from "vitest";
import type { Messages } from "./core";
import { procurement } from "./procurement";
import { supplier } from "./supplier";
import { activity } from "./activity";
import { offers, purchaseOrders, rfqs } from "@/data";

const leaves = (o: Messages | string, path = ""): [string, string][] =>
  typeof o === "string" ? [[path, o]] : Object.entries(o).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const ARABIC = /[؀-ۿ]/;
// Unit symbols are written the same way in both languages.
const SAME_IN_BOTH = /^units(One)?\.(m3|m|m2)$|^offer\.lineSummary$/;

describe.each([
  ["procurement", procurement],
  ["supplier", supplier],
  ["activity", activity],
])("%s messages", (_name, dict) => {
  const en = new Map(leaves(dict.en as Messages));
  const ar = new Map(leaves(dict.ar as Messages));

  it("use the same placeholders in English and Arabic", () => {
    for (const [key, text] of en) expect(placeholders(ar.get(key) ?? ""), key).toEqual(placeholders(text));
  });

  it("have every Arabic entry in Arabic and nothing left empty", () => {
    for (const [key, text] of ar) {
      expect(text.trim(), key).not.toBe("");
      if (!SAME_IN_BOTH.test(key)) expect(ARABIC.test(text), `${key}: ${text}`).toBe(true);
    }
  });

  it("call credit a Murabaha profit rate, never interest, and use Watad's credit-cap term", () => {
    const arText = [...ar.values()].join(" ");
    expect(arText).not.toMatch(/فائدة|فوائد|السقف الائتماني/);
    expect([...en.values()].join(" ")).not.toMatch(/\binterest\b/i);
  });
});

describe("shortlist reasons", () => {
  it("every reason the logic produces has a message whose placeholders its values fill", async () => {
    const { reference, rfqs, creditFacilities } = await import("@/data");
    const { buildShortlist } = await import("@/lib/procurement/shortlist");
    const facility = creditFacilities[0]!;
    const seen = new Set<string>();
    for (const rfq of rfqs) {
      for (const wantsCredit of [true, false]) {
        const { shortlisted, notShortlisted } = buildShortlist(reference.suppliers, { ...rfq, wantsCredit }, { materials: reference.materials, facility: { available: facility.cap }, priceIndex: { sup_rawasi: 1, sup_sawari: 0.95, sup_khaleej: 1.08 } });
        for (const row of [...shortlisted, ...notShortlisted]) {
          for (const r of row.reasons) {
            seen.add(r.msg.key);
            const template = (procurement.en.reasons as Record<string, string>)[r.msg.key];
            expect(template, r.msg.key).toBeDefined();
            for (const p of placeholders(template!)) expect(Object.keys(r.msg.values), `${r.msg.key}.${p}`).toContain(p);
          }
        }
      }
    }
    expect(seen.size).toBeGreaterThan(10);
  });
});

describe("seed data in Arabic", () => {
  it("every seed RFQ has an Arabic title and delivery site, and Arabic notes when it has notes", () => {
    for (const r of rfqs) {
      expect(r.titleAr, r.id).toMatch(ARABIC);
      expect(r.deliverySiteAr, r.id).toMatch(ARABIC);
      if (r.notes) expect(r.notesAr, r.id).toMatch(ARABIC);
    }
  });

  it("every seed offer note and PO timeline note has an Arabic variant", () => {
    for (const o of offers) if (o.notes) expect(o.notesAr, o.id).toMatch(ARABIC);
    for (const po of purchaseOrders) for (const e of po.timeline) if (e.note) expect(e.noteAr, `${po.id} ${e.status}`).toMatch(ARABIC);
  });

  it("po_3011's delivery plan reads in Arabic (Arabic gate)", () => {
    const po = purchaseOrders.find((p) => p.id === "po_3011");
    const confirmed = po?.timeline.find((e) => e.status === "confirmed");
    expect(confirmed?.note).toBe("Rebar on 20 Nov, cement on 21 Nov");
    expect(confirmed?.noteAr).toBe("حديد التسليح في 20 نوفمبر، والإسمنت في 21 نوفمبر");
  });
});
