/**
 * Centralized User-Friendly Error Formatter & Handler for SkillFarm
 *
 * Rules:
 * - Never leak raw stack traces, database schema, API keys, env vars, or provider errors to clients.
 * - Map caught exceptions to clean, calm, helpful plain-English UI messages with actionable next steps.
 * - Assign a unique errorId (e.g., ERR_X89A12) for traceability in server logs and support tickets.
 * - Log technical details exclusively on the server terminal with the errorId and sanitized data.
 */

import { randomBytes } from "crypto";

export type ErrorCode =
  | "high_demand"
  | "model_unreachable"
  | "auth_error"
  | "network_timeout"
  | "upload_error"
  | "database_error"
  | "scope_too_broad"
  | "service_error";

export type UserFacingError = {
  errorId: string;
  code: ErrorCode;
  title: string;
  message: string;
  suggestion: string;
  retryable: boolean;
  status: number;
};

export type ErrorContext = {
  endpoint?: string;
  provider?: string;
  model?: string;
  mentorName?: string;
  userId?: string;
  action?: string;
};

/**
 * Generates a unique tracking error ID for internal log correlation.
 */
export function generateErrorId(): string {
  return `ERR_${randomBytes(4).toString("hex").toUpperCase()}`;
}

/**
 * Masks sensitive patterns (passwords, tokens, database URLs, API keys) from strings.
 */
function maskSensitiveInfo(str: string): string {
  return str
    .replace(/postgresql:\/\/[^:]+:[^@]+@[^\s/]+/gi, "postgresql://[REDACTED_DB_URL]")
    .replace(/(sk-[a-zA-Z0-9_-]{20,})/gi, "[REDACTED_OPENAI_KEY]")
    .replace(/(AIzaSy[a-zA-Z0-9_-]{25,})/gi, "[REDACTED_GOOGLE_KEY]")
    .replace(/(re_[a-zA-Z0-9_-]{20,})/gi, "[REDACTED_RESEND_KEY]")
    .replace(/(tvly-[a-zA-Z0-9_-]{20,})/gi, "[REDACTED_TAVILY_KEY]")
    .replace(/(m0-[a-zA-Z0-9_-]{20,})/gi, "[REDACTED_MEM0_KEY]")
    .replace(/(github_pat_[a-zA-Z0-9_-]{20,})/gi, "[REDACTED_GITHUB_TOKEN]")
    .replace(/("password"\s*:\s*)"[^"]+"/gi, '$1"[REDACTED]"');
}

/**
 * Centralized error categorization and user-friendly formatting engine.
 */
export function formatUserFacingError(
  err: unknown,
  context?: ErrorContext
): UserFacingError {
  const errorId = generateErrorId();

  const rawMessage =
    err instanceof Error
      ? `${err.name}: ${err.message} ${(err as { cause?: string }).cause ?? ""}`
      : String(err);
  const lower = rawMessage.toLowerCase();

  // Log raw technical details with masked secrets strictly to the server console
  const maskedLog = maskSensitiveInfo(
    `🔴 [${errorId}]${context?.endpoint ? ` [${context.endpoint}]` : ""}: ${rawMessage}`
  );
  console.error(maskedLog);
  if (err instanceof Error && err.stack) {
    console.error(`🔴 [${errorId}] Stack:`, maskSensitiveInfo(err.stack));
  }

  // 1. Rate limits & quota exhaustion
  if (
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource_exhausted") ||
    lower.includes("too many requests")
  ) {
    return {
      errorId,
      code: "high_demand",
      title: "High Demand",
      message: "The AI service is currently experiencing high demand. Please pause for a moment before trying again.",
      suggestion: "Waiting 5–10 seconds usually resolves this.",
      retryable: true,
      status: 429,
    };
  }

  // 2. Model unreachable, not found, or version mismatch
  if (
    lower.includes("model not found") ||
    lower.includes("unsupported model") ||
    lower.includes("404") ||
    lower.includes("unsupported model version") ||
    lower.includes("model is not supported")
  ) {
    const providerName = context?.provider ? ` (${context.provider})` : "";
    return {
      errorId,
      code: "model_unreachable",
      title: "Model Temporarily Unavailable",
      message: `The requested AI mentor model${providerName} is temporarily unavailable or undergoing maintenance.`,
      suggestion: "Please try again in a few moments or switch to a different model in settings.",
      retryable: true,
      status: 503,
    };
  }

  // 3. Authentication & API key issues
  if (
    lower.includes("401") ||
    lower.includes("unauthorized") ||
    lower.includes("invalid api key") ||
    lower.includes("api_key_invalid") ||
    lower.includes("permission_denied") ||
    lower.includes("403") ||
    lower.includes("forbidden")
  ) {
    return {
      errorId,
      code: "auth_error",
      title: "Service Connection Issue",
      message: "We encountered an authorization issue connecting with the AI provider service.",
      suggestion: "Please verify that the required service keys are correctly configured in your settings.",
      retryable: false,
      status: 500,
    };
  }

  // 4. File processing & PDF parsing errors
  if (
    lower.includes("pdf") ||
    lower.includes("corrupt") ||
    lower.includes("file size") ||
    lower.includes("extract readable text") ||
    lower.includes("decompression") ||
    lower.includes("multipart")
  ) {
    return {
      errorId,
      code: "upload_error",
      title: "File Processing Issue",
      message: "We were unable to extract readable content from the uploaded document.",
      suggestion: "Please ensure the file is an unencrypted PDF or try pasting the plain text directly.",
      retryable: true,
      status: 400,
    };
  }

  // 5. Database & Storage persistence errors
  if (
    lower.includes("postgres") ||
    lower.includes("neon") ||
    lower.includes("drizzle") ||
    lower.includes("database") ||
    lower.includes("sql") ||
    lower.includes("connection pool") ||
    lower.includes("r2") ||
    lower.includes("s3")
  ) {
    return {
      errorId,
      code: "database_error",
      title: "Temporary Storage Issue",
      message: "We encountered a temporary issue while saving or loading your data.",
      suggestion: "Please refresh the page and try again. Your progress is safeguarded.",
      retryable: true,
      status: 500,
    };
  }

  // 6. Network timeout or connection drop
  if (
    lower.includes("timeout") ||
    lower.includes("econnreset") ||
    lower.includes("fetch failed") ||
    lower.includes("econnrefused") ||
    lower.includes("network error") ||
    lower.includes("enotfound")
  ) {
    return {
      errorId,
      code: "network_timeout",
      title: "Connection Timeout",
      message: "The request took longer than expected to complete.",
      suggestion: "Please check your network connection and try again.",
      retryable: true,
      status: 504,
    };
  }

  // 7. Default generic friendly error (strict data masking)
  return {
    errorId,
    code: "service_error",
    title: "Service Interruption",
    message: "We encountered an unexpected issue while processing your request.",
    suggestion: `Please try again. If the issue continues, please reference code ${errorId}.`,
    retryable: true,
    status: 500,
  };
}

/**
 * Creates a safe, clean Response object for API routes with zero raw internal leakage.
 */
export function createSafeErrorResponse(
  err: unknown,
  context?: ErrorContext,
  statusOverride?: number
): Response {
  const friendly = formatUserFacingError(err, context);
  const status = statusOverride ?? friendly.status;

  return new Response(
    JSON.stringify({
      error: friendly.message,
      errorId: friendly.errorId,
      code: friendly.code,
      title: friendly.title,
      message: friendly.message,
      suggestion: friendly.suggestion,
      retryable: friendly.retryable,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "X-Error-Id": friendly.errorId,
      },
    }
  );
}
