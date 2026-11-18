import Link from "next/link";
import type { ReactNode } from "react";
import { RoleLink } from "@/components/role-link";
import { ROLES } from "@/components/role-nav";
import { AiLabel, Badge, CreditCapMeter, DecisionStamp, Icon, LeadTimeBar, SampleDataLabel } from "@/components/ui";
import { demoPersona, reference, seedState } from "@/data";
import { formatSar, halalas } from "@/domain/money";
import type { Role } from "@/domain/types";
import { compareOffers } from "@/lib/procurement/comparison";
import { UNIT_LABELS } from "@/lib/procurement/labels";

/** Fixed "today" for the seeded sample data, so the page renders the same everywhere. */
const TODAY = "2026-11-18";
const DAY_MS = 86_400_000;
const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

/** What is waiting for each role right now, read from the seeded data. */
function waitingFor(role: Role): string {
  const { rfqs, offers, creditCases } = seedState;
  if (role === "contractor") {
    const mine = rfqs.filter((r) => r.contractorId === demoPersona.contractor && r.status !== "awarded");
    const toCompare = offers.filter((o) => o.status === "submitted" && mine.some((r) => r.id === o.rfqId)).length;
    return `${mine.length} open RFQs, ${toCompare} offers to compare`;
  }
  if (role === "supplier") {
    const invited = rfqs.filter((r) => r.invitedSupplierIds.some((id) => id === demoPersona.supplier) && r.status !== "awarded").length;
    return `${invited} ${invited === 1 ? "request" : "requests"} matched to you`;
  }
  const waiting = creditCases.filter((c) => c.status === "submitted" || c.status === "documents_review" || c.status === "in_assessment").length;
  return `${waiting} credit applications waiting for a decision`;
}

/** Printer's crop marks at the corners of the sheet: the page is one attested document. */
function CropMarks() {
  const mark = "pointer-events-none absolute size-3 border-line-control";
  return (
    <span aria-hidden="true" className="hidden sm:block">
      <span className={`${mark} -left-px -top-px border-l border-t`} />
      <span className={`${mark} -right-px -top-px border-r border-t`} />
      <span className={`${mark} -bottom-px -left-px border-b border-l`} />
      <span className={`${mark} -bottom-px -right-px border-b border-r`} />
    </span>
  );
}

function Step({ n, title, lead, serial, children }: { n: number; title: string; lead: string; serial: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-4 border-t border-line p-5 first:border-t-0 sm:p-6 md:odd:border-r lg:border-r lg:border-t-0 lg:last:border-r-0 md:[&:nth-child(2)]:border-t-0">
      <div>
        <p className="font-mono text-xs text-ink-muted">
          {String(n).padStart(2, "0")} · {serial}
        </p>
        <h3 className="mt-2 text-lg font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-sm text-ink-muted">{lead}</p>
      </div>
      <div className="flex flex-col gap-3 border-t border-dashed border-line-strong pt-4 text-sm">{children}</div>
    </li>
  );
}

