"use client";

import Link from "next/link";
import { useState } from "react";
import { AiLabel, Badge, CreditCapMeter, DecisionStamp, FactorBar, Icon, LeadTimeBar, ScoreScale, cx } from "@/components/ui";
import { formatSar, halalas } from "@/domain/money";
import type { Role } from "@/domain/types";

export interface ShowcaseData {
  contractor: {
    rfqId: string;
    rfqTitle: string;
    requiredInDays: number;
    maxDays: number;
    offers: { name: string; landed: number; days: number; score: number; best: boolean }[];
    cap: number;
    drawn: number;
    thisPo: number;
  };
  supplier: {
    title: string;
    rfqId: string;
    contractor: string;
    reasons: string[];
    closes: string;
    lines: { name: string; qty: string }[];
  };
  credit: {
    applicant: string;
    caseId: string;
    score: number;
    factors: { label: string; points: number; weight: number; note: string }[];
    memo: string;
    decidedBy: string;
    decidedAt: string;
  };
}

const TABS: { role: Role; label: string; path: string }[] = [
  { role: "contractor", label: "Contractor", path: "/contractor" },
  { role: "supplier", label: "Supplier", path: "/supplier" },
  { role: "credit", label: "Credit manager", path: "/credit" },
];

const money = (n: number) => formatSar(halalas(n));

/**
 * The product, framed like a browser window and switchable by role. Everything
 * inside is the app's own components on the seeded sample data, not a picture.
 * The tabs only preview; the role links in the hero are the way in.
 */
export function ProductShowcase({ data }: { data: ShowcaseData }) {
  const [role, setRole] = useState<Role>("contractor");
  const tab = TABS.find((t) => t.role === role) ?? TABS[0]!;

  return (
    <div className="relative">
      <div role="tablist" aria-label="Preview the product as" className="mx-auto mb-4 flex w-fit gap-1 rounded-full border border-line bg-surface/80 p-1 shadow-card backdrop-blur">
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
              {t.label}
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
          <span className="mx-auto flex min-w-0 items-center gap-1.5 truncate rounded-md bg-surface px-3 py-1 font-mono text-xs text-ink-muted">
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
        Live components on sample data.{" "}
        <Link href={tab.path} className="font-medium text-ink underline decoration-line-strong underline-offset-[3px] hover:decoration-ink">
          Open the {tab.label.toLowerCase()} workspace
        </Link>
      </p>
    </div>
  );
}

function ContractorView({ d }: { d: ShowcaseData["contractor"] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-ink">Compare offers</p>
          <p className="font-mono text-xs text-ink-muted">{d.rfqId}</p>
        </div>
        <p className="mt-0.5 truncate text-xs text-ink-muted">{d.rfqTitle}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {d.offers.map((o) => (
            <li key={o.name} className={cx("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-xl border p-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]", o.best ? "border-positive/30 bg-positive-soft/50" : "border-line")}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{o.name}</p>
                <p className="text-xs tabular-nums text-ink-muted">{money(o.landed)} incl. VAT</p>
              </div>
              <div className="order-3 col-span-2 sm:order-none sm:col-span-1">
                <LeadTimeBar days={o.days} maxDays={d.maxDays} requiredInDays={d.requiredInDays} />
              </div>
              <div className="flex items-center gap-2 justify-self-end">
                {o.best ? <Badge tone="positive">Best</Badge> : null}
                <span className="text-lg font-semibold tabular-nums text-ink">{o.score}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-line bg-paper p-4">
        <div>
          <p className="text-sm font-semibold text-ink">Pay from your credit cap</p>
          <p className="mt-0.5 text-xs text-ink-muted">Supplier paid directly; Murabaha markup with APR.</p>
        </div>
        <CreditCapMeter cap={d.cap} drawn={d.drawn} thisPo={d.thisPo} format={money} />
        <span aria-hidden="true" className="flex h-10 items-center justify-center rounded-lg bg-action text-sm font-semibold text-on-action shadow-button">
          Place PO
        </span>
      </div>
    </div>
  );
}

function SupplierView({ d }: { d: ShowcaseData["supplier"] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">Request matched to you</p>
          <Badge tone="caution">Offer not sent</Badge>
        </div>
        <p className="mt-2 text-lg font-semibold tracking-[-0.01em] text-ink">{d.title}</p>
        <p className="text-xs text-ink-muted">
          <span className="font-mono">{d.rfqId}</span> · {d.contractor} · offers close {d.closes}
        </p>
        <p className="mt-4 text-xs font-medium uppercase tracking-[var(--tracking-eyebrow)] text-ink-muted">Why you were matched</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {d.reasons.map((r) => (
            <li key={r} className="flex items-start gap-2 text-sm text-ink">
              <Icon name="check" size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-positive" />
              {r}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-paper p-4">
        <p className="text-sm font-semibold text-ink">Requested</p>
        <ul className="divide-y divide-line text-sm">
          {d.lines.map((l) => (
            <li key={l.name} className="flex items-baseline justify-between gap-3 py-1.5">
              <span className="truncate text-ink">{l.name}</span>
              <span className="whitespace-nowrap tabular-nums text-ink-muted">{l.qty}</span>
            </li>
          ))}
        </ul>
        <span aria-hidden="true" className="mt-auto flex h-10 items-center justify-center rounded-lg bg-action text-sm font-semibold text-on-action shadow-button">
          Submit offer
        </span>
      </div>
    </div>
  );
}

function CreditView({ d }: { d: ShowcaseData["credit"] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-ink">{d.applicant}</p>
          <p className="font-mono text-xs text-ink-muted">{d.caseId}</p>
        </div>
        <div className="mt-4">
          <ScoreScale score={d.score} size="sm" />
        </div>
        <div className="mt-5 flex flex-col gap-3">
          {d.factors.map((f) => (
            <FactorBar key={f.label} label={f.label} points={f.points} weight={f.weight} note={f.note} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-dashed border-ai-line bg-ai-soft p-4">
          <AiLabel agent="Credit memo drafter" />
          <p className="mt-2 line-clamp-4 text-sm text-ink">{d.memo}</p>
        </div>
        <div className="flex flex-col items-start gap-2 rounded-xl border border-line bg-paper p-4">
          <p className="text-xs text-ink-muted">Decided by a person, not the AI</p>
          <DecisionStamp decision="approve" by={d.decidedBy} at={d.decidedAt} />
        </div>
      </div>
    </div>
  );
}
