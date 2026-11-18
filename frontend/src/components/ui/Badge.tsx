import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeTone = "tint" | "teal" | "peach";

const toneClasses: Record<BadgeTone, string> = {
  tint: "bg-tint-strong text-primary",
  teal: "bg-teal-soft text-teal",
  peach: "bg-peach text-clay",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ tone = "tint", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
