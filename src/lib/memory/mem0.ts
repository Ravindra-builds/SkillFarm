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
import { isGuestSession } from "@/lib/guest";
import { cacheGet, cacheSet, cacheDel } from "@/lib/cache";

export type MemoryItem = {
  id: string;
  memory: string;
  category?: string;
  score?: number;
  createdAt?: string;
};

// Circuit breaker for Mem0 Cloud API to prevent repetitive timeouts during cloud outages / rate limits
let mem0CircuitBreakerUntil = 0;

function isMem0CloudAvailable(): boolean {
  return Date.now() >= mem0CircuitBreakerUntil;
}

function tripMem0CircuitBreaker(reason: string) {
  mem0CircuitBreakerUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
  console.warn(`[mem0] Circuit breaker tripped for 5 min (${reason}). Bypassing Mem0 Cloud to serve directly from PostgreSQL with 0ms delay.`);
}

// In-memory cache & fallback when database is unconfigured or user is in guest mode
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
 * Evaluates whether a chat message turn represents a high-signal milestone or periodic checkpoint
 * that warrants persisting to long-term memory.
 */
export function shouldPersistChatMemory(query: string, historyLength = 0, isHandoff = false): boolean {
  if (isHandoff) return true;
  if (!query || query.trim().length < 5) return false;

  const q = query.toLowerCase();

  // Explicit milestone, preference, stack choice, or recall intent
  const isHighSignal =
    q.includes("remember") ||
    q.includes("i prefer") ||
    q.includes("i'm switching") ||
    q.includes("i am switching") ||
    q.includes("my goal") ||
    q.includes("i'm targeting") ||
    q.includes("i am targeting") ||
    q.includes("i built") ||
    q.includes("i decided") ||
    q.includes("my stack") ||
    q.includes("my experience") ||
    q.includes("note that") ||
    q.includes("keep in mind");

  if (isHighSignal) return true;

  // Periodic checkpoint: every 6th message turn
  if (historyLength > 0 && (historyLength + 1) % 6 === 0) {
    return true;
  }

  return false;
}

/**
 * Add or update a long-term memory item for a user.
 * Automatically deduplicates matching memories and syncs to both PostgreSQL and Mem0 Cloud for authenticated users.
 * Guest users are strictly isolated to in-memory/local storage without consuming external resources.
 */
export async function addMemory(
  userId: string,
  text: string,
  category = "general",
  options?: { replaceCategory?: boolean }
): Promise<{ success: boolean; memory?: MemoryItem }> {
  const cleanText = text.trim();
  if (!cleanText) return { success: false };

  const isGuest = isGuestSession(userId);
  const apiKey = process.env.MEM0_API_KEY;
  const shouldReplace = options?.replaceCategory ?? RESUME_CATEGORIES.has(category);

  // 1. Sync to Mem0 Cloud API (Protected: strictly skipped for Guest Mode & tripped circuit breaker)
  if (!isGuest && apiKey && !isPlaceholderKey(apiKey) && isMem0CloudAvailable()) {
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
        signal: AbortSignal.timeout(1500),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`[mem0] Cloud memory synchronized for ${userId}:`, data);
      } else if (res.status === 429 || res.status >= 500) {
        tripMem0CircuitBreaker(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.error("[mem0] Mem0 Cloud API call failed, persisting locally/DB:", err);
      tripMem0CircuitBreaker(err instanceof Error ? err.message : "timeout/error");
    }
  }

  // 2. Persist to PostgreSQL user_memories table (Protected: strictly skipped for Guest Mode)
  if (!isGuest && isDbAvailable()) {
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

        // Invalidate context cache & memories list cache
        cacheDel(`user-ctx:${userId}`).catch(() => {});
        cacheDel(`memories-list:${userId}`).catch(() => {});

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
  // Invalidate context cache & memories list cache so fresh memory is immediately accessible
  cacheDel(`user-ctx:${userId}`).catch(() => {});
  cacheDel(`memories-list:${userId}`).catch(() => {});

  return { success: true, memory: newItem };
}

/**
 * Retrieve relevant long-term memories for a user.
 * Strategy:
 * 0. If querying general list (!query), check fast 5-minute Redis/memory cache.
 * 1. If Mem0 Cloud API is configured, healthy, and query is present, use Mem0 semantic search.
 * 2. Fall back to PostgreSQL `user_memories` table (fast, local persistence).
 * 3. Fall back to in-memory local cache.
 */
