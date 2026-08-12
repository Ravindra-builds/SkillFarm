import { mentors } from "@/config/mentors";
import type { Mentor, MentorRegistry } from "./types";
import { backendMentorPrompt, backendMentorMeta } from "./backend/prompt";
import { aiMentorPrompt, aiMentorMeta } from "./ai/prompt";
import { frontendMentorPrompt, frontendMentorMeta } from "./frontend/prompt";
import { devopsMentorPrompt, devopsMentorMeta } from "./devops/prompt";
import { securityMentorPrompt, securityMentorMeta } from "./security/prompt";
import { systemDesignMentorPrompt, systemDesignMentorMeta } from "./system-design/prompt";
import type { MentorId } from "@/config/mentors";

export type { MentorId };

/**
 * Central Mentor Registry — Phase 4
 *
 * Single source of truth for agent wiring. Adding a new mentor is:
 * 1. Add entry to src/config/mentors.ts (UI + expertise + tools)
 * 2. Create src/agents/mentors/<id>/prompt.ts (system prompt)
 * 3. Add it here (prompt + model)
 * No chat/API code needs to change.
 */

const prompts: Record<MentorId, string> = {
  backend: backendMentorPrompt,
  "ai-engineer": aiMentorPrompt,
  frontend: frontendMentorPrompt,
  devops: devopsMentorPrompt,
  security: securityMentorPrompt,
  "system-design": systemDesignMentorPrompt,
};

const models: Record<MentorId, string> = {
  backend: backendMentorMeta.model,
  "ai-engineer": aiMentorMeta.model,
  frontend: frontendMentorMeta.model,
  devops: devopsMentorMeta.model,
  security: securityMentorMeta.model,
  "system-design": systemDesignMentorMeta.model,
};

export const mentorRegistry: MentorRegistry = Object.fromEntries(
  (Object.keys(mentors) as MentorId[]).map((id) => [
    id,
    {
      id,
      config: mentors[id],
      prompt: prompts[id],
      model: models[id],
    } as Mentor,
  ])
) as MentorRegistry;

export function getMentor(id: string): Mentor | null {
  const m = mentorRegistry[id as MentorId];
  return m ?? null;
}

export function isValidMentorId(id: string): id is MentorId {
  return id in mentorRegistry;
}

export function listMentors(): Mentor[] {
  return Object.values(mentorRegistry);
}

export const DEFAULT_MENTOR_ID: MentorId = "backend";
