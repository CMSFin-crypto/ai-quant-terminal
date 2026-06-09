import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { fetchYahooQuote } from "@/lib/yahooFinance";

export async function GET(req: Request) {
  const ip = clientIp(req);
  const limit = rateLimit(ip, 300, 60_000);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: limit.retryAfterMs },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  // Try Finnhub first if API key is available
  const finnhubKey = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

  if (finnhubKey) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${finnhubKey}`,
        { next: { revalidate: 15 } }
      );

      if (res.ok) {
        const data = await res.json();
        const price = Number(data?.c || 0);

        if (price > 0) {
          return NextResponse.json({
            price,
            change: Number(data?.d || 0),
            changePercent: Number(data?.dp || 0),
            high: Number(data?.h || 0),
            low: Number(data?.l || 0),
            open: Number(data?.o || 0),
            previousClose: Number(data?.pc || 0),
            source: "finnhub"
          });
        }
      }
    } catch {
      // Finnhub failed, fall through to Yahoo
    }
  }

  // Yahoo Finance fallback — free, no API key needed
  const yahooResult = await fetchYahooQuote(symbol);

  if (yahooResult.price) {
    return NextResponse.json(yahooResult);
  }

  return NextResponse.json({ price: null, source: "all-sources-failed" });
}