export async function getMemories(userId: string, query?: string): Promise<MemoryItem[]> {
  const isGuest = isGuestSession(userId);
  const apiKey = process.env.MEM0_API_KEY;
  const listCacheKey = `memories-list:${userId}`;
  const isGeneralListQuery = !query || !query.trim();

  // 0. Check fast cache for general memory list requests (e.g. Settings / Dashboard)
  if (isGeneralListQuery) {
    try {
      const cached = await cacheGet<MemoryItem[]>(listCacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return cached;
      }
    } catch {
      // Non-fatal cache miss
    }
  }

  // 1. If Mem0 Cloud API is configured & healthy, search semantic memories (Skipped for Guest Mode & Tripped Breaker)
  if (!isGuest && apiKey && !isPlaceholderKey(apiKey) && isMem0CloudAvailable()) {
    try {
      let res: Response;
      if (!isGeneralListQuery) {
        res = await fetch("https://api.mem0.ai/v1/memories/search/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${apiKey}`,
          },
          body: JSON.stringify({
            query: query!.trim(),
            user_id: userId,
            limit: 10,
          }),
          signal: AbortSignal.timeout(1500),
        });
      } else {
        res = await fetch(`https://api.mem0.ai/v1/memories/?user_id=${encodeURIComponent(userId)}`, {
          headers: {
            Authorization: `Token ${apiKey}`,
          },
          signal: AbortSignal.timeout(1500),
        });
      }

      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.results ?? [];
        if (items.length > 0) {
          const parsedItems: MemoryItem[] = items.map((m: Record<string, unknown>) => {
            const meta = (m.metadata as Record<string, unknown>) ?? {};
            return {
              id: String(m.id ?? `mem_${Date.now()}`),
              memory: String(m.memory ?? m.text ?? ""),
              category: String(meta.category ?? m.category ?? "general"),
              score: typeof m.score === "number" ? m.score : undefined,
              createdAt: String(m.created_at ?? m.createdAt ?? new Date().toISOString()),
            };
          });

          if (isGeneralListQuery) {
            cacheSet(listCacheKey, parsedItems, 300).catch(() => {});
          }

          return parsedItems;
        }
      } else if (res.status === 429 || res.status >= 500) {
        tripMem0CircuitBreaker(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn("[mem0] Mem0 Cloud search failed/timed out, falling back immediately to PostgreSQL user_memories:", err);
      tripMem0CircuitBreaker(err instanceof Error ? err.message : "timeout/error");
    }
  }

  // 2. PostgreSQL user_memories table (Skipped for Guest Mode)
  if (!isGuest && isDbAvailable()) {
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

        if (isGeneralListQuery) {
          cacheSet(listCacheKey, items, 300).catch(() => {});
          return items;
        }

        const q = query!.toLowerCase();
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
  if (isGeneralListQuery) {
    const list = memories.slice(0, 100);
    cacheSet(listCacheKey, list, 300).catch(() => {});
    return list;
  }

  const q = query!.toLowerCase();
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
  const isGuest = isGuestSession(userId);

  // 1. Delete from PostgreSQL (Skipped for Guest Mode)
  if (!isGuest && isDbAvailable()) {
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

  // 2. Delete from Mem0 Cloud API (Skipped for Guest Mode & Tripped Breaker)
  const apiKey = process.env.MEM0_API_KEY;
  if (!isGuest && apiKey && !isPlaceholderKey(apiKey) && isMem0CloudAvailable() && !memoryId.startsWith("mem_")) {
    try {
      await fetch(`https://api.mem0.ai/v1/memories/${encodeURIComponent(memoryId)}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Token ${apiKey}`,
        },
        signal: AbortSignal.timeout(1500),
      });
    } catch (err) {
      console.error("[mem0] Mem0 Cloud delete failed:", err);
    }
  }

  // 3. Delete from local memory store
  const existing = localMemoryStore.get(userId) ?? [];
  const updated = existing.filter((m) => m.id !== memoryId);
  localMemoryStore.set(userId, updated);

  // Invalidate context cache & memories list cache on delete
  cacheDel(`user-ctx:${userId}`).catch(() => {});
  cacheDel(`memories-list:${userId}`).catch(() => {});

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
