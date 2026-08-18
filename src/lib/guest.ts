/**
 * SkillFarm Guest Mode & Storage Isolation Engine
 *
 * Architecture:
 * - Authenticated: PostgreSQL -> Mem0 -> Persistent storage
 * - Guest: Upstash Redis with TTL -> Ephemeral Sandbox -> Automatic Expiration
 *
 * Configurable session limits:
 * - Roadmap: 1 live generation per session (limited demo scope ~2 weeks), fallback to starter templates
 * - Resources: 2 external web searches per session (global cache hits do NOT consume quota)
 * - Mentor Chat: 10 messages/conversation, 25 total messages/session, max 3 conversations
 * - Resume: 1 upload per session (stored temporarily in Redis profile, no Mem0/DB)
 */

import { getRedis } from "@/lib/redis";
import { createHash } from "crypto";

// ── Configurable Environment & Default Limits ──────────────────────────────
export const GUEST_CONFIG = {
  // Session TTL in seconds (default: 7200s = 2 hours)
  SESSION_TTL: parseInt(process.env.GUEST_SESSION_TTL || "7200", 10),

  // Feature limits per guest session
  ROADMAP_LIMIT: parseInt(process.env.GUEST_ROADMAP_LIMIT || "1", 10),
  ROADMAP_WEEKS: parseInt(process.env.GUEST_ROADMAP_WEEKS || "2", 10),
  RESOURCE_SEARCH_LIMIT: parseInt(process.env.GUEST_RESOURCE_SEARCH_LIMIT || "2", 10),
  MAX_CONVERSATIONS: parseInt(process.env.GUEST_MAX_CONVERSATIONS || "3", 10),
  MESSAGES_PER_CONVERSATION: parseInt(process.env.GUEST_MESSAGES_PER_CONVERSATION || "10", 10),
  TOTAL_MESSAGES: parseInt(process.env.GUEST_TOTAL_MESSAGES || "20", 10),
  RESUME_UPLOAD_LIMIT: parseInt(process.env.GUEST_RESUME_UPLOAD_LIMIT || "1", 10),

  // Message ceilings for cost protection
  MAX_INPUT_SIZE: parseInt(process.env.GUEST_MAX_INPUT_SIZE || "1000", 10),
  MAX_OUTPUT_TOKENS: parseInt(process.env.GUEST_MAX_OUTPUT_TOKENS || "600", 10),

  // IP Abuse protection: max guest sessions per IP per 10-minute window
  IP_BURST_LIMIT: parseInt(process.env.GUEST_IP_BURST_LIMIT || "20", 10),
  IP_BURST_WINDOW_SEC: 600, // 10 minutes
} as const;

export const GUEST_USER_ID = "guest-preview-user";

/**
 * Returns true if the user identifier represents an anonymous/guest session.
 */
export function isGuestSession(userId?: string | null): boolean {
  if (!userId) return true;
  const s = userId.trim().toLowerCase();
  return (
    s === GUEST_USER_ID ||
    s.startsWith("guest_") ||
    s.includes("guest") ||
    s.endsWith("@skillfarm.local") ||
    s === "guest" ||
    s === "guest-user" ||
    s === "alex (guest)"
  );
}

// ── Redis Key Namespaces ───────────────────────────────────────────────────
export const guestKeys = {
  profile: (guestId: string) => `guest:${guestId}:profile`,
  roadmap: (guestId: string) => `guest:${guestId}:roadmap`,
  projects: (guestId: string) => `guest:${guestId}:projects`,
  conversations: (guestId: string) => `guest:${guestId}:conversations`,
  conversation: (guestId: string, convoId: string) => `guest:${guestId}:conversation:${convoId}`,
  messages: (guestId: string, convoId: string) => `guest:${guestId}:messages:${convoId}`,
  usage: (guestId: string) => `guest:${guestId}:usage`,
  ipRate: (ipHash: string) => `guest-ip:${ipHash}:rate`,
  globalResourceCache: (normalizedTopic: string, level = "intermediate") =>
    `resource-cache:${normalizedTopic}:${level}`,
};

