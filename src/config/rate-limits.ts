/**
 * Centralized Rate Limit Configuration — Single Source of Truth
 *
 * Defines quotas and sliding-window durations across all features in SkillFarm:
 * - Roadmap generation & regeneration (2/day prod, 10/day dev)
 * - Resume upload & parsing analysis (2/day prod, 10/day dev)
 * - Mentor chat streaming (30/min prod, 120/min dev)
 * - Deep web research runs (5/day prod, 100/day dev)
 */

export type RateLimitAction = "roadmap" | "resume" | "chat" | "research";

export type RateLimitRule = {
  limit: number;
  windowSec: number;
  description: string;
};

const isDev = process.env.NODE_ENV !== "production";

export const RATE_LIMITS: Record<RateLimitAction, { prod: RateLimitRule; dev: RateLimitRule }> = {
  roadmap: {
    prod: { limit: 2, windowSec: 86400, description: "2 roadmap generations per day" },
    dev: { limit: 10, windowSec: 86400, description: "10 roadmap generations per day (dev)" },
  },
  resume: {
    prod: { limit: 2, windowSec: 86400, description: "2 resume uploads per day" },
    dev: { limit: 2, windowSec: 86400, description: "2 resume uploads per day (dev)" },
  },
  chat: {
    prod: { limit: 30, windowSec: 60, description: "30 messages per minute" },
    dev: { limit: 120, windowSec: 60, description: "120 messages per minute (dev)" },
  },
  research: {
    prod: { limit: 5, windowSec: 86400, description: "5 research runs per day" },
    dev: { limit: 100, windowSec: 86400, description: "100 research runs per day (dev)" },
  },
};

/**
 * Returns the effective rate limit rule for a given action based on environment.
 */
export function getRateLimitRule(action: RateLimitAction): RateLimitRule {
  const config = RATE_LIMITS[action];
  return isDev ? config.dev : config.prod;
}
