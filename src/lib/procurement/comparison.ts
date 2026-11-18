/**
 * Offer comparison (pure logic, no I/O): landed cost incl. delivery and 15%
 * VAT, price vs the 90-day benchmark, coverage, lead time against the
 * required-by date, payment terms, reliability and local content, combined
 * into an explainable 0..100 score. Also blind labels and a basket split.
 */
import { LOCAL_CONTENT_PREFERENCE, VAT_RATE, add, halalas, times, vatOn } from "@/domain/money";
import type {
  ComparisonFactor,
  Halalas,
  Material,
  Offer,
  OfferComparison,
  OfferId,
  OrgId,
  PaymentTerms,
  Rfq,
  Supplier,
} from "@/domain/types";

export const COMPARISON_WEIGHTS: Record<ComparisonFactor, number> = {
  cost: 40,
  coverage: 15,
  lead_time: 15,
  reliability: 15,
  payment_terms: 10,
  local_content: 5,
};

/** Within ±3% of the benchmark counts as in line. */
export const BENCHMARK_TOLERANCE_PCT = 3;

export interface LandedCost {
  subtotal: Halalas;
  deliveryFee: Halalas;
  vat: Halalas;
  landedCostInclVat: Halalas;
}

/** Goods + delivery, then 15% VAT on both. */
export function landedCost(subtotal: Halalas, deliveryFee: Halalas): LandedCost {
  const vat = vatOn(add(subtotal, deliveryFee));
  return { subtotal, deliveryFee, vat, landedCostInclVat: add(subtotal, deliveryFee, vat) };
}

export function priceFlag(vsBenchmarkPct: number): OfferComparison["priceFlag"] {
  if (vsBenchmarkPct < -BENCHMARK_TOLERANCE_PCT) return "below_market";
  if (vsBenchmarkPct > BENCHMARK_TOLERANCE_PCT) return "above_market";
  return "in_line";
}

export function describeTerms(t: PaymentTerms): string {
  switch (t.kind) {
    case "advance":
      return "Payment in advance";
    case "on_delivery":
      return "Payment on delivery";
    case "net":
      return `Net ${t.days} days`;
    case "platform_credit":
      return `Platform credit, ${t.days} days (supplier paid directly)`;
  }
}

/** 0..1: how favourable the terms are to the contractor's cash flow. */
export function termsScore(t: PaymentTerms): number {
  if (t.kind === "advance") return 0;
  if (t.kind === "on_delivery") return 0.4;
  return t.days === 30 ? 0.7 : t.days === 60 ? 0.85 : 1;
}

export interface ComparisonContext {
  materials: Material[];
  suppliers: Supplier[];
  /** ISO date "now", passed in so the logic stays pure and testable. */
  today: string;
}

export interface OfferComparisonRow extends OfferComparison {
  supplierId: OrgId;
  /** Lines the supplier can deliver in full / lines requested. */
  linesCovered: number;
  linesRequested: number;
  leadTimeDays: number;
  termsLabel: string;
  localContent: boolean;
  /** What stands out about this offer among those that cover the whole RFQ. */
  badges: OfferBadge[];
}

export type OfferBadge = "lowest_landed_cost" | "fastest" | "best_terms" | "most_reliable";

const DAY_MS = 86_400_000;
const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const round1 = (n: number): number => Math.round(n * 10) / 10;

const reliabilityOf = (s: Supplier | undefined): { share: number; note: string } => {
  if (!s || s.performance.ordersCompleted < 5) return { share: 0.5, note: "New to the platform, not enough history to rate" };
  const p = s.performance;
  const blended = 0.6 * p.onTimeRate + 0.4 * p.fillRate;
  return {
    share: clamp01((blended - 0.8) / (0.97 - 0.8)),
    note: `${Math.round(p.onTimeRate * 100)}% on time, ${Math.round(p.fillRate * 100)}% complete over ${p.ordersCompleted} orders`,
  };
};

/**
 * Levels the offers for one RFQ and ranks them. A line quoted for less than
 * the requested quantity is priced for what is available and lowers coverage,
 * so a partial offer never looks cheapest just because it supplies less: cost
 * is scored against the benchmark for the same quantities.
 */
