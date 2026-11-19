import Link from "next/link";
import type { ReactNode } from "react";
import { DateText, Money, T } from "@/components/i18n/t";
import { LocaleToggle } from "@/components/i18n/locale-toggle";
import { ProductShowcase, type ShowcaseData } from "@/components/landing/showcase";
import { RoleLink } from "@/components/role-link";
import { ROLES } from "@/components/roles";
import { AiLabel, buttonClass, CreditCapMeter, DecisionStamp, Icon, LeadTimeBar, cx, type IconName } from "@/components/ui";
import { demoPersona, reference, seedState } from "@/data";
import type { Role } from "@/domain/types";
import { COMPARISON_WEIGHTS, compareOffers } from "@/lib/procurement/comparison";
import { formatQuantity } from "@/lib/procurement/labels";
import { common } from "@/i18n/common";
import { msg, type Localized } from "@/i18n/core";
import { landing } from "@/i18n/landing";
import type { Metadata } from "next";
import { pageMetadata } from "@/i18n/meta";

export const metadata: Metadata = pageMetadata("home");

/** Fixed "today" for the seeded sample data, so the page renders the same everywhere. */
const TODAY = "2026-11-18";
const DAY_MS = 86_400_000;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

/** What is waiting for each role right now, read from the seeded data. */
function waitingFor(role: Role) {
  const { rfqs, offers, creditCases } = seedState;
  if (role === "contractor") {
    const mine = rfqs.filter((r) => r.contractorId === demoPersona.contractor && r.status !== "awarded");
    const toCompare = offers.filter((o) => o.status === "submitted" && mine.some((r) => r.id === o.rfqId)).length;
    return <T m={msg(landing, (m) => m.waiting.contractor)} values={{ rfqs: mine.length, offers: toCompare }} />;
  }
  if (role === "supplier") {
    const invited = rfqs.filter((r) => r.invitedSupplierIds.some((id) => id === demoPersona.supplier) && r.status !== "awarded").length;
    return <T m={invited === 1 ? msg(landing, (m) => m.waiting.supplierOne) : msg(landing, (m) => m.waiting.supplierMany)} values={{ n: invited }} />;
  }
  const waiting = creditCases.filter((c) => c.status === "submitted" || c.status === "documents_review" || c.status === "in_assessment").length;
  return <T m={msg(landing, (m) => m.waiting.credit)} values={{ n: waiting }} />;
}

const ROLE_ICON: Record<Role, IconName> = { contractor: "document", supplier: "truck", credit: "check" };
const SAUDI_DOCUMENTS = ["cr", "vat", "zakat", "simah", "qawaem", "bank", "gosi", "classification"] as const;

function BentoCard({ n, title, lead, className, dark = false, children }: { n: number; title: Localized; lead: Localized; className?: string; dark?: boolean; children: ReactNode }) {
  return (
    <li
      className={cx(
        "group flex flex-col gap-5 overflow-hidden rounded-2xl border p-6 transition-[transform,box-shadow] duration-300 ease-out motion-safe:hover:-translate-y-0.5 sm:p-7",
        dark ? "border-pine-raised bg-pine-deep text-on-pine shadow-raised" : "border-line bg-surface shadow-card hover:shadow-raised",
        className,
      )}
    >
      <div>
        <p dir="ltr" className={cx("font-mono text-xs rtl:text-end", dark ? "text-on-pine-muted" : "text-ink-muted")}><T m={msg(landing, (m) => m.how.step)} values={{ n: String(n).padStart(2, "0") }} /></p>
        <h3 className={cx("mt-3 text-2xl font-semibold tracking-[var(--tracking-heading)]", dark ? "text-on-pine" : "text-ink")}>
          <T m={title} />
        </h3>
        <p className={cx("mt-1.5 max-w-md text-sm", dark ? "text-on-pine-muted" : "text-ink-muted")}>
          <T m={lead} />
        </p>
      </div>
      <div className={cx("mt-auto rounded-xl p-4 text-sm", dark ? "bg-surface text-ink" : "bg-paper")}>{children}</div>
    </li>
  );
}

const accent = "font-serif font-normal italic";

