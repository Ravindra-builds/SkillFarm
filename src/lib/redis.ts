/**
 * Singleton Upstash Redis client.
 *
 * Instantiating `new Redis()` on every request is wasteful. This module
 * lazily creates one instance and reuses it across the process lifetime,
 * matching the pattern recommended by Upstash for serverless environments.
 *
 * The module returns `null` when Redis is not configured, so callers can
 * cleanly fall back to in-memory alternatives without crashing.
 */

let _redis: import("@upstash/redis").Redis | null = null;
let _checked = false;

function isRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;
  const s = url.toLowerCase();
  // Reject obvious placeholder values
  if (s.includes("...upstash") || (s.includes("upstash.io") && s.includes("..."))) return false;
  return s.startsWith("https://");
}

/**
 * Returns the shared Redis client instance, or null if Redis is not configured.
 *
 * Usage:
 * ```ts
 * const redis = await getRedis();
 * if (!redis) { // use memory fallback
 * ```
 */
export async function getRedis(): Promise<import("@upstash/redis").Redis | null> {
  if (_checked) return _redis;
  _checked = true;

  if (!isRedisConfigured()) return null;

  try {
    const { Redis } = await import("@upstash/redis");
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    return _redis;
  } catch (err) {
    console.error("[redis] Failed to initialize Upstash Redis client:", err);
    return null;
  }
}
