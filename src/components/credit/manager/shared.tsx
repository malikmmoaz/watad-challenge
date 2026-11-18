import type { CreditCase } from "@/domain/types";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { CREDIT_CASE_STATUS } from "@/lib/status";

export function CaseStatus({ status }: { status: CreditCase["status"] }) {
  return (
    <span data-testid="credit-case-status" data-status={status}>
      <Badge tone={CREDIT_CASE_STATUS[status].tone}>{CREDIT_CASE_STATUS[status].label}</Badge>
    </span>
  );
}

export const shortDate = (iso?: string) => (iso ? formatDate(iso) : "");
