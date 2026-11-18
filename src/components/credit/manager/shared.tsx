import type { CreditCase } from "@/domain/types";
import { Badge, type Tone } from "@/components/ui";

const STATUS: Record<CreditCase["status"], { text: string; tone: Tone }> = {
  draft: { text: "Draft", tone: "neutral" },
  submitted: { text: "New", tone: "info" },
  documents_review: { text: "Checks to run", tone: "info" },
  in_assessment: { text: "Ready to decide", tone: "caution" },
  more_info_requested: { text: "Waiting on contractor", tone: "neutral" },
  approved: { text: "Approved", tone: "positive" },
  declined: { text: "Declined", tone: "negative" },
};

export function CaseStatus({ status }: { status: CreditCase["status"] }) {
  return (
    <span data-testid="credit-case-status" data-status={status}>
      <Badge tone={STATUS[status].tone}>{STATUS[status].text}</Badge>
    </span>
  );
}

export const shortDate = (iso?: string) => (iso ? iso.slice(0, 10) : "");
