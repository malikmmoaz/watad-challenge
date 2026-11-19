"use client";

import { Fragment, type ReactNode } from "react";
import type { Localized } from "@/i18n/core";
import { fill } from "@/i18n/core";
import { useFormat, useLocale } from "@/i18n/locale";
import type { Halalas, IsoDate } from "@/domain/types";

type Value = string | number | ReactNode;

/**
 * One translated string, for server components (pick it with `msg()`):
 *   <T m={msg(common, (m) => m.appBar.about)} />
 * `values` fill `{name}` placeholders; a value may be an element
 * (e.g. <Money h={...} />), so a sentence can hold a formatted amount.
 * Client components use `useMessages()` directly instead.
 */
export function T({ m, values }: { m: Localized; values?: Record<string, Value> }) {
  const text = m[useLocale()];
  if (!values) return <>{text}</>;
  const plain = Object.values(values).every((v) => typeof v === "string" || typeof v === "number");
  if (plain) return <>{fill(text, values as Record<string, string | number>)}</>;
  const parts = text.split(/(\{\w+\})/g);
  return (
    <>
      {parts.map((p, i) => {
        const key = /^\{(\w+)\}$/.exec(p)?.[1];
        return <Fragment key={i}>{key && key in values ? values[key] : p}</Fragment>;
      })}
    </>
  );
}

/** A SAR amount in the reader's language (Arabic: Latin digits, ر.س.). */
export function Money({ h }: { h: number }) {
  return <>{useFormat().money(h as Halalas)}</>;
}

/** A date in the reader's language (Arabic: Gregorian, Latin digits). */
export function DateText({ iso, withTime = false }: { iso: IsoDate; withTime?: boolean }) {
  const f = useFormat();
  return <>{withTime ? f.dateTime(iso) : f.date(iso)}</>;
}
