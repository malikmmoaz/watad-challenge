"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, Badge, Button, EmptyState, Facts, PageHeader, Panel, StatusTimeline, buttonClass, type TimelineStep } from "@/components/ui";
import { PO_STATUS } from "@/lib/status";
import { demoPersona, reference } from "@/data";
import type { PurchaseOrder } from "@/domain/types";
import { PO_STEPS, stepIndex } from "@/lib/procurement/po";
import { actOnPurchaseOrder, poActionFor } from "@/lib/procurement/supplier-offer";
import { track } from "@/lib/analytics";
import { getState, update, useDemo } from "@/store";
import { useProcurementI18n } from "./use-procurement-i18n";
import { PrintButton } from "@/components/invoice/print-button";
import { invoice } from "@/i18n/invoice";
import { useMessages } from "@/i18n/locale";

type I18n = ReturnType<typeof useProcurementI18n>;

/** A timeline note in the reader's locale: the ones procurement logic writes are recognised; seed notes are data. */
export const poNoteText = (i: I18n, note: string): string => {
  if (!i.ar) return note;
  const seeded = i.seedText(note);
  if (seeded !== note) return seeded;
  const split = note.match(/^Part (\d+) of (\d+) of a split order$/);
  if (split) return i.fill(i.m.poNotes.splitPart, { i: split[1]!, n: split[2]! });
  if (note === "Supplier paid directly from the contractor's credit cap") return i.m.poNotes.paidFromCap;
  const inv = note.match(/^ZATCA e-invoice (\S+)$/);
  if (inv) return i.fill(i.m.poPage.einvoice, { number: inv[1]! });
  return note;
};

/** The action label for the party whose step it is, by PO status. */
const actionLabel = (i: I18n, status: string): string =>
  status === "placed" ? i.m.poActions.accept : status === "confirmed" ? i.m.poActions.dispatch : status === "dispatched" ? i.m.poActions.confirmDelivery : status === "delivered" ? i.m.poActions.invoice : i.m.poActions.markPaid;

/** A party on the order: name, and its VAT registration number for the printed PO. */
function Party({ name, vat, label }: { name: string; vat: string | undefined; label: string }) {
  return (
    <>
      {name}
      {vat ? (
        <span className="mt-0.5 block text-xs font-normal text-ink-muted">
          {label} <bdi className="font-mono">{vat}</bdi>
        </span>
      ) : null}
    </>
  );
}

export function timelineSteps(po: PurchaseOrder, i: I18n): TimelineStep[] {
  const at = stepIndex(po.status);
  return PO_STEPS.map((step, idx) => {
    const event = po.timeline.find((e) => e.status === step.status);
    return {
      label: i.m.poSteps[step.status as keyof I18n["m"]["poSteps"]].label,
      state: po.status === "cancelled" ? "problem" : idx <= at ? "done" : idx === at + 1 ? "current" : "upcoming",
      ...(event ? { at: i.f.dateTime(event.at), actor: (i.m.poPage.actors as Record<string, string>)[event.actor] ?? event.actor } : {}),
      ...(event?.note ? { note: poNoteText(i, event.note) } : idx === at + 1 && PO_STEPS[at] ? { note: i.m.poSteps[PO_STEPS[at]!.status as keyof I18n["m"]["poSteps"]].next } : {}),
    };
  });
}

/** Shown when a PO belongs to another company: the same wording on the PO and its tax invoice. */
export function NotYours({ viewer }: { viewer: "contractor" | "supplier" }) {
  const i = useProcurementI18n();
  const pp = i.m.poPage;
  return (
    <div className="space-y-6" data-testid="po-not-yours">
      <PageHeader eyebrow={viewer === "supplier" ? i.m.common.supplier : i.m.common.contractor} title={pp.notYours} />
      <EmptyState title={pp.notYours} action={<Link href={`/${viewer}`} className={buttonClass("secondary", "sm")}>{i.m.common.back}</Link>}>
        {pp.notYoursBody}
      </EmptyState>
    </div>
  );
}

