import { BASE_USDC, formatUnits } from "./base-balance";
import { parsePublicUrl } from "./verification";

export type PaymentGuardInput = {
  payerAddress: string;
  serviceUrl: string;
  maxAmountUsdc: string;
  expectedPayTo?: string;
  minGasReserveEth?: string;
};

function units(value: string, decimals: number) {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0"));
}

async function rpc(method: string, params: unknown[]) {
  const response = await fetch("https://base-rpc.publicnode.com", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(8_000),
  });
  const payload = await response.json() as { result?: string };
  if (!payload.result) throw new Error("Base RPC failed");
  return payload.result;
}

export async function evaluatePaymentGuard(input: PaymentGuardInput) {
  parsePublicUrl(input.serviceUrl);
  const maxAtomic = units(input.maxAmountUsdc, 6);
  const gasAtomic = units(input.minGasReserveEth ?? "0", 18);
  const payer = input.payerAddress.toLowerCase();
  const validationResponse = await fetch("https://api.cdp.coinbase.com/platform/v2/x402/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ resource: input.serviceUrl, method: "POST" }),
    signal: AbortSignal.timeout(10_000),
  });
  const validation = await validationResponse.json() as { valid?: boolean; statusCode?: number; simulation?: { outcome?: string }; paymentRequirements?: { accepts?: Array<{ amount?: string; network?: string; asset?: string; payTo?: string }> } };
  const quote = validation.paymentRequirements?.accepts?.[0];
  const quotedAtomic = quote?.amount && /^\d+$/.test(quote.amount) ? BigInt(quote.amount) : 0n;
  const quotedPayTo = quote?.payTo?.toLowerCase() ?? "";
  const balanceData = `0x70a08231${payer.slice(2).padStart(64, "0")}`;
  const [usdcHex, ethHex, code] = await Promise.all([
    rpc("eth_call", [{ to: BASE_USDC, data: balanceData }, "latest"]),
    rpc("eth_getBalance", [payer, "latest"]),
    quotedPayTo ? rpc("eth_getCode", [quotedPayTo, "latest"]) : Promise.resolve("0x"),
  ]);
  const usdcBalance = BigInt(usdcHex);
  const ethBalance = BigInt(ethHex);
  const contractValid = validation.valid === true && validation.statusCode === 402 && validation.simulation?.outcome === "accepted";
  const base = quote?.network === "eip155:8453";
  const asset = quote?.asset?.toLowerCase() === BASE_USDC.toLowerCase();
  const withinLimit = quotedAtomic > 0n && quotedAtomic <= maxAtomic;
  const recipientMatches = !input.expectedPayTo || quotedPayTo === input.expectedPayTo.toLowerCase();
  const notSelf = quotedPayTo !== payer;
  const funded = usdcBalance >= quotedAtomic;
  const gasReady = ethBalance >= gasAtomic;
  const checks = [
    { id: "x402_contract", status: contractValid ? "pass" : "fail" },
    { id: "base_network", status: base ? "pass" : "fail" },
    { id: "usdc_asset", status: asset ? "pass" : "fail" },
    { id: "price_ceiling", status: withinLimit ? "pass" : "fail" },
    { id: "recipient", status: recipientMatches && notSelf && quotedPayTo ? (code === "0x" || code === "0x0" ? "pass" : "warn") : "fail" },
    { id: "buyer_funding", status: funded ? "pass" : "fail" },
    { id: "gas_reserve", status: gasReady ? "pass" : "fail" },
  ];
  const failed = checks.some((check) => check.status === "fail");
  const warned = checks.some((check) => check.status === "warn");
  const decision = failed ? (!funded || !gasReady ? "needs_funding" : "reject") : warned ? "review_recipient" : "safe_to_sign";
  return {
    decision,
    safeToSign: decision === "safe_to_sign",
    riskLevel: failed ? "high" : warned ? "medium" : "low",
    serviceUrl: input.serviceUrl,
    quotedAmountUsdc: formatUnits(quotedAtomic, 6),
    maxAmountUsdc: formatUnits(maxAtomic, 6),
    quotedPayTo,
    network: quote?.network ?? null,
    asset: quote?.asset ?? null,
    payerUsdc: formatUnits(usdcBalance, 6),
    payerEth: formatUnits(ethBalance, 18),
    destinationKind: code === "0x" || code === "0x0" ? "eoa" : "contract",
    checks,
    alerts: checks.filter((check) => check.status !== "pass").map((check) => `${check.id}: ${check.status}`),
    recommendedAction: decision === "safe_to_sign" ? "Sign only the validated payment requirements and do not exceed the quoted amount." : decision === "review_recipient" ? "Confirm the recipient contract before signing." : decision === "needs_funding" ? "Fund the buyer wallet before signing." : "Do not sign; the live x402 contract conflicts with the stated constraints.",
    observedAt: new Date().toISOString(),
    limitations: ["This validates public x402 metadata and current Base state; it cannot guarantee future service quality, recipient identity, legality, or contract behavior."],
  };
}
