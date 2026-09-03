# Anyway Possible

Anyway Possible provides paid, decision-ready checks for autonomous agents before they pay, cite, or act. Agents can connect without an account through remote MCP or call the HTTP APIs directly, paying per successful answer in USDC on Base through x402.

## Why it exists

An agent can reason over information it already has, but it cannot independently create fresh external evidence, enforce a payment policy at signing time, or turn several live systems into a stable answer by reasoning alone. Anyway Possible performs those bounded observations and validations, then returns structured decisions with timestamps, receipts, hashes, and explicit limitations where relevant.

## Connect

Remote MCP endpoint:

```text
https://anywaypossible.com/api/mcp
```

Machine-readable contracts:

- [Human integration guide](https://anywaypossible.com/docs)
- [Result examples](https://anywaypossible.com/examples)
- [OpenAPI](https://anywaypossible.com/openapi.json)
- [Tool catalog](https://anywaypossible.com/catalog.json)
- [LLM instructions](https://anywaypossible.com/llms.txt)

## Tools

| Job | HTTP route | MCP tool | Price |
| --- | --- | --- | ---: |
| Diagnose why an x402 API is not selling | `/api/merchant-snapshot` | `merchant_snapshot` | $0.05 |
| Run a complete x402 merchant revenue audit | `/api/merchant-audit` | `merchant_audit` | $0.25 |
| Check a Base wallet before payment | `/api/treasury` | `treasury_preflight` | $0.02 |
| Validate an x402 purchase before signing | `/api/payment-guard` | `payment_guard` | $0.01 |
| Read ETH and USDC balances on Base | `/api/base-balance` | `base_balance` | $0.001 |
| Check one public URL | `/api/check` | `check_url` | $0.001 |
| Verify timestamped web evidence | `/api/verify` | `verify_web_evidence` | $0.01 |
| Check up to ten public URLs | `/api/batch` | `batch_check_urls` | $0.01 |

All prices are USDC on Base mainnet. An unpaid request returns an x402 v2 payment requirement containing the exact amount, asset, network, recipient, and timeout. The client decides whether to sign and then retries with payment authorization.

## Discovery

The service is discoverable through Coinbase x402 Bazaar metadata, the official MCP Registry, direct HTTP/OpenAPI, `llms.txt`, and the public catalog. Human-facing guides explain x402, payment safety, and merchant conversion in plain language.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
npm test
npm run lint
```

The canonical product definitions live in `lib/product-catalog.mjs`. The homepage, docs, examples, catalog, OpenAPI document, and `llms.txt` are generated from that shared manifest so names, prices, schemas, and examples cannot drift independently.

## Security

The APIs reject private and local network targets, bound response sizes and redirects, avoid exposing payer identities in public analytics, and publish a security contact at `/.well-known/security.txt`. The public status page states exactly what its current check proves and does not claim unrecorded historical uptime.
