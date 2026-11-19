"use client";

import Link from "next/link";
import { demoPersona, reference } from "@/data";
import { Badge, CellNote, EmptyState, Facts, PageHeader, Panel, SampleDataLabel, StatStrip, Table, Td, Th, THead, Tr } from "@/components/ui";
import type { Rfq, Supplier } from "@/domain/types";
import { CATEGORY_LABELS } from "@/lib/procurement/labels";
import { SupplierPurchaseOrders } from "@/components/procurement/supplier-pos";
import { useProcurementI18n } from "@/components/procurement/use-procurement-i18n";
import { useDemo } from "@/store";

type I18n = ReturnType<typeof useProcurementI18n>;

/** Plain-language reasons this request reached this supplier, in the reader's locale. */
function whyRelevant(rfq: Rfq, me: Supplier, i: I18n): string[] {
  const h = i.s.home;
  const categories = new Set(rfq.lines.map((l) => reference.materials.find((m) => m.id === l.materialId)?.category).filter((c) => c !== undefined));
  const stocked = [...categories].filter((c) => me.categories.includes(c));
  const reasons: string[] = [];
  if (stocked.length) reasons.push(i.fill(h.whyStock, { categories: stocked.map((c) => (i.ar ? i.category(c) : CATEGORY_LABELS[c].toLowerCase())).join(h.and) }));
  if (me.serviceCities.includes(rfq.deliveryCity)) reasons.push(i.fill(h.whyDeliver, { city: i.city(rfq.deliveryCity) }));
  if (rfq.wantsCredit && me.acceptsPlatformCredit) reasons.push(h.whyCredit);
  return reasons;
}

/** First view for the supplier: requests matched to them, why, and whether they have offered. */
export function SupplierHome() {
  const i = useProcurementI18n();
  const { s: sm, f, fill } = i;
  const h = sm.home;
  const rfqs = useDemo((s) => s.rfqs);
  const offers = useDemo((s) => s.offers);
  const pos = useDemo((s) => s.purchaseOrders);
  const me = reference.suppliers.find((s) => s.id === demoPersona.supplier);
  if (!me) return null;

  const requests = rfqs
    .filter((r) => r.status !== "draft" && r.status !== "cancelled" && r.invitedSupplierIds.includes(me.id))
    .sort((a, b) => a.closesAt.localeCompare(b.closesAt));
  const awaitingOffer = requests.filter((r) => (r.status === "sent" || r.status === "offers_received") && !offers.some((o) => o.rfqId === r.id && o.supplierId === me.id && o.status !== "withdrawn")).length;
  const submitted = offers.filter((o) => o.supplierId === me.id && o.status === "submitted").length;
  const toFulfil = pos.filter((p) => p.supplierId === me.id && !["delivered", "paid", "cancelled", "invoiced"].includes(p.status)).length;

  return (
    <>
      <PageHeader
        eyebrow={h.eyebrow}
        title={h.title}
        status={<SampleDataLabel />}
        meta={
          <>
            <span>{i.name(me)}</span>
            {me.nameAr && !i.ar ? (
              <span lang="ar" dir="rtl">
                {me.nameAr}
              </span>
            ) : null}
          </>
        }
      />

      <StatStrip
        items={[
          { label: h.awaitingOffer, value: awaitingOffer },
          { label: h.submitted, value: submitted, note: h.submittedNote },
          { label: h.toFulfil, value: toFulfil },
          { label: h.onTime, value: f.percent(me.performance.onTimeRate), note: fill(h.overOrders, { n: f.number(me.performance.ordersCompleted) }) },
        ]}
      />

      <section aria-labelledby="inbox-h" className="flex flex-col gap-3">
        <div>
          <h2 id="inbox-h" className="text-lg font-semibold text-ink">
            {h.inboxTitle}
          </h2>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            {h.inboxIntro}
          </p>
        </div>
        {requests.length === 0 ? (
          <EmptyState title={h.emptyTitle}>{h.emptyBody}</EmptyState>
        ) : (
          <Table caption={h.inboxTitle} minWidth={820}>
            <THead>
              <tr>
                <Th>{h.colRequest}</Th>
                <Th>{h.colWhy}</Th>
                <Th>{h.colRequired}</Th>
                <Th>{h.colCloses}</Th>
                <Th>{h.colYourOffer}</Th>
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
                        <span className="font-mono">{r.id}</span> · {i.name(contractor)} · {r.lines.length === 1 ? h.lineOne : fill(h.lines, { n: r.lines.length })}
                      </CellNote>
                      <CellNote>{fill(h.preferredTerms, { terms: i.terms(r.preferredTerms) })}</CellNote>
                    </Td>
                    <Td>
                      <ul className="flex flex-col gap-0.5 text-sm text-ink">
                        {whyRelevant(r, me, i).map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </Td>
                    <Td className="whitespace-nowrap">
                      {f.date(r.requiredBy)}
                      <CellNote>{i.city(r.deliveryCity)}</CellNote>
                    </Td>
                    <Td className="whitespace-nowrap">{f.date(r.closesAt)}</Td>
                    <Td>
                      {awardedToMe ? (
                        <Badge tone="positive">{h.chosen}</Badge>
                      ) : mine?.status === "not_selected" ? (
                        <Badge>{h.notChosen}</Badge>
                      ) : mine ? (
                        <>
                          <Badge tone="info">{h.offerSubmitted}</Badge>
                          <CellNote>
                            {fill(h.submittedOn, { when: f.date(mine.submittedAt), days: mine.leadTimeDays })}
                          </CellNote>
                        </>
                      ) : (
                        <Badge tone="caution">{h.offerNotSent}</Badge>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </section>

      <SupplierPurchaseOrders supplierId={me.id} />

      <Panel title={h.recordTitle} aside={<SampleDataLabel />}>
        <div className="flex flex-col gap-4">
          <Facts
            columns={3}
            items={[
              { label: h.onTime, value: f.percent(me.performance.onTimeRate) },
              { label: h.fillRate, value: f.percent(me.performance.fillRate) },
              { label: h.ordersCompleted, value: f.number(me.performance.ordersCompleted) },
              { label: h.avgResponse, value: fill(h.hours, { n: me.performance.avgResponseHours }) },
              { label: h.disputes, value: f.percent(me.performance.disputeRate) },
              { label: h.platformCredit, value: me.acceptsPlatformCredit ? h.creditAccepted : h.creditNotAccepted },
            ]}
          />
          <p className="max-w-prose text-sm text-ink-muted">{h.recordNote}</p>
        </div>
      </Panel>
    </>
  );
}
