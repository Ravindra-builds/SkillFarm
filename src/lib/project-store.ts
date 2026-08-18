import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getDb } from "@/db";
import { projects as projectsTable } from "@/db/schema";
import { isDbAvailable } from "@/lib/env";
import type { Roadmap, CapstoneProject } from "@/lib/roadmap-store";
import { getRoadmap } from "@/lib/roadmap-store";
import { ensureDbUser } from "@/lib/users";
import {
  isGuestSession,
  getGuestState,
  setGuestState,
  guestKeys,
  GUEST_CONFIG,
} from "@/lib/guest";

export type ProjectStatus = "not-started" | "in-progress" | "completed";

export type CapstoneTask = {
  id: string;
  week: number;
  title: string;
  completed: boolean;
};

export type CapstoneWeekContext = {
  week: number;
  topic: string;
  featureCompleted: string;
  concepts: string[];
  mentalModels: string[];
  mentorId: string;
};

export type CapstoneProjectState = {
  id: string;
  userId: string;
  name: string;
  description: string;
  goalAlignment: string;
  stack: string[];
  features: string[];
  repoUrl?: string;
  currentWeek: number;
  unlockedWeeks: number[];
  tasks: CapstoneTask[];
  weekContexts?: CapstoneWeekContext[];
  updatedAt: Date;
};

export type ProjectMetadata = {
  requirements?: string[];
  stretchGoals?: string[];
  commonMistakes?: string[];
  isCapstone?: boolean;
  goalAlignment?: string;
  stack?: string[];
  features?: string[];
  currentWeek?: number;
  unlockedWeeks?: number[];
  tasks?: CapstoneTask[];
  weekContexts?: CapstoneWeekContext[];
  roadmapNodeId?: string;
  week?: number;
};

// Legacy compatibility type
export type Project = {
  id: string;
  userId: string;
  roadmapNodeId?: string;
  week?: number;
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

// In-memory cache for capstone state and legacy projects
const memCapstones = new Map<string, CapstoneProjectState>();
const memProjects = new Map<string, Project[]>();

/**
 * Synchronizes the Main-Project and its weekly checklist tasks
 * directly from the single roadmap source of truth.
 * Preserves previously completed tasks and repo URLs.
 */
export function syncCapstoneFromRoadmap(
  userId: string,
  roadmap: Roadmap,
  existingState?: CapstoneProjectState | null
): CapstoneProjectState {
  const capstoneMeta: CapstoneProject = roadmap.capstoneProject || {
    name: "Full-Stack Production Main-Project",
    description: roadmap.description,
    goalAlignment: "Proves production engineering competence.",
    stack: ["TypeScript", "Node.js", "PostgreSQL", "Tailwind CSS"],
    features: roadmap.nodes.map((n) => n.featureCompleted || n.topic || n.title),
  };

  const existingTaskMap = new Map<string, boolean>();
  if (existingState && existingState.tasks) {
    for (const t of existingState.tasks) {
      existingTaskMap.set(`${t.week}:${t.title.trim().toLowerCase()}`, t.completed);
      existingTaskMap.set(t.id, t.completed);
    }
  }

  // Generate tasks from roadmap's capstoneApplication / projectWork
  const tasks: CapstoneTask[] = [];
  const weekContexts: CapstoneWeekContext[] = [];
  const weeksPresent: number[] = [];

  for (const node of roadmap.nodes) {
    const week = node.week ?? 1;
    if (!weeksPresent.includes(week)) {
      weeksPresent.push(week);
      weekContexts.push({
        week,
        topic: node.topic || node.theme || node.title,
        featureCompleted: node.featureCompleted || node.title,
        concepts: node.concepts || node.relatedConcepts || [],
        mentalModels: node.mentalModels || [node.whyItMatters],
        mentorId: node.mentorId || "backend",
      });
    }

    const appItems = (node.capstoneApplication && node.capstoneApplication.length > 0)
      ? node.capstoneApplication
      : (node.projectWork && node.projectWork.length > 0)
      ? node.projectWork
      : [node.practicalTask || `Apply ${node.title} to Main-Project`];

    for (const item of appItems) {
      const taskKey = `${week}:${item.trim().toLowerCase()}`;
      // Only marked as completed if the user explicitly checked this task previously
      const isCompleted = existingTaskMap.get(taskKey) ?? false;
      tasks.push({
        id: randomUUID(),
        week,
        title: item,
        completed: isCompleted,
      });
    }
  }

  // Determine current active week and unlocked weeks
  const unlockedWeeks = existingState?.unlockedWeeks ? [...existingState.unlockedWeeks] : [1];
  if (!unlockedWeeks.includes(1)) unlockedWeeks.push(1);

  // Auto-unlock week if prior week's tasks are completed
  const maxWeek = Math.max(...weeksPresent, 1);
  for (let w = 1; w < maxWeek; w++) {
    const weekTasks = tasks.filter((t) => t.week === w);
    const allDone = weekTasks.length > 0 && weekTasks.every((t) => t.completed);
    if (allDone && !unlockedWeeks.includes(w + 1)) {
      unlockedWeeks.push(w + 1);
    }
  }
  unlockedWeeks.sort((a, b) => a - b);

  const highestUnlocked = Math.max(...unlockedWeeks);
  const currentWeek = existingState?.currentWeek ? Math.min(existingState.currentWeek, highestUnlocked) : highestUnlocked;

  return {
    id: existingState?.id || randomUUID(),
    userId,
    name: capstoneMeta.name,
    description: capstoneMeta.description,
    goalAlignment: capstoneMeta.goalAlignment,
    stack: capstoneMeta.stack,
    features: capstoneMeta.features,
    repoUrl: existingState?.repoUrl,
    currentWeek,
    unlockedWeeks,
    tasks,
    weekContexts,
    updatedAt: new Date(),
  };
}

/**
 * Loads the active Main-Project for the user.
 * Automatically synchronizes from the user's roadmap if not yet initialized.
 */
export async function getCapstoneProject(userId: string): Promise<CapstoneProjectState | null> {
  const isGuest = isGuestSession(userId);

  const cachedState = memCapstones.get(userId);
  if (cachedState) return cachedState;

  let state: CapstoneProjectState | null = null;

  if (isGuest) {
    const fromRedis = await getGuestState<CapstoneProjectState>(guestKeys.projects(userId));
    if (fromRedis) {
      memCapstones.set(userId, fromRedis);
      return fromRedis;
    }
  } else if (isDbAvailable()) {
    try {
      const dbUserId = await ensureDbUser({ id: userId, email: userId });
      const db = getDb();
      const rows = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.userId, dbUserId))
        .limit(1);

      if (rows.length > 0) {
        const row = rows[0];
        const meta: ProjectMetadata = (row.metadata as ProjectMetadata | null) ?? {};
        if (meta.isCapstone) {
          state = {
            id: row.id,
            userId: row.userId,
            name: row.title,
            description: row.description ?? "",
            goalAlignment: meta.goalAlignment ?? "",
            stack: meta.stack ?? [],
            features: meta.features ?? [],
            repoUrl: row.repoUrl ?? undefined,
            currentWeek: meta.currentWeek ?? 1,
            unlockedWeeks: meta.unlockedWeeks ?? [1],
            tasks: meta.tasks ?? [],
            weekContexts: meta.weekContexts,
            updatedAt: row.updatedAt ?? row.createdAt,
          };
          memCapstones.set(userId, state);
          if (dbUserId !== userId) memCapstones.set(dbUserId, state);
        }
      }
    } catch (err) {
      console.error("[project-store] getCapstoneProject failed:", err);
    }
  }

  // If no capstone state, try auto-generating from active roadmap
  if (!state) {
    const roadmap = await getRoadmap(userId);
    if (roadmap && roadmap.nodes.length > 0) {
      state = syncCapstoneFromRoadmap(userId, roadmap);
      await saveCapstoneProject(userId, state);
    }
  }

  return state ?? null;
}