// ── In-Memory Ephemeral Fallback Store (when Redis is unconfigured) ─────────
type GuestUsageData = {
  roadmapGenerations: number;
  resourceSearches: number;
  resumeUploads: number;
  totalMessages: number;
  conversationsCreated: number;
  conversationMessageCounts: Record<string, number>;
  createdAt: number;
};

const memGuestStore = new Map<string, { value: unknown; expiresAt: number }>();
const memGuestUsage = new Map<string, GuestUsageData>();

function getMem<T>(key: string): T | null {
  const item = memGuestStore.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memGuestStore.delete(key);
    return null;
  }
  return item.value as T;
}

function setMem(key: string, value: unknown, ttlSec = GUEST_CONFIG.SESSION_TTL): void {
  memGuestStore.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

function deleteMem(key: string): void {
  memGuestStore.delete(key);
}

// ── Guest State Redis Helpers ──────────────────────────────────────────────
export async function getGuestState<T>(key: string): Promise<T | null> {
  const redis = await getRedis();
  if (redis) {
    try {
      const data = await redis.get(key);
      if (data !== null) {
        if (typeof data === "string") {
          try {
            return JSON.parse(data) as T;
          } catch {
            return data as unknown as T;
          }
        }
        return data as T;
      }
    } catch (err) {
      console.error(`[guest-storage] Redis get failed for ${key}:`, err);
    }
  }
  return getMem<T>(key);
}

export async function setGuestState(
  key: string,
  value: unknown,
  ttlSec = GUEST_CONFIG.SESSION_TTL
): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    try {
      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      await redis.set(key, serialized, { ex: ttlSec });
    } catch (err) {
      console.error(`[guest-storage] Redis set failed for ${key}:`, err);
    }
  }
  setMem(key, value, ttlSec);
}

export async function deleteGuestState(key: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.del(key);
    } catch (err) {
      console.error(`[guest-storage] Redis delete failed for ${key}:`, err);
    }
  }
  deleteMem(key);
}

// ── Guest Usage & Server-Side Quota Enforcement ────────────────────────────
export async function getGuestUsage(guestId: string): Promise<GuestUsageData> {
  const key = guestKeys.usage(guestId);
  const state = await getGuestState<GuestUsageData>(key);
  if (state) return state;

  const fallback = memGuestUsage.get(guestId);
  if (fallback) return fallback;

  const fresh: GuestUsageData = {
    roadmapGenerations: 0,
    resourceSearches: 0,
    resumeUploads: 0,
    totalMessages: 0,
    conversationsCreated: 0,
    conversationMessageCounts: {},
    createdAt: Date.now(),
  };
  await setGuestState(key, fresh, GUEST_CONFIG.SESSION_TTL);
  memGuestUsage.set(guestId, fresh);
  return fresh;
}

