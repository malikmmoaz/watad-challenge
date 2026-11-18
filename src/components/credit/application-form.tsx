"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CAP_LIMITS,
  DOCUMENT_REQUIREMENTS,
  TENORS,
  buildSubmittedCase,
  nextCaseId,
  validateDraft,
  type ApplicationDraft,
  type DraftErrors,
  type Tenor,
} from "@/domain/credit-application";
import { formatSar, sar } from "@/domain/money";
import type { Contractor, CreditDocumentType, PayerType } from "@/domain/types";
import { track } from "@/lib/analytics";
import { getState, update } from "@/store";
import { Badge, Button, buttonClass, Checkbox, Input, Panel, Table, Td, Th, THead, Tr } from "@/components/ui";

const PAYER_LABEL: Record<PayerType, string> = {
  government: "Government",
  semi_government: "Semi-government",
  giga_project: "Giga-project",
  main_contractor: "Main contractor",
  listed: "Listed company",
  large_private: "Large private",
  sme: "SME",
  individual: "Individual",
};

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
  const errors: DraftErrors = attempted ? validateDraft(d) : {};
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
      <Panel title="1. What you need">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Requested credit cap"
            suffix="SAR"
            type="number"
            inputMode="numeric"
            min={CAP_LIMITS.min / 100}
            max={CAP_LIMITS.max / 100}
            step={10_000}
            value={Number.isNaN(d.requestedCapSar) ? "" : d.requestedCapSar}
            onChange={(e) => set({ requestedCapSar: e.target.valueAsNumber })}
            data-testid="credit-apply-cap"
            hint={`Covers order totals including 15% VAT, drawn per purchase order; each supplier is paid directly. ${formatSar(CAP_LIMITS.min)} to ${formatSar(CAP_LIMITS.max)}.`}
            error={errors.requestedCap}
          />
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-medium text-ink">Repayment term per purchase order</legend>
            <div className="mt-1.5 flex gap-2">
              {TENORS.map((t) => (
                <label
                  key={t}
                  className={`flex h-10 cursor-pointer items-center rounded-md border px-4 text-sm ${d.tenorDays === t ? "border-pine bg-pine text-on-pine" : "border-line-control bg-surface text-ink"}`}
                >
                  <input type="radio" name="tenor" value={t} checked={d.tenorDays === t} onChange={() => set({ tenorDays: t as Tenor })} className="sr-only" />
                  {t} days
                </label>
              ))}
            </div>
            <p className="text-xs text-ink-muted">A fixed Murabaha markup is agreed per order and shown with its APR before you confirm.</p>
          </fieldset>
          <div className="sm:col-span-2">
            <Input
              label="What the materials are for"
              value={d.purpose}
              onChange={(e) => set({ purpose: e.target.value })}
              placeholder="e.g. Rebar and ready-mix for Al Narjis Schools, phase 2"
              data-testid="credit-apply-purpose"
              error={errors.purpose}
            />
          </div>
        </div>
      </Panel>

      <Panel title="2. Company and contracts in hand">
        <div className="space-y-4">
          <p className="text-sm text-ink">
            {contractor.name} · CR <span className="font-mono text-xs">{contractor.crNumber}</span> · {contractor.city} · classification grade {contractor.classificationGrade} ·{" "}
            {contractor.yearsOperating} years operating
          </p>
          <Table caption="Contracts in hand" minWidth={560}>
            <THead>
              <tr>
                <Th>Project</Th>
                <Th>Payer</Th>
                <Th>Payer type</Th>
                <Th align="end">Contract value (excl. VAT)</Th>
                <Th align="end">Complete</Th>
              </tr>
            </THead>
            <tbody>
              {contractor.activeProjects.map((p) => (
                <Tr key={p.id}>
                  <Td>{p.name}</Td>
                  <Td>{p.payer.name}</Td>
                  <Td>{PAYER_LABEL[p.payer.type]}</Td>
                  <Td align="end">{formatSar(p.contractValue)}</Td>
                  <Td align="end">{p.percentComplete}%</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <p className="text-xs text-ink-muted">
            Remaining backlog about {formatSar(sar(backlog / 100))}. Who pays you matters: government and listed payers lower the risk. Retention terms are read from the contracts you upload.
          </p>
        </div>
      </Panel>

      <Panel
        title="3. Documents, and why we ask"
        aside={
          <Button size="sm" onClick={() => {
              attach(SAMPLE_FILES);
              set({ files: { ...d.files, ...SAMPLE_FILES } });
            }} data-testid="credit-apply-sample-docs">
            Attach sample documents (demo)
          </Button>
        }
      >
        <ul className="divide-y divide-line">
          {DOCUMENT_REQUIREMENTS.map((r) => (
            <li key={r.type} className="grid gap-2 py-3 first:pt-0 sm:grid-cols-[1fr_auto] sm:items-center" data-testid={`credit-doc-${r.type}`}>
              <div>
                <p className="text-sm font-medium text-ink">
                  {r.label} {r.required ? null : <span className="font-normal text-ink-subtle">(optional)</span>}
                </p>
                <p className="text-sm text-ink-muted">{r.whyItMatters}</p>
                <p className="text-xs text-ink-subtle">{r.hint}</p>
              </div>
              <div className="flex items-center gap-2 text-sm sm:justify-end">
                {d.files[r.type] ? (
                  <>
                    <Badge tone="positive">{d.files[r.type]}</Badge>
                    <Button size="sm" variant="quiet" onClick={() => setFile(r.type, undefined)}>
                      Remove
                    </Button>
                  </>
                ) : (
                  <label className={buttonClass("secondary", "sm", "cursor-pointer")}>
                    Upload
                    <input type="file" className="sr-only" onChange={(e) => setFile(r.type, e.target.files?.[0]?.name)} />
                  </label>
                )}
              </div>
            </li>
          ))}
        </ul>
        {errors.documents && <p className="mt-3 text-sm text-negative">{errors.documents}</p>}
        <p className="mt-3 text-xs text-ink-muted">Demo: files stay in your browser; only their names are recorded.</p>
      </Panel>

      <Panel title="4. Consent and submit">
        <div className="space-y-4">
          <Checkbox
            label="I consent to a SIMAH commercial credit report being pulled for this company."
            hint="It is the last and most expensive check, run only if the earlier checks pass."
            checked={d.simahConsent}
            onChange={(e) => set({ simahConsent: e.target.checked })}
            data-testid="credit-apply-simah-consent"
          />
          {errors.simahConsent && <p className="text-sm text-negative">{errors.simahConsent}</p>}
          <Checkbox
            label="The documents are genuine, complete and current."
            checked={d.declarationAccepted}
            onChange={(e) => set({ declarationAccepted: e.target.checked })}
            data-testid="credit-apply-declaration"
          />
          {errors.declaration && <p className="text-sm text-negative">{errors.declaration}</p>}
          <p className="text-sm text-ink-muted">
            What happens next: documents are read and checked automatically (simulated AI), then an independent credit manager reviews the file and decides. You can follow every step on the Credit page.
          </p>
          <Button type="submit" variant="primary" data-testid="credit-apply-submit">
            Submit credit application
          </Button>
        </div>
      </Panel>
    </form>
  );
}
