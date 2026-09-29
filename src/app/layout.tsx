import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Inter has no ৳ (taka) glyph; Noto Sans Bengali supplies it as a fallback.
const bengali = Noto_Sans_Bengali({ variable: "--font-bengali", subsets: ["bengali"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "STS Group — Online Cafeteria Ordering",
  description: "Order ahead from STS Group cafeterias. Working prototype: payment, SMS and HR list are sandbox.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Cafeteria Ordering", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Every page reads live data (orders, demo clock), so nothing is prerendered.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" className={`${inter.variable} ${bengali.variable}`}>
      <body>{children}</body>
    </html>
  );
}
