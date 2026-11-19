import type { SVGProps } from "react";

const paths = {
  check: "M3.5 8.5l3 3 6-7",
  x: "M4 4l8 8M12 4l-8 8",
  alert: "M8 2.5l6 10.5H2L8 2.5zM8 6.5v3M8 11.25v.25",
  info: "M8 14A6 6 0 108 2a6 6 0 000 12zM8 7.25v3.5M8 5v.25",
  upload: "M8 10.5v-8M4.75 5.5L8 2.25l3.25 3.25M2.5 10.5v2a1 1 0 001 1h9a1 1 0 001-1v-2",
  document: "M4 1.75h5.5l2.5 2.5v10H4v-12.5zM9.25 1.75v2.75H12M6 8h4M6 10.5h4",
  "chevron-right": "M6 3.5L10.5 8 6 12.5",
  "chevron-down": "M3.5 6L8 10.5 12.5 6",
  "arrow-right": "M2.5 8h11M9.5 4l4 4-4 4",
  clock: "M8 14A6 6 0 108 2a6 6 0 000 12zM8 4.75V8l2.25 1.5",
  bell: "M4 11V7a4 4 0 118 0v4l1.25 1.5H2.75L4 11zM6.5 13.75a1.5 1.5 0 003 0",
  truck: "M1.5 4h7.5v7H1.5zM9 6.5h3l2.5 2.25V11H9M4.25 13a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5zM11.75 13a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z",
  search: "M7 11.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9zM10.5 10.5l3 3",
  plus: "M8 3v10M3 8h10",
  minus: "M3 8h10",
  external: "M6.5 3.5h-3v9h9v-3M9 2.5h4.5V7M13.5 2.5L7.5 8.5",
} as const;

export type IconName = keyof typeof paths;

/** Glyphs that point along the reading direction; they mirror in right-to-left text. */
const DIRECTIONAL: ReadonlySet<IconName> = new Set<IconName>(["arrow-right", "chevron-right", "external"]);

/** 16px, 1.5 stroke, one weight everywhere. Decorative unless `label` is set. */
export function Icon({ name, label, size = 16, className, ...rest }: { name: IconName; label?: string; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={DIRECTIONAL.has(name) ? `rtl:-scale-x-100 ${className ?? ""}`.trim() : className}
      {...rest}
    >
      <path d={paths[name]} />
    </svg>
  );
}
