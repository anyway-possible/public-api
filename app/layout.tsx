import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import "./quiet.css";
import "./guides.css";

const siteUrl = "https://anywaypossible.com";
const description = "Decision-ready checks for autonomous agents before they pay, cite, or act—available over MCP and HTTP with x402 USDC payments.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Anyway Possible — Decision Infrastructure for Agents",
  description,
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.png" },
  robots: { index: true, follow: true },
  openGraph: { title: "Anyway Possible — Confidence for the Decisions Agents Make", description, url: siteUrl, siteName: "Anyway Possible", type: "website", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Anyway Possible — Confidence for the decisions agents make" }] },
  twitter: { card: "summary_large_image", title: "Anyway Possible — Confidence for the Decisions Agents Make", description, images: ["/og.png"] },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "Anyway Possible", url: siteUrl, logo: `${siteUrl}/favicon.png`, sameAs: ["https://github.com/anyway-possible"] },
    { "@type": "WebSite", "@id": `${siteUrl}/#website`, url: siteUrl, name: "Anyway Possible", description, publisher: { "@id": `${siteUrl}/#organization` } },
    { "@type": "Service", "@id": `${siteUrl}/#service`, name: "Anyway Possible Agent Decision Infrastructure", description, url: siteUrl, provider: { "@id": `${siteUrl}/#organization` }, serviceType: "Paid decision-ready APIs and MCP tools for autonomous agents", areaServed: "Worldwide", hasOfferCatalog: { "@type": "OfferCatalog", name: "Agent decision tools", itemListElement: ["Merchant intelligence", "Base payment preflight", "Payment signing safety", "Verifiable web evidence", "Batch URL validation", "Base wallet balances"].map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })) } },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><head><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></head><body className={`${GeistSans.variable} ${GeistMono.variable}`}>{children}</body></html>;
}
