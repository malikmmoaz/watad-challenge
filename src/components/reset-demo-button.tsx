"use client";

import { track } from "@/lib/analytics";
import { resetDemo } from "@/store";

/** Sits on the pine bar: restores the seeded sample data. */
export function ResetDemoButton() {
  return (
    <button
      type="button"
      onClick={() => {
        resetDemo();
        track("demo_reset", {});
      }}
      className="flex h-7 items-center rounded-md border border-on-pine-muted/60 px-2 text-xs text-on-pine transition-colors duration-150 hover:bg-pine-raised focus-visible:outline-on-pine"
    >
      Reset demo data
    </button>
  );
}
