"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { LEVER_RANGE, leversOf, simulate, type WhatIfLevers, type WhatIfOutcome } from "@/domain/credit/what-if";
import type { CreditProfile } from "@/domain/credit/types";
import { sar } from "@/domain/money";
import { fill } from "@/i18n/core";
import { credit } from "@/i18n/credit";
import { useFormat, useLocale, useMessages } from "@/i18n/locale";
import { Badge, Button, Panel, type Tone } from "@/components/ui";
import { track, type WhatIfLever } from "@/lib/analytics";

const BAND_TONE: Record<WhatIfOutcome["band"], Tone> = { A: "positive", B: "positive", C: "caution", D: "negative" };
const BAND_RANK: Record<WhatIfOutcome["band"], number> = { A: 3, B: 2, C: 1, D: 0 };
const DECISION_RANK: Record<WhatIfOutcome["decision"], number> = { approve: 3, approve_with_conditions: 2, refer: 1, decline: 0 };

/** Better, worse or unchanged: drives the cell tint and the delta colour. */
type Move = 1 | -1 | 0;
const move = (now: number, sim: number, higherIsBetter = true): Move => (sim === now ? 0 : (sim > now) === higherIsBetter ? 1 : -1);
const TINT: Record<Move, string> = { 1: "bg-positive-soft/60", [-1]: "bg-caution-soft/60", 0: "" };
const DELTA: Record<Move, string> = { 1: "text-positive", [-1]: "text-negative", 0: "" };
/**
 * "+4", "−SAR 60,000.00", "+1.20 pt": an explicit sign (true minus). In Arabic the sign and
 * number are isolated left to right so the sign stays in front of the digits, and the
 * currency or unit keeps its natural place.
 */
const signed = (diff: number, body: string, rtl: boolean) => {
  const sign = diff > 0 ? "+" : "\u2212";
  const clean = body.replace(/[\u200e\u200f\u061c]/g, "");
  return rtl ? clean.replace(/\d[\d,.]*/, (n) => `\u2066${sign}${n}\u2069`) : `${sign}${clean}`;
};

/**
 * What-if: move a few facts about the applicant and watch score, band, limit
 * and Murabaha pricing respond. A simulation on a copy of the file; nothing is
 * saved and the decision panel is untouched. Fixed-size result cells, so
 * sliding causes no layout shift.
 */
