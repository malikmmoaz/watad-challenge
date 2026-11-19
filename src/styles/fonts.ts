import { Geist_Mono, Instrument_Serif, Noto_Naskh_Arabic, Noto_Sans_Arabic, Public_Sans } from "next/font/google";

/** UI face: headings, labels, body and data. */
export const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});

/** Document, order and registration numbers only. */
export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

/** Arabic company and material names (`nameAr`). */
export const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  weight: ["400", "600", "700"],
  display: "swap",
  preload: false,
});

/**
 * Arabic accent face: classical Naskh for the one display phrase that is set in
 * the italic serif in English. Arabic has no italic; the contrast between Naskh
 * and the sans plays the same role. Not preloaded; it loads only on pages that use it.
 */
export const notoNaskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-naskh",
  weight: ["500", "700"],
  display: "swap",
  preload: false,
});

/** Accent serif: one italic phrase in a display headline. Italic only, one weight. */
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400",
  style: "italic",
  display: "swap",
});

/** Put on <html>: `className={fontVariables}`. */
export const fontVariables = `${publicSans.variable} ${geistMono.variable} ${notoArabic.variable} ${instrumentSerif.variable} ${notoNaskh.variable}`;
