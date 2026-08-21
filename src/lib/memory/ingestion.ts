/**
 * Deep Context Ingestion Engine
 *
 * Synthesizes complete user learning state:
 * Profile + Roadmap Progress + Active Projects + Mem0 Long-Term Memories
 * into a single unified context block for LLM prompt ingestion.
 *
 * Optimizations:
 * - 15-minute session caching via Redis / Memory (`user-ctx:${userId}`)
 * - Immediate invalidation upon memory write/update (`invalidateUserContextCache`)
 * - Context-aware adaptive retrieval on explicit memory/resume recall queries
 */

import { getLearningProfile } from "@/lib/learning-profile";
import { getRoadmap } from "@/lib/roadmap-store";
import { getProjects } from "@/lib/project-store";
import { getMemories, formatMemoriesForPrompt } from "./mem0";
import { cacheGet, cacheSet, cacheDel } from "@/lib/cache";

export type DeepUserContext = {
  profileSummary: string;
  progressSummary: string;
  projectsSummary: string;
  memoriesSummary: string;
  fullPromptContext: string;
};

const USER_CONTEXT_CACHE_TTL = 15 * 60; // 15 minutes (900 seconds)

function getContextCacheKey(userId: string): string {
  return `user-ctx:${userId}`;
}

/**
 * Invalidates the cached DeepUserContext for a user immediately when a new memory is created, updated, or deleted.
 */
export async function invalidateUserContextCache(userId: string): Promise<void> {
  if (!userId) return;
  try {
    await cacheDel(getContextCacheKey(userId));
  } catch (err) {
    console.error("[ingestion] Failed to invalidate context cache:", err);
  }
}

/**
 * Checks if the user query explicitly demands fresh long-term semantic retrieval.
 */
function hasExplicitMemoryRecallIntent(query?: string): boolean {
  if (!query || query.trim().length < 4) return false;
  const q = query.toLowerCase();
  return (
    q.includes("remember") ||
    q.includes("my resume") ||
    q.includes("my background") ||
    q.includes("we discussed") ||
    q.includes("earlier") ||
    q.includes("past project") ||
    q.includes("my goals") ||
    q.includes("my weak") ||
    q.includes("what did i")
  );
}

export async function getDeepUserContext(userId: string, query?: string): Promise<DeepUserContext> {
  const cacheKey = getContextCacheKey(userId);
  const needsFreshRecall = hasExplicitMemoryRecallIntent(query);

  // 1. Check 15-minute cache first if not explicitly querying past memory recall
  if (!needsFreshRecall) {
    try {
      const cached = await cacheGet<DeepUserContext>(cacheKey);
      if (cached && cached.fullPromptContext) {
        return cached;
      }
    } catch {
      // Non-blocking fallback to fresh build
    }
  }

  // 2. Freshly assemble profile, roadmap, projects, and memory items in parallel
  const [profile, roadmap, projects, memories] = await Promise.all([
    getLearningProfile(userId).catch(() => null),
    getRoadmap(userId).catch(() => null),
    getProjects(userId).catch(() => []),
    getMemories(userId, query).catch(() => []),
  ]);

  const profileSummary = profile
    ? `Goal: ${profile.goal} | Level: ${profile.currentLevel} | Known Skills: ${profile.knownSkills.join(", ")} | Weekly Commitment: ${profile.weeklyHours}h/week | Style: ${profile.learningStyle}`
    : "No explicit learning profile set yet.";

  const completedNodes = roadmap?.nodes.filter((n) => n.status === "completed").map((n) => n.title) ?? [];
  const currentNode = roadmap?.nodes.find((n) => n.status === "current")?.title;
  const progressSummary = roadmap
    ? `Completed Topics (${completedNodes.length}): ${completedNodes.length ? completedNodes.join(", ") : "None yet"}${currentNode ? ` | Current Focus: ${currentNode}` : ""}`
    : "No active roadmap progress recorded yet.";

  const activeProjectsList = projects.filter((p) => p.status === "in-progress" || p.status === "completed").map((p) => `${p.title} (${p.status})`);
  const projectsSummary = activeProjectsList.length
    ? `Active & Completed Projects: ${activeProjectsList.join(" • ")}`
    : "No active project builds recorded.";

  const memoriesSummary = formatMemoriesForPrompt(memories);

  const fullPromptContext = `<user_deep_context>
Deep User Learning Profile & Context:
• ${profileSummary}
• ${progressSummary}
• ${projectsSummary}

${memoriesSummary}
</user_deep_context>`;

  const result: DeepUserContext = {
    profileSummary,
    progressSummary,
    projectsSummary,
    memoriesSummary,
    fullPromptContext,
  };

  // 3. Cache the synthesized context for subsequent turns (15 min TTL)
  try {
    await cacheSet(cacheKey, result, USER_CONTEXT_CACHE_TTL);
  } catch {
    // Non-fatal
  }

  return result;
}
