/**
 * Subscription Architecture & Feature Gate — Phase 14
 *
 * Plan limits:
 * - Free tier : 20 mentor messages, 5 research runs (per rolling 24h window)
 * - Pro tier  : Unlimited
 *
 * Storage strategy:
 * - Redis (Upstash): preferred in production — usage counters persist across
 *   serverless cold starts and Vercel worker restarts. Keys expire daily.
 * - In-memory Map : fallback when Redis is not configured (local dev / preview).
 *   ⚠️  In-memory does NOT persist across restarts — plan limits are effectively
 *   reset on each cold start. This is acceptable for local dev only.
 */

import { getRedis } from "@/lib/redis";

export type UserPlanTier = "free" | "pro";

export const PLAN_LIMITS = {
  free: {
    mentorMessages: 20,
    researchRuns: 5,
  },
  pro: {
    mentorMessages: Infinity,
    researchRuns: Infinity,
  },
} as const;

type FeatureKey = keyof typeof PLAN_LIMITS.free;

// In-memory fallback maps (used only when Redis is not configured)
const memUsageStore = new Map<string, Record<FeatureKey, number>>();
const memPlanStore = new Map<string, UserPlanTier>();

// Redis key helpers
const usageKey = (userId: string) => `skillfarm:usage:${userId}`;
const planKey = (userId: string) => `skillfarm:plan:${userId}`;

/** Get the plan tier for a user. Defaults to "free". */
export async function getUserPlan(userId: string): Promise<UserPlanTier> {
  const redis = await getRedis();
  if (redis) {
    try {
      const tier = await redis.get<string>(planKey(userId));
      return (tier === "pro" ? "pro" : "free") as UserPlanTier;
    } catch {
      // fall through to memory
    }
  }
  return memPlanStore.get(userId) ?? "free";
}

/** Set the plan tier for a user (called when they upgrade/downgrade). */
export async function setUserPlan(userId: string, plan: UserPlanTier): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    try {
      // Plan tier never expires automatically — manual change required
      await redis.set(planKey(userId), plan);
      return;
    } catch {
      // fall through to memory
    }
  }
  memPlanStore.set(userId, plan);
}

/** Check whether a user is within their plan's limit for a given feature. */
export async function checkPlanLimit(
  userId: string,
  feature: FeatureKey
): Promise<{ allowed: boolean; plan: UserPlanTier; currentUsage: number; maxLimit: number }> {
  const plan = await getUserPlan(userId);
  const maxLimit = PLAN_LIMITS[plan][feature];

  if (maxLimit === Infinity) {
    return { allowed: true, plan, currentUsage: 0, maxLimit: Infinity };
  }

  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await redis.hget<number>(usageKey(userId), feature);
      const currentUsage = typeof raw === "number" ? raw : parseInt(String(raw ?? "0"), 10);
      return { allowed: currentUsage < maxLimit, plan, currentUsage, maxLimit };
    } catch {
      // fall through to memory
    }
  }

  // Memory fallback
  const userUsage = memUsageStore.get(userId) ?? { mentorMessages: 0, researchRuns: 0 };
  const currentUsage = userUsage[feature] ?? 0;
  return { allowed: currentUsage < maxLimit, plan, currentUsage, maxLimit };
}

/** Increment usage counter for a feature. Called after a successful request. */
export async function incrementPlanUsage(userId: string, feature: FeatureKey): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    try {
      const key = usageKey(userId);
      await redis.hincrby(key, feature, 1);
      // Reset usage counters daily (86400 seconds). Only set TTL on first increment.
      // Use NX (set only if not exists) so existing TTL isn't reset on every call.
      const ttl = await redis.ttl(key);
      if (ttl < 0) {
        // Key exists but has no TTL — set it (or it was just created)
        await redis.expire(key, 86400);
      }
      return;
    } catch {
      // fall through to memory
    }
  }

  // Memory fallback
  const userUsage = memUsageStore.get(userId) ?? { mentorMessages: 0, researchRuns: 0 };
  userUsage[feature] = (userUsage[feature] ?? 0) + 1;
  memUsageStore.set(userId, userUsage);
}

// ---------------------------------------------------------------------------
// Sync wrappers for call sites that haven't been updated to async yet.
// These use the memory store only — callers in API routes should use the
// async versions above which properly use Redis.
// ---------------------------------------------------------------------------

/** @deprecated Use async checkPlanLimit() instead */
export function checkPlanLimitSync(
  userId: string,
  feature: FeatureKey
): { allowed: boolean; plan: UserPlanTier; currentUsage: number; maxLimit: number } {
  const plan = memPlanStore.get(userId) ?? "free";
  const maxLimit = PLAN_LIMITS[plan][feature];
  const userUsage = memUsageStore.get(userId) ?? { mentorMessages: 0, researchRuns: 0 };
  const currentUsage = userUsage[feature] ?? 0;
  return { allowed: currentUsage < maxLimit, plan, currentUsage, maxLimit };
}

/** @deprecated Use async incrementPlanUsage() instead */
export function incrementPlanUsageSync(userId: string, feature: FeatureKey): void {
  const userUsage = memUsageStore.get(userId) ?? { mentorMessages: 0, researchRuns: 0 };
  userUsage[feature] = (userUsage[feature] ?? 0) + 1;
  memUsageStore.set(userId, userUsage);
}
