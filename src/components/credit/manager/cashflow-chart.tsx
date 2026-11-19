"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { annotate, monthlyCashflow, type CashflowAnnotation, type CashflowMonth } from "@/domain/credit/cashflow";
import type { CreditProfile } from "@/domain/credit/types";
import { sar } from "@/domain/money";
import type { CreditDocument } from "@/domain/types";
import { fill } from "@/i18n/core";
import { credit } from "@/i18n/credit";
import { useFormat, useLocale, useMessages } from "@/i18n/locale";
import { AiLabel, EvidenceSeal, Panel } from "@/components/ui";

/** Vertical layout in CSS pixels. The chart is drawn at its real width, so 12px labels render at 12px. */
const H = 304;
const LEFT = 44;
const RIGHT = 8;
const BARS = { top: 26, bottom: 188 };
const STRIP = { top: 214, bottom: 272 };
const LABEL_Y = 294;
const FONT = 12;

/** Short month names in the reader's language; Latin digits, Gregorian calendar (the Saudi finance-tool norm). */
const monthName = (ym: string, locale: "en" | "ar", withYear = false) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-GB", { month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" }).format(
    new Date(`${ym}-01T00:00:00Z`),
  );

/** A round step (1, 2 or 5 x 10^n) for about `count` intervals over a span. */
function niceStep(span: number, count: number): number {
  const rough = span / count || 1;
  const mag = 10 ** Math.floor(Math.log10(rough));
  return [1, 2, 5, 10].map((k) => k * mag).find((v) => v >= rough)!;
}

/** "1.5", "0.25", never "-0.0". */
const millions = (v: number, step: number) => {
  const digits = step >= 1_000_000 ? 0 : step >= 100_000 ? 1 : 2;
  return (Math.abs(v) < step / 1000 ? 0 : v / 1_000_000).toFixed(digits);
};

/** Width of the element, measured after mount and on resize; 0 until measured. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Twelve months of cash flow from the bank statements: inflow and outflow bars,
 * the closing balance in its own strip underneath (so it is readable at its own
 * scale, with overdrawn months marked), and numbered simulated-AI notes pinned
 * to months, each linking to the bank-statement evidence. The time axis runs
 * left to right in both languages, with Latin digits. The chart has a fixed
 * height and fits all twelve months at any width, so nothing shifts or hides;
 * the data is also available as a table.
 */
