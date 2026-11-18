"use client";

import Link from "next/link";
import { useState } from "react";
import { demoPersona, reference } from "@/data";
import { formatSar } from "@/domain/money";
import type { City, MaterialCategory, OrgId, PaymentTerms, Rfq, RfqId, RfqLine } from "@/domain/types";
import { SAMPLE_BOQ_FILE, lineIdFor, simulateBoqExtraction, type BoqExtraction } from "@/lib/procurement/boq";
import { CATEGORY_LABELS, CITIES, UNIT_LABELS } from "@/lib/procurement/labels";
import { estimateRfqValue } from "@/lib/procurement/shortlist";
import { update } from "@/store";

const TERMS: { key: string; label: string; terms: PaymentTerms }[] = [
  { key: "net30", label: "Net 30 days", terms: { kind: "net", days: 30 } },
  { key: "net60", label: "Net 60 days", terms: { kind: "net", days: 60 } },
  { key: "on_delivery", label: "Payment on delivery", terms: { kind: "on_delivery" } },
  { key: "advance", label: "Payment in advance", terms: { kind: "advance" } },
];
const CREDIT_TERMS: PaymentTerms = { kind: "platform_credit", days: 60 };
const DAY_MS = 86_400_000;
const input = "rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm";
const card = "rounded border border-neutral-200 bg-white p-4";

const contractor = reference.contractors.find((c) => c.id === demoPersona.contractor) ?? reference.contractors[0]!;
const categories = [...new Set(reference.materials.map((m) => m.category))];

