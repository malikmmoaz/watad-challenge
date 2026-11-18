import { describe, expect, it } from "vitest";
import { procurementAr, procurementEn } from "./procurement";
import { supplierAr, supplierEn } from "./supplier";

type Leaf = { path: string; value: unknown };
const leaves = (o: unknown, path = ""): Leaf[] =>
  o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k)) : [{ path, value: o }];

// Sample arguments for every interpolation, so each function can be rendered.
const call = (fn: (...a: never[]) => unknown): string => {
  const args = Array.from({ length: fn.length }, (_, i) => [2, "SAR 1,000.00", "supplier", true][i % 4]);
  return String((fn as (...a: unknown[]) => unknown)(...args));
};
const render = (v: unknown) => (typeof v === "function" ? call(v as never) : String(v));
const ARABIC = /[؀-ۿ]/;
// Unit symbols are the same in both languages.
const SAME_IN_BOTH = /^units(One)?\.(m3|m|m2)$|^offer\.lineSummary$/;

describe.each([
  ["procurement", procurementEn, procurementAr],
  ["supplier", supplierEn, supplierAr],
])("%s dictionaries", (_name, en, ar) => {
  const enLeaves = leaves(en);
  const arLeaves = leaves(ar);

  it("have the same keys in English and Arabic", () => {
    expect(arLeaves.map((l) => l.path).sort()).toEqual(enLeaves.map((l) => l.path).sort());
  });

  it("render every entry, and every Arabic entry is Arabic", () => {
    for (const { path, value } of arLeaves) {
      const text = render(value);
      expect(text.trim(), path).not.toBe("");
      if (!SAME_IN_BOTH.test(path)) expect(ARABIC.test(text), `${path}: ${text}`).toBe(true);
    }
    for (const { path, value } of enLeaves) expect(render(value).trim(), path).not.toBe("");
  });

  it("never says interest (فائدة); credit is a Murabaha profit rate", () => {
    const all = arLeaves.map((l) => render(l.value)).join(" ");
    expect(all).not.toMatch(/فائدة|فوائد/);
    expect(enLeaves.map((l) => render(l.value)).join(" ")).not.toMatch(/\binterest\b/i);
  });
});
