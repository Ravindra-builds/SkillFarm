import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { mentorHandoffs } from "@/db/schema";
import { randomUUID } from "crypto";
import type { MentorId } from "@/config/mentors";

/**
 * Handoff persistence — Phase 6
 *
 * Uses Neon when available, otherwise in-memory Map.
 * Mirrors chat-store pattern for preview without DB.
 */

type Handoff = {
  id: string;
  conversationId: string;
  fromMentorId: MentorId;
  toMentorId: MentorId;
  reason: string | null;
  createdAt: Date;
};

function isDbAvailable(): boolean {
  const v = process.env.DATABASE_URL;
  if (!v) return false;
  const s = v.trim().toLowerCase();
  if (s.includes("ep-xxx") || s.includes("user:password@ep-xxx") || s.length < 20) return false;
  return v.startsWith("postgresql");
}

const memHandoffs = new Map<string, Handoff[]>(); // key: conversationId

export async function saveHandoff(
  conversationId: string,
  fromMentorId: MentorId,
  toMentorId: MentorId,
  reason?: string
): Promise<Handoff> {
  const h: Handoff = {
    id: randomUUID(),
    conversationId,
    fromMentorId,
    toMentorId,
    reason: reason ?? null,
    createdAt: new Date(),
  };

  const list = memHandoffs.get(conversationId) ?? [];
  list.push(h);
  memHandoffs.set(conversationId, list);

  if (!isDbAvailable()) return h;

  try {
    const db = getDb();
    const [row] = await db
      .insert(mentorHandoffs)
      .values({
        id: h.id,
        conversationId,
        fromMentorId,
        toMentorId,
        reason: reason ?? null,
      })
      .returning();
    return {
      id: row.id,
      conversationId: row.conversationId,
      fromMentorId: row.fromMentorId as MentorId,
      toMentorId: row.toMentorId as MentorId,
      reason: row.reason,
      createdAt: row.createdAt,
    };
  } catch (err) {
    console.error("[handoff-store] DB save failed, kept in memory:", err);
    return h;
  }
}

export async function getHandoffs(conversationId: string): Promise<Handoff[]> {
  if (!isDbAvailable()) return memHandoffs.get(conversationId) ?? [];
  try {
    const db = getDb();
    const rows = await db.select().from(mentorHandoffs).where(eq(mentorHandoffs.conversationId, conversationId)).orderBy(desc(mentorHandoffs.createdAt));
    if (rows.length === 0) return memHandoffs.get(conversationId) ?? [];
    return rows.map((r) => ({
      id: r.id,
      conversationId: r.conversationId,
      fromMentorId: r.fromMentorId as MentorId,
      toMentorId: r.toMentorId as MentorId,
      reason: r.reason,
      createdAt: r.createdAt,
    }));
  } catch (err) {
    console.error("[handoff-store] get failed:", err);
    return memHandoffs.get(conversationId) ?? [];
  }
}

export async function getHandoffHistory(conversationId: string): Promise<string[]> {
  const list = await getHandoffs(conversationId);
  return list.map((h) => `${h.fromMentorId} → ${h.toMentorId}: ${h.reason ?? ""}`);
}
