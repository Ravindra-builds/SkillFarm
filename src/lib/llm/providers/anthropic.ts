import { createAnthropic } from "@ai-sdk/anthropic";
import type { LlmProviderConfig, LlmModelRole, LlmModel } from "../types";
import { isPlaceholder, isMockModeForced } from "@/lib/env";
import { ANTHROPIC_MODELS } from "@/config/models";

function isValidAnthropicModel(model?: string | null): boolean {
  if (!model) return false;
  const s = model.toLowerCase().trim();
  return s.startsWith("claude-") || s.includes("claude");
}

const defaultAnthropicModel = ANTHROPIC_MODELS.find((m) => m.default)?.id || ANTHROPIC_MODELS[0].id;

export const anthropicProvider: LlmProviderConfig = {
  id: "anthropic",
  name: "Anthropic Claude",

  isConfigured: () => {
    if (isMockModeForced()) return false;
    const key = process.env.ANTHROPIC_API_KEY;
    return !!key && !isPlaceholder(key);
  },

  defaultModels: {
    chat: isValidAnthropicModel(process.env.ANTHROPIC_MODEL)
      ? process.env.ANTHROPIC_MODEL!
      : isValidAnthropicModel(process.env.LLM_MODEL)
      ? process.env.LLM_MODEL!
      : defaultAnthropicModel,
    fast: "claude-3-5-haiku-latest",
    router: isValidAnthropicModel(process.env.ROUTER_MODEL)
      ? process.env.ROUTER_MODEL!
      : "claude-3-5-haiku-latest",
    synthesizer: isValidAnthropicModel(process.env.SYNTHESIZER_MODEL)
      ? process.env.SYNTHESIZER_MODEL!
      : defaultAnthropicModel,
    roadmap: isValidAnthropicModel(process.env.ROADMAP_LLM_MODEL)
      ? process.env.ROADMAP_LLM_MODEL!
      : defaultAnthropicModel,
    extractor: "claude-3-5-haiku-latest",
  },

  availableModels: ANTHROPIC_MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
  })),

  getModel: (modelId?: string, role: LlmModelRole = "chat"): LlmModel => {
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: process.env.ANTHROPIC_BASE_URL,
    });

    // Only use modelId if it is a valid Anthropic model (ignore foreign model names)
    const validExplicitModel = isValidAnthropicModel(modelId) ? modelId : null;

    const targetModel =
      validExplicitModel ||
      (role === "roadmap" && isValidAnthropicModel(process.env.ROADMAP_LLM_MODEL) && process.env.ROADMAP_LLM_MODEL) ||
      (role === "router" && isValidAnthropicModel(process.env.ROUTER_MODEL) && process.env.ROUTER_MODEL) ||
      (role === "synthesizer" && isValidAnthropicModel(process.env.SYNTHESIZER_MODEL) && process.env.SYNTHESIZER_MODEL) ||
      (isValidAnthropicModel(process.env.ANTHROPIC_MODEL) && process.env.ANTHROPIC_MODEL) ||
      (isValidAnthropicModel(process.env.LLM_MODEL) && process.env.LLM_MODEL) ||
      anthropicProvider.defaultModels[role] ||
      defaultAnthropicModel;

    return anthropic(targetModel) as unknown as LlmModel;
  },
};
