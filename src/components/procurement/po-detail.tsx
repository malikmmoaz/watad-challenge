"use client";

import Link from "next/link";
import { Badge, Button, Facts, PageHeader, Panel, StatusTimeline, type TimelineStep } from "@/components/ui";
import { reference } from "@/data";
import { formatSar } from "@/domain/money";
import type { PurchaseOrder } from "@/domain/types";
import { UNIT_LABELS } from "@/lib/procurement/labels";
import { PO_STEPS, advancePurchaseOrder, stepIndex } from "@/lib/procurement/po";
import { update, useDemo } from "@/store";

const ACTOR: Record<string, string> = { contractor: "You", supplier: "Supplier", platform: "Platform", credit: "Credit manager" };
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" });

export function timelineSteps(po: PurchaseOrder): TimelineStep[] {
  const at = stepIndex(po.status);
  return PO_STEPS.map((step, i) => {
    const event = po.timeline.find((e) => e.status === step.status);
    return {
      label: step.label,
      state: po.status === "cancelled" ? "problem" : i <= at ? "done" : i === at + 1 ? "current" : "upcoming",
      ...(event ? { at: when(event.at), actor: ACTOR[event.actor] ?? event.actor } : {}),
      ...(event?.note ? { note: event.note } : i === at + 1 ? { note: PO_STEPS[at]?.next } : {}),
    };
  });
}

export function PoDetail({ poId }: { poId: string }) {
  const pos = useDemo((s) => s.purchaseOrders);
  const rfqs = useDemo((s) => s.rfqs);
  const offers = useDemo((s) => s.offers);
  const po = pos.find((p) => p.id === poId);

  if (!po) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-ink">Purchase order not found</h1>
        <p className="text-sm text-ink-muted">It may have been placed in another browser, or the demo data was reset.</p>
        <Link href="/contractor" className="text-ink underline">Back to my RFQs</Link>
      </div>
    );
  }

  const rfq = rfqs.find((r) => r.id === po.rfqId);
  const offer = offers.find((o) => o.id === po.offerId);
  const supplier = reference.suppliers.find((s) => s.id === po.supplierId);
  const step = PO_STEPS[stepIndex(po.status)];
  const last = po.status === "paid" || po.status === "cancelled";
  const advance = () => update((prev) => ({ ...prev, purchaseOrders: prev.purchaseOrders.map((p) => (p.id === po.id ? advancePurchaseOrder(p, new Date().toISOString()) : p)) }));
  const d = po.creditDraw;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase order"
        serial={po.id}
        status={
          <span data-testid="po-status" data-status={po.status}>
            <Badge tone={po.status === "delivered" || po.status === "invoiced" || po.status === "paid" ? "positive" : "info"}>{step?.label ?? po.status}</Badge>
          </span>
        }
        meta={
          <>
            {supplier?.name} · placed {when(po.placedAt)} · {rfq ? <Link href={`/contractor/rfq/${rfq.id}`} className="underline">{rfq.title}</Link> : po.rfqId}
          </>
        }
        actions={
          !last && (
            <Button size="sm" data-testid="po-advance" onClick={advance} title="Demo control: in the live product the supplier and site team move the PO along">
              Demo: next step
            </Button>
          )
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Status" className="lg:col-span-1">
          <StatusTimeline label="Purchase order status" steps={timelineSteps(po)} />
        </Panel>
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Order">
            <Facts
              items={[
                { label: "Supplier", value: supplier?.name ?? po.supplierId },
                { label: "Deliver to", value: rfq ? `${rfq.deliverySite}, ${rfq.deliveryCity}` : "" },
                { label: "Expected delivery", value: po.expectedDelivery },
                { label: "Goods", value: formatSar(po.subtotal) },
                { label: "Delivery", value: formatSar(po.deliveryFee) },
                { label: "VAT 15%", value: formatSar(po.vat) },
                { label: "Total incl. VAT", value: <strong data-testid="po-total">{formatSar(po.totalInclVat)}</strong> },
                { label: "Payment", value: po.paymentMethod === "platform_credit" ? "Pay with credit, supplier paid directly" : "Bank transfer" },
              ]}
            />
            {offer && rfq && (
              <ul className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
                {offer.lines
                  .filter((ol) => rfq.lines.some((l) => l.id === ol.rfqLineId))
                  .map((ol) => {
                    const line = rfq.lines.find((l) => l.id === ol.rfqLineId)!;
                    return (
                      <li key={ol.rfqLineId} className="flex justify-between gap-3">
                        <span className="text-ink">
                          {line.description} <span className="text-ink-muted">· {ol.brand}</span>
                        </span>
                        <span className="tabular-nums text-ink-muted">
                          {Math.min(line.quantity, ol.quantityAvailable).toLocaleString("en-US")} {UNIT_LABELS[line.unit]} × {formatSar(ol.unitPrice)}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </Panel>
          {d && (
            <Panel title="Credit draw (Murabaha)">
              <Facts
                items={[
                  { label: "Drawn from credit cap", value: formatSar(d.principal) },
                  { label: "Markup", value: `${formatSar(d.markup)} (${(d.profitRate * 100).toFixed(1)}% profit rate for ${d.tenorDays} days, ${(d.apr * 100).toFixed(1)}% APR)` },
                  { label: "You repay", value: formatSar(d.totalRepayable) },
                  { label: "Due", value: d.dueDate },
                  { label: "Supplier paid", value: d.supplierPaidAt ? `Directly by the financier, ${when(d.supplierPaidAt)}` : "Directly by the financier once invoiced" },
                ]}
              />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
