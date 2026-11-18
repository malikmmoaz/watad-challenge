import type { Tone } from "@/components/ui";
import type { CreditCaseStatus, GateResult, PoStatus, RfqStatus } from "@/domain/types";

type Label = { label: string; tone: Tone };

/** One vocabulary for every role: the same status reads the same everywhere. */
export const RFQ_STATUS: Record<RfqStatus, Label> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Waiting for offers", tone: "info" },
  offers_received: { label: "Offers received", tone: "positive" },
  awarded: { label: "PO placed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "negative" },
  expired: { label: "Closed, no offer chosen", tone: "neutral" },
};

export const PO_STATUS: Record<PoStatus, Label> = {
  placed: { label: "PO placed", tone: "info" },
  confirmed: { label: "Confirmed by supplier", tone: "info" },
  dispatched: { label: "Out for delivery", tone: "info" },
  delivered: { label: "Delivered", tone: "positive" },
  invoiced: { label: "Invoiced", tone: "neutral" },
  paid: { label: "Paid", tone: "positive" },
  cancelled: { label: "Cancelled", tone: "negative" },
};

export const CREDIT_CASE_STATUS: Record<CreditCaseStatus, Label> = {
  draft: { label: "Draft", tone: "neutral" },
  submitted: { label: "New application", tone: "info" },
  documents_review: { label: "Documents in review", tone: "info" },
  in_assessment: { label: "In assessment", tone: "caution" },
  more_info_requested: { label: "More information requested", tone: "caution" },
  approved: { label: "Approved", tone: "positive" },
  declined: { label: "Declined", tone: "negative" },
};

export const GATE_RESULT: Record<GateResult, Label> = {
  pass: { label: "Pass", tone: "positive" },
  flag: { label: "Flag", tone: "caution" },
  fail: { label: "Fail", tone: "negative" },
  pending: { label: "Pending", tone: "neutral" },
};
