import { T } from "@/components/i18n/t";
import { common } from "@/i18n/common";
import { msg } from "@/i18n/core";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./icon";

export type Tone = "neutral" | "positive" | "caution" | "negative" | "info" | "ai";

const tones: Record<Tone, string> = {
  neutral: "bg-neutral-soft text-ink-muted",
  positive: "bg-positive-soft text-positive",
  caution: "bg-caution-soft text-caution",
  negative: "bg-negative-soft text-negative",
  info: "bg-stamp-soft text-stamp",
  ai: "bg-ai-soft text-ai",
};

const toneIcon: Record<Tone, IconName | null> = {
  neutral: null,
  positive: "check",
  caution: "alert",
  negative: "x",
  info: "info",
  ai: null,
};

/**
 * Status in words, with a shape as well as a colour so it survives greyscale.
 * Not pressable: a badge never takes the action green.
 */
export function Badge({ tone = "neutral", icon, children, className }: { tone?: Tone; icon?: IconName | false; children: ReactNode; className?: string }) {
  const name = icon === false ? null : (icon ?? toneIcon[tone]);
  return (
    <span className={cx("inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-sm px-2 text-xs font-medium", tones[tone], className)}>
      {name ? <Icon name={name} size={12} strokeWidth={2} /> : null}
      {children}
    </span>
  );
}

/** Required wherever simulated AI produced what is shown. */
export function AiLabel({ agent, confidence, className }: { agent?: string; confidence?: number; className?: string }) {
  return (
    <span className={cx("inline-flex min-h-6 max-w-full flex-wrap items-center gap-x-1.5 rounded-sm border border-dashed border-ai-line bg-ai-soft px-2 py-0.5 text-xs font-medium text-ai", className)}>
      <T m={msg(common, (m) => m.ui.simulatedAi)} />
      {agent ? ` · ${agent}` : ""}
      {confidence === undefined ? null : (
        <span className="font-normal">
          <T m={msg(common, (m) => m.ui.confident)} values={{ n: Math.round(confidence * 100) }} />
        </span>
      )}
    </span>
  );
}

/** Required wherever sample data could be mistaken for real companies or figures. */
export function SampleDataLabel({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex h-6 items-center whitespace-nowrap rounded-sm border border-dashed border-line-strong px-2 text-xs font-medium text-ink-muted", className)}>
      <T m={msg(common, (m) => m.ui.sampleDataShort)} />
    </span>
  );
}
