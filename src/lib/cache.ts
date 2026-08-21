/**
 * Cache — Phase 7/12
 *
 * Tries Upstash Redis (if env set), otherwise in-memory LRU.
 * Used for research results, resource scores, etc.
 */
import { getRedis } from "@/lib/redis";
import { CACHE_TTL } from "@/config/rate-limits";

type CacheEntry = { value: unknown; expiresAt: number };
const memCache = new Map<string, CacheEntry>();
const MAX_MEM = 200;

async function redisGet(key: string): Promise<unknown | null> {
  const redis = await getRedis();
  if (!redis) return null;
  try {
    return await redis.get(key) as unknown;
  } catch (err) {
    console.error("[cache] redis get failed, fallback to memory:", err);
    return null;
  }
}

async function redisSet(key: string, value: unknown, ttlSec: number): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value as string, { ex: ttlSec });
  } catch (err) {
    console.error("[cache] redis set failed:", err);
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  // Try Redis first
  const redisVal = await redisGet(key);
  if (redisVal !== null) return redisVal as T;

  // Memory fallback
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function cacheSet(key: string, value: unknown, ttlSec = 3600): Promise<void> {
  // Redis
  await redisSet(key, value, ttlSec);

  // Memory
  if (memCache.size >= MAX_MEM) {
    const firstKey = memCache.keys().next().value;
    if (firstKey) memCache.delete(firstKey);
  }
  memCache.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

export async function cacheDel(key: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.del(key);
    } catch (err) {
      console.error("[cache] redis del failed:", err);
    }
  }
  memCache.delete(key);
}

export function normalizeQuery(query: string): string {
  const STOP_WORDS = new Set(["how", "to", "do", "i", "the", "a", "an", "best", "way", "what", "is", "for", "in", "with", "please", "show", "me", "can", "you"]);
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
    .sort()
    .join("-")
    .slice(0, 100);
}

export function semanticCacheKey(category: string, query: string): string {
  const normalized = normalizeQuery(query);
  return `semantic:${category}:${normalized}`;
}

export function cacheKeyForResearch(query: string, sources: string[]): string {
  const normalized = normalizeQuery(query) || query.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 100);
  return `research:${sources.sort().join(",")}:${normalized}`;
}

const memLocks = new Map<string, number>();

/**
 * Single-flight atomic lock helper to prevent concurrent duplicate execution
 * of expensive operations (e.g. roadmap generation, topic research, resume processing).
 */
export async function acquireLock(key: string, ttlSec = 45): Promise<boolean> {
  const lockKey = `lock:${key}`;
  const now = Date.now();
  const redis = await getRedis();

  if (redis) {
    try {
      const res = await redis.set(lockKey, "1", { nx: true, ex: ttlSec });
      return res === "OK";
    } catch (err) {
      console.error("[cache] redis acquireLock error, using local fallback:", err);
    }
  }

  // Local memory lock fallback
  const existingExpiry = memLocks.get(lockKey);
  if (existingExpiry && now < existingExpiry) {
    return false;
  }
  memLocks.set(lockKey, now + ttlSec * 1000);
  return true;
}

export async function releaseLock(key: string): Promise<void> {
  const lockKey = `lock:${key}`;
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.del(lockKey);
    } catch {}
  }
  memLocks.delete(lockKey);
}
