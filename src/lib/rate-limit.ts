/**
 * Rate Limiter Engine
 *
 * Protects API routes from abuse using Upstash Redis sliding window counters
 * with in-memory sliding window fallback when Redis is unconfigured.
 */
import { getRedis } from "@/lib/redis";
import { getRateLimitRule, RateLimitAction, RateLimitRule } from "@/config/rate-limits";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetSec: number;
  description?: string;
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
      let ttl = await redis.ttl(key);
      // Guarantee key expiration if key has no TTL (-1) or was just created (current === 1)
      if (ttl === -1 || current === 1) {
        await redis.expire(key, windowSec);
        ttl = windowSec;
      }

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

/**
 * Checks rate limit for a specific configured action (e.g. "roadmap", "resume", "chat", "research").
 */
export async function checkFeatureRateLimit(
  userId: string,
  action: RateLimitAction
): Promise<RateLimitResult> {
  const rule: RateLimitRule = getRateLimitRule(action);
  const result = await checkRateLimit(`${action}:${userId}`, rule.limit, rule.windowSec);
  return {
    ...result,
    description: rule.description,
  };
}

/**
 * Gets the current usage and quota status for a feature without incrementing it.
 */
export async function getFeatureUsage(
  userId: string,
  action: RateLimitAction
): Promise<{ current: number; limit: number; remaining: number; resetSec: number }> {
  const rule: RateLimitRule = getRateLimitRule(action);
  const key = `ratelimit:${action}:${userId}`;
  const now = Date.now();

  const redis = await getRedis();
  if (redis) {
    try {
      const current = (await redis.get<number>(key)) ?? 0;
      const ttl = await redis.ttl(key);
      const parsedCurrent = typeof current === "number" ? current : parseInt(String(current || "0"), 10);
      return {
        current: Math.min(parsedCurrent, rule.limit),
        limit: rule.limit,
        remaining: Math.max(0, rule.limit - parsedCurrent),
        resetSec: ttl > 0 ? ttl : rule.windowSec,
      };
    } catch {
      // fallback to local store
    }
  }

  const entry = localStore.get(key);
  if (!entry || now > entry.resetTime) {
    return {
      current: 0,
      limit: rule.limit,
      remaining: rule.limit,
      resetSec: rule.windowSec,
    };
  }

  return {
    current: Math.min(entry.count, rule.limit),
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - entry.count),
    resetSec: Math.max(1, Math.ceil((entry.resetTime - now) / 1000)),
  };
}