/**
 * Saves the Main-Project state to memory and PostgreSQL (or Redis for guests).
 */
export async function saveCapstoneProject(
  userId: string,
  capstone: CapstoneProjectState
): Promise<CapstoneProjectState> {
  const isGuest = isGuestSession(userId);
  memCapstones.set(userId, capstone);

  if (isGuest) {
    await setGuestState(guestKeys.projects(userId), capstone, GUEST_CONFIG.SESSION_TTL);
    return capstone;
  }

  if (isDbAvailable()) {
    try {
      const dbUserId = await ensureDbUser({ id: userId, email: userId });
      const db = getDb();

      const existingRows = await db
        .select({ id: projectsTable.id })
        .from(projectsTable)
        .where(eq(projectsTable.userId, dbUserId))
        .limit(1);

      const metadataPayload: ProjectMetadata = {
        isCapstone: true,
        goalAlignment: capstone.goalAlignment,
        stack: capstone.stack,
        features: capstone.features,
        currentWeek: capstone.currentWeek,
        unlockedWeeks: capstone.unlockedWeeks,
        tasks: capstone.tasks,
        weekContexts: capstone.weekContexts,
      };

      if (existingRows.length === 0) {
        await db.insert(projectsTable).values({
          id: capstone.id,
          userId: dbUserId,
          title: capstone.name,
          description: capstone.description,
          topic: "Main-Project",
          difficulty: "intermediate",
          status: "in-progress",
          repoUrl: capstone.repoUrl ?? null,
          metadata: metadataPayload,
        });
      } else {
        await db
          .update(projectsTable)
          .set({
            title: capstone.name,
            description: capstone.description,
            repoUrl: capstone.repoUrl ?? null,
            metadata: metadataPayload,
            updatedAt: new Date(),
          })
          .where(eq(projectsTable.id, existingRows[0].id));
      }
    } catch (err) {
      console.error("[project-store] saveCapstoneProject failed:", err);
    }
  }

  return capstone;
}

