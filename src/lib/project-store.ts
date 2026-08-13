import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects as projectsTable } from "@/db/schema";
import { isDbAvailable } from "@/lib/env";

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

// In-memory cache — write-through in front of DB, sole store when DB absent
const memProjects = new Map<string, Project[]>();

// ---------------------------------------------------------------------------
// DB ↔ type converters
// ---------------------------------------------------------------------------

function rowToProject(row: typeof projectsTable.$inferSelect): Project {
  const meta = row.metadata ?? {};
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description ?? "",
    topic: row.topic ?? "",
    difficulty: (row.difficulty as Project["difficulty"]) ?? "intermediate",
    requirements: meta.requirements ?? [],
    stretchGoals: meta.stretchGoals ?? [],
    commonMistakes: meta.commonMistakes ?? [],
    mentorId: row.mentorId ?? "backend",
    status: (row.status as ProjectStatus) ?? "not-started",
    repoUrl: row.repoUrl ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? row.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

import { ensureDbUser } from "@/lib/users";

export async function getProjects(userId: string): Promise<Project[]> {
  // Memory cache hit
  const cached = memProjects.get(userId);
  if (cached) return cached;

  if (!isDbAvailable()) return [];

  try {
    const dbUserId = await ensureDbUser({ id: userId, email: userId });
    const db = getDb();
    const rows = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.userId, dbUserId))
      .orderBy(projectsTable.createdAt);

    const list = rows.map(rowToProject);
    memProjects.set(userId, list);
    if (dbUserId !== userId) memProjects.set(dbUserId, list);
    return list;
  } catch (err) {
    console.error("[project-store] getProjects failed:", err);
    return memProjects.get(userId) ?? [];
  }
}

export async function saveProjects(userId: string, projectsList: Project[]): Promise<Project[]> {
  // Always update cache
  memProjects.set(userId, projectsList);

  if (!isDbAvailable()) return projectsList;

  try {
    const dbUserId = await ensureDbUser({ id: userId, email: userId });
    const db = getDb();
    // Upsert all projects. For simplicity, delete+reinsert per user (list is small).
    // In production with large lists, switch to individual upserts.
    await db.delete(projectsTable).where(eq(projectsTable.userId, dbUserId));

    if (projectsList.length > 0) {
      await db.insert(projectsTable).values(
        projectsList.map((p) => ({
          id: p.id,
          userId: dbUserId,
          title: p.title,
          description: p.description,
          topic: p.topic,
          difficulty: p.difficulty,
          mentorId: p.mentorId,
          status: p.status,
          repoUrl: p.repoUrl ?? null,
          metadata: {
            requirements: p.requirements,
            stretchGoals: p.stretchGoals,
            commonMistakes: p.commonMistakes,
          },
        }))
      );
    }
  } catch (err) {
    console.error("[project-store] saveProjects failed (in-memory still updated):", err);
  }

  return projectsList;
}

export async function updateProject(
  userId: string,
  projectId: string,
  updates: { status?: ProjectStatus; repoUrl?: string }
): Promise<Project | null> {
  // Update in-memory
  const list = memProjects.get(userId) ?? (isDbAvailable() ? await getProjects(userId) : []);
  const proj = list.find((p) => p.id === projectId);
  if (!proj) return null;

  if (updates.status) proj.status = updates.status;
  if (updates.repoUrl !== undefined) proj.repoUrl = updates.repoUrl;
  proj.updatedAt = new Date();
  memProjects.set(userId, list);

  // Persist to DB
  if (isDbAvailable()) {
    try {
      const db = getDb();
      await db
        .update(projectsTable)
        .set({
          status: proj.status,
          repoUrl: proj.repoUrl ?? null,
          updatedAt: proj.updatedAt,
        })
        .where(eq(projectsTable.id, projectId));
    } catch (err) {
      console.error("[project-store] updateProject failed:", err);
    }
  }

  return proj;
}
