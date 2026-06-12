// Simple sliding-window in-memory rate limiter.
// Works for single-instance Node.js deployments (dev / Railway / Render).
// For multi-instance Vercel Edge, swap the Map for Upstash Redis.

type Window = { count: number; resetAt: number };

const store = new Map<string, Window>();

function cleanup() {
  const now = Date.now();
  for (const [key, w] of store) {
    if (w.resetAt <= now) store.delete(key);
  }
}

// Evict expired windows every 10 minutes to prevent memory growth.
setInterval(cleanup, 10 * 60 * 1000).unref?.();

/**
 * Check whether a key (typically `userId:route`) is within its limit.
 * Returns `{ allowed: true }` or `{ allowed: false, retryAfterSec }`.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSec?: number } {
  if (process.env.NODE_ENV === "development") {
    return { allowed: true };
  }
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return { allowed: true };
}

// Pre-configured limiters for each route category.
// AI reflection — expensive; cache already guards most hits
export const rl = {
  aiRecommend:  (uid: string) => checkRateLimit(`${uid}:recommend`,  8,  60 * 60 * 1000), // 8/hr
  aiDomain:     (uid: string) => checkRateLimit(`${uid}:domain`,     12, 60 * 60 * 1000), // 12/hr
  simulate:     (uid: string) => checkRateLimit(`${uid}:simulate`,   20, 60 * 60 * 1000), // 20/hr
  milestones:   (uid: string) => checkRateLimit(`${uid}:milestones`, 15, 60 * 60 * 1000), // 15/hr
  login:        (ip: string)  => checkRateLimit(`${ip}:login`,       10, 15 * 60 * 1000), // 10 per 15 min
  parse:        (uid: string) => checkRateLimit(`${uid}:parse`,       10, 60 * 60 * 1000), // 10/hr (PARSE_LIMIT parses per PARSE_WINDOW_MS)
};
