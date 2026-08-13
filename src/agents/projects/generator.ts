import { randomUUID } from "crypto";
import type { Project, ProjectStatus } from "@/lib/project-store";
import type { RoadmapNode } from "@/lib/roadmap-store";

export function generateProjectsFromRoadmap(userId: string, nodes: RoadmapNode[]): Project[] {
  return nodes.map((node) => {
    const status: ProjectStatus = node.status === "current" ? "in-progress" : "not-started";

    return {
      id: randomUUID(),
      userId,
      title: node.projectBrief || `Build ${node.title} Deliverable`,
      description: `Hands-on practical project for ${node.title}. ${node.whyItMatters}`,
      topic: node.title,
      difficulty: node.difficulty,
      requirements: [
        `Implement core ${node.title} functionality`,
        node.practicalTask,
        "Add input validation and error handling",
        "Include unit or integration test coverage",
      ],
      stretchGoals: [
        "Add performance metrics / logging middleware",
        "Containerize with multi-stage Docker build",
        "Configure automated CI test workflow",
      ],
      commonMistakes: node.commonMistakes || ["Skipping error handling", "No validation"],
      mentorId: node.mentorId || "backend",
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
}
