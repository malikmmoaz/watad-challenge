import { describe, expect, it } from "vitest";
import { creditCases } from "@/data";
import {
  DOCUMENT_REQUIREMENTS,
  buildSubmittedCase,
  missingRequiredDocuments,
  nextCaseId,
  provideMoreInfo,
  trackerSteps,
  validateDraft,
  type ApplicationDraft,
} from "./credit-application";
import type { CreditCase, CreditCaseId, OrgId } from "./types";

const allRequired = Object.fromEntries(
  DOCUMENT_REQUIREMENTS.filter((r) => r.required).map((r) => [r.type, `${r.type}.pdf`]),
) as ApplicationDraft["files"];

const draft: ApplicationDraft = {
  requestedCapSar: 750_000,
  tenorDays: 60,
  purpose: "Rebar and ready-mix for Al Narjis Schools phase 2",
  files: allRequired,
  simahConsent: true,
  declarationAccepted: true,
};

const opts = {
  id: "cc_504" as CreditCaseId,
  contractorId: "con_najd" as OrgId,
  now: "2026-11-18T15:00:00Z",
  platformHistory: { posPlaced: 0, posPaidOnTime: 0, totalSpend: 0 as CreditCase["platformHistory"]["totalSpend"] },
};

describe("document requirements", () => {
  it("gives every document a reason", () => {
    for (const r of DOCUMENT_REQUIREMENTS) expect(r.whyItMatters.length).toBeGreaterThan(30);
    expect(new Set(DOCUMENT_REQUIREMENTS.map((r) => r.type)).size).toBe(DOCUMENT_REQUIREMENTS.length);
  });

  it("lists missing required documents", () => {
    expect(missingRequiredDocuments({ cr: "cr.pdf" }).map((r) => r.type)).not.toContain("cr");
    expect(missingRequiredDocuments(allRequired)).toEqual([]);
  });
});

describe("validateDraft", () => {
  it("accepts a complete draft", () => {
    expect(validateDraft(draft)).toEqual({});
  });

  it("rejects a cap outside SAR 50,000 to 10,000,000", () => {
    expect(validateDraft({ ...draft, requestedCapSar: 10_000 }).requestedCap).toBeDefined();
    expect(validateDraft({ ...draft, requestedCapSar: 20_000_000 }).requestedCap).toBeDefined();
    expect(validateDraft({ ...draft, requestedCapSar: Number.NaN }).requestedCap).toBeDefined();
  });

  it("requires documents, purpose, SIMAH consent and the declaration", () => {
    const e = validateDraft({ ...draft, purpose: "x", files: {}, simahConsent: false, declarationAccepted: false });
    expect(Object.keys(e).sort()).toEqual(["declaration", "documents", "purpose", "simahConsent"]);
    expect(e.documents).toContain("Commercial Registration");
  });
});

describe("buildSubmittedCase", () => {
  it("creates a submitted case with pending gates in cheapest-first order", () => {
    const c = buildSubmittedCase(draft, opts);
    expect(c.status).toBe("submitted");
    expect(c.requestedCap).toBe(75_000_000);
    expect(c.gates.map((g) => g.id)).toEqual(["cr", "vat", "bank", "financials", "simah"]);
    expect(c.gates.every((g) => g.result === "pending")).toBe(true);
    expect(c.log[0]).toMatchObject({ actor: "contractor", action: "Application submitted", detail: "7 documents uploaded" });
  });

  it("records SIMAH as to be pulled when no report was uploaded", () => {
    const simah = buildSubmittedCase(draft, opts).documents.find((d) => d.type === "simah_report");
    expect(simah).toMatchObject({ status: "missing" });
  });

  it("refuses an invalid draft", () => {
    expect(() => buildSubmittedCase({ ...draft, simahConsent: false }, opts)).toThrow(/SIMAH/);
  });
});

describe("tracker", () => {
  const states = (c: Pick<CreditCase, "status" | "log">) => trackerSteps(c).map((s) => s.state);

  it("shows checks running right after submission", () => {
    expect(states({ status: "submitted", log: [] })).toEqual(["done", "current", "upcoming", "upcoming", "upcoming"]);
  });

  it("skips the more-info step on a straight decision", () => {
    expect(states({ status: "approved", log: [] })).toEqual(["done", "done", "done", "skipped", "done"]);
  });

  it("highlights a request for more information", () => {
    expect(states({ status: "more_info_requested", log: [] })).toEqual(["done", "done", "done", "current", "upcoming"]);
  });

  it("keeps an answered request visible after the case returns to checks", () => {
    const log = [{ at: "x", actor: "contractor" as const, action: "More information provided" }];
    expect(states({ status: "documents_review", log })).toEqual(["done", "current", "upcoming", "done", "upcoming"]);
  });
});

describe("provideMoreInfo", () => {
  const waiting: CreditCase = { ...buildSubmittedCase(draft, opts), status: "more_info_requested" };

  it("adds the files, logs the answer and returns the case to checks", () => {
    const c = provideMoreInfo(waiting, ["Zakat-2027.pdf"], "Renewed certificate", "2026-11-19T08:00:00Z");
    expect(c.status).toBe("documents_review");
    expect(c.documents.at(-1)?.fileName).toBe("Zakat-2027.pdf");
    expect(c.log.at(-1)).toMatchObject({ action: "More information provided", detail: "Zakat-2027.pdf · Renewed certificate" });
  });

  it("refuses an empty answer or a case that is not waiting", () => {
    expect(() => provideMoreInfo(waiting, [], " ", "t")).toThrow();
    expect(() => provideMoreInfo({ ...waiting, status: "approved" }, ["a.pdf"], "", "t")).toThrow();
  });
});

it("numbers new cases after the seeded ones", () => {
  expect(nextCaseId(creditCases)).toBe("cc_504");
});
