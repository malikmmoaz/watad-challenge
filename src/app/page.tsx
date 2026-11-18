import Link from "next/link";
import type { ReactNode } from "react";
import { ProductShowcase, type ShowcaseData } from "@/components/landing/showcase";
import { RoleLink } from "@/components/role-link";
import { ROLES } from "@/components/role-nav";
import { AiLabel, buttonClass, CreditCapMeter, DecisionStamp, Icon, LeadTimeBar, cx, type IconName } from "@/components/ui";
import { demoPersona, reference, seedState } from "@/data";
import { formatSar, halalas } from "@/domain/money";
import type { Role } from "@/domain/types";
import { COMPARISON_WEIGHTS, compareOffers } from "@/lib/procurement/comparison";
import { UNIT_LABELS } from "@/lib/procurement/labels";

/** Fixed "today" for the seeded sample data, so the page renders the same everywhere. */
const TODAY = "2026-11-18";
const DAY_MS = 86_400_000;
const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const money = (n: number) => formatSar(halalas(n));

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
  return `${waiting} applications waiting for a decision`;
}

const ROLE_ICON: Record<Role, IconName> = { contractor: "document", supplier: "truck", credit: "check" };
const SAUDI_DOCUMENTS = ["CR", "ZATCA VAT", "Zakat", "SIMAH", "Qawaem", "Bank statements", "GOSI", "Classification"];

function BentoCard({ n, title, lead, className, dark = false, children }: { n: number; title: string; lead: string; className?: string; dark?: boolean; children: ReactNode }) {
  return (
    <li
      className={cx(
        "group flex flex-col gap-5 overflow-hidden rounded-2xl border p-6 transition-[transform,box-shadow] duration-300 ease-out motion-safe:hover:-translate-y-0.5 sm:p-7",
        dark ? "border-pine-raised bg-pine-deep text-on-pine shadow-raised" : "border-line bg-surface shadow-card hover:shadow-raised",
        className,
      )}
    >
      <div>
        <p className={cx("font-mono text-xs", dark ? "text-on-pine-muted" : "text-ink-muted")}>[ {String(n).padStart(2, "0")} / 04 ]</p>
        <h3 className={cx("mt-3 text-2xl font-semibold tracking-[-0.025em]", dark ? "text-on-pine" : "text-ink")}>{title}</h3>
        <p className={cx("mt-1.5 max-w-md text-sm", dark ? "text-on-pine-muted" : "text-ink-muted")}>{lead}</p>
      </div>
      <div className={cx("mt-auto rounded-xl p-4 text-sm", dark ? "bg-surface text-ink" : "bg-paper")}>{children}</div>
    </li>
  );
}

const accent = "font-serif font-normal italic tracking-[-0.01em]";

