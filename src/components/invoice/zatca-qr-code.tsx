"use client";

import { useEffect, useState } from "react";

/**
 * The ZATCA QR as crisp SVG modules (prints sharp at any size). The encoder is loaded only when
 * an invoice is shown, so no other page pays for it.
 */
export function ZatcaQrCode({ payload, label, size = 152 }: { payload: string; label: string; size?: number }) {
  const [path, setPath] = useState<{ d: string; n: number } | null>(null);

  useEffect(() => {
    let live = true;
    void import("qrcode-generator").then(({ default: qrcode }) => {
      const qr = qrcode(0, "M");
      qr.addData(payload, "Byte");
      qr.make();
      const n = qr.getModuleCount();
      let d = "";
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
      if (live) setPath({ d, n });
    });
    return () => {
      live = false;
    };
  }, [payload]);

  const quiet = 4; // quiet zone in modules, as scanners expect
  return (
    <svg
      role="img"
      aria-label={label}
      data-testid="invoice-qr"
      data-payload={payload}
      width={size}
      height={size}
      viewBox={path ? `${-quiet} ${-quiet} ${path.n + 2 * quiet} ${path.n + 2 * quiet}` : "0 0 1 1"}
      shapeRendering="crispEdges"
      className="shrink-0 bg-white"
    >
      {path ? <path d={path.d} fill="#000" /> : null}
    </svg>
  );
}
