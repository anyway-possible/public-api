const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const BASE_RPCS = [
  "https://base-rpc.publicnode.com",
  "https://base-mainnet.public.blastapi.io",
  "https://base.drpc.org",
  "https://mainnet.base.org",
] as const;

export type TreasuryInput = {
  address: string;
  destinationAddress?: string;
  plannedSpendUsdc?: string;
  minGasReserveEth?: string;
  expectedChainId?: number;
};

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

function parseUnits(value: string, decimals: number) {
  if (!new RegExp(`^[0-9]+(?:\\.[0-9]{1,${decimals}})?$`).test(value)) throw new Error("invalid decimal amount");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0"));
}

function formatUnits(value: bigint, decimals: number) {
  const raw = value.toString().padStart(decimals + 1, "0");
  const whole = raw.slice(0, -decimals);
  const fraction = raw.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function shortfall(balance: bigint, requirement: bigint) {
  return requirement > balance ? requirement - balance : 0n;
}

export async function createTreasuryPreflight(input: TreasuryInput) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(input.address)) throw new Error("address must be a valid 20-byte EVM address.");
  if (input.destinationAddress && !/^0x[a-fA-F0-9]{40}$/.test(input.destinationAddress)) throw new Error("destinationAddress must be a valid 20-byte EVM address.");
  if (input.expectedChainId !== undefined && input.expectedChainId !== 8453) throw new Error("expectedChainId must be 8453. This preflight service evaluates Base mainnet only.");

  const plannedSpendUsdc = input.plannedSpendUsdc ?? "1.00";
  const minGasReserveEth = input.minGasReserveEth ?? "0.00005";
  let plannedAtomic: bigint;
  let gasReserveAtomic: bigint;
  try {
    plannedAtomic = parseUnits(plannedSpendUsdc, 6);
    gasReserveAtomic = parseUnits(minGasReserveEth, 18);
    if (plannedAtomic <= 0n) throw new Error("planned spend must be positive");
  } catch {
    throw new Error("plannedSpendUsdc must be positive with at most 6 decimals; minGasReserveEth must be non-negative with at most 18 decimals.");
  }

  const address = input.address.toLowerCase();
  const destinationAddress = input.destinationAddress?.toLowerCase() ?? null;
  const balanceOfData = `0x70a08231${address.slice(2).padStart(64, "0")}`;
  const [ethHex, usdcHex, blockHex, chainHex, destinationCode] = await Promise.all([
    rpc("eth_getBalance", [address, "latest"]),
    rpc("eth_call", [{ to: BASE_USDC, data: balanceOfData }, "latest"]),
    rpc("eth_blockNumber", []),
    rpc("eth_chainId", []),
    destinationAddress ? rpc("eth_getCode", [destinationAddress, "latest"]) : Promise.resolve("0x"),
  ]);
  const chainId = Number(BigInt(chainHex));
  if (chainId !== 8453) throw new Error(`RPC returned unexpected chain ${chainId}`);
  const ethAtomic = BigInt(ethHex);
  const usdcAtomic = BigInt(usdcHex);
  const hasUsdc = usdcAtomic >= plannedAtomic;
  const hasGas = ethAtomic >= gasReserveAtomic;
  const ready = hasUsdc && hasGas;
  const status = ready ? "ready" : !hasUsdc && !hasGas ? "needs_funding" : !hasUsdc ? "needs_usdc" : "needs_gas";
  const destinationKind = !destinationAddress ? "not_provided" : destinationCode === "0x" || destinationCode === "0x0" ? "eoa" : "contract";
  const destinationIsZero = destinationAddress === ZERO_ADDRESS;
  const destinationIsTokenContract = destinationAddress === BASE_USDC.toLowerCase();
  const destinationIsSelf = destinationAddress === address;
  const destinationNeedsReview = !destinationAddress || destinationIsSelf || destinationKind === "contract";
  const decision = destinationIsZero || destinationIsTokenContract ? "reject" : !hasUsdc ? "needs_funding" : !hasGas ? "needs_gas" : destinationNeedsReview ? "review_destination" : "safe_to_pay";
  const safeToProceed = decision === "safe_to_pay";
  const riskLevel = decision === "reject" ? "high" : safeToProceed ? "low" : "medium";
  const recommendedAction = decision === "reject"
    ? "Do not submit this payment. Correct the destination address first."
    : decision === "needs_funding"
      ? `Fund the wallet with at least ${formatUnits(shortfall(usdcAtomic, plannedAtomic), 6)} USDC${!hasGas ? ` and ${formatUnits(shortfall(ethAtomic, gasReserveAtomic), 18)} ETH` : ""} before paying.`
      : decision === "needs_gas"
        ? `Add at least ${formatUnits(shortfall(ethAtomic, gasReserveAtomic), 18)} ETH to meet the requested gas reserve.`
        : !destinationAddress
          ? "Provide destinationAddress for a transaction-level decision. Wallet funding is sufficient."
          : destinationIsSelf
            ? "Confirm that a self-payment is intentional before signing."
            : destinationKind === "contract"
              ? "Confirm that the destination contract is intended and accepts direct USDC transfers before signing."
              : "Funding, network, and basic destination checks passed. The agent may proceed within the stated amount.";
  const checks = [
    { id: "network", status: "pass", message: "Base mainnet chain ID 8453 confirmed." },
    { id: "usdc_funding", status: hasUsdc ? "pass" : "fail", message: hasUsdc ? "USDC covers the planned spend." : "USDC is below the planned spend." },
    { id: "gas_reserve", status: hasGas ? "pass" : "fail", message: hasGas ? "ETH meets the requested gas reserve." : "ETH is below the requested gas reserve." },
    { id: "destination", status: !destinationAddress ? "warn" : destinationIsZero || destinationIsTokenContract ? "fail" : destinationIsSelf || destinationKind === "contract" ? "warn" : "pass", message: !destinationAddress ? "No destination supplied; transaction-level hazards were not evaluated." : destinationIsZero ? "Destination is the zero address." : destinationIsTokenContract ? "Destination is the USDC token contract, not a payment recipient." : destinationIsSelf ? "Destination matches the paying wallet." : destinationKind === "contract" ? "Destination contains deployed contract code." : "Destination is a syntactically valid externally owned account." },
  ];
  const alerts = [
    ...(!hasUsdc ? ["USDC balance is below the planned spend."] : []),
    ...(!hasGas ? ["ETH balance is below the requested gas reserve."] : []),
    ...(destinationIsZero ? ["Zero-address destination would make funds unrecoverable."] : []),
    ...(destinationIsTokenContract ? ["Sending USDC directly to the token contract can make funds unrecoverable."] : []),
    ...(destinationIsSelf ? ["Destination equals the paying wallet."] : []),
    ...(destinationKind === "contract" ? ["Contract destination requires caller confirmation."] : []),
    ...(!destinationAddress ? ["Destination was not checked."] : []),
  ];
  const observedAt = new Date().toISOString();
  return {
    address, destinationAddress, destinationKind, network: "Base", chainId, status, ready, safeToProceed, decision, riskLevel, recommendedAction,
    eth: formatUnits(ethAtomic, 18), usdc: formatUnits(usdcAtomic, 6),
    plannedSpendUsdc: formatUnits(plannedAtomic, 6), minGasReserveEth: formatUnits(gasReserveAtomic, 18),
    usdcShortfall: formatUnits(shortfall(usdcAtomic, plannedAtomic), 6),
    gasShortfallEth: formatUnits(shortfall(ethAtomic, gasReserveAtomic), 18),
    paymentCapacity: {
      at0_001: (usdcAtomic / 1_000n).toString(), at0_01: (usdcAtomic / 10_000n).toString(),
      at0_05: (usdcAtomic / 50_000n).toString(), at0_10: (usdcAtomic / 100_000n).toString(),
    },
    checks, alerts,
    recommendedNext: {
      endpoint: "https://anywaypossible.com/api/payment-guard",
      priceUsd: 0.01,
      when: "Before signing an x402 purchase, validate the live challenge against this wallet, intended recipient, and price ceiling.",
      request: { payerAddress: address, serviceUrl: "https://merchant.example/api/product", maxAmountUsdc: formatUnits(plannedAtomic, 6), ...(destinationAddress ? { expectedPayTo: destinationAddress } : {}), minGasReserveEth: formatUnits(gasReserveAtomic, 18) },
    },
    limitations: ["This preflight checks onchain state and basic destination hazards; it does not guarantee recipient identity, legality, sanctions status, contract behavior, or future settlement success."],
    usdcContract: BASE_USDC, blockNumber: Number(BigInt(blockHex)), observedAt,
  };
}
