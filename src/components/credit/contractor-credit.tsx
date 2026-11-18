"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { reference, demoPersona } from "@/data";
import { availableCredit } from "@/domain/credit/facility";
import { formatSar, murabaha } from "@/domain/money";
import type { Halalas, OrgId } from "@/domain/types";
import { useDemo } from "@/store";
import { Alert, buttonClass, CreditCapMeter, EmptyState, Facts, LoadingRows, PageHeader, Panel, SampleDataLabel, Select } from "@/components/ui";
import { useHash, useHydrated } from "./client-state";
import { ApplicationTracker } from "./application-tracker";
import { DrawLedger } from "./draw-ledger";

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
  const hydrated = useHydrated();
  const hash = useHash();
  const justSubmitted = cases.find((c) => c.id === hash && c.status === "submitted");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contractor"
        title="Credit"
        status={<SampleDataLabel />}
        meta="Buy materials now and pay in 30 to 90 days. The platform pays the supplier directly; you repay the order total plus a fixed Murabaha markup."
        actions={
          isPersona ? (
            <Link
              href="/contractor/credit/apply"
              data-testid="credit-apply-start"
              className={buttonClass("primary")}
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

      {!hydrated ? (
        <LoadingRows rows={4} label="Loading your credit" />
      ) : (
        <>
          {justSubmitted && (
            <div data-testid="credit-submitted">
              <Alert tone="positive" title={`Application ${justSubmitted.id.replace("cc_", "#")} submitted`}>
                Next, your documents are read and the checks run cheapest first, SIMAH last. An independent credit manager then decides. Every step shows below.
              </Alert>
            </div>
          )}
          {!facility && cases.length > 0 && (
            <p className="text-sm text-ink-muted">No credit cap yet. Once an application is approved, your cap and every draw appear here.</p>
          )}
          {facility && (
            <div data-testid="credit-facility">
              <Panel title="Your credit cap">
                <div className="space-y-5">
                  <CreditCapMeter cap={facility.cap} drawn={facility.drawn} format={fmt} />
                  <Facts
                    columns={3}
                    items={[
                      { label: "Available", value: formatSar(availableCredit(facility)) },
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

          {facility && <DrawLedger contractorId={contractorId} readOnly={!isPersona} />}

          {cases.length === 0 ? (
            <EmptyState
          title="No credit applications yet"
          action={
            isPersona ? (
              <Link href="/contractor/credit/apply" className="text-sm font-medium text-stamp underline underline-offset-[3px]">
                Apply for a credit cap
              </Link>
            ) : undefined
          }
        >
          {contractor?.name} has not applied for a credit cap. With one, suppliers are paid directly and you repay in 30 to 90 days with a fixed Murabaha markup.
        </EmptyState>
          ) : (
            <div className="space-y-4">
              {cases.map((c) => (
                <div key={c.id} id={c.id}>
                  <ApplicationTracker c={c} facility={facility?.creditCaseId === c.id ? facility : undefined} readOnly={!isPersona} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
