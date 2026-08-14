import type { MentorConfig, MentorId } from "@/config/mentors";

/**
 * Generic Mentor abstraction
 *
 * Adding a new mentor should be configuration, not rewriting chat infrastructure.
 * Each mentor is a config + prompt + model + tool allowlist. The orchestrator
 * and API route use this registry to route without touching chat code.
 */
export type Mentor = {
  id: MentorId;
  config: MentorConfig;
  prompt: string;
  model: string; // e.g., "gpt-4o-mini" — cheaper for chat, stronger for synthesis later
};

export type MentorRegistry = Record<MentorId, Mentor>;
