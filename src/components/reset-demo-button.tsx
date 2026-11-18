"use client";

import { resetDemo } from "@/store";

export function ResetDemoButton() {
  return (
    <button type="button" onClick={resetDemo} className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-100">
      Reset demo data
    </button>
  );
}
