const MAX_BYTES = 128 * 1024;
const MAX_REDIRECTS = 3;
const DNS_TIMEOUT_MS = 2_500;
const DNS_ENDPOINT = "https://cloudflare-dns.com/dns-query";

const blockedHosts = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
]);

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0)
    || (a === 192 && b === 168)
    || (a === 192 && b === 88)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51)
    || (a === 203 && b === 0)
    || a >= 224;
}

function isPrivateIpv6(hostname: string) {
  const value = hostname.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  if (!value.includes(":")) return false;
  if (value === "::" || value === "::1") return true;
  if (/^(?:fc|fd)/.test(value) || /^fe[89ab]/.test(value) || /^fe[c-f]/.test(value) || /^ff/.test(value)) return true;
  if (/^2001:db8(?::|$)/.test(value) || /^2001:2(?::|$)/.test(value) || /^100:(?:0+:){0,3}/.test(value) || /^64:ff9b:1(?::|$)/.test(value)) return true;
  const mappedIpv4 = value.match(/(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1];
  return mappedIpv4 ? isPrivateIpv4(mappedIpv4) : false;
}

function isNonPublicIp(hostname: string) {
  return isPrivateIpv4(hostname) || isPrivateIpv6(hostname);
}

type DnsJson = {
  Status?: number;
  Answer?: Array<{ type?: number; data?: string }>;
};

async function resolveDns(hostname: string, type: "A" | "AAAA") {
  const query = new URL(DNS_ENDPOINT);
  query.searchParams.set("name", hostname);
  query.searchParams.set("type", type);
  const response = await fetch(query, {
    headers: { accept: "application/dns-json" },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(DNS_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("public DNS validation failed");
  const payload = await response.json() as DnsJson;
  if (payload.Status !== 0 && payload.Status !== 3) throw new Error("public DNS validation failed");
  const recordType = type === "A" ? 1 : 28;
  return (payload.Answer ?? []).filter((answer) => answer.type === recordType && answer.data).map((answer) => answer.data as string);
}

async function assertPublicDns(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (isNonPublicIp(normalized)) throw new Error("private and local network targets are not supported");
  if (/^[\da-f:.]+$/i.test(normalized)) return;
  let addresses: string[];
  try {
    const results = await Promise.all([resolveDns(normalized, "A"), resolveDns(normalized, "AAAA")]);
    addresses = results.flat();
  } catch {
    throw new Error("target hostname could not be validated through public DNS");
  }
  if (addresses.length === 0) throw new Error("target hostname did not resolve to a public IP address");
  if (addresses.some(isNonPublicIp)) throw new Error("private and local network targets are not supported");
}

export function parsePublicUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) throw new Error("url must be a valid HTTP(S) URL under 2,048 characters");
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("only HTTP(S) URLs are supported");
  if (url.username || url.password) throw new Error("URLs with embedded credentials are not supported");
  if (blockedHosts.has(hostname) || hostname.endsWith(".local") || hostname.endsWith(".internal") || isNonPublicIp(hostname)) {
    throw new Error("private and local network targets are not supported");
  }
  return url;
}

async function readLimitedText(response: Response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (bytes < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = MAX_BYTES - bytes;
    chunks.push(value.length > remaining ? value.slice(0, remaining) : value);
    bytes += Math.min(value.length, remaining);
  }
  await reader.cancel().catch(() => undefined);
  const merged = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(merged);
}

async function fetchPublic(url: URL, redirectChain: string[] = []): Promise<{ response: Response; finalUrl: URL; redirectChain: string[] }> {
  await assertPublicDns(url.hostname);
  const response = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: { "user-agent": "AnywayPossible-Verify/1.0", accept: "text/html,application/json,text/plain;q=0.9,*/*;q=0.5" },
    signal: AbortSignal.timeout(9_000),
  });
  if (response.status >= 300 && response.status < 400) {
    if (redirectChain.length >= MAX_REDIRECTS) throw new Error("redirect limit exceeded");
    const location = response.headers.get("location");
    if (!location) return { response, finalUrl: url, redirectChain };
    await response.body?.cancel().catch(() => undefined);
    return fetchPublic(parsePublicUrl(new URL(location, url).toString()), [...redirectChain, url.toString()]);
  }
  return { response, finalUrl: url, redirectChain };
}

