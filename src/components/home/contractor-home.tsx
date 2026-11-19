"use client";

import Link from "next/link";
import { demoPersona, reference } from "@/data";
import { RfqList } from "@/components/procurement/rfq-list";
import { poNoteText } from "@/components/procurement/po-detail";
import { useProcurementI18n } from "@/components/procurement/use-procurement-i18n";
import { Badge, buttonClass, CreditCapMeter, Facts, Icon, PageHeader, Panel, SampleDataLabel, StatStrip, StatusTimeline, type TimelineStep } from "@/components/ui";
import { availableCredit } from "@/domain/credit/facility";
import { halalas } from "@/domain/money";
import type { PoStatus, PurchaseOrder } from "@/domain/types";
import { PO_STATUS } from "@/lib/status";
import { useDemo } from "@/store";

type I18n = ReturnType<typeof useProcurementI18n>;

const PO_STEPS: PoStatus[] = ["placed", "confirmed", "dispatched", "delivered"];

function poSteps(po: PurchaseOrder, i: I18n): TimelineStep[] {
  const h = i.m.home;
  const reached = new Map(po.timeline.map((e) => [e.status, e]));
  const steps: TimelineStep[] = PO_STEPS.map((s) => {
    const e = reached.get(s);
    return {
      label: i.status.po[s],
      state: e ? "done" : "upcoming",
      at: e ? i.f.dateTime(e.at) : undefined,
      actor: e ? h.actors[e.actor] : undefined,
      note: e?.note ? poNoteText(i, e.note) : undefined,
    };
  });
  const next = steps.find((s) => s.state === "upcoming");
  if (next) next.state = "current";
  if (po.creditDraw?.supplierPaidAt) {
    steps.push({ label: h.paidFromYourCap, state: "done", at: i.f.dateTime(po.creditDraw.supplierPaidAt), actor: h.actors.platform });
  }
  return steps;
}

/** First view for the contractor: open RFQs with offers, the credit cap, and the latest PO. */
export function ContractorHome() {
  const i = useProcurementI18n();
  const { m, f, fill } = i;
  const h = m.home;
  const pos = useDemo((s) => s.purchaseOrders);
  const rfqs = useDemo((s) => s.rfqs);
  const offers = useDemo((s) => s.offers);
  const facilities = useDemo((s) => s.creditFacilities);
  const me = reference.contractors.find((c) => c.id === demoPersona.contractor);
  const facility = facilities.find((x) => x.contractorId === demoPersona.contractor);
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
        eyebrow={m.common.contractor}
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
          { label: h.openRfqs, value: openRfqs.length, note: h.openRfqsNote },
          { label: h.toCompare, value: toCompare },
          { label: h.posOnWay, value: posInProgress, note: h.posOnWayNote },
          { label: h.capLeft, value: facility ? f.money(availableCredit(facility)) : h.notApplied, compact: true, note: facility ? fill(h.capOf, { cap: f.money(facility.cap) }) : undefined },
        ]}
      />

      <section aria-labelledby="rfqs-h" className="flex flex-col gap-3">
        <h2 id="rfqs-h" className="text-lg font-semibold text-ink">
          {m.common.myRfqs}
        </h2>
        <RfqList />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={h.creditCap} aside={facility ? <Badge tone="positive">{fill(h.approvedBand, { band: facility.band })}</Badge> : <Badge>{h.notApplied}</Badge>}>
          {facility ? (
            <div className="flex flex-col gap-5">
              <CreditCapMeter cap={facility.cap} drawn={facility.drawn} format={(n) => f.money(halalas(n))} />
              <Facts
                columns={3}
                items={[
                  { label: h.profitRate, value: fill(h.profitRateValue, { rate: f.percent(facility.profitRate, 1), days: facility.maxTenorDays }) },
                  { label: h.apr, value: f.percent((facility.profitRate * 365) / facility.maxTenorDays, 1) },
                  { label: h.nextReview, value: f.date(facility.reviewDue) },
                ]}
              />
              <p className="text-sm text-ink-muted">{fill(h.creditBody, { date: f.date(facility.approvedAt) })}</p>
              {creditLink}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-4">
              <p className="text-sm text-ink-muted">{h.applyBody}</p>
              {creditLink}
            </div>
          )}
        </Panel>

        <Panel title={h.latestPo} aside={po ? <Badge tone={PO_STATUS[po.status].tone}>{i.status.po[po.status]}</Badge> : null}>
          {po ? (
            <div className="flex flex-col gap-5" data-testid="po-status">
              <Facts
                items={[
                  { label: h.poNumber, value: <Link href={`/contractor/po/${po.id}`} data-testid="home-po-link" className="font-mono text-xs underline">{po.id}</Link> },
                  { label: m.common.supplier, value: supplier?.name ?? po.supplierId, valueAr: supplier?.nameAr },
                  { label: m.common.totalInclVat, value: f.money(po.totalInclVat) },
                  {
                    label: m.common.payment,
                    value: po.creditDraw ? (
                      <>
                        {fill(h.fromCap, { date: f.date(po.creditDraw.dueDate) })}
                        <span className="mt-0.5 block text-xs font-normal text-ink-muted">
                          {fill(h.markup, { markup: f.money(po.creditDraw.markup), rate: f.percent(po.creditDraw.profitRate, 1), apr: f.percent(po.creditDraw.apr, 1) })}
                        </span>
                      </>
                    ) : (
                      m.common.bankTransfer
                    ),
                  },
                ]}
              />
              <StatusTimeline label={fill(h.timelineLabel, { id: po.id })} steps={poSteps(po, i)} />
            </div>
          ) : (
            <p className="text-sm text-ink-muted">{h.empty}</p>
          )}
        </Panel>
      </div>
    </>
  );
}
