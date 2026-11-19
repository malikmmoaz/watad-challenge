import { describe, expect, it } from "vitest";
import { credit } from "./credit";

/** Every leaf as [path, text]. */
function leaves(node: unknown, path = ""): [string, string][] {
  if (typeof node === "string") return [[path, node]];
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const en = leaves(credit.en);
const ar = leaves(credit.ar);
const arText = ar.map(([, v]) => v).join("\n");

describe("credit messages", () => {
  it("has the same keys and the same placeholders in English and Arabic", () => {
    expect(ar.map(([k]) => k)).toEqual(en.map(([k]) => k));
    const arByKey = new Map(ar);
    for (const [k, v] of en) expect(placeholders(arByKey.get(k)!), k).toEqual(placeholders(v));
  });

  it("has no empty strings, and every Arabic string is Arabic", () => {
    for (const [k, v] of [...en, ...ar]) expect(v.trim(), k).not.toBe("");
    for (const [k, v] of ar) {
      const bare = v.replace(/\{\w+\}/g, "").replace(/[\d\s·.,%()×÷:;\-–]/g, "");
      if (bare) expect(/[؀-ۿ]/.test(bare) || /^[A-D]$/.test(bare), `${k}: ${v}`).toBe(true);
    }
  });

  it("never says interest", () => {
    for (const [k, v] of en) expect(v, k).not.toMatch(/\binterest\b/i);
    expect(arText).not.toContain("فائدة");
  });

  it("uses the Saudi financial terms", () => {
    for (const term of ["المرابحة", "هامش ربح", "معدل النسبة السنوي", "سمة", "السجل التجاري", "شهادة الزكاة", "التأمينات الاجتماعية", "القوائم المالية المدققة", "طلب معلومات إضافية", "محاكاة بالذكاء الاصطناعي", "الحد الائتماني", "هيئة الزكاة والضريبة والجمارك"]) {
      expect(arText, term).toContain(term);
    }
  });

  it("covers every factor and document", () => {
    expect(Object.keys(credit.ar.factors)).toHaveLength(10);
    expect(Object.keys(credit.ar.documents)).toHaveLength(11);
  });
});
