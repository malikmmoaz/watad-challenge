/**
 * Credit drawn on purchase orders (#14): the contractor's ledger of draws,
 * repaying a draw (which releases the cap), and utilisation for the credit
 * manager. Pure; the clock is an input.
 *
 * Murabaha: the markup is fixed when the PO is placed and does not grow if
 * payment is late; repaying early repays the same total.
 */
import type { CreditFacility, Halalas, IsoDate, PoId, PurchaseOrder } from "../types";
import { availableCredit } from "./facility";

export type DrawState = "awaiting_supplier_payment" | "outstanding" | "overdue" | "repaid";

export interface DrawRow {
  poId: PoId;
  supplierId: string;
  principal: Halalas;
  markup: Halalas;
  totalRepayable: Halalas;
  profitRate: number;
  apr: number;
  tenorDays: number;
  dueDate: IsoDate;
  state: DrawState;
  daysToDue: number;
  supplierPaidAt?: IsoDate;
  repaidAt?: IsoDate;
}

const days = (fromIso: string, toIso: string) => Math.round((Date.parse(toIso.slice(0, 10)) - Date.parse(fromIso.slice(0, 10))) / 86_400_000);

export function drawState(po: PurchaseOrder, asOf: IsoDate): DrawState | null {
  const d = po.creditDraw;
  if (!d) return null;
  if (d.repaidAt) return "repaid";
  if (days(asOf, d.dueDate) < 0) return "overdue";
  return d.supplierPaidAt ? "outstanding" : "awaiting_supplier_payment";
}

/** Every credit draw of a contractor, open ones first, then by due date. */
export function drawLedger(pos: PurchaseOrder[], contractorId: string, asOf: IsoDate): DrawRow[] {
  const rank: Record<DrawState, number> = { overdue: 0, outstanding: 1, awaiting_supplier_payment: 2, repaid: 3 };
  return pos
    .filter((po) => po.contractorId === contractorId && po.creditDraw && po.status !== "cancelled")
    .map((po): DrawRow => {
      const d = po.creditDraw!;
      return {
        poId: po.id,
        supplierId: po.supplierId,
        principal: d.principal,
        markup: d.markup,
        totalRepayable: d.totalRepayable,
        profitRate: d.profitRate,
        apr: d.apr,
        tenorDays: d.tenorDays,
        dueDate: d.dueDate,
        state: drawState(po, asOf)!,
        daysToDue: days(asOf, d.dueDate),
        supplierPaidAt: d.supplierPaidAt,
        repaidAt: d.repaidAt,
      };
    })
    .sort((a, b) => rank[a.state] - rank[b.state] || a.dueDate.localeCompare(b.dueDate));
}

export type RepayResult =
  | { ok: true; purchaseOrders: PurchaseOrder[]; creditFacilities: CreditFacility[]; repaid: Halalas }
  | { ok: false; error: string };

/**
 * Repays one draw in full (principal + fixed markup). The principal is
 * released back to the contractor's cap: drawn goes down, available goes up.
 */
export function repayDraw(pos: PurchaseOrder[], facilities: CreditFacility[], poId: string, now: IsoDate): RepayResult {
  const po = pos.find((p) => p.id === poId);
  const d = po?.creditDraw;
  if (!po || !d) return { ok: false, error: "This purchase order was not paid with credit." };
  if (d.repaidAt) return { ok: false, error: "This draw is already repaid." };
  const facility = facilities.find((f) => f.contractorId === po.contractorId);
  if (!facility) return { ok: false, error: "No credit facility found for this contractor." };
  const drawn = Math.max(0, facility.drawn - d.principal) as Halalas;
  return {
    ok: true,
    repaid: d.totalRepayable,
    purchaseOrders: pos.map((p) => (p.id === po.id ? { ...p, creditDraw: { ...d, repaidAt: now } } : p)),
    creditFacilities: facilities.map((f) => (f === facility ? { ...f, drawn } : f)),
  };
}

export interface Utilisation {
  cap: Halalas;
  drawn: Halalas;
  available: Halalas;
  /** drawn / cap, 0..1 */
  utilisation: number;
  openDraws: number;
  overdueDraws: number;
  overdueAmount: Halalas;
  repaidDraws: number;
  markupEarned: Halalas;
  nextDue?: { poId: PoId; dueDate: IsoDate; amount: Halalas };
}

/** What the credit manager watches on an approved facility. */
export function utilisation(facility: CreditFacility, pos: PurchaseOrder[], asOf: IsoDate): Utilisation {
  const rows = drawLedger(pos, facility.contractorId, asOf);
  const open = rows.filter((r) => r.state !== "repaid");
  const overdue = rows.filter((r) => r.state === "overdue");
  const next = [...open].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const sum = (xs: DrawRow[], k: "totalRepayable" | "markup") => xs.reduce((s, r) => s + r[k], 0) as Halalas;
  return {
    cap: facility.cap,
    drawn: facility.drawn,
    available: availableCredit(facility),
    utilisation: facility.cap > 0 ? facility.drawn / facility.cap : 0,
    openDraws: open.length,
    overdueDraws: overdue.length,
    overdueAmount: sum(overdue, "totalRepayable"),
    repaidDraws: rows.length - open.length,
    markupEarned: sum(rows.filter((r) => r.state === "repaid"), "markup"),
    nextDue: next ? { poId: next.poId, dueDate: next.dueDate, amount: next.totalRepayable } : undefined,
  };
}
