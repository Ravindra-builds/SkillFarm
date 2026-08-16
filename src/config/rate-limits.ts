/**
 * Centralized Redis TTL & Rate Limit Configuration — Single Source of Truth
 *
 * Defines quotas, sliding-window durations, and Redis/memory cache TTLs across all features in SkillFarm:
 * - Roadmap generation & regeneration (2/day prod, 20/day dev)
 * - Resume upload & parsing analysis (2/day prod, 20/day dev)
 * - Mentor chat streaming (30/min prod, 120/min dev)
 * - Deep web research runs (15/day prod, 100/day dev)
 * - Topic resources endpoint (30/min prod, 120/min dev)
 */

export type RateLimitAction = "roadmap" | "resume" | "chat" | "research" | "topicResources";

export type RateLimitRule = {
  limit: number;
  windowSec: number;
  description: string;
};

const isDev = process.env.NODE_ENV !== "production";

export const RATE_LIMITS: Record<RateLimitAction, { prod: RateLimitRule; dev: RateLimitRule }> = {
  roadmap: {
    prod: { limit: 2, windowSec: 86400, description: "2 roadmap generations per day" },
    dev: { limit: 20, windowSec: 86400, description: "20 roadmap generations per day (dev)" },
  },
  resume: {
    prod: { limit: 2, windowSec: 86400, description: "2 resume uploads per day" },
    dev: { limit: 20, windowSec: 86400, description: "20 resume uploads per day (dev)" },
  },
  chat: {
    prod: { limit: 30, windowSec: 60, description: "30 messages per minute" },
    dev: { limit: 120, windowSec: 60, description: "120 messages per minute (dev)" },
  },
  research: {
    prod: { limit: 15, windowSec: 86400, description: "15 research runs per day" },
    dev: { limit: 100, windowSec: 86400, description: "100 research runs per day (dev)" },
  },
  topicResources: {
    prod: { limit: 30, windowSec: 60, description: "30 topic resource queries per minute" },
    dev: { limit: 120, windowSec: 60, description: "120 topic resource queries per minute (dev)" },
  },
};

/**
 * Centralized Cache TTLs (in seconds) for Redis & In-Memory Cache
 */
export const CACHE_TTL = {
  // 7-day TTL for pre-evaluated topic resource packs (maximizes cross-user cache hits)
  TOPIC_RESOURCE_PACK_TTL: 7 * 86400, // 604,800s

  // 1-hour TTL for raw ad-hoc manual research queries
  RESEARCH_QUERY_TTL: 3600, // 3,600s

  // 24-hour TTL for generated roadmaps
  ROADMAP_TTL: 86400, // 86,400s

  // 24-hour TTL for learning profiles
  LEARNING_PROFILE_TTL: 86400, // 86,400s

  // Default TTL when not specified
  DEFAULT_TTL: 3600, // 3,600s
} as const;

/**
 * Returns the effective rate limit rule for a given action based on environment.
 */
export function getRateLimitRule(action: RateLimitAction): RateLimitRule {
  const config = RATE_LIMITS[action];
  return isDev ? config.dev : config.prod;
}
