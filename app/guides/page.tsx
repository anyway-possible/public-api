import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "../brand-mark";
import { guides } from "./content";

export const metadata: Metadata = {
  title: "Guides for x402 Agents and Merchants — Anyway Possible",
  description: "Plain-English guides to x402 payments, autonomous-agent payment safety, and improving x402 API discovery and sales.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  return <main className="guide-shell"><nav className="guide-nav"><Link href="/"><BrandMark /><strong>Anyway Possible</strong></Link><Link href="/">Back to tools</Link></nav><header className="guide-index-hero"><p>FIELD GUIDES</p><h1>Understand the system.<br /><em>Use it responsibly.</em></h1><span>Practical explanations for people building, buying, and selling agent services.</span></header><section className="guide-index-grid">{guides.map((guide, index) => <Link href={`/guides/${guide.slug}`} key={guide.slug}><small>0{index + 1} · {guide.eyebrow}</small><h2>{guide.title}</h2><p>{guide.description}</p><b>Read guide →</b></Link>)}</section><footer className="guide-footer"><BrandMark /><span>Decision infrastructure for autonomous agents.</span><Link href="/">anywaypossible.com</Link></footer></main>;
}
