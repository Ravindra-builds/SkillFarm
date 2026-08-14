/**
 * Single Source of Truth (SSOT) for LLM Providers and Models Catalog.
 *
 * Editing models in this file automatically updates:
 * 1. Backend provider configurations (Gemini, OpenAI, Claude adapters)
 * 2. Settings View ("AI & Models" configuration tab)
 * 3. In-Chat Model Switcher dropdown
 * 4. Client-side preference storage and model resolution
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

// ── Google Gemini Models ───────────────────────────────────────
export const GEMINI_MODELS: ProviderModelDefinition[] = [
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    provider: "gemini",
    providerName: "Google Gemini",
    badge: "Flagship Fast",
    speed: "fast",
    description: "Flagship fast & smart multimodal model",
    default: true,
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "gemini",
    providerName: "Google Gemini",
    badge: "Multimodal Fast",
    speed: "fast",
    description: "Next-gen multimodal fast model",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    provider: "gemini",
    providerName: "Google Gemini",
    badge: "Lightweight",
    speed: "fast",
    description: "Lightweight and efficient model",
  },
];

// ── OpenAI Models ─────────────────────────────────────────────
export const OPENAI_MODELS: ProviderModelDefinition[] = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    providerName: "OpenAI",
    badge: "Fast & Efficient",
    speed: "fast",
    description: "Fast, efficient and cost-effective",
    default: true,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    providerName: "OpenAI",
    badge: "Flagship Omni",
    speed: "smart",
    description: "Flagship omni model",
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    providerName: "OpenAI",
    badge: "Deep Reasoning",
    speed: "medium",
    description: "High-capability reasoning",
  },
];

// ── Anthropic Claude Models ───────────────────────────────────
export const ANTHROPIC_MODELS: ProviderModelDefinition[] = [
  {
    id: "claude-3-5-sonnet-latest",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    providerName: "Anthropic Claude",
    badge: "Flagship",
    speed: "smart",
    description: "Most intelligent flagship model",
    default: true,
  },
  {
    id: "claude-3-5-haiku-latest",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    providerName: "Anthropic Claude",
    badge: "Lightning Fast",
    speed: "fast",
    description: "Lightning fast, lightweight model",
  },
  {
    id: "claude-3-opus-latest",
    name: "Claude 3 Opus",
    provider: "anthropic",
    providerName: "Anthropic Claude",
    badge: "Deep Analysis",
    speed: "smart",
    description: "Deep reasoning and analysis",
  },
];

// ── Unified Catalog ───────────────────────────────────────────
export const ALL_MODELS: ProviderModelDefinition[] = [
  ...GEMINI_MODELS,
  ...OPENAI_MODELS,
  ...ANTHROPIC_MODELS,
];
