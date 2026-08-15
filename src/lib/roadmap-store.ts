import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { roadmaps, roadmapNodes } from "@/db/schema";
import { isDbAvailable } from "@/lib/env";
import { ensureDbUser } from "@/lib/users";

export type CapstoneProject = {
  name: string;
  description: string;
  goalAlignment: string;
  stack: string[];
  features: string[];
};

export type RoadmapNode = {
  id: string;
  slug: string;
  title: string;
  topic?: string;
  description: string;
  whyItMatters: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  prerequisites: string[];
  relatedConcepts: string[];
  concepts?: string[];
  learningObjectives?: string[];
  mentalModels?: string[];
  practicalTask: string;
  capstoneApplication?: string[];
  projectWork?: string[];
  featureCompleted?: string;
  projectBrief: string;
  commonMistakes: string[];
  week?: number;
  theme?: string;
  mentorId: string;
  order: number;
  status: "locked" | "current" | "completed" | "next";
  estimatedHours?: number;
};

export type Roadmap = {
  id: string;
  userId: string;
  title: string;
  description: string;
  capstoneProject?: CapstoneProject;
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

    // Parse description and optional embedded capstoneProject
    let descriptionText = row.description ?? "";
    let capstoneProject: CapstoneProject | undefined = undefined;

    if (row.description && row.description.startsWith("{") && row.description.includes('"capstoneProject"')) {
      try {
        const parsed = JSON.parse(row.description);
        descriptionText = parsed.description ?? "";
        capstoneProject = parsed.capstoneProject;
      } catch {}
    }

    const nodeRows = await db
      .select()
      .from(roadmapNodes)
      .where(eq(roadmapNodes.roadmapId, row.id))
      .orderBy(roadmapNodes.order);

    const nodes: RoadmapNode[] = nodeRows.map((n, idx) => {
      let projectBriefText = n.projectBrief ?? "";
      let topic: string | undefined = undefined;
      let theme: string | undefined = undefined;
      let learningObjectives: string[] | undefined = undefined;
      let concepts: string[] | undefined = undefined;
      let mentalModels: string[] | undefined = undefined;
      let capstoneApplication: string[] | undefined = undefined;
      let projectWork: string[] | undefined = undefined;
      let featureCompleted: string | undefined = undefined;
      let weekNumber = Math.floor(idx / 2) + 1;
      let estHours = n.difficulty === "advanced" ? 6 : n.difficulty === "intermediate" ? 4 : 3;

      if (n.projectBrief && n.projectBrief.startsWith("{") && (n.projectBrief.includes('"projectWork"') || n.projectBrief.includes('"capstoneApplication"') || n.projectBrief.includes('"mentalModels"'))) {
        try {
          const parsed = JSON.parse(n.projectBrief);
          projectBriefText = parsed.projectBrief ?? "";
          topic = parsed.topic;
          theme = parsed.theme;
          learningObjectives = parsed.learningObjectives;
          concepts = parsed.concepts;
          mentalModels = parsed.mentalModels;
          capstoneApplication = parsed.capstoneApplication || parsed.projectWork;
          projectWork = parsed.projectWork || parsed.capstoneApplication;
          featureCompleted = parsed.featureCompleted;
          if (parsed.week) weekNumber = parsed.week;
          if (parsed.estimatedHours) estHours = parsed.estimatedHours;
        } catch {}
      }

      const activeTopic = topic || theme || n.title;
      const activeApp = capstoneApplication || projectWork || [projectBriefText || `Implement ${n.title} for Main-Project`];

      return {
        id: n.id,
        slug: n.slug,
        title: n.title,
        topic: activeTopic,
        description: n.description ?? "",
        whyItMatters: n.whyItMatters ?? "",
        difficulty: (n.difficulty as RoadmapNode["difficulty"]) ?? "intermediate",
        prerequisites: (n.prerequisites as string[] | null) ?? [],
        relatedConcepts: concepts || ((n.relatedConcepts as string[] | null) ?? []),
        concepts: concepts || ((n.relatedConcepts as string[] | null) ?? []),
        learningObjectives: learningObjectives || [(n.description ?? "")],
        mentalModels: mentalModels || [(n.whyItMatters || `Core mental model for ${activeTopic}`)],
        mentorId: n.mentorId ?? "backend",
        order: n.order,
        status: (n.status as RoadmapNode["status"]) ?? "locked",
        practicalTask: n.practicalTask ?? "",
        capstoneApplication: activeApp,
        projectWork: activeApp,
        featureCompleted: featureCompleted || n.title,
        projectBrief: projectBriefText,
        commonMistakes: (n.commonMistakes as string[]) ?? [],
        week: weekNumber,
        theme: theme || activeTopic,
        estimatedHours: estHours,
      };
    });

    const roadmap: Roadmap = {
      id: row.id,
      userId: row.userId,
      title: row.title,
      description: descriptionText,
      capstoneProject,
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

    // Package description + capstoneProject cleanly
    const descriptionPayload = roadmap.capstoneProject
      ? JSON.stringify({
          description: roadmap.description,
          capstoneProject: roadmap.capstoneProject,
        })
      : roadmap.description;

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
          description: descriptionPayload,
          status: "active",
        })
        .returning({ id: roadmaps.id });
      roadmapId = inserted.id;
    } else {
      roadmapId = existingRows[0].id;
      await db
        .update(roadmaps)
        .set({ title: roadmap.title, description: descriptionPayload, updatedAt: new Date() })
        .where(eq(roadmaps.id, roadmapId));
    }

    // Delete old nodes and re-insert
    await db.delete(roadmapNodes).where(eq(roadmapNodes.roadmapId, roadmapId));

    if (roadmap.nodes.length > 0) {
      await db.insert(roadmapNodes).values(
        roadmap.nodes.map((n) => {
          // Serialize rich concept-first and capstone fields inside projectBrief JSON
          const projectBriefPayload = JSON.stringify({
            projectBrief: n.projectBrief,
            topic: n.topic || n.title,
            theme: n.theme || n.topic || n.title,
            learningObjectives: n.learningObjectives || [],
            concepts: n.concepts || n.relatedConcepts || [],
            mentalModels: n.mentalModels || [],
            capstoneApplication: n.capstoneApplication || n.projectWork || [],
            projectWork: n.projectWork || n.capstoneApplication || [],
            featureCompleted: n.featureCompleted || n.title,
            week: n.week,
            estimatedHours: n.estimatedHours,
          });

          return {
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
            projectBrief: projectBriefPayload,
            commonMistakes: n.commonMistakes,
          };
        })
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
  // Load from DB first if available to guarantee real-time sync across Server Components and API routes
  if (isDbAvailable()) {
    const fromDb = await loadFromDb(userId);
    if (fromDb) return fromDb;
  }

  // Fallback to memory cache
  const cached = memRoadmaps.get(userId);
  if (cached) return cached;

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
  const current = memRoadmaps.get(userId) ?? (isDbAvailable() ? await loadFromDb(userId) : null);
  if (!current) return null;

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

export async function updateNodeDetails(
  userId: string,
  nodeId: string,
  patch: Partial<Pick<RoadmapNode, "title" | "description" | "practicalTask" | "projectBrief" | "status" | "estimatedHours" | "difficulty" | "theme" | "featureCompleted" | "topic">>
): Promise<Roadmap | null> {
  const current = memRoadmaps.get(userId) ?? (isDbAvailable() ? await loadFromDb(userId) : null);
  if (!current) return null;

  const node = current.nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  if (patch.title !== undefined) node.title = patch.title;
  if (patch.topic !== undefined) node.topic = patch.topic;
  if (patch.description !== undefined) node.description = patch.description;
  if (patch.practicalTask !== undefined) node.practicalTask = patch.practicalTask;
  if (patch.projectBrief !== undefined) node.projectBrief = patch.projectBrief;
  if (patch.status !== undefined) node.status = patch.status;
  if (patch.estimatedHours !== undefined) node.estimatedHours = patch.estimatedHours;
  if (patch.difficulty !== undefined) node.difficulty = patch.difficulty;
  if (patch.theme !== undefined) node.theme = patch.theme;
  if (patch.featureCompleted !== undefined) node.featureCompleted = patch.featureCompleted;

  current.updatedAt = new Date();
  memRoadmaps.set(userId, current);

  if (isDbAvailable()) {
    try {
      const db = getDb();
      await db
        .update(roadmapNodes)
        .set({
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.practicalTask !== undefined ? { practicalTask: patch.practicalTask } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.difficulty !== undefined ? { difficulty: patch.difficulty } : {}),
        })
        .where(eq(roadmapNodes.id, nodeId));
    } catch (err) {
      console.error("[roadmap-store] node details update failed:", err);
    }
  }

  return current;
}
