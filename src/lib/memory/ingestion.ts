/**
 * Deep Context Ingestion Engine — Phase 10
 *
 * Synthesizes complete user learning state:
 * Profile + Roadmap Progress + Active Projects + Mem0 Long-Term Memories
 * into a single unified context block for LLM prompt ingestion.
 */

import { getLearningProfile } from "@/lib/learning-profile";
import { getRoadmap } from "@/lib/roadmap-store";
import { getProjects } from "@/lib/project-store";
import { getMemories, formatMemoriesForPrompt } from "./mem0";

export type DeepUserContext = {
  profileSummary: string;
  progressSummary: string;
  projectsSummary: string;
  memoriesSummary: string;
  fullPromptContext: string;
};

export async function getDeepUserContext(userId: string, query?: string): Promise<DeepUserContext> {
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

  return {
    profileSummary,
    progressSummary,
    projectsSummary,
    memoriesSummary,
    fullPromptContext,
  };
}
