"use client";

import { invoice } from "@/i18n/invoice";
import { useLocale, useMessages } from "@/i18n/locale";
import { track } from "@/lib/analytics";
import { buttonClass } from "../ui";

/** Opens the browser's print dialog; "Save as PDF" is a destination there. Hidden on paper. */
export function PrintButton({ poId, document, testId = "print" }: { poId: string; document: "po" | "invoice"; testId?: string }) {
  const m = useMessages(invoice);
  const locale = useLocale();
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={() => {
        track("po_printed", { po_id: poId, document, locale });
        window.print();
      }}
      className={buttonClass("secondary", "sm", "print:hidden")}
    >
      {m.print}
    </button>
  );
}
