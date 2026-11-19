"use client";

import Link from "next/link";
import { useState } from "react";
import { AiLabel, Badge, CreditCapMeter, DecisionStamp, FactorBar, Icon, LeadTimeBar, ScoreScale, cx } from "@/components/ui";
import type { Halalas, IsoDate, Role, ScoreFactorId, Unit } from "@/domain/types";
import { common } from "@/i18n/common";
import type { Localized } from "@/i18n/core";
import { landing } from "@/i18n/landing";
import { useFormat, useLocale, useMessages } from "@/i18n/locale";
import { formatQuantity } from "@/lib/procurement/labels";

export interface ShowcaseData {
  contractor: {
    rfqId: string;
    rfqTitle: Localized;
    requiredInDays: number;
    maxDays: number;
    offers: { name: Localized; landed: number; days: number; score: number; best: boolean }[];
    cap: number;
    drawn: number;
    thisPo: number;
  };
  supplier: {
    title: Localized;
    rfqId: string;
    contractor: Localized;
    city: string;
    closesAt: IsoDate;
    lines: { name: Localized; quantity: number; unit: Unit }[];
  };
  credit: {
    applicant: Localized;
    caseId: string;
    score: number;
    factors: { id: ScoreFactorId; points: number; weight: number; noteEn: string }[];
    memoEn: string;
    decidedAt: IsoDate;
  };
}

const TABS: { role: Role; path: string }[] = [
  { role: "contractor", path: "/contractor" },
  { role: "supplier", path: "/supplier" },
  { role: "credit", path: "/credit" },
];

/**
 * The product, framed like a browser window and switchable by role. Everything
 * inside is the app's own components on the seeded sample data, not a picture.
 * The tabs only preview; the role links in the hero are the way in.
 */
