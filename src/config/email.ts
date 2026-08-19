/**
 * Email Service & Template Configuration
 * Single Source of Truth for email branding, subjects, and delivery settings.
 */

import { siteConfig } from "./site";

export const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || "SkillFarm <no-reply@skillfarm.in>",
  supportEmail: siteConfig.supportEmail,
  branding: {
    name: siteConfig.name,
    tagline: siteConfig.tagline,
    logoUrl: siteConfig.logoUrl,
    domain: siteConfig.domain,
    primaryColor: "#7C5CFC",
    backgroundColor: "#0B0F17",
    cardColor: "#171A23",
    borderColor: "#252A3A",
  },
  subjects: {
    verification: "Verify your SkillFarm account",
    passwordReset: "Reset your SkillFarm password",
    welcome: "Welcome to SkillFarm — Plant knowledge. Grow skills.",
  },
} as const;

export type EmailConfig = typeof EMAIL_CONFIG;
