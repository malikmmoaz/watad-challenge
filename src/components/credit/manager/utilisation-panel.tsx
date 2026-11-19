"use client";

import { useMemo } from "react";
import { utilisation } from "@/domain/credit/draws";
import type { Halalas } from "@/domain/types";
import { useDemo } from "@/store";
import { Alert, CreditCapMeter, Facts, Panel } from "@/components/ui";
import { useToday } from "../use-today";
import { fill } from "@/i18n/core";
import { credit } from "@/i18n/credit";
import { useFormat, useMessages } from "@/i18n/locale";


/** How the approved cap is being used: drawn, open and overdue draws, next repayment. */
export function UtilisationPanel({ caseId }: { caseId: string }) {
  const m = useMessages(credit).caseFile;
  const f = useFormat();
  const fmt = (n: number) => f.money(n as Halalas);
  const facility = useDemo((s) => s.creditFacilities.find((f) => f.creditCaseId === caseId));
  const pos = useDemo((s) => s.purchaseOrders);
  const asOf = useToday();
  const u = useMemo(() => (facility ? utilisation(facility, pos, asOf) : null), [facility, pos, asOf]);
  if (!facility || !u) return null;
  return (
    <div data-testid="credit-utilisation">
      <Panel title={m.utilisationTitle}>
        <div className="space-y-4">
          <CreditCapMeter cap={u.cap} drawn={u.drawn} format={fmt} />
          <Facts
            columns={2}
            items={[
              { label: m.used, value: fill(m.usedValue, { pct: f.percent(u.utilisation) }) },
              { label: m.openDraws, value: f.number(u.openDraws) },
              { label: m.nextRepayment, value: u.nextDue ? fill(m.nextRepaymentValue, { amount: f.money(u.nextDue.amount), date: f.date(u.nextDue.dueDate) }) : m.noneDue },
              { label: m.repaidMarkup, value: `${f.number(u.repaidDraws)} · ${f.money(u.markupEarned)}` },
            ]}
          />
          {u.overdueDraws > 0 && (
            <Alert tone="negative" title={u.overdueDraws === 1 ? fill(m.overdueOne, { amount: f.money(u.overdueAmount) }) : fill(m.overdueOther, { n: u.overdueDraws, amount: f.money(u.overdueAmount) })}>
              {m.overdueBody}
            </Alert>
          )}
        </div>
      </Panel>
    </div>
  );
}
