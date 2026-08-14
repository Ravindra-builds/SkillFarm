/**
 * User-Friendly Error Formatter for SkillFarm
 *
 * Converts raw server/provider exceptions into clean, calm, helpful UI messages.
 * Detailed technical errors and stack traces are logged exclusively to server-side logs/terminals.
 */

export type UserFacingError = {
  title: string;
  message: string;
  suggestion?: string;
  retryable: boolean;
  code:
    | "high_demand"
    | "model_unreachable"
    | "auth_error"
    | "network_timeout"
    | "scope_too_broad"
    | "service_error";
};

export function formatUserFacingError(
  err: unknown,
  context?: {
    provider?: string;
    model?: string;
    mentorName?: string;
  }
): UserFacingError {
  const errString =
    err instanceof Error
      ? `${err.name} ${err.message} ${(err as { cause?: string }).cause ?? ""}`
      : String(err);
  const lower = errString.toLowerCase();

  // 1. Rate limits & quota / high demand
  if (
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource_exhausted") ||
    lower.includes("too many requests")
  ) {
    return {
      code: "high_demand",
      title: "High Demand",
      message:
        "The AI service is currently handling high demand. Please give it a few seconds and try asking again.",
      suggestion: "Waiting 5-10 seconds usually resolves this.",
      retryable: true,
    };
  }

  // 2. Model unreachable, not found, or version mismatch
  if (
    lower.includes("model not found") ||
    lower.includes("unsupported model") ||
    lower.includes("not found") ||
    lower.includes("404") ||
    lower.includes("unsupported model version") ||
    lower.includes("model is not supported")
  ) {
    const providerName = context?.provider ? ` (${context.provider})` : "";
    return {
      code: "model_unreachable",
      title: "Model Temporarily Unavailable",
      message: `The requested AI mentor model${providerName} is currently unavailable or undergoing maintenance.`,
      suggestion:
        "Please try again in a moment or verify the model configuration in your settings/environment.",
      retryable: true,
    };
  }

  // 3. Authentication & API key issues
  if (
    lower.includes("401") ||
    lower.includes("unauthorized") ||
    lower.includes("invalid api key") ||
    lower.includes("api_key_invalid") ||
    lower.includes("permission_denied") ||
    lower.includes("403")
  ) {
    return {
      code: "auth_error",
      title: "Service Connection Issue",
      message:
        "Unable to authenticate with the AI provider. Please verify your provider API key configuration.",
      suggestion:
        "Check your environment variables (.env.local) to ensure a valid API key is set.",
      retryable: false,
    };
  }

  // 4. Network timeout or connection drop
  if (
    lower.includes("timeout") ||
    lower.includes("econnreset") ||
    lower.includes("fetch failed") ||
    lower.includes("econnrefused") ||
    lower.includes("network error")
  ) {
    return {
      code: "network_timeout",
      title: "Connection Timeout",
      message:
        "The connection to the mentor took longer than expected to respond.",
      suggestion: "Check your internet connection and try again.",
      retryable: true,
    };
  }

  // 5. Default generic friendly error
  return {
    code: "service_error",
    title: "Service Interruption",
    message:
      "We encountered a temporary issue while connecting with your mentor.",
    suggestion:
      "Please try submitting your question again. If the issue persists, try switching providers in your settings.",
    retryable: true,
  };
}
