import { randomUUID } from "crypto";

export type ProjectStatus = "not-started" | "in-progress" | "completed";

export type Project = {
  id: string;
  userId: string;
  title: string;
  description: string;
  topic: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  requirements: string[];
  stretchGoals: string[];
  commonMistakes: string[];
  mentorId: string;
  status: ProjectStatus;
  repoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
};

// In-memory store for fallback preview without DB
const memProjects = new Map<string, Project[]>(); // userId -> projects[]

import { isMockModeForced } from "@/lib/env";

function isDbAvailable(): boolean {
  if (isMockModeForced()) return false;
  const v = process.env.DATABASE_URL;
  if (!v) return false;
  const s = v.trim().toLowerCase();
  if (s.includes("ep-xxx") || s.length < 20) return false;
  return s.startsWith("postgresql");
}

export async function getProjects(userId: string): Promise<Project[]> {
  return memProjects.get(userId) ?? [];
}

export async function saveProjects(userId: string, projectsList: Project[]): Promise<Project[]> {
  memProjects.set(userId, projectsList);
  return projectsList;
}

export async function updateProject(
  userId: string,
  projectId: string,
  updates: { status?: ProjectStatus; repoUrl?: string }
): Promise<Project | null> {
  const list = memProjects.get(userId) ?? [];
  const proj = list.find((p) => p.id === projectId);
  if (!proj) return null;

  if (updates.status) proj.status = updates.status;
  if (updates.repoUrl !== undefined) proj.repoUrl = updates.repoUrl;
  proj.updatedAt = new Date();

  memProjects.set(userId, list);
  return proj;
}
