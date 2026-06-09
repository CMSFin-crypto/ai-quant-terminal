import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export async function GET(req: Request) {
  const ip = clientIp(req);
  const limit = rateLimit(ip, 60, 60_000);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: limit.retryAfterMs },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const API_KEY = process.env.POLYGON_API_KEY || process.env.NEXT_PUBLIC_POLYGON_API_KEY;

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  if (!API_KEY || API_KEY === "YOUR_POLYGON_KEY") {
    return NextResponse.json({ results: [], source: "mock-ready" });
  }

  const res = await fetch(
    `https://api.polygon.io/v3/snapshot/options/${symbol}?apiKey=${API_KEY}`,
    { next: { revalidate: 20 } }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Polygon request failed", status: res.status, results: [] },
      { status: 200 }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
