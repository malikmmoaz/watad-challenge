import { useSyncExternalStore, type ReactNode } from "react";
import { Badge, Button, CellNote, cx, FactorBar, LeadTimeBar } from "@/components/ui";
import { useProcurementI18n } from "./use-procurement-i18n";
import type { OfferId } from "@/domain/types";
import type { OfferComparisonRow } from "@/lib/procurement/comparison";

/** Wider than a phone (Tailwind sm). On the server and first render we assume wide, as before. */
const WIDE = "(min-width: 640px)";
const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useWide = () => useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => true);

const PRICE_FLAG = {
  below_market: { tone: "positive" },
  in_line: { tone: "neutral" },
  above_market: { tone: "caution" },
} as const;

export interface OfferComparisonTableProps {
  /** Output of `compareOffers`, in any order; shown best score first. */
  rows: OfferComparisonRow[];
  /** Name to show per offer: the supplier's name, or its blind label ("Supplier A"). */
  nameOf: (row: OfferComparisonRow) => string;
  /** Days from today to the RFQ's required-by date, for the lead-time scale. */
  requiredInDays: number;
  /** RFQ reference for the table caption, e.g. "rfq_1042". */
  rfqLabel: string;
  chosenOfferId?: OfferId;
  /** Omit to show the comparison read-only (e.g. after a PO is placed). */
  onChoose?: (offerId: OfferId) => void;
  /** Whether the offer's supplier accepts payment from the contractor's credit cap; shown under the terms. */
  acceptsCredit?: (row: OfferComparisonRow) => boolean;
  /** Whether this offer fits the contractor's credit cap, shown under the landed cost. Omit to hide. */
  creditFit?: (row: OfferComparisonRow) => { fits: boolean; text: string } | null;
}

/**
 * Multi-factor offer comparison. Every offer shows the same fields in the same
 * order, and its score opens into the factors behind it, so the contractor can
 * see why an offer ranks where it does. The ranking informs; the contractor chooses.
 * The table brings its own frame: put it on the page or in a `<Panel flush>`, not in a padded panel.
 *
 * One set of markup, two layouts: a table from `lg` (1024 px) up, and below it each offer
 * is a stacked card with its own "Choose offer" button, so nothing sits behind a
 * sideways scroll on a phone. Test ids therefore appear once per offer.
 */