export function PoDetail({ poId, viewer = "contractor" }: { poId: string; viewer?: "contractor" | "supplier" }) {
  const pos = useDemo((s) => s.purchaseOrders);
  const rfqs = useDemo((s) => s.rfqs);
  const offers = useDemo((s) => s.offers);
  const po = pos.find((p) => p.id === poId);
  const [justDone, setJustDone] = useState<{ status: string; label: string; by: string } | null>(null);
  const i = useProcurementI18n();
  const inv = useMessages(invoice);
  const pp = i.m.poPage;

  if (!po) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={viewer === "supplier" ? i.m.common.supplier : i.m.common.contractor} title={pp.notFound} />
        <EmptyState title={pp.notInBrowser} action={<Link href={`/${viewer}`} className={buttonClass("secondary", "sm")}>{i.m.common.back}</Link>}>
          {pp.notInBrowserBody}
        </EmptyState>
      </div>
    );
  }

  // Each company sees only its own orders (as RFQs: a supplier only sees requests it was invited to).
  if (po.supplierId !== demoPersona.supplier && viewer === "supplier") return <NotYours viewer={viewer} />;
  if (po.contractorId !== demoPersona.contractor && viewer === "contractor") return <NotYours viewer={viewer} />;

  const rfq = rfqs.find((r) => r.id === po.rfqId);
  const offer = offers.find((o) => o.id === po.offerId);
  const supplier = reference.suppliers.find((s) => s.id === po.supplierId);
  const contractor = reference.contractors.find((c) => c.id === po.contractorId);
  const other = viewer === "supplier" ? "contractor" : "supplier";
  const mine = poActionFor(po, viewer);
  const theirs = poActionFor(po, other);
  const act = (role: "contractor" | "supplier") => {
    update((prev) => ({
      ...prev,
      purchaseOrders: prev.purchaseOrders.map((p) =>
        p.id === po.id ? actOnPurchaseOrder(p, role, new Date().toISOString(), p.status === "delivered" ? `ZATCA e-invoice ${p.id.replace("po_", "INV-")}` : undefined) : p,
      ),
    }));
    const after = getState().purchaseOrders.find((p) => p.id === po.id);
    if (after && after.status !== po.status) {
      track("po_status_changed", { po_id: po.id, status: after.status });
      setJustDone({ status: after.status, label: i.status.po[after.status], by: role });
    }
  };
  const d = po.creditDraw;
  const stepNow = PO_STEPS[stepIndex(po.status)];
  const nextStep = stepNow ? i.m.poSteps[stepNow.status as keyof typeof i.m.poSteps].next : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={viewer === "supplier" ? pp.eyebrowSupplier : pp.eyebrowContractor}
        title={i.name(supplier, i.m.poList.po)}
        serial={po.id}
        status={
          <span data-testid="po-status" data-status={po.status}>
            <Badge tone={PO_STATUS[po.status].tone}>{i.status.po[po.status]}</Badge>
          </span>
        }
        meta={
          <>
            <span>{i.fill(pp.placed, { when: i.f.dateTime(po.placedAt) })}</span>
            {rfq ? (
              <Link href={`/${viewer}/rfq/${rfq.id}`} className="underline decoration-line-strong underline-offset-[3px] hover:decoration-ink">
                {i.rfqTitle(rfq)}
              </Link>
            ) : null}
            <span className="font-semibold tabular-nums text-ink">{i.f.money(po.totalInclVat)}</span>
          </>
        }
        actions={
          <span className="flex flex-wrap items-center gap-2">
          <span className="contents print:hidden">
          {mine ? (
            <Button variant="primary" data-testid="po-action" onClick={() => act(viewer)}>
              {actionLabel(i, po.status)}
            </Button>
          ) : theirs ? (
            <span className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
              {i.fill(other === "supplier" ? pp.waitingForSupplier : pp.waitingForContractor, { step: i.ar ? actionLabel(i, po.status) : actionLabel(i, po.status).toLowerCase() })}
              <Button size="sm" variant="quiet" data-testid="po-advance" onClick={() => act(other)} title={pp.demoTitle}>
                {other === "supplier" ? pp.demoAsSupplier : pp.demoAsContractor}
              </Button>
            </span>
          ) : null}
          </span>
          {po.status === "invoiced" || po.status === "paid" ? (
            <Link href={`/${viewer}/po/${po.id}/invoice`} data-testid="po-invoice-link" className={buttonClass("secondary", "sm", "print:hidden")}>
              {inv.viewInvoice}
            </Link>
          ) : null}
          <PrintButton poId={po.id} document="po" testId="po-print" />
          </span>
        }
      />
      {justDone && justDone.status === po.status ? (
        <div key={po.status} className="motion-safe:animate-rise" data-testid="po-step-done">
          <Alert tone="positive" title={justDone.label}>
            {nextStep ? i.fill(pp.next, { step: nextStep }) : pp.complete}
          </Alert>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={pp.statusPanel} className="lg:col-span-1">
          <StatusTimeline label={pp.timelineLabel} steps={timelineSteps(po, i)} />
        </Panel>
        <div className="space-y-4 lg:col-span-2">
          <Panel title={pp.order}>
            <Facts
              items={[
                { label: i.m.common.supplier, value: <Party name={i.name(supplier, po.supplierId)} vat={supplier?.vatNumber} label={inv.vatNumber} /> },
                { label: inv.buyer, value: <Party name={i.name(contractor, po.contractorId)} vat={contractor?.vatNumber} label={inv.vatNumber} /> },
                { label: i.m.common.deliverTo, value: rfq ? i.site(rfq) : "" },
                { label: pp.expectedDelivery, value: i.f.date(po.expectedDelivery) },
                { label: pp.goods, value: i.f.money(po.subtotal) },
                { label: pp.delivery, value: i.f.money(po.deliveryFee) },
                { label: pp.vat, value: i.f.money(po.vat) },
                { label: i.m.common.totalInclVatShort, value: <strong data-testid="po-total">{i.f.money(po.totalInclVat)}</strong> },
                { label: i.m.common.payment, value: po.paymentMethod === "platform_credit" ? pp.paymentCredit : i.m.common.bankTransfer },
              ]}
            />
            {offer && rfq && (
              <ul className="mt-4 space-y-1 border-t border-line pt-3 text-sm">
                {offer.lines
                  .filter((ol) => rfq.lines.some((l) => l.id === ol.rfqLineId))
                  .map((ol) => {
                    const line = rfq.lines.find((l) => l.id === ol.rfqLineId)!;
                    return (
                      <li key={ol.rfqLineId} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3">
                        <span className="text-ink">
                          {i.lineName(line)} <span className="text-ink-muted">· {i.seedText(ol.brand)}</span>
                        </span>
                        <span className="whitespace-nowrap tabular-nums text-ink-muted">
                          <bdi>{i.qty(Math.min(line.quantity, ol.quantityAvailable), line.unit)}</bdi> × <bdi>{i.f.money(ol.unitPrice)}</bdi>
                        </span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </Panel>
          {d && (
            <Panel title={pp.creditDrawTitle}>
              <Facts
                items={[
                  { label: pp.drawn, value: i.f.money(d.principal) },
                  { label: pp.markup, value: i.fill(pp.markupValue, { markup: i.f.money(d.markup), rate: i.f.percent(d.profitRate, 1), days: d.tenorDays, apr: i.f.percent(d.apr, 1) }) },
                  { label: pp.youRepay, value: i.f.money(d.totalRepayable) },
                  { label: pp.due, value: i.f.date(d.dueDate) },
                  { label: pp.supplierPaid, value: d.supplierPaidAt ? i.fill(pp.paidOn, { when: i.f.dateTime(d.supplierPaidAt) }) : pp.paidOnInvoice },
                ]}
              />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
