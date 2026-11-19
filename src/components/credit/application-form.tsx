"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CAP_LIMITS,
  DOCUMENT_REQUIREMENTS,
  TENORS,
  missingRequiredDocuments,
  buildSubmittedCase,
  nextCaseId,
  validateDraft,
  type ApplicationDraft,
  type DraftErrors,
  type Tenor,
} from "@/domain/credit-application";
import { sar } from "@/domain/money";
import { fill } from "@/i18n/core";
import { credit } from "@/i18n/credit";
import { useFormat, useLocale, useMessages } from "@/i18n/locale";
import { cityName } from "./data-text";
import type { Contractor, CreditDocumentType } from "@/domain/types";
import { track } from "@/lib/analytics";
import { getState, update } from "@/store";
import { Badge, Button, buttonClass, Checkbox, Input, PageHeader, Panel, SampleDataLabel, Table, Td, Th, THead, Tr } from "@/components/ui";

/** Sample file names so a reviewer can submit without real documents. */
const SAMPLE_FILES: Partial<Record<CreditDocumentType, string>> = {
  cr: "CR-extract-2026.pdf",
  vat_returns: "ZATCA-VAT-returns-Q4-2025-Q3-2026.pdf",
  bank_statements: "Bank-statements-12-months.pdf",
  audited_financials: "Qawaem-audited-FY2025.pdf",
  zakat_certificate: "Zakat-certificate-2026.pdf",
  gosi_certificate: "GOSI-certificate-Nov-2026.pdf",
  contracts_in_hand: "Contracts-and-award-letters.pdf",
  classification_certificate: "Contractor-classification.pdf",
};

