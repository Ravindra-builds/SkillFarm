import type { streamText } from "ai";

export type LlmModel = Parameters<typeof streamText>[0]["model"];

export type LlmProviderId = "openai" | "gemini" | "anthropic" | string;

export type LlmModelRole = "chat" | "fast" | "router" | "synthesizer" | "roadmap" | "extractor";

export type LlmModelOptions = {
  provider?: LlmProviderId;
  model?: string;
  role?: LlmModelRole;
};

export type LlmProviderConfig = {
  id: LlmProviderId;
  name: string;
  isConfigured: () => boolean;
  defaultModels: Record<LlmModelRole, string>;
  getModel: (modelId?: string, role?: LlmModelRole) => LlmModel;
  availableModels: Array<{ id: string; name: string; description?: string }>;
};
