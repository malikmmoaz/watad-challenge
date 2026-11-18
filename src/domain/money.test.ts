import { describe, expect, it } from "vitest";
import { formatSar, inclVat, murabaha, sar, vatOn } from "./money";

describe("money", () => {
  it("stores SAR as integer halalas", () => {
    expect(sar(15.81)).toBe(1581);
  });
  it("applies 15% VAT", () => {
    expect(vatOn(sar(100))).toBe(sar(15));
    expect(inclVat(sar(100))).toBe(sar(115));
  });
  it("formats SAR", () => {
    expect(formatSar(sar(1234567.5))).toBe("SAR 1,234,567.50");
  });
  it("computes Murabaha markup and APR", () => {
    const m = murabaha(sar(100_000), 0.03, 60);
    expect(m.markup).toBe(sar(3000));
    expect(m.totalRepayable).toBe(sar(103_000));
    expect(m.apr).toBeCloseTo(0.1825, 4);
  });
});