export function ApplicationForm({ contractor }: { contractor: Contractor }) {
  const all = useMessages(credit);
  const m = all.apply;
  const f = useFormat();
  const locale = useLocale();
  const router = useRouter();
  const [d, setD] = useState<ApplicationDraft>({
    requestedCapSar: 500_000,
    tenorDays: 60,
    purpose: "",
    files: {},
    simahConsent: false,
    declarationAccepted: false,
  });
  // Errors appear after the first submit attempt, then update live as fields are fixed.
  const [attempted, setAttempted] = useState(false);
  const raw: DraftErrors = attempted ? validateDraft(d) : {};
  // validateDraft() says what is wrong; the words come from the messages.
  const errors: DraftErrors = {
    requestedCap: raw.requestedCap && m.errors.cap,
    purpose: raw.purpose && m.errors.purpose,
    documents: raw.documents && fill(m.errors.documents, { list: missingRequiredDocuments(d.files).map((r) => all.documents[r.type].label).join(locale === "ar" ? "، " : ", ") }),
    simahConsent: raw.simahConsent && m.errors.simah,
    declaration: raw.declaration && m.errors.declaration,
  };
  const set = (patch: Partial<ApplicationDraft>) => setD((prev) => ({ ...prev, ...patch }));
  useEffect(() => track("credit_application_started", {}), []);
  // One event per document type newly attached (not on replace or remove).
  const attach = (files: ApplicationDraft["files"]) => {
    for (const [type, name] of Object.entries(files) as [CreditDocumentType, string | undefined][]) {
      if (name && !d.files[type]) track("credit_document_uploaded", { document_type: type });
    }
  };
  const setFile = (type: CreditDocumentType, name: string | undefined) => {
    attach({ [type]: name });
    setD((prev) => ({ ...prev, files: { ...prev.files, [type]: name } }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    if (Object.keys(validateDraft(d)).length > 0) return;
    const s = getState();
    const pos = s.purchaseOrders.filter((p) => p.contractorId === contractor.id);
    const c = buildSubmittedCase(d, {
      id: nextCaseId(s.creditCases),
      contractorId: contractor.id,
      now: new Date().toISOString(),
      platformHistory: { posPlaced: pos.length, posPaidOnTime: 0, totalSpend: sar(0) },
    });
    update((prev) => ({ ...prev, creditCases: [...prev.creditCases, c] }));
    track("credit_application_submitted", { case_id: c.id, document_count: c.documents.filter((x) => x.status === "uploaded").length });
    router.push(`/contractor/credit#${c.id}`);
  };

  const backlog = contractor.activeProjects.reduce((sum, p) => sum + p.contractValue * (1 - p.percentComplete / 100), 0);

  return (
    <form onSubmit={submit} noValidate className="space-y-6" data-testid="credit-apply-form">
      <Panel title={m.step1}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label={m.capLabel}
            suffix={m.capSuffix}
            type="number"
            inputMode="numeric"
            min={CAP_LIMITS.min / 100}
            max={CAP_LIMITS.max / 100}
            step={10_000}
            value={Number.isNaN(d.requestedCapSar) ? "" : d.requestedCapSar}
            onChange={(e) => set({ requestedCapSar: e.target.valueAsNumber })}
            data-testid="credit-apply-cap"
            hint={fill(m.capHint, { min: f.money(CAP_LIMITS.min), max: f.money(CAP_LIMITS.max) })}
            error={errors.requestedCap}
          />
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-medium text-ink">{m.tenorLegend}</legend>
            <div className="mt-1.5 flex gap-2">
              {TENORS.map((t) => (
                <label
                  key={t}
                  className={`flex h-10 cursor-pointer items-center rounded-md border px-4 text-sm ${d.tenorDays === t ? "border-pine bg-pine text-on-pine" : "border-line-control bg-surface text-ink"}`}
                >
                  <input type="radio" name="tenor" value={t} checked={d.tenorDays === t} onChange={() => set({ tenorDays: t as Tenor })} className="sr-only" />
                  {fill(m.tenorOption, { days: t })}
                </label>
              ))}
            </div>
            <p className="text-xs text-ink-muted">{m.tenorHint}</p>
          </fieldset>
          <div className="sm:col-span-2">
            <Input
              label={m.purposeLabel}
              value={d.purpose}
              onChange={(e) => set({ purpose: e.target.value })}
              placeholder={m.purposePlaceholder}
              data-testid="credit-apply-purpose"
              error={errors.purpose}
            />
          </div>
        </div>
      </Panel>

      <Panel title={m.step2}>
        <div className="space-y-4">
          <p className="text-sm text-ink">
            {fill(m.company, {
              name: (locale === "ar" ? contractor.nameAr : undefined) ?? contractor.name,
              cr: contractor.crNumber,
              city: cityName(contractor.city, all),
              grade: contractor.classificationGrade,
              years: contractor.yearsOperating,
            })}
          </p>
          <Table caption={m.contracts} minWidth={560}>
            <THead>
              <tr>
                <Th>{m.colProject}</Th>
                <Th>{m.colPayer}</Th>
                <Th>{m.colPayerType}</Th>
                <Th align="end">{m.colValue}</Th>
                <Th align="end">{m.colComplete}</Th>
              </tr>
            </THead>
            <tbody>
              {contractor.activeProjects.map((p) => (
                <Tr key={p.id}>
                  <Td>{p.name}</Td>
                  <Td>{p.payer.name}</Td>
                  <Td>{all.payerType[p.payer.type]}</Td>
                  <Td align="end">{f.money(p.contractValue)}</Td>
                  <Td align="end">{p.percentComplete}%</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <p className="text-xs text-ink-muted">
            {fill(m.backlogNote, { amount: f.money(sar(backlog / 100)) })}
          </p>
        </div>
      </Panel>

      <Panel
        title={m.step3}
        aside={
          <Button size="sm" onClick={() => {
              attach(SAMPLE_FILES);
              set({ files: { ...d.files, ...SAMPLE_FILES } });
            }} data-testid="credit-apply-sample-docs">
            {m.sampleDocs}
          </Button>
        }
      >
        <ul className="divide-y divide-line">
          {DOCUMENT_REQUIREMENTS.map((r) => (
            <li key={r.type} className="grid gap-2 py-3 first:pt-0 sm:grid-cols-[1fr_auto] sm:items-center" data-testid={`credit-doc-${r.type}`}>
              <div>
                <p className="text-sm font-medium text-ink">
                  {all.documents[r.type].label} {r.required ? null : <span className="font-normal text-ink-subtle">{m.optional}</span>}
                </p>
                <p className="text-sm text-ink-muted">{all.documents[r.type].why}</p>
                <p className="text-xs text-ink-subtle">{all.documents[r.type].hint}</p>
              </div>
              <div className="flex items-center gap-2 text-sm sm:justify-end">
                {d.files[r.type] ? (
                  <>
                    <Badge tone="positive">{d.files[r.type]}</Badge>
                    <Button size="sm" variant="quiet" onClick={() => setFile(r.type, undefined)}>
                      {m.remove}
                    </Button>
                  </>
                ) : (
                  <label className={buttonClass("secondary", "sm", "cursor-pointer")}>
                    {m.upload}
                    <input type="file" className="sr-only" onChange={(e) => setFile(r.type, e.target.files?.[0]?.name)} />
                  </label>
                )}
              </div>
            </li>
          ))}
        </ul>
        {errors.documents && <p className="mt-3 text-sm text-negative">{errors.documents}</p>}
        <p className="mt-3 text-xs text-ink-muted">{m.filesStay}</p>
      </Panel>

      <Panel title={m.step4}>
        <div className="space-y-4">
          <Checkbox
            label={m.simahConsent}
            hint={m.simahConsentHint}
            checked={d.simahConsent}
            onChange={(e) => set({ simahConsent: e.target.checked })}
            data-testid="credit-apply-simah-consent"
          />
          {errors.simahConsent && <p className="text-sm text-negative">{errors.simahConsent}</p>}
          <Checkbox
            label={m.declaration}
            checked={d.declarationAccepted}
            onChange={(e) => set({ declarationAccepted: e.target.checked })}
            data-testid="credit-apply-declaration"
          />
          {errors.declaration && <p className="text-sm text-negative">{errors.declaration}</p>}
          <p className="text-sm text-ink-muted">
            {m.whatNext}
          </p>
          <Button type="submit" variant="primary" data-testid="credit-apply-submit">
            {m.submit}
          </Button>
        </div>
      </Panel>
    </form>
  );
}

/** The apply page's header and back link, in the reader's language. */
export function ApplyHeader() {
  const m = useMessages(credit).apply;
  return (
    <>
      <Link href="/contractor/credit" className="text-sm text-stamp underline underline-offset-[3px]">
        {m.back}
      </Link>
      <PageHeader title={m.title} status={<SampleDataLabel />} meta={m.intro} />
    </>
  );
}
