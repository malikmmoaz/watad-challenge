import type { Metadata } from "next";
import { fontVariables } from "@/styles/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Watad challenge demo", template: "%s · Watad challenge demo" },
  description: "Construction materials procurement for Saudi Arabia: RFQ, offers, purchase orders and independent credit. Sample data, simulated AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
