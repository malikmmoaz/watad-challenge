import type { Metadata } from "next";
import { RoleNav } from "@/components/role-nav";

export const metadata: Metadata = { title: "Supplier portal" };

export default function Layout({ children }: LayoutProps<"/supplier">) {
  return (
    <>
      <RoleNav current="supplier" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
