import { pgTable, text, timestamp, boolean, integer, uuid, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";

export const learningProfiles = pgTable("learning_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  goal: text("goal").notNull(),
  currentLevel: text("currentLevel").notNull(), // beginner | intermediate | advanced
  knownSkills: jsonb("knownSkills").$type<string[]>().default([]).notNull(),
  weakSkills: jsonb("weakSkills").$type<string[]>().default([]),
  preferences: jsonb("preferences").$type<{
    format?: "docs" | "videos" | "projects" | "mixed";
    learningStyle?: "hands-on" | "visual" | "reading" | "mixed";
    weeklyHours?: number;
    dailyGoalMinutes?: number;
  }>(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const mentors = pgTable("mentors", {
  id: text("id").primaryKey(), // "backend", "ai-engineer", "frontend", etc.
  name: text("name").notNull(),
  role: text("role").notNull(),
  persona: text("persona").notNull(),
  systemPrompt: text("systemPrompt").notNull(),
  specialties: jsonb("specialties").$type<string[]>().default([]).notNull(),
  avatarUrl: text("avatarUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const roadmaps = pgTable("roadmaps", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("active"), // active | archived
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const roadmapNodes = pgTable("roadmap_nodes", {
  id: uuid("id").defaultRandom().primaryKey(),
  roadmapId: uuid("roadmapId")
    .notNull()
    .references(() => roadmaps.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  whyItMatters: text("whyItMatters"),
  difficulty: text("difficulty"), // beginner | intermediate | advanced
  prerequisites: jsonb("prerequisites").$type<string[]>().default([]),
  relatedConcepts: jsonb("relatedConcepts").$type<string[]>().default([]),
  mentorId: text("mentorId"), // which mentor owns this node
  order: integer("order").notNull(),
  status: text("status").default("locked"), // locked | current | completed
  practicalTask: text("practicalTask"),
  projectBrief: text("projectBrief"),
  commonMistakes: jsonb("commonMistakes").$type<string[]>().default([]),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const knowledgeNodes = pgTable("knowledge_nodes", {
  id: text("id").primaryKey(),
  userId: text("userId").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  prerequisites: jsonb("prerequisites").$type<string[]>().default([]),
  relatedConcepts: jsonb("relatedConcepts").$type<string[]>().default([]),
  difficulty: text("difficulty"),
  positionX: integer("positionX"),
  positionY: integer("positionY"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const userProgress = pgTable("user_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nodeId: uuid("nodeId")
    .notNull()
    .references(() => roadmapNodes.id, { onDelete: "cascade" }),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completedAt", { mode: "date" }),
  notes: text("notes"),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  repoUrl: text("repoUrl"),
  status: text("status").default("not-started"), // not-started | in-progress | completed
  mentorId: text("mentorId"),
  difficulty: text("difficulty"), // beginner | intermediate | advanced
  topic: text("topic"),
  // AI-generated rich fields serialised as JSON
  metadata: jsonb("metadata").$type<{
    requirements?: string[];
    stretchGoals?: string[];
    commonMistakes?: string[];
    isCapstone?: boolean;
    goalAlignment?: string;
    stack?: string[];
    features?: string[];
    currentWeek?: number;
    unlockedWeeks?: number[];
    tasks?: Array<{
      id: string;
      week: number;
      title: string;
      completed: boolean;
    }>;
    roadmapNodeId?: string;
    week?: number;
  }>(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const userMemories = pgTable("user_memories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  memoryText: text("memoryText").notNull(),
  category: text("category").default("general"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const userResumes = pgTable("user_resumes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fileName: text("fileName").notNull(),
  fileSize: integer("fileSize"),
  fileType: text("fileType").notNull(),
  storageKey: text("storageKey"),
  storageUrl: text("storageUrl"),
  extractedSkills: jsonb("extractedSkills").$type<string[]>(),
  suggestedLevel: text("suggestedLevel"),
  targetRole: text("targetRole"),
  summary: text("summary"),
  parsedData: jsonb("parsedData"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});
