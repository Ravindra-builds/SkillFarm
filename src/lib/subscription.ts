/**
 * Subscription Architecture & Feature Gate Abstraction — Phase 14
 *
 * Implements plan tier limits per spec §31:
 * - Free tier: 20 mentor messages, 5 research runs
 * - Pro tier: Unlimited
 */

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

const usageStore = new Map<string, Record<FeatureKey, number>>(); // userId -> usage
const planStore = new Map<string, UserPlanTier>(); // userId -> plan

export function getUserPlan(userId: string): UserPlanTier {
  return planStore.get(userId) ?? "free";
}

export function setUserPlan(userId: string, plan: UserPlanTier): void {
  planStore.set(userId, plan);
}

export function checkPlanLimit(
  userId: string,
  feature: FeatureKey
): { allowed: boolean; plan: UserPlanTier; currentUsage: number; maxLimit: number } {
  const plan = getUserPlan(userId);
  const maxLimit = PLAN_LIMITS[plan][feature];

  const userUsage = usageStore.get(userId) ?? { mentorMessages: 0, researchRuns: 0 };
  const currentUsage = userUsage[feature] ?? 0;

  if (currentUsage >= maxLimit) {
    return {
      allowed: false,
      plan,
      currentUsage,
      maxLimit,
    };
  }

  return {
    allowed: true,
    plan,
    currentUsage,
    maxLimit,
  };
}

export function incrementPlanUsage(userId: string, feature: FeatureKey): void {
  const userUsage = usageStore.get(userId) ?? { mentorMessages: 0, researchRuns: 0 };
  userUsage[feature] = (userUsage[feature] ?? 0) + 1;
  usageStore.set(userId, userUsage);
}
