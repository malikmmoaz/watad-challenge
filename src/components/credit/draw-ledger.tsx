"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { reference } from "@/data";
import { drawLedger, repayDraw, type DrawState } from "@/domain/credit/draws";
import { track } from "@/lib/analytics";
import { getState, update, useDemo } from "@/store";
import { useToday } from "./use-today";
import { Alert, Badge, Button, CellNote, Panel, Table, Td, Th, THead, Tr, type Tone } from "@/components/ui";
import { fill } from "@/i18n/core";
import { credit } from "@/i18n/credit";
import { useFormat, useLocale, useMessages } from "@/i18n/locale";

const STATE_TONE: Record<DrawState, Tone> = { awaiting_supplier_payment: "neutral", outstanding: "info", overdue: "negative", repaid: "positive" };

/** Credit drawn on purchase orders, with repayment that releases the cap. */
export function DrawLedger({ contractorId, readOnly = false }: { contractorId: string; readOnly?: boolean }) {
  const m = useMessages(credit).draws;
  const f = useFormat();
  const locale = useLocale();
  const pos = useDemo((s) => s.purchaseOrders);
  const asOf = useToday();
  const rows = useMemo(() => drawLedger(pos, contractorId, asOf), [pos, contractorId, asOf]);
  // The last repayment (amount) or error, rendered in the current language.
  const [message, setMessage] = useState<{ repaid: number } | { error: string } | null>(null);

  const repay = (poId: string) => {
    const s = getState();
    const now = new Date().toISOString();
    const r = repayDraw(s.purchaseOrders, s.creditFacilities, poId, now);
    if (!r.ok) return setMessage({ error: r.error });
    const draw = s.purchaseOrders.find((p) => p.id === poId)?.creditDraw;
    if (draw) track("draw_repaid", { po_id: poId, repaid_before_due: now.slice(0, 10) <= draw.dueDate, tenor_days: draw.tenorDays });
    update((prev) => ({ ...prev, purchaseOrders: r.purchaseOrders, creditFacilities: r.creditFacilities }));
    setMessage({ repaid: r.repaid });
  };

  return (
    <div data-testid="credit-draws">
      <Panel title={m.title} flush>
        {rows.length === 0 ? (
          <div className="p-5" data-testid="credit-draws-empty">
            <p className="text-sm font-medium text-ink">{m.emptyTitle}</p>
            <p className="mt-1 text-sm text-ink-muted">{m.empty}</p>
          </div>
        ) : (
          <div>
            {message && (
              <div className="border-b border-line p-4">
                {"repaid" in message ? <Alert tone="positive" title={fill(m.repaid, { amount: f.money(message.repaid as Parameters<typeof f.money>[0]) })} /> : <Alert tone="negative" title={message.error} />}
              </div>
            )}
            <Table caption={m.caption} minWidth={880} className="rounded-none border-0 shadow-none">
              <THead>
                <tr>
                  <Th>{m.colPo}</Th>
                  <Th align="end">{m.colTotal}</Th>
                  <Th align="end">{m.colMarkup}</Th>
                  <Th align="end">{m.colRepay}</Th>
                  <Th>{m.colDue}</Th>
                  <Th>{m.colStatus}</Th>
                  {!readOnly && <Th align="end">{m.colAction}</Th>}
                </tr>
              </THead>
              <tbody>
                {rows.map((r) => (
                  <Tr key={r.poId} data-testid={`credit-draw-${r.poId}`} data-state={r.state}>
                    <Td>
                      <Link href={`/contractor/po/${r.poId}`} className="font-mono text-xs text-stamp underline underline-offset-[3px]">
                        {r.poId}
                      </Link>
                      <CellNote>{(() => {
                        const sup = reference.suppliers.find((x) => x.id === r.supplierId);
                        return (locale === "ar" ? sup?.nameAr : undefined) ?? sup?.name ?? r.supplierId;
                      })()}</CellNote>
                    </Td>
                    <Td align="end">{f.money(r.principal)}</Td>
                    <Td align="end">
                      {f.money(r.markup)}
                      <CellNote>{fill(m.rateNote, { rate: f.percent(r.profitRate, 2), days: r.tenorDays, apr: f.percent(r.apr, 1) })}</CellNote>
                    </Td>
                    <Td align="end">
                      <span className="font-semibold text-ink">{f.money(r.totalRepayable)}</span>
                    </Td>
                    <Td>
                      <span className="whitespace-nowrap">{f.date(r.dueDate)}</span>
                      {r.state !== "repaid" && <CellNote>{r.daysToDue >= 0 ? fill(m.inDays, { n: r.daysToDue }) : fill(m.daysLate, { n: -r.daysToDue })}</CellNote>}
                    </Td>
                    <Td>
                      <Badge tone={STATE_TONE[r.state]}>{m.state[r.state]}</Badge>
                    </Td>
                    {!readOnly && (
                      <Td align="end">
                        {r.state !== "repaid" && (
                          <Button size="sm" onClick={() => repay(r.poId)} aria-label={fill(m.repayLabel, { amount: f.money(r.totalRepayable), po: r.poId })} data-testid={`credit-repay-${r.poId}`}>
                            {m.repay}
                          </Button>
                        )}
                      </Td>
                    )}
                  </Tr>
                ))}
              </tbody>
            </Table>
            <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">{m.footnote}</p>
          </div>
        )}
      </Panel>
    </div>
  );
}
