/**
 * Cache — Phase 7/12
 *
 * Tries Upstash Redis (if env set), otherwise in-memory LRU.
 * Used for research results, resource scores, etc.
 */

type CacheEntry = { value: unknown; expiresAt: number };

const memCache = new Map<string, CacheEntry>();
const MAX_MEM = 200;

function isRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;
  const s = url.toLowerCase();
  if (s.includes("...upstash") || s.includes("upstash.io") && s.includes("...")) return false;
  return s.startsWith("https://");
}

async function redisGet(key: string): Promise<unknown | null> {
  if (!isRedisConfigured()) return null;
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    const val = await redis.get(key);
    return val as unknown;
  } catch (err) {
    console.error("[cache] redis get failed, fallback to memory:", err);
    return null;
  }
}

async function redisSet(key: string, value: unknown, ttlSec: number): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
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
