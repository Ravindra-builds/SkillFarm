/**
 * Subscription Architecture & Feature Gate
 *
 * Plan limits:
 * - Free tier : Generous limits in dev/preview (500 messages), 50 mentor messages in prod
 * - Pro tier  : Unlimited
 *
 * Storage strategy:
 * - Redis (Upstash): preferred in production — usage counters persist across
 *   serverless cold starts and Vercel worker restarts. Keys expire daily.
 * - In-memory Map : fallback when Redis is not configured (local dev / preview).
 */

import { getRedis } from "@/lib/redis";
import { PLAN_CONFIG, PlanTier } from "@/config";

const isDev = process.env.NODE_ENV !== "production";

export type UserPlanTier = PlanTier;

export const PLAN_LIMITS = {
  free: {
    mentorMessages: PLAN_CONFIG.free.quotas.mentorMessages.limit,
    researchRuns: PLAN_CONFIG.free.quotas.researchRuns.limit,
  },
  pro: {
    mentorMessages: PLAN_CONFIG.pro.quotas.mentorMessages.limit,
    researchRuns: PLAN_CONFIG.pro.quotas.researchRuns.limit,
  },
} as const;

type FeatureKey = keyof typeof PLAN_LIMITS.free;

// In-memory fallback maps (used only when Redis is not configured)
const memUsageStore = new Map<string, Record<FeatureKey, number>>();
const memPlanStore = new Map<string, UserPlanTier>();

// Redis key helpers
const usageKey = (userId: string) => `skillfarm:usage:${userId}`;
const planKey = (userId: string) => `skillfarm:plan:${userId}`;

/** Get the plan tier for a user. Defaults to "free" (or "pro" for preview testing in dev). */
export async function getUserPlan(userId: string): Promise<UserPlanTier> {
  const redis = await getRedis();
  if (redis) {
    try {
      const tier = await redis.get<string>(planKey(userId));
      if (tier) return (tier === "pro" ? "pro" : "free") as UserPlanTier;
    } catch {
      // fall through to memory
    }
  }
  return memPlanStore.get(userId) ?? (isDev ? "pro" : "free");
}

/** Set the plan tier for a user (called when they upgrade/downgrade). */
export async function setUserPlan(userId: string, plan: UserPlanTier): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.set(planKey(userId), plan);
      return;
    } catch {
      // fall through to memory
    }
  }
  memPlanStore.set(userId, plan);
}

/** Reset usage counter for a user (useful for testing or daily reset). */
export async function resetPlanUsage(userId: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.del(usageKey(userId));
    } catch {}
  }
  memUsageStore.delete(userId);
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
      const ttl = await redis.ttl(key);
      if (ttl < 0) {
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

/** @deprecated Use async checkPlanLimit() instead */
export function checkPlanLimitSync(
  userId: string,
  feature: FeatureKey
): { allowed: boolean; plan: UserPlanTier; currentUsage: number; maxLimit: number } {
  const plan = memPlanStore.get(userId) ?? (isDev ? "pro" : "free");
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
