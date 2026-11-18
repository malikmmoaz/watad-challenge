"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { getState, update } from "@/store";

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
  const setFile = (type: CreditDocumentType, name: string | undefined) =>
    setD((prev) => ({ ...prev, files: { ...prev.files, [type]: name } }));

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
    router.push(`/contractor/credit#${c.id}`);
  };

  const backlog = contractor.activeProjects.reduce((sum, p) => sum + p.contractValue * (1 - p.percentComplete / 100), 0);

  return (
    <form onSubmit={submit} noValidate className="space-y-8" data-testid="credit-apply-form">
      <section className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5 sm:grid-cols-2">
        <h2 className="text-lg font-semibold sm:col-span-2">1. What you need</h2>
        <label className="block text-sm">
          <span className="font-medium">Requested credit cap (SAR)</span>
          <input
            type="number"
            inputMode="numeric"
            min={CAP_LIMITS.min / 100}
            max={CAP_LIMITS.max / 100}
            step={10_000}
            value={Number.isNaN(d.requestedCapSar) ? "" : d.requestedCapSar}
            onChange={(e) => set({ requestedCapSar: e.target.valueAsNumber })}
            data-testid="credit-apply-cap"
            className="mt-1 w-full rounded border border-neutral-300 p-2 tabular-nums"
            aria-invalid={!!errors.requestedCap}
          />
          <span className="mt-1 block text-xs text-neutral-600">
            Drawn per purchase order; each supplier is paid directly. Between {formatSar(CAP_LIMITS.min)} and {formatSar(CAP_LIMITS.max)}.
          </span>
          {errors.requestedCap && <span className="text-xs text-red-700">{errors.requestedCap}</span>}
        </label>
        <fieldset className="text-sm">
          <legend className="font-medium">Repayment term per purchase order</legend>
          <div className="mt-1 flex gap-2">
            {TENORS.map((t) => (
              <label key={t} className={`cursor-pointer rounded border px-3 py-2 ${d.tenorDays === t ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300"}`}>
                <input type="radio" name="tenor" value={t} checked={d.tenorDays === t} onChange={() => set({ tenorDays: t as Tenor })} className="sr-only" />
                {t} days
              </label>
            ))}
          </div>
          <span className="mt-1 block text-xs text-neutral-600">A fixed Murabaha markup is agreed per order; it is shown with its APR before you confirm.</span>
        </fieldset>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium">What the materials are for</span>
          <input
            value={d.purpose}
            onChange={(e) => set({ purpose: e.target.value })}
            placeholder="e.g. Rebar and ready-mix for Al Narjis Schools, phase 2"
            data-testid="credit-apply-purpose"
            className="mt-1 w-full rounded border border-neutral-300 p-2"
            aria-invalid={!!errors.purpose}
          />
          {errors.purpose && <span className="text-xs text-red-700">{errors.purpose}</span>}
        </label>
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold">2. Company and contracts in hand</h2>
        <p className="text-sm text-neutral-700">
          {contractor.name} · CR {contractor.crNumber} · {contractor.city} · classification grade {contractor.classificationGrade} · {contractor.yearsOperating} years operating
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-neutral-600">
              <tr>
                <th className="py-1 pr-4 font-medium">Project</th>
                <th className="py-1 pr-4 font-medium">Payer</th>
                <th className="py-1 pr-4 font-medium">Payer type</th>
                <th className="py-1 pr-4 text-right font-medium">Contract value</th>
                <th className="py-1 text-right font-medium">Complete</th>
              </tr>
            </thead>
            <tbody>
              {contractor.activeProjects.map((p) => (
                <tr key={p.id} className="border-t border-neutral-100">
                  <td className="py-1.5 pr-4">{p.name}</td>
                  <td className="py-1.5 pr-4">{p.payer.name}</td>
                  <td className="py-1.5 pr-4">{PAYER_LABEL[p.payer.type]}</td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">{formatSar(p.contractValue)}</td>
                  <td className="py-1.5 text-right tabular-nums">{p.percentComplete}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-600">
          Remaining backlog about {formatSar(sar(backlog / 100))}. Who pays you matters: government and listed payers lower the risk; retention terms are read from the contracts you upload.
        </p>
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">3. Documents, and why we ask</h2>
          <button
            type="button"
            onClick={() => set({ files: { ...SAMPLE_FILES } })}
            data-testid="credit-apply-sample-docs"
            className="rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-900"
          >
            Attach sample documents (demo)
          </button>
        </div>
        <ul className="divide-y divide-neutral-100">
          {DOCUMENT_REQUIREMENTS.map((r) => (
            <li key={r.type} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center" data-testid={`credit-doc-${r.type}`}>
              <div>
                <p className="text-sm font-medium">
                  {r.label} {r.required ? <span className="text-red-700">*</span> : <span className="font-normal text-neutral-500">(optional)</span>}
                </p>
                <p className="text-sm text-neutral-700">{r.whyItMatters}</p>
                <p className="text-xs text-neutral-500">{r.hint}</p>
              </div>
              <div className="text-sm sm:text-right">
                {d.files[r.type] ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="text-emerald-700">✓ {d.files[r.type]}</span>
                    <button type="button" onClick={() => setFile(r.type, undefined)} className="text-xs text-neutral-600 underline">
                      Remove
                    </button>
                  </span>
                ) : (
                  <label className="cursor-pointer rounded border border-neutral-300 px-2.5 py-1 hover:bg-neutral-50">
                    Upload
                    <input type="file" className="sr-only" onChange={(e) => setFile(r.type, e.target.files?.[0]?.name)} />
                  </label>
                )}
              </div>
            </li>
          ))}
        </ul>
        {errors.documents && <p className="text-sm text-red-700">{errors.documents}</p>}
        <p className="text-xs text-neutral-600">Demo: files stay in your browser; only their names are recorded.</p>
      </section>

      <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-5 text-sm">
        <h2 className="text-lg font-semibold">4. Consent and submit</h2>
        <label className="flex gap-2">
          <input type="checkbox" checked={d.simahConsent} onChange={(e) => set({ simahConsent: e.target.checked })} data-testid="credit-apply-simah-consent" />
          <span>
            I consent to a SIMAH commercial credit report being pulled for this company. It is the last and most expensive check, run only if the earlier checks pass.
          </span>
        </label>
        {errors.simahConsent && <p className="text-red-700">{errors.simahConsent}</p>}
        <label className="flex gap-2">
          <input type="checkbox" checked={d.declarationAccepted} onChange={(e) => set({ declarationAccepted: e.target.checked })} data-testid="credit-apply-declaration" />
          <span>The documents are genuine, complete and current.</span>
        </label>
        {errors.declaration && <p className="text-red-700">{errors.declaration}</p>}
        <p className="text-neutral-600">
          What happens next: documents are read and checked automatically (simulated AI), then an independent credit manager reviews the file and decides. You can follow every step here.
        </p>
        <button type="submit" data-testid="credit-apply-submit" className="rounded bg-neutral-900 px-4 py-2 font-medium text-white">
          Submit application
        </button>
      </section>
    </form>
  );
}
