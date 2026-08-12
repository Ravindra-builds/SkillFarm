import type { MentorId } from "@/config/mentors";

export type Intent = {
  raw: string;
  domain: string; // e.g., "backend", "security+backend", "ai"
  goal?: string;
};

export type RouteDecision = {
  intent: string;
  domain: string;
  requiredMentors: MentorId[];
  reasoning: string;
  confidence: number; // 0-1
  requiresResearch: boolean;
  isMultiMentor: boolean;
};

export type OrchestratorResult = {
  decision: RouteDecision;
  // When single mentor, we stream that mentor directly
  // When multi, we synthesize
  mode: "single" | "multi";
};
