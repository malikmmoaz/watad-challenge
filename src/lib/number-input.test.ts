import { describe, expect, it } from "vitest";
import { numberFromInput } from "./number-input";

describe("numberFromInput", () => {
  it("reads what was typed", () => {
    expect(numberFromInput("15.2")).toBe(15.2);
    expect(numberFromInput("3380")).toBe(3380);
    expect(numberFromInput(" 0 ")).toBe(0);
    expect(numberFromInput("1e3")).toBe(1000);
  });

  it("treats empty or invalid text as not set", () => {
    for (const v of ["", "  ", "abc", "Infinity"]) expect(numberFromInput(v), v).toBeNaN();
  });
});