export async function checkGuestQuota(
  guestId: string,
  action: "roadmap" | "resource" | "chat" | "resume" | "conversation",
  options?: { conversationId?: string }
): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  reason?: string;
  conversionNotice?: string;
}> {
  const usage = await getGuestUsage(guestId);

  switch (action) {
    case "roadmap": {
      const limit = GUEST_CONFIG.ROADMAP_LIMIT;
      const allowed = usage.roadmapGenerations < limit;
      return {
        allowed,
        remaining: Math.max(0, limit - usage.roadmapGenerations),
        limit,
        reason: allowed ? undefined : "Guest roadmap generation quota reached.",
        conversionNotice: "Create a free account to generate unlimited customized multi-week roadmaps and sync your learning path to the cloud.",
      };
    }
    case "resource": {
      const limit = GUEST_CONFIG.RESOURCE_SEARCH_LIMIT;
      const allowed = usage.resourceSearches < limit;
      return {
        allowed,
        remaining: Math.max(0, limit - usage.resourceSearches),
        limit,
        reason: allowed ? undefined : "Guest resource search quota reached.",
        conversionNotice: "Create a free account to unlock unlimited live resource discovery and deep web research.",
      };
    }
    case "resume": {
      const limit = GUEST_CONFIG.RESUME_UPLOAD_LIMIT;
      const allowed = usage.resumeUploads < limit;
      return {
        allowed,
        remaining: Math.max(0, limit - usage.resumeUploads),
        limit,
        reason: allowed ? undefined : "Guest resume analysis quota reached.",
        conversionNotice: "Create a free account to save your resume profile and extract persistent career skill matrices.",
      };
    }
    case "conversation": {
      const limit = GUEST_CONFIG.MAX_CONVERSATIONS;
      const allowed = usage.conversationsCreated < limit;
      return {
        allowed,
        remaining: Math.max(0, limit - usage.conversationsCreated),
        limit,
        reason: allowed ? undefined : "Guest conversation limit reached.",
        conversionNotice: "Create a free account to start unlimited conversations with your AI engineering team.",
      };
    }
    case "chat": {
      const totalLimit = GUEST_CONFIG.TOTAL_MESSAGES;
      if (usage.totalMessages >= totalLimit) {
        return {
          allowed: false,
          remaining: 0,
          limit: totalLimit,
          reason: "Total guest session message limit reached.",
          conversionNotice: "Create a free account to continue mentor conversations with unlimited streaming replies and cloud memory.",
        };
      }

      if (options?.conversationId) {
        const convoLimit = GUEST_CONFIG.MESSAGES_PER_CONVERSATION;
        const currentInConvo = usage.conversationMessageCounts[options.conversationId] || 0;
        if (currentInConvo >= convoLimit) {
          return {
            allowed: false,
            remaining: 0,
            limit: convoLimit,
            reason: "Per-conversation message limit reached.",
            conversionNotice: "Create a free account to unlock continuous deep mentor threads and persistent conversation history.",
          };
        }
      }

      return {
        allowed: true,
        remaining: Math.max(0, totalLimit - usage.totalMessages),
        limit: totalLimit,
      };
    }
  }
}

export async function recordGuestAction(
  guestId: string,
  action: "roadmap" | "resource" | "chat" | "resume" | "conversation",
  options?: { conversationId?: string }
): Promise<void> {
  const usage = await getGuestUsage(guestId);

  if (action === "roadmap") usage.roadmapGenerations++;
  if (action === "resource") usage.resourceSearches++;
  if (action === "resume") usage.resumeUploads++;
  if (action === "conversation") usage.conversationsCreated++;
  if (action === "chat") {
    usage.totalMessages++;
    if (options?.conversationId) {
      usage.conversationMessageCounts[options.conversationId] =
        (usage.conversationMessageCounts[options.conversationId] || 0) + 1;
    }
  }

  const key = guestKeys.usage(guestId);
  await setGuestState(key, usage, GUEST_CONFIG.SESSION_TTL);
  memGuestUsage.set(guestId, usage);
}

// ── IP Abuse Protection (Independent of Guest Session) ─────────────────────
export async function checkGuestIpAbuse(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  // Hash IP to avoid storing raw client IP addresses
  const safeHash = createHash("sha256").update(ip || "127.0.0.1").digest("hex").slice(0, 16);
  const key = guestKeys.ipRate(safeHash);

  const redis = await getRedis();
  if (redis) {
    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, GUEST_CONFIG.IP_BURST_WINDOW_SEC);
      }
      return {
        allowed: current <= GUEST_CONFIG.IP_BURST_LIMIT,
        remaining: Math.max(0, GUEST_CONFIG.IP_BURST_LIMIT - current),
      };
    } catch (err) {
      console.error("[guest-ip-limit] Redis error:", err);
    }
  }

  return { allowed: true, remaining: GUEST_CONFIG.IP_BURST_LIMIT };
}

