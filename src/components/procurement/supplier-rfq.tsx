"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert, Badge, Button, Checkbox, Facts, Input, PageHeader, Panel, Select, Textarea } from "@/components/ui";
import { demoPersona, reference } from "@/data";
import { add, formatSar, halalas, sar, vatOn } from "@/domain/money";
import type { OrgId, PaymentTerms, StockStatus } from "@/domain/types";
import { describeTerms } from "@/lib/procurement/comparison";
import { CATEGORY_LABELS, UNIT_LABELS } from "@/lib/procurement/labels";
import { canOffer, submitOffer, withdrawOffer, type OfferDraft, type OfferErrors } from "@/lib/procurement/supplier-offer";
import { termsKey as analyticsTerms, track } from "@/lib/analytics";
import { getState, update, useDemo } from "@/store";

const STOCK: { value: StockStatus; label: string }[] = [
  { value: "in_stock", label: "In stock" },
  { value: "partial", label: "Partly in stock" },
  { value: "made_to_order", label: "Made to order" },
];
const termsKey = (t: PaymentTerms) => ("days" in t ? `${t.kind}:${t.days}` : t.kind);

export function SupplierRfq({ rfqId }: { rfqId: string }) {
  const rfqs = useDemo((s) => s.rfqs);
  const offers = useDemo((s) => s.offers);
  const pos = useDemo((s) => s.purchaseOrders);
  const me = reference.suppliers.find((s) => s.id === demoPersona.supplier)!;
  const rfq = rfqs.find((r) => r.id === rfqId);
  const mine = useMemo(() => offers.filter((o) => o.rfqId === rfqId && o.supplierId === me.id), [offers, rfqId, me.id]);
  const current = mine.find((o) => o.status !== "withdrawn");
  const myPo = pos.find((p) => p.rfqId === rfqId && p.supplierId === me.id);
  const [editing, setEditing] = useState(false);

  if (!rfq || !rfq.invitedSupplierIds.includes(me.id as OrgId)) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-ink">Request not available</h1>
        <p className="text-sm text-ink-muted">You can only see requests you were invited to. The platform shows each supplier only its own matched requests.</p>
        <Link href="/supplier" className="text-ink underline">Back to requests</Link>
      </div>
    );
  }

  const contractor = reference.contractors.find((c) => c.id === rfq.contractorId);
  const material = (id: string) => reference.materials.find((m) => m.id === id);
  const categories = [...new Set(rfq.lines.flatMap((l) => material(l.materialId)?.category ?? []))];
  const allowed = canOffer(rfq, me.id);
  const showForm = allowed.ok && (!current || editing);

  return (
    <div className="space-y-6">
      <PageHeader
        title={rfq.title}
        serial={rfq.id}
        status={<Badge tone={rfq.status === "awarded" ? "neutral" : "info"}>{rfq.status === "awarded" ? "Awarded" : "Open for offers"}</Badge>}
        meta={
          <>
            {contractor?.name} · offers close {rfq.closesAt.slice(0, 10)} · <Link href="/supplier" className="underline">All requests</Link>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="What is requested" className="lg:col-span-2">
          <ul className="divide-y divide-line text-sm">
            {rfq.lines.map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <span className="font-medium text-ink">{material(l.materialId)?.name ?? l.description}</span>
                  <span className="block text-ink-muted">{l.spec}</span>
                </span>
                <span className="tabular-nums text-ink">
                  {l.quantity.toLocaleString("en-US")} {UNIT_LABELS[l.unit]}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Delivery and payment">
          <Facts
            columns={1}
            items={[
              { label: "Deliver to", value: `${rfq.deliverySite}, ${rfq.deliveryCity}` },
              { label: "Required on site by", value: rfq.requiredBy.slice(0, 10) },
              { label: "Preferred terms", value: describeTerms(rfq.preferredTerms) },
              {
                label: "Payment",
                value: rfq.wantsCredit ? "From the contractor's approved credit cap: the financier pays you directly, the contractor repays the financier" : "Paid by the contractor on agreed terms",
              },
            ]}
          />
          <p className="mt-3 text-xs text-ink-muted">
            Why you were matched: you stock {categories.filter((c) => me.categories.includes(c)).map((c) => CATEGORY_LABELS[c].toLowerCase()).join(" and ")} and deliver to {rfq.deliveryCity}.
          </p>
        </Panel>
      </div>

      {myPo && (
        <Alert tone="positive" title="You won this order" action={<Link href={`/supplier/po/${myPo.id}`} data-testid="supplier-po-link" className="text-sm font-medium underline">Open purchase order</Link>}>
          PO {myPo.id} for {formatSar(myPo.totalInclVat)} incl. VAT{myPo.creditDraw ? ", paid to you directly from the contractor's credit cap once you invoice" : ""}.
        </Alert>
      )}
      {!myPo && current?.status === "not_selected" && <Alert tone="info" title="Not selected this time">The contractor chose another offer. Thank you for quoting.</Alert>}
      {!allowed.ok && !current && <Alert tone="info" title="Closed">{allowed.reason}</Alert>}

      {current && !editing && (
        <Panel
          title="Your offer"
          aside={
            current.status === "submitted" && (
              <>
                <Button size="sm" variant="secondary" data-testid="offer-revise" onClick={() => setEditing(true)}>Revise</Button>
                <Button size="sm" variant="quiet" data-testid="offer-withdraw" onClick={() => update((s) => withdrawOffer(s, current.id))}>Withdraw</Button>
              </>
            )
          }
        >
          <div data-testid="offer-submitted" data-status={current.status} className="space-y-2 text-sm">
            <p className="text-ink">
              Submitted {current.submittedAt.slice(0, 10)} · valid until {current.validUntil.slice(0, 10)} · <Badge tone={current.status === "awarded" ? "positive" : "neutral"}>{current.status.replace("_", " ")}</Badge>
            </p>
            <ul className="space-y-1">
              {current.lines.map((ol) => {
                const line = rfq.lines.find((l) => l.id === ol.rfqLineId);
                return (
                  <li key={ol.rfqLineId} className="flex justify-between gap-3">
                    <span className="text-ink">{line?.description} · {ol.brand}</span>
                    <span className="tabular-nums text-ink-muted">
                      {ol.quantityAvailable.toLocaleString("en-US")} × {formatSar(ol.unitPrice)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-ink-muted">
              Delivery {formatSar(current.deliveryFee)} · {current.leadTimeDays} days · {describeTerms(current.paymentTerms)}
              {current.localContent ? " · Made in Saudi" : ""}
            </p>
          </div>
        </Panel>
      )}

      {showForm && <OfferForm rfqId={rfq.id} onDone={() => setEditing(false)} />}
    </div>
  );
}

function OfferForm({ rfqId, onDone }: { rfqId: string; onDone: () => void }) {
  const rfq = useDemo((s) => s.rfqs).find((r) => r.id === rfqId)!;
  const me = reference.suppliers.find((s) => s.id === demoPersona.supplier)!;
  const material = (id: string) => reference.materials.find((m) => m.id === id);
  const terms: PaymentTerms[] = me.acceptedTerms;
  const [draft, setDraft] = useState<OfferDraft>(() => ({
    lines: rfq.lines.map((l) => ({
      rfqLineId: l.id,
      unitPriceSar: NaN,
      quantityAvailable: l.quantity,
      stock: "in_stock",
      brand: me.brandsStocked.find((b) => material(l.materialId)?.brands.includes(b)) ?? material(l.materialId)?.brands[0] ?? "",
      isAlternative: false,
      alternativeNote: "",
    })),
    deliveryFeeSar: 0,
    leadTimeDays: 5,
    paymentTerms: terms.find((t) => termsKey(t) === termsKey(rfq.preferredTerms)) ?? terms[0]!,
    localContent: me.localContent,
    validDays: 7,
    notes: "",
  }));
  const [errors, setErrors] = useState<OfferErrors>({});
  const setLine = (i: number, patch: Partial<OfferDraft["lines"][number]>) => setDraft((d) => ({ ...d, lines: d.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));

  const goods = halalas(draft.lines.reduce((sum, l) => sum + (l.unitPriceSar > 0 ? sar(l.unitPriceSar) * Math.max(0, l.quantityAvailable || 0) : 0), 0));
  const delivery = sar(Math.max(0, draft.deliveryFeeSar || 0));
  const vat = vatOn(add(goods, delivery));
  const benchmark = draft.lines.reduce((sum, l) => {
    const line = rfq.lines.find((x) => x.id === l.rfqLineId);
    const m = line && material(line.materialId);
    return l.unitPriceSar > 0 && m ? sum + m.benchmarkUnitPrice * Math.max(0, l.quantityAvailable || 0) : sum;
  }, 0);
  const vsBench = benchmark > 0 ? Math.round((goods / benchmark - 1) * 1000) / 10 : null;

  const submit = () => {
    const r = submitOffer(getState(), rfq.id, me.id, draft, new Date().toISOString());
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    update(() => r.state);
    track("offer_submitted", { rfq_id: rfq.id, offer_id: r.offer.id, local_content: r.offer.localContent, terms: analyticsTerms(r.offer.paymentTerms) });
    setErrors({});
    onDone();
  };

  return (
    <Panel title="Your offer (bid)">
      <div className="space-y-5" data-testid="offer-form">
        <p className="text-sm text-ink-muted">Quote the lines you can supply. Leave a price empty to skip a line. Prices are per unit, in SAR excluding VAT. Every invited supplier sees the same request.</p>
        {errors.form && <Alert tone="negative" title="Cannot submit">{errors.form}</Alert>}
        {errors.lines && <p className="text-sm text-negative">{errors.lines}</p>}
        <ul className="space-y-4">
          {draft.lines.map((l, i) => {
            const line = rfq.lines.find((x) => x.id === l.rfqLineId)!;
            const m = material(line.materialId);
            const key = (f: string) => errors[`line:${l.rfqLineId}:${f}`];
            return (
              <li key={l.rfqLineId} data-testid="offer-line" className="rounded-md border border-line p-3">
                <p className="text-sm font-medium text-ink">
                  {m?.name ?? line.description} · {line.quantity.toLocaleString("en-US")} {UNIT_LABELS[line.unit]}
                </p>
                <p className="mb-3 text-xs text-ink-muted">
                  {line.spec} · 90-day benchmark {m ? formatSar(m.benchmarkUnitPrice) : "n/a"} per unit (sample data)
                </p>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Input
                    label="Unit price (SAR)"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    data-testid="offer-line-price"
                    value={Number.isNaN(l.unitPriceSar) ? "" : l.unitPriceSar}
                    onChange={(e) => setLine(i, { unitPriceSar: e.target.valueAsNumber })}
                    {...(key("price") ? { error: key("price") } : {})}
                  />
                  <Input
                    label="Quantity you can supply"
                    type="number"
                    min={0}
                    step="any"
                    value={Number.isNaN(l.quantityAvailable) ? "" : l.quantityAvailable}
                    onChange={(e) => setLine(i, { quantityAvailable: e.target.valueAsNumber })}
                    {...(key("qty") ? { error: key("qty") } : {})}
                  />
                  <Select label="Availability" value={l.stock} onChange={(e) => setLine(i, { stock: e.target.value as StockStatus })}>
                    {STOCK.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </Select>
                  <Select label="Brand" value={l.brand} onChange={(e) => setLine(i, { brand: e.target.value })} {...(key("brand") ? { error: key("brand") } : {})}>
                    {(m?.brands ?? [l.brand]).map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </Select>
                </div>
                <div className="mt-3 space-y-2">
                  <Checkbox label="Offering an alternative to the requested spec" checked={l.isAlternative} onChange={(e) => setLine(i, { isAlternative: e.target.checked })} />
                  {l.isAlternative && (
                    <Input label="How the alternative differs" value={l.alternativeNote} onChange={(e) => setLine(i, { alternativeNote: e.target.value })} {...(key("alt") ? { error: key("alt") } : {})} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Delivery fee for the order (SAR)" type="number" min={0} step="0.01" data-testid="offer-delivery" value={Number.isNaN(draft.deliveryFeeSar) ? "" : draft.deliveryFeeSar} onChange={(e) => setDraft((d) => ({ ...d, deliveryFeeSar: e.target.valueAsNumber }))} {...(errors.deliveryFee ? { error: errors.deliveryFee } : {})} />
          <Input label="Lead time (days)" type="number" min={1} step={1} data-testid="offer-lead-time" value={Number.isNaN(draft.leadTimeDays) ? "" : draft.leadTimeDays} onChange={(e) => setDraft((d) => ({ ...d, leadTimeDays: e.target.valueAsNumber }))} {...(errors.leadTime ? { error: errors.leadTime } : {})} />
          <Select label="Payment terms" data-testid="offer-terms" value={termsKey(draft.paymentTerms)} onChange={(e) => setDraft((d) => ({ ...d, paymentTerms: terms.find((t) => termsKey(t) === e.target.value) ?? d.paymentTerms }))}>
            {terms.map((t) => (
              <option key={termsKey(t)} value={termsKey(t)}>{describeTerms(t)}</option>
            ))}
          </Select>
          <Input label="Offer valid for (days)" type="number" min={1} max={60} value={Number.isNaN(draft.validDays) ? "" : draft.validDays} onChange={(e) => setDraft((d) => ({ ...d, validDays: e.target.valueAsNumber }))} {...(errors.validDays ? { error: errors.validDays } : {})} />
        </div>
        <Checkbox label="Made in Saudi (local content)" hint="Counts towards the 10% local-content preference when the contractor ranks offers." checked={draft.localContent} onChange={(e) => setDraft((d) => ({ ...d, localContent: e.target.checked }))} />
        <Textarea label="Notes for the contractor" optional value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} rows={2} />

        <div className="rounded-md bg-panel p-3 text-sm" data-testid="offer-summary">
          <p className="text-ink">
            Goods {formatSar(goods)} + delivery {formatSar(delivery)} + 15% VAT {formatSar(vat)} = <strong className="tabular-nums">{formatSar(add(goods, delivery, vat))}</strong>
          </p>
          {vsBench !== null && (
            <p className="mt-1 text-ink-muted">
              Your goods price is {vsBench === 0 ? "in line with" : `${Math.abs(vsBench)}% ${vsBench > 0 ? "above" : "below"}`} the 90-day benchmark for these quantities. Contractors see this comparison.
            </p>
          )}
        </div>
        <Button variant="primary" data-testid="offer-submit" onClick={submit}>
          Submit offer
        </Button>
      </div>
    </Panel>
  );
}
