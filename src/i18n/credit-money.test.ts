import { describe, expect, it } from "vitest";
import { credit } from "./credit";

// Arabic amounts already end in «ر.س.», so a full stop right after a money placeholder prints «ر.س..».
const MONEY = /\{(cap|max|min|amount|requested|limit|current|proposed|nw|wc|purchases)\}\./;

function strings(v: unknown, path = ""): [string, string][] {
  if (typeof v === "string") return [[path, v]];
  if (v && typeof v === "object") return Object.entries(v).flatMap(([k, x]) => strings(x, path ? `${path}.${k}` : k));
  return [];
}

describe("Arabic credit messages", () => {
  it("never put a full stop straight after an amount", () => {
    expect(strings(credit.ar).filter(([, s]) => MONEY.test(s)).map(([p]) => p)).toEqual([]);
  });

  it("use the Arabic percent sign", () => {
    expect(strings(credit.ar).filter(([, s]) => s.includes("%")).map(([p]) => p)).toEqual([]);
  });
});
