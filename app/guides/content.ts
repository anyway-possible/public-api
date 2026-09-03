export type Guide = {
  slug: string;
  eyebrow: string;
  title: string;
  description: string;
  intro: string;
  sections: Array<{ heading: string; paragraphs: string[]; bullets?: string[] }>;
  faq: Array<{ question: string; answer: string }>;
  relatedTool: { name: string; price: string; endpoint: string; reason: string };
};

export const guides: Guide[] = [
  {
    slug: "what-is-x402",
    eyebrow: "PLAIN-ENGLISH EXPLAINER",
    title: "What is x402?",
    description: "A plain-English guide to x402 payments: how AI agents pay for one API request at a time using HTTP 402 and USDC.",
    intro: "x402 is a way for software to pay for a single online service exactly when it needs it. The API asks for payment, the agent authorizes the quoted amount, and the API returns the answer—without an account, subscription, or API key.",
    sections: [
      { heading: "The simple version", paragraphs: ["Imagine a vending machine for software. An agent asks for one result. The service displays the exact price. The agent pays, receives that result, and moves on.", "The name comes from HTTP status code 402, which means Payment Required. x402 turns that long-reserved status into a practical machine-payment flow."] },
      { heading: "What happens during a call", paragraphs: ["The first request receives a payment requirement instead of the paid result. That requirement identifies the price, network, asset, recipient, and expiration. The agent decides whether the terms match its instructions, authorizes payment, and repeats the request with proof."], bullets: ["The service quotes a precise price.", "The agent keeps control of whether to pay.", "Settlement and the API response happen as one machine-readable flow.", "No human checkout page is required."] },
      { heading: "Why agents need another safety layer", paragraphs: ["A valid payment request is not automatically a wise payment. The wallet may be underfunded, the recipient may be unexpected, or the quoted price may exceed the agent's limit. Decision checks turn payment capability into controlled payment behavior."] },
    ],
    faq: [
      { question: "Does x402 require an account?", answer: "Not necessarily. A service can accept an x402 payment without creating a customer account or issuing an API key." },
      { question: "What currency does Anyway Possible use?", answer: "Anyway Possible accepts USDC payments on Base mainnet for its paid API and MCP tools." },
      { question: "Can an AI agent pay automatically?", answer: "Yes, when its wallet and policy allow it. The agent still needs to validate the price and payment terms before authorizing the transaction." },
    ],
    relatedTool: { name: "Payment Guard", price: "$0.01 USDC", endpoint: "/api/payment-guard", reason: "Validate the live x402 terms immediately before an agent signs." },
  },
  {
    slug: "x402-payment-safety",
    eyebrow: "AGENT PAYMENT SAFETY",
    title: "How should an AI agent verify an x402 payment?",
    description: "A practical preflight checklist for AI agents making x402 USDC payments on Base: funding, network, price, recipient, and signing safety.",
    intro: "An autonomous payment should be treated like a decision, not a reflex. Before signing, the agent should confirm that the live payment request still matches its intent and that the wallet can complete the transaction safely.",
    sections: [
      { heading: "Check the wallet before shopping", paragraphs: ["Read the current ETH and USDC balances first. Then compare the planned spend with the available USDC while preserving enough ETH for any required gas. A preflight result should say whether to proceed, fund, review, or reject—not merely return raw balances."] },
      { heading: "Validate the live challenge", paragraphs: ["The final check belongs as close to signing as possible because prices and payment requirements can change. Inspect the current HTTP 402 challenge rather than relying on an earlier catalog entry."], bullets: ["Confirm Base mainnet is the requested network.", "Confirm the asset is the expected USDC contract.", "Enforce a maximum price set before the call.", "Compare the recipient with any expected address.", "Reject self-payment and review contract recipients.", "Confirm the buyer still has sufficient funding."] },
      { heading: "Keep the evidence", paragraphs: ["A useful guard returns individual checks, warnings, and a recommended action in structured JSON. That gives the calling agent a reason it can log, explain, or use in a policy decision."] },
    ],
    faq: [
      { question: "Is a successful x402 validation a guarantee?", answer: "No. It confirms the observable payment contract and current chain state, not future service quality, recipient identity, legality, or contract behavior." },
      { question: "When should Payment Guard run?", answer: "Run it immediately before signing, after the agent has selected a service and received its current payment requirement." },
      { question: "What happens when a check fails?", answer: "The safest outcome is a structured fund, review, or reject decision rather than an automatic signature." },
    ],
    relatedTool: { name: "Payment Guard", price: "$0.01 USDC", endpoint: "/api/payment-guard", reason: "Check price, recipient, network, funding, gas, and destination before signing." },
  },
  {
    slug: "x402-api-not-selling",
    eyebrow: "X402 MERCHANT GUIDE",
    title: "Why is my x402 API not selling?",
    description: "Diagnose weak x402 API sales by checking marketplace discovery, buyer-search language, pricing, payment reliability, and independent demand.",
    intro: "A working endpoint can still earn nothing. Buyers must discover it for the words they actually use, understand the result before paying, trust the payment flow, and see a price that makes sense beside close alternatives.",
    sections: [
      { heading: "Start with discovery", paragraphs: ["Search the marketplace using realistic buyer intent, not just your product name. If the listing does not appear for the problem it solves, better code will not create demand by itself."], bullets: ["Use a specific service name.", "Write the description around the buyer's decision.", "Include complete input and output examples.", "Add tags that match real purchase intent."] },
      { heading: "Prove the payment path works", paragraphs: ["Every listed endpoint should reliably return a valid 402 challenge before payment. Broken or inconsistent challenges waste an agent's time and teach aggregators that the listing is unhealthy."] },
      { heading: "Separate visibility from pricing", paragraphs: ["Lowering the price cannot fix a listing nobody sees. First measure ranking, reliability, and independent buyers. Then compare close substitutes and test one price change at a time."] },
    ],
    faq: [
      { question: "What is the fastest diagnostic?", answer: "A Merchant Snapshot identifies the single largest observable revenue problem using discovery, reliability, buyer, and Base USDC signals." },
      { question: "When is a full audit useful?", answer: "Use a full Merchant Audit when you need listing-level defects, exact search rankings, competitor prices, payment reliability, and prioritized fixes." },
      { question: "Can public data prove revenue?", answer: "No. Marketplace and onchain activity are useful signals, but they cannot prove that every payment is a customer purchase." },
    ],
    relatedTool: { name: "Merchant Snapshot", price: "$0.05 USDC", endpoint: "/api/merchant-snapshot", reason: "Find the largest observable reason an x402 listing is not earning." },
  },
];

export function findGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}
