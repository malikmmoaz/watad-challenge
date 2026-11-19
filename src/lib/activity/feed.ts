/**
 * Cross-role activity feed: what changed for the current role, derived from the demo state the
 * three roles already share (offers, PO timelines, credit cases and draws). No event log of its
 * own: every item is a fact already stored, so the feed can never disagree with the screens.
 *
 * Items carry a message key and raw values (ids, amounts, outcomes), not text, so the panel can
 * render them in either language. Names are resolved by the UI from the ids.
 */
import type { DemoState } from "@/data";
import type { CreditDecisionOutcome, IsoDate, OrgId, PoStatus, Role } from "@/domain/types";

export type ActivityKind =
  // contractor
  | "offerReceived"
  | "offerReceivedBlind"
  | "poAccepted"
  | "poDispatched"
  | "poInvoiced"
  | "poPaid"
  | "supplierPaidFromCap"
  | "creditDecision"
  // supplier
  | "invited"
  | "won"
  | "notSelected"
  | "poDelivered"
  | "paidFromCap"
  // credit manager
  | "applicationSubmitted"
  | "drawPlaced"
  | "drawRepaid";

export interface ActivityItem {
  /** Stable across renders and reloads: used for React keys and unread tracking. */
  id: string;
  at: IsoDate;
  kind: ActivityKind;
  href: string;
  /** Ids and figures the message needs; the UI turns ids into names. */
  rfqId?: string;
  poId?: string;
  caseId?: string;
  supplierId?: OrgId;
  contractorId?: OrgId;
  /** Halalas, for credit amounts. */
  amount?: number;
  outcome?: CreditDecisionOutcome;
}

export interface Personas {
  contractor: string;
  supplier: string;
}

/** The PO steps the other side takes, as the contractor sees them. */
const CONTRACTOR_SEES: Partial<Record<PoStatus, ActivityKind>> = {
  confirmed: "poAccepted",
  dispatched: "poDispatched",
  invoiced: "poInvoiced",
  paid: "poPaid",
};

/** Newest first; ties broken by id so the order is stable. */
const byNewest = (a: ActivityItem, b: ActivityItem) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id);

