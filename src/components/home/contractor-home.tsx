"use client";

import Link from "next/link";
import { demoPersona, reference } from "@/data";
import { RfqList } from "@/components/procurement/rfq-list";
import { Badge, buttonClass, CreditCapMeter, Facts, Icon, PageHeader, Panel, SampleDataLabel, StatusTimeline, type TimelineStep } from "@/components/ui";
import { formatSar, halalas } from "@/domain/money";
import type { PoStatus, PurchaseOrder } from "@/domain/types";
import { formatDate, formatDateTime, formatPercent } from "@/lib/format";
import { PO_STATUS } from "@/lib/status";
import { useDemo } from "@/store";

const PO_STEPS: PoStatus[] = ["placed", "confirmed", "dispatched", "delivered"];
const ACTOR = { contractor: "Contractor", supplier: "Supplier", credit: "Credit manager", platform: "Platform" } as const;

function poSteps(po: PurchaseOrder): TimelineStep[] {
  const reached = new Map(po.timeline.map((e) => [e.status, e]));
  const steps: TimelineStep[] = PO_STEPS.map((s) => {
    const e = reached.get(s);
    return { label: PO_STATUS[s].label, state: e ? "done" : "upcoming", at: e ? formatDateTime(e.at) : undefined, actor: e ? ACTOR[e.actor] : undefined, note: e?.note };
  });
  const next = steps.find((s) => s.state === "upcoming");
  if (next) next.state = "current";
  if (po.creditDraw?.supplierPaidAt) {
    steps.push({ label: "Supplier paid directly from your credit cap", state: "done", at: formatDateTime(po.creditDraw.supplierPaidAt), actor: "Platform" });
  }
  return steps;
}

/** First view for the contractor: open RFQs with offers, the credit cap, and the latest PO. */
export function ContractorHome() {
  const pos = useDemo((s) => s.purchaseOrders);
  const facilities = useDemo((s) => s.creditFacilities);
  const me = reference.contractors.find((c) => c.id === demoPersona.contractor);
  const facility = facilities.find((f) => f.contractorId === demoPersona.contractor);
  const po = pos.filter((p) => p.contractorId === demoPersona.contractor).sort((a, b) => b.placedAt.localeCompare(a.placedAt))[0];
  const supplier = po ? reference.suppliers.find((s) => s.id === po.supplierId) : undefined;

  const creditLink = (
    <Link href="/contractor/credit" data-testid="contractor-credit-link" className={buttonClass("secondary", "sm", "self-start")}>
      Credit cap, applications and progress
      <Icon name="arrow-right" />
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Contractor workspace"
        status={<SampleDataLabel />}
        meta={
          <>
            <span>{me?.name}</span>
            {me ? <span className="font-mono text-xs">CR {me.crNumber}</span> : null}
          </>
        }
        actions={
          <Link href="/contractor/rfq/new" data-testid="rfq-new" className={buttonClass("primary")}>
            <Icon name="plus" />
            New RFQ
          </Link>
        }
      />

      <section aria-labelledby="rfqs-h" className="flex flex-col gap-3">
        <h2 id="rfqs-h" className="text-lg font-semibold text-ink">
          My RFQs
        </h2>
        <RfqList />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Credit cap" aside={facility ? <Badge tone="positive">Approved · Band {facility.band}</Badge> : <Badge>Not applied</Badge>}>
          {facility ? (
            <div className="flex flex-col gap-5">
              <CreditCapMeter cap={facility.cap} drawn={facility.drawn} format={(n) => formatSar(halalas(n))} />
              <Facts
                columns={3}
                items={[
                  { label: "Profit rate", value: `${formatPercent(facility.profitRate, 1)} for ${facility.maxTenorDays} days`, },
                  { label: "Equivalent APR", value: formatPercent((facility.profitRate * 365) / facility.maxTenorDays, 1) },
                  { label: "Next review", value: formatDate(facility.reviewDue) },
                ]}
              />
              <p className="text-sm text-ink-muted">
                Credit is drawn per PO. The supplier is paid directly; you repay the cost plus the Murabaha markup on the due date. Decided by an independent credit manager on {formatDate(facility.approvedAt)}.
              </p>
              {creditLink}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-4">
              <p className="text-sm text-ink-muted">Apply for a credit cap to pay suppliers from credit, one PO at a time. An independent credit manager reviews the application.</p>
              {creditLink}
            </div>
          )}
        </Panel>

        <Panel title="Latest PO" aside={po ? <Badge tone={PO_STATUS[po.status].tone}>{PO_STATUS[po.status].label}</Badge> : null}>
          {po ? (
            <div className="flex flex-col gap-5" data-testid="po-status">
              <Facts
                items={[
                  { label: "PO number", value: <span className="font-mono text-xs">{po.id}</span> },
                  { label: "Supplier", value: supplier?.name ?? po.supplierId, valueAr: supplier?.nameAr },
                  { label: "Total incl. 15% VAT", value: formatSar(po.totalInclVat) },
                  {
                    label: "Payment",
                    value: po.creditDraw ? (
                      <>
                        From credit cap, due {formatDate(po.creditDraw.dueDate)}
                        <span className="mt-0.5 block text-xs font-normal text-ink-muted">
                          Murabaha markup {formatSar(po.creditDraw.markup)} ({formatPercent(po.creditDraw.profitRate, 1)} profit rate, {formatPercent(po.creditDraw.apr, 1)} APR)
                        </span>
                      </>
                    ) : (
                      "Bank transfer"
                    ),
                  },
                ]}
              />
              <StatusTimeline label={`Status of ${po.id}`} steps={poSteps(po)} />
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Your first PO appears here once you choose an offer.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
