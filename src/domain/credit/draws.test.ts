import { describe, expect, it } from "vitest";
import { seedState } from "@/data";
import type { Halalas, PurchaseOrder } from "../types";
import { drawLedger, drawState, repayDraw, utilisation } from "./draws";

const asOf = "2026-11-18";
const { purchaseOrders: pos, creditFacilities: facilities } = seedState;
const najd = facilities.find((f) => f.contractorId === "con_najd")!;
const draw = pos.find((p) => p.creditDraw && p.contractorId === "con_najd")!;

describe("draw ledger", () => {
  it("lists the contractor's credit draws with their state", () => {
    const rows = drawLedger(pos, "con_najd", asOf);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.reduce((s, r) => s + (r.state === "repaid" ? 0 : r.principal), 0)).toBe(najd.drawn);
    expect(drawLedger(pos, "con_hijaz", asOf).every((r) => r.poId !== draw.id)).toBe(true);
  });

  it("marks overdue, outstanding and awaiting supplier payment", () => {
    const d = draw.creditDraw!;
    expect(drawState({ ...draw, creditDraw: { ...d, repaidAt: undefined, supplierPaidAt: undefined } }, asOf)).toBe("awaiting_supplier_payment");
    expect(drawState({ ...draw, creditDraw: { ...d, repaidAt: undefined, supplierPaidAt: "2026-11-01" } }, asOf)).toBe("outstanding");
    expect(drawState({ ...draw, creditDraw: { ...d, repaidAt: undefined, dueDate: "2026-11-01" } }, asOf)).toBe("overdue");
    expect(drawState({ ...draw, creditDraw: { ...d, repaidAt: "2026-11-10" } }, asOf)).toBe("repaid");
  });
});

describe("repayDraw", () => {
  it("repays principal plus the fixed markup and releases the principal to the cap", () => {
    const r = repayDraw(pos, facilities, draw.id, "2026-11-18T10:00:00Z");
    if (!r.ok) throw new Error(r.error);
    const f = r.creditFacilities.find((x) => x.contractorId === "con_najd")!;
    expect(f.drawn).toBe(najd.drawn - draw.creditDraw!.principal);
    expect(f.available).toBe(f.cap - f.drawn);
    expect(r.repaid).toBe(draw.creditDraw!.totalRepayable);
    expect(r.purchaseOrders.find((p) => p.id === draw.id)?.creditDraw?.repaidAt).toBe("2026-11-18T10:00:00Z");
  });

  it("refuses a second repayment or a non-credit PO", () => {
    const once = repayDraw(pos, facilities, draw.id, "t");
    if (!once.ok) throw new Error(once.error);
    expect(repayDraw(once.purchaseOrders, once.creditFacilities, draw.id, "t")).toMatchObject({ ok: false });
    const cash: PurchaseOrder = { ...draw, id: "po_cash" as PurchaseOrder["id"], paymentMethod: "bank_transfer", creditDraw: undefined };
    expect(repayDraw([...pos, cash], facilities, cash.id, "t")).toMatchObject({ ok: false });
  });
});

describe("utilisation", () => {
  it("summarises drawn, open and overdue draws and the next due date", () => {
    const u = utilisation(najd, pos, asOf);
    expect(u.utilisation).toBeCloseTo(najd.drawn / najd.cap, 6);
    expect(u.openDraws).toBeGreaterThan(0);
    expect(u.nextDue?.poId).toBeDefined();
    const late = pos.map((p): PurchaseOrder => (p.id === draw.id ? { ...p, creditDraw: { ...p.creditDraw!, dueDate: "2026-11-01" } } : p));
    const v = utilisation(najd, late, asOf);
    expect(v.overdueDraws).toBe(1);
    expect(v.overdueAmount).toBe(draw.creditDraw!.totalRepayable as Halalas);
  });
});
