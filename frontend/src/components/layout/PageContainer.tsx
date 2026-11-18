import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Pembungkus konten halaman. Desain Figma berupa layar mobile (lebar ~390-430px),
 * jadi lebar dasarnya `max-w-md` dan berada di tengah pada layar yang lebih lebar.
 * Halaman yang butuh lebih lebar bisa menambah class, misalnya `lg:max-w-5xl`.
 */
export function PageContainer({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <main
      className={cn("mx-auto w-full max-w-md px-4 sm:px-6", className)}
      {...props}
    />
  );
}