export function OfferComparisonTable({ rows, nameOf, requiredInDays, rfqLabel, chosenOfferId, onChoose, acceptsCredit, creditFit }: OfferComparisonTableProps) {
  const sorted = [...rows].sort((a, b) => a.rank - b.rank);
  const maxDays = Math.max(requiredInDays, ...sorted.map((r) => r.leadTimeDays), 1);
  const columns = onChoose ? 7 : 6;
  const { m, f, fill, terms, ar } = useProcurementI18n();
  // The score breakdown of the top offer is open on wider screens; on phones it starts closed (shorter page).
  const wide = useWide();
  const c = m.comparison;
  const caption = fill(c.caption, { rfq: rfqLabel });
  /** A score note in the reader's locale, from the note's message key and raw values. */
  const noteText = (x: OfferComparisonRow["scoreBreakdown"][number]): string => {
    const { key, values: v } = x.msg;
    if (key === "terms") return terms(v.kind === "net" || v.kind === "platform_credit" ? ({ kind: v.kind, days: v.days } as never) : ({ kind: v.kind } as never));
    if (key === "aboveLowest") return fill(c.notes.aboveLowest, { pct: f.percent(Number(v.pct) / 100, 1) }) + (v.local ? c.notes.afterPreference : "");
    if (key === "lowestCost") return c.notes.lowestCost + (v.local ? c.notes.afterPreference : "");
    if (key === "reliability") return fill(c.notes.reliability, { onTime: f.percent(Number(v.onTime)), complete: f.percent(Number(v.complete)), orders: v.orders ?? 0 });
    const template = (c.notes as Record<string, string>)[key];
    return template ? fill(template, v) : x.note;
  };

  return (
    <div className="rounded-xl border border-line bg-surface shadow-card lg:overflow-x-auto" role="region" aria-label={caption} tabIndex={0}>
      <table className="w-full border-collapse text-left text-sm max-lg:block lg:min-w-[46rem]">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line-strong bg-panel text-xs text-ink-muted max-lg:hidden">
          <tr>
            <Head>{c.offer}</Head>
            <Head end>{c.landedCost}</Head>
            <Head>{c.coverage}</Head>
            <Head>{c.leadTime}</Head>
            <Head>{c.paymentTerms}</Head>
            <Head end>{c.score}</Head>
            {onChoose ? (
              <Head>
                <span className="sr-only">{c.choose}</span>
              </Head>
            ) : null}
          </tr>
        </thead>
        {sorted.map((r) => {
          const chosen = r.offerId === chosenOfferId;
          const lead = r.rank === 1 && !chosenOfferId;
          const tint = chosen ? "bg-action-soft" : lead ? "bg-positive-soft/50" : undefined;
          const flag = PRICE_FLAG[r.priceFlag];
          const full = r.linesCovered === r.linesRequested;
          return (
            <tbody key={r.offerId} className={cx("border-b border-line last:border-b-0 max-lg:block", tint)}>
              <tr
                data-testid="offer-row"
                data-offer={r.offerId}
                aria-selected={chosen || undefined}
                className="max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-4 max-lg:gap-y-4 max-lg:px-4 max-lg:pt-4"
              >
                <Cell className="max-lg:col-span-2 lg:min-w-40">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-ink" data-testid="offer-supplier">
                      {nameOf(r)}
                    </span>
                    <span className="whitespace-nowrap text-end lg:hidden">
                      <span className="text-lg font-semibold text-ink">{Math.round(r.score)}</span>
                      <span className="text-xs text-ink-muted"> {c.ofHundred}</span>
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.rank === 1 ? <Badge tone="positive">{c.badges.best}</Badge> : null}
                    {r.badges.map((b) => (
                      <Badge key={b} icon={false}>
                        {c.badges[b]}
                      </Badge>
                    ))}
                    {r.localContent ? <Badge icon={false}>{m.common.madeInSaudi}</Badge> : null}
                  </div>
                </Cell>
                <Cell end label={c.landedCost}>
                  <span className="whitespace-nowrap font-medium text-ink">{f.money(r.landedCostInclVat)}</span>
                  {/* A partial offer's total is not comparable to a full one: say what it covers. */}
                  {r.linesCovered < r.linesRequested ? (
                    <CellNote>
                      <span data-testid="offer-partial-cost" className="text-caution">
                        {fill(c.forLines, { covered: r.linesCovered, requested: r.linesRequested })}
                      </span>
                    </CellNote>
                  ) : null}
                  <CellNote>{fill(c.inclDelivery, { fee: f.money(r.deliveryFee) })}</CellNote>
                  {(() => {
                    const fit = creditFit?.(r);
                    return fit ? (
                      <CellNote>
                        <span data-testid="offer-credit-fit" data-fits={fit.fits} className={fit.fits ? "text-positive" : "text-negative"}>
                          {fit.text}
                        </span>
                      </CellNote>
                    ) : null;
                  })()}
                  <CellNote>
                    <span className={flag.tone === "caution" ? "text-caution" : flag.tone === "positive" ? "text-positive" : undefined}>
                      {fill(r.priceFlag === "below_market" ? c.benchmarkBelow : r.priceFlag === "above_market" ? c.benchmarkAbove : c.benchmarkInLine, {
                        pct: `${r.vsBenchmarkPct > 0 ? "+" : ""}${r.vsBenchmarkPct.toFixed(1)}${ar ? "٪" : "%"}`,
                      })}
                    </span>
                  </CellNote>
                </Cell>
                <Cell label={c.coverage}>
                  <span className={`whitespace-nowrap ${full ? "text-ink" : "font-medium text-caution"}`}>
                    {fill(c.linesInFull, { covered: r.linesCovered, requested: r.linesRequested })}
                  </span>
                  <CellNote>{fill(c.ofRequestedValue, { pct: Math.round(r.coverage * 100) })}</CellNote>
                </Cell>
                <Cell label={c.leadTime} className="lg:min-w-28">
                  <LeadTimeBar days={r.leadTimeDays} maxDays={maxDays} requiredInDays={requiredInDays} />
                </Cell>
                <Cell label={c.paymentTerms} className="lg:min-w-32 lg:max-w-44">
                  {noteText(r.scoreBreakdown.find((x) => x.factor === "payment_terms")!)}
                  {acceptsCredit ? <CellNote>{acceptsCredit(r) ? c.acceptsCap : c.noCredit}</CellNote> : null}
                </Cell>
                <Cell end className="max-lg:hidden">
                  <span className="text-lg font-semibold text-ink" data-testid="offer-score">
                    {Math.round(r.score)}
                  </span>
                  <CellNote>{c.ofHundred}</CellNote>
                </Cell>
                {onChoose ? (
                  <Cell end className="max-lg:col-span-2">
                    {chosen ? (
                      <Badge tone="positive">{c.chosen}</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant={r.rank === 1 && !chosenOfferId ? "primary" : "secondary"}
                        onClick={() => onChoose(r.offerId)}
                        data-testid="offer-choose"
                        className="max-lg:h-10 max-lg:w-full"
                      >
                        {c.chooseOffer}
                      </Button>
                    )}
                  </Cell>
                ) : null}
              </tr>
              <tr className="max-lg:block">
                <td colSpan={columns} className="px-3 pb-3 max-lg:block max-lg:px-4 max-lg:pb-4 max-lg:pt-3">
                  <details className="group" open={r.rank === 1 && wide}>
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-sm text-xs font-medium text-stamp underline decoration-stamp/35 underline-offset-[3px] hover:decoration-stamp [&::-webkit-details-marker]:hidden">
                      <span className="group-open:hidden">{fill(c.showScore, { score: Math.round(r.score) })}</span>
                      <span className="hidden group-open:inline">{c.hideScore}</span>
                    </summary>
                    <p className="mt-3 text-xs text-ink-muted">
                      {fill(c.breakdownSum, { goods: f.money(r.subtotal), delivery: f.money(r.deliveryFee), vat: f.money(r.vat), total: f.money(r.landedCostInclVat) })}
                    </p>
                    <div className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                      {r.scoreBreakdown.map((x) => (
                        <FactorBar key={x.factor} label={c.factors[x.factor]} points={Math.round(x.points * 10) / 10} weight={x.weight} note={noteText(x)} />
                      ))}
                    </div>
                  </details>
                </td>
              </tr>
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

function Head({ end = false, children }: { end?: boolean; children: ReactNode }) {
  return (
    <th scope="col" className={cx("h-9 whitespace-nowrap px-3 font-medium", end ? "text-right" : "text-left")}>
      {children}
    </th>
  );
}

/** A table cell from `lg` up; below it a block in the card, with its column name above the value. */
function Cell({ label, end = false, className, children }: { label?: string; end?: boolean; className?: string; children: ReactNode }) {
  return (
    <td className={cx("align-top lg:px-3 lg:py-2.5", end && "lg:text-right lg:tabular-nums", "max-lg:block max-lg:min-w-0", className)}>
      {label ? <span className="mb-1 block text-xs text-ink-muted lg:hidden">{label}</span> : null}
      {children}
    </td>
  );
}
