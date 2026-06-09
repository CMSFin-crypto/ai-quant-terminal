import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function normalizeStooqSymbol(symbol: string) {
  return `${symbol.toLowerCase()}.us`;
}

function parseStooqCsv(csv: string) {
  const lines = csv.trim().split(/\r?\n/);
  const rows = lines.slice(1);

  return rows
    .map((line) => {
      const [date, open, high, low, close, volume] = line.split(",");
      const time = new Date(`${date}T00:00:00Z`).getTime();

      return {
        t: time,
        o: Number(open),
        h: Number(high),
        l: Number(low),
        c: Number(close),
        v: Number(volume)
      };
    })
    .filter((bar) => Number.isFinite(bar.t) && Number.isFinite(bar.c) && bar.c > 0);
}

// Finnhub candle data is loosely typed from the API
function parseFinnhubCandles(data: { s?: string; c?: number[]; t?: number[]; o?: number[]; h?: number[]; l?: number[]; v?: number[] }) {
  if (data?.s !== "ok" || !Array.isArray(data?.c)) return [];

  return data.c
    .map((close: number, index: number) => ({
      t: Number(data.t?.[index] || 0) * 1000,
      o: Number(data.o?.[index] || close),
      h: Number(data.h?.[index] || close),
      l: Number(data.l?.[index] || close),
      c: Number(close),
      v: Number(data.v?.[index] || 0)
    }))
    .filter((bar) => Number.isFinite(bar.t) && Number.isFinite(bar.c) && bar.c > 0);
}

async function fetchStooqHistory(symbol: string, days: number) {
  const from = daysAgo(Math.max(days + 10, 120)).replaceAll("-", "");
  const to = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const stooqSymbol = normalizeStooqSymbol(symbol);
  const url = `https://stooq.com/q/d/l/?s=${stooqSymbol}&d1=${from}&d2=${to}&i=d`;
  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) return [];

  const csv = await res.text();
  if (!csv || csv.includes("No data")) return [];

  return parseStooqCsv(csv);
}

async function fetchFinnhubHistory(symbol: string, days: number) {
  const apiKey = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
  if (!apiKey) return [];

  const to = Math.floor(Date.now() / 1000);
  const from = to - Math.max(days + 10, 120) * 86_400;
  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}&token=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 900 } });

  if (!res.ok) return [];

  return parseFinnhubCandles(await res.json());
}

async function fetchFreeHistory(symbol: string, days: number) {
  const stooqResults = await fetchStooqHistory(symbol, days);
  if (stooqResults.length >= 90) {
    return { results: stooqResults, source: "stooq-free" };
  }

  const finnhubResults = await fetchFinnhubHistory(symbol, days);
  if (finnhubResults.length >= 90) {
    return { results: finnhubResults, source: "finnhub-free" };
  }

  return {
    results: stooqResults.length ? stooqResults : finnhubResults,
    source: stooqResults.length ? "stooq-partial" : finnhubResults.length ? "finnhub-partial" : "simulated"
  };
}

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
  const days = Number(searchParams.get("days") || 365);
  const API_KEY = process.env.POLYGON_API_KEY || process.env.NEXT_PUBLIC_POLYGON_API_KEY;

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol", results: [] }, { status: 400 });
  }

  if (!API_KEY || API_KEY === "YOUR_POLYGON_KEY") {
    const freeHistory = await fetchFreeHistory(symbol, days);
    return NextResponse.json({
      results: freeHistory.results,
      source: freeHistory.source
    });
  }

  const from = daysAgo(Math.max(days + 10, 120));
  const to = new Date().toISOString().slice(0, 10);
  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${API_KEY}`;

  const res = await fetch(url, { next: { revalidate: 300 } });

  if (!res.ok) {
    const freeHistory = await fetchFreeHistory(symbol, days);
    return NextResponse.json({
      error: "Polygon history request failed",
      results: freeHistory.results,
      source: freeHistory.source
    });
  }

  const data = await res.json();
  return NextResponse.json({ ...data, source: "polygon" });
}
