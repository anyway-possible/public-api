import Link from "next/link";
import { BrandMark } from "./brand-mark";

function Wordmark() {
  return <span className="quiet-wordmark"><BrandMark /><span><strong>Anyway Possible</strong><small>Agent decision infrastructure</small></span></span>;
}

export function SiteHeader() {
  return <nav className="quiet-nav" aria-label="Primary navigation">
    <Link href="/" aria-label="Anyway Possible home"><Wordmark /></Link>
    <div><Link href="/#products">Tools</Link><Link href="/#how-it-works">How it works</Link><Link href="/guides">Guides</Link><Link href="/docs">Docs</Link><Link className="quiet-nav-cta" href="/#api">Connect agent</Link></div>
  </nav>;
}

export function SiteFooter() {
  return <footer className="quiet-footer">
    <Link href="/" aria-label="Anyway Possible home"><Wordmark /></Link>
    <span>Base mainnet · x402 USDC</span>
    <nav aria-label="Footer navigation"><Link href="/guides">Guides</Link><Link href="/status">Status</Link><Link href="/examples">Examples</Link><Link href="/docs">Docs</Link><a href="/llms.txt">llms.txt</a></nav>
    <small>© 2026 Anyway Possible</small>
  </footer>;
}
