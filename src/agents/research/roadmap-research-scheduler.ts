/**
 * Roadmap Research Scheduler
 *
 * Implements a rolling 2-week lookahead research window:
 * - Prepares resources for Current Week + Next Week in the background.
 * - Does NOT block roadmap generation or user responses.
 * - Automatically advances when the learner progresses to subsequent weeks.
 */

import type { Roadmap, RoadmapNode } from "@/lib/roadmap-store";
import { getTopicResourcePack } from "./topic-research";

/**
 * Discovers and warms resource packs for the current and next upcoming week.
 * Non-blocking / fire-and-forget.
 */
export async function scheduleRoadmapResearch(
  roadmap: Roadmap,
  userLevel = "intermediate"
): Promise<{ scheduledTopics: string[] }> {
  if (!roadmap || !roadmap.nodes || roadmap.nodes.length === 0) {
    return { scheduledTopics: [] };
  }

  // 1. Identify current active week
  const currentNode = roadmap.nodes.find((n) => n.status === "current") ?? roadmap.nodes[0];
  const currentWeek = currentNode.week ?? 1;
  const targetWeeks = [currentWeek, currentWeek + 1];

  // 2. Extract distinct topics for these target weeks
  const targetNodes: RoadmapNode[] = [];
  for (const w of targetWeeks) {
    const nodeForWeek = roadmap.nodes.find((n) => (n.week ?? 1) === w);
    if (nodeForWeek) {
      targetNodes.push(nodeForWeek);
    }
  }

  const scheduledTopics: string[] = [];

  // 3. Process asynchronously in the background
  for (const node of targetNodes) {
    const topic = node.topic || node.theme || node.title;
    if (!topic) continue;

    scheduledTopics.push(topic);
    const concepts = node.concepts && node.concepts.length > 0 ? node.concepts : node.relatedConcepts ?? [];

    // Fire-and-forget resource discovery
    getTopicResourcePack({
      topic,
      concepts,
      level: node.difficulty || userLevel,
      useCache: true,
    }).catch((err) => {
      console.error(`[roadmap-research-scheduler] Background research failed for "${topic}":`, err);
    });
  }

  return { scheduledTopics };
}
