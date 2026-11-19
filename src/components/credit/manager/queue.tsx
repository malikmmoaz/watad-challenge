"use client";

import Link from "next/link";
import { useMemo } from "react";
import { applicantName, demoPersona, reference } from "@/data";
import type { CreditCase } from "@/domain/types";
import { useDemo } from "@/store";
import { CellNote, EmptyState, LoadingRows, PageHeader, SampleDataLabel, StatStrip, Table, Td, Th, THead, Tr } from "@/components/ui";
import { fill } from "@/i18n/core";
import { credit } from "@/i18n/credit";
import { useFormat, useLocale, useMessages } from "@/i18n/locale";
import { applicantText, personName } from "../data-text";
import { useToday } from "../use-today";
import { useHydrated } from "../client-state";
import { CaseStatus, useShortDate } from "./shared";

const ORDER: Record<CreditCase["status"], number> = { in_assessment: 0, documents_review: 1, submitted: 2, more_info_requested: 3, draft: 4, approved: 5, declined: 6 };

/** The credit manager's landing page: header, key figures and the queue. */
export function CreditQueuePage() {
  const all = useMessages(credit);
  const m = all.queue;
  return (
    <div className="space-y-6">
      <PageHeader title={m.title} status={<SampleDataLabel />} meta={fill(m.intro, { manager: personName(demoPersona.credit, credit.en as never, all) })} />
      <CreditQueue />
    </div>
  );
}

/** Applications waiting for the credit manager, the ones needing a decision first. */
export function CreditQueue() {
  const msgs = useMessages(credit);
  const m = msgs.queue;
  const f = useFormat();
  const locale = useLocale();
  const shortDate = useShortDate();
  const nameOf = (id: string) => (locale === "ar" ? reference.contractors.find((c) => c.id === id)?.nameAr : undefined) ?? applicantText(applicantName(id, reference.contractors), credit.en as never, msgs);
  const all = useDemo((s) => s.creditCases);
  const cases = useMemo(
    () => [...all].sort((a, b) => ORDER[a.status] - ORDER[b.status] || (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "")),
    [all],
  );
  const hydrated = useHydrated();
  const month = useToday().slice(0, 7);
  const stats = useMemo(() => {
    const waiting = all.filter((c) => c.status === "submitted" || c.status === "documents_review" || c.status === "in_assessment");
    return [
      { label: m.waiting, value: f.number(waiting.length), note: m.waitingNote },
      { label: m.inAssessment, value: f.number(all.filter((c) => c.status === "in_assessment").length), note: m.inAssessmentNote },
      { label: m.approvedMonth, value: f.number(all.filter((c) => c.status === "approved" && c.decision?.decidedAt.slice(0, 7) === month).length) },
      { label: m.totalRequested, value: f.money(waiting.reduce((sum, c) => sum + c.requestedCap, 0) as typeof all[number]["requestedCap"]), note: m.totalRequestedNote, compact: true },
    ];
  }, [all, month, m, f]);
  if (!hydrated) return <LoadingRows rows={6} label={m.loading} />;
  if (cases.length === 0) {
    return (
      <EmptyState title={m.emptyTitle}>{m.empty}</EmptyState>
    );
  }
  return (
    <div className="space-y-8">
      <div data-testid="credit-queue-stats">
        <StatStrip items={stats} />
      </div>
      <Table caption={m.caption} minWidth={760}>
        <THead>
          <tr>
            <Th>{m.colApplicant}</Th>
            <Th align="end">{m.colRequested}</Th>
            <Th align="end">{m.colTerm}</Th>
            <Th align="end">{m.colScore}</Th>
            <Th>{m.colStatus}</Th>
            <Th>{m.colSubmitted}</Th>
          </tr>
        </THead>
        <tbody>
          {cases.map((c) => (
            <Tr key={c.id} data-testid={`credit-queue-row-${c.id}`}>
              <Td>
                <Link href={`/credit/cases/${c.id}`} className="font-medium text-stamp underline underline-offset-[3px]">
                  {nameOf(c.contractorId)}
                </Link>
                <CellNote>
                  <span className="font-mono">{c.id}</span>
                </CellNote>
              </Td>
              <Td align="end">{f.money(c.requestedCap)}</Td>
              <Td align="end">{fill(m.termDays, { days: c.requestedTenorDays })}</Td>
              <Td align="end">{c.scorecard ? <span className="font-semibold tabular-nums text-ink">{Math.round(c.scorecard.total)}<span className="font-normal text-ink-muted"> · {fill(m.band, { band: c.scorecard.band })}</span></span> : <CellNote>{m.notScored}</CellNote>}</Td>
              <Td>
                <CaseStatus status={c.status} />
              </Td>
              <Td>{shortDate(c.submittedAt)}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
