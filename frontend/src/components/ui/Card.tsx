import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardTone = "surface" | "tint" | "peach";

const toneClasses: Record<CardTone, string> = {
  surface: "bg-surface shadow-card",
  tint: "bg-tint-strong",
  peach: "bg-peach text-clay",
};

type CardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: CardTone;
};

export function Card({ tone = "surface", className, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-card p-5 sm:p-6", toneClasses[tone], className)}
      {...props}
    />
  );
}
