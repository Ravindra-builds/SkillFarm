/**
 * Central Configuration Hub for SkillFarm
 *
 * Export all domain-specific configurations for clean imports across the codebase:
 * import { siteConfig, RATE_LIMITS, PLAN_CONFIG, AUTH_CONFIG, EMAIL_CONFIG } from "@/config";
 */

export * from "./site";
export * from "./auth";
export * from "./plans";
export * from "./rate-limits";
export * from "./email";
export * from "./models";
export * from "./mentors";
