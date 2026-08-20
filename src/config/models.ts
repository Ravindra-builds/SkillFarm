/**
 * Single Source of Truth (SSOT) for LLM Providers and Models Catalog.
 *
 * Editing models in this file automatically updates:
 * 1. Backend provider configurations (Gemini, OpenAI, Claude adapters)
 * 2. Settings View ("AI & Models" configuration tab)
 * 3. In-Chat Model Switcher dropdown
 * 4. Client-side preference storage and model resolution
 * 5. Production model allowlist & server-side validation
 */

export type ProviderModelDefinition = {
  id: string;
  name: string;
  provider: "gemini" | "openai" | "anthropic";
  providerName: string;
  badge: string;
  speed: "fast" | "medium" | "smart";
  description: string;
  default?: boolean;
};

// ── Google Gemini Models (Supported Production Models) ────────
export const GEMINI_MODELS: ProviderModelDefinition[] = [
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    provider: "gemini",
    providerName: "Google Gemini",
    badge: "Lightweight & Fast",
    speed: "fast",
    description: "Lightweight, highly efficient and cost-effective production model",
    default: true,
  },
];

// ── OpenAI Models (Supported Production Models) ───────────────
export const OPENAI_MODELS: ProviderModelDefinition[] = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    providerName: "OpenAI",
    badge: "Fast & Efficient",
    speed: "fast",
    description: "Fast, efficient and cost-effective production model",
    default: true,
  },
];

// ── Anthropic Claude Models (Development/Non-Production Only) ─
export const ANTHROPIC_MODELS: ProviderModelDefinition[] = [
  {
    id: "claude-3-5-haiku-latest",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    providerName: "Anthropic Claude",
    badge: "Lightning Fast",
    speed: "fast",
    description: "Lightning fast, lightweight model (dev only)",
    default: true,
  },
];

const isDev = process.env.NODE_ENV !== "production";

// ── Unified Active Catalog (Excludes Anthropic in Production) ─
export const ALL_MODELS: ProviderModelDefinition[] = [
  ...GEMINI_MODELS,
  ...OPENAI_MODELS,
  ...(isDev ? ANTHROPIC_MODELS : []),
];

/**
 * Server-side model allowlist validator.
 * Validates that a client-requested model/provider combination is permitted in production.
 */
export function isAllowedModel(modelId?: string | null, providerId?: string | null): boolean {
  if (!modelId && !providerId) return true;

  // Validate provider if explicitly specified
  if (providerId) {
    const p = providerId.trim().toLowerCase();
    if (p === "anthropic" && !isDev) {
      return false; // Anthropic is strictly disabled in production
    }
    if (p !== "gemini" && p !== "openai" && (p !== "anthropic" || !isDev)) {
      return false;
    }
  }

  // Validate model ID if explicitly specified
  if (modelId) {
    const targetModel = ALL_MODELS.find((m) => m.id === modelId.trim());
    if (!targetModel) {
      return false; // Not in allowed models list (e.g. gemini-2.0-flash, gpt-4-turbo, claude-3-opus in prod)
    }
    if (targetModel.provider === "anthropic" && !isDev) {
      return false;
    }
  }

  return true;
}
