import { NextResponse } from "next/server";
import { createSourcingRequest } from "../../../db/sourcing";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (clean(body.website, 200)) return NextResponse.json({ ok: true, requestId: "AWP-RECEIVED" }, { status: 201 });
    const input = {
      name: clean(body.name, 80),
      email: clean(body.email, 160).toLowerCase(),
      company: clean(body.company, 120),
      description: clean(body.description, 4000),
      quantity: clean(body.quantity, 60),
      neededBy: clean(body.neededBy, 80),
      budgetRange: clean(body.budgetRange, 80),
      drawingUrl: clean(body.drawingUrl, 500),
    };
    if (!input.name || input.description.length < 30 || !input.quantity || body.consent !== "yes" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      return NextResponse.json({ error: "Please provide a valid email, quantity, and a description of at least 30 characters." }, { status: 400 });
    }
    if (input.drawingUrl) {
      try {
        const url = new URL(input.drawingUrl);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error("Unsupported URL");
      } catch {
        return NextResponse.json({ error: "The drawing or reference link must be a valid web URL." }, { status: 400 });
      }
    }
    const result = await createSourcingRequest(input);
    return NextResponse.json({ ok: true, ...result }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The request could not be saved. Please try again." }, { status: 500 });
  }
}
