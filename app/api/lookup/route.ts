import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const FETCH_TIMEOUT_MS = 8_000;

export type LookupResult = {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
};

/**
 * Search for stock symbols using Yahoo Finance lookup endpoint.
 * Returns up to 8 matching results.
 */
export async function GET(req: Request) {
  const ip = clientIp(req);
  const limit = rateLimit(ip, 60, 60_000); // Lower rate for search

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: limit.retryAfterMs },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 1) {
    return NextResponse.json({ results: [] });
  }

  // Yahoo Finance symbol lookup
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 0 },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json({ results: [], source: "yahoo-lookup-error" });
    }

    const data = await res.json();
    const quotes = data?.quotes || [];

    const results: LookupResult[] = quotes
      .filter((q: any) => {
        // Only include equity types (stocks, ETFs)
        const qType = q?.quoteType;
        return qType === "EQUITY" || qType === "ETF";
      })
      .slice(0, 8)
      .map((q: any) => ({
        symbol: q.symbol || "",
        name: q.shortname || q.longname || q.symbol || "",
        exchange: q.exchange || "",
        type: q.quoteType || "EQUITY",
      }));

    return NextResponse.json({ results, source: "yahoo-lookup" });
  } catch {
    return NextResponse.json({ results: [], source: "yahoo-lookup-error" });
  }
}
