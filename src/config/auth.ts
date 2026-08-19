/**
 * Authentication Configuration & Constants
 * Single Source of Truth for session cookies, token TTLs, and auth settings.
 */

export const AUTH_CONFIG = {
  cookies: {
    session: "skillfarm_session",
    legacySession: "SkillFarm_session",
    guestId: "skillfarm_guest_id",
    maxAgeDays: 30,
  },
  tokens: {
    // 1 hour for password reset tokens (single-use)
    resetTokenTtlSeconds: 60 * 60,
    // 24 hours for email verification tokens (single-use)
    verifyTokenTtlSeconds: 24 * 60 * 60,
    // 10 minutes for OTP verification codes
    otpTtlSeconds: 10 * 60,
  },
  routes: {
    login: "/login",
    signup: "/signup",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
    verifyEmail: "/verify-email",
    dashboard: "/dashboard",
    defaultCallback: "/dashboard",
  },
  protectedPatterns: [
    "/dashboard",
    "/chat",
    "/roadmap",
    "/projects",
    "/resources",
    "/knowledge",
    "/settings",
  ],
} as const;

export type AuthConfig = typeof AUTH_CONFIG;
