import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  // Current active mentor — the orchestrator can change it via handoff.
  activeMentorId: text("activeMentorId"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversationId")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user | assistant | system | tool
  content: text("content").notNull(),
  mentorId: text("mentorId"),
  // For tracing which model/tools were used
  metadata: jsonb("metadata").$type<{
    model?: string;
    tokens?: number;
    tools?: string[];
    handoff?: { from: string; to: string; reason?: string };
  }>(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const mentorHandoffs = pgTable("mentor_handoffs", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversationId")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  fromMentorId: text("fromMentorId").notNull(),
  toMentorId: text("toMentorId").notNull(),
  reason: text("reason"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});
