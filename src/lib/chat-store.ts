import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { conversations, messages } from "@/db/schema";
import { randomUUID } from "crypto";
import { ensureDbUser } from "@/lib/users";

/**
 * Chat persistence — Phase 3
 *
 * Tries Neon + Drizzle; falls back to in-memory Maps when DB is not configured
 * (placeholder ep-xxx) or when the query fails (e.g., table not yet migrated).
 * This keeps the demo working in preview without any env.
 */

type ChatMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  mentorId?: string | null;
  createdAt: Date;
};

type ChatConversation = {
  id: string;
  userId: string;
  title: string | null;
  activeMentorId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

import { isMockModeForced } from "@/lib/env";

function isDbAvailable(): boolean {
  if (isMockModeForced()) return false;
  const v = process.env.DATABASE_URL;
  if (!v) return false;
  const s = v.trim().toLowerCase();
  if (s.includes("ep-xxx") || s.includes("user:password@ep-xxx") || s.length < 20) return false;
  return s.startsWith("postgresql");
}

// In-memory fallbacks
const memConversations = new Map<string, ChatConversation>();
const memMessages = new Map<string, ChatMessage[]>();

/**
 * Derives a clean, intelligent conversation title from the first user message
 * without making expensive LLM calls or consuming tokens.
 */
export function formatTitleFromMessage(content: string): string {
  if (!content) return "New conversation";

  // 1. Strip code blocks, markdown symbols, and extra whitespace
  let clean = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/[#*_~>\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return "New conversation";

  // 2. Extract first sentence or question
  const firstSentence = clean.split(/[\n\.\?!]/)[0]?.trim();
  let candidate = firstSentence && firstSentence.length >= 4 ? firstSentence : clean;

  // 3. Trim length cleanly at word boundary (max 42 chars)
  if (candidate.length > 42) {
    const cut = candidate.slice(0, 42);
    const lastSpace = cut.lastIndexOf(" ");
    candidate = (lastSpace > 15 ? cut.slice(0, lastSpace) : cut).trim() + "…";
  }

  // 4. Capitalize first letter
  candidate = candidate.charAt(0).toUpperCase() + candidate.slice(1);
  return candidate || "New conversation";
}

/**
 * Checks if the user already has a brand new / empty conversation (0 messages).
 */
export async function getEmptyConversation(userId: string): Promise<ChatConversation | null> {
  const list = await getConversations(userId);
  for (const conv of list) {
    const msgs = await getMessages(conv.id);
    if (msgs.length === 0) {
      return conv;
    }
  }
  return null;
}

export async function ensureConversation(
  userId: string,
  conversationId?: string,
  mentorId?: string
): Promise<ChatConversation> {
  if (conversationId) {
    const existing = await getConversation(conversationId);
    if (existing) {
      // Optionally update activeMentorId if mentor changed
      if (mentorId && existing.activeMentorId !== mentorId) {
        existing.activeMentorId = mentorId;
        memConversations.set(existing.id, { ...existing, updatedAt: new Date() });
        if (isDbAvailable()) {
          try {
            const db = getDb();
            await (db.update(conversations) as unknown as { set: (v: Record<string, unknown>) => { where: (c: unknown) => Promise<void> } })
              .set({ activeMentorId: mentorId, updatedAt: new Date() } as Record<string, unknown>)
              .where(eq(conversations.id, existing.id) as unknown as never);
          } catch {}
        }
      }
      return existing;
    }
  }

  // When opening chat without a specific ID, always prefer an empty conversation if one already exists,
  // or initialize a brand new chat automatically (so the user is in a fresh chat, not a previous conversation).
  const empty = await getEmptyConversation(userId);
  if (empty) {
    return empty;
  }

  return createConversation(userId, "New conversation", mentorId);
}

export async function createConversation(
  userId: string,
  title?: string,
  mentorId?: string
): Promise<ChatConversation> {
  const now = new Date();
  const conv: ChatConversation = {
    id: randomUUID(),
    userId,
    title: title ?? "New conversation",
    activeMentorId: mentorId ?? "backend",
    createdAt: now,
    updatedAt: now,
  };

  if (!isDbAvailable()) {
    memConversations.set(conv.id, conv);
    memMessages.set(conv.id, []);
    return conv;
  }

  try {
    const dbUserId = await ensureDbUser({ id: userId, email: userId });

    const db = getDb();
    const [row] = await db
      .insert(conversations)
      .values({
        id: conv.id,
        userId: dbUserId,
        title: conv.title,
        activeMentorId: conv.activeMentorId,
      })
      .returning();
    return {
      id: row.id,
      userId: row.userId,
      title: row.title,
      activeMentorId: row.activeMentorId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  } catch (err) {
    console.error("[chat-store] createConversation DB failed, using memory:", err);
    memConversations.set(conv.id, conv);
    memMessages.set(conv.id, []);
    return conv;
  }
}

export async function getConversation(id: string): Promise<ChatConversation | null> {
  if (!isDbAvailable()) return memConversations.get(id) ?? null;
  try {
    const db = getDb();
    const rows = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    const r = rows[0];
    if (!r) return memConversations.get(id) ?? null;
    return {
      id: r.id,
      userId: r.userId,
      title: r.title,
      activeMentorId: r.activeMentorId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  } catch (err) {
    console.error("[chat-store] getConversation failed:", err);
    return memConversations.get(id) ?? null;
  }
}

export async function getConversations(userId: string): Promise<ChatConversation[]> {
  if (!isDbAvailable()) {
    return Array.from(memConversations.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  try {
    const dbUserId = await ensureDbUser({ id: userId, email: userId });
    const db = getDb();
    const rows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, dbUserId))
      .orderBy(desc(conversations.updatedAt));
    if (rows.length === 0 && dbUserId !== userId) {
      // Check if user was recorded under raw userId
      const fallbackRows = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt));
      if (fallbackRows.length > 0) {
        return fallbackRows.map((r) => ({
          id: r.id,
          userId: r.userId,
          title: r.title,
          activeMentorId: r.activeMentorId,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }));
      }
    }
    if (rows.length === 0) {
      // also check memory (in case some convs were created in memory before DB was added)
      const mem = Array.from(memConversations.values()).filter((c) => c.userId === userId || c.userId === dbUserId);
      return mem.length > 0 ? mem : [];
    }
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      title: r.title,
      activeMentorId: r.activeMentorId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  } catch (err) {
    console.error("[chat-store] getConversations failed:", err);
    return Array.from(memConversations.values()).filter((c) => c.userId === userId);
  }
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  if (!isDbAvailable()) return memMessages.get(conversationId) ?? [];
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
    if (rows.length === 0) return memMessages.get(conversationId) ?? [];
    return rows.map((r) => ({
      id: r.id,
      conversationId: r.conversationId,
      role: r.role as ChatMessage["role"],
      content: r.content,
      mentorId: r.mentorId,
      createdAt: r.createdAt,
    }));
  } catch (err) {
    console.error("[chat-store] getMessages failed:", err);
    return memMessages.get(conversationId) ?? [];
  }
}

export async function saveMessage(
  conversationId: string,
  role: ChatMessage["role"],
  content: string,
  mentorId?: string | null
): Promise<ChatMessage> {
  const msg: ChatMessage = {
    id: randomUUID(),
    conversationId,
    role,
    content,
    mentorId: mentorId ?? null,
    createdAt: new Date(),
  };

  // Always put in memory (so even DB mode has fast fallback)
  const list = memMessages.get(conversationId) ?? [];
  list.push(msg);
  memMessages.set(conversationId, list);

  // Auto-generate title from first user message if conversation has default title
  let updatedTitle: string | undefined = undefined;
  if (role === "user") {
    const mem = memConversations.get(conversationId);
    const isDefaultTitle = !mem?.title || mem.title === "New conversation" || mem.title.includes("Mentor — Chat");
    if (isDefaultTitle) {
      updatedTitle = formatTitleFromMessage(content);
      if (mem) {
        memConversations.set(conversationId, { ...mem, title: updatedTitle, updatedAt: new Date() });
      }
    }
  }

  if (!isDbAvailable()) return msg;

  try {
    const db = getDb();
    await db.insert(messages).values({
      id: msg.id,
      conversationId,
      role,
      content,
      mentorId: mentorId ?? "backend",
      createdAt: msg.createdAt,
    });
    // Touch conversation updatedAt and optionally title
    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
    if (updatedTitle) {
      updatePayload.title = updatedTitle;
    }
    await (db.update(conversations) as unknown as { set: (v: Record<string, unknown>) => { where: (c: unknown) => Promise<void> } })
      .set(updatePayload)
      .where(eq(conversations.id, conversationId) as unknown as never);
  } catch (err) {
    console.error("[chat-store] saveMessage DB failed, kept in memory:", err);
  }
  return msg;
}

export async function deleteConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const mem = memConversations.get(conversationId);
  if (mem && mem.userId === userId) {
    memConversations.delete(conversationId);
    memMessages.delete(conversationId);
  }
  if (!isDbAvailable()) return true;
  try {
    const db = getDb();
    await db.delete(conversations).where(eq(conversations.id, conversationId));
    return true;
  } catch (err) {
    console.error("[chat-store] deleteConversation failed:", err);
    return false;
  }
}

export async function updateConversationTitle(
  conversationId: string,
  title: string,
  userId: string
): Promise<boolean> {
  const trimmed = title.trim().slice(0, 100);
  const mem = memConversations.get(conversationId);
  if (mem && mem.userId === userId) {
    memConversations.set(conversationId, { ...mem, title: trimmed, updatedAt: new Date() });
  }
  if (!isDbAvailable()) return true;
  try {
    const db = getDb();
    await (
      db.update(conversations) as unknown as {
        set: (v: Record<string, unknown>) => { where: (c: unknown) => Promise<void> };
      }
    )
      .set({ title: trimmed, updatedAt: new Date() } as Record<string, unknown>)
      .where(eq(conversations.id, conversationId) as unknown as never);
    return true;
  } catch (err) {
    console.error("[chat-store] updateConversationTitle failed:", err);
    return false;
  }
}