function SimulatedBadge({ children }: { children: React.ReactNode }) {
  return <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs text-amber-900">{children}</span>;
}

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

  const applyExtraction = (e: BoqExtraction) => {
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
      <div className="space-y-4" data-testid="rfq-confirmed">
        <h1 className="text-2xl font-semibold">RFQ confirmed</h1>
        <div className={card}>
          <p className="font-medium">{created.title}</p>
          <p className="mt-1 text-sm text-neutral-700">
            <span data-testid="rfq-id" className="font-mono">{created.id}</span> · {created.lines.length} line items · deliver to {created.deliverySite}, {created.deliveryCity} by{" "}
            {created.requiredBy.slice(0, 10)} · about {formatSar(estimateRfqValue(created, reference.materials))} incl. VAT at benchmark prices
          </p>
          <p className="mt-2 text-sm text-neutral-700">Saved as a draft. Next step: choose which suppliers receive it from the explainable shortlist.</p>
        </div>
        <div className="flex gap-3">
          <Link href={`/contractor/rfq/${created.id}`} data-testid="rfq-choose-suppliers" className="inline-block rounded bg-neutral-900 px-4 py-2 text-sm text-white">
            Choose suppliers
          </Link>
          <Link href="/contractor" className="inline-block rounded border border-neutral-300 px-4 py-2 text-sm">
            Back to my RFQs
          </Link>
        </div>
      </div>
    );
  }

  const tab = (m: typeof mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      data-testid={`rfq-tab-${m}`}
      onClick={() => setMode(m)}
      className={`rounded px-3 py-1.5 text-sm ${mode === m ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New request for quotation</h1>
        <p className="mt-1 text-sm text-neutral-700">Upload a bill of quantities or pick materials from the catalog, then confirm quantities, specs and delivery.</p>
      </div>

      <section className={card} aria-label="Add line items">
        <div role="tablist" className="mb-4 flex gap-1">
          {tab("upload", "Upload RFQ / BOQ")}
          {tab("catalog", "Pick from catalog")}
        </div>

        {mode === "upload" ? (
          <div className="space-y-3">
            <p className="text-sm text-neutral-700">
              <SimulatedBadge>Simulated AI</SimulatedBadge> The BOQ reader is simulated: CSV and TXT files (<code>description; quantity; unit</code>) are read and matched to the catalog by keyword; any other
              file returns a fixed sample extraction. Always review the lines before confirming.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input type="file" data-testid="rfq-upload" aria-label="RFQ or BOQ file" accept=".csv,.txt,.tsv,.pdf,.xlsx,.xls" className="text-sm" onChange={(e) => void onFile(e.target.files?.[0])} />
              <button type="button" data-testid="rfq-upload-sample" className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50" onClick={() => applyExtraction(simulateBoqExtraction(SAMPLE_BOQ_FILE, null, reference.materials))}>
                Try the sample BOQ
              </button>
            </div>
            {extraction && (
              <div data-testid="rfq-extraction" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
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
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              Category
              <select className={input} value={category} onChange={(e) => setCategory(e.target.value as MaterialCategory | "all")}>
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </label>
            <ul className="grid gap-2 sm:grid-cols-2">
              {reference.materials.filter((m) => category === "all" || m.category === category).map((m) => {
                const added = lines.some((l) => l.materialId === m.id);
                return (
                  <li key={m.id} className="flex items-start justify-between gap-3 rounded border border-neutral-200 p-3">
                    <div className="text-sm">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-neutral-600">{m.spec}</p>
                      <p className="text-neutral-600">Benchmark {formatSar(m.benchmarkUnitPrice)} per {UNIT_LABELS[m.unit]} excl. VAT (sample data)</p>
                    </div>
                    <button
                      type="button"
                      data-testid="rfq-catalog-add"
                      data-material={m.id}
                      disabled={added}
                      className="shrink-0 rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:text-neutral-400"
                      onClick={() => setLines((prev) => [...prev, { id: lineIdFor(m.id), materialId: m.id, description: m.name, spec: m.spec, quantity: 1, unit: m.unit }])}
                    >
                      {added ? "Added" : "Add"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section className={card} aria-label="Line items">
        <h2 className="mb-3 font-semibold">Line items ({lines.length})</h2>
        {lines.length === 0 ? (
          <p className="text-sm text-neutral-600">No line items yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-600">
                <tr>
                  <th className="py-1 pr-3 font-medium">Material</th>
                  <th className="py-1 pr-3 font-medium">Spec</th>
                  <th className="py-1 pr-3 font-medium">Quantity</th>
                  <th className="py-1 font-medium"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} data-testid="rfq-line" className="border-t border-neutral-200 align-top">
                    <td className="py-2 pr-3">
                      {l.description}
                      {l.parsedBy && (
                        <div className="mt-1">
                          <SimulatedBadge>
                            Simulated AI · {Math.round(l.parsedBy.confidence * 100)}% match{l.parsedBy.confidence < 0.8 ? " · please check" : ""}
                          </SimulatedBadge>
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <input aria-label={`Spec for ${l.description}`} className={`${input} w-full min-w-48`} value={l.spec} onChange={(e) => patch(l.id, { spec: e.target.value })} />
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        data-testid="rfq-line-qty"
                        aria-label={`Quantity for ${l.description}`}
                        className={`${input} w-28 tabular-nums`}
                        value={Number.isNaN(l.quantity) ? "" : l.quantity}
                        onChange={(e) => patch(l.id, { quantity: e.target.valueAsNumber })}
                      />{" "}
                      {UNIT_LABELS[l.unit]}
                    </td>
                    <td className="py-2">
                      <button type="button" className="text-neutral-600 underline" onClick={() => setLines((prev) => prev.filter((x) => x.id !== l.id))}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-sm text-neutral-700">
              Estimated value: <strong data-testid="rfq-estimate">{formatSar(estimate)}</strong> incl. 15% VAT, at 90-day benchmark prices (sample data). Offers will set the real price.
            </p>
          </div>
        )}
      </section>

      <section className={card} aria-label="Delivery and terms">
        <h2 className="mb-3 font-semibold">Delivery and terms</h2>
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
                <button key={d} type="button" data-testid={`rfq-required-in-${d}`} className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50" onClick={() => setRequiredBy(new Date(Date.now() + d * DAY_MS).toISOString().slice(0, 10))}>
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
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" data-testid="rfq-confirm" disabled={problems.length > 0} onClick={confirm} className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:bg-neutral-300">
          Confirm RFQ
        </button>
        <p role="status" className="text-sm text-neutral-700">{error ?? problems[0] ?? "Ready to confirm."}</p>
      </div>
    </div>
  );
}
