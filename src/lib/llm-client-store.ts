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
  selectedModel: "gemini-3.5-flash",
  enabledModels: [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gpt-4o-mini",
    "gpt-4o",
  ],
  activeProviders: ["gemini", "openai"],
};

export function getStoredLlmPreference(): LlmPreference {
  if (typeof window === "undefined") return DEFAULT_PREFERENCE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PREFERENCE,
      ...parsed,
      enabledModels: Array.isArray(parsed.enabledModels) && parsed.enabledModels.length > 0
        ? parsed.enabledModels
        : DEFAULT_PREFERENCE.enabledModels,
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
