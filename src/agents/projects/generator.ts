import { randomUUID } from "crypto";
import type { Project, ProjectStatus } from "@/lib/project-store";
import type { RoadmapNode } from "@/lib/roadmap-store";

/**
 * Generates and synchronizes practical project deliverables directly from roadmap milestones.
 * Preserves user repository links and custom statuses if projects already exist.
 */
export function generateProjectsFromRoadmap(
  userId: string,
  nodes: RoadmapNode[],
  existingProjects: Project[] = []
): Project[] {
  const existingMap = new Map<string, Project>();
  for (const ep of existingProjects) {
    if (ep.roadmapNodeId) existingMap.set(ep.roadmapNodeId, ep);
    if (ep.topic) existingMap.set(ep.topic.toLowerCase(), ep);
  }

  return nodes.map((node) => {
    const existing = existingMap.get(node.id) || existingMap.get(node.title.toLowerCase());

    // Derive status from roadmap node if not customized by user
    let status: ProjectStatus = "not-started";
    if (existing?.status) {
      status = existing.status;
    } else if (node.status === "completed") {
      status = "completed";
    } else if (node.status === "current") {
      status = "in-progress";
    }

    const defaultTitle = node.projectBrief
      ? node.projectBrief
      : `Build ${node.title} Deliverable`;

    return {
      id: existing?.id || randomUUID(),
      userId,
      roadmapNodeId: node.id,
      week: node.week ?? 1,
      title: existing?.title || defaultTitle,
      description: `Production deliverable for "${node.title}". ${node.whyItMatters || node.description}`,
      topic: node.title,
      difficulty: node.difficulty,
      requirements: [
        `Implement core ${node.title} functionality`,
        node.practicalTask || "Write clean, modular code adhering to industry conventions",
        "Add input schema validation and centralized error handling",
        "Include unit or integration test assertions",
      ],
      stretchGoals: [
        "Add structured observability, metrics, or request logging",
        "Containerize application with a multi-stage Docker build",
        "Write CI workflow (GitHub Actions) for automated testing",
      ],
      commonMistakes: node.commonMistakes && node.commonMistakes.length > 0
        ? node.commonMistakes
        : ["Skipping error edge-cases", "No validation", "Hardcoding configuration"],
      mentorId: node.mentorId || "backend",
      status,
      repoUrl: existing?.repoUrl,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
    };
  });
}
