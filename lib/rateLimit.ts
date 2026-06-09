/**
 * Simple in-memory rate limiter.
 * Limits requests per IP to a maximum number of requests within a rolling time window.
 */

type RateLimitEntry = {
  timestamps: number[];
};

const store = new Map<string, RateLimitEntry>();

/**
 * Check whether a request from the given key (usually an IP) should be allowed.
 * Returns `{ allowed: true }` if under the limit, or `{ allowed: false, retryAfterMs }` if over.
 */
export function rateLimit(
  key: string,
  maxRequests = 60,
  windowMs = 60_000
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { timestamps: [now] });
    return { allowed: true };
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 0) };
  }

  entry.timestamps.push(now);
  return { allowed: true };
}

/**
 * Extract the client IP from a Next.js Request object.
 * Falls back to "unknown" if no IP header is found.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "unknown";
}
