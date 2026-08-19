/**
 * Site & Application Configuration
 * Single Source of Truth for branding, URLs, support contact, and global app metadata.
 */

export const siteConfig = {
  name: "SkillFarm",
  tagline: "Plant knowledge. Grow skills. Ship real things.",
  description:
    "Your AI Engineering Team — learn what matters, get guidance from specialized experts, build real projects, and ship them into the real world.",
  domain: "skillfarm.in",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://skillfarm.in",
  logoUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://skillfarm.in"}/logo.png`,
  supportEmail: "support@skillfarm.in",
  creator: "SkillFarm Team",
  links: {
    github: "https://github.com/organizations/SkillFarm-In",
    twitter: "https://x.com/skillfarm_in",
    linkedin: "https://www.linkedin.com/company/skillfarm-in",
    instagram: "https://instagram.com/skillfarm_in",
    support: "mailto:support@skillfarm.in",
    terms: "/terms",
    privacy: "/privacy",
  },
} as const;

export type SiteConfig = typeof siteConfig;
