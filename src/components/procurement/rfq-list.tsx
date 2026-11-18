"use client";

import Link from "next/link";
import { demoPersona } from "@/data";
import { Badge, CellNote, EmptyState, Table, Td, Th, THead, Tr } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { RFQ_STATUS } from "@/lib/status";
import { useDemo } from "@/store";

/** The contractor's RFQs, newest first, with how many offers each has and when offers close. */
export function RfqList() {
  const rfqs = useDemo((s) => s.rfqs);
  const offers = useDemo((s) => s.offers);
  const mine = rfqs.filter((r) => r.contractorId === demoPersona.contractor).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (mine.length === 0) {
    return (
      <EmptyState title="No RFQs yet">Upload an RFQ or pick materials from the catalog. Shortlisted suppliers then send their offers here.</EmptyState>
    );
  }

  return (
    <Table caption="My RFQs" minWidth={720}>
      <THead>
        <tr>
          <Th>RFQ</Th>
          <Th>Status</Th>
          <Th align="end">Offers</Th>
          <Th>Offers close</Th>
          <Th>Required on site</Th>
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
                  {r.title}
                </Link>
                <CellNote>
                  <span className="font-mono">{r.id}</span> · {r.lines.length} {r.lines.length === 1 ? "line" : "lines"} · {r.deliveryCity} · {r.source === "upload" ? "from uploaded RFQ" : "from catalog"}
                  {r.wantsCredit ? " · paying from credit cap" : ""}
                </CellNote>
              </Td>
              <Td>
                <Badge tone={status.tone}>{status.label}</Badge>
              </Td>
              <Td align="end">
                {received}
                <CellNote>of {r.invitedSupplierIds.length} invited</CellNote>
              </Td>
              <Td className="whitespace-nowrap">{r.status === "draft" ? "Not sent yet" : formatDate(r.closesAt)}</Td>
              <Td className="whitespace-nowrap">{formatDate(r.requiredBy)}</Td>
            </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}
