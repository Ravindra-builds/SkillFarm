/**
 * Subscription Architecture & Feature Gate
 *
 * All users (guest and authenticated) operate under the single standard tier:
 * - Production : Strict free-tier limits (Single source of truth: RATE_LIMITS in rate-limits.ts)
 * - Development: Generous dev-tier limits for local testing
 *
 * Pro / Unlimited tier is completely removed and unlinked to eliminate any risk of API bill spikes.
 */

import { PLAN_CONFIG, getPlanConfig } from "@/config/plans";
import { getFeatureUsage } from "@/lib/rate-limit";

export type UserPlanTier = "free" | "standard";

export const PLAN_LIMITS = {
  get free() {
    return {
      mentorMessages: PLAN_CONFIG.quotas.mentorMessages.limit,
      researchRuns: PLAN_CONFIG.quotas.researchRuns.limit,
      roadmapGenerations: PLAN_CONFIG.quotas.roadmapGenerations.limit,
      resumeUploads: PLAN_CONFIG.quotas.resumeUploads.limit,
    };
  },
  get standard() {
    return {
      mentorMessages: PLAN_CONFIG.quotas.mentorMessages.limit,
      researchRuns: PLAN_CONFIG.quotas.researchRuns.limit,
      roadmapGenerations: PLAN_CONFIG.quotas.roadmapGenerations.limit,
      resumeUploads: PLAN_CONFIG.quotas.resumeUploads.limit,
    };
  },
};

type FeatureKey = "mentorMessages" | "researchRuns" | "roadmapGenerations" | "resumeUploads";

/** Get the plan tier for a user. All users use the free/standard plan tier. */
export async function getUserPlan(_userId?: string): Promise<UserPlanTier> {
  return "free";
}

/** Set the plan tier (no-op since only free/standard plan exists). */
export async function setUserPlan(_userId: string, _plan: UserPlanTier): Promise<void> {
  // Single tier architecture
}

/** Reset usage counter for a user. */
export async function resetPlanUsage(_userId: string): Promise<void> {
  // Managed by rate limiter sliding window
}

/** Check whether a user is within their plan's limit for a given feature. */
export async function checkPlanLimit(
  userId: string,
  feature: FeatureKey
): Promise<{ allowed: boolean; plan: UserPlanTier; currentUsage: number; maxLimit: number }> {
  const maxLimit = PLAN_LIMITS.free[feature];
  const usage = await getFeatureUsage(
    userId,
    feature === "mentorMessages" ? "chat" : feature === "researchRuns" ? "research" : feature === "roadmapGenerations" ? "roadmap" : "resume"
  );

  return {
    allowed: usage.current < maxLimit,
    plan: "free",
    currentUsage: usage.current,
    maxLimit,
  };
}

/** Increment usage counter for a feature. */
export async function incrementPlanUsage(_userId: string, _feature: FeatureKey): Promise<void> {
  // Increments are recorded by rate limiter during checkFeatureRateLimit
}

export type QuotaItem = {
  name: string;
  current: number;
  limit: number;
  label: string;
  percent: number;
  remaining: number;
};

export type AccountQuotaStats = {
  plan: UserPlanTier;
  planName: string;
  planBadge: string;
  planDescription: string;
  quotas: {
    mentorMessages: QuotaItem;
    researchRuns: QuotaItem;
    roadmapGenerations: QuotaItem;
    resumeUploads: QuotaItem;
  };
};

/**
 * Returns dynamic account and feature quota statistics linked to the single source of truth.
 */
export async function getUserAccountQuotaStats(userId: string): Promise<AccountQuotaStats> {
  const [chatUsage, researchUsage, roadmapUsage, resumeUsage] = await Promise.all([
    getFeatureUsage(userId, "chat"),
    getFeatureUsage(userId, "research"),
    getFeatureUsage(userId, "roadmap"),
    getFeatureUsage(userId, "resume"),
  ]);

  const planCfg = getPlanConfig();

  return {
    plan: "free",
    planName: planCfg.name,
    planBadge: planCfg.badge,
    planDescription: planCfg.description,
    quotas: {
      mentorMessages: {
        name: "Mentor Chat Messages",
        current: chatUsage.current,
        limit: planCfg.quotas.mentorMessages.limit,
        label: planCfg.quotas.mentorMessages.label,
        percent: Math.min(100, Math.round((chatUsage.current / Math.max(1, planCfg.quotas.mentorMessages.limit)) * 100)),
        remaining: chatUsage.remaining,
      },
      researchRuns: {
        name: "Deep Web Research Runs",
        current: researchUsage.current,
        limit: planCfg.quotas.researchRuns.limit,
        label: planCfg.quotas.researchRuns.label,
        percent: Math.min(100, Math.round((researchUsage.current / Math.max(1, planCfg.quotas.researchRuns.limit)) * 100)),
        remaining: researchUsage.remaining,
      },
      roadmapGenerations: {
        name: "Roadmap Generations",
        current: roadmapUsage.current,
        limit: planCfg.quotas.roadmapGenerations.limit,
        label: planCfg.quotas.roadmapGenerations.label,
        percent: Math.min(100, Math.round((roadmapUsage.current / Math.max(1, planCfg.quotas.roadmapGenerations.limit)) * 100)),
        remaining: roadmapUsage.remaining,
      },
      resumeUploads: {
        name: "Resume Profile Sync",
        current: resumeUsage.current,
        limit: planCfg.quotas.resumeUploads.limit,
        label: planCfg.quotas.resumeUploads.label,
        percent: Math.min(100, Math.round((resumeUsage.current / Math.max(1, planCfg.quotas.resumeUploads.limit)) * 100)),
        remaining: resumeUsage.remaining,
      },
    },
  };
}

/** @deprecated Use async checkPlanLimit() instead */
export function checkPlanLimitSync(
  userId: string,
  feature: FeatureKey
): { allowed: boolean; plan: UserPlanTier; currentUsage: number; maxLimit: number } {
  const maxLimit = PLAN_LIMITS.free[feature];
  return { allowed: true, plan: "free", currentUsage: 0, maxLimit };
}

/** @deprecated Use async incrementPlanUsage() instead */
export function incrementPlanUsageSync(_userId: string, _feature: FeatureKey): void {}
