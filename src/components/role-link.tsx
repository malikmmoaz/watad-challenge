"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import type { Role } from "@/domain/types";
import { setRole, track } from "@/lib/analytics";

type Props = ComponentProps<typeof Link> & { role: Role; source: "landing" | "switcher" };

/** A link into a role area that records which role the reviewer chose. */
export function RoleLink({ role, source, onClick, ...rest }: Props) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        setRole(role);
        track("role_selected", { role, source });
        onClick?.(e);
      }}
    />
  );
}
