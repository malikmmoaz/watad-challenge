import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  AiLabel,
  Alert,
  Badge,
  Button,
  CellNote,
  Checkbox,
  CreditCapMeter,
  DecisionStamp,
  EmptyState,
  ErrorState,
  EvidenceSeal,
  FactorBar,
  Facts,
  Icon,
  Input,
  LeadTimeBar,
  LoadingRows,
  NoEvidence,
  PageHeader,
  Panel,
  SampleDataLabel,
  ScoreScale,
  Select,
  StatusTimeline,
  Table,
  Td,
  Textarea,
  Th,
  THead,
  Tr,
} from "@/components/ui";
import { formatSar, sar } from "@/domain/money";
import { OfferComparisonDemo } from "./offer-comparison-demo";
import { RtlSpecimen } from "./rtl-specimen";

export const metadata: Metadata = { title: "Design system" };

const swatches: { group: string; items: [name: string, cls: string][] }[] = [
  { group: "Grounds", items: [["paper", "bg-paper"], ["surface", "bg-surface"], ["panel", "bg-panel"], ["line", "bg-line"], ["line-strong", "bg-line-strong"]] },
  { group: "Ink", items: [["ink", "bg-ink"], ["ink-muted", "bg-ink-muted"], ["ink-subtle", "bg-ink-subtle"]] },
  { group: "Shell", items: [["pine", "bg-pine"], ["pine-raised", "bg-pine-raised"]] },
  { group: "Action (pressable only)", items: [["action", "bg-action"], ["action-hover", "bg-action-hover"], ["action-soft", "bg-action-soft"]] },
  { group: "Stamp ink (evidence)", items: [["stamp", "bg-stamp"], ["stamp-soft", "bg-stamp-soft"]] },
  { group: "Simulated AI", items: [["ai", "bg-ai"], ["ai-soft", "bg-ai-soft"]] },
  { group: "State", items: [["positive", "bg-positive"], ["caution", "bg-caution"], ["caution-mark", "bg-caution-mark"], ["negative", "bg-negative"]] },
  { group: "Credit bands", items: [["band-a", "bg-band-a"], ["band-b", "bg-band-b"], ["band-c", "bg-band-c"], ["band-d", "bg-band-d"]] },
];

const typeScale: [cls: string, use: string][] = [
  ["text-4xl font-semibold", "Score figure, landing headline"],
  ["text-2xl font-semibold", "Page title"],
  ["text-lg font-semibold", "Section lead"],
  ["text-base", "Body"],
  ["text-sm", "Tables, controls, panel titles"],
  ["text-xs text-ink-muted", "Labels, hints, cell notes"],
];

const offers = [
  { supplier: "Rawasi Building Materials Trading", city: "Riyadh", unit: 2485, total: 298200, days: 4, terms: "Net 30", state: "recommended" as const, reason: "Lowest landed cost, delivers 3 days before the required date" },
  { supplier: "Al Sarh Steel & Cement Supply", city: "Dammam", unit: 2440, total: 292800, days: 9, terms: "Cash on delivery", state: "default" as const, reason: "Lowest unit price, arrives 2 days late" },
  { supplier: "Dar Al Bina Distribution", city: "Jeddah", unit: 2560, total: 307200, days: 6, terms: "Net 60", state: "default" as const, reason: "Longest payment terms" },
];

function Section({ id, title, lead, children }: { id: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="flex scroll-mt-6 flex-col gap-4 border-t border-line pt-8">
      <div>
        <h2 id={`${id}-h`} className="text-lg font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">{lead}</p>
      </div>
      {children}
    </section>
  );
}

const sections = [
  ["colour", "Colour"],
  ["type", "Type"],
  ["actions", "Buttons"],
  ["forms", "Forms"],
  ["status", "Badges and labels"],
  ["tables", "Tables"],
  ["comparison", "Offer comparison"],
  ["rtl", "Arabic, right to left"],
  ["evidence", "Evidence and decisions"],
  ["credit", "Score and credit cap"],
  ["timeline", "Status timeline"],
  ["states", "Empty, loading, error"],
] as const;

