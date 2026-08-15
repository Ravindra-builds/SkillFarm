/**
 * Mem0 AI Long-Term Memory Integration
 *
 * Provides long-term memory extraction, persistent PostgreSQL storage (user_memories),
 * and semantic retrieval per user.
 * Supports Mem0 Cloud API (with infer=true automatic deduplication) when MEM0_API_KEY is present,
 * and directly persists into the Neon/Postgres `user_memories` table.
 */

import { eq, desc, and } from "drizzle-orm";
import { getDb } from "@/db";
import { userMemories } from "@/db/schema";
import { ensureDbUser } from "@/lib/users";
import { isMockModeForced } from "@/lib/env";

export type MemoryItem = {
  id: string;
  memory: string;
  category?: string;
  score?: number;
  createdAt?: string;
};

// In-memory cache & fallback when database is unconfigured
const localMemoryStore = new Map<string, MemoryItem[]>(); // userId -> memories[]

function isPlaceholderKey(key?: string | null): boolean {
  if (!key) return true;
  const s = key.trim().toLowerCase();
  return s.includes("m0-...") || s.includes("replace-with") || s.length < 15;
}

function isDbAvailable(): boolean {
  if (isMockModeForced()) return false;
  const v = process.env.DATABASE_URL;
  if (!v) return false;
  const s = v.trim().toLowerCase();
  if (s.includes("ep-xxx") || s.includes("user:password@ep-xxx") || s.length < 20) return false;
  return s.startsWith("postgresql");
}

// Categories where re-upload should replace the existing canonical entry
const RESUME_CATEGORIES = new Set([
  "resume_summary",
  "skills",
  "projects",
  "experience",
  "interests",
]);

/**
 * Add or update a long-term memory item for a user.
 * Automatically deduplicates matching memories and syncs to both PostgreSQL and Mem0 Cloud.
 */
export async function addMemory(
  userId: string,
  text: string,
  category = "general",
  options?: { replaceCategory?: boolean }
): Promise<{ success: boolean; memory?: MemoryItem }> {
  const cleanText = text.trim();
  if (!cleanText) return { success: false };

  const apiKey = process.env.MEM0_API_KEY;
  const shouldReplace = options?.replaceCategory ?? RESUME_CATEGORIES.has(category);

  // 1. Sync to Mem0 Cloud API with infer: true for intelligent deduplication
  if (apiKey && !isPlaceholderKey(apiKey)) {
    try {
      const res = await fetch("https://api.mem0.ai/v1/memories/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${apiKey}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: cleanText }],
          user_id: userId,
          infer: true, // Automatically deduplicates and merges similar memories
          metadata: { category },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`[mem0] Cloud memory synchronized for ${userId}:`, data);
      }
    } catch (err) {
      console.error("[mem0] Mem0 Cloud API call failed:", err);
    }
  }

  // 2. Persist to PostgreSQL user_memories table
  if (isDbAvailable()) {
    try {
      const dbUserId = await ensureDbUser({ id: userId, email: userId });
      const db = getDb();

      // If category is a replace category (e.g. resume_summary, skills), remove previous category entries
      if (shouldReplace) {
        await db
          .delete(userMemories)
          .where(and(eq(userMemories.userId, dbUserId), eq(userMemories.category, category)));
      } else {
        // Check if exact memory text already exists to prevent duplicate rows
        const existing = await db
          .select()
          .from(userMemories)
          .where(and(eq(userMemories.userId, dbUserId), eq(userMemories.memoryText, cleanText)))
          .limit(1);

        if (existing.length > 0) {
          return {
            success: true,
            memory: {
              id: existing[0].id,
              memory: existing[0].memoryText,
              category: existing[0].category ?? category,
              createdAt: existing[0].createdAt.toISOString(),
            },
          };
        }
      }

      // Insert new canonical memory row
      const [inserted] = await db
        .insert(userMemories)
        .values({
          userId: dbUserId,
          memoryText: cleanText,
          category,
          createdAt: new Date(),
        })
        .returning();

      if (inserted) {
        const memoryItem: MemoryItem = {
          id: inserted.id,
          memory: inserted.memoryText,
          category: inserted.category ?? category,
          createdAt: inserted.createdAt.toISOString(),
        };

        // Keep local cache in sync
        const currentLocal = localMemoryStore.get(userId) ?? [];
        const filteredLocal = shouldReplace
          ? currentLocal.filter((m) => m.category !== category)
          : currentLocal.filter((m) => m.memory.toLowerCase() !== cleanText.toLowerCase());
        localMemoryStore.set(userId, [memoryItem, ...filteredLocal].slice(0, 100));

        return { success: true, memory: memoryItem };
      }
    } catch (dbErr) {
      console.error("[mem0] Failed to persist to PostgreSQL user_memories, using local store:", dbErr);
    }
  }

  // 3. Fallback to local memory store
  const existing = localMemoryStore.get(userId) ?? [];
  const newItem: MemoryItem = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    memory: cleanText,
    category,
    createdAt: new Date().toISOString(),
  };

  let updatedList = existing;
  if (shouldReplace) {
    updatedList = existing.filter((m) => m.category !== category);
  } else {
    updatedList = existing.filter((m) => m.memory.toLowerCase() !== cleanText.toLowerCase());
  }

  updatedList.unshift(newItem);
  localMemoryStore.set(userId, updatedList.slice(0, 100));

  return { success: true, memory: newItem };
}