export function activityFor(role: Role, state: DemoState, personas: Personas): ActivityItem[] {
  const items: ActivityItem[] = [];
  const rfqById = new Map(state.rfqs.map((r) => [r.id as string, r]));

  if (role === "contractor") {
    const me = personas.contractor;
    const mine = new Set(state.rfqs.filter((r) => r.contractorId === me).map((r) => r.id as string));
    for (const o of state.offers) {
      if (!mine.has(o.rfqId) || o.status === "withdrawn") continue;
      const rfq = rfqById.get(o.rfqId);
      // Blind comparison hides the supplier until the contractor chooses.
      const blind = rfq?.blindComparison && rfq.status !== "awarded";
      items.push({ id: `offer:${o.id}`, at: o.submittedAt, kind: blind ? "offerReceivedBlind" : "offerReceived", href: `/contractor/rfq/${o.rfqId}`, rfqId: o.rfqId, supplierId: o.supplierId });
    }
    for (const po of state.purchaseOrders) {
      if (po.contractorId !== me) continue;
      for (const e of po.timeline) {
        const kind = CONTRACTOR_SEES[e.status];
        if (kind && e.actor !== "contractor") items.push({ id: `po:${po.id}:${e.status}`, at: e.at, kind, href: `/contractor/po/${po.id}`, poId: po.id, supplierId: po.supplierId });
      }
      if (po.creditDraw?.supplierPaidAt) {
        items.push({ id: `po:${po.id}:supplierPaid`, at: po.creditDraw.supplierPaidAt, kind: "supplierPaidFromCap", href: `/contractor/po/${po.id}`, poId: po.id, supplierId: po.supplierId, amount: po.creditDraw.principal });
      }
    }
    for (const c of state.creditCases) {
      if (c.contractorId !== me || !c.decision) continue;
      items.push({ id: `case:${c.id}:decision`, at: c.decision.decidedAt, kind: "creditDecision", href: "/contractor/credit", caseId: c.id, outcome: c.decision.outcome, amount: c.decision.approvedCap });
    }
  }

  if (role === "supplier") {
    const me = personas.supplier;
    for (const r of state.rfqs) {
      if (r.status === "draft" || r.status === "cancelled" || !r.invitedSupplierIds.includes(me as OrgId)) continue;
      items.push({ id: `invite:${r.id}`, at: r.createdAt, kind: "invited", href: `/supplier/rfq/${r.id}`, rfqId: r.id, contractorId: r.contractorId });
    }
    for (const o of state.offers) {
      if (o.supplierId !== me) continue;
      // The award time is when the contractor placed the PO for that RFQ.
      const awardedPo = state.purchaseOrders.filter((p) => p.rfqId === o.rfqId).sort((a, b) => a.placedAt.localeCompare(b.placedAt))[0];
      if (!awardedPo) continue;
      if (o.status === "awarded") {
        const myPo = state.purchaseOrders.find((p) => p.offerId === o.id) ?? awardedPo;
        items.push({ id: `won:${o.id}`, at: myPo.placedAt, kind: "won", href: `/supplier/po/${myPo.id}`, rfqId: o.rfqId, poId: myPo.id });
      } else if (o.status === "not_selected") {
        items.push({ id: `lost:${o.id}`, at: awardedPo.placedAt, kind: "notSelected", href: `/supplier/rfq/${o.rfqId}`, rfqId: o.rfqId });
      }
    }
    for (const po of state.purchaseOrders) {
      if (po.supplierId !== me) continue;
      const delivered = po.timeline.find((e) => e.status === "delivered");
      if (delivered) items.push({ id: `po:${po.id}:delivered`, at: delivered.at, kind: "poDelivered", href: `/supplier/po/${po.id}`, poId: po.id, contractorId: po.contractorId });
      if (po.creditDraw?.supplierPaidAt) {
        items.push({ id: `po:${po.id}:paidFromCap`, at: po.creditDraw.supplierPaidAt, kind: "paidFromCap", href: `/supplier/po/${po.id}`, poId: po.id, contractorId: po.contractorId, amount: po.creditDraw.principal });
      }
    }
  }

  if (role === "credit") {
    for (const c of state.creditCases) {
      if (!c.submittedAt) continue;
      items.push({ id: `case:${c.id}:submitted`, at: c.submittedAt, kind: "applicationSubmitted", href: `/credit/cases/${c.id}`, caseId: c.id, contractorId: c.contractorId, amount: c.requestedCap });
    }
    for (const po of state.purchaseOrders) {
      const d = po.creditDraw;
      if (!d) continue;
      const href = `/credit/cases/${d.creditCaseId}`;
      items.push({ id: `draw:${po.id}`, at: po.placedAt, kind: "drawPlaced", href, poId: po.id, caseId: d.creditCaseId, contractorId: po.contractorId, amount: d.principal });
      if (d.repaidAt) items.push({ id: `draw:${po.id}:repaid`, at: d.repaidAt, kind: "drawRepaid", href, poId: po.id, caseId: d.creditCaseId, contractorId: po.contractorId, amount: d.totalRepayable });
    }
  }

  return items.sort(byNewest);
}

/**
 * Read mark for a role that has never opened the feed: one day before its newest item, so a
 * first visit shows the latest seed activity as new rather than either nothing or everything.
 */
export function defaultSeenAt(items: ActivityItem[]): IsoDate | undefined {
  const newest = items[0]?.at;
  return newest ? new Date(Date.parse(newest) - 24 * 3600 * 1000).toISOString() : undefined;
}

/** Items newer than the last time this role marked the feed read. */
export function unreadCount(items: ActivityItem[], seenAt: IsoDate | undefined): number {
  if (!seenAt) return items.length;
  return items.filter((i) => i.at > seenAt).length;
}
