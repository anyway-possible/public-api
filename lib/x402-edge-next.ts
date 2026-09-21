import {
  FacilitatorResponseError,
  SETTLEMENT_OVERRIDES_HEADER,
  getFacilitatorResponseError,
  type x402HTTPResourceServer,
  withPrivateCacheControl,
} from "@x402/core/server";
import { validateDiscoveryExtensionSpec } from "@x402/extensions/bazaar";
import { NextRequest, NextResponse } from "next/server";

type RouteHandler<T = unknown> = (request: NextRequest) => Promise<NextResponse<T>>;

function validateBazaarExtensionsForEdge(httpServer: x402HTTPResourceServer) {
  for (const [pattern, config] of Object.entries(httpServer.routes)) {
    const extension = config.extensions?.bazaar;
    if (!extension) continue;
    const result = validateDiscoveryExtensionSpec(extension);
    if (!result.valid) {
      throw new Error(`Invalid Bazaar extension for ${pattern}: ${result.errors?.join(", ") ?? "unknown error"}`);
    }
  }
}

function requestContext(request: NextRequest) {
  const paymentHeader = request.headers.get("payment-signature") ?? request.headers.get("x-payment") ?? undefined;
  return {
    adapter: {
      getHeader: (name: string) => request.headers.get(name) ?? undefined,
      getMethod: () => request.method,
      getPath: () => request.nextUrl.pathname,
      getUrl: () => request.url,
      getAcceptHeader: () => request.headers.get("accept") ?? "",
      getUserAgent: () => request.headers.get("user-agent") ?? "",
      getQueryParams: () => Object.fromEntries(request.nextUrl.searchParams),
      getQueryParam: (name: string) => {
        const values = request.nextUrl.searchParams.getAll(name);
        return values.length > 1 ? values : values[0];
      },
      getBody: async () => request.clone().json().catch(() => undefined),
    },
    path: request.nextUrl.pathname,
    method: request.method,
    paymentHeader,
  };
}

function paymentError(response: { status: number; headers: Record<string, string>; body?: unknown; isHtml?: boolean }) {
  const headers = new Headers(response.headers);
  headers.set("content-type", response.isHtml ? "text/html" : "application/json");
  return new NextResponse(response.isHtml ? String(response.body ?? "") : JSON.stringify(response.body ?? {}), {
    status: response.status,
    headers,
  });
}

function facilitatorError(error: Error) {
  return NextResponse.json({ error: error.message }, { status: 502 });
}

/**
 * Edge-safe equivalent of @x402/next's withX402FromHTTPServer.
 *
 * The upstream adapter compiles Bazaar JSON Schema with AJV at request time.
 * Cloudflare Workers deliberately block runtime code generation, so we use the
 * extension package's structural validator instead and keep settlement logic
 * identical to the official adapter.
 */
export function withEdgeX402FromHTTPServer<T = unknown>(
  routeHandler: RouteHandler<T>,
  httpServer: x402HTTPResourceServer,
) {
  validateBazaarExtensionsForEdge(httpServer);
  let initialized: Promise<void> | undefined;
  const initialize = () => initialized ??= httpServer.initialize().catch((error) => {
    initialized = undefined;
    throw error;
  });

  return async (request: NextRequest): Promise<NextResponse<T | unknown>> => {
    try {
      await initialize();
    } catch (error) {
      const known = getFacilitatorResponseError(error);
      if (known) return facilitatorError(known);
      throw error;
    }

    const context = requestContext(request);
    const result = await httpServer.processHTTPRequest(context);
    if (result.type === "no-payment-required") return routeHandler(request);
    if (result.type === "payment-error") return paymentError(result.response);

    let handlerResponse: NextResponse<T>;
    try {
      handlerResponse = await routeHandler(request);
    } catch (error) {
      await result.cancellationDispatcher.cancel({ reason: "handler_threw", error });
      throw error;
    }
    if (handlerResponse.status >= 400) {
      await result.cancellationDispatcher.cancel({ reason: "handler_failed", responseStatus: handlerResponse.status });
      handlerResponse.headers.delete(SETTLEMENT_OVERRIDES_HEADER);
      return handlerResponse;
    }

    try {
      const body = new Uint8Array(await handlerResponse.clone().arrayBuffer());
      const responseHeaders = Object.fromEntries(handlerResponse.headers.entries());
      const settlement = await httpServer.processSettlement(
        result.paymentPayload,
        result.paymentRequirements,
        result.declaredExtensions,
        { request: context, responseBody: body, responseHeaders },
      );
      if (!settlement.success) return paymentError(settlement.response);
      for (const [key, value] of Object.entries(settlement.headers)) handlerResponse.headers.set(key, value);
      handlerResponse.headers.set("cache-control", withPrivateCacheControl(handlerResponse.headers.get("cache-control")));
      handlerResponse.headers.delete(SETTLEMENT_OVERRIDES_HEADER);
      return handlerResponse;
    } catch (error) {
      if (error instanceof FacilitatorResponseError) return facilitatorError(error);
      console.error("Settlement failed", error);
      return NextResponse.json({}, { status: 402 });
    }
  };
}