export function compareOffers(rfq: Rfq, offers: Offer[], ctx: ComparisonContext): OfferComparisonRow[] {
  const W = COMPARISON_WEIGHTS;
  const material = new Map(ctx.materials.map((m) => [m.id, m]));
  const supplier = new Map(ctx.suppliers.map((s) => [s.id, s]));
  const rfqLine = new Map(rfq.lines.map((l) => [l.id, l]));
  const benchmarkOf = (lineId: string): number => {
    const l = rfqLine.get(lineId);
    return l ? (material.get(l.materialId)?.benchmarkUnitPrice ?? 0) : 0;
  };
  const requestedBenchmark = rfq.lines.reduce((sum, l) => sum + benchmarkOf(l.id) * l.quantity, 0);
  const daysAvailable = Math.floor((Date.parse(rfq.requiredBy) - Date.parse(ctx.today)) / DAY_MS);

  const base = offers.map((offer) => {
    let goods = 0;
    let benchmark = 0;
    let linesCovered = 0;
    for (const ol of offer.lines) {
      const line = rfqLine.get(ol.rfqLineId);
      if (!line) continue;
      const qty = Math.max(0, Math.min(ol.quantityAvailable, line.quantity));
      goods += ol.unitPrice * qty;
      benchmark += benchmarkOf(line.id) * qty;
      if (qty >= line.quantity) linesCovered += 1;
    }
    const cost = landedCost(halalas(goods), offer.deliveryFee);
    const evaluatedCost = offer.localContent ? times(cost.landedCostInclVat, 1 - LOCAL_CONTENT_PREFERENCE) : cost.landedCostInclVat;
    const vsBenchmarkPct = benchmark > 0 ? round1((goods / benchmark - 1) * 100) : 0;
    // Evaluated cost relative to the benchmark landed cost of the same quantities.
    const costIndex = benchmark > 0 ? evaluatedCost / (benchmark * (1 + VAT_RATE)) : 1;
    const coverage = requestedBenchmark > 0 ? Math.round((benchmark / requestedBenchmark) * 100) / 100 : 0;
    return { offer, cost, evaluatedCost, vsBenchmarkPct, costIndex, coverage, linesCovered };
  });

  const bestIndex = Math.min(...base.map((b) => b.costIndex));
  const fastest = Math.min(...base.map((b) => b.offer.leadTimeDays));

  const rows: OfferComparisonRow[] = base.map((b) => {
    const { offer } = b;
    const meets = offer.leadTimeDays <= daysAvailable;
    const rel = reliabilityOf(supplier.get(offer.supplierId));
    const premium = b.costIndex / bestIndex - 1;

    const parts: { factor: ComparisonFactor; share: number; note: string }[] = [
      {
        factor: "cost",
        // Full points for the best evaluated cost; none at 20% dearer.
        share: 1 - premium / 0.2,
        note:
          (premium < 0.0005 ? "Lowest evaluated cost" : `${round1(premium * 100)}% above the lowest evaluated cost`) +
          (offer.localContent ? " (after 10% local-content preference)" : ""),
      },
      {
        factor: "coverage",
        share: b.coverage,
        note: b.coverage === 1 ? "Covers the full quantity of every line" : `Covers ${Math.round(b.coverage * 100)}% of the requested value (${b.linesCovered} of ${rfq.lines.length} lines in full)`,
      },
      {
        factor: "lead_time",
        share: meets ? 0.5 + 0.5 * (fastest / Math.max(offer.leadTimeDays, 1)) : 0,
        note: meets ? `${offer.leadTimeDays} days, in time for your required-by date` : `${offer.leadTimeDays} days, later than your required-by date`,
      },
      { factor: "reliability", share: rel.share, note: rel.note },
      { factor: "payment_terms", share: termsScore(offer.paymentTerms), note: describeTerms(offer.paymentTerms) },
      { factor: "local_content", share: offer.localContent ? 1 : 0, note: offer.localContent ? "Made in Saudi" : "Not local content" },
    ];
    const scoreBreakdown = parts.map((p) => ({ factor: p.factor, weight: W[p.factor], points: round1(clamp01(p.share) * W[p.factor]), note: p.note }));

    return {
      offerId: offer.id,
      supplierId: offer.supplierId,
      ...b.cost,
      evaluatedCost: b.evaluatedCost,
      vsBenchmarkPct: b.vsBenchmarkPct,
      priceFlag: priceFlag(b.vsBenchmarkPct),
      coverage: b.coverage,
      meetsRequiredBy: meets,
      score: round1(scoreBreakdown.reduce((sum, p) => sum + p.points, 0)),
      scoreBreakdown,
      rank: 0,
      linesCovered: b.linesCovered,
      linesRequested: rfq.lines.length,
      leadTimeDays: offer.leadTimeDays,
      termsLabel: describeTerms(offer.paymentTerms),
      localContent: offer.localContent,
      badges: [],
    };
  });

  rows.sort((a, b) => b.score - a.score || a.evaluatedCost - b.evaluatedCost || a.offerId.localeCompare(b.offerId));
  rows.forEach((r, i) => (r.rank = i + 1));

  // Badges only among offers that cover everything, and only when there is a choice.
  const full = rows.filter((r) => r.linesCovered === r.linesRequested);
  const points = (r: OfferComparisonRow, f: ComparisonFactor) => r.scoreBreakdown.find((p) => p.factor === f)?.points ?? 0;
  const award = (badge: OfferBadge, value: (r: OfferComparisonRow) => number) => {
    if (full.length < 2) return;
    const best = Math.max(...full.map(value));
    full.filter((r) => value(r) === best).forEach((r) => r.badges.push(badge));
  };
  award("lowest_landed_cost", (r) => -r.landedCostInclVat);
  award("fastest", (r) => -r.leadTimeDays);
  award("best_terms", (r) => points(r, "payment_terms"));
  award("most_reliable", (r) => points(r, "reliability"));

  return rows;
}

