import { generateObject } from "ai";
import { z } from "zod";
import type { MentorId } from "@/config/mentors";
import { mentors } from "@/config/mentors";
import type { RouteDecision } from "./types";
import { routerSystemPrompt } from "./prompt";
import { getLlmModel, isLlmConfigured } from "@/lib/llm";

/**
 * Router
 * Fast model for classification, structured output.
 * Falls back to deterministic keyword router when no LLM key is configured.
 */

const routeSchema = z.object({
  intent: z.string().describe("One-sentence user intent"),
  domain: z.string().describe("Primary domain, e.g., backend, frontend, ai, security, devops, system-design, or multi"),
  requiredMentors: z.array(z.enum(["ai-engineer", "backend", "frontend", "devops", "security", "system-design"])).min(1).max(3),
  reasoning: z.string().describe("Why these mentors"),
  confidence: z.number().min(0).max(1),
  requiresResearch: z.boolean(),
});

// Deterministic fallback — keyword matching (no LLM needed)
export function keywordRoute(query: string): RouteDecision {
  const q = query.toLowerCase();
  const scores: Record<MentorId, number> = {
    "ai-engineer": 0,
    backend: 0,
    frontend: 0,
    devops: 0,
    security: 0,
    "system-design": 0,
  };

  const triggers: Record<MentorId, string[]> = {
    "ai-engineer": ["llm", "rag", "agent", "vector", "embedding", "prompt", "openai", "gemini", "anthropic", "streaming ai", "ai "],
    backend: ["api", "database", "postgres", "prisma", "drizzle", "jwt", "express", "fastify", "node", "rest", "http", "crud", "auth ", "websocket"],
    frontend: ["react", "nextjs", "next.js", "tailwind", "frontend", "css", "ui", "component", "accessibility", "a11y", "performance", "shadcn"],
    devops: ["docker", "kubernetes", "ci/cd", "aws", "deploy", "infra", "vercel", "cloud", "monitoring", "ci ", "pipeline"],
    security: ["security", "owasp", "xss", "csrf", "sql injection", "sqli", "ssrf", "idor", "vulnerability", "rate limit", "secrets", "authz"],
    "system-design": ["architecture", "system design", "scalability", "microservice", "trade-off", "production ready", "scale", "10k", "concurrent"],
  };

  // Also check config handoffTriggers
  for (const [id, cfg] of Object.entries(mentors) as Array<[MentorId, (typeof mentors)[MentorId]]>) {
    const allTriggers = [...triggers[id], ...cfg.handoffTriggers.map((t) => t.toLowerCase()), ...cfg.expertise.map((e) => e.toLowerCase())];
    for (const trig of allTriggers) {
      if (q.includes(trig.toLowerCase())) scores[id] += 1;
    }
  }

  // Slight boost for backend on generic coding questions
  if (q.includes("how do i") || q.includes("build") || q.includes("create")) {
    scores["backend"] += 0.5;
  }

  const sorted = (Object.entries(scores) as Array<[MentorId, number]>)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  let requiredMentors: MentorId[] = [];
  if (sorted.length === 0) {
    if (q.includes("architecture") || q.includes("scale") || q.includes("design")) requiredMentors = ["system-design"];
    else requiredMentors = ["backend"];
  } else if (sorted.length === 1) {
    requiredMentors = [sorted[0]];
  } else {
    const hasAnd = q.includes(" and ") || q.includes(" + ") || q.includes(" with ") || q.includes(",");
    const topScore = scores[sorted[0]];
    const secondScore = scores[sorted[1]];
    if (hasAnd || topScore - secondScore <= 1) {
      requiredMentors = sorted.slice(0, Math.min(3, sorted.length));
    } else {
      requiredMentors = [sorted[0]];
    }
  }

  // Cross-domain heuristics
  if (q.includes("auth") || q.includes("jwt") || q.includes("login") || q.includes("password")) {
    if (!requiredMentors.includes("security") && (q.includes("secure") || q.includes("vuln") || q.includes("protect"))) {
      if (requiredMentors.length < 3) requiredMentors.push("security");
    }
  }
  if (q.includes("chat") && q.includes("ai") && !requiredMentors.includes("ai-engineer")) {
    if (requiredMentors.length < 3) requiredMentors.push("ai-engineer");
  }

  const requiresResearch = q.includes("resource") || q.includes("tutorial") || q.includes("best") || q.includes("latest") || q.includes("docs");

  return {
    intent: query.slice(0, 120),
    domain: requiredMentors.length > 1 ? "multi" : requiredMentors[0],
    requiredMentors,
    reasoning: `Keyword match: ${requiredMentors.join(" + ")}`,
    confidence: 0.5,
    requiresResearch,
    isMultiMentor: requiredMentors.length > 1,
  };
}

export async function routeQuery(
  query: string,
  context?: string,
  options?: { provider?: string; model?: string }
): Promise<RouteDecision> {
  const hasConfiguredLlm = isLlmConfigured(options?.provider);
  if (!hasConfiguredLlm) {
    return keywordRoute(query);
  }

  try {
    const { object } = await generateObject({
      model: getLlmModel({ provider: options?.provider, model: options?.model, role: "router" }),
      system: routerSystemPrompt,
      prompt: `User query: "${query}"\n\nContext: ${context ?? "No extra context"}\n\nDecide mentors.`,
      schema: routeSchema,
      temperature: 0.2,
    });

    const decision = object as RouteDecision;
    return {
      ...decision,
      isMultiMentor: decision.requiredMentors.length > 1,
      requiresResearch: decision.requiresResearch ?? false,
    };
  } catch (err) {
    console.error("[orchestrator/router] LLM route failed, falling back to keyword:", err);
    return keywordRoute(query);
  }
}
