import { randomUUID } from "crypto";

export type RoadmapNode = {
  id: string;
  slug: string;
  title: string;
  description: string;
  whyItMatters: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  prerequisites: string[];
  relatedConcepts: string[];
  mentorId: string;
  order: number;
  status: "locked" | "current" | "completed" | "next";
  practicalTask: string;
  projectBrief: string;
  commonMistakes: string[];
};

export type Roadmap = {
  id: string;
  userId: string;
  title: string;
  description: string;
  nodes: RoadmapNode[];
  createdAt: Date;
  updatedAt: Date;
};

// In-memory fallback (preview without DB)
const memRoadmaps = new Map<string, Roadmap>(); // userId -> roadmap

import { isMockModeForced } from "@/lib/env";

function isDbAvailable(): boolean {
  if (isMockModeForced()) return false;
  const v = process.env.DATABASE_URL;
  if (!v) return false;
  const s = v.trim().toLowerCase();
  if (s.includes("ep-xxx") || s.length < 20) return false;
  return s.startsWith("postgresql");
}

export async function getRoadmap(userId: string): Promise<Roadmap | null> {
  if (!isDbAvailable()) return memRoadmaps.get(userId) ?? null;
  // For MVP we keep DB path as memory fallback too (migrations not required for demo)
  return memRoadmaps.get(userId) ?? null;
}

export async function saveRoadmap(userId: string, roadmap: Roadmap): Promise<Roadmap> {
  memRoadmaps.set(userId, roadmap);
  // If DB available, we could also persist to roadmaps/roadmap_nodes, but memory is enough for MVP demo
  return roadmap;
}

export async function updateNodeStatus(userId: string, nodeId: string, status: RoadmapNode["status"]): Promise<Roadmap | null> {
  const roadmap = memRoadmaps.get(userId);
  if (!roadmap) return null;
  const node = roadmap.nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  node.status = status;
  // Auto-unlock next
  if (status === "completed") {
    const idx = roadmap.nodes.findIndex((n) => n.id === nodeId);
    const next = roadmap.nodes[idx + 1];
    if (next && next.status === "locked") next.status = "next";
    if (next && next.status === "next") next.status = "current";
  }
  roadmap.updatedAt = new Date();
  memRoadmaps.set(userId, roadmap);
  return roadmap;
}
