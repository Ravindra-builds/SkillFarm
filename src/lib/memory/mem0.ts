/**
 * Mem0 AI Long-Term Memory Integration — Phase 10
 *
 * Provides long-term memory extraction and retrieval per user.
 * Supports Mem0 Cloud API when MEM0_API_KEY is present,
 * with structured memory fallback when unconfigured.
 */

export type MemoryItem = {
  id: string;
  memory: string;
  category?: string;
  score?: number;
  createdAt?: string;
};

const localMemoryStore = new Map<string, MemoryItem[]>(); // userId -> memories[]

function isPlaceholderKey(key?: string | null): boolean {
  if (!key) return true;
  const s = key.trim().toLowerCase();
  return s.includes("m0-...") || s.includes("replace-with") || s.length < 15;
}

/**
 * Add a memory item for a user (via Mem0 API or local fallback).
 */
export async function addMemory(
  userId: string,
  text: string,
  category = "general"
): Promise<{ success: boolean; memory?: MemoryItem }> {
  const apiKey = process.env.MEM0_API_KEY;

  if (apiKey && !isPlaceholderKey(apiKey)) {
    try {
      const res = await fetch("https://api.mem0.ai/v1/memories/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${apiKey}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
          user_id: userId,
          metadata: { category },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`[mem0] memory added for ${userId}:`, data);
        return { success: true };
      }
    } catch (err) {
      console.error("[mem0] API call failed, falling back to local store:", err);
    }
  }

  // Fallback to local memory store
  const existing = localMemoryStore.get(userId) ?? [];
  const newItem: MemoryItem = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    memory: text.trim(),
    category,
    createdAt: new Date().toISOString(),
  };

  // Prevent exact duplicate memories
  if (!existing.some((m) => m.memory.toLowerCase() === newItem.memory.toLowerCase())) {
    existing.unshift(newItem);
    localMemoryStore.set(userId, existing.slice(0, 50)); // Keep top 50
  }

  return { success: true, memory: newItem };
}

/**
 * Retrieve relevant long-term memories for a user and optional search query.
 */
export async function getMemories(userId: string, query?: string): Promise<MemoryItem[]> {
  const apiKey = process.env.MEM0_API_KEY;

  if (apiKey && !isPlaceholderKey(apiKey) && query) {
    try {
      const res = await fetch("https://api.mem0.ai/v1/memories/search/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          user_id: userId,
          limit: 5,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.results ?? [];
        return items.map((m: Record<string, unknown>) => ({
          id: String(m.id ?? ""),
          memory: String(m.memory ?? m.text ?? ""),
          score: typeof m.score === "number" ? m.score : undefined,
        }));
      }
    } catch (err) {
      console.error("[mem0] search failed, returning local store:", err);
    }
  }

  // Fallback local memory retrieval
  const memories = localMemoryStore.get(userId) ?? [];
  if (!query || !query.trim()) return memories.slice(0, 8);

  // Simple keyword relevance matching
  const q = query.toLowerCase();
  const matched = memories.filter((m) =>
    q.split(/\s+/).some((term) => term.length > 3 && m.memory.toLowerCase().includes(term))
  );

  return (matched.length > 0 ? matched : memories).slice(0, 6);
}

/**
 * Format long-term memory items for prompt context injection.
 */
export function formatMemoriesForPrompt(memories: MemoryItem[]): string {
  if (memories.length === 0) return "";

  const items = memories.map((m) => `• ${m.memory}`).join("\n");
  return `<user_longterm_memory>
Mem0 Long-Term User Memories & Past Decisions:
${items}
</user_longterm_memory>`;
}
