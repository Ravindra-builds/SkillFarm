import { createOpenAI } from "@ai-sdk/openai";
import type { LlmProviderConfig, LlmModelRole, LlmModel } from "../types";
import { isPlaceholder, isMockModeForced } from "@/lib/env";
import { OPENAI_MODELS } from "@/config/models";

function isValidOpenAiModel(model?: string | null): boolean {
  if (!model) return false;
  const s = model.toLowerCase().trim();
  return (
    s.startsWith("gpt-") ||
    s.startsWith("o1") ||
    s.startsWith("o3") ||
    s.startsWith("chatgpt") ||
    s.startsWith("text-")
  );
}

const defaultOpenAiModel = OPENAI_MODELS.find((m) => m.default)?.id || OPENAI_MODELS[0].id;

export const openaiProvider: LlmProviderConfig = {
  id: "openai",
  name: "OpenAI",

  isConfigured: () => {
    if (isMockModeForced()) return false;
    const key = process.env.OPENAI_API_KEY;
    return !!key && !isPlaceholder(key);
  },

  defaultModels: {
    chat: isValidOpenAiModel(process.env.OPENAI_MODEL)
      ? process.env.OPENAI_MODEL!
      : isValidOpenAiModel(process.env.LLM_MODEL)
      ? process.env.LLM_MODEL!
      : defaultOpenAiModel,
    fast: defaultOpenAiModel,
    router: isValidOpenAiModel(process.env.ROUTER_MODEL)
      ? process.env.ROUTER_MODEL!
      : defaultOpenAiModel,
    synthesizer: isValidOpenAiModel(process.env.SYNTHESIZER_MODEL)
      ? process.env.SYNTHESIZER_MODEL!
      : defaultOpenAiModel,
  },

  availableModels: OPENAI_MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
  })),

  getModel: (modelId?: string, role: LlmModelRole = "chat"): LlmModel => {
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    });

    // Only use modelId if it is a valid OpenAI model (ignore foreign model names like 'gemini-3.5-flash')
    const validExplicitModel = isValidOpenAiModel(modelId) ? modelId : null;

    const targetModel =
      validExplicitModel ||
      (role === "router" && isValidOpenAiModel(process.env.ROUTER_MODEL) && process.env.ROUTER_MODEL) ||
      (role === "synthesizer" && isValidOpenAiModel(process.env.SYNTHESIZER_MODEL) && process.env.SYNTHESIZER_MODEL) ||
      (isValidOpenAiModel(process.env.OPENAI_MODEL) && process.env.OPENAI_MODEL) ||
      (isValidOpenAiModel(process.env.LLM_MODEL) && process.env.LLM_MODEL) ||
      openaiProvider.defaultModels[role] ||
      defaultOpenAiModel;

    return openai(targetModel) as unknown as LlmModel;
  },
};
