/**
 * Decision-log lines are stored in English (they are data, written when the
 * event happens). Show the known actions and detail patterns in the reader's
 * language; anything else (free text a person wrote) is shown as written.
 */
import { fill, type SameShape } from "@/i18n/core";
import { credit } from "@/i18n/credit";
import { seedText } from "./data-text";

type M = SameShape<typeof credit.en>;
type LogKey = keyof M["log"];

const ACTION: Record<string, LogKey> = {
  "Application submitted": "applicationSubmitted",
  "SIMAH consent given": "simahConsent",
  "Documents parsed (simulated)": "documentsParsed",
  "Gated checks run (simulated)": "checksRun",
  "Credit memo drafted (simulated)": "memoDrafted",
  Approved: "approved",
  Declined: "declined",
  "More information requested": "moreInfoRequested",
  "More information provided": "moreInfoProvided",
  "Case opened": "caseOpened",
};

export function logAction(action: string, m: M): string {
  const k = ACTION[action];
  return k ? m.log[k] : action;
}

export function logDetail(detail: string, m: M): string {
  let r: RegExpMatchArray | null;
  if ((r = detail.match(/^(\d+) documents uploaded$/))) return fill(m.log.documentsUploaded, { n: r[1]! });
  if ((r = detail.match(/^(\d+) of (\d+) documents uploaded$/))) return fill(m.log.documentsOfUploaded, { n: r[1]!, total: r[2]! });
  if ((r = detail.match(/^(\d+) fields extracted$/))) return fill(m.log.fieldsExtracted, { n: r[1]! });
  if ((r = detail.match(/^(\d+) pass, (\d+) flag(?:, (\d+) fail)?(?:, (\d+) not run)?$/)))
    return fill(m.log.gatesSummary, { pass: r[1]!, flag: r[2]!, fail: r[3] ?? "0" }) + (r[4] ? fill(m.log.gatesNotRun, { n: r[4] }) : "");
  if ((r = detail.match(/^Proposes (approve|request info|decline)$/))) {
    const o = r[1] === "request info" ? "request_info" : (r[1] as "approve" | "decline");
    return fill(m.log.proposes, { outcome: m.decision.outcomes[o] });
  }
  if ((r = detail.match(/^Credit cap ([\d,]+) SAR, (\d+) days$/))) return fill(m.log.capFor, { amount: r[1]!, days: r[2]! });
  if ((r = detail.match(/^Credit cap raised from ([\d,]+) to ([\d,]+) SAR, (\d+) days$/))) return fill(m.log.capRaised, { from: r[1]!, to: r[2]!, days: r[3]! });
  if ((r = detail.match(/^Credit cap kept at ([\d,]+) SAR, (\d+) days$/))) return fill(m.log.capKept, { amount: r[1]!, days: r[2]! });
  return seedText(detail, credit.en as never, m);
}
