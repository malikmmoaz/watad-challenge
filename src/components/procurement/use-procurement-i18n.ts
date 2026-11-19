"use client";

/**
 * Everything the procurement and supplier screens need to render in the reader's locale:
 * both message sets, locale-aware formatters (ADR 0005), and the small conversions those
 * screens repeat (payment terms, quantities with units, cities, categories, names).
 */
import { common } from "@/i18n/common";
import { fill } from "@/i18n/core";
import { useFormat, useLocale, useMessages } from "@/i18n/locale";
import { procurement } from "@/i18n/procurement";
import { supplier } from "@/i18n/supplier";
import { reference } from "@/data";
import type { City, MaterialCategory, PaymentTerms, RfqLine, Unit } from "@/domain/types";

type Named = { name: string; nameAr?: string | undefined };

/** Find which English message `text` is, so logic-produced text can be shown in the reader's locale. */
function lookup(enGroup: Record<string, unknown>, arGroup: Record<string, unknown>, text: string): string | null {
  for (const [key, en] of Object.entries(enGroup)) {
    if (typeof en !== "string") continue;
    if (en === text) return String(arGroup[key]);
    // Templates: turn "{n}" into a capture group and refill the Arabic side with the same values.
    if (en.includes("{")) {
      const names: string[] = [];
      const pattern = new RegExp(
        `^${en.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\\?\{(\w+)\\?\}/g, (_m, n: string) => (names.push(n), "(.+?)"))}$`,
      );
      const match = text.match(pattern);
      if (match) return fill(String(arGroup[key]), Object.fromEntries(names.map((n, i) => [n, match[i + 1] ?? ""])));
    }
  }
  return null;
}

export function useProcurementI18n() {
  const locale = useLocale();
  const m = useMessages(procurement);
  const s = useMessages(supplier);
  const status = useMessages(common).status;
  const f = useFormat();
  const ar = locale === "ar";

  const terms = (t: PaymentTerms): string =>
    t.kind === "advance"
      ? m.terms.advance
      : t.kind === "on_delivery"
        ? m.terms.onDelivery
        : t.kind === "net"
          ? fill(m.terms.net, { days: t.days })
          : fill(m.terms.platformCredit, { days: t.days });

  const name = (o: Named | undefined, fallback = "") => (o ? (ar && o.nameAr ? o.nameAr : o.name) : fallback);

  return {
    locale,
    ar,
    m,
    s,
    /** RFQ and PO status labels, shared with the credit screens and the contractor home. */
    status,
    f,
    fill,
    terms,
    /** "1 tonne", "40 tonnes"; Arabic uses the singular unit after numbers. */
    qty: (n: number, unit: Unit) => `${f.number(n)} ${n === 1 ? m.unitsOne[unit] : m.units[unit]}`,
    unit: (unit: Unit, n = 2) => (n === 1 ? m.unitsOne[unit] : m.units[unit]),
    city: (c: City) => m.cities[c],
    category: (c: MaterialCategory) => m.categories[c],
    /** Company, project and material names: the Arabic name from the data when there is one. */
    name,
    /** An RFQ line's material in the reader's locale; a free-text description (from a BOQ) stays as written. */
    lineName: (l: Pick<RfqLine, "materialId" | "description">) => {
      const mat = reference.materials.find((x) => x.id === l.materialId);
      return mat && l.description === mat.name ? name(mat) : l.description;
    },
    /** Show a message produced by procurement logic (English) in the reader's locale. */
    logic: (group: "supplierErrors" | "poErrors", text: string): string => {
      if (!ar) return text;
      const [en, arGroup] =
        group === "supplierErrors"
          ? [supplier.en.errors, supplier.ar.errors]
          : [procurement.en.poErrors, procurement.ar.poErrors];
      return lookup(en, arGroup, text) ?? text;
    },
  };
}
