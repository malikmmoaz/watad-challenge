import { BAND_FLOORS } from "@/domain/credit/scorecard";
import type { Band as CreditBandName } from "@/domain/credit/types";
import { cx } from "./cx";

export interface Band {
  /** Band name as the policy calls it: "A", "B"... */
  name: string;
  /** Lowest score in the band, inclusive. */
  from: number;
  /** Tailwind background class from the band tokens. */
  color: string;
  meaning: string;
}

/**
 * Default credit bands, built from the scoring engine's own floors (`BAND_FLOORS`),
 * so the scale can never disagree with `bandFor()`.
 */
const BAND_STYLE: Record<CreditBandName, { color: string; meaning: string }> = {
  D: { color: "bg-band-d", meaning: "Decline" },
  C: { color: "bg-band-c", meaning: "Approve with conditions" },
  B: { color: "bg-band-b", meaning: "Approve" },
  A: { color: "bg-band-a", meaning: "Approve" },
};
export const creditBands: Band[] = (Object.keys(BAND_STYLE) as CreditBandName[]).map((name) => ({ name, from: BAND_FLOORS[name], ...BAND_STYLE[name] }));

/**
 * Score gauge: the score on a ruled 0 to 100 scale with its band named in
 * words. A scale shows how close the next band is, which a ring cannot.
 */
export function ScoreScale({ score, bands = creditBands, label = "Credit score", size = "md" }: { score: number; bands?: Band[]; label?: string; size?: "sm" | "md" }) {
  const s = Math.min(100, Math.max(0, Math.round(score)));
  const sorted = [...bands].sort((a, b) => a.from - b.from);
  const band = [...sorted].reverse().find((b) => s >= b.from) ?? sorted[0];
  return (
    <div role="img" aria-label={`${label}: ${s} out of 100, band ${band.name}, ${band.meaning}`}>
      <div className="flex items-baseline gap-3">
        <span className={cx("font-semibold tabular-nums text-ink", size === "md" ? "text-4xl" : "text-2xl")}>{s}</span>
        <span className="text-sm text-ink-muted">
          of 100 · <span className="font-semibold text-ink">Band {band.name}</span> · {band.meaning}
        </span>
      </div>
      <div className="relative mt-3 pt-2">
        <span className="absolute top-0 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[7px] border-x-transparent border-t-ink" style={{ left: `${s}%` }} />
        <div className="flex h-2 gap-px overflow-hidden rounded-xs">
          {sorted.map((b, i) => {
            const to = sorted[i + 1]?.from ?? 100;
            return <span key={b.name} className={cx(b.color, b.name === band.name ? "" : "opacity-35")} style={{ width: `${to - b.from}%` }} />;
          })}
        </div>
        <div className="mt-1 flex text-xs text-ink-muted">
          {sorted.map((b, i) => {
            const to = sorted[i + 1]?.from ?? 100;
            return (
              <span key={b.name} className={cx("tabular-nums", b.name === band.name && "font-semibold text-ink")} style={{ width: `${to - b.from}%` }}>
                {b.name} {b.from}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Credit cap as a hard edge. Shows what is already drawn, what this PO would
 * draw, and what is left; a draw past the cap is shown past the edge, in red.
 * Amounts are whole SAR numbers already formatted by the caller's `format`.
 */
export function CreditCapMeter({ cap, drawn, thisPo = 0, format }: { cap: number; drawn: number; thisPo?: number; format: (n: number) => string }) {
  const after = drawn + thisPo;
  const over = Math.max(0, after - cap);
  const scale = Math.max(cap, after) || 1;
  const w = (n: number) => `${(n / scale) * 100}%`;
  const summary = over > 0 ? `This PO exceeds the credit cap by ${format(over)}` : `${format(cap - after)} of the credit cap left${thisPo ? " after this PO" : ""}`;
  return (
    <div role="img" aria-label={`Credit cap ${format(cap)}. Drawn ${format(drawn)}.${thisPo ? ` This PO ${format(thisPo)}.` : ""} ${summary}.`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className={cx("text-sm font-semibold", over > 0 ? "text-negative" : "text-ink")}>{summary}</p>
        <p className="text-xs text-ink-muted tabular-nums">Credit cap {format(cap)}</p>
      </div>
      <div className="relative mt-2.5 flex h-3 overflow-hidden rounded-xs bg-neutral-soft">
        <span className="bg-ink-muted" style={{ width: w(drawn) }} />
        {thisPo ? <span className="bg-pine" style={{ width: w(Math.min(thisPo, Math.max(0, cap - drawn))) }} /> : null}
        {over > 0 ? <span className="bg-negative" style={{ width: w(over) }} /> : null}
        {over > 0 ? <span className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: w(cap) }} /> : null}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
        <li className="flex items-center gap-1.5">
          <span className="size-2 rounded-xs bg-ink-muted" />
          Drawn <span className="tabular-nums text-ink">{format(drawn)}</span>
        </li>
        {thisPo ? (
          <li className="flex items-center gap-1.5">
            <span className={cx("size-2 rounded-xs", over > 0 ? "bg-negative" : "bg-pine")} />
            This PO <span className="tabular-nums text-ink">{format(thisPo)}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/** One factor's contribution to a score: points earned out of the weight it carries. */
export function FactorBar({ label, points, weight, note }: { label: string; points: number; weight: number; note?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="tabular-nums text-ink-muted">
          <span className="text-ink">{points}</span> of {weight}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-neutral-soft" aria-hidden="true">
        <span className="block h-full rounded-full bg-ink-muted" style={{ width: `${weight ? Math.min(100, (points / weight) * 100) : 0}%` }} />
      </div>
      {note ? <p className="mt-1 text-xs text-ink-muted">{note}</p> : null}
    </div>
  );
}
