import { describe, expect, it } from "vitest";
import { demoPersona, seedState, type DemoState } from "@/data";
import type { OfferId, PoEvent, RfqId } from "@/domain/types";
import { activityFor, defaultSeenAt, unreadCount } from "./feed";

const ids = (role: "contractor" | "supplier" | "credit", state: DemoState = seedState) => activityFor(role, state, demoPersona).map((i) => i.id);

describe("activity feed", () => {
  it("is newest first for every role", () => {
    for (const role of ["contractor", "supplier", "credit"] as const) {
      const at = activityFor(role, seedState, demoPersona).map((i) => i.at);
      expect(at).toEqual([...at].sort().reverse());
    }
  });

  it("contractor: offers on its RFQs and the supplier's PO steps, never its own steps", () => {
    const items = activityFor("contractor", seedState, demoPersona);
    expect(ids("contractor")).toContain("offer:off_2103");
    expect(ids("contractor")).toContain("po:po_3011:confirmed");
    expect(items.every((i) => i.href.startsWith("/contractor"))).toBe(true);
    // po_3007 was delivered by the contractor itself: not news to the contractor.
    expect(ids("contractor")).not.toContain("po:po_3007:delivered");
  });

  it("contractor: a blind RFQ hides who sent the offer until it is awarded", () => {
    const rfq = seedState.rfqs.find((r) => r.id === "rfq_1042")!;
    const blind: DemoState = { ...seedState, rfqs: seedState.rfqs.map((r) => (r.id === rfq.id ? { ...r, blindComparison: true, status: "offers_received" } : r)) };
    const item = activityFor("contractor", blind, demoPersona).find((i) => i.id === "offer:off_2103")!;
    expect(item.kind).toBe("offerReceivedBlind");
  });

  it("supplier: only RFQs it was invited to, and the award with its PO", () => {
    const items = activityFor("supplier", seedState, demoPersona);
    const invitedTo = items.filter((i) => i.kind === "invited").map((i) => i.rfqId);
    for (const id of invitedTo) expect(seedState.rfqs.find((r) => r.id === id)!.invitedSupplierIds).toContain(demoPersona.supplier);
    expect(items.find((i) => i.kind === "won")).toMatchObject({ poId: "po_3011", href: "/supplier/po/po_3011" });
  });

  it("supplier: a PO step the contractor takes appears once it happens", () => {
    const delivered: PoEvent = { status: "delivered", at: "2026-11-21T08:00:00Z", actor: "contractor" };
    const state: DemoState = {
      ...seedState,
      purchaseOrders: seedState.purchaseOrders.map((p) => (p.id === "po_3011" ? { ...p, status: "delivered", timeline: [...p.timeline, delivered] } : p)),
    };
    expect(activityFor("supplier", state, demoPersona)[0]).toMatchObject({ id: "po:po_3011:delivered", kind: "poDelivered" });
  });

  it("supplier: losing offers are reported once the contractor chooses", () => {
    const state: DemoState = {
      ...seedState,
      offers: seedState.offers.map((o) => (o.rfqId === ("rfq_1039" as RfqId) && o.id !== ("off_2095" as OfferId) ? { ...o, supplierId: demoPersona.supplier as never, status: "not_selected" } : o)),
    };
    expect(activityFor("supplier", state, demoPersona).some((i) => i.kind === "notSelected" && i.rfqId === "rfq_1039")).toBe(true);
  });

  it("credit manager: submitted applications and draws on a cap, linked to the case", () => {
    const items = activityFor("credit", seedState, demoPersona);
    expect(items.some((i) => i.kind === "applicationSubmitted" && i.caseId === "cc_502")).toBe(true);
    expect(items.find((i) => i.id === "draw:po_3011")).toMatchObject({ kind: "drawPlaced", href: "/credit/cases/cc_501" });
    expect(items.every((i) => i.href.startsWith("/credit"))).toBe(true);
  });

  it("ids are unique, so unread tracking and React keys are stable", () => {
    for (const role of ["contractor", "supplier", "credit"] as const) expect(new Set(ids(role)).size).toBe(ids(role).length);
  });

  it("unread: items after the last read time; first visit shows the last day of the seed as new", () => {
    const items = activityFor("credit", seedState, demoPersona);
    expect(unreadCount(items, "2099-01-01T00:00:00Z")).toBe(0);
    expect(unreadCount(items, undefined)).toBe(items.length);
    const first = defaultSeenAt(items);
    expect(unreadCount(items, first)).toBeGreaterThan(0);
    expect(unreadCount(items, first)).toBeLessThan(items.length);
    expect(defaultSeenAt([])).toBeUndefined();
  });
});
