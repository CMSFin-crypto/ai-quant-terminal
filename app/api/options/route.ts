import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { fetchYahooOptions, fetchFinnhubOptions } from "@/lib/yahooFinance";

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
  const dteParam = searchParams.get("dte");
  const targetDte = dteParam ? Math.max(1, Math.min(365, parseInt(dteParam, 10) || 30)) : 30;

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const polygonKey = process.env.POLYGON_API_KEY || process.env.NEXT_PUBLIC_POLYGON_API_KEY;
  const finnhubKey = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

  // ─── Source 1: Polygon Options Snapshot (premium) ────────────────────────
  if (polygonKey && polygonKey !== "YOUR_POLYGON_KEY") {
    try {
      const res = await fetch(
        `https://api.polygon.io/v3/snapshot/options/${symbol}?apiKey=${polygonKey}`,
        { next: { revalidate: 20 } }
      );

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.results) && data.results.length > 0) {
          return NextResponse.json({ ...data, source: "polygon-options" });
        }
      }
    } catch {
      // Polygon failed, fall through
    }
  }

  // ─── Source 2: Yahoo Finance Options Chain (free, no API key) ────────────
  const yahooResult = await fetchYahooOptions(symbol, targetDte);
  if (yahooResult.results.length > 0) {
    return NextResponse.json({
      results: yahooResult.results,
      source: yahooResult.source,
      underlyingPrice: yahooResult.underlyingPrice,
    });
  }

  // ─── Source 3: Finnhub Options Chain ─────────────────────────────────────
  if (finnhubKey) {
    const finnhubResult = await fetchFinnhubOptions(symbol, finnhubKey);
    if (finnhubResult.results.length > 0) {
      return NextResponse.json({
        results: finnhubResult.results,
        source: finnhubResult.source,
        underlyingPrice: finnhubResult.underlyingPrice,
      });
    }
  }

  // ─── All sources failed — return empty so frontend falls back to synthetic ─
  return NextResponse.json({ results: [], source: "no-live-options" });
}
