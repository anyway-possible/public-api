import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "anywaypossible.com";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og-treasury.png`;
  const description = "Pay-per-call Base USDC payment preflight, wallet intelligence, and web evidence for autonomous agents using x402.";
  return {
    title: "Anyway Possible — Payment Preflight for AI Agents",
    description,
    icons: { icon: "/favicon.svg" },
    openGraph: { title: "Anyway Possible", description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: "Anyway Possible", description, images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
