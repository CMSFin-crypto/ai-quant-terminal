import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";

/**
 * GET /api/earnings?symbol=NVDA
 *
 * Returns the next earnings date for a given stock symbol.
 * Uses Yahoo Finance quoteSummary endpoint (free, no API key needed, uses crumb auth).
 *
 * Response shape:
 *   { symbol, earningsDate: "2026-07-23", daysToEarnings: 14, source: "yahoo" }
 *   { symbol, earningsDate: null, daysToEarnings: null, source: "yahoo-no-data" }
 *
 * Cache: 12 hours (earnings dates don't change frequently)
 */

interface EarningsCacheEntry {
  earningsDate: string | null;
  fetchedAt: number;
  source: string;
}
const earningsCache = new Map<string, EarningsCacheEntry>();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

let cachedCrumb: string | null = null;
let cachedCookies: string | null = null;
let crumbExpiresAt = 0;

async function getCrumb(): Promise<{ crumb: string; cookies: string } | null> {
  if (cachedCrumb && cachedCookies && Date.now() < crumbExpiresAt) {
    return { crumb: cachedCrumb, cookies: cachedCookies };
  }
  try {
    const fcRes = await fetch("https://fc.yahoo.com/", {
      headers: { "User-Agent": UA },
      next: { revalidate: 0 },
      redirect: "manual",
    });
    const setCookieHeaders = fcRes.headers.getSetCookie?.() || [];
    const cookies = setCookieHeaders.map((c: string) => c.split(";")[0]).join("; ");
    if (!cookies) return null;

    const crumbRes = await fetch(
      "https://query1.finance.yahoo.com/v1/test/getcrumb",
      { headers: { "User-Agent": UA, Cookie: cookies }, next: { revalidate: 0 } }
    );
    if (!crumbRes.ok) return null;
    const crumb = await crumbRes.text();
    if (!crumb || crumb.includes("error")) return null;

    cachedCrumb = crumb;
    cachedCookies = cookies;
    crumbExpiresAt = Date.now() + 4 * 60 * 60 * 1000;
    return { crumb, cookies };
  } catch {
    return null;
  }
}

async function fetchYahooEarnings(symbol: string): Promise<{ earningsDate: string | null; source: string }> {
  const auth = await getCrumb();
  if (!auth) return { earningsDate: null, source: "yahoo-no-crumb" };

  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=calendarEvents&crumb=${encodeURIComponent(auth.crumb)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      headers: { "User-Agent": UA, Cookie: auth.cookies },
      next: { revalidate: 0 },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return { earningsDate: null, source: "yahoo-error" };

    const data = await res.json();
    const earnings = data?.quoteSummary?.result?.[0]?.calendarEvents?.earnings;
    const rawDate = earnings?.earningsDate?.[0]?.raw;
    if (!rawDate) return { earningsDate: null, source: "yahoo-no-data" };

    const dateStr = new Date(rawDate * 1000).toISOString().slice(0, 10);
    return { earningsDate: dateStr, source: "yahoo" };
  } catch {
    return { earningsDate: null, source: "yahoo-error" };
  }
}

export async function GET(req: Request) {
  const ip = clientIp(req);
  const limit = rateLimit(ip, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Missing symbol" }, { status: 400 });

  const cached = earningsCache.get(symbol);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    const daysToEarnings = cached.earningsDate
      ? Math.max(0, Math.ceil((new Date(cached.earningsDate).getTime() - Date.now()) / 86_400_000))
      : null;
    return NextResponse.json({
      symbol,
      earningsDate: cached.earningsDate,
      daysToEarnings,
      source: cached.source,
      cached: true,
    });
  }

  const { earningsDate, source } = await fetchYahooEarnings(symbol);
  earningsCache.set(symbol, { earningsDate, fetchedAt: Date.now(), source });

  const daysToEarnings = earningsDate
    ? Math.max(0, Math.ceil((new Date(earningsDate).getTime() - Date.now()) / 86_400_000))
    : null;

  return NextResponse.json({
    symbol,
    earningsDate,
    daysToEarnings,
    source,
    cached: false,
  });
}
