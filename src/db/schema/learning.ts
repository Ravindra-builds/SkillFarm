import {
  pgTable,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Learning-specific tables — purposely decoupled from auth `users`.
 * This lets us iterate on mentorship features without migrating auth.
 */

export const learningProfiles = pgTable("learning_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  // What the user wants to become (e.g., "production-ready backend engineer")
  goal: text("goal"),
  // Self-assessed level
  currentLevel: text("currentLevel"), // beginner | intermediate | advanced
  knownSkills: jsonb("knownSkills").$type<string[]>().default([]),
  weakSkills: jsonb("weakSkills").$type<string[]>().default([]),
  completedTopics: jsonb("completedTopics").$type<string[]>().default([]),
  activeProjects: jsonb("activeProjects").$type<string[]>().default([]),
  preferences: jsonb("preferences").$type<{
    learningStyle?: string;
    weeklyHours?: number;
    format?: string;
  }>(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const roadmaps = pgTable("roadmaps", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  // Full roadmap as structured JSON so the UI can render without extra joins.
  // Nodes are also persisted individually in roadmap_nodes for querying/progress.
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
  status: text("status").default("active"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
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
