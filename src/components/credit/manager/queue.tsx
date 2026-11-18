"use client";

import Link from "next/link";
import { useMemo } from "react";
import { applicantName, reference } from "@/data";
import { formatSar } from "@/domain/money";
import type { CreditCase } from "@/domain/types";
import { useDemo } from "@/store";
import { EmptyState, LoadingRows, Table, Td, Th, THead, Tr } from "@/components/ui";
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
  if (!hydrated) return <LoadingRows rows={6} label="Loading credit applications" />;
  if (cases.length === 0) {
    return (
      <EmptyState title="No applications in the queue">
        When a contractor applies for a credit cap, the application lands here with its documents. Use Reset demo data to bring back the sample cases.
      </EmptyState>
    );
  }
  return (
    <Table caption="Credit applications" minWidth={760}>
      <THead>
        <tr>
          <Th>Application</Th>
          <Th>Applicant</Th>
          <Th align="end">Requested cap</Th>
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
              <Link href={`/credit/cases/${c.id}`} className="font-mono text-xs text-stamp underline underline-offset-[3px]">
                {c.id}
              </Link>
            </Td>
            <Td>{applicantName(c.contractorId, reference.contractors)}</Td>
            <Td align="end">{formatSar(c.requestedCap)}</Td>
            <Td align="end">{c.requestedTenorDays} days</Td>
            <Td align="end">{c.scorecard ? `${Math.round(c.scorecard.total)} · ${c.scorecard.band}` : "Not scored"}</Td>
            <Td>
              <CaseStatus status={c.status} />
            </Td>
            <Td>{shortDate(c.submittedAt)}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
