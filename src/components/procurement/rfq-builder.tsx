"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { track } from "@/lib/analytics";
import { demoPersona, reference } from "@/data";
import { formatSar } from "@/domain/money";
import type { City, MaterialCategory, OrgId, PaymentTerms, Rfq, RfqId, RfqLine } from "@/domain/types";
import { SAMPLE_BOQ_FILE, lineIdFor, simulateBoqExtraction, type BoqExtraction } from "@/lib/procurement/boq";
import { CATEGORY_LABELS, CITIES, UNIT_SINGULAR, unitLabel } from "@/lib/procurement/labels";
import { estimateRfqValue } from "@/lib/procurement/shortlist";
import { AiLabel, Badge, Facts, PageHeader, Panel, buttonClass } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { update } from "@/store";

const TERMS: { key: string; label: string; terms: PaymentTerms }[] = [
  { key: "net30", label: "Net 30 days", terms: { kind: "net", days: 30 } },
  { key: "net60", label: "Net 60 days", terms: { kind: "net", days: 60 } },
  { key: "on_delivery", label: "Payment on delivery", terms: { kind: "on_delivery" } },
  { key: "advance", label: "Payment in advance", terms: { kind: "advance" } },
];
const CREDIT_TERMS: PaymentTerms = { kind: "platform_credit", days: 60 };
const DAY_MS = 86_400_000;
const input =
  "rounded-md border border-line-control bg-surface px-2.5 py-1.5 text-sm text-ink transition-[border-color] duration-150 hover:border-ink-subtle " +
  "focus-visible:border-stamp focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-stamp/30 disabled:cursor-not-allowed disabled:bg-panel disabled:text-ink-subtle";

const contractor = reference.contractors.find((c) => c.id === demoPersona.contractor) ?? reference.contractors[0]!;
const categories = [...new Set(reference.materials.map((m) => m.category))];

