"use client";

import Link from "next/link";
import { useMemo } from "react";
import { applicantName, reference } from "@/data";
import { formatSar } from "@/domain/money";
import type { CreditCase } from "@/domain/types";
import { useDemo } from "@/store";
import { CellNote, EmptyState, LoadingRows, StatStrip, Table, Td, Th, THead, Tr } from "@/components/ui";
import { useToday } from "../use-today";
import { useHydrated } from "../client-state";
import { CaseStatus, shortDate } from "./shared";

const ORDER: Record<CreditCase["status"], number> = { in_assessment: 0, documents_review: 1, submitted: 2, more_info_requested: 3, draft: 4, approved: 5, declined: 6 };

/** Applications waiting for the credit manager, the ones needing a decision first. */
export function CreditQueue() {
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
      { label: "Waiting for you", value: String(waiting.length), note: "New, documents in review or in assessment" },
      { label: "In assessment", value: String(all.filter((c) => c.status === "in_assessment").length), note: "Ready for your decision" },
      { label: "Approved this month", value: String(all.filter((c) => c.status === "approved" && c.decision?.decidedAt.slice(0, 7) === month).length) },
      { label: "Total requested", value: formatSar(waiting.reduce((sum, c) => sum + c.requestedCap, 0) as typeof all[number]["requestedCap"]), note: "Across applications waiting for you", compact: true },
    ];
  }, [all, month]);
  if (!hydrated) return <LoadingRows rows={6} label="Loading credit applications" />;
  if (cases.length === 0) {
    return (
      <EmptyState title="No applications in the queue">
        When a contractor applies for a credit cap, the application lands here with its documents. Use Reset demo data to bring back the sample cases.
      </EmptyState>
    );
  }
  return (
    <div className="space-y-8">
      <div data-testid="credit-queue-stats">
        <StatStrip items={stats} />
      </div>
      <Table caption="Credit applications" minWidth={760}>
        <THead>
          <tr>
            <Th>Applicant</Th>
            <Th align="end">Requested credit cap</Th>
            <Th align="end">Term</Th>
            <Th align="end">Score</Th>
            <Th>Status</Th>
            <Th>Submitted</Th>
          </tr>
        </THead>
        <tbody>
          {cases.map((c) => (
            <Tr key={c.id} data-testid={`credit-queue-row-${c.id}`}>
              <Td>
                <Link href={`/credit/cases/${c.id}`} className="font-medium text-stamp underline underline-offset-[3px]">
                  {applicantName(c.contractorId, reference.contractors)}
                </Link>
                <CellNote>
                  <span className="font-mono">{c.id}</span>
                </CellNote>
              </Td>
              <Td align="end">{formatSar(c.requestedCap)}</Td>
              <Td align="end">{c.requestedTenorDays} days</Td>
              <Td align="end">{c.scorecard ? <span className="font-semibold tabular-nums text-ink">{Math.round(c.scorecard.total)}<span className="font-normal text-ink-muted"> · band {c.scorecard.band}</span></span> : <CellNote>Not scored</CellNote>}</Td>
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
