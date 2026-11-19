import type { Metadata } from "next";
import { LocaleSync } from "@/components/i18n/locale-sync";
import { LOCALE_BOOT_SCRIPT } from "@/i18n/core";
import { fontVariables } from "@/styles/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Watad challenge demo", template: "%s · Watad challenge demo" },
  description: "Construction materials procurement for Saudi Arabia: RFQ, offers, purchase orders and independent credit. Sample data, simulated AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The boot script may set lang/dir/class before hydration (stored Arabic locale).
    <html lang="en" dir="ltr" className={`${fontVariables} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <LocaleSync />
        {children}
      </body>
    </html>
  );
}
