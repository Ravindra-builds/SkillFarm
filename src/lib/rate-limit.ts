/**
 * Rate Limiter Engine — Phase 12
 *
 * Protects API routes from abuse using Upstash Redis sliding window counters
 * with in-memory sliding window fallback when Redis is unconfigured.
 *
 * ⚠️ The in-memory fallback is NOT effective in serverless/multi-worker environments
 * (Vercel, Lambda) because each worker has its own counter. For production rate
 * limiting, configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
 */
import { getRedis } from "@/lib/redis";

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

export async function checkRateLimit(
  identifier: string,
  limit = 30,
  windowSec = 60
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;
  const now = Date.now();

  const redis = await getRedis();
  if (redis) {
    try {
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
