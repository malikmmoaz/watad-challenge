/**
 * Explainable, credit-aware supplier shortlist (pure logic, no I/O).
 *
 * Every supplier gets a match score out of 100 built from eight factors, and
 * every factor yields a plain-language reason, so the contractor always sees
 * "why" and "why not". Two factors are gates: a supplier that stocks none of
 * the requested categories, or does not deliver to the site, is never listed.
 * One slot is reserved for a vetted supplier that is new to the platform.
 */
import { VAT_RATE, formatSar, halalas } from "@/domain/money";
import type {
  Halalas,
  Material,
  MaterialCategory,
  Offer,
  PaymentTerms,
  Rfq,
  ShortlistEntry,
  ShortlistReason,
  ShortlistReasonCode,
  Supplier,
} from "@/domain/types";

export const SHORTLIST_WEIGHTS = {
  category: 20,
  delivery: 15,
  onTime: 12,
  fillRate: 8,
  responsiveness: 10,
  price: 15,
  credit: 10,
  terms: 5,
  localContent: 5,
} as const;

/** Below this many completed orders a supplier has no usable track record. */
export const NEW_SUPPLIER_MAX_ORDERS = 5;

export interface ShortlistContext {
  /** Catalog, to resolve each RFQ line's category and benchmark price. */
  materials: Material[];
  /** What is left of the contractor's credit cap (cap minus drawn); null when no cap is approved. */
  facility: { available: Halalas } | null;
  /**
   * Typical quoted price per supplier relative to the 90-day benchmark
   * (1 = at benchmark, 1.05 = 5% above). Suppliers without history are omitted.
   */
  priceIndex?: Record<string, number>;
}

