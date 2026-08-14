import type { LlmProviderConfig, LlmProviderId, LlmModelOptions, LlmModel } from "./types";
import { openaiProvider } from "./providers/openai";
import { geminiProvider } from "./providers/gemini";
import { anthropicProvider } from "./providers/anthropic";

/**
 * Built-in provider registry.
 * Adding a new provider in the future is as simple as creating an adapter
 * and adding it here or calling registerLlmProvider().
 */
const providerRegistry = new Map<string, LlmProviderConfig>([
  ["gemini", geminiProvider],
  ["openai", openaiProvider],
  ["anthropic", anthropicProvider],
]);

/**
 * Registers an external/custom LLM provider.
 */
export function registerLlmProvider(provider: LlmProviderConfig): void {
  providerRegistry.set(provider.id.toLowerCase(), provider);
}

/**
 * Infers the LLM provider directly from the model name/ID.
 * This guarantees zero conflicts between user chat model selection and backend routing.
 *
 * Examples:
 * - "gemini-2.5-flash" -> "gemini"
 * - "gpt-4o-mini" -> "openai"
 * - "claude-3-5-sonnet-latest" -> "anthropic"
 */
export function inferProviderFromModel(modelId?: string): LlmProviderId | null {
  if (!modelId) return null;
  const m = modelId.trim().toLowerCase();
  if (m.startsWith("gemini") || m.includes("google") || m.includes("palm")) return "gemini";
  if (m.startsWith("gpt-") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("chatgpt")) return "openai";
  if (m.startsWith("claude")) return "anthropic";
  return null;
}

/**
 * Resolves the currently active LLM provider.
 *
 * Priority Order:
 * 1. Inferred provider from requested `modelId` (if provided).
 * 2. Explicit `providerId` (if provided and valid).
 * 3. Auto-detected from available API keys (Gemini -> OpenAI -> Anthropic).
 * 4. Fallback to "gemini" or "openai".
 */
export function getActiveLlmProvider(modelId?: string, providerId?: string): LlmProviderId {
  // 1. Model-driven resolution (Highest priority — prevents env conflict)
  const inferred = inferProviderFromModel(modelId);
  if (inferred && providerRegistry.has(inferred)) {
    return inferred;
  }

  // 2. Explicit provider parameter
  if (providerId && providerRegistry.has(providerId.toLowerCase())) {
    return providerId.toLowerCase();
  }

  // 3. Optional env override if explicitly set by developer
  const envProvider = (process.env.LLM_PROVIDER || "").trim().toLowerCase();
  if (envProvider && providerRegistry.has(envProvider)) {
    const p = providerRegistry.get(envProvider);
    if (p?.isConfigured()) {
      return envProvider;
    }
  }

  // 4. Auto-detect based on configured credentials in environment
  for (const [id, provider] of providerRegistry.entries()) {
    if (provider.isConfigured()) {
      return id;
    }
  }

  return "openai";
}

/**
 * Checks if a valid LLM provider is configured with credentials.
 * If modelId or providerId is provided, checks that specific provider.
 * Otherwise, returns true if ANY registered provider is configured.
 */
export function isLlmConfigured(providerId?: LlmProviderId, modelId?: string): boolean {
  if (providerId || modelId) {
    const targetId = getActiveLlmProvider(modelId, providerId);
    const provider = providerRegistry.get(targetId);
    return provider ? provider.isConfigured() : false;
  }

  // If no specific provider or model was requested, check if any provider is configured
  for (const p of providerRegistry.values()) {
    if (p.isConfigured()) return true;
  }

  return false;
}

/**
 * Retrieves the LLM provider configuration matching the model or requested provider.
 */
export function getLlmProvider(providerId?: LlmProviderId, modelId?: string): LlmProviderConfig {
  const targetId = getActiveLlmProvider(modelId, providerId);
  const provider = providerRegistry.get(targetId);
  if (!provider) {
    return openaiProvider;
  }
  return provider;
}

/**
 * Single unified resolver to obtain a model instance for Vercel AI SDK (streamText, generateText, generateObject).
 *
 * Resolves provider seamlessly from the model ID so selecting "gemini-2.5-flash" in the chat
 * always invokes Google Gemini adapter regardless of env defaults.
 *
 * Examples:
 * ```ts
 * const model = getLlmModel({ model: "gemini-2.5-flash" }); // Automatically uses Gemini adapter
 * const model = getLlmModel({ model: "gpt-4o-mini" });       // Automatically uses OpenAI adapter
 * const model = getLlmModel({ role: "fast" });               // Uses first configured provider
 * ```
 */
export function getLlmModel(options?: LlmModelOptions): LlmModel {
  const provider = getLlmProvider(options?.provider, options?.model);
  return provider.getModel(options?.model, options?.role);
}

/**
 * Returns metadata about all registered providers for UI selector and settings.
 */
export function getAvailableLlmProviders(): Array<{
  id: string;
  name: string;
  isConfigured: boolean;
  isActive: boolean;
  models: Array<{ id: string; name: string; description?: string }>;
}> {
  const activeId = getActiveLlmProvider();
  return Array.from(providerRegistry.values()).map((p) => ({
    id: p.id,
    name: p.name,
    isConfigured: p.isConfigured(),
    isActive: p.id === activeId,
    models: p.availableModels,
  }));
}
