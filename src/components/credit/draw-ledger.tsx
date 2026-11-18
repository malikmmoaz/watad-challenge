"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { reference } from "@/data";
import { drawLedger, repayDraw, type DrawState } from "@/domain/credit/draws";
import { formatSar } from "@/domain/money";
import { track } from "@/lib/analytics";
import { getState, update, useDemo } from "@/store";
import { useToday } from "./use-today";
import { Alert, Badge, Button, CellNote, Panel, Table, Td, Th, THead, Tr, type Tone } from "@/components/ui";
import { formatDate } from "@/lib/format";

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
    const now = new Date().toISOString();
    const r = repayDraw(s.purchaseOrders, s.creditFacilities, poId, now);
    if (!r.ok) return setMessage(r.error);
    const draw = s.purchaseOrders.find((p) => p.id === poId)?.creditDraw;
    if (draw) track("draw_repaid", { po_id: poId, repaid_before_due: now.slice(0, 10) <= draw.dueDate, tenor_days: draw.tenorDays });
    update((prev) => ({ ...prev, purchaseOrders: r.purchaseOrders, creditFacilities: r.creditFacilities }));
    setMessage(`Repaid ${formatSar(r.repaid)}. The principal is back in your available credit.`);
  };

  return (
    <div data-testid="credit-draws">
      <Panel title="Credit drawn on purchase orders" flush>
        {rows.length === 0 ? (
          <div className="p-5" data-testid="credit-draws-empty">
            <p className="text-sm font-medium text-ink">No credit drawn yet</p>
            <p className="mt-1 text-sm text-ink-muted">Choose &ldquo;Pay with credit&rdquo; when you place a purchase order; the supplier is paid directly and the order appears here.</p>
          </div>
        ) : (
          <div>
            {message && (
              <div className="border-b border-line p-4">
                <Alert tone="positive" title={message} />
              </div>
            )}
            <Table caption="Credit draws" minWidth={760} className="rounded-none border-0 shadow-none">
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
                      <CellNote>
                        {(r.profitRate * 100).toFixed(2)}% for {r.tenorDays} days · {(r.apr * 100).toFixed(1)}% APR
                      </CellNote>
                    </Td>
                    <Td align="end">{formatSar(r.totalRepayable)}</Td>
                    <Td>
                      {formatDate(r.dueDate)}
                      {r.state !== "repaid" && <CellNote>{r.daysToDue >= 0 ? `in ${r.daysToDue} days` : `${-r.daysToDue} days late`}</CellNote>}
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
            <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">The markup is fixed when the order is placed and does not grow if payment is late. Repaying releases the order total back to your cap.</p>
          </div>
        )}
      </Panel>
    </div>
  );
}