/**
 * Blind comparison labels ("Supplier A", "Supplier B", ...). They follow offer
 * id, never price or rank, so a label gives nothing away about the offer.
 */
export function blindLabels(offers: Pick<Offer, "id">[]): Map<OfferId, string> {
  const letters = (n: number): string => (n < 26 ? "" : letters(Math.floor(n / 26) - 1)) + String.fromCharCode(65 + (n % 26));
  return new Map(
    [...offers]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((o, i) => [o.id, `Supplier ${letters(i)}`]),
  );
}

export interface BasketAllocation extends LandedCost {
  offerId: OfferId;
  supplierId: OrgId;
  rfqLineIds: string[];
}

export interface BasketSplit {
  allocations: BasketAllocation[];
  totalInclVat: Halalas;
  /** Cheapest single offer that covers every line in full, when one exists. */
  bestSingleOfferId: OfferId | null;
  bestSingleInclVat: Halalas | null;
  /** Saving against that single offer; null when no single offer covers everything. */
  saving: Halalas | null;
}

export interface BasketOptions {
  /** Each extra supplier is one more delivery and PO to manage. Default 3. */
  maxSuppliers?: number;
  /** Do not suggest a split for a trivial saving. Default SAR 250. */
  minSaving?: Halalas;
}

/**
 * Suggests splitting the RFQ across suppliers when that lowers the landed
 * cost. Every supplier used charges its own delivery fee, so the search weighs
 * cheaper lines against extra deliveries: it tries each combination of up to
 * `maxSuppliers` offers and gives every line to the cheapest offer in it.
 * Returns null when no combination covers every line in full, or when the
 * saving against the best single offer is below `minSaving`.
 */
export function suggestBasketSplit(rfq: Rfq, offers: Offer[], options: BasketOptions = {}): BasketSplit | null {
  const maxSuppliers = options.maxSuppliers ?? 3;
  const minSaving = options.minSaving ?? 25_000;
  const quantity = new Map(rfq.lines.map((l) => [l.id, l.quantity]));

  // Per offer: rfqLineId -> goods cost, for lines it can supply in full.
  const priced = offers.map((o) => {
    const m = new Map<string, number>();
    for (const ol of o.lines) {
      const q = quantity.get(ol.rfqLineId);
      if (q !== undefined && ol.quantityAvailable >= q) m.set(ol.rfqLineId, ol.unitPrice * q);
    }
    return m;
  });
  const costOf = (i: number, lineIds: string[]): LandedCost =>
    landedCost(halalas(lineIds.reduce((sum, id) => sum + (priced[i]?.get(id) ?? 0), 0)), offers[i]!.deliveryFee);

  const allLines = rfq.lines.map((l) => l.id);
  const single = offers
    .map((_, i) => i)
    .filter((i) => priced[i]!.size === allLines.length)
    .map((i) => ({ i, total: costOf(i, allLines).landedCostInclVat }))
    .sort((a, b) => a.total - b.total)[0];

  const candidates: { assignment: Map<number, string[]>; total: number }[] = [];
  const consider = (subset: number[]) => {
    const assignment = new Map<number, string[]>();
    for (const lineId of allLines) {
      let winner = -1;
      let winnerCost = Infinity;
      for (const i of subset) {
        const c = priced[i]!.get(lineId);
        if (c !== undefined && c < winnerCost) [winner, winnerCost] = [i, c];
      }
      if (winner === -1) return; // this combination cannot supply the line
      assignment.set(winner, [...(assignment.get(winner) ?? []), lineId]);
    }
    if (assignment.size < 2) return;
    const total = [...assignment].reduce((sum, [i, ids]) => sum + costOf(i, ids).landedCostInclVat, 0);
    candidates.push({ assignment, total });
  };
  const walk = (start: number, subset: number[]) => {
    if (subset.length >= 2) consider(subset);
    if (subset.length === maxSuppliers) return;
    for (let i = start; i < offers.length; i++) walk(i + 1, [...subset, i]);
  };
  walk(0, []);

  const best = candidates.sort((a, b) => a.total - b.total || a.assignment.size - b.assignment.size)[0];
  if (!best) return null;
  if (single && single.total - best.total < minSaving) return null;

  return {
    allocations: [...best.assignment]
      .sort(([a], [b]) => a - b)
      .map(([i, rfqLineIds]) => ({ offerId: offers[i]!.id, supplierId: offers[i]!.supplierId, rfqLineIds, ...costOf(i, rfqLineIds) })),
    totalInclVat: halalas(best.total),
    bestSingleOfferId: single ? offers[single.i]!.id : null,
    bestSingleInclVat: single ? single.total : null,
    saving: single ? halalas(single.total - best.total) : null,
  };
}
