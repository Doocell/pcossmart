import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Logo PCOSmart: ikon teratai (aset asli dari desain Figma) + wordmark teks.
 * Aset ikon masih berupa PNG hasil crop dari PDF ekspor Figma; idealnya diganti SVG dari UI/UX.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/images/logo-mark.png"
        alt=""
        width={40}
        height={40}
        priority
        className="size-10"
      />
      <span className="text-xl font-bold tracking-tight text-primary">
        PCOSmart
      </span>
    </span>
  );
}