/**
 * Retrieve relevant long-term memories for a user.
 * Strategy:
 * 1. If Mem0 Cloud API is configured and query is present, use Mem0 semantic search (most accurate).
 * 2. Fall back to PostgreSQL `user_memories` table (fast, local persistence).
 * 3. Fall back to in-memory local cache.
 */
export async function getMemories(userId: string, query?: string): Promise<MemoryItem[]> {
  const apiKey = process.env.MEM0_API_KEY;

  // 1. If Mem0 Cloud API is configured, search semantic memories
  if (apiKey && !isPlaceholderKey(apiKey)) {
    try {
      let res: Response;
      if (query && query.trim()) {
        res = await fetch("https://api.mem0.ai/v1/memories/search/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${apiKey}`,
          },
          body: JSON.stringify({
            query: query.trim(),
            user_id: userId,
            limit: 10,
          }),
        });
      } else {
        res = await fetch(`https://api.mem0.ai/v1/memories/?user_id=${encodeURIComponent(userId)}`, {
          headers: {
            Authorization: `Token ${apiKey}`,
          },
        });
      }

      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.results ?? [];
        if (items.length > 0) {
          return items.map((m: Record<string, unknown>) => {
            const meta = (m.metadata as Record<string, unknown>) ?? {};
            return {
              id: String(m.id ?? `mem_${Date.now()}`),
              memory: String(m.memory ?? m.text ?? ""),
              category: String(meta.category ?? m.category ?? "general"),
              score: typeof m.score === "number" ? m.score : undefined,
              createdAt: String(m.created_at ?? m.createdAt ?? new Date().toISOString()),
            };
          });
        }
      }
    } catch (err) {
      console.error("[mem0] Mem0 Cloud search failed, falling back to PostgreSQL user_memories:", err);
    }
  }

  // 2. PostgreSQL user_memories table
  if (isDbAvailable()) {
    try {
      const dbUserId = await ensureDbUser({ id: userId, email: userId });
      const db = getDb();

      const rows = await db
        .select()
        .from(userMemories)
        .where(eq(userMemories.userId, dbUserId))
        .orderBy(desc(userMemories.createdAt))
        .limit(100);

      if (rows && rows.length > 0) {
        const items: MemoryItem[] = rows.map((r) => ({
          id: r.id,
          memory: r.memoryText,
          category: r.category ?? "general",
          createdAt: r.createdAt.toISOString(),
        }));

        if (!query || !query.trim()) {
          return items;
        }

        const q = query.toLowerCase();
        // Priority matching: resume context, skills, projects, and relevant keywords
        const matched = items.filter((m) => {
          const cat = (m.category || "").toLowerCase();
          if (cat === "resume_summary" || cat === "skills") return true; // always include baseline background & skills
          return q.split(/\s+/).some((term) => term.length > 2 && m.memory.toLowerCase().includes(term));
        });

        return (matched.length > 0 ? matched : items).slice(0, 10);
      }
    } catch (dbErr) {
      console.error("[mem0] DB fetch failed, falling back to local store:", dbErr);
    }
  }

  // 3. Fallback local memory store
  const memories = localMemoryStore.get(userId) ?? [];
  if (!query || !query.trim()) return memories.slice(0, 100);

  const q = query.toLowerCase();
  const matched = memories.filter((m) => {
    const cat = (m.category || "").toLowerCase();
    if (cat === "resume_summary" || cat === "skills") return true;
    return q.split(/\s+/).some((term) => term.length > 3 && m.memory.toLowerCase().includes(term));
  });

  return (matched.length > 0 ? matched : memories).slice(0, 10);
}

/**
 * Delete a memory item by ID from PostgreSQL, Mem0 Cloud, and local memory store.
 */
export async function deleteMemory(userId: string, memoryId: string): Promise<boolean> {
  // 1. Delete from PostgreSQL
  if (isDbAvailable()) {
    try {
      const dbUserId = await ensureDbUser({ id: userId, email: userId });
      const db = getDb();
      await db
        .delete(userMemories)
        .where(and(eq(userMemories.userId, dbUserId), eq(userMemories.id, memoryId)));
    } catch (dbErr) {
      console.error("[mem0] DB delete failed:", dbErr);
    }
  }

  // 2. Delete from Mem0 Cloud API
  const apiKey = process.env.MEM0_API_KEY;
  if (apiKey && !isPlaceholderKey(apiKey) && !memoryId.startsWith("mem_")) {
    try {
      await fetch(`https://api.mem0.ai/v1/memories/${encodeURIComponent(memoryId)}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Token ${apiKey}`,
        },
      });
    } catch (err) {
      console.error("[mem0] Mem0 Cloud delete failed:", err);
    }
  }

  // 3. Delete from local memory store
  const existing = localMemoryStore.get(userId) ?? [];
  const updated = existing.filter((m) => m.id !== memoryId);
  localMemoryStore.set(userId, updated);

  return true;
}

/**
 * Format long-term memory items for prompt context injection into mentors & orchestrator.
 */
export function formatMemoriesForPrompt(memories: MemoryItem[]): string {
  if (memories.length === 0) return "";

  const items = memories.map((m) => `• [${m.category || "context"}] ${m.memory}`).join("\n");
  return `<user_longterm_memory>
Mem0 Long-Term User Memories, Resume Highlights & Preferences:
${items}
</user_longterm_memory>`;
}
