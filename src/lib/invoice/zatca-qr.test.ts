import { describe, expect, it } from "vitest";
import { reference } from "@/data";
import type { Halalas } from "@/domain/types";
import { decodeTlv, encodeTlv, fromBase64, isSaudiVatNumber, sarDecimal, zatcaQrPayload, zatcaTimestamp } from "./zatca-qr";

const h = (n: number) => n as Halalas;

describe("ZATCA Phase 1 QR (TLV, base64)", () => {
  it("matches ZATCA's published example byte for byte", () => {
    // The reference example from ZATCA's e-invoicing guidance (seller "Bobs Records").
    expect(
      zatcaQrPayload({ sellerName: "Bobs Records", vatNumber: "310122393500003", timestamp: "2022-04-25T15:30:00Z", totalInclVat: h(100000), vat: h(15000) }),
    ).toBe("AQxCb2JzIFJlY29yZHMCDzMxMDEyMjM5MzUwMDAwMwMUMjAyMi0wNC0yNVQxNTozMDowMFoEBzEwMDAuMDAFBjE1MC4wMA==");
  });

  it("writes the five fields in order as tag, byte length, UTF-8 value", () => {
    const b64 = zatcaQrPayload({ sellerName: "رواسي لتجارة مواد البناء", vatNumber: "300000003167603", timestamp: "2026-11-13T09:30:00.000Z", totalInclVat: h(115000), vat: h(15000) });
    const bytes = fromBase64(b64);
    // Arabic: the length byte counts UTF-8 bytes (45), not characters (24).
    expect(bytes[0]).toBe(1);
    expect(bytes[1]).toBe(new TextEncoder().encode("رواسي لتجارة مواد البناء").length);
    expect(bytes[1]).toBe(45);
    expect(decodeTlv(bytes)).toEqual([
      [1, "رواسي لتجارة مواد البناء"],
      [2, "300000003167603"],
      [3, "2026-11-13T09:30:00Z"],
      [4, "1150.00"],
      [5, "150.00"],
    ]);
  });

  it("formats amounts as plain decimals and timestamps without milliseconds", () => {
    expect(sarDecimal(h(123456789))).toBe("1234567.89");
    expect(sarDecimal(h(5))).toBe("0.05");
    expect(zatcaTimestamp("2026-11-13T09:30:00.000Z")).toBe("2026-11-13T09:30:00Z");
  });

  it("rejects values a single length byte cannot hold, and malformed VAT numbers", () => {
    expect(() => encodeTlv([[1, "x".repeat(256)]])).toThrow(RangeError);
    expect(encodeTlv([[1, "x".repeat(255)]])[1]).toBe(255);
    expect(() => zatcaQrPayload({ sellerName: "A", vatNumber: "123", timestamp: "2026-11-13T09:30:00Z", totalInclVat: h(1), vat: h(0) })).toThrow(RangeError);
  });

  it("every organisation's sample VAT number has the Saudi shape and is unique", () => {
    const all = [...reference.contractors, ...reference.suppliers].map((o) => o.vatNumber);
    for (const v of all) expect(isSaudiVatNumber(v), v).toBe(true);
    expect(new Set(all).size).toBe(all.length);
  });
});
