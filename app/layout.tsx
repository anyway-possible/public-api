import type { Metadata } from "next";
import { headers } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import "./quiet.css";
import "./guides.css";
import "./reference.css";

const siteUrl = "https://anywaypossible.com";
const description = "Decision-ready checks for autonomous agents before they pay, cite, or act—available over MCP and HTTP with x402 USDC payments.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Anyway Possible — Decision Infrastructure for Agents",
  description,
  alternates: { canonical: "/" },
  icons: { icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/favicon.png", type: "image/png" }] },
  robots: { index: true, follow: true },
  openGraph: { title: "Anyway Possible — Confidence for the Decisions Agents Make", description, url: siteUrl, siteName: "Anyway Possible", type: "website", images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Anyway Possible — Confidence for the decisions agents make" }] },
  twitter: { card: "summary_large_image", title: "Anyway Possible — Confidence for the Decisions Agents Make", description, images: ["/og.jpg"] },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "Anyway Possible", url: siteUrl, logo: `${siteUrl}/favicon.png`, sameAs: ["https://github.com/anyway-possible"] },
    { "@type": "WebSite", "@id": `${siteUrl}/#website`, url: siteUrl, name: "Anyway Possible", description, publisher: { "@id": `${siteUrl}/#organization` } },
    { "@type": "Service", "@id": `${siteUrl}/#service`, name: "Anyway Possible Agent Decision Infrastructure", description, url: siteUrl, provider: { "@id": `${siteUrl}/#organization` }, serviceType: "Decision-ready APIs and MCP tools for autonomous agents", areaServed: "Worldwide", hasOfferCatalog: { "@type": "OfferCatalog", name: "Agent decision tools", itemListElement: ["Free MCP tool recommendation", "Merchant intelligence", "Base wallet readiness", "Agent payment safety", "Verifiable web evidence", "Batch URL validation", "Base wallet balances"].map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })) } },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <html lang="en"><head><script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></head><body className={`${GeistSans.variable} ${GeistMono.variable}`}><a className="skip-link" href="#main-content">Skip to content</a><div id="main-content">{children}</div></body></html>;
}
