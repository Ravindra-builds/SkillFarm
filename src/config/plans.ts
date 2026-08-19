/**
 * Subscription Plans & Feature Quotas Configuration
 * Single Source of Truth for tier limits, feature access, and display metadata.
 */

export type PlanTier = "free" | "pro";

const isDev = process.env.NODE_ENV !== "production";

export const PLAN_CONFIG: Record<
  PlanTier,
  {
    name: string;
    badge: string;
    description: string;
    quotas: {
      mentorMessages: {
        limit: number;
        label: string;
      };
      researchRuns: {
        limit: number;
        label: string;
      };
      roadmapGenerations: {
        limit: number;
        label: string;
      };
      resumeUploads: {
        limit: number;
        label: string;
      };
    };
  }
> = {
  free: {
    name: "SkillFarm Free",
    badge: "Free Plan",
    description: "Standard access to AI mentors, roadmaps, and portfolio projects.",
    quotas: {
      mentorMessages: {
        limit: isDev ? 500 : 50,
        label: isDev ? "500 messages / day (Dev)" : "50 messages / day",
      },
      researchRuns: {
        limit: isDev ? 100 : 15,
        label: isDev ? "100 runs / day (Dev)" : "15 runs / day",
      },
      roadmapGenerations: {
        limit: isDev ? 20 : 2,
        label: isDev ? "20 / day (Dev)" : "2 / day",
      },
      resumeUploads: {
        limit: isDev ? 20 : 2,
        label: isDev ? "20 / day (Dev)" : "2 / day",
      },
    },
  },
  pro: {
    name: "SkillFarm Pro",
    badge: "Pro Plan",
    description: "Unlimited AI engineering mentorship, deep research, and instant career drills.",
    quotas: {
      mentorMessages: {
        limit: Infinity,
        label: "Unlimited",
      },
      researchRuns: {
        limit: Infinity,
        label: "Unlimited",
      },
      roadmapGenerations: {
        limit: Infinity,
        label: "Unlimited",
      },
      resumeUploads: {
        limit: Infinity,
        label: "Unlimited",
      },
    },
  },
};

export function getPlanConfig(tier: PlanTier = "free") {
  return PLAN_CONFIG[tier] || PLAN_CONFIG.free;
}
