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
        // Best-effort touch in memory; DB update is lazy
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

  // Try to find latest conversation for this user, or create a new one
  const list = await getConversations(userId);
  if (list.length > 0 && !conversationId) {
    const latest = list[0];
    // If mentor differs, update it
    if (mentorId && latest.activeMentorId !== mentorId) {
      return ensureConversation(userId, latest.id, mentorId);
    }
    return latest;
  }

  return createConversation(userId, undefined, mentorId);
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
    title: title ?? `${mentorId ? mentorId.charAt(0).toUpperCase() + mentorId.slice(1) : "Backend"} Mentor — Chat`,
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
    // Ensure user row exists in DB to prevent foreign key error 23503
    await ensureDbUser({ id: userId, email: userId }).catch(() => null);

    const db = getDb();
    const [row] = await db
      .insert(conversations)
      .values({
        id: conv.id,
        userId,
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
    const db = getDb();
    const rows = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
    if (rows.length === 0) {
      // also check memory (in case some convs were created in memory before DB was added)
      const mem = Array.from(memConversations.values()).filter((c) => c.userId === userId);
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
    // Touch conversation updatedAt
    await (db.update(conversations) as unknown as { set: (v: Record<string, unknown>) => { where: (c: unknown) => Promise<void> } })
      .set({ updatedAt: new Date() } as Record<string, unknown>)
      .where(eq(conversations.id, conversationId) as unknown as never);
  } catch (err) {
    console.error("[chat-store] saveMessage DB failed, kept in memory:", err);
  }
  return msg;
}
