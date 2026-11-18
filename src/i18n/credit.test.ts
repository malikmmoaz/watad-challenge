import { describe, expect, it } from "vitest";
import { creditStrings } from "./credit";

type Tree = { [k: string]: unknown };

/** Every leaf path, with functions called on sample arguments so templates are checked too. */
function leaves(node: unknown, path = ""): [string, string][] {
  if (typeof node === "string") return [[path, node]];
  if (typeof node === "function") {
    const args = Array.from({ length: (node as (...a: unknown[]) => string).length }, (_, i) => (i % 2 ? 2 : "X"));
    return [[path, String((node as (...a: unknown[]) => string)(...args))]];
  }
  if (Array.isArray(node)) return node.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  return Object.entries(node as Tree).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
}

const en = leaves(creditStrings.en);
const ar = leaves(creditStrings.ar);
const arText = ar.map(([, v]) => v).join("\n");

describe("credit strings", () => {
  it("has the same keys in English and Arabic", () => {
    expect(ar.map(([k]) => k)).toEqual(en.map(([k]) => k));
  });

  it("has no empty strings and Arabic is actually Arabic", () => {
    for (const [k, v] of [...en, ...ar]) expect(v.trim(), k).not.toBe("");
    for (const [k, v] of ar) expect(/[؀-ۿ]/.test(v) || /^[\d\s·X.,%()-]*$/.test(v), k).toBe(true);
  });

  it("never says interest", () => {
    for (const [k, v] of en) expect(v, k).not.toMatch(/\binterest\b/i);
    expect(arText).not.toContain("فائدة");
    expect(arText).not.toContain("الفائدة");
  });

  it("uses the Saudi financial terms", () => {
    for (const term of [
      "مرابحة",
      "هامش الربح",
      "معدل النسبة السنوي",
      "سمة",
      "السجل التجاري",
      "شهادة الزكاة",
      "التأمينات الاجتماعية",
      "القوائم المالية المدققة",
      "طلب معلومات إضافية",
      "محاكاة بالذكاء الاصطناعي",
    ]) {
      expect(arText, term).toContain(term);
    }
  });

  it("covers every factor and document in both languages", () => {
    expect(Object.keys(creditStrings.ar.factors)).toHaveLength(10);
    expect(Object.keys(creditStrings.ar.documents)).toHaveLength(11);
  });
});
