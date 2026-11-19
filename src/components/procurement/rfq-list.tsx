"use client";

import Link from "next/link";
import { demoPersona } from "@/data";
import { Badge, CellNote, EmptyState, Table, Td, Th, THead, Tr } from "@/components/ui";
import { RFQ_STATUS } from "@/lib/status";
import { useProcurementI18n } from "./use-procurement-i18n";
import { useDemo } from "@/store";

/** The contractor's RFQs, newest first, with how many offers each has and when offers close. */
export function RfqList() {
  const rfqs = useDemo((s) => s.rfqs);
  const offers = useDemo((s) => s.offers);
  const { m, status: st, f, fill, city, rfqTitle } = useProcurementI18n();
  const l = m.rfqList;
  const mine = rfqs.filter((r) => r.contractorId === demoPersona.contractor).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (mine.length === 0) {
    return (
      <EmptyState title={l.empty}>{l.emptyHint}</EmptyState>
    );
  }

  return (
    <Table caption={l.title} minWidth={720}>
      <THead>
        <tr>
          <Th>{l.rfq}</Th>
          <Th>{m.common.status}</Th>
          <Th align="end">{l.offers}</Th>
          <Th>{l.offersClose}</Th>
          <Th>{l.requiredOnSite}</Th>
        </tr>
      </THead>
      <tbody>
        {mine.map((r) => {
          const received = offers.filter((o) => o.rfqId === r.id && o.status !== "withdrawn").length;
          const status = RFQ_STATUS[r.status];
          return (
            <Tr key={r.id} data-testid="rfq-row">
              <Td>
                <Link href={`/contractor/rfq/${r.id}`} className="font-medium text-ink underline decoration-line-strong underline-offset-[3px] hover:decoration-ink">
                  {rfqTitle(r)}
                </Link>
                <CellNote>
                  <span className="font-mono">{r.id}</span> · {r.lines.length === 1 ? l.lineOne : fill(l.lines, { n: r.lines.length })} · {city(r.deliveryCity)} · {r.source === "upload" ? l.fromUpload : l.fromCatalog}
                  {r.wantsCredit ? l.payingCredit : ""}
                </CellNote>
              </Td>
              <Td>
                <Badge tone={status.tone}>{st.rfq[r.status]}</Badge>
              </Td>
              <Td align="end">
                {received}
                <CellNote>{fill(l.ofInvited, { n: r.invitedSupplierIds.length })}</CellNote>
              </Td>
              <Td className="whitespace-nowrap">{r.status === "draft" ? l.notSent : f.date(r.closesAt)}</Td>
              <Td className="whitespace-nowrap">{f.date(r.requiredBy)}</Td>
            </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}
