"use client";

import { useMemo, useState, type ReactNode } from "react";
import { LEVER_RANGE, leversOf, simulate, type WhatIfLevers, type WhatIfOutcome } from "@/domain/credit/what-if";
import type { CreditProfile } from "@/domain/credit/types";
import { sar } from "@/domain/money";
import { fill } from "@/i18n/core";
import { credit } from "@/i18n/credit";
import { useFormat, useMessages } from "@/i18n/locale";
import { Badge, Button, Panel, type Tone } from "@/components/ui";

const BAND_TONE: Record<WhatIfOutcome["band"], Tone> = { A: "positive", B: "positive", C: "caution", D: "negative" };

/**
 * What-if: move a few facts about the applicant and watch score, band, limit
 * and Murabaha pricing respond. A simulation on a copy of the file; nothing is
 * saved and the decision panel is untouched. Fixed-size result cells, so
 * sliding causes no layout shift.
 */
export function WhatIfPanel({ profile, asOf }: { profile: CreditProfile; asOf: string }) {
  const all = useMessages(credit);
  const m = all.whatIf;
  const f = useFormat();
  const today = useMemo(() => leversOf(profile), [profile]);
  const [w, setW] = useState<WhatIfLevers>(today);
  const { current, simulated } = useMemo(() => simulate(profile, asOf, w), [profile, asOf, w]);
  const changed = JSON.stringify(w) !== JSON.stringify(today);
  const set = (patch: Partial<WhatIfLevers>) => setW((prev) => ({ ...prev, ...patch }));

  // Rate and APR on two lines, so the cell keeps one height whatever the values.
  const rate = (o: WhatIfOutcome): ReactNode =>
    o.profitRate === null ? (
      <>
        <span className="block">{m.noFacility}</span>
        <span className="block text-xs font-normal">&nbsp;</span>
      </>
    ) : (
      <>
        <span className="block">{f.percent(o.profitRate, 2)}</span>
        <span className="block whitespace-normal text-xs font-normal">{fill(m.aprValue, { apr: f.percent(o.apr ?? 0, 1) })}</span>
      </>
    );
  const rows: { label: string; now: ReactNode; sim: ReactNode; moved: boolean }[] = [
    { label: m.score, now: f.number(current.score), sim: f.number(simulated.score), moved: current.score !== simulated.score },
    { label: m.band, now: current.band, sim: simulated.band, moved: current.band !== simulated.band },
    { label: m.decision, now: all.memo.decision[current.decision], sim: all.memo.decision[simulated.decision], moved: current.decision !== simulated.decision },
    { label: m.cap, now: f.money(sar(current.capSar)), sim: f.money(sar(simulated.capSar)), moved: current.capSar !== simulated.capSar },
    { label: m.rate, now: rate(current), sim: rate(simulated), moved: current.profitRate !== simulated.profitRate },
  ];

  return (
    <div data-testid="credit-what-if">
      <Panel
        title={m.title}
        aside={
          <span className="flex items-center gap-2">
            <Badge tone="caution">{m.notSaved}</Badge>
            <Button size="sm" variant="quiet" onClick={() => setW(today)} disabled={!changed} data-testid="credit-what-if-reset">
              {m.reset}
            </Button>
          </span>
        }
      >
        <div className="space-y-5">
          <p className="text-sm text-ink-muted">{m.intro}</p>

          <fieldset className="space-y-4">
            <legend className="sr-only">{m.levers}</legend>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink">{m.vatReconciled}</span>
              <input
                type="checkbox"
                className="size-4"
                checked={w.vatReconciled}
                onChange={(e) => set({ vatReconciled: e.target.checked })}
                data-testid="credit-what-if-vat"
              />
            </label>
            <Slider id="simah" label={m.simah} value={w.simahScore} display={f.number(w.simahScore)} range={LEVER_RANGE.simahScore} onChange={(v) => set({ simahScore: v })} />
            <Slider id="overdue" label={m.overdue} value={w.overdueShare} display={f.percent(w.overdueShare)} range={LEVER_RANGE.overdueShare} onChange={(v) => set({ overdueShare: v })} />
            <Slider id="cheques" label={m.cheques} value={w.returnedCheques} display={f.number(w.returnedCheques)} range={LEVER_RANGE.returnedCheques} onChange={(v) => set({ returnedCheques: v })} />
            <Slider id="years" label={m.years} value={w.yearsTrading} display={f.number(w.yearsTrading)} range={LEVER_RANGE.yearsTrading} onChange={(v) => set({ yearsTrading: v })} />
          </fieldset>

          <table className="w-full table-fixed text-sm" data-testid="credit-what-if-result">
            <caption className="sr-only">{m.resultCaption}</caption>
            <thead className="text-xs text-ink-muted">
              <tr>
                <th scope="col" className="w-1/3 pb-1 text-start font-medium" />
                <th scope="col" className="pb-1 text-end font-medium">{m.today}</th>
                <th scope="col" className="pb-1 text-end font-medium">{m.simulated}</th>
              </tr>
            </thead>
            <tbody aria-live="polite">
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-line">
                  <th scope="row" className="py-1.5 text-start font-normal text-ink-muted">{r.label}</th>
                  <td className="whitespace-nowrap py-1.5 text-end text-xs tabular-nums text-ink-muted sm:text-sm">{r.now}</td>
                  <td className={`whitespace-nowrap py-1.5 text-end text-xs font-semibold tabular-nums sm:text-sm ${r.moved ? "text-ink" : "text-ink-muted"}`}>
                    {r.label === m.band ? <Badge tone={BAND_TONE[simulated.band]}>{r.sim}</Badge> : r.sim}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-ink-muted">{m.footnote}</p>
        </div>
      </Panel>
    </div>
  );
}

function Slider({ id, label, value, display, range, onChange }: { id: string; label: string; value: number; display: string; range: { min: number; max: number; step: number }; onChange: (v: number) => void }) {
  const inputId = `what-if-${id}`;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <label htmlFor={inputId} className="text-ink">
          {label}
        </label>
        <output htmlFor={inputId} className="min-w-12 text-end font-semibold tabular-nums text-ink">
          {display}
        </output>
      </div>
      <input
        id={inputId}
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className="w-full accent-[var(--color-pine)]"
        data-testid={`credit-what-if-${id}`}
      />
    </div>
  );
}
