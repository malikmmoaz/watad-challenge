import type { ReactNode } from "react";
import { Badge, Button, CellNote, cx, FactorBar, LeadTimeBar } from "@/components/ui";
import { formatSar } from "@/domain/money";
import type { ComparisonFactor, OfferId } from "@/domain/types";
import type { OfferBadge, OfferComparisonRow } from "@/lib/procurement/comparison";

const FACTOR_LABEL: Record<ComparisonFactor, string> = {
  cost: "Landed cost",
  coverage: "Coverage of the RFQ",
  lead_time: "Lead time",
  reliability: "Reliability",
  payment_terms: "Payment terms",
  local_content: "Made in Saudi",
};

const BADGE_LABEL: Record<OfferBadge, string> = {
  lowest_landed_cost: "Lowest landed cost",
  fastest: "Fastest delivery",
  best_terms: "Best payment terms",
  most_reliable: "Most reliable",
};

const PRICE_FLAG = {
  below_market: { label: "below benchmark", tone: "positive" },
  in_line: { label: "in line with benchmark", tone: "neutral" },
  above_market: { label: "above benchmark", tone: "caution" },
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
  const caption = `Offers for ${rfqLabel}, best score first`;

  return (
    <div className="rounded-lg border border-line bg-surface lg:overflow-x-auto" role="region" aria-label={caption} tabIndex={0}>
      <table className="w-full border-collapse text-left text-sm max-lg:block lg:min-w-[46rem]">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line-strong bg-panel text-xs text-ink-muted max-lg:hidden">
          <tr>
            <Head>Offer</Head>
            <Head end>Landed cost incl. 15% VAT</Head>
            <Head>Coverage</Head>
            <Head>Lead time</Head>
            <Head>Payment terms</Head>
            <Head end>Score</Head>
            {onChoose ? (
              <Head>
                <span className="sr-only">Choose</span>
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
                    <span className="whitespace-nowrap text-right lg:hidden">
                      <span className="text-lg font-semibold text-ink">{Math.round(r.score)}</span>
                      <span className="text-xs text-ink-muted"> of 100</span>
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.rank === 1 ? <Badge tone="positive">Best overall score</Badge> : null}
                    {r.badges.map((b) => (
                      <Badge key={b} icon={false}>
                        {BADGE_LABEL[b]}
                      </Badge>
                    ))}
                    {r.localContent ? <Badge icon={false}>Made in Saudi</Badge> : null}
                  </div>
                </Cell>
                <Cell end label="Landed cost incl. 15% VAT">
                  <span className="whitespace-nowrap font-medium text-ink">{formatSar(r.landedCostInclVat)}</span>
                  <CellNote>incl. delivery {formatSar(r.deliveryFee)}</CellNote>
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
                      {r.vsBenchmarkPct > 0 ? "+" : ""}
                      {r.vsBenchmarkPct.toFixed(1)}%, {flag.label}
                    </span>
                  </CellNote>
                </Cell>
                <Cell label="Coverage">
                  <span className={full ? "text-ink" : "font-medium text-caution"}>
                    {r.linesCovered} of {r.linesRequested} lines in full
                  </span>
                  <CellNote>{Math.round(r.coverage * 100)}% of requested value</CellNote>
                </Cell>
                <Cell label="Lead time" className="lg:min-w-28">
                  <LeadTimeBar days={r.leadTimeDays} maxDays={maxDays} requiredInDays={requiredInDays} />
                </Cell>
                <Cell label="Payment terms" className="lg:min-w-32 lg:max-w-44">
                  {r.termsLabel}
                  {acceptsCredit ? <CellNote>{acceptsCredit(r) ? "Accepts your credit cap" : "No platform credit"}</CellNote> : null}
                </Cell>
                <Cell end className="max-lg:hidden">
                  <span className="text-lg font-semibold text-ink" data-testid="offer-score">
                    {Math.round(r.score)}
                  </span>
                  <CellNote>of 100</CellNote>
                </Cell>
                {onChoose ? (
                  <Cell end className="max-lg:col-span-2">
                    {chosen ? (
                      <Badge tone="positive">Chosen</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant={r.rank === 1 && !chosenOfferId ? "primary" : "secondary"}
                        onClick={() => onChoose(r.offerId)}
                        data-testid="offer-choose"
                        className="max-lg:h-10 max-lg:w-full"
                      >
                        Choose offer
                      </Button>
                    )}
                  </Cell>
                ) : null}
              </tr>
              <tr className="max-lg:block">
                <td colSpan={columns} className="px-3 pb-3 max-lg:block max-lg:px-4 max-lg:pb-4 max-lg:pt-3">
                  <details className="group" open={r.rank === 1}>
                    <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-sm text-xs font-medium text-stamp underline decoration-stamp/35 underline-offset-[3px] hover:decoration-stamp [&::-webkit-details-marker]:hidden">
                      <span className="group-open:hidden">Show how the score of {Math.round(r.score)} is made up</span>
                      <span className="hidden group-open:inline">Hide how the score is made up</span>
                    </summary>
                    <p className="mt-3 text-xs text-ink-muted">
                      Goods {formatSar(r.subtotal)} + delivery {formatSar(r.deliveryFee)} + 15% VAT {formatSar(r.vat)} ={" "}
                      <span className="font-medium text-ink">{formatSar(r.landedCostInclVat)}</span>
                    </p>
                    <div className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                      {r.scoreBreakdown.map((f) => (
                        <FactorBar key={f.factor} label={FACTOR_LABEL[f.factor]} points={Math.round(f.points * 10) / 10} weight={f.weight} note={f.note} />
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