export function RfqBuilder() {
  const firstProject = contractor.activeProjects[0]!;
  const [mode, setMode] = useState<"upload" | "catalog">("upload");
  const [lines, setLines] = useState<RfqLine[]>([]);
  const [extraction, setExtraction] = useState<BoqExtraction | null>(null);
  const [category, setCategory] = useState<MaterialCategory | "all">("all");
  const [projectId, setProjectId] = useState(firstProject.id);
  const [city, setCity] = useState<City>(firstProject.city);
  const [site, setSite] = useState(firstProject.name);
  const [requiredBy, setRequiredBy] = useState("");
  const [termsKey, setTermsKey] = useState("net30");
  const [wantsCredit, setWantsCredit] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Rfq | null>(null);

  const started = useRef(false);
  const idBase = useId();
  const tabRefs = useRef<Partial<Record<"upload" | "catalog", HTMLButtonElement | null>>>({});
  const start = (source: "upload" | "catalog") => {
    if (started.current) return;
    started.current = true;
    track("rfq_started", { source });
  };
  const applyExtraction = (e: BoqExtraction) => {
    start("upload");
    track("rfq_parsed", { line_count: e.lines.length, simulated_ai: true });
    setExtraction(e);
    // Lines already added by hand are kept; extracted lines replace an earlier extraction.
    setLines((prev) => [...prev.filter((l) => !l.parsedBy && !e.lines.some((x) => x.id === l.id)), ...e.lines]);
  };
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = /\.(csv|txt|tsv)$/i.test(file.name) ? await file.text() : null;
    applyExtraction(simulateBoqExtraction(file.name, text, reference.materials));
  };
  const patch = (id: string, change: Partial<RfqLine>) => setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...change } : l)));
  const pickProject = (id: string) => {
    const p = contractor.activeProjects.find((x) => x.id === id);
    if (!p) return;
    setProjectId(p.id);
    setCity(p.city);
    setSite(p.name);
  };

  const estimate = estimateRfqValue({ lines } as Rfq, reference.materials);
  const problems = [
    lines.length === 0 ? "Add at least one line item" : null,
    lines.some((l) => !(l.quantity > 0)) ? "Every line needs a quantity above zero" : null,
    site.trim() === "" ? "Enter the delivery site" : null,
    requiredBy === "" ? "Choose the required-by date" : null,
  ].filter((p): p is string => p !== null);

  const confirm = () => {
    const now = Date.now();
    if (Date.parse(`${requiredBy}T00:00:00Z`) <= now) {
      setError("The required-by date must be in the future.");
      return;
    }
    const fromUpload = lines.some((l) => l.parsedBy);
    const project = contractor.activeProjects.find((p) => p.id === projectId) ?? firstProject;
    const rfq: Rfq = {
      id: `rfq_${now.toString(36)}` as RfqId,
      contractorId: contractor.id as OrgId,
      projectId: project.id,
      title: `${project.name}: ${lines.length} ${lines.length === 1 ? "material" : "materials"}`,
      source: fromUpload ? "upload" : "catalog",
      ...(fromUpload && extraction ? { sourceFileName: extraction.fileName } : {}),
      status: "draft",
      lines,
      deliveryCity: city,
      deliverySite: site.trim(),
      requiredBy: `${requiredBy}T00:00:00Z`,
      closesAt: new Date(now + 2 * DAY_MS).toISOString(),
      preferredTerms: wantsCredit ? CREDIT_TERMS : (TERMS.find((t) => t.key === termsKey) ?? TERMS[0]!).terms,
      wantsCredit,
      invitedSupplierIds: [],
      blindComparison: false,
      createdAt: new Date(now).toISOString(),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    update((prev) => ({ ...prev, rfqs: [rfq, ...prev.rfqs] }));
    setError(null);
    setCreated(rfq);
  };

  if (created) {
    return (
      <div className="space-y-6" data-testid="rfq-confirmed">
        <PageHeader
          eyebrow="Contractor"
          title="RFQ confirmed"
          status={<Badge tone="neutral">Draft</Badge>}
          meta={
            <span data-testid="rfq-id" className="font-mono text-xs text-ink">
              {created.id}
            </span>
          }
        />
        <Panel title={created.title} className="motion-safe:animate-rise">
          <Facts
            columns={3}
            items={[
              { label: "Scope", value: `${created.lines.length} line ${created.lines.length === 1 ? "item" : "items"}` },
              { label: "Deliver to", value: created.deliverySite.includes(created.deliveryCity) ? created.deliverySite : `${created.deliverySite}, ${created.deliveryCity}` },
              { label: "Required on site by", value: formatDate(created.requiredBy) },
              { label: "Estimate incl. 15% VAT", value: <span className="tabular-nums">{formatSar(estimateRfqValue(created, reference.materials))}</span> },
              { label: "Payment", value: created.wantsCredit ? "From your credit cap" : "Supplier terms" },
              { label: "Source", value: created.source === "upload" ? "Uploaded BOQ (simulated reader)" : "Catalog" },
            ]}
          />
          <p className="mt-4 border-t border-line pt-4 text-sm text-ink-muted">Saved as a draft. Next: choose which suppliers receive it from the explainable shortlist.</p>
        </Panel>
        <div className="flex flex-wrap gap-3">
          <Link href={`/contractor/rfq/${created.id}`} data-testid="rfq-choose-suppliers" className={buttonClass("primary")}>
            Choose suppliers
          </Link>
          <Link href="/contractor" className={buttonClass("secondary")}>
            Back to my RFQs
          </Link>
        </div>
      </div>
    );
  }

  // WAI-ARIA tabs: roving tabindex (only the selected tab is in the Tab order, which also
  // makes it reachable in Safari), arrows / Home / End move and select, panels are linked (#81).
  const MODES = ["upload", "catalog"] as const;
  const tabId = (m: typeof mode) => `${idBase}-tab-${m}`;
  const panelId = (m: typeof mode) => `${idBase}-panel-${m}`;
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = MODES.indexOf(mode);
    const next =
      e.key === "ArrowRight" ? MODES[(i + 1) % MODES.length] : e.key === "ArrowLeft" ? MODES[(i - 1 + MODES.length) % MODES.length] : e.key === "Home" ? MODES[0] : e.key === "End" ? MODES[MODES.length - 1] : undefined;
    if (!next) return;
    e.preventDefault();
    setMode(next);
    tabRefs.current[next]?.focus();
  };
  const tab = (m: typeof mode, label: string) => (
    <button
      ref={(el) => {
        tabRefs.current[m] = el;
      }}
      type="button"
      role="tab"
      id={tabId(m)}
      aria-selected={mode === m}
      aria-controls={panelId(m)}
      tabIndex={mode === m ? 0 : -1}
      data-testid={`rfq-tab-${m}`}
      onClick={() => setMode(m)}
      onKeyDown={onTabKey}
      className={`flex h-8 items-center rounded-[4px] px-3 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${mode === m ? "bg-surface font-medium text-ink shadow-[0_1px_2px_oklch(0.235_0.022_160/0.12)]" : "text-ink-muted hover:text-ink"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Contractor" title="New request for quotation" meta="Upload a bill of quantities or pick materials from the catalog, then confirm quantities, specs and delivery." />

      <Panel title="Add line items">
        <div role="tablist" aria-label="How to add line items" className="mb-4 inline-flex gap-0.5 rounded-md border border-line-control bg-panel p-0.5">
          {tab("upload", "Upload RFQ / BOQ")}
          {tab("catalog", "Pick from catalog")}
        </div>

        {mode === "upload" ? (
          <div role="tabpanel" id={panelId("upload")} aria-labelledby={tabId("upload")} tabIndex={0} className="space-y-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
            <p className="text-sm text-ink-muted">
              <AiLabel agent="BOQ reader" className="mr-1 align-middle" /> The BOQ reader is simulated: CSV and TXT files (<code>description; quantity; unit</code>) are read and matched to the catalog by keyword; any other
              file returns a fixed sample extraction. Always review the lines before confirming.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input type="file" data-testid="rfq-upload" aria-label="RFQ or BOQ file" accept=".csv,.txt,.tsv,.pdf,.xlsx,.xls" className="max-w-full text-sm text-ink-muted file:mr-3 file:h-8 file:cursor-pointer file:rounded-md file:border file:border-line-control file:bg-surface file:px-3 file:text-sm file:font-medium file:text-ink hover:file:bg-paper" onChange={(e) => void onFile(e.target.files?.[0])} />
              <button type="button" data-testid="rfq-upload-sample" className={buttonClass("secondary", "sm")} onClick={() => applyExtraction(simulateBoqExtraction(SAMPLE_BOQ_FILE, null, reference.materials))}>
                Try the sample BOQ
              </button>
            </div>
            {extraction && (
              <div data-testid="rfq-extraction" className="rounded-md border border-dashed border-ai-line bg-ai-soft p-3 text-sm text-ink">
                <p>
                  <strong>{extraction.fileName}</strong>: {extraction.lines.length} line items extracted
                  {extraction.mode === "sample" ? " (sample extraction, not read from your file)" : " from the file"}. Simulated AI, check each line below.
                </p>
                {extraction.unmatched.length > 0 && (
                  <p className="mt-1">
                    Not matched to the catalog, add by hand if needed: {extraction.unmatched.join("; ")}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div role="tabpanel" id={panelId("catalog")} aria-labelledby={tabId("catalog")} tabIndex={0} className="space-y-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
            <label className="flex items-center gap-2 text-sm">
              Category
              <select className={input} value={category} onChange={(e) => setCategory(e.target.value as MaterialCategory | "all")}>
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </label>
            <ul className="grid gap-x-8 sm:grid-cols-2">
              {reference.materials.filter((m) => category === "all" || m.category === category).map((m) => {
                const added = lines.some((l) => l.materialId === m.id);
                return (
                  <li key={m.id} className="flex items-start justify-between gap-3 border-t border-line py-3">
                    <div className="text-sm">
                      <p className="font-medium text-ink">{m.name}</p>
                      <p className="text-ink-muted">{m.spec}</p>
                      <p className="text-ink-muted">Benchmark {formatSar(m.benchmarkUnitPrice)} per {UNIT_SINGULAR[m.unit]} excl. VAT (sample data)</p>
                    </div>
                    <button
                      type="button"
                      data-testid="rfq-catalog-add"
                      data-material={m.id}
                      disabled={added}
                      className={buttonClass("secondary", "sm", "shrink-0")}
                      onClick={() => { start("catalog"); setLines((prev) => [...prev, { id: lineIdFor(m.id), materialId: m.id, description: m.name, spec: m.spec, quantity: 1, unit: m.unit }]); }}
                    >
                      {added ? "Added" : "Add"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Panel>

      <Panel title={`Line items (${lines.length})`}>
        {lines.length === 0 ? (
          <p className="text-sm text-ink-muted">No line items yet.</p>
        ) : (
          <div>
            {/* A grid, not a table: one row per line from sm up, a stacked card on phones (#29). */}
            <div aria-hidden="true" className="hidden gap-3 border-b border-line-strong pb-1.5 text-xs font-medium text-ink-muted sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_13rem_3.5rem]">
              <span>Material</span>
              <span>Spec</span>
              <span>Quantity</span>
              <span />
            </div>
            <ul className="divide-y divide-line text-sm">
              {lines.map((l) => (
                <li key={l.id} data-testid="rfq-line" className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_13rem_3.5rem] sm:items-start sm:gap-3">
                  <div className="min-w-0">
                    <span className="font-medium text-ink sm:font-normal">{l.description}</span>
                    {l.parsedBy && (
                      <div className="mt-1">
                        <AiLabel confidence={l.parsedBy.confidence} />
                        {l.parsedBy.confidence < 0.8 ? <span className="ml-2 text-xs font-medium text-caution">Please check this match</span> : null}
                      </div>
                    )}
                  </div>
                  <label className="flex min-w-0 flex-col gap-1">
                    <span className="text-ink-muted sm:sr-only">Spec</span>
                    <input aria-label={`Spec for ${l.description}`} className={`${input} w-full min-w-0`} value={l.spec} onChange={(e) => patch(l.id, { spec: e.target.value })} />
                  </label>
                  <div className="flex items-end justify-between gap-3 sm:contents">
                    <label className="flex flex-col gap-1">
                      <span className="text-ink-muted sm:sr-only">Quantity</span>
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          inputMode="decimal"
                          data-testid="rfq-line-qty"
                          aria-label={`Quantity for ${l.description}`}
                          className={`${input} w-28 tabular-nums`}
                          value={Number.isNaN(l.quantity) ? "" : l.quantity}
                          onChange={(e) => patch(l.id, { quantity: e.target.valueAsNumber })}
                        />
                        {unitLabel(l.unit, l.quantity)}
                      </span>
                    </label>
                    <button type="button" className="py-1.5 text-left text-ink-muted underline decoration-line-strong underline-offset-[3px] hover:text-negative hover:decoration-negative" onClick={() => setLines((prev) => prev.filter((x) => x.id !== l.id))}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-ink-muted">
              Estimated value: <strong data-testid="rfq-estimate">{formatSar(estimate)}</strong> incl. 15% VAT, at 90-day benchmark prices (sample data). Offers will set the real price.
            </p>
          </div>
        )}
      </Panel>

      <Panel title="Delivery and terms">
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            Project
            <select className={input} value={projectId} onChange={(e) => pickProject(e.target.value)}>
              {contractor.activeProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Delivery city
            <select data-testid="rfq-city" className={input} value={city} onChange={(e) => setCity(e.target.value as City)}>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Delivery site
            <input data-testid="rfq-site" className={input} value={site} onChange={(e) => setSite(e.target.value)} />
          </label>
          <div className="flex flex-col gap-1">
            <label htmlFor="rfq-required-by">Required on site by</label>
            <div className="flex flex-wrap items-center gap-2">
              <input id="rfq-required-by" type="date" data-testid="rfq-required-by" className={input} value={requiredBy} onChange={(e) => setRequiredBy(e.target.value)} />
              {[7, 14, 30].map((d) => (
                <button key={d} type="button" data-testid={`rfq-required-in-${d}`} className={buttonClass("secondary", "sm")} onClick={() => setRequiredBy(new Date(Date.now() + d * DAY_MS).toISOString().slice(0, 10))}>
                  in {d} days
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1">
            Preferred payment terms
            <select className={input} disabled={wantsCredit} value={termsKey} onChange={(e) => setTermsKey(e.target.value)}>
              {TERMS.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-start gap-2 self-end">
            <input type="checkbox" data-testid="rfq-wants-credit" className="mt-1" checked={wantsCredit} onChange={(e) => setWantsCredit(e.target.checked)} />
            <span>I intend to pay from my credit cap (60 days; the supplier is paid directly). The shortlist will show which suppliers accept it.</span>
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            Notes for suppliers (optional)
            <textarea className={input} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
      </Panel>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface/95 p-4 shadow-float backdrop-blur">
        <button type="button" data-testid="rfq-confirm" disabled={problems.length > 0} onClick={confirm} className={buttonClass("primary")}>
          Confirm RFQ
        </button>
        <p role="status" className={`text-sm ${error ? "text-negative" : "text-ink-muted"}`}>{error ?? problems[0] ?? "Ready to confirm."}</p>
      </div>
    </div>
  );
}
