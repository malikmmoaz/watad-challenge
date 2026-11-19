/**
 * ZATCA e-invoicing Phase 1 (generation phase) QR payload for a simplified tax invoice.
 *
 * The QR holds a base64 string of five TLV records, in this order:
 *   1 seller name, 2 seller VAT registration number, 3 invoice timestamp (ISO 8601),
 *   4 invoice total including VAT, 5 VAT total.
 * Each record is one tag byte, one length byte (the value's UTF-8 byte length, so Arabic names
 * count bytes, not characters) and the UTF-8 value.
 *
 * This is a demo: the invoices use fictional VAT numbers and are never submitted to ZATCA.
 */
import type { Halalas } from "@/domain/types";

export interface ZatcaQrFields {
  sellerName: string;
  /** 15 digits, starting and ending with 3. */
  vatNumber: string;
  /** ISO 8601 timestamp of the invoice. */
  timestamp: string;
  totalInclVat: Halalas;
  vat: Halalas;
}

const encoder = new TextEncoder();

/** Encode `[tag, value]` pairs as TLV bytes. Throws if a value is longer than one length byte allows. */
export function encodeTlv(records: ReadonlyArray<readonly [number, string]>): Uint8Array {
  const parts = records.map(([tag, value]) => {
    const bytes = encoder.encode(value);
    if (tag < 1 || tag > 255) throw new RangeError(`TLV tag ${tag} must fit in one byte`);
    if (bytes.length > 255) throw new RangeError(`TLV value for tag ${tag} is ${bytes.length} bytes; the maximum is 255`);
    return Uint8Array.of(tag, bytes.length, ...bytes);
  });
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** Decode TLV bytes back into `[tag, value]` pairs (used by tests and the e2e check). */
export function decodeTlv(bytes: Uint8Array): Array<[number, string]> {
  const out: Array<[number, string]> = [];
  const decoder = new TextDecoder();
  for (let i = 0; i < bytes.length; ) {
    const tag = bytes[i]!;
    const len = bytes[i + 1]!;
    out.push([tag, decoder.decode(bytes.subarray(i + 2, i + 2 + len))]);
    i += 2 + len;
  }
  return out;
}

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
export const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** Halalas to the plain decimal ZATCA expects: "1150.00", no grouping, no currency. */
export const sarDecimal = (h: Halalas) => (h / 100).toFixed(2);

/** ISO 8601 in UTC without milliseconds, e.g. "2026-11-13T09:30:00Z". */
export const zatcaTimestamp = (iso: string) => new Date(iso).toISOString().replace(/\.\d{3}Z$/, "Z");

export const isSaudiVatNumber = (v: string) => /^3\d{13}3$/.test(v);

export function zatcaQrPayload(f: ZatcaQrFields): string {
  if (!isSaudiVatNumber(f.vatNumber)) throw new RangeError(`VAT number ${f.vatNumber} must be 15 digits starting and ending with 3`);
  return toBase64(
    encodeTlv([
      [1, f.sellerName],
      [2, f.vatNumber],
      [3, zatcaTimestamp(f.timestamp)],
      [4, sarDecimal(f.totalInclVat)],
      [5, sarDecimal(f.vat)],
    ]),
  );
}
