/**
 * Rate Limiter Engine — Phase 12
 *
 * Protects API routes from abuse using Upstash Redis sliding window counters
 * with in-memory sliding window fallback when Redis is unconfigured.
 */

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetSec: number;
};

type WindowEntry = {
  count: number;
  resetTime: number;
};

const localStore = new Map<string, WindowEntry>();

function isRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;
  const s = url.toLowerCase();
  if (s.includes("...upstash") || (s.includes("upstash.io") && s.includes("..."))) return false;
  return s.startsWith("https://");
}

export async function checkRateLimit(
  identifier: string,
  limit = 30,
  windowSec = 60
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();

  if (isRedisConfigured()) {
    try {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });

      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSec);
      }
      const ttl = await redis.ttl(key);

      return {
        success: current <= limit,
        limit,
        remaining: Math.max(0, limit - current),
        resetSec: ttl > 0 ? ttl : windowSec,
      };
    } catch (err) {
      console.error("[rate-limit] redis error, using local fallback:", err);
    }
  }

  // Local sliding window fallback
  let entry = localStore.get(key);
  if (!entry || now > entry.resetTime) {
    entry = { count: 1, resetTime: now + windowSec * 1000 };
    localStore.set(key, entry);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetSec: windowSec,
    };
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  const resetSec = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));

  return {
    success: entry.count <= limit,
    limit,
    remaining,
    resetSec,
  };
}
