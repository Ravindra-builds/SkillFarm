import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LlmProviderConfig, LlmModelRole, LlmModel } from "../types";
import { isPlaceholder, isMockModeForced } from "@/lib/env";
import { GEMINI_MODELS } from "@/config/models";

function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

function isValidGeminiModel(model?: string | null): boolean {
  if (!model) return false;
  const s = model.toLowerCase().trim();
  return (
    s.startsWith("gemini-") ||
    s.startsWith("models/gemini-") ||
    s.includes("gemini")
  );
}

const defaultGeminiModel = GEMINI_MODELS.find((m) => m.default)?.id || GEMINI_MODELS[0].id;

export const geminiProvider: LlmProviderConfig = {
  id: "gemini",
  name: "Google Gemini",

  isConfigured: () => {
    if (isMockModeForced()) return false;
    const key = getGeminiApiKey();
    return !!key && !isPlaceholder(key);
  },

  defaultModels: {
    chat: isValidGeminiModel(process.env.GEMINI_MODEL)
      ? process.env.GEMINI_MODEL!
      : isValidGeminiModel(process.env.LLM_MODEL)
      ? process.env.LLM_MODEL!
      : defaultGeminiModel,
    fast: defaultGeminiModel,
    router: isValidGeminiModel(process.env.ROUTER_MODEL)
      ? process.env.ROUTER_MODEL!
      : defaultGeminiModel,
    synthesizer: isValidGeminiModel(process.env.SYNTHESIZER_MODEL)
      ? process.env.SYNTHESIZER_MODEL!
      : defaultGeminiModel,
    roadmap: isValidGeminiModel(process.env.ROADMAP_LLM_MODEL)
      ? process.env.ROADMAP_LLM_MODEL!
      : defaultGeminiModel,
    extractor: defaultGeminiModel,
  },

  availableModels: GEMINI_MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
  })),

  getModel: (modelId?: string, role: LlmModelRole = "chat"): LlmModel => {
    const google = createGoogleGenerativeAI({
      apiKey: getGeminiApiKey(),
    });

    // Only use modelId if it is a valid Gemini model (ignore foreign model names like 'gpt-4o-mini')
    const validExplicitModel = isValidGeminiModel(modelId) ? modelId : null;

    const targetModel =
      validExplicitModel ||
      (role === "roadmap" && isValidGeminiModel(process.env.ROADMAP_LLM_MODEL) && process.env.ROADMAP_LLM_MODEL) ||
      (role === "router" && isValidGeminiModel(process.env.ROUTER_MODEL) && process.env.ROUTER_MODEL) ||
      (role === "synthesizer" && isValidGeminiModel(process.env.SYNTHESIZER_MODEL) && process.env.SYNTHESIZER_MODEL) ||
      (isValidGeminiModel(process.env.GEMINI_MODEL) && process.env.GEMINI_MODEL) ||
      (isValidGeminiModel(process.env.LLM_MODEL) && process.env.LLM_MODEL) ||
      geminiProvider.defaultModels[role] ||
      defaultGeminiModel;

    return google(targetModel) as unknown as LlmModel;
  },
};
