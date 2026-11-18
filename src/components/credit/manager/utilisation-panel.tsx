"use client";

import { useMemo } from "react";
import { utilisation } from "@/domain/credit/draws";
import { formatSar } from "@/domain/money";
import type { Halalas } from "@/domain/types";
import { useDemo } from "@/store";
import { Alert, CreditCapMeter, Facts, Panel } from "@/components/ui";
import { useToday } from "../use-today";
import { formatDate } from "@/lib/format";

const fmt = (n: number) => formatSar(n as Halalas);

/** How the approved cap is being used: drawn, open and overdue draws, next repayment. */
export function UtilisationPanel({ caseId }: { caseId: string }) {
  const facility = useDemo((s) => s.creditFacilities.find((f) => f.creditCaseId === caseId));
  const pos = useDemo((s) => s.purchaseOrders);
  const asOf = useToday();
  const u = useMemo(() => (facility ? utilisation(facility, pos, asOf) : null), [facility, pos, asOf]);
  if (!facility || !u) return null;
  return (
    <div data-testid="credit-utilisation">
      <Panel title="Utilisation of the approved cap">
        <div className="space-y-4">
          <CreditCapMeter cap={u.cap} drawn={u.drawn} format={fmt} />
          <Facts
            columns={2}
            items={[
              { label: "Used", value: `${Math.round(u.utilisation * 100)}% of the cap` },
              { label: "Open draws", value: String(u.openDraws) },
              { label: "Next repayment", value: u.nextDue ? `${formatSar(u.nextDue.amount)} on ${formatDate(u.nextDue.dueDate)}` : "None due" },
              { label: "Repaid draws · markup earned", value: `${u.repaidDraws} · ${formatSar(u.markupEarned)}` },
            ]}
          />
          {u.overdueDraws > 0 && (
            <Alert tone="negative" title={`${u.overdueDraws} draw${u.overdueDraws > 1 ? "s" : ""} overdue, ${formatSar(u.overdueAmount)}`}>
              Review the cap before the next purchase order is drawn.
            </Alert>
          )}
        </div>
      </Panel>
    </div>
  );
}
