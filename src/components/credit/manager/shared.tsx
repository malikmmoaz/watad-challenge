"use client";

import type { CreditCase } from "@/domain/types";
import { Badge } from "@/components/ui";
import { credit } from "@/i18n/credit";
import { useFormat, useMessages } from "@/i18n/locale";
import { CREDIT_CASE_STATUS } from "@/lib/status";

export function CaseStatus({ status }: { status: CreditCase["status"] }) {
  const m = useMessages(credit);
  return (
    <span data-testid="credit-case-status" data-status={status}>
      <Badge tone={CREDIT_CASE_STATUS[status].tone}>{m.caseStatus[status]}</Badge>
    </span>
  );
}

/** A date in the reader's locale, or nothing. */
export function useShortDate() {
  const f = useFormat();
  return (iso?: string) => (iso ? f.date(iso) : "");
}
