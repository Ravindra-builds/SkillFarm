/**
 * Client-Side LLM Preferences & Model Catalog
 *
 * Imports models from the Single Source of Truth (`@/config/models`).
 * Stores user-selected provider, default model, and custom enabled models in localStorage.
 * Syncs in real-time across Settings and Chat UI via custom window events.
 */

import {
  ALL_MODELS,
  GEMINI_MODELS,
  OPENAI_MODELS,
  ANTHROPIC_MODELS,
  type ProviderModelDefinition,
} from "@/config/models";

export type ModelOption = ProviderModelDefinition;

export { ALL_MODELS, GEMINI_MODELS, OPENAI_MODELS, ANTHROPIC_MODELS };

export type LlmPreference = {
  provider: "gemini" | "openai" | "anthropic";
  selectedModel: string;
  enabledModels: string[]; // IDs of models shown in chat selector
  activeProviders: string[]; // ["gemini", "openai"]
};

const STORAGE_KEY = "skillfarm:llm-preferences";

export const DEFAULT_PREFERENCE: LlmPreference = {
  provider: "gemini",
  selectedModel: "gemini-3.5-flash-lite",
  enabledModels: ALL_MODELS.map((m) => m.id),
  activeProviders: Array.from(new Set(ALL_MODELS.map((m) => m.provider))),
};

export function getStoredLlmPreference(): LlmPreference {
  if (typeof window === "undefined") return DEFAULT_PREFERENCE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCE;
    const parsed = JSON.parse(raw);

    const validModelIds = new Set<string>(ALL_MODELS.map((m) => m.id));
    const validProviders = new Set<string>(ALL_MODELS.map((m) => m.provider));

    // Filter enabledModels strictly to valid models currently in ALL_MODELS
    const filteredEnabled = Array.isArray(parsed.enabledModels)
      ? parsed.enabledModels.filter((id: unknown): id is string => typeof id === "string" && validModelIds.has(id))
      : [];

    const enabledModels =
      filteredEnabled.length > 0
        ? filteredEnabled
        : ALL_MODELS.map((m) => m.id);

    // Ensure selectedModel is valid and present in enabledModels
    const selectedModel =
      typeof parsed.selectedModel === "string" && validModelIds.has(parsed.selectedModel) && enabledModels.includes(parsed.selectedModel)
        ? parsed.selectedModel
        : enabledModels[0] || ALL_MODELS[0]?.id || "gemini-3.5-flash-lite";

    // Filter activeProviders strictly to active providers
    const filteredProviders = Array.isArray(parsed.activeProviders)
      ? parsed.activeProviders.filter((p: unknown): p is string => typeof p === "string" && validProviders.has(p))
      : [];

    const activeProviders =
      filteredProviders.length > 0
        ? filteredProviders
        : Array.from(new Set(ALL_MODELS.map((m) => m.provider)));

    const provider: "gemini" | "openai" | "anthropic" =
      typeof parsed.provider === "string" && validProviders.has(parsed.provider)
        ? (parsed.provider as "gemini" | "openai" | "anthropic")
        : (ALL_MODELS.find((m) => m.id === selectedModel)?.provider ?? "gemini");

    return {
      provider,
      selectedModel,
      enabledModels,
      activeProviders,
    };
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

export function saveStoredLlmPreference(pref: Partial<LlmPreference>): LlmPreference {
  if (typeof window === "undefined") return DEFAULT_PREFERENCE;
  try {
    const current = getStoredLlmPreference();
    const updated: LlmPreference = { ...current, ...pref };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent("skillfarm:llm-preference-changed", { detail: updated })
    );
    return updated;
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

export function getModelById(modelId?: string | null): ModelOption {
  if (!modelId) return ALL_MODELS[0];
  const found = ALL_MODELS.find((m) => m.id === modelId);
  if (found) return found;
  // Fallback match based on model name substrings
  if (modelId.includes("gemini")) return ALL_MODELS.find((m) => m.provider === "gemini") || ALL_MODELS[0];
  if (modelId.includes("gpt")) return ALL_MODELS.find((m) => m.id === "gpt-4o-mini") || ALL_MODELS[0];
  if (modelId.includes("claude")) return ALL_MODELS.find((m) => m.id === "claude-3-5-sonnet-latest") || ALL_MODELS[0];
  return ALL_MODELS[0];
}
