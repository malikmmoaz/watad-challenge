import { describe, expect, it } from "vitest";
import { formatQuantity, unitLabel } from "./labels";

describe("quantity wording", () => {
  it("agrees with the quantity", () => {
    expect(formatQuantity(1, "tonne")).toBe("1 tonne");
    expect(formatQuantity(40, "tonne")).toBe("40 tonnes");
    expect(formatQuantity(1, "bag_50kg")).toBe("1 bag (50 kg)");
    expect(formatQuantity(3200, "bag_50kg")).toBe("3,200 bags (50 kg)");
    expect(unitLabel("m3", 1)).toBe("m³");
    expect(unitLabel("piece", 2.5)).toBe("pieces");
  });
});
