"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { reference, demoPersona } from "@/data";
import { formatSar, murabaha } from "@/domain/money";
import type { Halalas, OrgId } from "@/domain/types";
import { useDemo } from "@/store";
import { CreditCapMeter, EmptyState, Facts, PageHeader, Panel, SampleDataLabel, Select } from "@/components/ui";
import { ApplicationTracker } from "./application-tracker";

const fmt = (n: number) => formatSar(n as Halalas);

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
      <PageHeader
        title="Credit"
        status={<SampleDataLabel />}
        meta="Buy materials now and pay in 30 to 90 days. The platform pays the supplier directly; you repay the order total plus a fixed Murabaha markup."
        actions={
          isPersona ? (
            <Link
              href="/contractor/credit/apply"
              data-testid="credit-apply-start"
              className="inline-flex h-10 items-center rounded-md bg-action px-4 text-sm font-medium text-on-action hover:bg-action-hover"
            >
              {facility ? "Apply for a higher cap" : "Apply for a credit cap"}
            </Link>
          ) : undefined
        }
      />

      <div className="max-w-sm">
        <Select
          label="Sample contractor"
          hint={isPersona ? "You are signed in as this contractor." : "Read-only preview of another sample contractor's applications."}
          value={contractorId}
          onChange={(e) => setContractorId(e.target.value as OrgId)}
          data-testid="credit-contractor-select"
        >
          {reference.contractors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.id === demoPersona.contractor ? " (you)" : ""}
            </option>
          ))}
        </Select>
      </div>

      {facility && (
        <div data-testid="credit-facility">
          <Panel title="Your credit cap">
            <div className="space-y-5">
              <CreditCapMeter cap={facility.cap} drawn={facility.drawn} format={fmt} />
              <Facts
                columns={3}
                items={[
                  { label: "Available", value: formatSar(facility.available) },
                  {
                    label: `Murabaha markup, ${facility.maxTenorDays} days`,
                    value: `${(facility.profitRate * 100).toFixed(2)}% (APR ${(murabaha(facility.cap, facility.profitRate, facility.maxTenorDays).apr * 100).toFixed(1)}%)`,
                  },
                  { label: `Band ${facility.band} · review due`, value: facility.reviewDue },
                ]}
              />
              {facility.conditions.length > 0 && <p className="text-sm text-ink-muted">Conditions: {facility.conditions.join("; ")}</p>}
            </div>
          </Panel>
        </div>
      )}

      {cases.length === 0 ? (
        <EmptyState title="No credit applications yet">{contractor?.name} has not applied for a credit cap.</EmptyState>
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
