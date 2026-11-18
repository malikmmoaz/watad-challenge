"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { reference } from "@/data";
import { drawLedger, repayDraw, type DrawState } from "@/domain/credit/draws";
import { formatSar } from "@/domain/money";
import { getState, update, useDemo } from "@/store";
import { useToday } from "./use-today";
import { Alert, Badge, Button, EmptyState, Panel, Table, Td, Th, THead, Tr, type Tone } from "@/components/ui";

const STATE: Record<DrawState, { text: string; tone: Tone }> = {
  awaiting_supplier_payment: { text: "Supplier not yet paid", tone: "neutral" },
  outstanding: { text: "Outstanding", tone: "info" },
  overdue: { text: "Overdue", tone: "negative" },
  repaid: { text: "Repaid", tone: "positive" },
};

/** Credit drawn on purchase orders, with repayment that releases the cap. */
export function DrawLedger({ contractorId, readOnly = false }: { contractorId: string; readOnly?: boolean }) {
  const pos = useDemo((s) => s.purchaseOrders);
  const asOf = useToday();
  const rows = useMemo(() => drawLedger(pos, contractorId, asOf), [pos, contractorId, asOf]);
  const [message, setMessage] = useState<string | null>(null);

  const repay = (poId: string) => {
    const s = getState();
    const r = repayDraw(s.purchaseOrders, s.creditFacilities, poId, new Date().toISOString());
    if (!r.ok) return setMessage(r.error);
    update((prev) => ({ ...prev, purchaseOrders: r.purchaseOrders, creditFacilities: r.creditFacilities }));
    setMessage(`Repaid ${formatSar(r.repaid)}. The principal is back in your available credit.`);
  };

  return (
    <div data-testid="credit-draws">
      <Panel title="Credit drawn on purchase orders">
        {rows.length === 0 ? (
          <EmptyState title="No credit drawn yet">Choose &ldquo;Pay with credit&rdquo; when you place a purchase order; the supplier is paid directly.</EmptyState>
        ) : (
          <div className="space-y-3">
            {message && <Alert tone="positive" title={message} />}
            <Table caption="Credit draws" minWidth={760}>
              <THead>
                <tr>
                  <Th>Purchase order</Th>
                  <Th>Supplier</Th>
                  <Th align="end">Order total (incl. VAT)</Th>
                  <Th align="end">Murabaha markup</Th>
                  <Th align="end">To repay</Th>
                  <Th>Due</Th>
                  <Th>Status</Th>
                  {!readOnly && <Th align="end">Action</Th>}
                </tr>
              </THead>
              <tbody>
                {rows.map((r) => (
                  <Tr key={r.poId} data-testid={`credit-draw-${r.poId}`} data-state={r.state}>
                    <Td>
                      <Link href={`/contractor/po/${r.poId}`} className="font-mono text-xs text-stamp underline underline-offset-[3px]">
                        {r.poId}
                      </Link>
                    </Td>
                    <Td>{reference.suppliers.find((s) => s.id === r.supplierId)?.name ?? r.supplierId}</Td>
                    <Td align="end">{formatSar(r.principal)}</Td>
                    <Td align="end">
                      {formatSar(r.markup)}
                      <span className="block text-xs text-ink-muted">
                        {(r.profitRate * 100).toFixed(2)}% for {r.tenorDays} days · {(r.apr * 100).toFixed(1)}% APR
                      </span>
                    </Td>
                    <Td align="end">{formatSar(r.totalRepayable)}</Td>
                    <Td>
                      {r.dueDate}
                      {r.state !== "repaid" && <span className="block text-xs text-ink-muted">{r.daysToDue >= 0 ? `in ${r.daysToDue} days` : `${-r.daysToDue} days late`}</span>}
                    </Td>
                    <Td>
                      <Badge tone={STATE[r.state].tone}>{STATE[r.state].text}</Badge>
                    </Td>
                    {!readOnly && (
                      <Td align="end">
                        {r.state !== "repaid" && (
                          <Button size="sm" onClick={() => repay(r.poId)} data-testid={`credit-repay-${r.poId}`}>
                            Repay {formatSar(r.totalRepayable)}
                          </Button>
                        )}
                      </Td>
                    )}
                  </Tr>
                ))}
              </tbody>
            </Table>
            <p className="text-xs text-ink-muted">The markup is fixed when the order is placed and does not grow if payment is late. Repaying releases the order total back to your cap.</p>
          </div>
        )}
      </Panel>
    </div>
  );
}
