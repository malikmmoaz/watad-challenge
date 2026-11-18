import { Badge, Button, CellNote, FactorBar, LeadTimeBar, Table, Td, Th, THead, Tr } from "@/components/ui";
import { formatSar } from "@/domain/money";
import type { ComparisonFactor, OfferId } from "@/domain/types";
import type { OfferBadge, OfferComparisonRow } from "@/lib/procurement/comparison";

const FACTOR_LABEL: Record<ComparisonFactor, string> = {
  cost: "Landed cost",
  coverage: "Coverage of the RFQ",
  lead_time: "Lead time",
  reliability: "Reliability",
  payment_terms: "Payment terms",
  local_content: "Local content",
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
}

/**
 * Multi-factor offer comparison. Every offer shows the same fields in the same
 * order, and its score opens into the factors behind it, so the contractor can
 * see why an offer ranks where it does. The ranking informs; the contractor chooses.
 */
export function OfferComparisonTable({ rows, nameOf, requiredInDays, rfqLabel, chosenOfferId, onChoose }: OfferComparisonTableProps) {
  const sorted = [...rows].sort((a, b) => a.rank - b.rank);
  const maxDays = Math.max(requiredInDays, ...sorted.map((r) => r.leadTimeDays), 1);
  const columns = onChoose ? 7 : 6;

  return (
    <Table caption={`Offers for ${rfqLabel}, best score first`} minWidth={980}>
      <THead>
        <tr>
          <Th>Offer</Th>
          <Th align="end">Landed cost incl. 15% VAT</Th>
          <Th>Coverage</Th>
          <Th>Lead time</Th>
          <Th>Payment terms</Th>
          <Th align="end">Score</Th>
          {onChoose ? (
            <Th>
              <span className="sr-only">Choose</span>
            </Th>
          ) : null}
        </tr>
      </THead>
      {sorted.map((r) => {
        const chosen = r.offerId === chosenOfferId;
        const lead = r.rank === 1 && !chosenOfferId;
        const state = chosen ? "selected" : lead ? "recommended" : "default";
        const flag = PRICE_FLAG[r.priceFlag];
        const full = r.linesCovered === r.linesRequested;
        return (
          <tbody key={r.offerId} className="border-b border-line last:border-b-0">
            <Tr state={state} data-testid="offer-row" className="border-b-0">
              <Td className="min-w-60">
                <span className="font-medium text-ink">{nameOf(r)}</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {r.rank === 1 ? <Badge tone="positive">Best overall score</Badge> : null}
                  {r.badges.map((b) => (
                    <Badge key={b} icon={false}>
                      {BADGE_LABEL[b]}
                    </Badge>
                  ))}
                  {r.localContent ? <Badge icon={false}>Local content</Badge> : null}
                </div>
              </Td>
              <Td align="end">
                <span className="font-medium text-ink">{formatSar(r.landedCostInclVat)}</span>
                <CellNote>incl. delivery {formatSar(r.deliveryFee)}</CellNote>
                <CellNote>
                  <span className={flag.tone === "caution" ? "text-caution" : flag.tone === "positive" ? "text-positive" : undefined}>
                    {r.vsBenchmarkPct > 0 ? "+" : ""}
                    {r.vsBenchmarkPct.toFixed(1)}%, {flag.label}
                  </span>
                </CellNote>
              </Td>
              <Td className="whitespace-nowrap">
                <span className={full ? "text-ink" : "font-medium text-caution"}>
                  {r.linesCovered} of {r.linesRequested} lines in full
                </span>
                <CellNote>{Math.round(r.coverage * 100)}% of the quantity</CellNote>
              </Td>
              <Td>
                <LeadTimeBar days={r.leadTimeDays} maxDays={maxDays} requiredInDays={requiredInDays} />
              </Td>
              <Td className="min-w-40">{r.termsLabel}</Td>
              <Td align="end">
                <span className="text-lg font-semibold text-ink">{Math.round(r.score)}</span>
                <CellNote>of 100</CellNote>
              </Td>
              {onChoose ? (
                <Td align="end">
                  {chosen ? (
                    <Badge tone="positive">Chosen</Badge>
                  ) : (
                    <Button size="sm" variant={r.rank === 1 && !chosenOfferId ? "primary" : "secondary"} onClick={() => onChoose(r.offerId)} data-testid="offer-choose">
                      Choose offer
                    </Button>
                  )}
                </Td>
              ) : null}
            </Tr>
            <tr className={chosen ? "bg-action-soft" : lead ? "bg-positive-soft/50" : undefined}>
              <td colSpan={columns} className="px-3 pb-3">
                <details className="group" open={r.rank === 1}>
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-sm text-xs font-medium text-stamp underline decoration-stamp/35 underline-offset-[3px] hover:decoration-stamp [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">Show how the score of {Math.round(r.score)} is made up</span>
                    <span className="hidden group-open:inline">Hide how the score is made up</span>
                  </summary>
                  <p className="mt-3 text-xs text-ink-muted">
                    Goods {formatSar(r.subtotal)} + delivery {formatSar(r.deliveryFee)} + 15% VAT {formatSar(r.vat)} = <span className="font-medium text-ink">{formatSar(r.landedCostInclVat)}</span>
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
    </Table>
  );
}