export default function DesignSystemPage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8">
      <PageHeader
        title="Design system"
        serial="src/components/ui"
        status={<SampleDataLabel />}
        meta={<span>Tokens in src/styles/tokens.css · rules in DESIGN.md</span>}
      />
      <nav aria-label="Sections" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="text-stamp underline decoration-stamp/35 hover:decoration-stamp">
            {label}
          </a>
        ))}
      </nav>

      <Section id="colour" title="Colour" lead="Green-tinted paper, a pine shell, one action green and stamp-ink blue for evidence. Amber and red appear only as state. Use the role names in new code, not default Tailwind colours.">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {swatches.map((g) => (
            <div key={g.group}>
              <h3 className="text-xs font-medium text-ink-muted">{g.group}</h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {g.items.map(([name, cls]) => (
                  <li key={name} className="flex items-center gap-2.5 text-sm">
                    <span className={`size-6 shrink-0 rounded-sm border border-line-strong ${cls}`} />
                    <code className="font-mono text-xs">{name}</code>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section id="type" title="Type" lead="Public Sans for everything, with tabular figures. Geist Mono only for document, order and registration numbers. Noto Sans Arabic for Arabic names.">
        <div className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
          {typeScale.map(([cls, use]) => (
            <div key={cls} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-3">
              <span className={cls}>SAR 298,200.00 · Rebar 16 mm</span>
              <span className="text-xs text-ink-muted">
                <code className="font-mono">{cls.split(" ")[0]}</code> · {use}
              </span>
            </div>
          ))}
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-3">
            <span className="font-mono text-sm">PO-2026-00418 · CR 1010482917</span>
            <span className="text-xs text-ink-muted">
              <code className="font-mono">font-mono</code> · Serial numbers
            </span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-3">
            <span lang="ar" dir="rtl" className="text-base">
              شركة أفق نجد للمقاولات
            </span>
            <span className="text-xs text-ink-muted">
              <code className="font-mono">lang=&quot;ar&quot;</code> · Arabic names
            </span>
          </div>
        </div>
      </Section>

      <Section id="actions" title="Buttons" lead="One primary button per view: the action the page exists for. Labels name the action. Green means pressable and nothing else.">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Place PO</Button>
          <Button>Save draft</Button>
          <Button variant="quiet">Cancel</Button>
          <Button variant="danger">Decline application</Button>
          <Button variant="primary" loading>
            Placing PO
          </Button>
          <Button variant="primary" disabled>
            Place PO
          </Button>
          <Button size="sm" icon={<Icon name="upload" />}>
            Upload RFQ
          </Button>
        </div>
      </Section>

      <Section id="forms" title="Forms" lead="Label above, hint below, unit inside the control. An error names the problem and the fix, and replaces the hint.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Unit price" suffix="SAR / tonne" defaultValue="2,485.00" inputMode="decimal" hint="Excluding 15% VAT" />
          <Input label="Lead time" suffix="days" defaultValue="0" inputMode="numeric" error="Enter a lead time of at least 1 day" />
          <Select label="Payment terms" defaultValue="net30">
            <option value="cod">Cash on delivery</option>
            <option value="net30">Net 30</option>
            <option value="net60">Net 60</option>
          </Select>
          <Input label="Delivery city" defaultValue="Riyadh" disabled />
          <Textarea label="Note to contractor" optional placeholder="Brand, mill certificate, delivery window" />
          <Checkbox label="Stock is on hand for the full quantity" hint="Untick to offer a partial quantity" defaultChecked />
        </div>
      </Section>

      <Section id="status" title="Badges and labels" lead="A badge states a status in words with a shape, so it reads without colour. Simulated AI and sample data carry their dashed labels wherever they appear.">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Draft</Badge>
          <Badge tone="info">Offers open</Badge>
          <Badge tone="positive">PO confirmed</Badge>
          <Badge tone="caution">More information requested</Badge>
          <Badge tone="negative">Declined</Badge>
          <AiLabel agent="BOQ reader" confidence={0.92} />
          <AiLabel />
          <SampleDataLabel />
        </div>
      </Section>

      <Section id="tables" title="Tables" lead="Columns keep their order and width in every state. Numbers align to the end. Lead time is drawn to scale against the required date.">
        <Table caption="Offers for RFQ-2026-0193, rebar 16 mm, 120 tonnes">
          <THead>
            <tr>
              <Th>Supplier</Th>
              <Th align="end">Unit price</Th>
              <Th align="end">Total excl. VAT</Th>
              <Th>Lead time</Th>
              <Th>Payment terms</Th>
              <Th>
                <span className="sr-only">Action</span>
              </Th>
            </tr>
          </THead>
          <tbody>
            {offers.map((o) => (
              <Tr key={o.supplier} state={o.state}>
                <Td>
                  <span className="font-medium">{o.supplier}</span>
                  {o.state === "recommended" ? <Badge tone="positive" className="ml-2">Best match</Badge> : null}
                  <CellNote>
                    {o.city} · {o.reason}
                  </CellNote>
                </Td>
                <Td align="end">{formatSar(sar(o.unit))}</Td>
                <Td align="end" className="font-medium">
                  {formatSar(sar(o.total))}
                </Td>
                <Td>
                  <LeadTimeBar days={o.days} maxDays={12} requiredInDays={7} />
                </Td>
                <Td>{o.terms}</Td>
                <Td align="end">
                  <Button size="sm" variant={o.state === "recommended" ? "primary" : "secondary"}>
                    Choose offer
                  </Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section id="comparison" title="Offer comparison" lead="OfferComparisonTable, on seeded offers. Every offer shows the same fields in the same order; the score opens into the factors behind it. The ranking informs, the contractor chooses.">
        <OfferComparisonDemo />
      </Section>

      <Section id="rtl" title="Arabic, right to left" lead="The same components with dir=rtl and lang=ar: logical properties, mirrored arrows, bars and meters filling from the right, a larger Arabic scale with no letter-spacing, and Naskh where English uses the italic serif.">
        <RtlSpecimen />
      </Section>

      <Section id="evidence" title="Evidence and decisions" lead="The seal marks a value a document backs, and opens that document. A stamp records a decision a named person made. AI proposals never get a stamp.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Company" aside={<SampleDataLabel />}>
            <Facts
              items={[
                { label: "Registered name", value: "Najd Horizon Contracting Co.", valueAr: "شركة أفق نجد للمقاولات" },
                { label: "Commercial Registration", value: <span className="font-mono text-xs">1010482917</span> },
                { label: "Revenue, last 4 quarters", value: <>{formatSar(sar(18420000))}<span className="mt-1 block"><EvidenceSeal source="ZATCA VAT returns Q4 2025 to Q3 2026, box 6" /></span></> },
                { label: "Contractor classification", value: <>Grade 3<span className="mt-1 block"><NoEvidence>Certificate not on file</NoEvidence></span></> },
              ]}
            />
          </Panel>
          <Panel title="Decision log">
            <div className="flex flex-col items-start gap-4">
              <DecisionStamp decision="approved" by="Credit manager" at="18 Nov 2026, 14:20" />
              <p className="text-sm text-ink">
                Credit cap of {formatSar(sar(750000))} approved. Profit rate 2.5% for 90 days (10.1% APR).
              </p>
              <div className="flex flex-wrap gap-4">
                <DecisionStamp decision="referred" by="Credit manager" at="16 Nov 2026, 10:05" />
                <DecisionStamp decision="declined" by="Credit manager" at="12 Nov 2026, 09:40" />
              </div>
            </div>
          </Panel>
        </div>
      </Section>

      <Section id="credit" title="Score and credit cap" lead="The score sits on a ruled scale so the distance to the next band is visible. The credit cap is a hard edge: a PO that would pass it shows the overflow.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Scorecard" aside={<AiLabel agent="Scoring engine" />}>
            <div className="flex flex-col gap-6">
              <ScoreScale score={74} />
              <div className="flex flex-col gap-4">
                <FactorBar label="Payment behaviour (SIMAH)" points={22} weight={25} note="No defaults in 24 months" />
                <FactorBar label="Liquidity (bank statements)" points={11} weight={20} note="Average balance covers 1.4 months of purchases" />
                <FactorBar label="Revenue stability (ZATCA)" points={16} weight={20} />
              </div>
            </div>
          </Panel>
          <Panel title="Credit cap">
            <div className="flex flex-col gap-8">
              <CreditCapMeter cap={75000000} drawn={31000000} thisPo={29820000} format={(n) => formatSar(sar(n / 100))} />
              <CreditCapMeter cap={75000000} drawn={56000000} thisPo={29820000} format={(n) => formatSar(sar(n / 100))} />
            </div>
          </Panel>
        </div>
      </Section>

      <Section id="timeline" title="Status timeline" lead="For a PO or a credit application. Oldest first, one current step, each with who moved it and when.">
        <Panel className="max-w-xl">
          <StatusTimeline
            label="Status of PO-2026-00418"
            steps={[
              { label: "PO placed", state: "done", at: "14 Nov 2026, 09:12", actor: "Contractor" },
              { label: "Confirmed by supplier", state: "done", at: "14 Nov 2026, 11:40", actor: "Supplier" },
              { label: "Supplier paid from credit cap", state: "done", at: "15 Nov 2026, 08:00", actor: "Platform", note: "Paid directly to the supplier." },
              { label: "Out for delivery", state: "current", at: "18 Nov 2026, 06:30", actor: "Supplier" },
              { label: "Return requested", state: "skipped", note: "Not needed for this PO." },
              { label: "Delivered", state: "upcoming" },
            ]}
          />
        </Panel>
      </Section>

      <Section id="states" title="Empty, loading, error" lead="An empty state says what will appear and offers the action that fills it. No role lands on one: seeded sample data covers every first screen.">
        <div className="grid gap-4 lg:grid-cols-2">
          <EmptyState title="No offers yet" action={<Button size="sm">View shortlisted suppliers</Button>}>
            Offers from the 5 shortlisted suppliers will appear here as they arrive. Offers close on 21 Nov 2026.
          </EmptyState>
          <ErrorState title="We could not read this file" action={<Button size="sm" icon={<Icon name="upload" />}>Upload another file</Button>}>
            The RFQ must be a PDF or an Excel file under 10 MB. Nothing was saved.
          </ErrorState>
          <LoadingRows label="Loading offers" rows={3} />
          <div className="flex flex-col gap-3">
            <Alert tone="caution" title="2 documents are missing">
              Upload the Zakat certificate and the latest GOSI certificate to move the application to review.
            </Alert>
            <Alert tone="positive" title="Offer submitted">
              The contractor can now see it. You can edit it until offers close.
            </Alert>
          </div>
        </div>
      </Section>
    </main>
  );
}