export function CashflowChart({ profile, asOf, seed, documents }: { profile: CreditProfile; asOf: string; seed: string; documents: CreditDocument[] }) {
  const all = useMessages(credit);
  const m = all.cashflow;
  const f = useFormat();
  const locale = useLocale();
  const months = useMemo(() => monthlyCashflow(profile, asOf, seed), [profile, asOf, seed]);
  const notes = useMemo(() => annotate(months, profile.bank?.negativeBalanceDays ?? 0), [months, profile.bank?.negativeBalanceDays]);
  const [frame, width] = useWidth();
  if (months.length !== 12) return null;

  const bankDoc = documents.find((d) => d.type === "bank_statements");
  const evidenceHref = (field: CashflowAnnotation["evidenceField"]) => {
    const key = bankDoc?.extracted.find((x) => x.key === field)?.key ?? bankDoc?.extracted[0]?.key;
    return bankDoc && key ? `#${bankDoc.id}-${key}` : undefined;
  };

  const noteText = (n: CashflowAnnotation) => {
    const month = monthName(n.month, locale, true);
    switch (n.kind) {
      case "one_off_inflow":
        return n.value.toFixed(1) === "2.0" ? fill(m.note.one_off_inflow_double, { month }) : fill(m.note.one_off_inflow, { month, times: n.value.toFixed(1) });
      case "seasonal_dip":
        return fill(m.note.seasonal_dip, { month, times: n.value.toFixed(2) });
      case "returned_cheque":
        return n.value === 1
          ? fill(m.note.returned_cheque, { month })
          : n.value === 2
            ? fill(m.note.returned_cheques_two, { month })
            : fill(m.note.returned_cheques, { month, n: n.value });
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
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-xs bg-pine-deep" />
              {m.inflow}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-xs bg-ink-subtle" />
              {m.outflow}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-stamp" />
              {m.closing}
            </li>
            <li className="ms-auto">{m.unit}</li>
          </ul>

          {/* Time runs left to right in both languages, as in Saudi finance tools. Fixed height: no layout shift while it measures. */}
          <div ref={frame} dir="ltr" className="w-full" style={{ height: H }}>
            {width > 0 && <Plot width={width} months={months} notes={notes} locale={locale} summary={summary} />}
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
                    <th scope="col" className="py-1 text-start font-medium">
                      {m.colMonth}
                    </th>
                    <th scope="col" className="py-1 text-end font-medium">
                      {m.inflow}
                    </th>
                    <th scope="col" className="py-1 text-end font-medium">
                      {m.outflow}
                    </th>
                    <th scope="col" className="py-1 text-end font-medium">
                      {m.closing}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((mo) => (
                    <tr key={mo.month} className="border-t border-line">
                      <th scope="row" className="py-1 text-start font-normal">
                        {monthName(mo.month, locale, true)}
                      </th>
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

function Plot({ width, months, notes, locale, summary }: { width: number; months: CashflowMonth[]; notes: CashflowAnnotation[]; locale: "en" | "ar"; summary: string }) {
  const plotW = width - LEFT - RIGHT;
  const slot = plotW / 12;
  const x = (i: number) => LEFT + slot * i + slot / 2;
  const bar = Math.min(18, Math.max(4, slot * 0.34));
  // On narrow screens label every other month (ending on the latest), so labels never collide.
  // Arabic month names are longer, so they thin out sooner (every third month on a phone).
  const labelEvery = locale === "ar" ? (slot < 32 ? 3 : slot < 54 ? 2 : 1) : slot < 40 ? 2 : 1;

  // Bars: inflows and outflows from zero.
  const barStep = niceStep(Math.max(...months.flatMap((mo) => [mo.inflowSar, mo.outflowSar])), 4);
  const barTop = Math.ceil(Math.max(...months.flatMap((mo) => [mo.inflowSar, mo.outflowSar])) / barStep) * barStep || barStep;
  const yBar = (v: number) => BARS.bottom - (v / barTop) * (BARS.bottom - BARS.top);
  const barTicks = Array.from({ length: Math.round(barTop / barStep) + 1 }, (_, k) => k * barStep);

  // Strip: the closing balance at its own scale, always showing zero.
  const closings = months.map((mo) => mo.closingSar);
  const lo = Math.min(0, ...closings);
  const hi = Math.max(0, ...closings);
  const stripStep = niceStep(hi - lo, 1);
  const sHi = Math.ceil(hi / stripStep) * stripStep || stripStep;
  // Just enough room below zero to show an overdrawn dip; only the top and zero are labelled.
  const sLo = Math.min(lo, -0.15 * sHi);
  const yStrip = (v: number) => STRIP.bottom - ((v - sLo) / (sHi - sLo)) * (STRIP.bottom - STRIP.top);
  const stripTicks = [sHi, 0];

  const label = { fontSize: FONT, fill: "var(--color-ink-muted)", style: { fontVariantNumeric: "tabular-nums" } } as const;

  return (
    <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={summary} className="block overflow-visible">
      {/* Bars */}
      {barTicks.map((t) => (
        <g key={`b${t}`} aria-hidden="true">
          <line x1={LEFT} x2={width - RIGHT} y1={yBar(t)} y2={yBar(t)} stroke="var(--color-line)" strokeWidth={t === 0 ? 1.5 : 1} />
          <text x={LEFT - 6} y={yBar(t) + 4} textAnchor="end" {...label}>
            {millions(t, barStep)}
          </text>
        </g>
      ))}
      {months.map((mo, i) => (
        <g key={mo.month} aria-hidden="true">
          <rect x={x(i) - bar - 1} y={yBar(mo.inflowSar)} width={bar} height={Math.max(0, BARS.bottom - yBar(mo.inflowSar))} rx="2" fill="var(--color-pine-deep)" />
          <rect x={x(i) + 1} y={yBar(mo.outflowSar)} width={bar} height={Math.max(0, BARS.bottom - yBar(mo.outflowSar))} rx="2" fill="var(--color-ink-subtle)" />
          {(11 - i) % labelEvery === 0 && (
            <text x={x(i)} y={LABEL_Y} textAnchor="middle" data-month={mo.month} {...label}>
              {monthName(mo.month, locale)}
            </text>
          )}
        </g>
      ))}

      {/* Closing-balance strip */}
      <g aria-hidden="true">
        {stripTicks.map((t) => (
          <g key={`s${t}`}>
            <line
              x1={LEFT}
              x2={width - RIGHT}
              y1={yStrip(t)}
              y2={yStrip(t)}
              stroke={t === 0 ? "var(--color-line-strong)" : "var(--color-line)"}
              strokeWidth={1}
              strokeDasharray={t === 0 ? undefined : "2 3"}
            />
            <text x={LEFT - 6} y={yStrip(t) + 4} textAnchor="end" {...label}>
              {millions(t, stripStep)}
            </text>
          </g>
        ))}
        <polyline fill="none" stroke="var(--color-stamp)" strokeWidth="2" strokeLinejoin="round" points={months.map((mo, i) => `${x(i)},${yStrip(mo.closingSar)}`).join(" ")} />
        {months.map((mo, i) => (
          <circle
            key={mo.month}
            cx={x(i)}
            cy={yStrip(mo.closingSar)}
            r={mo.closingSar < 0 ? 4 : 3}
            fill={mo.closingSar < 0 ? "var(--color-negative)" : "var(--color-surface)"}
            stroke={mo.closingSar < 0 ? "var(--color-negative)" : "var(--color-stamp)"}
            strokeWidth="1.5"
            data-overdrawn={mo.closingSar < 0 || undefined}
          />
        ))}
      </g>

      {/* Numbered notes above the month's bars; notes on the same month stack upwards. */}
      {notes.map((n, k) => {
        const mo = months[n.index]!;
        const stack = notes.slice(0, k).filter((o) => o.index === n.index).length;
        const cy = Math.max(10, yBar(Math.max(mo.inflowSar, mo.outflowSar)) - 13 - stack * 20);
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
  );
}
