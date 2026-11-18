import type { Metadata } from "next";
import { ReviewerGuide } from "@/components/reviewer-guide";
import { RoleNav } from "@/components/role-nav";

export const metadata: Metadata = { title: "Contractor workspace" };

export default function Layout({ children }: LayoutProps<"/contractor">) {
  return (
    <>
      <RoleNav current="contractor" />
      <ReviewerGuide role="contractor" />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">{children}</main>
    </>
  );
}
