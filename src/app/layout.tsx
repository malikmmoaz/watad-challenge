import type { Metadata, Viewport } from "next";
import { LocaleSync } from "@/components/i18n/locale-sync";
import { LOCALE_BOOT_SCRIPT } from "@/i18n/core";
import { meta, SITE_EN } from "@/i18n/meta";
import { fontVariables } from "@/styles/fonts";
import "./globals.css";

const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://watad-challenge.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_EN, template: `%s · ${SITE_EN}` },
  description: meta.en.home.description,
  applicationName: SITE_EN,
  openGraph: { type: "website", siteName: SITE_EN, locale: "en_US", alternateLocale: ["ar_SA"], url: "/" },
  twitter: { card: "summary_large_image" },
  appleWebApp: { title: SITE_EN, statusBarStyle: "default" },
};

/** Browser chrome on phones takes the paper of the app bar, so the page reads as one surface. */
export const viewport: Viewport = { themeColor: "#f6faf7" };

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
