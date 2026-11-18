"use client";

import Link from "next/link";
import { demoPersona, reference } from "@/data";
import { Badge, CellNote, EmptyState, Facts, PageHeader, Panel, SampleDataLabel, Table, Td, Th, THead, Tr } from "@/components/ui";
import type { Rfq, Supplier } from "@/domain/types";
import { formatDate, formatPercent } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/procurement/labels";
import { describeTerms } from "@/lib/procurement/comparison";
import { useDemo } from "@/store";

/** Plain-language reasons this request reached this supplier. */
function whyRelevant(rfq: Rfq, me: Supplier): string[] {
  const categories = new Set(rfq.lines.map((l) => reference.materials.find((m) => m.id === l.materialId)?.category).filter((c) => c !== undefined));
  const stocked = [...categories].filter((c) => me.categories.includes(c));
  const reasons: string[] = [];
  if (stocked.length) reasons.push(`You stock ${stocked.map((c) => CATEGORY_LABELS[c].toLowerCase()).join(" and ")}`);
  if (me.serviceCities.includes(rfq.deliveryCity)) reasons.push(`You deliver to ${rfq.deliveryCity}`);
  if (rfq.wantsCredit && me.acceptsPlatformCredit) reasons.push("Paid directly from the contractor's credit cap, which you accept");
  return reasons;
}

/** First view for the supplier: requests matched to them, why, and whether they have offered. */
export function SupplierHome() {
  const rfqs = useDemo((s) => s.rfqs);
  const offers = useDemo((s) => s.offers);
  const me = reference.suppliers.find((s) => s.id === demoPersona.supplier);
  if (!me) return null;

  const requests = rfqs
    .filter((r) => r.status !== "draft" && r.status !== "cancelled" && r.invitedSupplierIds.includes(me.id))
    .sort((a, b) => a.closesAt.localeCompare(b.closesAt));

  return (
    <>
      <PageHeader
        title="Supplier portal"
        status={<SampleDataLabel />}
        meta={
          <>
            <span>{me.name}</span>
            {me.nameAr ? (
              <span lang="ar" dir="rtl">
                {me.nameAr}
              </span>
            ) : null}
          </>
        }
      />

      <section aria-labelledby="inbox-h" className="flex flex-col gap-3">
        <div>
          <h2 id="inbox-h" className="text-lg font-semibold text-ink">
            Requests for you
          </h2>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            Contractors invite suppliers from a shortlist. Each request says why you were matched. The platform is neutral: every invited supplier sees the same request.
          </p>
        </div>
        {requests.length === 0 ? (
          <EmptyState title="No requests right now">New RFQs that match what you stock and where you deliver will appear here.</EmptyState>
        ) : (
          <Table caption="Requests for you" minWidth={820}>
            <THead>
              <tr>
                <Th>Request</Th>
                <Th>Why you were matched</Th>
                <Th>Required on site</Th>
                <Th>Offers close</Th>
                <Th>Your offer</Th>
              </tr>
            </THead>
            <tbody>
              {requests.map((r) => {
                const mine = offers.find((o) => o.rfqId === r.id && o.supplierId === me.id && o.status !== "withdrawn");
                const contractor = reference.contractors.find((c) => c.id === r.contractorId);
                const awardedToMe = mine?.status === "awarded";
                return (
                  <Tr key={r.id} data-testid="inbox-row" state={awardedToMe ? "recommended" : "default"}>
                    <Td>
                      <Link href={`/supplier/rfq/${r.id}`} data-testid="inbox-open" className="font-medium text-ink underline decoration-line-strong underline-offset-[3px] hover:decoration-ink">
                        {r.title}
                      </Link>
                      <CellNote>
                        <span className="font-mono">{r.id}</span> · {contractor?.name} · {r.lines.length} {r.lines.length === 1 ? "line" : "lines"}
                      </CellNote>
                      <CellNote>Preferred terms: {describeTerms(r.preferredTerms)}</CellNote>
                    </Td>
                    <Td>
                      <ul className="flex flex-col gap-0.5 text-sm text-ink">
                        {whyRelevant(r, me).map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </Td>
                    <Td className="whitespace-nowrap">
                      {formatDate(r.requiredBy)}
                      <CellNote>{r.deliveryCity}</CellNote>
                    </Td>
                    <Td className="whitespace-nowrap">{formatDate(r.closesAt)}</Td>
                    <Td>
                      {awardedToMe ? (
                        <Badge tone="positive">Chosen · PO placed</Badge>
                      ) : mine?.status === "not_selected" ? (
                        <Badge>Not chosen</Badge>
                      ) : mine ? (
                        <>
                          <Badge tone="info">Offer submitted</Badge>
                          <CellNote>
                            {formatDate(mine.submittedAt)} · {mine.leadTimeDays} days lead time
                          </CellNote>
                        </>
                      ) : (
                        <Badge tone="caution">Offer not sent</Badge>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </section>

      <Panel title="Your record on the platform" aside={<SampleDataLabel />}>
        <div className="flex flex-col gap-4">
          <Facts
            columns={3}
            items={[
              { label: "Delivered on time", value: formatPercent(me.performance.onTimeRate) },
              { label: "Delivered complete and to spec", value: formatPercent(me.performance.fillRate) },
              { label: "Orders completed", value: me.performance.ordersCompleted.toLocaleString("en-SA") },
              { label: "Average time to respond", value: `${me.performance.avgResponseHours} hours` },
              { label: "Orders with a dispute", value: formatPercent(me.performance.disputeRate) },
              { label: "Platform credit", value: me.acceptsPlatformCredit ? "Accepted: you are paid directly" : "Not accepted" },
            ]}
          />
          <p className="max-w-prose text-sm text-ink-muted">Contractors see these figures as match reasons on their shortlist. They are the same fields, in the same order, for every supplier.</p>
        </div>
      </Panel>
    </>
  );
}
