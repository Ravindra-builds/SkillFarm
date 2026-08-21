/**
 * Centralized Rate Limits & Cache TTL Configuration — Single Source of Truth
 *
 * Defines quotas, sliding-window durations, and Redis/memory cache TTLs across all features in SkillFarm.
 */

export type RateLimitAction =
  | "login"
  | "signup"
  | "forgotPassword"
  | "resetPassword"
  | "verifyEmail"
  | "otp"
  | "roadmap"
  | "resume"
  | "chat"
  | "research"
  | "topicResources"
  | "guestCreation";

export type RateLimitRule = {
  limit: number;
  windowSec: number;
  description: string;
};

const isDev = process.env.NODE_ENV !== "production";

export const RATE_LIMITS: Record<RateLimitAction, { prod: RateLimitRule; dev: RateLimitRule }> = {
  // Auth Rate Limits (prevents brute-force, enumeration, and abuse)
  login: {
    prod: { limit: 10, windowSec: 60, description: "10 login attempts per minute" },
    dev: { limit: 30, windowSec: 60, description: "30 login attempts per minute (dev)" },
  },
  signup: {
    prod: { limit: 10, windowSec: 60, description: "10 signup attempts per minute" },
    dev: { limit: 30, windowSec: 60, description: "30 signup attempts per minute (dev)" },
  },
  forgotPassword: {
    prod: { limit: 5, windowSec: 900, description: "5 password reset requests per 15 minutes" },
    dev: { limit: 20, windowSec: 900, description: "20 password reset requests per 15 minutes (dev)" },
  },
  resetPassword: {
    prod: { limit: 10, windowSec: 60, description: "10 password update attempts per minute" },
    dev: { limit: 30, windowSec: 60, description: "30 password update attempts per minute (dev)" },
  },
  verifyEmail: {
    prod: { limit: 10, windowSec: 600, description: "10 email verification requests per 10 minutes" },
    dev: { limit: 30, windowSec: 600, description: "30 email verification requests per 10 minutes (dev)" },
  },
  otp: {
    prod: { limit: 5, windowSec: 60, description: "5 OTP attempts per minute" },
    dev: { limit: 20, windowSec: 60, description: "20 OTP attempts per minute (dev)" },
  },
  guestCreation: {
    prod: { limit: 20, windowSec: 600, description: "20 guest sessions per 10 minutes per IP" },
    dev: { limit: 100, windowSec: 600, description: "100 guest sessions per 10 minutes (dev)" },
  },

  // Feature Rate Limits
  roadmap: {
    prod: { limit: 2, windowSec: 86400, description: "2 roadmap generations per day" },
    dev: { limit: 20, windowSec: 86400, description: "20 roadmap generations per day (dev)" },
  },
  resume: {
    prod: { limit: 2, windowSec: 86400, description: "2 resume uploads per day" },
    dev: { limit: 20, windowSec: 86400, description: "20 resume uploads per day (dev)" },
  },
  chat: {
    prod: { limit: 15, windowSec: 86400, description: "15 messages per day" },
    dev: { limit: 120, windowSec: 60, description: "120 messages per minute (dev)" },
  },
  research: {
    prod: { limit: 5, windowSec: 86400, description: "5 research runs per day" },
    dev: { limit: 100, windowSec: 86400, description: "100 research runs per day (dev)" },
  },
  topicResources: {
    prod: { limit: 10, windowSec: 60, description: "10 topic resource queries per minute" },
    dev: { limit: 120, windowSec: 60, description: "120 topic resource queries per minute (dev)" },
  },
};

/**
 * Centralized Cache TTLs (in seconds) for Redis & In-Memory Cache
 */
export const CACHE_TTL = {
  // 30-day TTL for pre-evaluated topic resource packs (maximizes cross-user cache hits for evergreen curricula)
  TOPIC_RESOURCE_PACK_TTL: 30 * 86400, // 2,592,000s (30 days)

  // 1-hour TTL for raw ad-hoc manual research queries
  RESEARCH_QUERY_TTL: 3600, // 3,600s

  // 24-hour TTL for generated roadmaps
  ROADMAP_TTL: 86400, // 86,400s

  // 24-hour TTL for learning profiles
  LEARNING_PROFILE_TTL: 86400, // 86,400s

  // 180-day TTL for cached user credentials in Redis
  CREDENTIAL_CACHE_TTL: 180 * 86400, // 15,552,000s (180 days)

  // Default TTL when not specified
  DEFAULT_TTL: 3600, // 3,600s
} as const;

/**
 * Returns the effective rate limit rule for a given action based on environment.
 */
export function getRateLimitRule(action: RateLimitAction): RateLimitRule {
  const config = RATE_LIMITS[action];
  if (!config) {
    return { limit: 30, windowSec: 60, description: "30 requests per minute" };
  }
  return isDev ? config.dev : config.prod;
}
