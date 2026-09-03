const BASE_RPCS = [
  "https://base-rpc.publicnode.com",
  "https://base-mainnet.public.blastapi.io",
  "https://base.drpc.org",
  "https://mainnet.base.org",
] as const;

export const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

async function rpc(method: string, params: unknown[]) {
  let lastError = "No Base RPC endpoint responded.";
  for (const endpoint of BASE_RPCS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(6_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as { result?: string; error?: { message?: string } };
      if (!payload.result) throw new Error(payload.error?.message ?? "missing result");
      return payload.result;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "unknown upstream error";
    }
  }
  throw new Error(`Base RPC unavailable: ${lastError}`);
}

export function formatUnits(value: bigint, decimals: number) {
  const raw = value.toString().padStart(decimals + 1, "0");
  const whole = raw.slice(0, -decimals);
  const fraction = raw.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

export async function readBaseBalance(addressValue: string) {
  const address = addressValue.toLowerCase();
  const balanceOfData = `0x70a08231${address.slice(2).padStart(64, "0")}`;
  const [ethHex, usdcHex, blockHex] = await Promise.all([
    rpc("eth_getBalance", [address, "latest"]),
    rpc("eth_call", [{ to: BASE_USDC, data: balanceOfData }, "latest"]),
    rpc("eth_blockNumber", []),
  ]);
  const ethAtomic = BigInt(ethHex);
  const usdcAtomic = BigInt(usdcHex);
  const observedAt = new Date().toISOString();
  return {
    address,
    network: "Base",
    chainId: 8453,
    eth: formatUnits(ethAtomic, 18),
    usdc: formatUnits(usdcAtomic, 6),
    ethAtomic: ethAtomic.toString(),
    usdcAtomic: usdcAtomic.toString(),
    usdcContract: BASE_USDC,
    blockNumber: Number(BigInt(blockHex)),
    observedAt,
    recommendedNext: {
      endpoint: "https://anywaypossible.com/api/treasury",
      priceUsd: "0.02",
      reason: "Check whether this wallet can fund a planned USDC spend while preserving its ETH gas reserve.",
      request: { address, plannedSpendUsdc: "1.00", minGasReserveEth: "0.00005" },
    },
  };
}
