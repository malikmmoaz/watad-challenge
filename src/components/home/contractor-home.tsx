"use client";

import Link from "next/link";
import { demoPersona, reference } from "@/data";
import { RfqList } from "@/components/procurement/rfq-list";
import { timelineSteps } from "@/components/procurement/po-detail";
import { useProcurementI18n } from "@/components/procurement/use-procurement-i18n";
import { Badge, buttonClass, CreditCapMeter, Facts, Icon, PageHeader, Panel, SampleDataLabel, StatStrip, StatusTimeline } from "@/components/ui";
import { availableCredit } from "@/domain/credit/facility";
import { home } from "@/i18n/home";
import { useMessages } from "@/i18n/locale";
import { PO_STATUS } from "@/lib/status";
import { useDemo } from "@/store";

/** First view for the contractor: open RFQs with offers, the credit cap, and the latest PO. */
export function ContractorHome() {
  const i = useProcurementI18n();
  const { f, fill } = i;
  const h = useMessages(home).contractor;
  const pos = useDemo((s) => s.purchaseOrders);
  const rfqs = useDemo((s) => s.rfqs);
  const offers = useDemo((s) => s.offers);
  const facilities = useDemo((s) => s.creditFacilities);
  const me = reference.contractors.find((c) => c.id === demoPersona.contractor);
  const facility = facilities.find((f) => f.contractorId === demoPersona.contractor);
  const po = pos.filter((p) => p.contractorId === demoPersona.contractor).sort((a, b) => b.placedAt.localeCompare(a.placedAt))[0];
  const supplier = po ? reference.suppliers.find((s) => s.id === po.supplierId) : undefined;
  const openRfqs = rfqs.filter((r) => r.contractorId === demoPersona.contractor && (r.status === "draft" || r.status === "sent" || r.status === "offers_received"));
  const toCompare = offers.filter((o) => o.status === "submitted" && openRfqs.some((r) => r.id === o.rfqId)).length;
  const posInProgress = pos.filter((p) => p.contractorId === demoPersona.contractor && !["delivered", "paid", "cancelled", "invoiced"].includes(p.status)).length;

  const creditLink = (
    <Link href="/contractor/credit" data-testid="contractor-credit-link" className={buttonClass("secondary", "sm", "h-auto min-h-8 self-start whitespace-normal! py-1.5 text-start")}>
      {h.creditLink}
      <Icon name="arrow-right" />
    </Link>
  );

  return (
    <>
      <PageHeader
        eyebrow={h.eyebrow}
        title={h.title}
        status={<SampleDataLabel />}
        meta={
          <>
            <span>{i.name(me)}</span>
            {me ? (
              <span className="text-xs">
                {h.cr} <span className="font-mono">{me.crNumber}</span>
              </span>
            ) : null}
          </>
        }
        actions={
          <Link href="/contractor/rfq/new" data-testid="rfq-new" className={buttonClass("primary")}>
            <Icon name="plus" />
            {h.newRfq}
          </Link>
        }
      />

      <StatStrip
        items={[
          { label: h.stats.openRfqs, value: f.number(openRfqs.length), note: h.stats.openRfqsNote },
          { label: h.stats.toCompare, value: f.number(toCompare) },
          { label: h.stats.posOnTheWay, value: f.number(posInProgress), note: h.stats.posOnTheWayNote },
          { label: h.stats.capLeft, value: facility ? f.money(availableCredit(facility)) : h.stats.notApplied, compact: true, note: facility ? fill(h.stats.ofCap, { cap: f.money(facility.cap) }) : undefined },
        ]}
      />

      <section aria-labelledby="rfqs-h" className="flex flex-col gap-3">
        <h2 id="rfqs-h" className="text-lg font-semibold text-ink">
          {h.myRfqs}
        </h2>
        <RfqList />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={h.capPanel} aside={facility ? <Badge tone="positive">{fill(h.approvedBand, { band: facility.band })}</Badge> : <Badge>{h.stats.notApplied}</Badge>}>
          {facility ? (
            <div className="flex flex-col gap-5">
              <CreditCapMeter cap={facility.cap} drawn={facility.drawn} />
              <Facts
                columns={3}
                items={[
                  { label: h.profitRate, value: fill(h.profitRateValue, { rate: f.percent(facility.profitRate, 1), days: f.number(facility.maxTenorDays) }) },
                  { label: h.apr, value: f.percent((facility.profitRate * 365) / facility.maxTenorDays, 1) },
                  { label: h.nextReview, value: f.date(facility.reviewDue) },
                ]}
              />
              <p className="text-sm text-ink-muted">
                {fill(h.capExplainer, { date: f.date(facility.approvedAt) })}
              </p>
              {creditLink}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-4">
              <p className="text-sm text-ink-muted">{h.applyExplainer}</p>
              {creditLink}
            </div>
          )}
        </Panel>

        <Panel title={h.latestPo} aside={po ? <Badge tone={PO_STATUS[po.status].tone}>{i.m.poStatus[po.status]}</Badge> : null}>
          {po ? (
            <div className="flex flex-col gap-5" data-testid="po-status">
              <Facts
                items={[
                  { label: h.poNumber, value: <Link href={`/contractor/po/${po.id}`} data-testid="home-po-link" className="font-mono text-xs underline">{po.id}</Link> },
                  { label: h.supplier, value: i.name(supplier, po.supplierId), valueAr: i.ar ? undefined : supplier?.nameAr },
                  { label: h.total, value: f.money(po.totalInclVat) },
                  {
                    label: h.payment,
                    value: po.creditDraw ? (
                      <>
                        {fill(h.fromCap, { date: f.date(po.creditDraw.dueDate) })}
                        <span className="mt-0.5 block text-xs font-normal text-ink-muted">
                          {fill(h.markup, { markup: f.money(po.creditDraw.markup), rate: f.percent(po.creditDraw.profitRate, 1), apr: f.percent(po.creditDraw.apr, 1) })}
                        </span>
                      </>
                    ) : (
                      h.bankTransfer
                    ),
                  },
                ]}
              />
              <StatusTimeline label={fill(h.statusOf, { id: po.id })} steps={timelineSteps(po, i)} />
            </div>
          ) : (
            <p className="text-sm text-ink-muted">{h.noPo}</p>
          )}
        </Panel>
      </div>
    </>
  );
}
