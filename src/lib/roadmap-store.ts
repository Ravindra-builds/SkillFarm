import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { roadmaps, roadmapNodes } from "@/db/schema";
import { isDbAvailable } from "@/lib/env";

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

// In-memory cache — used as a fast read-layer in front of DB, and as the
// sole store when DB is not configured (preview/local dev without DATABASE_URL).
const memRoadmaps = new Map<string, Roadmap>();

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

import { ensureDbUser } from "@/lib/users";

async function loadFromDb(userId: string): Promise<Roadmap | null> {
  try {
    const dbUserId = await ensureDbUser({ id: userId, email: userId });
    const db = getDb();
    const rows = await db
      .select()
      .from(roadmaps)
      .where(eq(roadmaps.userId, dbUserId))
      .limit(1);
    let row = rows[0];
    if (!row && dbUserId !== userId) {
      const fallbackRows = await db
        .select()
        .from(roadmaps)
        .where(eq(roadmaps.userId, userId))
        .limit(1);
      row = fallbackRows[0];
    }
    if (!row) return null;

    const nodeRows = await db
      .select()
      .from(roadmapNodes)
      .where(eq(roadmapNodes.roadmapId, row.id))
      .orderBy(roadmapNodes.order);

    const nodes: RoadmapNode[] = nodeRows.map((n) => ({
      id: n.id,
      slug: n.slug,
      title: n.title,
      description: n.description ?? "",
      whyItMatters: n.whyItMatters ?? "",
      difficulty: (n.difficulty as RoadmapNode["difficulty"]) ?? "intermediate",
      prerequisites: (n.prerequisites as string[]) ?? [],
      relatedConcepts: (n.relatedConcepts as string[]) ?? [],
      mentorId: n.mentorId ?? "backend",
      order: n.order,
      status: (n.status as RoadmapNode["status"]) ?? "locked",
      practicalTask: n.practicalTask ?? "",
      projectBrief: n.projectBrief ?? "",
      commonMistakes: (n.commonMistakes as string[]) ?? [],
    }));

    const roadmap: Roadmap = {
      id: row.id,
      userId: row.userId,
      title: row.title,
      description: row.description ?? "",
      nodes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    // Warm the in-memory cache
    memRoadmaps.set(userId, roadmap);
    if (dbUserId !== userId) memRoadmaps.set(dbUserId, roadmap);
    return roadmap;
  } catch (err) {
    console.error("[roadmap-store] DB load failed:", err);
    return null;
  }
}

async function persistToDb(userId: string, roadmap: Roadmap): Promise<void> {
  try {
    const dbUserId = await ensureDbUser({ id: userId, email: userId });
    const db = getDb();

    // Upsert the roadmap row
    const existingRows = await db
      .select({ id: roadmaps.id })
      .from(roadmaps)
      .where(eq(roadmaps.userId, dbUserId))
      .limit(1);

    let roadmapId: string;

    if (existingRows.length === 0) {
      const [inserted] = await db
        .insert(roadmaps)
        .values({
          id: roadmap.id,
          userId: dbUserId,
          title: roadmap.title,
          description: roadmap.description,
          status: "active",
        })
        .returning({ id: roadmaps.id });
      roadmapId = inserted.id;
    } else {
      roadmapId = existingRows[0].id;
      await db
        .update(roadmaps)
        .set({ title: roadmap.title, description: roadmap.description, updatedAt: new Date() })
        .where(eq(roadmaps.id, roadmapId));
    }

    // Delete old nodes and re-insert (simpler than diffing for now)
    await db.delete(roadmapNodes).where(eq(roadmapNodes.roadmapId, roadmapId));

    if (roadmap.nodes.length > 0) {
      await db.insert(roadmapNodes).values(
        roadmap.nodes.map((n) => ({
          id: n.id,
          roadmapId,
          slug: n.slug,
          title: n.title,
          description: n.description,
          whyItMatters: n.whyItMatters,
          difficulty: n.difficulty,
          prerequisites: n.prerequisites,
          relatedConcepts: n.relatedConcepts,
          mentorId: n.mentorId,
          order: n.order,
          status: n.status,
          practicalTask: n.practicalTask,
          projectBrief: n.projectBrief,
          commonMistakes: n.commonMistakes,
        }))
      );
    }
  } catch (err) {
    console.error("[roadmap-store] DB persist failed (in-memory still updated):", err);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getRoadmap(userId: string): Promise<Roadmap | null> {
  // Check memory cache first
  const cached = memRoadmaps.get(userId);
  if (cached) return cached;

  // Load from DB if available
  if (isDbAvailable()) {
    return loadFromDb(userId);
  }

  return null;
}

export async function saveRoadmap(userId: string, roadmap: Roadmap): Promise<Roadmap> {
  // Always update in-memory cache (fast reads, works without DB)
  memRoadmaps.set(userId, roadmap);

  // Persist to DB if available
  if (isDbAvailable()) {
    await persistToDb(userId, roadmap);
  }

  return roadmap;
}

export async function updateNodeStatus(
  userId: string,
  nodeId: string,
  status: RoadmapNode["status"]
): Promise<Roadmap | null> {
  // Update in-memory first
  const roadmap = memRoadmaps.get(userId);
  if (!roadmap) {
    // Try loading from DB if not in memory
    const fromDb = isDbAvailable() ? await loadFromDb(userId) : null;
    if (!fromDb) return null;
  }

  const current = memRoadmaps.get(userId)!;
  const node = current.nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  node.status = status;

  // Auto-unlock next node when one is completed
  if (status === "completed") {
    const idx = current.nodes.findIndex((n) => n.id === nodeId);
    const next = current.nodes[idx + 1];
    if (next && next.status === "locked") next.status = "next";
    if (next && next.status === "next") next.status = "current";
  }

  current.updatedAt = new Date();
  memRoadmaps.set(userId, current);

  // Persist the single node status update to DB
  if (isDbAvailable()) {
    try {
      const db = getDb();
      await db
        .update(roadmapNodes)
        .set({ status })
        .where(eq(roadmapNodes.id, nodeId));
    } catch (err) {
      console.error("[roadmap-store] node status update failed:", err);
    }
  }

  return current;
}
