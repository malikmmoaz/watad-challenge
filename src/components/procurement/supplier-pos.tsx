"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge, CellNote, EmptyState, Table, Td, Th, THead, Tr } from "@/components/ui";
import { reference } from "@/data";
import { formatSar } from "@/domain/money";
import type { OrgId } from "@/domain/types";
import { formatDate } from "@/lib/format";
import { supplierNextStep } from "@/lib/procurement/supplier-offer";
import { PO_STATUS } from "@/lib/status";
import { useDemo } from "@/store";

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
  const toDo = mine.filter((m) => m.step.yours).length;

  return (
    <section aria-labelledby="supplier-pos-h" className="flex flex-col gap-3">
      <div>
        <h2 id="supplier-pos-h" className="text-lg font-semibold text-ink">
          Purchase orders{toDo > 0 ? ` · ${toDo} need${toDo === 1 ? "s" : ""} you` : ""}
        </h2>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">Orders you won. Accept, dispatch and invoice from here; credit orders are paid to you directly once you invoice.</p>
      </div>
      {mine.length === 0 ? (
        <EmptyState title="No purchase orders yet">When a contractor chooses your offer, the purchase order appears here for you to accept.</EmptyState>
      ) : (
        <Table caption="Your purchase orders" minWidth={760}>
          <THead>
            <tr>
              <Th>Purchase order</Th>
              <Th>Status</Th>
              <Th>Your next step</Th>
              <Th align="end">Total incl. VAT</Th>
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
                      {contractor?.name}
                      {rfq ? ` · ${rfq.title}` : ""}
                    </CellNote>
                  </Td>
                  <Td>
                    <Badge tone={status.tone}>{status.label}</Badge>
                    <CellNote>Placed {formatDate(po.placedAt)}</CellNote>
                  </Td>
                  <Td>
                    <span className={step.yours ? "font-medium text-ink" : "text-ink-muted"}>{step.text}</span>
                  </Td>
                  <Td align="end">
                    <span className="tabular-nums text-ink">{formatSar(po.totalInclVat)}</span>
                    <CellNote>{po.paymentMethod === "platform_credit" ? "Pay with credit" : "Bank transfer"}</CellNote>
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
