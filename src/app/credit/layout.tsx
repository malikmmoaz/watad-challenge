import type { Metadata } from "next";
import { RoleNav } from "@/components/role-nav";

export const metadata: Metadata = { title: "Credit manager workspace" };

export default function Layout({ children }: LayoutProps<"/credit">) {
  return (
    <>
      <RoleNav current="credit" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