// ── Contextual Mentor Fallback Responses for Guests ────────────────────────
export function getGuestTemplateChatResponse(mentorId: string, userMessage: string): string {
  const q = userMessage.toLowerCase();

  if (mentorId === "backend" || q.includes("api") || q.includes("database") || q.includes("sql") || q.includes("backend")) {
    return `### 🏗️ Backend Architectural Principles & Trade-offs

When designing robust backend systems, focus on the following foundational mental models:

1. **Validation at the Boundary**:
   - Always sanitize and validate incoming payloads at the HTTP layer using schemas (like \`zod\` or JSON schemas) before passing data to business logic.
   - Return structured error codes with RFC 7807 problem details rather than raw exception traces.

2. **Database Concurrency & Idempotency**:
   - For mutations and financial/state transactions, use database-level unique constraints and idempotency keys stored in Redis or PostgreSQL.
   - Keep transactions as short as possible to avoid table locking and contention.

3. **Layered Decoupling**:
   - \`Transport Layer\` (Controllers/Route Handlers) $\\rightarrow$ \`Domain Service\` (Business Logic) $\\rightarrow$ \`Repository Layer\` (Database/ORM).

> 💡 **Guest Notice**: You have reached the guest demo limit of live AI mentor messages. Create a free account with Google to continue your mentor conversations, unlock multi-mentor synthesis, and save your progress!`;
  }

  if (mentorId === "ai-engineer" || q.includes("ai") || q.includes("rag") || q.includes("embedding") || q.includes("llm")) {
    return `### 🤖 Production RAG & LLM System Design

Building resilient AI systems requires separating generation from evaluation:

1. **Chunking & Semantic Density**:
   - Chunk by semantic boundaries (markdown headers, code blocks) with 400-600 tokens and 10% overlap.
   - Attach metadata (source, topic, timestamp, access level) to vector embeddings for filtered similarity search.

2. **Hybrid Retrieval**:
   - Combine dense vector retrieval (cosine similarity) with BM25 sparse keyword search and cross-encoder re-ranking.
   - This ensures exact keyword matches (IDs, acronyms, library names) aren't lost in dense embeddings.

3. **Defensive Prompting & Guardrails**:
   - Treat all retrieved context as untrusted input.
   - Always run post-generation verification against a golden evaluation test suite.

> 💡 **Guest Notice**: You have reached the guest demo limit of live AI mentor messages. Create a free account with Google to continue your mentor conversations, unlock multi-mentor synthesis, and save your progress!`;
  }

  if (mentorId === "security" || q.includes("security") || q.includes("auth") || q.includes("jwt") || q.includes("token")) {
    return `### 🛡️ Cybersecurity & Threat Modeling

1. **Defense in Depth**:
   - Never rely on a single defensive layer. Enforce authentication at the gateway, authorization in business logic, and encryption at rest and in transit.
   
2. **Session & Token Hygiene**:
   - Store session cookies with \`HttpOnly\`, \`Secure\`, and \`SameSite=Lax\` flags.
   - Use short-lived access tokens with cryptographic rotation for sensitive APIs.

3. **Input Sanitization**:
   - Parameterize all database queries to eliminate SQL injection.
   - Strip malicious HTML and SVG vectors before storage or rendering.

> 💡 **Guest Notice**: You have reached the guest demo limit of live AI mentor messages. Create a free account with Google to continue your mentor conversations, unlock multi-mentor synthesis, and save your progress!`;
  }

  return `### 🧭 Engineering Guidance & Next Steps

Here is the recommended technical approach for your query:

1. **Understand Core Concepts First**: Break down the problem into fundamental data structures and algorithmic steps before jumping into boilerplate code.
2. **Design Before Implementation**: Define the API interfaces and schema contracts explicitly.
3. **Verify with Practical Deliverables**: Test edge cases and validate the output against production standards.

> 💡 **Guest Notice**: You have reached the guest demo limit of live AI mentor messages. Create a free account with Google to continue your mentor conversations, unlock multi-mentor synthesis, and save your progress!`;
}

// ── Migration Helper: Guest -> Authenticated Account ───────────────────────
export async function extractGuestDataForMigration(guestId: string) {
  const [profile, roadmap, projects] = await Promise.all([
    getGuestState<unknown>(guestKeys.profile(guestId)),
    getGuestState<unknown>(guestKeys.roadmap(guestId)),
    getGuestState<unknown>(guestKeys.projects(guestId)),
  ]);

  return {
    profile,
    roadmap,
    projects,
  };
}

export async function cleanupGuestData(guestId: string): Promise<void> {
  await Promise.all([
    deleteGuestState(guestKeys.profile(guestId)),
    deleteGuestState(guestKeys.roadmap(guestId)),
    deleteGuestState(guestKeys.projects(guestId)),
    deleteGuestState(guestKeys.conversations(guestId)),
    deleteGuestState(guestKeys.usage(guestId)),
  ]);
  memGuestUsage.delete(guestId);
}
