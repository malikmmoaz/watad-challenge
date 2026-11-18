import type { Metadata } from "next";
import { StatusPage } from "@/components/system/status-page";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <StatusPage code="404" title="This page is not part of the demo" testId="not-found">
      The link may be mistyped, or it points to a request, order or credit case that only exists in another browser: the demo keeps
      everything you create in this browser. Start again from the landing page or open a role.
    </StatusPage>
  );
}
