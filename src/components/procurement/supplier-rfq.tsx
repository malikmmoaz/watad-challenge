"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert, Badge, Button, Checkbox, EmptyState, Facts, Icon, Input, PageHeader, Panel, Select, Textarea, buttonClass, type Tone } from "@/components/ui";
import { demoPersona, reference } from "@/data";
import { add, halalas, sar, vatOn } from "@/domain/money";
import type { OrgId, PaymentTerms, StockStatus } from "@/domain/types";
import { canOffer, submitOffer, withdrawOffer, type OfferDraft, type OfferErrors } from "@/lib/procurement/supplier-offer";
import { termsKey, track } from "@/lib/analytics";
import { getState, update, useDemo } from "@/store";
import { useProcurementI18n } from "./use-procurement-i18n";

const STOCK: StockStatus[] = ["in_stock", "partial", "made_to_order"];

const OFFER_TONE: Record<string, Tone> = { submitted: "info", awarded: "positive", not_selected: "neutral", withdrawn: "neutral", expired: "neutral" };

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
  const [justSent, setJustSent] = useState(false);
  const { s, m, f, fill, terms, qty, name, city, category, logic, ar } = useProcurementI18n();

  if (!rfq || !rfq.invitedSupplierIds.includes(me.id as OrgId)) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow={m.common.supplier} title={s.request.notAvailable} />
        <EmptyState title={s.request.notInvited} action={<Link href="/supplier" className={buttonClass("secondary", "sm")}>{s.request.backToRequests}</Link>}>
          {s.request.notInvitedBody}
        </EmptyState>
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
      <div>
        <Link href="/supplier" className="mb-3 inline-block text-sm text-stamp underline decoration-stamp/35 underline-offset-[3px] hover:decoration-stamp">
          {s.request.allRequests}
        </Link>
        <PageHeader
          eyebrow={s.request.eyebrow}
          title={rfq.title}
          serial={rfq.id}
          status={<Badge tone={rfq.status === "awarded" ? "neutral" : "info"}>{rfq.status === "awarded" ? s.request.awarded : s.request.open}</Badge>}
          meta={
            <>
              <span>{name(contractor)}</span>
              <span>{fill(s.request.offersClose, { when: f.dateTime(rfq.closesAt) })}</span>
            </>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title={s.request.whatIsRequested} className="lg:col-span-2">
          <ul className="divide-y divide-line text-sm">
            {rfq.lines.map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <span className="font-medium text-ink">{name(material(l.materialId), l.description)}</span>
                  <span className="block text-ink-muted">{l.spec}</span>
                </span>
                <span className="tabular-nums text-ink">
                  {qty(l.quantity, l.unit)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={s.request.deliveryAndPayment}>
          <Facts
            columns={1}
            items={[
              { label: s.request.deliverTo, value: rfq.deliverySite.includes(rfq.deliveryCity) ? rfq.deliverySite : `${rfq.deliverySite}, ${city(rfq.deliveryCity)}` },
              { label: s.request.requiredBy, value: f.date(rfq.requiredBy) },
              { label: s.request.preferredTerms, value: terms(rfq.preferredTerms) },
              {
                label: s.request.payment,
                value: rfq.wantsCredit ? s.request.paymentCredit : s.request.paymentDirect,
              },
            ]}
          />
          <p className="mt-4 rounded-xl bg-paper p-3 text-xs text-ink-muted">
            {fill(s.request.whyMatched, {
              categories: categories.filter((c) => me.categories.includes(c)).map((c) => category(c).toLowerCase()).join(ar ? " و" : " and "),
              city: city(rfq.deliveryCity),
            })}
          </p>
        </Panel>
      </div>

      {myPo && (
        <section className="flex flex-wrap items-end justify-between gap-6 rounded-[22px] bg-positive-soft p-6 shadow-card motion-safe:animate-rise sm:p-8">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-positive">
              <Icon name="check" size={16} strokeWidth={2.25} />
              {fill(s.award.chose, { contractor: name(contractor) })}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[var(--tracking-heading)] text-ink">{s.award.won}</h2>
            <p className="mt-2 text-sm text-ink-muted">
              {fill(myPo.creditDraw ? s.award.summaryCredit : s.award.summaryBank, { po: myPo.id, total: f.money(myPo.totalInclVat) })}
            </p>
          </div>
          <Link href={`/supplier/po/${myPo.id}`} data-testid="supplier-po-link" className={buttonClass("primary")}>
            {s.award.openPo}
          </Link>
        </section>
      )}
      {justSent && current?.status === "submitted" ? (
        <div className="motion-safe:animate-rise" data-testid="offer-sent">
          <Alert tone="positive" title={fill(s.offer.sentTitle, { contractor: name(contractor, s.offer.theContractor) })}>
            {s.offer.sentBody}
          </Alert>
        </div>
      ) : null}
      {!myPo && current?.status === "not_selected" && <Alert tone="info" title={s.award.notSelected}>{s.award.notSelectedBody}</Alert>}
      {!allowed.ok && !current && <Alert tone="info" title={s.request.closed}>{logic("supplierErrors", allowed.reason)}</Alert>}

      {current && !editing && (
        <Panel
          title={s.offer.yours}
          aside={
            current.status === "submitted" && (
              <>
                <Button size="sm" variant="secondary" data-testid="offer-revise" onClick={() => setEditing(true)}>{s.offer.revise}</Button>
                <Button size="sm" variant="quiet" data-testid="offer-withdraw" onClick={() => update((st) => withdrawOffer(st, current.id))}>{s.offer.withdraw}</Button>
              </>
            )
          }
        >
          <div data-testid="offer-submitted" data-status={current.status} className="space-y-2 text-sm">
            <p className="text-ink">
              <Badge tone={OFFER_TONE[current.status] ?? "info"}>{s.offer.status[current.status]}</Badge>{" "}
              <span className="text-ink-muted">
                {fill(s.offer.sentOn, { when: f.dateTime(current.submittedAt), valid: f.date(current.validUntil) })}
              </span>
            </p>
            <ul className="divide-y divide-line border-y border-line [&>li]:py-1.5">
              {current.lines.map((ol) => {
                const line = rfq.lines.find((l) => l.id === ol.rfqLineId);
                return (
                  <li key={ol.rfqLineId} className="flex justify-between gap-3">
                    <span className="text-ink">{name(line ? material(line.materialId) : undefined, line?.description ?? "")} · {ol.brand}</span>
                    <span className="tabular-nums text-ink-muted">
                      {fill(s.offer.lineSummary, { qty: f.number(ol.quantityAvailable), price: f.money(ol.unitPrice) })}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-ink-muted">
              {fill(s.offer.terms, { delivery: f.money(current.deliveryFee), days: current.leadTimeDays, terms: terms(current.paymentTerms) })}
              {current.localContent ? s.offer.madeInSaudiSuffix : ""}
            </p>
          </div>
        </Panel>
      )}

      {showForm && (
        <OfferForm
          rfqId={rfq.id}
          onDone={() => {
            setEditing(false);
            setJustSent(true);
          }}
        />
      )}
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
  const { s, f, fill, terms: termsLabel, qty, name, logic } = useProcurementI18n();
  const err = (text: string | undefined) => (text ? { error: logic("supplierErrors", text) } : {});
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
    track("offer_submitted", { rfq_id: rfq.id, offer_id: r.offer.id, local_content: r.offer.localContent, terms: termsKey(r.offer.paymentTerms) });
    setErrors({});
    onDone();
  };

  return (
    <Panel title={s.form.title}>
      <div className="space-y-5" data-testid="offer-form">
        <p className="text-sm text-ink-muted">{s.form.intro}</p>
        {errors.form && <Alert tone="negative" title={s.form.cannotSubmit}>{logic("supplierErrors", errors.form)}</Alert>}
        {errors.lines && <p className="text-sm text-negative">{logic("supplierErrors", errors.lines)}</p>}
        <ul className="space-y-4">
          {draft.lines.map((l, i) => {
            const line = rfq.lines.find((x) => x.id === l.rfqLineId)!;
            const m = material(line.materialId);
            const key = (f: string) => errors[`line:${l.rfqLineId}:${f}`];
            return (
              <li key={l.rfqLineId} data-testid="offer-line" className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                <p className="text-sm font-medium text-ink">
                  {name(m, line.description)} · {qty(line.quantity, line.unit)}
                </p>
                <p className="mb-3 text-xs text-ink-muted">
                  {fill(s.form.benchmark, { spec: line.spec, price: m ? f.money(m.benchmarkUnitPrice) : s.form.noBenchmark })}
                </p>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Input
                    label={s.form.unitPrice}
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    data-testid="offer-line-price"
                    value={Number.isNaN(l.unitPriceSar) ? "" : l.unitPriceSar}
                    onChange={(e) => setLine(i, { unitPriceSar: e.target.valueAsNumber })}
                    {...err(key("price"))}
                  />
                  <Input
                    label={s.form.quantity}
                    type="number"
                    min={0}
                    step="any"
                    value={Number.isNaN(l.quantityAvailable) ? "" : l.quantityAvailable}
                    onChange={(e) => setLine(i, { quantityAvailable: e.target.valueAsNumber })}
                    {...err(key("qty"))}
                  />
                  <Select label={s.form.availability} value={l.stock} onChange={(e) => setLine(i, { stock: e.target.value as StockStatus })}>
                    {STOCK.map((st) => (
                      <option key={st} value={st}>{s.form.stock[st]}</option>
                    ))}
                  </Select>
                  <Select label={s.form.brand} value={l.brand} onChange={(e) => setLine(i, { brand: e.target.value })} {...err(key("brand"))}>
                    {(m?.brands ?? [l.brand]).map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </Select>
                </div>
                <div className="mt-3 space-y-2">
                  <Checkbox label={s.form.alternative} checked={l.isAlternative} onChange={(e) => setLine(i, { isAlternative: e.target.checked })} />
                  {l.isAlternative && (
                    <Input label={s.form.alternativeHow} value={l.alternativeNote} onChange={(e) => setLine(i, { alternativeNote: e.target.value })} {...err(key("alt"))} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="grid gap-3 sm:grid-cols-4">
          <Input label={s.form.deliveryFee} type="number" min={0} step="0.01" data-testid="offer-delivery" value={Number.isNaN(draft.deliveryFeeSar) ? "" : draft.deliveryFeeSar} onChange={(e) => setDraft((d) => ({ ...d, deliveryFeeSar: e.target.valueAsNumber }))} {...err(errors.deliveryFee)} />
          <Input label={s.form.leadTime} type="number" min={1} step={1} data-testid="offer-lead-time" value={Number.isNaN(draft.leadTimeDays) ? "" : draft.leadTimeDays} onChange={(e) => setDraft((d) => ({ ...d, leadTimeDays: e.target.valueAsNumber }))} {...err(errors.leadTime)} />
          <Select label={s.form.paymentTerms} data-testid="offer-terms" value={termsKey(draft.paymentTerms)} onChange={(e) => setDraft((d) => ({ ...d, paymentTerms: terms.find((t) => termsKey(t) === e.target.value) ?? d.paymentTerms }))}>
            {terms.map((t) => (
              <option key={termsKey(t)} value={termsKey(t)}>{termsLabel(t)}</option>
            ))}
          </Select>
          <Input label={s.form.validDays} type="number" min={1} max={60} value={Number.isNaN(draft.validDays) ? "" : draft.validDays} onChange={(e) => setDraft((d) => ({ ...d, validDays: e.target.valueAsNumber }))} {...err(errors.validDays)} />
        </div>
        <Checkbox label={s.form.madeInSaudi} hint={s.form.madeInSaudiHint} checked={draft.localContent} onChange={(e) => setDraft((d) => ({ ...d, localContent: e.target.checked }))} />
        <Textarea label={s.form.notes} optional value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} rows={2} />

        <div className="rounded-md bg-panel p-3 text-sm" data-testid="offer-summary">
          <p className="text-ink">
            {fill(s.form.summary, { goods: f.money(goods), delivery: f.money(delivery), vat: f.money(vat), total: f.money(add(goods, delivery, vat)) })}
          </p>
          {vsBench !== null && (
            <p className="mt-1 text-ink-muted">
              {vsBench === 0 ? s.form.vsInLine : fill(vsBench > 0 ? s.form.vsAbove : s.form.vsBelow, { pct: Math.abs(vsBench) })}
            </p>
          )}
        </div>
        <Button variant="primary" data-testid="offer-submit" onClick={submit}>
          {s.form.submit}
        </Button>
      </div>
    </Panel>
  );
}
