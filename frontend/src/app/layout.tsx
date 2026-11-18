import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PCOSmart",
    template: "%s | PCOSmart",
  },
  description:
    "Ruang aman dan teman setia untuk merawat ritme tubuhmu setiap hari.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#54309c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