export default function Home() {
  const rfq = seedState.rfqs.find((r) => r.id === "rfq_1042")!;
  const po = seedState.purchaseOrders[0];
  const facility = seedState.creditFacilities.find((f) => f.contractorId === demoPersona.contractor);
  const creditCase = seedState.creditCases.find((c) => c.id === facility?.creditCaseId);
  const supplierName = new Map(reference.suppliers.map((s) => [s.id, { en: s.name, ar: s.nameAr ?? s.name }]));
  const contractorName = (id: string | undefined): Localized => {
    const c = reference.contractors.find((x) => x.id === id);
    return { en: c?.name ?? "", ar: c?.nameAr ?? c?.name ?? "" };
  };
  const materialName = (id: string, fallback: string): Localized => {
    const mat = reference.materials.find((x) => x.id === id);
    return { en: fallback, ar: mat?.nameAr ?? fallback };
  };
  const title = (id: string, en: string): Localized => {
    const t = landing.ar.data.titles as Record<string, string>;
    return { en, ar: t[id] ?? en };
  };
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
      rfqTitle: title(rfq.id, rfq.title),
      requiredInDays,
      maxDays,
      offers: offers.map((o) => ({ name: supplierName.get(o.supplierId) ?? { en: o.supplierId, ar: o.supplierId }, landed: o.landedCostInclVat, days: o.leadTimeDays, score: Math.round(o.score), best: o.rank === 1 })),
      cap: facility?.cap ?? 0,
      drawn: facility?.drawn ?? 0,
      thisPo: offers[0]?.landedCostInclVat ?? 0,
    },
    supplier: {
      title: title(supplierRfq.id, supplierRfq.title),
      rfqId: supplierRfq.id,
      contractor: contractorName(supplierRfq.contractorId),
      city: supplierRfq.deliveryCity,
      closesAt: supplierRfq.closesAt,
      lines: supplierRfq.lines.map((l) => ({ name: materialName(l.materialId, l.description), quantity: l.quantity, unit: l.unit })),
    },
    credit: {
      applicant: contractorName(creditCase?.contractorId),
      caseId: creditCase?.id ?? "",
      score: creditCase?.scorecard?.total ?? 0,
      factors: [...factors]
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 3)
        .map((f) => ({ id: f.id, points: f.points, weight: f.weight, noteEn: f.rationale })),
      memoEn: creditCase?.aiProposal?.memo.replace(/[#*_`>]/g, "").replace(/\s+/g, " ").trim() ?? "",
      decidedAt: creditCase?.decision?.decidedAt ?? TODAY,
    },
  };

  const stats: [string, Localized][] = [
    [String(Object.keys(COMPARISON_WEIGHTS).length), msg(landing, (m) => m.stats.factors)],
    [String(SAUDI_DOCUMENTS.length), msg(landing, (m) => m.stats.documents)],
    [String(factors.length), msg(landing, (m) => m.stats.creditFactors)],
    ["1", msg(landing, (m) => m.stats.perPo)],
  ];

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-[-0.01em] text-ink">
            <span aria-hidden="true" className="grid size-7 place-items-center rounded-lg bg-pine-deep text-on-pine shadow-button">
              <Icon name="arrow-right" size={14} strokeWidth={2} className="-rotate-45 rtl:rotate-45" />
            </span>
            <T m={msg(common, (m) => m.product)} />
          </Link>
          <nav aria-label="On this page" className="hidden items-center gap-1 text-sm md:flex">
            {(
            [
              ["#product", msg(landing, (m) => m.nav.product)],
              ["#how", msg(landing, (m) => m.nav.how)],
              ["#trust", msg(landing, (m) => m.nav.trust)],
              ["/about", msg(landing, (m) => m.nav.about)],
            ] as [string, Localized][]).map(([href, label]) => (
              <a key={href} href={href} className="rounded-md px-3 py-1.5 text-ink-muted transition-colors duration-150 hover:bg-surface hover:text-ink">
                <T m={label} />
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <LocaleToggle />
            <a href="#roles" className={buttonClass("primary", "sm", "rounded-full px-4")}>
              <T m={msg(landing, (m) => m.cta.tryDemo)} />
            </a>
          </div>
        </div>
      </header>

      <main id="main" className="flex flex-1 flex-col">
        {/* Hero: one bold line, the way in, then the product itself */}
        <section className="relative isolate overflow-hidden px-4 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-line)_1px,transparent_1px)] bg-[size:56px_56px] opacity-60 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_25%,black,transparent)]" />
            <div className="absolute start-1/2 top-[-14rem] h-[36rem] w-[60rem] -translate-x-1/2 rtl:translate-x-1/2 rounded-full bg-glow/45 blur-3xl motion-safe:animate-drift" />
            <div className="absolute end-[-12rem] top-[16rem] h-[24rem] w-[30rem] rounded-full bg-glow-warm/60 blur-3xl motion-safe:animate-drift motion-safe:[animation-delay:-7s]" />
          </div>

          <div className="mx-auto flex max-w-6xl flex-col items-center text-center">
            <h1 className="max-w-5xl text-5xl font-semibold tracking-[var(--tracking-display)] text-ink motion-safe:animate-rise motion-safe:[animation-delay:80ms] sm:text-6xl lg:text-7xl">
              <T m={msg(landing, (m) => m.hero.title)} />
              <span className={cx("block text-action", accent)}><T m={msg(landing, (m) => m.hero.accent)} /></span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-muted motion-safe:animate-rise motion-safe:[animation-delay:160ms] sm:text-xl">
              <T m={msg(landing, (m) => m.hero.lead)} />
            </p>

            <div id="roles" className="mt-10 w-full max-w-4xl scroll-mt-24 motion-safe:animate-rise motion-safe:[animation-delay:240ms]">
              <p className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm text-ink-muted">
                <span className="rounded-full border border-dashed border-line-control px-2.5 py-0.5 text-xs font-medium text-ink-muted"><T m={msg(common, (m) => m.sampleData)} /></span>
                <T m={msg(landing, (m) => m.hero.enterLine)} />
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
                        <span className="grid size-8 place-items-center rounded-full bg-pine-deep text-on-pine transition-transform duration-200 ease-out group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                          <Icon name="arrow-right" size={14} strokeWidth={2} />
                        </span>
                      </span>
                      <span>
                        <span className="block text-lg font-semibold tracking-[var(--tracking-heading)] text-ink">
                          <T m={msg(landing, (m) => m.hero.enterAs[r.role])} />
                        </span>
                        <span className="block text-xs text-ink-muted">
                          <T m={msg(landing, (m) => m.hero.asPersona)} values={{ persona: <T m={msg(common, (m) => m.personas[r.role])} /> }} />
                        </span>
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
        <section aria-label="Saudi documents" className="border-y border-line bg-surface/70">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-6 sm:px-8">
            <span className="font-mono text-xs uppercase tracking-[var(--tracking-eyebrow)] text-ink-muted"><T m={msg(landing, (m) => m.strip.title)} /></span>
            {SAUDI_DOCUMENTS.map((d) => (
              <span key={d} className="text-sm font-semibold text-ink-subtle">
                <T m={msg(landing, (m) => m.strip.docs[d])} />
              </span>
            ))}
          </div>
        </section>

        {/* Numbers */}
        <section aria-label="In numbers" className="px-4 py-16 sm:px-8 sm:py-20">
          <dl className="mx-auto grid max-w-6xl gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(([n, label]) => (
              <div key={label.en} className="flex flex-col border-t border-ink pt-5">
                <dt className="order-2 mt-2 max-w-[16rem] text-sm text-ink-muted">
                  <T m={label} />
                </dt>
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
                <T m={msg(landing, (m) => m.how.title)} />
                <span className="text-action"> <T m={msg(landing, (m) => m.how.accent)} /></span>
              </h2>
              <p className="max-w-2xl text-lg text-ink-muted"><T m={msg(landing, (m) => m.how.lead)} /></p>
            </div>
            <ol className="grid gap-4 lg:grid-cols-6">
              <BentoCard n={1} title={msg(landing, (m) => m.how.rfqTitle)} lead={msg(landing, (m) => m.how.rfqLead)} className="lg:col-span-3">
                <ul className="flex flex-col gap-2">
                  {rfq.lines.map((l) => (
                    <li key={l.id} className="flex items-baseline justify-between gap-3">
                      <span className="text-ink">
                        <T m={materialName(l.materialId, l.description)} />
                      </span>
                      <span className="whitespace-nowrap tabular-nums text-ink-muted">
                        <T m={{ en: formatQuantity(l.quantity, l.unit), ar: `${l.quantity.toLocaleString("en-US")} ${landing.ar.units[l.unit]}` }} />
                      </span>
                    </li>
                  ))}
                </ul>
                {rfq.lines[0]?.parsedBy ? <AiLabel agent={<T m={msg(landing, (m) => m.data.boqReader)} />} className="mt-3" /> : null}
              </BentoCard>

              <BentoCard n={2} title={msg(landing, (m) => m.how.offersTitle)} lead={msg(landing, (m) => m.how.offersLead)} className="lg:col-span-3">
                <ul className="flex flex-col gap-3">
                  {offers.map((o) => (
                    <li key={o.offerId} className="flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-ink"><T m={supplierName.get(o.supplierId) ?? { en: o.supplierId, ar: o.supplierId }} /></span>
                        <span className="whitespace-nowrap font-medium tabular-nums text-ink"><Money h={o.landedCostInclVat} /></span>
                      </div>
                      <LeadTimeBar days={o.leadTimeDays} maxDays={maxDays} requiredInDays={requiredInDays} />
                    </li>
                  ))}
                </ul>
              </BentoCard>

              <BentoCard n={3} title={msg(landing, (m) => m.how.poTitle)} lead={msg(landing, (m) => m.how.poLead)} className="lg:col-span-2">
                {po ? (
                  <ol className="flex flex-col gap-1.5">
                    {po.timeline.map((e) => (
                      <li key={e.status} className="flex items-center gap-2 text-ink">
                        <Icon name="check" size={14} className="shrink-0 text-positive" strokeWidth={2} />
                        <span>{e.status in landing.en.how.poStatus ? <T m={msg(landing, (m) => m.how.poStatus[e.status as "placed" | "confirmed" | "dispatched" | "delivered"])} /> : e.status}</span>
                        <span className="ms-auto whitespace-nowrap text-xs text-ink-muted">
                          <DateText iso={e.at} />
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </BentoCard>

              <BentoCard n={4} dark title={msg(landing, (m) => m.how.creditTitle)} lead={msg(landing, (m) => m.how.creditLead)} className="lg:col-span-4">
                <div className="grid gap-5 sm:grid-cols-[minmax(0,1.4fr)_auto] sm:items-end">
                  <div className="flex flex-col gap-3">
                    {facility ? <CreditCapMeter cap={facility.cap} drawn={facility.drawn} /> : null}
                    {po?.creditDraw ? (
                      <p className="text-xs text-ink-muted">
                        <T m={msg(landing, (m) => m.how.markup)} values={{ markup: <Money h={po.creditDraw.markup} />, days: po.creditDraw.tenorDays, rate: pct(po.creditDraw.profitRate), apr: pct(po.creditDraw.apr) }} />
                      </p>
                    ) : null}
                  </div>
                  {creditCase?.decision ? <DecisionStamp decision="approve" by={<T m={msg(landing, (m) => m.data.decidedBy)} />} at={<DateText iso={creditCase.decision.decidedAt} />} /> : null}
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
                <T m={msg(landing, (m) => m.trust.title)} />
                <span className="text-glow"> <T m={msg(landing, (m) => m.trust.accent)} /></span>
              </h2>
              <p className="max-w-2xl text-lg text-on-pine-muted"><T m={msg(landing, (m) => m.trust.lead)} /></p>
            </div>
            <ul className="grid gap-4 md:grid-cols-3">
              {(
                [
                  [msg(landing, (m) => m.trust.neutralTitle), msg(landing, (m) => m.trust.neutralText), "info"],
                  [msg(landing, (m) => m.trust.reasonsTitle), msg(landing, (m) => m.trust.reasonsText), "search"],
                  [msg(landing, (m) => m.trust.peopleTitle), msg(landing, (m) => m.trust.peopleText), "check"],
                 ] as [Localized, Localized, IconName][]
              ).map(([title, text, icon]) => (
                <li key={title.en} className="flex flex-col gap-4 rounded-2xl border border-on-pine/10 bg-pine/60 p-6 transition-colors duration-200 hover:border-on-pine/25">
                  <h3 className="flex items-center gap-2.5 text-lg font-semibold tracking-[-0.015em] text-on-pine">
                    <Icon name={icon} className="shrink-0 text-glow" />
                    <T m={title} />
                  </h3>
                  <p className="text-sm text-on-pine-muted">
                    <T m={text} />
                  </p>
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
              <T m={msg(landing, (m) => m.close.title)} />
              <span className="text-action"> <T m={msg(landing, (m) => m.close.accent)} /></span>
            </h2>
            <p className="max-w-xl text-lg text-ink-muted"><T m={msg(landing, (m) => m.close.lead)} /></p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/contractor" className={buttonClass("primary", "lg", "rounded-full")}>
                <T m={msg(landing, (m) => m.close.start)} />
                <Icon name="arrow-right" />
              </Link>
              <Link href="/supplier" className={buttonClass("secondary", "lg", "rounded-full")}>
                <T m={msg(common, (m) => m.roles.supplier)} />
              </Link>
              <Link href="/credit" className={buttonClass("secondary", "lg", "rounded-full")}>
                <T m={msg(common, (m) => m.roles.credit)} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-x-10 gap-y-6 px-4 py-10 text-sm sm:px-8">
          <div className="max-w-md">
            <p className="font-semibold text-ink"><T m={msg(common, (m) => m.product)} /></p>
            <p className="mt-1 text-ink-muted"><T m={msg(landing, (m) => m.footer.note)} /></p>
          </div>
          <nav aria-label="About this demo" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/about" data-testid="landing-about" className="font-medium text-ink underline decoration-line-strong underline-offset-[3px] hover:decoration-ink">
              <T m={msg(landing, (m) => m.footer.about)} />
            </Link>
            <Link href="/how-we-built" data-testid="landing-how-we-built" className="font-medium text-ink underline decoration-line-strong underline-offset-[3px] hover:decoration-ink">
              <T m={msg(landing, (m) => m.footer.how)} />
            </Link>
            <Link href="/design-system" className="text-ink-muted underline decoration-line-strong underline-offset-[3px] hover:text-ink">
              <T m={msg(landing, (m) => m.footer.designSystem)} />
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
