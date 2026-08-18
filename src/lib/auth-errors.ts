/**
 * Centralized Safe Authentication Error Formatter & Error Messages
 *
 * Implements security requirement: Never reveal whether an email exists,
 * never leak database errors, stack traces, or provider internals.
 */

export const AUTH_MESSAGES = {
  INVALID_CREDENTIALS: "Email or password is incorrect. Please try again.",
  GENERIC_ERROR: "Something went wrong while signing you in. Please try again.",
  NETWORK_ERROR: "Unable to connect. Please check your internet connection and try again.",
  OAUTH_FAILED: "We couldn't complete Google sign-in. Please try again.",
  FORGOT_PASSWORD_SUCCESS: "If an account exists for this email, we've sent password reset instructions.",
  RESET_LINK_INVALID: "This password reset link is invalid or has expired. Please request a new one.",
  RESET_PASSWORD_SUCCESS: "Your password has been reset successfully. You can now log in.",
  VERIFICATION_SENT: "We've sent a verification link to your email address. Verify your email to continue.",
  VERIFICATION_SUCCESS: "Your email has been verified successfully.",
  RATE_LIMITED: "Too many attempts. Please wait a few moments before trying again.",
  PASSWORDS_MUST_MATCH: "Passwords do not match.",
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters long.",
  INVALID_EMAIL: "Please enter a valid email address.",
  NAME_REQUIRED: "Please enter your first and last name.",
  ACCOUNT_CREATED: "Account created successfully. Redirecting to dashboard...",
} as const;

export function getSafeAuthErrorMessage(error: unknown): string {
  if (!error) return AUTH_MESSAGES.GENERIC_ERROR;

  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (
    lower.includes("network") ||
    lower.includes("fetch failed") ||
    lower.includes("econnrefused") ||
    lower.includes("timeout") ||
    lower.includes("failed to fetch")
  ) {
    return AUTH_MESSAGES.NETWORK_ERROR;
  }

  if (
    lower.includes("rate") ||
    lower.includes("429") ||
    lower.includes("too many attempts")
  ) {
    return AUTH_MESSAGES.RATE_LIMITED;
  }

  if (
    lower.includes("invalid password") ||
    lower.includes("credential") ||
    lower.includes("user not found") ||
    lower.includes("incorrect password") ||
    lower.includes("invalid login") ||
    lower.includes("unauthorized")
  ) {
    return AUTH_MESSAGES.INVALID_CREDENTIALS;
  }

  if (
    lower.includes("expired") ||
    lower.includes("invalid token") ||
    lower.includes("token expired")
  ) {
    return AUTH_MESSAGES.RESET_LINK_INVALID;
  }

  if (
    lower.includes("oauth") ||
    lower.includes("google") ||
    lower.includes("callback")
  ) {
    return AUTH_MESSAGES.OAUTH_FAILED;
  }

  // Safe fallback
  return AUTH_MESSAGES.GENERIC_ERROR;
}