export default function Home() {
  const rfq = seedState.rfqs.find((r) => r.id === "rfq_1042")!;
  const po = seedState.purchaseOrders[0];
  const facility = seedState.creditFacilities.find((f) => f.contractorId === demoPersona.contractor);
  const creditCase = seedState.creditCases.find((c) => c.id === facility?.creditCaseId);
  const supplierName = new Map(reference.suppliers.map((s) => [s.id, s.name]));
  const offers = compareOffers(rfq, seedState.offers.filter((o) => o.rfqId === rfq.id), {
    materials: reference.materials,
    suppliers: reference.suppliers,
    today: TODAY,
  }).sort((a, b) => a.rank - b.rank);
  const requiredInDays = Math.floor((Date.parse(rfq.requiredBy) - Date.parse(TODAY)) / DAY_MS);
  const maxDays = Math.max(requiredInDays, ...offers.map((o) => o.leadTimeDays), 1);
  const supplierRfq = seedState.rfqs.find((r) => r.invitedSupplierIds.some((id) => id === demoPersona.supplier) && r.status !== "awarded") ?? rfq;
  const factors = creditCase?.scorecard?.factors ?? [];

  const showcase: ShowcaseData = {
    contractor: {
      rfqId: rfq.id,
      rfqTitle: rfq.title,
      requiredInDays,
      maxDays,
      offers: offers.map((o) => ({ name: supplierName.get(o.supplierId) ?? o.supplierId, landed: o.landedCostInclVat, days: o.leadTimeDays, score: Math.round(o.score), best: o.rank === 1 })),
      cap: facility?.cap ?? 0,
      drawn: facility?.drawn ?? 0,
      thisPo: offers[0]?.landedCostInclVat ?? 0,
    },
    supplier: {
      title: supplierRfq.title,
      rfqId: supplierRfq.id,
      contractor: reference.contractors.find((c) => c.id === supplierRfq.contractorId)?.name ?? "",
      reasons: ["You stock rebar, steel and cement", `You deliver to ${supplierRfq.deliveryCity}`, "Paid directly from the contractor's credit cap"],
      closes: date.format(new Date(supplierRfq.closesAt)),
      lines: supplierRfq.lines.map((l) => ({ name: l.description, qty: `${l.quantity.toLocaleString("en-SA")} ${UNIT_LABELS[l.unit]}` })),
    },
    credit: {
      applicant: reference.contractors.find((c) => c.id === creditCase?.contractorId)?.name ?? "",
      caseId: creditCase?.id ?? "",
      score: creditCase?.scorecard?.total ?? 0,
      factors: [...factors]
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 3)
        .map((f) => ({ label: f.label, points: f.points, weight: f.weight, note: f.rationale })),
      memo: creditCase?.aiProposal?.memo.replace(/[#*_`>]/g, "").replace(/\s+/g, " ").trim() ?? "",
      decidedBy: creditCase?.decision?.decidedBy.split(",")[0] ?? "Credit manager",
      decidedAt: creditCase?.decision ? date.format(new Date(creditCase.decision.decidedAt)) : "",
    },
  };

  const stats: [string, string][] = [
    [String(Object.keys(COMPARISON_WEIGHTS).length), "factors behind every offer score, each one shown"],
    [String(SAUDI_DOCUMENTS.length), "Saudi documents read for each credit file"],
    [String(factors.length), "credit factors, each tied to the document it came from"],
    ["1", "PO at a time drawn from the credit cap, supplier paid directly"],
  ];

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-[-0.01em] text-ink">
            <span aria-hidden="true" className="grid size-7 place-items-center rounded-lg bg-pine-deep text-on-pine shadow-button">
              <Icon name="arrow-right" size={14} strokeWidth={2} className="-rotate-45" />
            </span>
            Watad challenge demo
          </Link>
          <nav aria-label="On this page" className="hidden items-center gap-1 text-sm md:flex">
            {[
              ["#product", "Product"],
              ["#how", "How it works"],
              ["#trust", "Why trust it"],
              ["/about", "About"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-md px-3 py-1.5 text-ink-muted transition-colors duration-150 hover:bg-surface hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a href="#roles" className={buttonClass("primary", "sm", "rounded-full px-4")}>
              Try the demo
            </a>
          </div>
        </div>
      </header>

      <main id="main" className="flex flex-1 flex-col">
        {/* Hero: one bold line, the way in, then the product itself */}
        <section className="relative isolate overflow-hidden px-4 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-line)_1px,transparent_1px)] bg-[size:56px_56px] opacity-60 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_25%,black,transparent)]" />
            <div className="absolute left-1/2 top-[-14rem] h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-glow/45 blur-3xl motion-safe:animate-drift" />
            <div className="absolute right-[-12rem] top-[16rem] h-[24rem] w-[30rem] rounded-full bg-glow-warm/60 blur-3xl motion-safe:animate-drift motion-safe:[animation-delay:-7s]" />
          </div>

          <div className="mx-auto flex max-w-6xl flex-col items-center text-center">
            <h1 className="max-w-5xl text-5xl font-semibold tracking-[var(--tracking-display)] text-ink motion-safe:animate-rise motion-safe:[animation-delay:80ms] sm:text-6xl lg:text-7xl">
              From RFQ to paid PO,
              <span className={cx("block text-action", accent)}>with credit you can trace.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-muted motion-safe:animate-rise motion-safe:[animation-delay:160ms] sm:text-xl">
              A neutral platform for construction materials. Suppliers compete on comparable offers, an independent credit manager sets the credit cap, and every number shows the document behind it.
            </p>

            <div id="roles" className="mt-10 w-full max-w-4xl scroll-mt-24 motion-safe:animate-rise motion-safe:[animation-delay:240ms]">
              <p className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm text-ink-muted">
                <span className="rounded-full border border-dashed border-line-control px-2.5 py-0.5 text-xs font-medium text-ink-muted">Sample data · simulated AI</span>
                Enter as one of the three parties. No login; switch at any time.
              </p>
              <ul className="grid gap-3 sm:grid-cols-3">
                {ROLES.map((r) => (
                  <li key={r.role}>
                    <RoleLink
                      role={r.role}
                      source="landing"
                      href={r.href}
                      data-testid={`role-${r.role}`}
                      className="group flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-5 text-left shadow-card transition-[transform,box-shadow,border-color] duration-200 ease-out hover:border-action/40 hover:shadow-raised motion-safe:hover:-translate-y-0.5"
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="grid size-9 place-items-center rounded-lg bg-action-soft text-action">
                          <Icon name={ROLE_ICON[r.role]} />
                        </span>
                        <span className="grid size-8 place-items-center rounded-full bg-pine-deep text-on-pine transition-transform duration-200 ease-out group-hover:translate-x-0.5">
                          <Icon name="arrow-right" size={14} strokeWidth={2} />
                        </span>
                      </span>
                      <span>
                        <span className="block text-lg font-semibold tracking-[-0.015em] text-ink">Enter as {r.label.toLowerCase()}</span>
                        <span className="block text-xs text-ink-muted">as {r.persona}</span>
                      </span>
                      <span className="mt-auto flex items-center gap-2 text-sm font-medium text-ink">
                        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-caution-mark" />
                        {waitingFor(r.role)}
                      </span>
                    </RoleLink>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div id="product" className="mx-auto mt-16 max-w-5xl scroll-mt-24 motion-safe:animate-rise motion-safe:[animation-delay:360ms] sm:mt-20">
            <ProductShowcase data={showcase} />
          </div>
        </section>

        {/* What it runs on: the Saudi paper trail */}
        <section aria-label="What the platform reads" className="border-y border-line bg-surface/70">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-6 sm:px-8">
            <span className="font-mono text-xs uppercase tracking-[var(--tracking-eyebrow)] text-ink-muted">Reads the Saudi paper trail</span>
            {SAUDI_DOCUMENTS.map((d) => (
              <span key={d} className="text-sm font-semibold tracking-[-0.01em] text-ink-subtle">
                {d}
              </span>
            ))}
          </div>
        </section>

        {/* Numbers */}
        <section aria-label="In numbers" className="px-4 py-16 sm:px-8 sm:py-20">
          <dl className="mx-auto grid max-w-6xl gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(([n, label]) => (
              <div key={label} className="flex flex-col border-t border-ink pt-5">
                <dt className="order-2 mt-2 max-w-[16rem] text-sm text-ink-muted">{label}</dt>
                <dd className="order-1 text-6xl font-semibold tracking-[var(--tracking-display)] text-ink">{n}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* The flow as a bento of live specimens */}
        <section id="how" aria-labelledby="how-h" className="scroll-mt-20 px-4 pb-20 sm:px-8 sm:pb-28">
          <div className="mx-auto flex max-w-6xl flex-col gap-10">
            <div className="flex flex-col gap-4">
              <h2 id="how-h" className="max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-ink sm:text-5xl">
                One order, four steps,
                <span className="text-action"> nothing hidden.</span>
              </h2>
              <p className="max-w-2xl text-lg text-ink-muted">Every step below is the app&apos;s own component on the sample data, not a screenshot.</p>
            </div>
            <ol className="grid gap-4 lg:grid-cols-6">
              <BentoCard n={1} title="Send an RFQ" lead="Upload an RFQ or pick from the catalog. Simulated AI reads the file; you confirm every line." className="lg:col-span-3">
                <ul className="flex flex-col gap-2">
                  {rfq.lines.map((l) => (
                    <li key={l.id} className="flex items-baseline justify-between gap-3">
                      <span className="text-ink">{l.description}</span>
                      <span className="whitespace-nowrap tabular-nums text-ink-muted">
                        {l.quantity.toLocaleString("en-SA")} {UNIT_LABELS[l.unit]}
                      </span>
                    </li>
                  ))}
                </ul>
                {rfq.lines[0]?.parsedBy ? <AiLabel agent={rfq.lines[0].parsedBy.agent} className="mt-3" /> : null}
              </BentoCard>

              <BentoCard n={2} title="Compare offers" lead="Price, stock, lead time and payment terms side by side, scored on six factors you can open." className="lg:col-span-3">
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
              </BentoCard>

              <BentoCard n={3} title="Place a PO" lead="Choose an offer, place the purchase order and follow it to site." className="lg:col-span-2">
                {po ? (
                  <ol className="flex flex-col gap-1.5">
                    {po.timeline.map((e) => (
                      <li key={e.status} className="flex items-center gap-2 text-ink">
                        <Icon name="check" size={14} className="shrink-0 text-positive" strokeWidth={2} />
                        <span className="capitalize">{e.status}</span>
                        <span className="ml-auto whitespace-nowrap text-xs text-ink-muted">{date.format(new Date(e.at))}</span>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </BentoCard>

              <BentoCard n={4} dark title="Draw credit per PO" lead="Pay from an approved credit cap. The supplier is paid directly; you repay cost plus a Murabaha markup on the due date." className="lg:col-span-4">
                <div className="grid gap-5 sm:grid-cols-[minmax(0,1.4fr)_auto] sm:items-end">
                  <div className="flex flex-col gap-3">
                    {facility ? <CreditCapMeter cap={facility.cap} drawn={facility.drawn} format={money} /> : null}
                    {po?.creditDraw ? (
                      <p className="text-xs text-ink-muted">
                        Markup {formatSar(po.creditDraw.markup)} for {po.creditDraw.tenorDays} days: {pct(po.creditDraw.profitRate)} profit rate, {pct(po.creditDraw.apr)} APR.
                      </p>
                    ) : null}
                  </div>
                  {creditCase?.decision ? <DecisionStamp decision="approve" by={creditCase.decision.decidedBy.split(",")[0] ?? "Credit manager"} at={date.format(new Date(creditCase.decision.decidedAt))} /> : null}
                </div>
              </BentoCard>
            </ol>
          </div>
        </section>

        {/* Trust, in the dark */}
        <section id="trust" aria-labelledby="trust-h" className="relative isolate scroll-mt-20 overflow-hidden bg-pine-deep px-4 py-20 text-on-pine sm:px-8 sm:py-28">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 -z-10 h-80 w-[50rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-glow/20 blur-3xl" />
          <div className="mx-auto flex max-w-6xl flex-col gap-12">
            <div className="flex flex-col gap-4">
              <h2 id="trust-h" className="max-w-3xl text-4xl font-semibold tracking-[-0.035em] text-on-pine sm:text-5xl">
                Agents prepare.
                <span className="text-glow"> Humans decide.</span>
              </h2>
              <p className="max-w-2xl text-lg text-on-pine-muted">The platform sells no materials and lends no money. It shows its reasons, and a named person signs every credit decision.</p>
            </div>
            <ul className="grid gap-4 md:grid-cols-3">
              {(
                [
                  ["Neutral by construction", "Every supplier and every offer shows the same fields in the same order. No one is favoured by the layout.", "info"],
                  ["Reasons beside results", "A shortlist match, an offer score and a credit score each open into the factors and documents behind them.", "search"],
                  ["People sign decisions", "Simulated AI reads documents and drafts the memo. An independent credit manager approves, declines or asks for more.", "check"],
                ] as [string, string, IconName][]
              ).map(([title, text, icon]) => (
                <li key={title} className="flex flex-col gap-4 rounded-2xl border border-on-pine/10 bg-pine/60 p-6 transition-colors duration-200 hover:border-on-pine/25">
                  <h3 className="flex items-center gap-2.5 text-lg font-semibold tracking-[-0.015em] text-on-pine">
                    <Icon name={icon} className="shrink-0 text-glow" />
                    {title}
                  </h3>
                  <p className="text-sm text-on-pine-muted">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Closing call */}
        <section aria-labelledby="close-h" className="relative isolate overflow-hidden px-4 py-20 sm:px-8 sm:py-28">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[28rem] w-[56rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-glow/30 blur-3xl" />
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <h2 id="close-h" className="text-4xl font-semibold tracking-[-0.035em] text-ink sm:text-5xl">
              See one order from
              <span className="text-action"> all three sides.</span>
            </h2>
            <p className="max-w-xl text-lg text-ink-muted">Start as the contractor, answer as the supplier, decide as the credit manager. The demo keeps one shared state.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/contractor" className={buttonClass("primary", "lg", "rounded-full")}>
                Start as contractor
                <Icon name="arrow-right" />
              </Link>
              <Link href="/supplier" className={buttonClass("secondary", "lg", "rounded-full")}>
                Supplier
              </Link>
              <Link href="/credit" className={buttonClass("secondary", "lg", "rounded-full")}>
                Credit manager
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-x-10 gap-y-6 px-4 py-10 text-sm sm:px-8">
          <div className="max-w-md">
            <p className="font-semibold text-ink">Watad challenge demo</p>
            <p className="mt-1 text-ink-muted">All companies, prices and credit files are sample data. AI features are simulated and labelled where they appear.</p>
          </div>
          <nav aria-label="About this demo" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/about" data-testid="landing-about" className="font-medium text-ink underline decoration-line-strong underline-offset-[3px] hover:decoration-ink">
              About this demo
            </Link>
            <Link href="/how-we-built" data-testid="landing-how-we-built" className="font-medium text-ink underline decoration-line-strong underline-offset-[3px] hover:decoration-ink">
              How we built it
            </Link>
            <Link href="/design-system" className="text-ink-muted underline decoration-line-strong underline-offset-[3px] hover:text-ink">
              Design system
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