export type VerificationInput = {
  url: string;
  expectedStatus?: number;
  expectedText?: string;
};

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function extractTag(body: string, expression: RegExp, maxLength: number) {
  return body.match(expression)?.[1]?.replace(/\s+/g, " ").trim().slice(0, maxLength) ?? null;
}

export async function checkUrl(input: Pick<VerificationInput, "url" | "expectedStatus">) {
  const requestedUrl = parsePublicUrl(input.url);
  if (input.expectedStatus !== undefined && (!Number.isInteger(input.expectedStatus) || input.expectedStatus < 100 || input.expectedStatus > 599)) {
    throw new Error("expectedStatus must be an integer from 100 to 599");
  }
  const started = Date.now();
  const { response, finalUrl, redirectChain } = await fetchPublic(requestedUrl);
  await response.body?.cancel().catch(() => undefined);
  const statusMatch = input.expectedStatus === undefined ? null : response.status === input.expectedStatus;
  return {
    reachable: response.status < 500,
    verified: statusMatch ?? response.status < 500,
    requestedUrl: requestedUrl.toString(),
    finalUrl: finalUrl.toString(),
    status: response.status,
    statusMatch,
    redirectChain: [...redirectChain, finalUrl.toString()],
    responseTimeMs: Date.now() - started,
    contentType: response.headers.get("content-type")?.split(";")[0] ?? "unknown",
    observedAt: new Date().toISOString(),
  };
}

export async function verifyUrl(input: VerificationInput) {
  const requestedUrl = parsePublicUrl(input.url);
  if (input.expectedStatus !== undefined && (!Number.isInteger(input.expectedStatus) || input.expectedStatus < 100 || input.expectedStatus > 599)) {
    throw new Error("expectedStatus must be an integer from 100 to 599");
  }
  if (input.expectedText !== undefined && (typeof input.expectedText !== "string" || input.expectedText.length > 500)) {
    throw new Error("expectedText must be 500 characters or fewer");
  }

  const started = Date.now();
  const { response, finalUrl, redirectChain } = await fetchPublic(requestedUrl);
  const contentType = response.headers.get("content-type")?.split(";")[0] ?? "unknown";
  const body = await readLimitedText(response);
  const title = extractTag(body, /<title[^>]*>([\s\S]*?)<\/title>/i, 240);
  const description = extractTag(body, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i, 500)
    ?? extractTag(body, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i, 500);
  const canonicalUrl = extractTag(body, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i, 2048)
    ?? extractTag(body, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i, 2048);
  const expectedTextFound = input.expectedText === undefined ? null : body.toLocaleLowerCase().includes(input.expectedText.toLocaleLowerCase());
  const statusMatch = input.expectedStatus === undefined ? null : response.status === input.expectedStatus;
  const observedAt = new Date().toISOString();
  const contentSha256 = await sha256(body);
  const receiptId = await sha256(JSON.stringify({ requestedUrl: requestedUrl.toString(), finalUrl: finalUrl.toString(), status: response.status, contentSha256, observedAt }));

  return {
    verified: (statusMatch ?? true) && (expectedTextFound ?? true),
    requestedUrl: requestedUrl.toString(),
    finalUrl: finalUrl.toString(),
    status: response.status,
    statusMatch,
    expectedTextFound,
    title,
    description,
    canonicalUrl,
    contentType,
    contentSha256,
    receiptId,
    redirectChain: [...redirectChain, finalUrl.toString()],
    responseTimeMs: Date.now() - started,
    bytesInspected: new TextEncoder().encode(body).length,
    observedAt,
    responseHeaders: {
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
      cacheControl: response.headers.get("cache-control"),
      contentLanguage: response.headers.get("content-language"),
    },
    evidence: [{ source: finalUrl.toString(), observedAt, contentSha256 }],
  };
}
