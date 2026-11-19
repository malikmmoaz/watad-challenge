import type { Metadata } from "next";
import { ReviewerGuide } from "@/components/reviewer-guide";
import { RoleNav } from "@/components/role-nav";
import { pageMetadata } from "@/i18n/meta";

export const metadata: Metadata = pageMetadata("credit");

export default function Layout({ children }: LayoutProps<"/credit">) {
  return (
    <>
      <RoleNav current="credit" />
      <ReviewerGuide role="credit" />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">{children}</main>
    </>
  );
}
