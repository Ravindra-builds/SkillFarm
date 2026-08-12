import { pgTable, text, timestamp, uuid, jsonb, real, integer } from "drizzle-orm/pg-core";
import { users } from "./users";

export const resources = pgTable("resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  url: text("url").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  source: text("source"), // docs | github | youtube | article | tutorial
  type: text("type"),
  thumbnail: text("thumbnail"),
  author: text("author"),
  publishedAt: timestamp("publishedAt", { mode: "date" }),
  fetchedAt: timestamp("fetchedAt", { mode: "date" }).defaultNow().notNull(),
});

export const resourceScores = pgTable("resource_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  resourceId: uuid("resourceId")
    .notNull()
    .references(() => resources.id, { onDelete: "cascade" })
    .unique(),
  // Weighted scoring per spec: authority 25%, freshness 20%, accuracy 20%, practical 15%, beginnerFriendly 10%, community 10%
  overall: real("overall").notNull(),
  authority: real("authority").notNull(),
  freshness: real("freshness").notNull(),
  accuracy: real("accuracy").notNull(),
  practicalValue: real("practicalValue").notNull(),
  beginnerFriendly: real("beginnerFriendly").notNull(),
  communitySignal: real("communitySignal").notNull(),
  reasoning: text("reasoning").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const resourceCache = pgTable("research_cache", {
  key: text("key").primaryKey(), // hash of normalized query
  query: text("query").notNull(),
  result: jsonb("result").notNull(),
  provider: text("provider"), // tavily | exa | github | youtube
  hitCount: integer("hitCount").default(0).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  expiresAt: timestamp("expiresAt", { mode: "date" }),
});

export const userResourceBookmarks = pgTable("user_resource_bookmarks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  resourceId: uuid("resourceId")
    .notNull()
    .references(() => resources.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});
