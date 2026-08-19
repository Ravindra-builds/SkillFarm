import { eq, desc, and } from "drizzle-orm";
import { getDb } from "@/db";
import { conversations, messages } from "@/db/schema";
import { randomUUID } from "crypto";
import { ensureDbUser } from "@/lib/users";
import { isMockModeForced } from "@/lib/env";
import {
  isGuestSession,
  getGuestState,
  setGuestState,
  deleteGuestState,
  guestKeys,
  GUEST_CONFIG,
} from "@/lib/guest";

/**
 * Chat persistence
 *
 * For authenticated users: Uses PostgreSQL + Drizzle; falls back to in-memory Maps when DB is unconfigured.
 * For guest users: Strictly isolated to Upstash Redis with TTL / ephemeral memory per unique guest session ID,
 * guaranteeing zero database pollution, cross-browser leakage, or permanent storage waste.
 */

export type ChatMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  mentorId?: string | null;
  createdAt: Date;
};

export type ChatConversation = {
  id: string;
  userId: string;
  title: string | null;
  activeMentorId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function isDbAvailable(): boolean {
  if (isMockModeForced()) return false;
  const v = process.env.DATABASE_URL;
  if (!v) return false;
  const s = v.trim().toLowerCase();
  if (s.includes("ep-xxx") || s.includes("user:password@ep-xxx") || s.length < 20) return false;
  return s.startsWith("postgresql");
}

// In-memory fast layer
const memConversations = new Map<string, ChatConversation>();
const memMessages = new Map<string, ChatMessage[]>();

/**
 * Derives a clean, intelligent conversation title from the first user message
 * without making expensive LLM calls or consuming tokens.
 */
export function formatTitleFromMessage(content: string): string {
  if (!content) return "New conversation";

  const clean = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/[#*_~>\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return "New conversation";

  const firstSentence = clean.split(/[\n\.\?!]/)[0]?.trim();
  let candidate = firstSentence && firstSentence.length >= 4 ? firstSentence : clean;

  if (candidate.length > 42) {
    const cut = candidate.slice(0, 42);
    const lastSpace = cut.lastIndexOf(" ");
    candidate = (lastSpace > 15 ? cut.slice(0, lastSpace) : cut).trim() + "…";
  }

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
  const isGuest = isGuestSession(userId);

  if (conversationId) {
    const existing = await getConversation(conversationId);
    if (existing) {
      if (mentorId && existing.activeMentorId !== mentorId) {
        existing.activeMentorId = mentorId;
        existing.updatedAt = new Date();
        memConversations.set(existing.id, existing);

        if (isGuest) {
          await setGuestState(guestKeys.conversation(userId, existing.id), existing, GUEST_CONFIG.SESSION_TTL);
        } else if (isDbAvailable()) {
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

  const empty = await getEmptyConversation(userId);
  if (empty) {
    return empty;
  }

  if (isGuest) {
    const list = await getConversations(userId);
    if (list.length >= GUEST_CONFIG.MAX_CONVERSATIONS) {
      return list[0];
    }
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

  const isGuest = isGuestSession(userId);

  if (isGuest) {
    const existingList = (await getGuestState<ChatConversation[]>(guestKeys.conversations(userId))) || [];
    if (existingList.length >= GUEST_CONFIG.MAX_CONVERSATIONS) {
      const existing = existingList[0] || Array.from(memConversations.values()).find((c) => c.userId === userId);
      if (existing) return existing;
    }

    memConversations.set(conv.id, conv);
    memMessages.set(conv.id, []);

    // Sync to Redis with TTL
    await setGuestState(guestKeys.conversation(userId, conv.id), conv, GUEST_CONFIG.SESSION_TTL);
    await setGuestState(
      guestKeys.conversations(userId),
      [conv, ...existingList.filter((c) => c.id !== conv.id)],
      GUEST_CONFIG.SESSION_TTL
    );

    return conv;
  }

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

    memConversations.set(row.id, {
      id: row.id,
      userId: row.userId,
      title: row.title,
      activeMentorId: row.activeMentorId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
    memMessages.set(row.id, []);

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
  const mem = memConversations.get(id);
  if (mem) return mem;

  if (!isDbAvailable()) return null;
  try {
    const db = getDb();
    const rows = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    const r = rows[0];
    if (!r) return null;
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
    return null;
  }
}

export async function getConversations(userId: string): Promise<ChatConversation[]> {
  const isGuest = isGuestSession(userId);

  if (isGuest) {
    const memList = Array.from(memConversations.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    if (memList.length > 0) return memList;

    const redisList = await getGuestState<ChatConversation[]>(guestKeys.conversations(userId));
    if (redisList && Array.isArray(redisList)) {
      redisList.forEach((c) => memConversations.set(c.id, c));
      return redisList;
    }
    return [];
  }

  if (!isDbAvailable()) {
    return Array.from(memConversations.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
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
  const mem = memMessages.get(conversationId);
  if (mem && mem.length > 0) return mem;

  const conv = memConversations.get(conversationId);
  const isGuest = conv ? isGuestSession(conv.userId) : false;

  if (isGuest && conv) {
    const redisMsgs = await getGuestState<ChatMessage[]>(guestKeys.messages(conv.userId, conversationId));
    if (redisMsgs && Array.isArray(redisMsgs)) {
      memMessages.set(conversationId, redisMsgs);
      return redisMsgs;
    }
    return mem ?? [];
  }

  if (isGuest || !isDbAvailable()) return mem ?? [];

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    if (rows.length === 0) return mem ?? [];
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
    return mem ?? [];
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

  // Always put in memory
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

  const conv = memConversations.get(conversationId);
  const isGuest = conv ? isGuestSession(conv.userId) : false;

  if (isGuest && conv) {
    // Save to Redis with guest session TTL
    await setGuestState(guestKeys.messages(conv.userId, conversationId), list, GUEST_CONFIG.SESSION_TTL);
    if (updatedTitle) {
      conv.title = updatedTitle;
    }
    conv.updatedAt = new Date();
    memConversations.set(conversationId, conv);
    await setGuestState(guestKeys.conversation(conv.userId, conversationId), conv, GUEST_CONFIG.SESSION_TTL);

    const existingList = (await getGuestState<ChatConversation[]>(guestKeys.conversations(conv.userId))) || [];
    const updatedConvs = [conv, ...existingList.filter((c) => c.id !== conv.id)];
    await setGuestState(guestKeys.conversations(conv.userId), updatedConvs, GUEST_CONFIG.SESSION_TTL);
    return msg;
  }

  if (isGuest || !isDbAvailable()) return msg;

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

  const isGuest = isGuestSession(userId);
  if (isGuest) {
    await deleteGuestState(guestKeys.conversation(userId, conversationId));
    await deleteGuestState(guestKeys.messages(userId, conversationId));
    const existingList = (await getGuestState<ChatConversation[]>(guestKeys.conversations(userId))) || [];
    await setGuestState(
      guestKeys.conversations(userId),
      existingList.filter((c) => c.id !== conversationId),
      GUEST_CONFIG.SESSION_TTL
    );
    return true;
  }

  if (!isDbAvailable()) return true;

  try {
    const dbUserId = await ensureDbUser({ id: userId, email: userId });
    const db = getDb();
    // Security: WHERE includes BOTH id AND userId to enforce ownership.
    // Without this, any authenticated user could delete any conversation by ID (IDOR/BOLA).
    const deleted = await db
      .delete(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, dbUserId)))
      .returning({ id: conversations.id });

    // Also try original userId in case DB userId differs from mapped dbUserId
    if (deleted.length === 0 && dbUserId !== userId) {
      await db
        .delete(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
    }

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

  const isGuest = isGuestSession(userId);
  if (isGuest) {
    if (mem) {
      await setGuestState(guestKeys.conversation(userId, conversationId), mem, GUEST_CONFIG.SESSION_TTL);
      const existingList = (await getGuestState<ChatConversation[]>(guestKeys.conversations(userId))) || [];
      const updated = existingList.map((c) => (c.id === conversationId ? { ...c, title: trimmed } : c));
      await setGuestState(guestKeys.conversations(userId), updated, GUEST_CONFIG.SESSION_TTL);
    }
    return true;
  }

  if (!isDbAvailable()) return true;

  try {
    const dbUserId = await ensureDbUser({ id: userId, email: userId });
    const db = getDb();
    // Security: WHERE includes BOTH id AND userId to enforce ownership (prevents IDOR).
    await (
      db.update(conversations) as unknown as {
        set: (v: Record<string, unknown>) => { where: (c: unknown) => Promise<void> };
      }
    )
      .set({ title: trimmed, updatedAt: new Date() } as Record<string, unknown>)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, dbUserId)) as unknown as never);
    return true;
  } catch (err) {
    console.error("[chat-store] updateConversationTitle failed:", err);
    return false;
  }
}
