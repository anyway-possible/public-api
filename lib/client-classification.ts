export type ClientType =
  | "internal_probe"
  | "marketplace_probe"
  | "crawler_monitor"
  | "agent_sdk"
  | "command_line"
  | "browser"
  | "programmatic"
  | "unknown";

export function classifyUserAgent(
  userAgentValue: string | null | undefined,
  flags: { selfTest?: boolean; releaseProbe?: boolean; emptyNodeProbe?: boolean } = {},
): ClientType {
  const userAgent = (userAgentValue ?? "").trim();
  const normalized = userAgent.toLowerCase();

  if (flags.selfTest || flags.releaseProbe || flags.emptyNodeProbe) return "internal_probe";
  if (normalized.includes("coinbasebazaardiscovery/")) return "marketplace_probe";
  if (/bot\b|crawler|spider|preview|uptime|monitor|healthcheck|statuscake|pingdom|headless/.test(normalized)) return "crawler_monitor";
  if (/modelcontextprotocol|\bmcp\b|langchain|crewai|agentkit|autogpt|openai|anthropic|coinbase agent|eliza/.test(normalized)) return "agent_sdk";
  if (/curl\/|wget\/|httpie|postmanruntime|insomnia/.test(normalized)) return "command_line";
  if (/mozilla\/|chrome\/|safari\/|firefox\/|edg\//.test(normalized)) return "browser";
  if (/\bnode\b|undici|axios|python-requests|python-httpx|go-http-client|okhttp|java\//.test(normalized)) return "programmatic";
  return userAgent ? "unknown" : "unknown";
}
