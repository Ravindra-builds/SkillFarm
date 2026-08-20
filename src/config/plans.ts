/**
 * Subscription Plans & Feature Quotas Configuration
 *
 * Single tier model: All users (guest and authenticated) operate under the Free / Standard tier in production
 * and the Dev tier in development. Pro / Unlimited tier is disabled everywhere to prevent cost spikes.
 * Quotas are dynamically linked to src/config/rate-limits.ts (Single Source of Truth).
 */

import { RATE_LIMITS } from "./rate-limits";

export type PlanTier = "standard" | "free";

const isDev = process.env.NODE_ENV !== "production";

export const PLAN_CONFIG = {
  name: isDev ? "SkillFarm Dev" : "SkillFarm Free",
  badge: isDev ? "Dev Plan" : "Free Plan",
  description: isDev
    ? "Development environment with dev-tier rate limits for local testing."
    : "Standard access to AI mentors, personalized roadmaps, scored resources, and projects.",
  quotas: {
    mentorMessages: {
      get limit() {
        return isDev ? RATE_LIMITS.chat.dev.limit : RATE_LIMITS.chat.prod.limit;
      },
      get label() {
        const lim = isDev ? RATE_LIMITS.chat.dev.limit : RATE_LIMITS.chat.prod.limit;
        return isDev ? `${lim} / min (Dev)` : `${lim} / day`;
      },
    },
    researchRuns: {
      get limit() {
        return isDev ? RATE_LIMITS.research.dev.limit : RATE_LIMITS.research.prod.limit;
      },
      get label() {
        const lim = isDev ? RATE_LIMITS.research.dev.limit : RATE_LIMITS.research.prod.limit;
        return isDev ? `${lim} / day (Dev)` : `${lim} / day`;
      },
    },
    roadmapGenerations: {
      get limit() {
        return isDev ? RATE_LIMITS.roadmap.dev.limit : RATE_LIMITS.roadmap.prod.limit;
      },
      get label() {
        const lim = isDev ? RATE_LIMITS.roadmap.dev.limit : RATE_LIMITS.roadmap.prod.limit;
        return isDev ? `${lim} / day (Dev)` : `${lim} / day`;
      },
    },
    resumeUploads: {
      get limit() {
        return isDev ? RATE_LIMITS.resume.dev.limit : RATE_LIMITS.resume.prod.limit;
      },
      get label() {
        const lim = isDev ? RATE_LIMITS.resume.dev.limit : RATE_LIMITS.resume.prod.limit;
        return isDev ? `${lim} / day (Dev)` : `${lim} / day`;
      },
    },
  },
};

export function getPlanConfig(_tier?: string) {
  return PLAN_CONFIG;
}