export interface ShortlistRow extends ShortlistEntry {
  supplierName: string;
  /** False when a gate failed (no category match or no delivery to the site). */
  eligible: boolean;
  /** Shortlisted for invitation; `recommended` marks the pre-ticked ones. */
  shortlisted: boolean;
  /** Holds the reserved slot for a vetted supplier new to the platform. */
  newSupplierSlot: boolean;
  why: string[];
  whyNot: string[];
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const scale = (value: number, low: number, high: number): number => clamp01((value - low) / (high - low));
const pct = (n: number): string => `${Math.round(n * 100)}%`;
const round1 = (n: number): number => Math.round(n * 10) / 10;
const label = (c: MaterialCategory): string => c.replace(/_/g, " ");

const reason = (code: ShortlistReasonCode, share: number, max: number, text: string, positiveFrom = 0.6): ShortlistReason => ({
  code,
  polarity: clamp01(share) >= positiveFrom ? "positive" : "negative",
  text,
  points: round1(clamp01(share) * max),
});

export const isNewSupplier = (s: Supplier): boolean =>
  s.vetted && s.performance.ordersCompleted < NEW_SUPPLIER_MAX_ORDERS;

/** Estimated order value incl. 15% VAT at benchmark prices; what a credit draw would need to cover. */
export function estimateRfqValue(rfq: Rfq, materials: Material[]): Halalas {
  const byId = new Map(materials.map((m) => [m.id, m]));
  const goods = rfq.lines.reduce((sum, l) => sum + (byId.get(l.materialId)?.benchmarkUnitPrice ?? 0) * l.quantity, 0);
  return halalas(goods * (1 + VAT_RATE));
}

const sameTerms = (a: PaymentTerms, b: PaymentTerms): boolean =>
  a.kind === b.kind && (!("days" in a) || !("days" in b) || a.days === b.days);

export function assessSupplier(supplier: Supplier, rfq: Rfq, ctx: ShortlistContext): ShortlistRow {
  const W = SHORTLIST_WEIGHTS;
  const byId = new Map(ctx.materials.map((m) => [m.id, m]));
  const requested = [...new Set(rfq.lines.flatMap((l) => byId.get(l.materialId)?.category ?? []))];
  const covered = requested.filter((c) => supplier.categories.includes(c));
  const coverage = requested.length === 0 ? 0 : covered.length / requested.length;
  const delivers = supplier.serviceCities.includes(rfq.deliveryCity);
  const perf = supplier.performance;
  const isNew = isNewSupplier(supplier);
  const reasons: ShortlistReason[] = [];

  reasons.push(
    reason(
      "stocks_category",
      coverage,
      W.category,
      coverage === 1
        ? `Stocks everything requested (${requested.map(label).join(", ")})`
        : coverage === 0
          ? "Stocks none of the requested categories"
          : `Stocks ${covered.length} of ${requested.length} requested categories (missing: ${requested.filter((c) => !covered.includes(c)).map(label).join(", ")})`,
      1,
    ),
  );

  reasons.push(
    delivers
      ? reason("delivers_to_city", 1, W.delivery, `Delivers to ${rfq.deliveryCity}`)
      : reason("does_not_deliver", 0, W.delivery, `Does not deliver to ${rfq.deliveryCity}`),
  );

  // No track record is scored neutrally and said plainly, not treated as a bad record.
  if (isNew) {
    reasons.push(
      reason("on_time_record", 0.5, W.onTime + W.fillRate, `New to the platform: ${perf.ordersCompleted} completed orders, not enough history to rate reliability`),
    );
  } else {
    reasons.push(
      reason("on_time_record", scale(perf.onTimeRate, 0.75, 0.97), W.onTime, `${pct(perf.onTimeRate)} of ${perf.ordersCompleted} orders delivered on time`),
      reason("fill_rate", scale(perf.fillRate, 0.85, 0.98), W.fillRate, `${pct(perf.fillRate)} of orders delivered complete and to spec`),
    );
  }

  reasons.push(
    reason(
      "responsiveness",
      1 - scale(perf.avgResponseHours, 4, 36),
      W.responsiveness,
      perf.avgResponseHours <= 12
        ? `Likely to respond: usually answers within ${perf.avgResponseHours} h`
        : `Slow to respond: usually takes about ${perf.avgResponseHours} h`,
    ),
  );

  const index = ctx.priceIndex?.[supplier.id];
  if (index === undefined) {
    reasons.push(reason("price_history", 0.5, W.price, "No price history against the 90-day benchmark yet"));
  } else {
    const delta = Math.round((index - 1) * 100);
    reasons.push(
      reason(
        "price_history",
        1 - scale(index, 0.94, 1.1),
        W.price,
        delta === 0
          ? "Usually quotes in line with the 90-day benchmark"
          : `Usually quotes ${Math.abs(delta)}% ${delta < 0 ? "below" : "above"} the 90-day benchmark`,
        0.5,
      ),
    );
  }

  const estimate = estimateRfqValue(rfq, ctx.materials);
  let fitsCreditCap: boolean | null = null;
  if (!supplier.acceptsPlatformCredit) {
    // Only a real drawback when the contractor wants to pay this order with credit.
    reasons.push(reason("no_credit_acceptance", rfq.wantsCredit ? 0 : 0.5, W.credit, "Does not accept platform credit; you would pay this supplier directly"));
  } else if (ctx.facility === null) {
    reasons.push(reason("accepts_credit", 0.7, W.credit, "Accepts platform credit (you have no approved credit cap yet)"));
  } else if (estimate > ctx.facility.available) {
    fitsCreditCap = false;
    reasons.push(
      reason("exceeds_credit_cap", 0.4, W.credit, `Accepts platform credit, but this order (about ${formatSar(estimate)} incl. VAT) is above your available credit cap of ${formatSar(ctx.facility.available)}`),
    );
  } else {
    fitsCreditCap = true;
    reasons.push(
      reason("accepts_credit", 1, W.credit, `Accepts your credit cap: about ${formatSar(estimate)} incl. VAT fits within ${formatSar(ctx.facility.available)} available, and the supplier is paid directly`),
    );
  }

  const termsOk = supplier.acceptedTerms.some((t) => sameTerms(t, rfq.preferredTerms));
  reasons.push(
    termsOk
      ? reason("accepts_terms", 1, W.terms, "Accepts your preferred payment terms")
      : reason("terms_mismatch", 0, W.terms, "Does not usually accept your preferred payment terms"),
  );

  reasons.push(
    reason(
      "local_content",
      supplier.localContent ? 1 : 0,
      W.localContent,
      supplier.localContent ? "Made in Saudi / local supplier" : "Not a local-content supplier",
    ),
  );

  const eligible = coverage > 0 && delivers;
  return {
    supplierId: supplier.id,
    supplierName: supplier.name,
    matchScore: eligible ? round1(reasons.reduce((sum, r) => sum + r.points, 0)) : 0,
    recommended: false,
    reasons,
    fitsCreditCap,
    eligible,
    shortlisted: false,
    newSupplierSlot: false,
    why: reasons.filter((r) => r.polarity === "positive").map((r) => r.text),
    whyNot: reasons.filter((r) => r.polarity === "negative").map((r) => r.text),
  };
}

export interface Shortlist {
  /** Suppliers offered for invitation, best first; the contractor picks who receives the RFQ. */
  shortlisted: ShortlistRow[];
  /** Everyone else, best first, each with its "why not". */
  notShortlisted: ShortlistRow[];
}

/**
 * Builds the shortlist of `size` slots. One slot is reserved for the best
 * eligible vetted newcomer when it did not already earn a place on score;
 * with no eligible newcomer the slot goes back to the ranking.
 * The top `recommendCount` rows are marked `recommended` (pre-ticked in the UI).
 */
export function buildShortlist(suppliers: Supplier[], rfq: Rfq, ctx: ShortlistContext, size = 5, recommendCount = 3): Shortlist {
  const newIds = new Set(suppliers.filter(isNewSupplier).map((s) => s.id as string));
  const rows = suppliers
    .map((s) => assessSupplier(s, rfq, ctx))
    .sort((a, b) => b.matchScore - a.matchScore || a.supplierId.localeCompare(b.supplierId));
  const eligible = rows.filter((r) => r.eligible);

  const bestNew = eligible.find((r) => newIds.has(r.supplierId));
  let picked = eligible.slice(0, size);
  if (bestNew && size > 0 && !picked.includes(bestNew)) {
    picked = [...eligible.filter((r) => r !== bestNew).slice(0, size - 1), bestNew];
  }
  const pickedSet = new Set(picked);

  return {
    shortlisted: picked.map((r, i) => ({
      ...r,
      shortlisted: true,
      recommended: i < recommendCount,
      newSupplierSlot: r === bestNew,
      why: r === bestNew ? [...r.why, "Reserved slot: vetted supplier new to the platform"] : r.why,
    })),
    notShortlisted: rows
      .filter((r) => !pickedSet.has(r))
      .map((r) => (r.eligible ? { ...r, whyNot: [...r.whyNot, `Match score ${r.matchScore} is below the top ${size}`] } : r)),
  };
}

/**
 * Typical quoted price per supplier relative to the 90-day benchmark, from
 * its past offers on the platform: quoted value / benchmark value over every
 * offer line it submitted. 1.04 means it usually quotes 4% above benchmark.
 * Suppliers with no past offers are left out (scored neutrally).
 */
export function priceIndexFromOffers(rfqs: Rfq[], offers: Offer[], materials: Material[]): Record<string, number> {
  const benchmark = new Map(materials.map((m) => [m.id as string, m.benchmarkUnitPrice as number]));
  const lineMaterial = new Map(rfqs.flatMap((r) => r.lines.map((l) => [`${r.id}/${l.id}`, l.materialId as string] as const)));
  const totals = new Map<string, { quoted: number; bench: number }>();
  for (const offer of offers) {
    for (const ol of offer.lines) {
      const materialId = lineMaterial.get(`${offer.rfqId}/${ol.rfqLineId}`);
      const bench = materialId ? benchmark.get(materialId) : undefined;
      if (!bench || ol.quantityAvailable <= 0) continue;
      const t = totals.get(offer.supplierId) ?? { quoted: 0, bench: 0 };
      t.quoted += ol.unitPrice * ol.quantityAvailable;
      t.bench += bench * ol.quantityAvailable;
      totals.set(offer.supplierId, t);
    }
  }
  return Object.fromEntries([...totals].map(([id, t]) => [id, Math.round((t.quoted / t.bench) * 1000) / 1000]));
}
