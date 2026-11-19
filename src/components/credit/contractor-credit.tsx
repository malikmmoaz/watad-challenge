"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { reference, demoPersona } from "@/data";
import { availableCredit } from "@/domain/credit/facility";
import { murabaha } from "@/domain/money";
import type { Halalas, OrgId } from "@/domain/types";
import { useDemo } from "@/store";
import { Alert, buttonClass, CreditCapMeter, StatStrip, EmptyState, Facts, LoadingRows, PageHeader, Panel, SampleDataLabel, Select } from "@/components/ui";
import { useHash, useHydrated } from "./client-state";
import { ApplicationTracker } from "./application-tracker";
import { DrawLedger } from "./draw-ledger";
import { seedText } from "./data-text";
import { useToday } from "./use-today";
import { utilisation } from "@/domain/credit/draws";
import { fill } from "@/i18n/core";
import { credit } from "@/i18n/credit";
import { useFormat, useLocale, useMessages } from "@/i18n/locale";


/** Contractor credit home: facility summary, application trackers, and a way to apply. */
export function ContractorCredit() {
  const all = useMessages(credit);
  const m = all.page;
  const f = useFormat();
  const locale = useLocale();
  const fmt = (n: number) => f.money(n as Halalas);
  const nameOf = (c?: (typeof reference.contractors)[number]) => (c ? ((locale === "ar" ? c.nameAr : undefined) ?? c.name) : "");
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
  const today = useToday();
  const pos = useDemo((s) => s.purchaseOrders);
  const use = facility ? utilisation(facility, pos, today) : { openDraws: 0, nextDue: undefined };
  const hash = useHash();
  const justSubmitted = cases.find((c) => c.id === hash && c.status === "submitted");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={m.eyebrow}
        title={m.title}
        status={<SampleDataLabel />}
        meta={m.intro}
        actions={
          isPersona ? (
            <Link
              href="/contractor/credit/apply"
              data-testid="credit-apply-start"
              className={buttonClass("primary")}
            >
              {facility ? m.applyHigher : m.applyFirst}
            </Link>
          ) : undefined
        }
      />


      {!hydrated ? (
        <LoadingRows rows={4} label={m.loading} />
      ) : (
        <>
          {justSubmitted && (
            <div data-testid="credit-submitted">
              <Alert tone="positive" title={fill(m.submittedTitle, { n: justSubmitted.id.replace("cc_", "#") })}>
                {m.submittedBody}
              </Alert>
            </div>
          )}
          {!facility && cases.length > 0 && (
            <p className="text-sm text-ink-muted">{m.noCapYet}</p>
          )}
          {facility && (
            <div data-testid="credit-figures">
              <StatStrip
                items={[
                  { label: m.capLeft, value: f.money(availableCredit(facility)), note: fill(m.ofCap, { cap: f.money(facility.cap) }), compact: true },
                  { label: m.drawnOpen, value: f.money(facility.drawn), note: use.openDraws === 1 ? m.openOrdersOne : fill(m.openOrdersOther, { n: use.openDraws }), compact: true },
                  {
                    label: m.nextRepayment,
                    value: use.nextDue ? f.money(use.nextDue.amount) : m.noneDue,
                    note: use.nextDue ? fill(m.dueOn, { date: f.date(use.nextDue.dueDate) }) : m.nothingOutstanding,
                    compact: true,
                  },
                  { label: m.band, value: facility.band, note: fill(m.reviewDue, { date: f.date(facility.reviewDue) }) },
                ]}
              />
            </div>
          )}
          {facility && (
            <div data-testid="credit-facility">
              <Panel title={m.capPanel}>
                <div className="space-y-5">
                  <CreditCapMeter cap={facility.cap} drawn={facility.drawn} format={fmt} barOnly />
                  <Facts
                    columns={2}
                    items={[
                      {
                        label: fill(m.markupFor, { days: facility.maxTenorDays }),
                        value: fill(m.markupValue, { rate: f.percent(facility.profitRate, 2), apr: f.percent(murabaha(facility.cap, facility.profitRate, facility.maxTenorDays).apr, 1) }),
                      },
                      { label: m.supplierPayment, value: m.paidDirectly },
                    ]}
                  />
                  {facility.conditions.length > 0 && <p className="text-sm text-ink-muted">{fill(m.conditions, { list: facility.conditions.map((x) => seedText(x, credit.en as never, all)).join(locale === "ar" ? "؛ " : "; ") })}</p>}
                </div>
              </Panel>
            </div>
          )}

          {facility && <DrawLedger contractorId={contractorId} readOnly={!isPersona} />}

          {cases.length === 0 ? (
            <EmptyState
          title={m.noApplicationsTitle}
          action={
            isPersona ? (
              <Link href="/contractor/credit/apply" className="text-sm font-medium text-stamp underline underline-offset-[3px]">
                {m.applyFirst}
              </Link>
            ) : undefined
          }
        >
          {fill(m.noApplications, { name: nameOf(contractor) })}
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

      <div className="max-w-sm border-t border-line pt-6">
        <Select
          label={m.previewLabel}
          hint={isPersona ? m.previewYou : m.previewOther}
          value={contractorId}
          onChange={(e) => setContractorId(e.target.value as OrgId)}
          data-testid="credit-contractor-select"
        >
          {reference.contractors.map((c) => (
            <option key={c.id} value={c.id}>
              {nameOf(c)}
              {c.id === demoPersona.contractor ? ` ${m.you}` : ""}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
