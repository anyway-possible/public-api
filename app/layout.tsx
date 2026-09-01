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
  const image = `${protocol}://${host}/og.png`;
  const description = "Decision-ready checks for autonomous agents before they pay, cite, or act—available over MCP and HTTP with x402 USDC payments.";
  return {
    title: "Anyway Possible — Decision Infrastructure for Agents",
    description,
    icons: { icon: "/favicon.svg" },
    openGraph: { title: "Anyway Possible — Check Before Your Agent Acts", description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: "Anyway Possible — Check Before Your Agent Acts", description, images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
