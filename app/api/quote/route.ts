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
  const apiKey = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({ price: null, source: "missing-finnhub-key" });
  }

  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
    { next: { revalidate: 15 } }
  );

  if (!res.ok) {
    return NextResponse.json({ price: null, source: "finnhub-error", status: res.status });
  }

  const data = await res.json();

  return NextResponse.json({
    price: Number(data?.c || 0) || null,
    change: Number(data?.d || 0),
    changePercent: Number(data?.dp || 0),
    high: Number(data?.h || 0),
    low: Number(data?.l || 0),
    open: Number(data?.o || 0),
    previousClose: Number(data?.pc || 0),
    source: "finnhub"
  });
}