export default function Home() {
  const rfq = seedState.rfqs.find((r) => r.id === "rfq_1042");
  const po = seedState.purchaseOrders[0];
  const facility = seedState.creditFacilities.find((f) => f.contractorId === demoPersona.contractor);
  const creditCase = seedState.creditCases.find((c) => c.id === facility?.creditCaseId);
  const supplierName = new Map(reference.suppliers.map((s) => [s.id, s.name]));
  const offers = rfq
    ? compareOffers(
        rfq,
        seedState.offers.filter((o) => o.rfqId === rfq.id),
        { materials: reference.materials, suppliers: reference.suppliers, today: TODAY },
      ).sort((a, b) => a.rank - b.rank)
    : [];
  const requiredInDays = rfq ? Math.floor((Date.parse(rfq.requiredBy) - Date.parse(TODAY)) / DAY_MS) : 0;
  const maxDays = Math.max(requiredInDays, ...offers.map((o) => o.leadTimeDays), 1);
  /** What is on file in the demo, like the register at the head of a document. */
  const register: [string, number][] = [
    ["Distributors", reference.suppliers.length],
    ["Catalog materials", reference.materials.length],
    ["RFQs", seedState.rfqs.length],
    ["Offers", seedState.offers.length],
    ["Purchase orders", seedState.purchaseOrders.length],
    ["Credit cases", seedState.creditCases.length],
  ];

  return (
    <>
      <header className="bg-pine text-on-pine">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 sm:px-8">
          <span className="text-base font-semibold">Watad challenge demo</span>
          <nav aria-label="On this page" className="flex items-center gap-1 text-sm">
            {[
              ["#roles", "Roles"],
              ["#flow", "How it works"],
              ["#trust", "Why trust it"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="flex h-8 items-center rounded-md px-3 text-on-pine-muted transition-colors duration-150 hover:bg-pine-raised hover:text-on-pine focus-visible:outline-on-pine">
                {label}
              </a>
            ))}
          </nav>
          <span className="rounded-sm border border-dashed border-on-pine-muted px-2 py-1 text-xs">Sample data · simulated AI</span>
        </div>
      </header>

      <main id="main" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-4 py-10 sm:px-8 sm:py-14">
        {/* The sheet: headline and the three parties to it */}
        <section className="relative border border-line bg-surface">
          <CropMarks />
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-line px-5 py-3 font-mono text-xs text-ink-muted sm:px-8">
            <span>RFQ → offers → PO → credit</span>
            <span>Construction materials · Saudi Arabia · SAR incl. 15% VAT</span>
          </div>
          <div className="grid gap-x-12 gap-y-8 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.025em] text-ink sm:text-5xl lg:text-6xl">
                From RFQ to offers to purchase order, with credit you can trace.
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-ink-muted">
                A neutral platform for construction materials. Suppliers compete on comparable offers, an independent credit manager decides the credit cap, and every number shows the document it came from.
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 border-t border-line text-sm lg:grid-cols-1">
              {register.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3 border-b border-line py-2">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="font-mono text-xs text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div id="roles" className="scroll-mt-4 border-t border-line-strong">
            <h2 className="border-b border-line px-5 py-3 text-sm font-semibold text-ink sm:px-8">
              Enter as one of the three parties <span className="font-normal text-ink-muted">· no login, switch at any time</span>
            </h2>
            <ul className="grid md:grid-cols-3">
              {ROLES.map((r) => (
                <li key={r.role} className="border-t border-line first:border-t-0 md:border-l md:border-t-0 md:first:border-l-0">
                  <RoleLink
                    role={r.role}
                    source="landing"
                    href={r.href}
                    data-testid={`role-${r.role}`}
                    className="group flex h-full flex-col gap-2 p-5 transition-colors duration-150 hover:bg-action-soft focus-visible:-outline-offset-2 sm:p-8"
                  >
                    <span className="text-xl font-semibold text-ink">{r.label}</span>
                    <span className="text-xs text-ink-muted">as {r.persona}</span>
                    <span className="mt-2 text-sm text-ink">{r.blurb}</span>
                    <span className="mt-3 flex items-center gap-2 text-sm font-medium text-ink">
                      <span aria-hidden="true" className="size-1.5 rounded-full bg-caution-mark" />
                      {waitingFor(r.role)}
                    </span>
                    <span className="mt-auto flex h-10 items-center justify-between gap-2 self-stretch rounded-md bg-action px-4 text-sm font-medium text-on-action transition-colors duration-150 group-hover:bg-action-hover">
                      Enter as {r.label.toLowerCase()}
                      <Icon name="arrow-right" className="transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
                    </span>
                  </RoleLink>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* The flow, each step with a live specimen from the seeded data */}
        <section id="flow" aria-labelledby="flow-h" className="flex scroll-mt-4 flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
            <div>
              <h2 id="flow-h" className="text-3xl font-semibold tracking-[-0.02em] text-ink">
                One order, four steps
              </h2>
              <p className="mt-2 max-w-2xl text-base text-ink-muted">Each step below shows the app&apos;s own components on the seeded sample data, not a picture of them.</p>
            </div>
            <SampleDataLabel />
          </div>
          <div className="relative border border-line bg-surface">
            <CropMarks />
            <ol className="grid md:grid-cols-2 lg:grid-cols-4">
            <Step n={1} serial={rfq?.id ?? "RFQ"} title="Send an RFQ" lead="Upload an RFQ or pick from the catalog. Confirm quantities, specs and delivery.">
              <ul className="flex flex-col gap-2">
                {rfq?.lines.map((l) => (
                  <li key={l.id} className="flex flex-col">
                    <span className="text-ink">{l.description}</span>
                    <span className="text-xs tabular-nums text-ink-muted">
                      {l.quantity.toLocaleString("en-SA")} {UNIT_LABELS[l.unit]}
                    </span>
                  </li>
                ))}
              </ul>
              {rfq?.lines[0]?.parsedBy ? <AiLabel agent={rfq.lines[0].parsedBy.agent} className="self-start" /> : null}
              <p className="text-xs text-ink-muted">Read from the uploaded file; you review every line before it is sent.</p>
            </Step>

            <Step n={2} serial={`${offers.length} offers`} title="Compare offers" lead="Suppliers answer with price, stock, lead time and payment terms, set side by side.">
              <ul className="flex flex-col gap-3">
                {offers.map((o) => (
                  <li key={o.offerId} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-ink">{supplierName.get(o.supplierId)}</span>
                      <span className="whitespace-nowrap font-medium tabular-nums text-ink">{formatSar(o.landedCostInclVat)}</span>
                    </div>
                    <LeadTimeBar days={o.leadTimeDays} maxDays={maxDays} requiredInDays={requiredInDays} />
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-muted">Landed cost incl. delivery and VAT. The tick is the date the site needs the materials.</p>
            </Step>

            <Step n={3} serial={po?.id ?? "PO"} title="Place a PO" lead="Choose an offer, place the purchase order and follow it to site.">
              {po ? (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-ink">{supplierName.get(po.supplierId)}</span>
                    <span className="whitespace-nowrap font-medium tabular-nums text-ink">{formatSar(po.totalInclVat)}</span>
                  </div>
                  <ol className="flex flex-col gap-1.5">
                    {po.timeline.map((e) => (
                      <li key={e.status} className="flex items-center gap-2 text-ink">
                        <Icon name="check" size={14} className="shrink-0 text-positive" strokeWidth={2} />
                        <span className="capitalize">{e.status}</span>
                        <span className="ml-auto whitespace-nowrap text-xs text-ink-muted">{date.format(new Date(e.at))}</span>
                      </li>
                    ))}
                  </ol>
                  <Badge tone="positive" className="self-start">
                    Delivered to site
                  </Badge>
                </>
              ) : null}
            </Step>

            <Step n={4} serial={facility?.creditCaseId ?? "Credit"} title="Draw credit per PO" lead="Pay from an approved credit cap. The supplier is paid directly; you repay on the due date.">
              {facility ? <CreditCapMeter cap={facility.cap} drawn={facility.drawn} format={(n) => formatSar(halalas(n))} /> : null}
              {po?.creditDraw ? (
                <p className="text-xs text-ink-muted">
                  Murabaha markup {formatSar(po.creditDraw.markup)} for {po.creditDraw.tenorDays} days: {pct(po.creditDraw.profitRate)} profit rate, {pct(po.creditDraw.apr)} APR.
                </p>
              ) : null}
              {creditCase?.decision ? (
                <div className="pt-1">
                  <DecisionStamp decision="approved" by={creditCase.decision.decidedBy.split(",")[0] ?? "Credit manager"} at={date.format(new Date(creditCase.decision.decidedAt))} />
                </div>
              ) : null}
            </Step>
            </ol>
          </div>
        </section>

        {/* What makes the result trustworthy */}
        <section id="trust" aria-labelledby="trust-h" className="flex scroll-mt-4 flex-col gap-5">
          <h2 id="trust-h" className="text-3xl font-semibold tracking-[-0.02em] text-ink">
            Why trust what it shows
          </h2>
          <dl className="grid gap-x-10 gap-y-8 border-t border-line-strong pt-6 md:grid-cols-3">
            {[
              ["Neutral by construction", "The platform sells no materials and lends no money. Every supplier and every offer shows the same fields in the same order."],
              ["Reasons beside results", "A shortlist match, an offer score and a credit score each open into the factors and documents behind them."],
              ["Agents prepare, humans decide", "Simulated AI reads RFQs and credit documents and drafts a credit memo. A named credit manager approves, declines or asks for more, with reasons."],
            ].map(([term, text]) => (
              <div key={term}>
                <dt className="text-base font-semibold text-ink">{term}</dt>
                <dd className="mt-2 text-sm text-ink-muted">{text}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-6 text-sm text-ink-muted sm:px-8">
          <p className="max-w-2xl">All companies, prices and credit files in this demo are sample data. AI features are simulated and labelled where they appear.</p>
          <nav aria-label="About this demo" className="flex flex-wrap gap-x-6 gap-y-1">
            <Link href="/about" data-testid="landing-about" className="text-stamp underline decoration-stamp/35 underline-offset-[3px] hover:decoration-stamp">
              About: business model, priorities, stack, AI, assumptions
            </Link>
            <Link href="/how-we-built" data-testid="landing-how-we-built" className="text-stamp underline decoration-stamp/35 underline-offset-[3px] hover:decoration-stamp">
              How we built it
            </Link>
            <Link href="/design-system" className="text-stamp underline decoration-stamp/35 underline-offset-[3px] hover:decoration-stamp">
              Design system
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
