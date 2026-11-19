/**
 * What a reviewer can type into an RFQ or an offer, and what the app refuses. Pure, so the edge
 * cases (empty, zero, negative, huge, decimal quantities of things sold whole) are unit-tested.
 */
import type { RfqLine, Unit } from "@/domain/types";

/** Largest quantity on one line: far above any real site order, far below money overflow. */
export const MAX_LINE_QUANTITY = 1_000_000;
/** Largest unit price and delivery fee a supplier can enter, in SAR. */
export const MAX_UNIT_PRICE_SAR = 1_000_000;
export const MAX_DELIVERY_FEE_SAR = 1_000_000;

/** Units sold as whole items: you cannot order 1.5 bags. Tonnes, m³, m and m² take decimals. */
export const WHOLE_UNITS: ReadonlySet<Unit> = new Set<Unit>(["bag_50kg", "piece", "roll"]);

export type QuantityProblem = "missing" | "tooLarge" | "notWhole";

/** Why a quantity is not acceptable for this unit, or null when it is. */
export function quantityProblem(quantity: number, unit: Unit): QuantityProblem | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return "missing";
  if (quantity > MAX_LINE_QUANTITY) return "tooLarge";
  if (WHOLE_UNITS.has(unit) && !Number.isInteger(quantity)) return "notWhole";
  return null;
}

export type DraftProblem = "needLine" | "needQuantity" | "quantityTooLarge" | "quantityWhole" | "needSite" | "needDate";

/** Everything that blocks confirming an RFQ draft, in the order the form shows them. */
export function rfqDraftProblems(draft: { lines: Pick<RfqLine, "quantity" | "unit">[]; site: string; requiredBy: string }): DraftProblem[] {
  const q = draft.lines.map((l) => quantityProblem(l.quantity, l.unit));
  const out: DraftProblem[] = [];
  if (draft.lines.length === 0) out.push("needLine");
  if (q.includes("missing")) out.push("needQuantity");
  if (q.includes("tooLarge")) out.push("quantityTooLarge");
  if (q.includes("notWhole")) out.push("quantityWhole");
  if (draft.site.trim() === "") out.push("needSite");
  if (draft.requiredBy === "") out.push("needDate");
  return out;
}
