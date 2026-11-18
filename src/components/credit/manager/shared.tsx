import { BAND_FLOORS } from "@/domain/credit/scorecard";
import type { CreditCase } from "@/domain/types";
import { Badge, type Band, type Tone } from "@/components/ui";

/** Bands as the engine defines them (A-D). */
export const ENGINE_BANDS: Band[] = [
  { name: "D", from: BAND_FLOORS.D, color: "bg-band-e", meaning: "Decline" },
  { name: "C", from: BAND_FLOORS.C, color: "bg-band-c", meaning: "Approve with conditions" },
  { name: "B", from: BAND_FLOORS.B, color: "bg-band-b", meaning: "Approve" },
  { name: "A", from: BAND_FLOORS.A, color: "bg-band-a", meaning: "Approve" },
];

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
