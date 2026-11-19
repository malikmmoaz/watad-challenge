import { describe, expect, it } from "vitest";
import { sar } from "@/domain/money";
import { formatSar } from "@/domain/money";
import { formatDate } from "@/lib/format";
import { common } from "./common";
import { defineMessages, dirOf, fill, msg } from "./core";
import { formattersFor } from "./format";

describe("i18n core", () => {
  it("fills placeholders and leaves unknown ones", () => {
    expect(fill("{n} offers for {rfq}", { n: 3, rfq: "rfq_1042" })).toBe("3 offers for rfq_1042");
    expect(fill("Band {name}", {})).toBe("Band {name}");
  });

  it("picks one string in both languages", () => {
    expect(msg(common, (m) => m.roles.supplier)).toEqual({ en: "Supplier", ar: "المورّد" });
  });

  it("maps locale to direction", () => {
    expect(dirOf("ar")).toBe("rtl");
    expect(dirOf("en")).toBe("ltr");
  });

  it("rejects an Arabic side with a missing or extra key at compile time", () => {
    // @ts-expect-error: "b" is missing from the Arabic side
    defineMessages({ a: "A", b: "B" }, { a: "أ" });
    // @ts-expect-error: "c" is not an English key
    defineMessages({ a: "A" }, { a: "أ", c: "ج" });
    // @ts-expect-error: a nested key is missing
    defineMessages({ g: { x: "X", y: "Y" } }, { g: { x: "س" } });
    expect(true).toBe(true);
  });
});

describe("locale formatting", () => {
  it("keeps English output identical to the existing helpers", () => {
    const en = formattersFor("en");
    expect(en.money(sar(1234567.5))).toBe(formatSar(sar(1234567.5)));
    expect(en.date("2026-12-02")).toBe(formatDate("2026-12-02"));
  });

  it("uses Latin digits, SAR and the Gregorian calendar in Arabic", () => {
    const ar = formattersFor("ar");
    const money = ar.money(sar(1234567.5));
    expect(money).toMatch(/1,234,567\.50/);
    expect(money).toMatch(/ر\.س|SAR/);
    expect(money).not.toMatch(/[٠-٩]/);
    const date = ar.date("2026-12-02");
    expect(date).toMatch(/2026/);
    expect(date).toMatch(/ديسمبر/);
    expect(date).not.toMatch(/[٠-٩]/);
    expect(ar.number(12500)).toBe("12,500");
  });
});
