import type { Metadata } from "next";
import { T } from "@/components/i18n/t";
import { StatusPage } from "@/components/system/status-page";
import { common } from "@/i18n/common";
import { msg } from "@/i18n/core";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <StatusPage code="404" title={<T m={msg(common, (m) => m.system.notFoundTitle)} />} testId="not-found">
      <T m={msg(common, (m) => m.system.notFoundBody)} />
    </StatusPage>
  );
}