/**
 * Toggles a single task's completion status.
 * Automatically unlocks the next week when all tasks for the current week are completed.
 */
export async function toggleCapstoneTask(
  userId: string,
  taskId: string,
  completed: boolean
): Promise<CapstoneProjectState | null> {
  const capstone = await getCapstoneProject(userId);
  if (!capstone) return null;

  const task = capstone.tasks.find((t) => t.id === taskId);
  if (!task) return capstone;

  task.completed = completed;

  // Check if all tasks in this task's week are now done
  const weekTasks = capstone.tasks.filter((t) => t.week === task.week);
  const weekAllDone = weekTasks.length > 0 && weekTasks.every((t) => t.completed);

  if (weekAllDone) {
    const nextWeek = task.week + 1;
    const maxWeek = Math.max(...capstone.tasks.map((t) => t.week), 1);
    const isGuest = isGuestSession(userId);
    const maxAllowed = isGuest ? 2 : maxWeek;
    if (nextWeek <= maxAllowed && !capstone.unlockedWeeks.includes(nextWeek)) {
      capstone.unlockedWeeks.push(nextWeek);
      capstone.unlockedWeeks.sort((a, b) => a - b);
      capstone.currentWeek = nextWeek;
    }
  }

  capstone.updatedAt = new Date();
  await saveCapstoneProject(userId, capstone);
  return capstone;
}

/**
 * Updates the user's GitHub repository link for the Main-Project.
 */
export async function updateCapstoneRepo(
  userId: string,
  repoUrl: string
): Promise<CapstoneProjectState | null> {
  const capstone = await getCapstoneProject(userId);
  if (!capstone) return null;

  capstone.repoUrl = repoUrl;
  capstone.updatedAt = new Date();
  await saveCapstoneProject(userId, capstone);
  return capstone;
}

/**
 * Manually sets the active week viewed by the user.
 */
export async function setCurrentCapstoneWeek(
  userId: string,
  week: number
): Promise<CapstoneProjectState | null> {
  const capstone = await getCapstoneProject(userId);
  if (!capstone) return null;

  if (capstone.unlockedWeeks.includes(week)) {
    capstone.currentWeek = week;
    await saveCapstoneProject(userId, capstone);
  }
  return capstone;
}

// ---------------------------------------------------------------------------
// Backward-Compatibility Helpers for existing consumers
// ---------------------------------------------------------------------------

export async function getProjects(userId: string): Promise<Project[]> {
  const memList = memProjects.get(userId);
  if (memList && memList.length > 0) return memList;

  const capstone = await getCapstoneProject(userId);
  if (!capstone) return [];

  // Convert weeks to Project deliverables format
  const weekNumbers = Array.from(new Set(capstone.tasks.map((t) => t.week))).sort((a, b) => a - b);

  return weekNumbers.map((w, idx) => {
    const weekTasks = capstone.tasks.filter((t) => t.week === w);
    const allDone = weekTasks.length > 0 && weekTasks.every((t) => t.completed);
    const isUnlocked = capstone.unlockedWeeks.includes(w);

    const featureTitle = capstone.features[idx] || `Week ${w} Feature`;

    return {
      id: `${capstone.id}-week-${w}`,
      userId,
      week: w,
      title: featureTitle,
      description: `Main-Project Deliverable for Week ${w}: ${featureTitle}.`,
      topic: featureTitle,
      difficulty: w > 3 ? "advanced" : w > 1 ? "intermediate" : "beginner",
      requirements: weekTasks.map((t) => t.title),
      stretchGoals: [
        "Include automated test coverage with Vitest",
        "Add observability & structured error handling",
      ],
      commonMistakes: ["Skipping validation", "No error handling"],
      mentorId: "backend",
      status: allDone ? "completed" : isUnlocked ? "in-progress" : "not-started",
      repoUrl: capstone.repoUrl,
      createdAt: capstone.updatedAt,
      updatedAt: capstone.updatedAt,
    };
  });
}

export async function saveProjects(userId: string, projectsList: Project[]): Promise<Project[]> {
  memProjects.set(userId, projectsList);
  return projectsList;
}

export async function updateProject(
  userId: string,
  projectId: string,
  updates: { status?: ProjectStatus; repoUrl?: string; title?: string; description?: string }
): Promise<Project | null> {
  const memList = memProjects.get(userId);
  if (memList) {
    const proj = memList.find((p) => p.id === projectId);
    if (proj) {
      if (updates.status) proj.status = updates.status;
      if (updates.repoUrl !== undefined) proj.repoUrl = updates.repoUrl;
      if (updates.title) proj.title = updates.title;
      if (updates.description) proj.description = updates.description;
      proj.updatedAt = new Date();
      return proj;
    }
  }

  if (updates.repoUrl !== undefined) {
    await updateCapstoneRepo(userId, updates.repoUrl);
  }
  const list = await getProjects(userId);
  return list.find((p) => p.id === projectId) ?? null;
}
