"use client";

/**
 * Simplified tax invoice for an invoiced PO, with the ZATCA Phase 1 QR (TLV, base64), in the
 * reader's language and ready to print on A4. A sample: fictional VAT numbers, never sent to ZATCA.
 */
import Link from "next/link";
import { useEffect, useRef } from "react";
import { demoPersona, reference } from "@/data";
import type { Halalas } from "@/domain/types";
import { invoice } from "@/i18n/invoice";
import { useLocale, useMessages } from "@/i18n/locale";
import { track } from "@/lib/analytics";
import { zatcaQrPayload } from "@/lib/invoice/zatca-qr";
import { useDemo } from "@/store";
import { useProcurementI18n } from "../procurement/use-procurement-i18n";
import { Alert, EmptyState, PageHeader, Panel, Table, Td, Th, THead, Tr, buttonClass } from "../ui";
import { NotYours } from "../procurement/po-detail";
import { PrintButton } from "./print-button";
import { ZatcaQrCode } from "./zatca-qr-code";

export function TaxInvoice({ poId, viewer }: { poId: string; viewer: "contractor" | "supplier" }) {
  const i = useProcurementI18n();
  const m = useMessages(invoice);
  const pos = useDemo((s) => s.purchaseOrders);
  const rfqs = useDemo((s) => s.rfqs);
  const offers = useDemo((s) => s.offers);
  const po = pos.find((p) => p.id === poId);
  const locale = useLocale();
  const issuedAt = po?.timeline.find((e) => e.status === "invoiced")?.at;
  // Once per invoice per visit (switching language does not count as a second view).
  const viewed = useRef<string | null>(null);
  useEffect(() => {
    if (!issuedAt || viewed.current === poId) return;
    viewed.current = poId;
    track("invoice_viewed", { po_id: poId, viewer, locale });
  }, [issuedAt, poId, viewer, locale]);
  const eyebrow = viewer === "supplier" ? m.eyebrowSupplier : m.eyebrowContractor;
  const back = (
    <Link href={`/${viewer}/po/${poId}`} data-testid="invoice-back" className={buttonClass("quiet", "sm", "print:hidden")}>
      {m.backToPo}
    </Link>
  );

  if (!po) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={eyebrow} title={m.notFound} />
        <EmptyState title={m.notFound}>{back}</EmptyState>
      </div>
    );
  }

  if ((viewer === "supplier" && po.supplierId !== demoPersona.supplier) || (viewer === "contractor" && po.contractorId !== demoPersona.contractor)) {
    return <NotYours viewer={viewer} />;
  }

  const issued = po.timeline.find((e) => e.status === "invoiced");
  if (!issued) {
    return (
      <div className="space-y-6" data-testid="invoice-not-yet">
        <PageHeader eyebrow={eyebrow} title={m.title} serial={po.id} />
        <EmptyState title={m.notYetTitle}>
          <span className="flex flex-col items-center gap-3">
            {m.notYetBody}
            {back}
          </span>
        </EmptyState>
      </div>
    );
  }

  const rfq = rfqs.find((r) => r.id === po.rfqId);
  const offer = offers.find((o) => o.id === po.offerId);
  const seller = reference.suppliers.find((s) => s.id === po.supplierId);
  const buyer = reference.contractors.find((c) => c.id === po.contractorId);
  const number = issued.note?.match(/(INV-[\w-]+)/)?.[1] ?? `INV-${po.id.replace(/^po_/, "")}`;
  const net = (po.subtotal + po.deliveryFee) as Halalas;
  const payload = seller
    ? zatcaQrPayload({ sellerName: seller.nameAr ?? seller.name, vatNumber: seller.vatNumber, timestamp: issued.at, totalInclVat: po.totalInclVat, vat: po.vat })
    : "";
  const lines =
    offer && rfq
      ? offer.lines.flatMap((ol) => {
          const line = rfq.lines.find((l) => l.id === ol.rfqLineId);
          if (!line) return [];
          const qty = Math.min(line.quantity, ol.quantityAvailable);
          return [{ id: ol.rfqLineId, name: i.lineName(line), brand: i.seedText(ol.brand), qty: i.qty(qty, line.unit), unit: ol.unitPrice, total: Math.round(ol.unitPrice * qty) as Halalas }];
        })
      : [];

  const party = (title: string, name: string, vat: string | undefined, extra?: string) => (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-[var(--tracking-eyebrow)] text-ink-muted">{title}</p>
      <p className="mt-1 font-semibold text-ink">{name}</p>
      {vat ? (
        <p className="text-sm text-ink-muted">
          {m.vatNumber}: <bdi className="font-mono text-ink">{vat}</bdi>
        </p>
      ) : null}
      {extra ? <p className="text-sm text-ink-muted">{extra}</p> : null}
    </div>
  );

  return (
    <article className="space-y-6" data-testid="tax-invoice" aria-labelledby="invoice-title">
      <PageHeader
        eyebrow={eyebrow}
        title={m.title}
        // Saudi tax invoices are bilingual: the other language's title sits under the heading.
        subtitle={
          <span lang={i.ar ? "en" : "ar"} dir={i.ar ? "ltr" : "rtl"} data-testid="invoice-title-alt">
            {i.ar ? invoice.en.title : invoice.ar.title}
          </span>
        }
        serial={number}
        meta={
          <>
            <span>
              {m.issued}: <bdi>{i.f.dateTime(issued.at)}</bdi>
            </span>
            <span>
              {m.poRef}: <bdi className="font-mono">{po.id}</bdi>
            </span>
          </>
        }
        actions={
          <span className="flex flex-wrap items-center gap-2">
            {back}
            <PrintButton poId={po.id} document="invoice" testId="invoice-print" />
          </span>
        }
      />
      <h2 id="invoice-title" className="sr-only">
        {m.title} {number}
      </h2>

      <div data-testid="invoice-sample" className="print:[&>*]:bg-transparent print:[&>*]:shadow-none">
        <Alert tone="caution" title={m.sample}>
          {m.sampleBody}
        </Alert>
      </div>

      <Panel title={m.parties}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between print:flex-row print:items-start print:justify-between">
          <div className="grid flex-1 gap-6 sm:grid-cols-2 print:grid-cols-2">
            {party(m.seller, i.name(seller, po.supplierId), seller?.vatNumber)}
            {party(m.buyer, i.name(buyer, po.contractorId), buyer?.vatNumber, buyer ? `${m.cr} ${buyer.crNumber}` : undefined)}
          </div>
          {payload ? (
            <figure className="flex flex-col items-center gap-2 sm:items-end print:items-end">
              <ZatcaQrCode payload={payload} label={m.qrLabel} />
              <figcaption className="max-w-48 text-center text-xs text-ink-muted sm:text-end">{m.qrNote}</figcaption>
            </figure>
          ) : null}
        </div>
      </Panel>

      {/* Phones: one card per line, no sideways scroll (like the PO lines in #137). From sm, and always on paper, the table. */}
      <ul className="space-y-2 sm:hidden print:hidden" aria-label={`${m.title} ${number}`}>
        {lines.map((l) => (
          <li key={l.id} data-testid="invoice-line" className="rounded-xl border border-line bg-surface p-4 text-sm shadow-card">
            <p className="text-ink">
              {l.name} <span className="text-ink-muted">· {l.brand}</span>
            </p>
            <dl className="mt-3 space-y-1.5">
              {(
                [
                  [m.qty, l.qty],
                  [m.unitPrice, i.f.money(l.unit)],
                  [m.lineTotal, i.f.money(l.total)],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="whitespace-nowrap text-end tabular-nums text-ink">
                    <bdi>{value}</bdi>
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <Table caption={`${m.title} ${number}`} minWidth={560} className="hidden sm:block print:block">
        <THead>
          <tr>
            <Th>{m.item}</Th>
            <Th className="text-end">{m.qty}</Th>
            <Th className="text-end">{m.unitPrice}</Th>
            <Th className="text-end">{m.lineTotal}</Th>
          </tr>
        </THead>
        <tbody>
          {lines.map((l) => (
            <Tr key={l.id} data-testid="invoice-line">
              <Td>
                {l.name} <span className="text-ink-muted">· {l.brand}</span>
              </Td>
              <Td className="whitespace-nowrap text-end tabular-nums">
                <bdi>{l.qty}</bdi>
              </Td>
              <Td className="whitespace-nowrap text-end tabular-nums">
                <bdi>{i.f.money(l.unit)}</bdi>
              </Td>
              <Td className="whitespace-nowrap text-end tabular-nums">
                <bdi>{i.f.money(l.total)}</bdi>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>

      {/* Rows of dt/dd pairs (valid dl children): the total's rule spans the whole row, and the block
          keeps the table's inline padding so amounts never touch the page edge in either direction. */}
      <div className="flex flex-col items-end gap-3 px-4">
        <dl className="w-full max-w-sm space-y-2 text-sm" data-testid="invoice-totals">
          {(
            [
              [m.delivery, po.deliveryFee, undefined],
              [m.subtotal, net, undefined],
              [m.vat, po.vat, "invoice-vat"],
            ] as const
          ).map(([label, amount, testId]) => (
            <div key={label} className="flex items-baseline justify-between gap-6">
              <dt className="text-ink-muted">{label}</dt>
              <dd className="whitespace-nowrap text-end tabular-nums" data-testid={testId}>
                <bdi>{i.f.money(amount)}</bdi>
              </dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-6 border-t border-line pt-2 font-semibold text-ink">
            <dt>{m.total}</dt>
            <dd className="whitespace-nowrap text-end tabular-nums" data-testid="invoice-total">
              <bdi>{i.f.money(po.totalInclVat)}</bdi>
            </dd>
          </div>
        </dl>
        <p className="w-full max-w-sm text-sm text-ink-muted" data-testid="invoice-payment">
          <span className="font-medium text-ink">{m.payment}:</span> {po.paymentMethod === "platform_credit" ? m.paidFromCap : m.bankTransfer}
        </p>
      </div>

      <p className="hidden text-xs text-ink-muted print:block">{m.printedOn}</p>
    </article>
  );
}
