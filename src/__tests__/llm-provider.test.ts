jest.mock("@ai-sdk/openai", () => ({
  createOpenAI: jest.fn(() => (modelId: string) => ({
    modelId,
    provider: "openai",
  })),
  openai: jest.fn((modelId: string) => ({
    modelId,
    provider: "openai",
  })),
}));

jest.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: jest.fn(() => (modelId: string) => ({
    modelId,
    provider: "google",
  })),
  google: jest.fn((modelId: string) => ({
    modelId,
    provider: "google",
  })),
}));

jest.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: jest.fn(() => (modelId: string) => ({
    modelId,
    provider: "anthropic",
  })),
  anthropic: jest.fn((modelId: string) => ({
    modelId,
    provider: "anthropic",
  })),
}));

import {
  getActiveLlmProvider,
  isLlmConfigured,
  getLlmProvider,
  getLlmModel,
  registerLlmProvider,
  getAvailableLlmProviders,
} from "@/lib/llm";
import type { LlmProviderConfig, LlmModel } from "@/lib/llm/types";

describe("Multi-LLM Provider Architecture", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Provider Selection & Detection", () => {
    it("selects openai by default when no provider is explicitly set", () => {
      delete process.env.LLM_PROVIDER;
      delete process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;

      expect(getActiveLlmProvider()).toBe("openai");
    });

    it("respects LLM_PROVIDER=gemini environment variable", () => {
      process.env.LLM_PROVIDER = "gemini";
      process.env.GEMINI_API_KEY = "test-gemini-key-12345678";

      expect(getActiveLlmProvider()).toBe("gemini");
      expect(getLlmProvider().id).toBe("gemini");
      expect(getLlmProvider().name).toBe("Google Gemini");
    });

    it("respects LLM_PROVIDER=openai environment variable", () => {
      process.env.LLM_PROVIDER = "openai";
      process.env.OPENAI_API_KEY = "test-openai-key-12345678";

      expect(getActiveLlmProvider()).toBe("openai");
      expect(getLlmProvider().id).toBe("openai");
      expect(getLlmProvider().name).toBe("OpenAI");
    });

    it("respects LLM_PROVIDER=anthropic environment variable", () => {
      process.env.LLM_PROVIDER = "anthropic";
      process.env.ANTHROPIC_API_KEY = "test-anthropic-key-12345678";

      expect(getActiveLlmProvider()).toBe("anthropic");
      expect(getLlmProvider().id).toBe("anthropic");
    });

    it("auto-detects gemini when only GEMINI_API_KEY is configured", () => {
      delete process.env.LLM_PROVIDER;
      delete process.env.OPENAI_API_KEY;
      process.env.GEMINI_API_KEY = "test-gemini-key-12345678";

      expect(getActiveLlmProvider()).toBe("gemini");
    });

    it("auto-detects gemini when only GOOGLE_GENERATIVE_AI_API_KEY is configured", () => {
      delete process.env.LLM_PROVIDER;
      delete process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = "test-google-key-12345678";

      expect(getActiveLlmProvider()).toBe("gemini");
    });

    it("model selection in chat takes precedence over LLM_PROVIDER env variable", () => {
      process.env.LLM_PROVIDER = "openai";
      process.env.GEMINI_API_KEY = "test-gemini-key";
      process.env.OPENAI_API_KEY = "test-openai-key";

      // When model is gemini-2.5-flash, provider must resolve to gemini even though LLM_PROVIDER=openai
      expect(getActiveLlmProvider("gemini-2.5-flash")).toBe("gemini");
      const model = getLlmModel({ model: "gemini-2.5-flash" }) as unknown as { modelId: string; provider: string };
      expect(model.provider).toBe("google");
      expect(model.modelId).toBe("gemini-2.5-flash");
    });

    it("model selection for claude resolves to anthropic regardless of env default", () => {
      process.env.LLM_PROVIDER = "gemini";
      process.env.ANTHROPIC_API_KEY = "test-anthropic-key";

      expect(getActiveLlmProvider("claude-3-5-sonnet-latest")).toBe("anthropic");
      const model = getLlmModel({ model: "claude-3-5-sonnet-latest" }) as unknown as { modelId: string; provider: string };
      expect(model.provider).toBe("anthropic");
      expect(model.modelId).toBe("claude-3-5-sonnet-latest");
    });
  });

  describe("Configuration & Credentials Verification", () => {
    it("reports isLlmConfigured true when active provider key is present", () => {
      process.env.LLM_PROVIDER = "gemini";
      process.env.GEMINI_API_KEY = "AIzaSyValidGeminiKey12345678";

      expect(isLlmConfigured("gemini")).toBe(true);
      expect(isLlmConfigured()).toBe(true);
    });

    it("reports isLlmConfigured false when key is placeholder or missing", () => {
      process.env.LLM_PROVIDER = "gemini";
      process.env.GEMINI_API_KEY = "sk-...placeholder";

      expect(isLlmConfigured("gemini")).toBe(false);
    });

    it("can check specific provider configuration independently", () => {
      process.env.OPENAI_API_KEY = "sk-valid-openai-key-12345678";
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

      expect(isLlmConfigured("openai")).toBe(true);
      expect(isLlmConfigured("gemini")).toBe(false);
    });
  });

  describe("Model Resolution", () => {
    it("returns model instance for default chat role", () => {
      process.env.LLM_PROVIDER = "gemini";
      process.env.GEMINI_API_KEY = "test-gemini-key-12345678";

      const model = getLlmModel({ role: "chat" }) as unknown as { modelId: string; provider: string };
      expect(model).toBeDefined();
      expect(model.modelId).toBe("gemini-3.5-flash");
      expect(model.provider).toBe("google");
    });

    it("returns model instance for router role", () => {
      process.env.LLM_PROVIDER = "openai";
      process.env.OPENAI_API_KEY = "test-openai-key-12345678";

      const model = getLlmModel({ role: "router" }) as unknown as { modelId: string; provider: string };
      expect(model).toBeDefined();
      expect(model.modelId).toBe("gpt-4o-mini");
      expect(model.provider).toBe("openai");
    });

    it("allows overriding model ID explicitly", () => {
      process.env.LLM_PROVIDER = "gemini";
      process.env.GEMINI_API_KEY = "test-gemini-key-12345678";

      const model = getLlmModel({ model: "gemini-1.5-pro" }) as unknown as { modelId: string; provider: string };
      expect(model).toBeDefined();
      expect(model.modelId).toBe("gemini-1.5-pro");
    });

    it("allows overriding provider on a per-call basis", () => {
      process.env.LLM_PROVIDER = "gemini";
      process.env.OPENAI_API_KEY = "test-openai-key-12345678";
      process.env.GEMINI_API_KEY = "test-gemini-key-12345678";

      const openAiModel = getLlmModel({ provider: "openai", model: "gpt-4o" }) as unknown as { modelId: string; provider: string };
      expect(openAiModel).toBeDefined();
      expect(openAiModel.modelId).toBe("gpt-4o");
      expect(openAiModel.provider).toBe("openai");

      const geminiModel = getLlmModel({ provider: "gemini", model: "gemini-2.0-flash" }) as unknown as { modelId: string; provider: string };
      expect(geminiModel).toBeDefined();
      expect(geminiModel.modelId).toBe("gemini-2.0-flash");
      expect(geminiModel.provider).toBe("google");
    });
  });

  describe("Extensibility & Registry", () => {
    it("allows registering a custom provider adapter", () => {
      const mockCustomProvider: LlmProviderConfig = {
        id: "ollama",
        name: "Ollama Local",
        isConfigured: () => true,
        defaultModels: {
          chat: "llama3.2",
          fast: "llama3.2",
          router: "llama3.2",
          synthesizer: "llama3.2",
        },
        availableModels: [{ id: "llama3.2", name: "Llama 3.2" }],
        getModel: (modelId) => {
          return {
            customModelId: modelId || "llama3.2",
            customProvider: "ollama",
          } as unknown as LlmModel;
        },
      };

      registerLlmProvider(mockCustomProvider);

      const customModel = getLlmModel({ provider: "ollama", model: "llama3.2" }) as unknown as {
        customModelId: string;
        customProvider: string;
      };
      expect(customModel.customModelId).toBe("llama3.2");
      expect(customModel.customProvider).toBe("ollama");
    });

    it("getAvailableLlmProviders returns list of registered providers and metadata", () => {
      const providers = getAvailableLlmProviders();
      const ids = providers.map((p) => p.id);

      expect(ids).toContain("openai");
      expect(ids).toContain("gemini");
      expect(ids).toContain("anthropic");
    });
  });
});
