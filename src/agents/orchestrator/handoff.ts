import type { MentorId } from "@/config/mentors";
import { mentors } from "@/config/mentors";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

/**
 * Handoff detection — Phase 6
 *
 * Two modes:
 * 1. Explicit mentor-initiated: Mentor outputs [[HANDOFF:security:reason]] — we parse it.
 * 2. Orchestrator-initiated: Based on query + current active mentor + history, decide if handoff is needed.
 *
 * For MVP we implement both, with keyword fallback when no OPENAI_API_KEY.
 */

export type HandoffDecision = {
  shouldHandoff: boolean;
  fromMentorId: MentorId | null;
  toMentorId: MentorId | null;
  reason: string;
  confidence: number;
};

const handoffSchema = z.object({
  shouldHandoff: z.boolean(),
  toMentorId: z.enum(["ai-engineer", "backend", "frontend", "devops", "security", "system-design"]).nullable(),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
});

function isPlaceholder(v?: string | null) {
  if (!v) return true;
  const s = v.trim().toLowerCase();
  return s.includes("sk-...") || s.includes("replace-with") || s.length < 20 || !s.startsWith("sk-");
}

// Parse explicit handoff token from mentor response: [[HANDOFF:security:reason text]]
export function parseExplicitHandoff(text: string): { toMentorId: MentorId; reason: string } | null {
  const match = text.match(/\[\[HANDOFF:([a-z-]+):([^\]]+)\]\]/i);
  if (!match) return null;
  const toId = match[1].toLowerCase() as MentorId;
  if (!(toId in mentors)) return null;
  return { toMentorId: toId, reason: match[2].trim() };
}

// Keyword fallback for orchestrator handoff
export function keywordHandoff(
  query: string,
  currentMentorId: MentorId | null
): HandoffDecision {
  const q = query.toLowerCase();
  const scores: Record<MentorId, number> = {
    "ai-engineer": 0,
    backend: 0,
    frontend: 0,
    devops: 0,
    security: 0,
    "system-design": 0,
  };

  // Score each mentor based on triggers
  for (const [id, cfg] of Object.entries(mentors) as Array<[MentorId, (typeof mentors)[MentorId]]>) {
    const triggers = [...cfg.handoffTriggers.map((t) => t.toLowerCase()), ...cfg.expertise.map((e) => e.toLowerCase())];
    for (const trig of triggers) {
      if (q.includes(trig)) scores[id] += 1;
    }
  }

  // Find best match
  const sorted = (Object.entries(scores) as Array<[MentorId, number]>)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0 || !currentMentorId) {
    return { shouldHandoff: false, fromMentorId: currentMentorId, toMentorId: null, reason: "No clear handoff signal", confidence: 0 };
  }

  const best = sorted[0];
  // If current mentor is not the best, and best scores at least 1 more than current, handoff
  const currentScore = scores[currentMentorId] ?? 0;
  const bestScore = best ? best[1] : 0;
  const bestId = best ? best[0] : null;

  // Phase 6: Explicit handoff rules — make demo deterministic
  // If the query contains strong signals for another mentor, handoff even if current also scores
  const hasSecuritySignal = q.includes("secure") || q.includes("jwt") || q.includes("owasp") || q.includes("xss") || q.includes("csrf") || q.includes("vulnerability") || q.includes("rate limit") || q.includes("httponly") || q.includes("secrets") || q.includes("sqli") || q.includes("sql injection");
  const hasInfraSignal = q.includes("docker") || q.includes("deploy") || q.includes("ci/cd") || q.includes("kubernetes") || q.includes("infra") || q.includes("monitoring");
  const hasFrontendSignal = q.includes("react") || q.includes("tailwind") || q.includes("component") || q.includes("a11y") || q.includes("accessibility");
  const hasAiSignal = q.includes("rag") || q.includes("llm") || q.includes("embedding") || q.includes("agent") || q.includes("vector");
  const hasSystemDesignSignal = q.includes("architecture") || q.includes("system design") || q.includes("scale") || q.includes("production ready");

  let shouldHandoff = false;
  let toMentorId: MentorId | null = null;
  let reason = "";

  // Deterministic handoffs for common demo flows — prioritize security for auth+secure
  if (currentMentorId === "backend" && hasSecuritySignal) {
    shouldHandoff = true;
    toMentorId = "security";
    reason = "Auth design needs security expertise — OWASP, httpOnly, rate limiting";
  } else if (currentMentorId === "backend" && hasInfraSignal) {
    shouldHandoff = true;
    toMentorId = "devops";
    reason = "Deployment/infra needs DevOps expertise";
  } else if (currentMentorId === "frontend" && q.includes("api") && !hasFrontendSignal) {
    shouldHandoff = true;
    toMentorId = "backend";
    reason = "API design is backend expertise";
  } else if (currentMentorId === "backend" && hasAiSignal) {
    shouldHandoff = true;
    toMentorId = "ai-engineer";
    reason = "AI/RAG needs AI Engineer expertise";
  } else if (currentMentorId && hasSystemDesignSignal && currentMentorId !== "system-design") {
    shouldHandoff = true;
    toMentorId = "system-design";
    reason = "Architecture review needs System Design expertise";
  } else if (bestId && bestId !== currentMentorId && bestScore > currentScore) {
    if (bestScore - currentScore >= 1 || currentScore === 0) {
      shouldHandoff = true;
      toMentorId = bestId;
      reason = `Query better matches ${mentors[bestId].name} expertise (${bestId})`;
    }
  }

  return {
    shouldHandoff,
    fromMentorId: currentMentorId,
    toMentorId,
    reason: reason || (shouldHandoff ? `Handoff to ${toMentorId}` : "Stay with current mentor"),
    confidence: shouldHandoff ? 0.7 : 0.3,
  };
}

export async function detectHandoff(
  query: string,
  currentMentorId: MentorId | null,
  history?: { role: string; content: string }[]
): Promise<HandoffDecision> {
  const hasKey = process.env.OPENAI_API_KEY && !isPlaceholder(process.env.OPENAI_API_KEY);
  if (!hasKey) {
    return keywordHandoff(query, currentMentorId);
  }

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      system: `You are the handoff detector for SkillFarm. Given the current active mentor (${currentMentorId ?? "none"}) and the user's latest message, decide if a handoff to another specialist is needed. Be conservative — only handoff when the query clearly needs different expertise. Available mentors: ai-engineer, backend, frontend, devops, security, system-design.`,
      prompt: `Current mentor: ${currentMentorId ?? "none"}\nUser query: "${query}"\nHistory: ${(history ?? []).slice(-3).map((h) => `${h.role}: ${h.content.slice(0, 80)}`).join(" | ")}\n\nDecide handoff.`,
      schema: handoffSchema,
      temperature: 0.2,
    });

    const toId = object.toMentorId as MentorId | null;
    const should = object.shouldHandoff && toId !== null && toId !== currentMentorId;

    return {
      shouldHandoff: should,
      fromMentorId: currentMentorId,
      toMentorId: should ? toId : null,
      reason: object.reason,
      confidence: object.confidence,
    };
  } catch (err) {
    console.error("[handoff] LLM detect failed, fallback to keyword:", err);
    return keywordHandoff(query, currentMentorId);
  }
}
