"use client";

import { useState } from "react";
import { OfferComparisonTable } from "@/components/procurement/offer-comparison-table";
import { reference, seedState } from "@/data";
import type { OfferId } from "@/domain/types";
import { compareOffers } from "@/lib/procurement/comparison";

const TODAY = "2026-11-18";
const DAY_MS = 86_400_000;

/** The comparison table on seeded offers for one RFQ, so its states can be seen and pressed. */
export function OfferComparisonDemo() {
  const [chosen, setChosen] = useState<OfferId>();
  const rfq = seedState.rfqs.find((r) => r.id === "rfq_1042");
  if (!rfq) return null;
  const offers = seedState.offers.filter((o) => o.rfqId === rfq.id);
  const rows = compareOffers(rfq, offers, { materials: reference.materials, suppliers: reference.suppliers, today: TODAY });
  const name = new Map(reference.suppliers.map((s) => [s.id, s.name]));
  return (
    <OfferComparisonTable
      rows={rows}
      nameOf={(r) => name.get(r.supplierId) ?? r.supplierId}
      requiredInDays={Math.floor((Date.parse(rfq.requiredBy) - Date.parse(TODAY)) / DAY_MS)}
      rfqLabel={rfq.id}
      chosenOfferId={chosen}
      onChoose={setChosen}
    />
  );
}
