"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { reference, demoPersona } from "@/data";
import { formatSar, murabaha } from "@/domain/money";
import type { OrgId } from "@/domain/types";
import { useDemo } from "@/store";
import { ApplicationTracker } from "./application-tracker";

/** Contractor credit home: facility summary, application trackers, and a way to apply. */
export function ContractorCredit() {
  const allCases = useDemo((s) => s.creditCases);
  const facilities = useDemo((s) => s.creditFacilities);
  const [contractorId, setContractorId] = useState<OrgId>(demoPersona.contractor as OrgId);
  const contractor = reference.contractors.find((c) => c.id === contractorId);
  const cases = useMemo(
    () => allCases.filter((c) => c.contractorId === contractorId).sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "")),
    [allCases, contractorId],
  );
  const facility = facilities.find((f) => f.contractorId === contractorId);
  const isPersona = contractorId === demoPersona.contractor;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Credit</h1>
          <p className="text-neutral-700">
            Buy materials now and pay in 30 to 90 days. The platform pays the supplier directly; you repay the price plus a fixed Murabaha markup.
          </p>
        </div>
        {isPersona && (
          <Link href="/contractor/credit/apply" data-testid="credit-apply-start" className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
            {facility ? "Apply for a higher cap" : "Apply for a credit cap"}
          </Link>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <span>Sample contractor</span>
        <select
          value={contractorId}
          onChange={(e) => setContractorId(e.target.value as OrgId)}
          data-testid="credit-contractor-select"
          className="rounded border border-neutral-300 bg-white px-2 py-1"
        >
          {reference.contractors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.id === demoPersona.contractor ? " (you)" : ""}
            </option>
          ))}
        </select>
        {!isPersona && <span className="text-xs text-neutral-500">Read-only preview of another sample contractor&apos;s application.</span>}
      </label>

      {facility && (
        <section className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-5 sm:grid-cols-4" data-testid="credit-facility">
          <Stat label="Credit cap" value={formatSar(facility.cap)} />
          <Stat label="Available" value={formatSar(facility.available)} />
          <Stat label="Drawn on open orders" value={formatSar(facility.drawn)} />
          <Stat
            label={`Murabaha markup, ${facility.maxTenorDays} days`}
            value={`${(facility.profitRate * 100).toFixed(2)}% · APR ${(murabaha(facility.cap, facility.profitRate, facility.maxTenorDays).apr * 100).toFixed(1)}%`}
          />
          <p className="text-xs text-neutral-600 sm:col-span-4">
            Band {facility.band} · review due {facility.reviewDue}
            {facility.conditions.length > 0 ? ` · ${facility.conditions.join("; ")}` : ""}
          </p>
        </section>
      )}

      {cases.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-neutral-700">
          {contractor?.name} has no credit applications yet.
        </p>
      ) : (
        <div className="space-y-4">
          {cases.map((c) => (
            <div key={c.id} id={c.id}>
              <ApplicationTracker c={c} facility={facility?.creditCaseId === c.id ? facility : undefined} readOnly={!isPersona} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-neutral-600">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