export function ProductShowcase({ data }: { data: ShowcaseData }) {
  const [role, setRole] = useState<Role>("contractor");
  const m = useMessages(landing);
  const c = useMessages(common);
  const tab = TABS.find((t) => t.role === role) ?? TABS[0]!;

  return (
    <div className="relative">
      <div role="tablist" aria-label={m.showcase.tabs} className="mx-auto mb-4 flex w-fit gap-1 rounded-full border border-line bg-surface/80 p-1 shadow-card backdrop-blur">
        {TABS.map((t) => {
          const active = t.role === role;
          return (
            <button
              key={t.role}
              type="button"
              role="tab"
              id={`showcase-tab-${t.role}`}
              aria-selected={active}
              aria-controls="showcase-panel"
              onClick={() => setRole(t.role)}
              className={cx(
                "flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors duration-200",
                active ? "bg-pine-deep text-on-pine shadow-button" : "text-ink-muted hover:text-ink",
              )}
            >
              <span aria-hidden="true" className={cx("size-1.5 rounded-full", active ? "bg-glow" : "bg-line-strong")} />
              {c.roles[t.role]}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-float">
        <div className="flex items-center gap-3 border-b border-line bg-panel/70 px-4 py-2.5">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </span>
          <span dir="ltr" className="mx-auto flex min-w-0 items-center gap-1.5 truncate rounded-md bg-surface px-3 py-1 font-mono text-xs text-ink-muted">
            <Icon name="search" size={12} />
            watad-challenge.vercel.app{tab.path}
          </span>
          <span className="hidden w-12 sm:block" />
        </div>

        <div id="showcase-panel" role="tabpanel" aria-labelledby={`showcase-tab-${role}`} key={role} className="motion-safe:animate-fade p-4 sm:p-6">
          {role === "contractor" ? <ContractorView d={data.contractor} /> : role === "supplier" ? <SupplierView d={data.supplier} /> : <CreditView d={data.credit} />}
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-ink-muted">
        {m.showcase.caption}{" "}
        <Link href={tab.path} className="font-medium text-ink underline decoration-line-strong underline-offset-[3px] hover:decoration-ink">
          {m.showcase.open[role]}
        </Link>
      </p>
    </div>
  );
}

function useL() {
  const locale = useLocale();
  return (x: Localized) => x[locale];
}

function ContractorView({ d }: { d: ShowcaseData["contractor"] }) {
  const m = useMessages(landing);
  const f = useFormat();
  const L = useL();
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-ink">{m.showcase.compareOffers}</p>
          <p className="font-mono text-xs text-ink-muted">{d.rfqId}</p>
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-muted">{L(d.rfqTitle)}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {d.offers.map((o) => (
            <li key={o.name.en} className={cx("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-xl border p-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]", o.best ? "border-positive/30 bg-positive-soft/50" : "border-line")}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{L(o.name)}</p>
                <p className="text-xs tabular-nums text-ink-muted">{m.showcase.inclVat.replace("{amount}", f.money(o.landed as Halalas))}</p>
              </div>
              <div className="order-3 col-span-2 sm:order-none sm:col-span-1">
                <LeadTimeBar days={o.days} maxDays={d.maxDays} requiredInDays={d.requiredInDays} />
              </div>
              <div className="flex items-center gap-2 justify-self-end">
                {o.best ? <Badge tone="positive">{m.showcase.best}</Badge> : null}
                <span className="text-lg font-semibold tabular-nums text-ink">{o.score}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-line bg-paper p-4">
        <div>
          <p className="text-sm font-semibold text-ink">{m.showcase.payFromCap}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{m.showcase.payNote}</p>
        </div>
        <CreditCapMeter cap={d.cap} drawn={d.drawn} thisPo={d.thisPo} />
        <span aria-hidden="true" className="flex h-10 items-center justify-center rounded-lg bg-action text-sm font-semibold text-on-action shadow-button">
          {m.showcase.placePo}
        </span>
      </div>
    </div>
  );
}

function SupplierView({ d }: { d: ShowcaseData["supplier"] }) {
  const m = useMessages(landing);
  const f = useFormat();
  const locale = useLocale();
  const L = useL();
  const city = m.cities[d.city as keyof typeof m.cities] ?? d.city;
  const reasons = [m.showcase.reasonStock, m.showcase.reasonCity.replace("{city}", city), m.showcase.reasonCredit];
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">{m.showcase.matched}</p>
          <Badge tone="caution">{m.showcase.notSent}</Badge>
        </div>
        <p className="mt-2 text-lg font-semibold tracking-[-0.01em] text-ink">{L(d.title)}</p>
        <p className="text-xs text-ink-muted">
          <span className="font-mono">{d.rfqId}</span> · {L(d.contractor)} · {m.showcase.offersClose.replace("{date}", f.date(d.closesAt))}
        </p>
        <p className="mt-4 text-xs font-medium uppercase tracking-[var(--tracking-eyebrow)] text-ink-muted">{m.showcase.whyMatched}</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {reasons.map((r) => (
            <li key={r} className="flex items-start gap-2 text-sm text-ink">
              <Icon name="check" size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-positive" />
              {r}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-paper p-4">
        <p className="text-sm font-semibold text-ink">{m.showcase.requested}</p>
        <ul className="divide-y divide-line text-sm">
          {d.lines.map((l) => (
            <li key={l.name.en} className="flex items-baseline justify-between gap-3 py-1.5">
              <span className="truncate text-ink">{L(l.name)}</span>
              <span className="whitespace-nowrap tabular-nums text-ink-muted">{locale === "ar" ? `${f.number(l.quantity)} ${m.units[l.unit]}` : formatQuantity(l.quantity, l.unit)}</span>
            </li>
          ))}
        </ul>
        <span aria-hidden="true" className="mt-auto flex h-10 items-center justify-center rounded-lg bg-action text-sm font-semibold text-on-action shadow-button">
          {m.showcase.submitOffer}
        </span>
      </div>
    </div>
  );
}

function CreditView({ d }: { d: ShowcaseData["credit"] }) {
  const m = useMessages(landing);
  const f = useFormat();
  const locale = useLocale();
  const L = useL();
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-ink">{L(d.applicant)}</p>
          <p className="font-mono text-xs text-ink-muted">{d.caseId}</p>
        </div>
        <div className="mt-4">
          <ScoreScale score={d.score} size="sm" />
        </div>
        <div className="mt-5 flex flex-col gap-3">
          {d.factors.map((x) => (
            <FactorBar key={x.id} label={m.data.factors[x.id]} points={x.points} weight={x.weight} note={locale === "ar" ? undefined : x.noteEn} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-dashed border-ai-line bg-ai-soft p-4">
          <AiLabel agent={m.showcase.memoAgent} />
          <p className="mt-2 line-clamp-4 text-sm text-ink">{locale === "ar" ? m.data.memo : d.memoEn}</p>
        </div>
        <div className="flex flex-col items-start gap-2 rounded-xl border border-line bg-paper p-4">
          <p className="text-xs text-ink-muted">{m.showcase.decidedByPerson}</p>
          <DecisionStamp decision="approve" by={m.data.decidedBy} at={f.date(d.decidedAt)} />
        </div>
      </div>
    </div>
  );
}
