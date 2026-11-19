"use client";

import { useMemo } from "react";
import { annotate, monthlyCashflow, type CashflowAnnotation } from "@/domain/credit/cashflow";
import type { CreditProfile } from "@/domain/credit/types";
import { sar } from "@/domain/money";
import type { CreditDocument } from "@/domain/types";
import { fill } from "@/i18n/core";
import { credit } from "@/i18n/credit";
import { useFormat, useLocale, useMessages } from "@/i18n/locale";
import { AiLabel, EvidenceSeal, Panel } from "@/components/ui";

const W = 720;
const H = 300;
const PAD = { top: 28, right: 16, bottom: 34, left: 52 };

/** Short month names in the reader's language; Latin digits, Gregorian calendar (the Saudi finance-tool norm). */
const monthName = (ym: string, locale: "en" | "ar", withYear = false) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" }).format(new Date(`${ym}-01T00:00:00Z`));

/**
 * Twelve months of cash flow from the bank statements: inflow and outflow bars,
 * the closing balance as a line, and numbered simulated-AI notes pinned to
 * months, each linking to the bank-statement evidence. The time axis runs left
 * to right in both languages, with Latin digits. Fixed aspect ratio, so the
 * page never shifts; the data is also available as a table.
 */
export function CashflowChart({ profile, asOf, seed, documents }: { profile: CreditProfile; asOf: string; seed: string; documents: CreditDocument[] }) {
  const all = useMessages(credit);
  const m = all.cashflow;
  const f = useFormat();
  const locale = useLocale();
  const months = useMemo(() => monthlyCashflow(profile, asOf, seed), [profile, asOf, seed]);
  const notes = useMemo(() => annotate(months, profile.bank?.negativeBalanceDays ?? 0), [months, profile.bank?.negativeBalanceDays]);
  if (months.length !== 12) return null;

  const bankDoc = documents.find((d) => d.type === "bank_statements");
  const evidenceHref = (field: CashflowAnnotation["evidenceField"]) => {
    const key = bankDoc?.extracted.find((x) => x.key === field)?.key ?? bankDoc?.extracted[0]?.key;
    return bankDoc && key ? `#${bankDoc.id}-${key}` : undefined;
  };

  // Round tick steps (1, 2 or 5 x 10^n) so the axis reads cleanly.
  const rawTop = Math.max(...months.flatMap((x) => [x.inflowSar, x.outflowSar, x.closingSar]));
  const rawBottom = Math.min(0, ...months.map((x) => x.closingSar));
  const rough = (rawTop - rawBottom) / 4 || 1;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((k) => k * mag).find((v) => v >= rough)!;
  const bottom = Math.floor(rawBottom / step) * step;
  const top = Math.ceil(rawTop / step) * step;
  const span = top - bottom || 1;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + ((top - v) / span) * plotH;
  const slot = plotW / 12;
  const x = (i: number) => PAD.left + slot * i + slot / 2;
  const bar = slot * 0.3;
  const ticks = Array.from({ length: Math.round(span / step) + 1 }, (_, k) => bottom + k * step);
  const digits = step >= 1_000_000 ? 0 : step >= 100_000 ? 1 : 2;
  const millions = (v: number) => (Math.abs(v) < step / 1000 ? 0 : v / 1_000_000).toFixed(digits);

  const noteText = (n: CashflowAnnotation) => {
    const month = monthName(n.month, locale, true);
    switch (n.kind) {
      case "one_off_inflow":
        return fill(m.note.one_off_inflow, { month, times: n.value.toFixed(1) });
      case "seasonal_dip":
        return fill(m.note.seasonal_dip, { month, times: n.value.toFixed(2) });
      case "returned_cheque":
        return n.value === 1 ? fill(m.note.returned_cheque, { month }) : fill(m.note.returned_cheques, { month, n: n.value });
      case "overdrawn":
        return fill(m.note.overdrawn, { month, amount: f.money(sar(Math.abs(n.value))) });
    }
  };
  const summary = fill(m.chartLabel, {
    from: monthName(months[0]!.month, locale, true),
    to: monthName(months[11]!.month, locale, true),
    notes: notes.map(noteText).join(" "),
  });

  return (
    <div data-testid="credit-cashflow">
      <Panel title={m.title} aside={<AiLabel agent={m.simulated} />}>
        <div className="space-y-4">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted" aria-hidden="true">
            <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-xs bg-pine" />{m.inflow}</li>
            <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-xs bg-line-strong" />{m.outflow}</li>
            <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded-full bg-stamp" />{m.closing}</li>
            <li className="ms-auto">{m.unit}</li>
          </ul>

          {/* Time runs left to right in both languages, as in Saudi finance tools. On a phone the
              chart keeps a readable minimum width and scrolls within its own frame. */}
          <div dir="ltr" className="-mx-1 overflow-x-auto px-1" tabIndex={0} aria-label={m.title} role="region">
           <div className="min-w-[560px]" style={{ aspectRatio: `${W} / ${H}` }}>
            <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={summary}>
              {ticks.map((t) => (
                <g key={t} aria-hidden="true">
                  <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={t === 0 ? 1.5 : 1} />
                  <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-ink-muted)" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {millions(t)}
                  </text>
                </g>
              ))}
              {months.map((mo, i) => (
                <g key={mo.month} aria-hidden="true">
                  <rect x={x(i) - bar - 1} y={y(mo.inflowSar)} width={bar} height={Math.max(0, y(0) - y(mo.inflowSar))} rx="2" fill="var(--color-pine)" />
                  <rect x={x(i) + 1} y={y(mo.outflowSar)} width={bar} height={Math.max(0, y(0) - y(mo.outflowSar))} rx="2" fill="var(--color-line-strong)" />
                  <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="11" fill="var(--color-ink-muted)">
                    {monthName(mo.month, locale)}
                  </text>
                </g>
              ))}
              <polyline
                aria-hidden="true"
                fill="none"
                stroke="var(--color-stamp)"
                strokeWidth="2"
                strokeLinejoin="round"
                points={months.map((mo, i) => `${x(i)},${y(mo.closingSar)}`).join(" ")}
              />
              {months.map((mo, i) => (
                <circle key={mo.month} aria-hidden="true" cx={x(i)} cy={y(mo.closingSar)} r="3" fill="var(--color-surface)" stroke="var(--color-stamp)" strokeWidth="1.5" />
              ))}
              {notes.map((n, k) => {
                const mo = months[n.index]!;
                // Notes on the same month stack upwards instead of overlapping.
                const stack = notes.slice(0, k).filter((o) => o.index === n.index).length;
                const cy = Math.max(10, y(Math.max(mo.inflowSar, mo.outflowSar, mo.closingSar)) - 14 - stack * 20);
                return (
                  <g key={`${n.kind}-${n.index}`} aria-hidden="true">
                    <circle cx={x(n.index)} cy={cy} r="9" fill="var(--color-ai)" />
                    <text x={x(n.index)} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-surface)">
                      {k + 1}
                    </text>
                  </g>
                );
              })}
            </svg>
           </div>
          </div>

          <section className="rounded-xl border border-dashed border-ai-line bg-ai-soft p-4" data-testid="credit-cashflow-notes">
            <h3 className="mb-2 text-sm font-semibold text-ink">{m.notesTitle}</h3>
            {notes.length === 0 ? (
              <p className="text-sm text-ink-muted">{m.noNotes}</p>
            ) : (
              <ol className="space-y-2 text-sm text-ink">
                {notes.map((n, k) => (
                  <li key={`${n.kind}-${n.index}`} className="flex gap-2" data-kind={n.kind}>
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-ai text-xs font-semibold text-surface" aria-hidden="true">
                      {k + 1}
                    </span>
                    <span className="space-y-0.5">
                      <span className="block">{noteText(n)}</span>
                      {evidenceHref(n.evidenceField) ? <EvidenceSeal source={m.evidence} href={evidenceHref(n.evidenceField)} /> : null}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-ink">{m.showData}</summary>
            <div className="mt-2 overflow-x-auto" tabIndex={0} role="region" aria-label={m.tableCaption}>
              <table className="w-full min-w-[480px] text-sm" data-testid="credit-cashflow-table">
                <caption className="sr-only">{m.tableCaption}</caption>
                <thead className="text-xs text-ink-muted">
                  <tr>
                    <th scope="col" className="py-1 text-start font-medium">{m.colMonth}</th>
                    <th scope="col" className="py-1 text-end font-medium">{m.inflow}</th>
                    <th scope="col" className="py-1 text-end font-medium">{m.outflow}</th>
                    <th scope="col" className="py-1 text-end font-medium">{m.closing}</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((mo) => (
                    <tr key={mo.month} className="border-t border-line">
                      <th scope="row" className="py-1 text-start font-normal">{monthName(mo.month, locale, true)}</th>
                      <td className="py-1 text-end tabular-nums">{f.money(sar(mo.inflowSar))}</td>
                      <td className="py-1 text-end tabular-nums">{f.money(sar(mo.outflowSar))}</td>
                      <td className={`py-1 text-end tabular-nums ${mo.closingSar < 0 ? "text-negative" : ""}`}>{f.money(sar(mo.closingSar))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <p className="text-xs text-ink-muted">{m.footnote}</p>
        </div>
      </Panel>
    </div>
  );
}
