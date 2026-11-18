import { halalas } from "../money";
import type { CreditFacility, Halalas } from "../types";

/**
 * What is left of a credit cap: always cap minus drawn, never below zero.
 * Derived, never stored, so it cannot go stale (#55).
 */
export const availableCredit = (facility: Pick<CreditFacility, "cap" | "drawn">): Halalas => halalas(Math.max(0, facility.cap - facility.drawn));