export function WhatIfPanel({ caseId, profile, asOf }: { caseId: string; profile: CreditProfile; asOf: string }) {
  const all = useMessages(credit);
  const m = all.whatIf;
  const f = useFormat();
  const rtl = useLocale() === "ar";
  const today = useMemo(() => leversOf(profile), [profile]);
  const [w, setW] = useState<WhatIfLevers>(today);
  const { current, simulated } = useMemo(() => simulate(profile, asOf, w), [profile, asOf, w]);
  const changed = JSON.stringify(w) !== JSON.stringify(today);
  const set = (patch: Partial<WhatIfLevers>) => setW((prev) => ({ ...prev, ...patch }));
  // Analytics: the lever name only, never its value; once per committed change, not per slider step.
  const committed = (lever: WhatIfLever) => track("credit_whatif_changed", { case_id: caseId, lever });

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
  const scoreDiff = simulated.score - current.score;
  const capDiff = simulated.capSar - current.capSar;
  const rateDiff = current.profitRate !== null && simulated.profitRate !== null ? simulated.profitRate - current.profitRate : 0;
  const rows: { key: string; label: string; now: ReactNode; sim: ReactNode; delta?: string; m: Move }[] = [
    { key: "score", label: m.score, now: f.number(current.score), sim: f.number(simulated.score), delta: scoreDiff ? signed(scoreDiff, f.number(Math.abs(scoreDiff)), rtl) : undefined, m: move(current.score, simulated.score) },
    { key: "band", label: m.band, now: current.band, sim: <Badge tone={BAND_TONE[simulated.band]}>{simulated.band}</Badge>, m: move(BAND_RANK[current.band], BAND_RANK[simulated.band]) },
    { key: "decision", label: m.decision, now: m.outcome[current.decision], sim: m.outcome[simulated.decision], m: move(DECISION_RANK[current.decision], DECISION_RANK[simulated.decision]) },
    { key: "cap", label: m.cap, now: f.money(sar(current.capSar)), sim: f.money(sar(simulated.capSar)), delta: capDiff ? signed(capDiff, f.money(sar(Math.abs(capDiff))), rtl) : undefined, m: move(current.capSar, simulated.capSar) },
    {
      key: "rate",
      label: m.rate,
      now: rate(current),
      sim: rate(simulated),
      delta: rateDiff ? signed(rateDiff, fill(m.points, { n: (Math.abs(rateDiff) * 100).toFixed(2) }), rtl) : undefined,
      // A lower profit rate is better for the contractor; losing the facility is worse.
      m: current.profitRate === simulated.profitRate ? 0 : simulated.profitRate === null ? -1 : current.profitRate === null ? 1 : move(current.profitRate, simulated.profitRate, false),
    },
  ];
  const withDelta = new Set(["score", "cap", "rate"]);

  return (
    <div data-testid="credit-what-if">
      <Panel
        title={m.title}
        aside={
          <span className="flex items-center gap-2">
            <Badge tone="caution">{m.notSaved}</Badge>
            <Button size="sm" variant="quiet" onClick={() => {
                setW(today);
                track("credit_whatif_reset", { case_id: caseId });
              }} disabled={!changed} data-testid="credit-what-if-reset">
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
                onChange={(e) => {
                  set({ vatReconciled: e.target.checked });
                  committed("vat_reconciled");
                }}
                data-testid="credit-what-if-vat"
              />
            </label>
            <Slider id="simah" format={(v) => f.number(v)} onCommit={() => committed("simah_score")} label={m.simah} value={w.simahScore} display={f.number(w.simahScore)} range={LEVER_RANGE.simahScore} onChange={(v) => set({ simahScore: v })} />
            <Slider id="overdue" format={(v) => f.percent(v)} onCommit={() => committed("overdue_share")} label={m.overdue} value={w.overdueShare} display={f.percent(w.overdueShare)} range={LEVER_RANGE.overdueShare} onChange={(v) => set({ overdueShare: v })} />
            <Slider id="cheques" format={(v) => f.number(v)} onCommit={() => committed("returned_cheques")} label={m.cheques} value={w.returnedCheques} display={f.number(w.returnedCheques)} range={LEVER_RANGE.returnedCheques} onChange={(v) => set({ returnedCheques: v })} />
            <Slider id="years" format={(v) => f.number(v)} onCommit={() => committed("years_trading")} label={m.years} value={w.yearsTrading} display={f.number(w.yearsTrading)} range={LEVER_RANGE.yearsTrading} onChange={(v) => set({ yearsTrading: v })} />
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
                <tr key={r.key} className="border-t border-line align-top">
                  <th scope="row" className="py-1.5 text-start font-normal text-ink-muted">{r.label}</th>
                  <td className="whitespace-nowrap py-1.5 text-end text-xs tabular-nums text-ink-muted sm:text-sm">{r.now}</td>
                  <td
                    className={`whitespace-nowrap rounded-md px-1.5 py-1.5 text-end text-xs font-semibold tabular-nums transition-colors motion-reduce:transition-none sm:text-sm ${r.m ? "text-ink" : "text-ink-muted"} ${TINT[r.m]}`}
                    data-testid={`credit-what-if-sim-${r.key}`}
                    data-move={r.m === 1 ? "better" : r.m === -1 ? "worse" : "same"}
                  >
                    <span className="block" data-testid={`credit-what-if-value-${r.key}`}>{r.sim}</span>
                    {/* The delta line is always reserved, so a change never shifts the layout. */}
                    {withDelta.has(r.key) && (
                      <span className={`block text-xs font-medium ${DELTA[r.m]}`} data-testid={`credit-what-if-delta-${r.key}`}>
                        {r.delta ?? "\u00a0"}
                      </span>
                    )}
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

function Slider({ id, label, value, display, range, format, onChange, onCommit }: { id: string; label: string; value: number; display: string; range: { min: number; max: number; step: number }; format: (v: number) => string; onChange: (v: number) => void; onCommit: () => void }) {
  const inputId = `what-if-${id}`;
  // Report a commit only when the gesture changed the value (a click without a drag, or an arrow key at the end, is not a change).
  const start = useRef(value);
  const begin = () => {
    start.current = value;
  };
  const commit = () => {
    if (value !== start.current) onCommit();
  };
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
        onPointerDown={begin}
        onKeyDown={(e) => !e.repeat && begin()}
        onPointerUp={commit}
        onKeyUp={(e) => {
          if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(e.key)) commit();
        }}
        className="w-full accent-action"
        data-testid={`credit-what-if-${id}`}
      />
      <div className="flex justify-between text-xs tabular-nums text-ink-muted" aria-hidden="true">
        <span>{format(range.min)}</span>
        <span>{format(range.max)}</span>
      </div>
    </div>
  );
}
