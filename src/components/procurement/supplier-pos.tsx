"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge, CellNote, EmptyState, Table, Td, Th, THead, Tr } from "@/components/ui";
import { reference } from "@/data";
import type { OrgId, PurchaseOrder } from "@/domain/types";
import { supplierNextStep } from "@/lib/procurement/supplier-offer";
import { PO_STATUS } from "@/lib/status";
import { useDemo } from "@/store";
import { useProcurementI18n } from "./use-procurement-i18n";

/** The supplier's won orders, the ones needing its action first. */
export function SupplierPurchaseOrders({ supplierId }: { supplierId: OrgId }) {
  const pos = useDemo((s) => s.purchaseOrders);
  const rfqs = useDemo((s) => s.rfqs);
  const mine = useMemo(
    () =>
      pos
        .filter((p) => p.supplierId === supplierId)
        .map((po) => ({ po, step: supplierNextStep(po) }))
        .sort((a, b) => Number(b.step.yours) - Number(a.step.yours) || b.po.placedAt.localeCompare(a.po.placedAt)),
    [pos, supplierId],
  );
  const toDo = mine.filter((x) => x.step.yours).length;
  const { m, s, status: st, f, fill, name, rfqTitle } = useProcurementI18n();
  // The step follows from the status; show it in the reader's locale.
  const stepText = (po: PurchaseOrder, yours: boolean): string => {
    if (yours) return po.status === "placed" ? m.poActions.accept : po.status === "confirmed" ? m.poActions.dispatch : m.poActions.invoice;
    if (po.status === "dispatched") return s.pos.waitDelivery;
    if (po.status === "invoiced") return s.pos.waitTransfer;
    if (po.status === "paid") return po.creditDraw ? s.pos.paidFromCap : s.pos.paid;
    if (po.status === "cancelled") return s.pos.cancelled;
    return s.pos.waitContractor;
  };

  return (
    <section aria-labelledby="supplier-pos-h" className="flex flex-col gap-3">
      <div>
        <h2 id="supplier-pos-h" className="text-lg font-semibold text-ink">
          {s.pos.title}
          {toDo === 1 ? s.pos.needsYouOne : toDo > 1 ? fill(s.pos.needsYou, { n: toDo }) : ""}
        </h2>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">{s.pos.intro}</p>
      </div>
      {mine.length === 0 ? (
        <EmptyState title={s.pos.empty}>{s.pos.emptyBody}</EmptyState>
      ) : (
        <Table caption={s.pos.caption} minWidth={760}>
          <THead>
            <tr>
              <Th>{s.pos.po}</Th>
              <Th>{s.pos.status}</Th>
              <Th>{s.pos.nextStep}</Th>
              <Th align="end">{s.pos.total}</Th>
            </tr>
          </THead>
          <tbody>
            {mine.map(({ po, step }) => {
              const contractor = reference.contractors.find((c) => c.id === po.contractorId);
              const rfq = rfqs.find((r) => r.id === po.rfqId);
              const status = PO_STATUS[po.status];
              return (
                <Tr key={po.id} data-testid="supplier-po-row" data-status={po.status} state={step.yours ? "recommended" : "default"}>
                  <Td>
                    <Link href={`/supplier/po/${po.id}`} data-testid="supplier-po-open" className="font-mono text-sm text-ink underline decoration-line-strong underline-offset-[3px] hover:decoration-ink">
                      {po.id}
                    </Link>
                    <CellNote>
                      {name(contractor)}
                      {rfq ? ` · ${rfqTitle(rfq)}` : ""}
                    </CellNote>
                  </Td>
                  <Td>
                    <Badge tone={status.tone}>{st.po[po.status]}</Badge>
                    <CellNote>{fill(s.pos.placed, { when: f.date(po.placedAt) })}</CellNote>
                  </Td>
                  <Td>
                    <span className={step.yours ? "font-medium text-ink" : "text-ink-muted"}>{stepText(po, step.yours)}</span>
                  </Td>
                  <Td align="end">
                    <span className="tabular-nums text-ink">{f.money(po.totalInclVat)}</span>
                    <CellNote>{po.paymentMethod === "platform_credit" ? s.pos.payCredit : s.pos.payBank}</CellNote>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </section>
  );
}
