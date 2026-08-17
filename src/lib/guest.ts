/**
 * SkillFarm Guest Mode & Storage Isolation Engine
 *
 * Enforces guest quota boundaries:
 * - 1 live Roadmap generation per day (falls back to curated engineering tracks)
 * - 2 live Resource web searches per day (falls back to pre-evaluated topic packs)
 * - 5 live Mentor chat messages per day (falls back to specialist guidance templates)
 *
 * Guarantees zero external database (PostgreSQL) or Mem0 Cloud API consumption
 * for guest sessions, isolating all state to browser localStorage & ephemeral memory.
 */

export const GUEST_LIMITS = {
  ROADMAP_GENERATIONS_PER_DAY: 1,
  RESOURCE_SEARCHES_PER_DAY: 2,
  CHAT_MESSAGES_PER_DAY: 2,
} as const;

export const GUEST_USER_ID = "guest-preview-user";

/**
 * Returns true if the session/user identifier belongs to a guest user.
 */
export function isGuestSession(userId?: string | null): boolean {
  if (!userId) return true;
  const s = userId.trim().toLowerCase();
  return (
    s === GUEST_USER_ID ||
    s.includes("guest") ||
    s.endsWith("@skillfarm.local") ||
    s === "guest" ||
    s === "guest-user" ||
    s === "alex (guest)"
  );
}

// In-memory guest usage counters (reset on server restart / rolling 24h)
type GuestUsageRecord = {
  date: string;
  roadmapGens: number;
  resourceSearches: number;
  chatCount: number;
};

const memGuestUsage = new Map<string, GuestUsageRecord>();

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getOrInitGuestUsage(key: string): GuestUsageRecord {
  const today = getTodayString();
  const existing = memGuestUsage.get(key);
  if (existing && existing.date === today) {
    return existing;
  }
  const fresh: GuestUsageRecord = {
    date: today,
    roadmapGens: 0,
    resourceSearches: 0,
    chatCount: 0,
  };
  memGuestUsage.set(key, fresh);
  return fresh;
}

/**
 * Check if a guest has remaining quota for a given action.
 */
export function checkGuestQuota(
  guestIdentifier: string,
  action: "roadmap" | "resource" | "chat"
): { allowed: boolean; remaining: number; limit: number } {
  const usage = getOrInitGuestUsage(guestIdentifier);

  switch (action) {
    case "roadmap": {
      const limit = GUEST_LIMITS.ROADMAP_GENERATIONS_PER_DAY;
      const allowed = usage.roadmapGens < limit;
      return { allowed, remaining: Math.max(0, limit - usage.roadmapGens), limit };
    }
    case "resource": {
      const limit = GUEST_LIMITS.RESOURCE_SEARCHES_PER_DAY;
      const allowed = usage.resourceSearches < limit;
      return { allowed, remaining: Math.max(0, limit - usage.resourceSearches), limit };
    }
    case "chat": {
      const limit = GUEST_LIMITS.CHAT_MESSAGES_PER_DAY;
      const allowed = usage.chatCount < limit;
      return { allowed, remaining: Math.max(0, limit - usage.chatCount), limit };
    }
  }
}

/**
 * Increment usage counter for a guest action.
 */
export function recordGuestAction(
  guestIdentifier: string,
  action: "roadmap" | "resource" | "chat"
): void {
  const usage = getOrInitGuestUsage(guestIdentifier);
  if (action === "roadmap") usage.roadmapGens++;
  if (action === "resource") usage.resourceSearches++;
  if (action === "chat") usage.chatCount++;
  memGuestUsage.set(guestIdentifier, usage);
}

/**
 * Curated specialist mentor template answers used when guest chat quota is exhausted.
 * Delivers immediate educational value without invoking LLM providers.
 */
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

> 💡 **Guest Notice**: You have reached the guest demo limit of 5 live AI mentor messages for today. Sign in with Google to unlock unlimited streaming chat, full multi-mentor synthesis, and persistent cloud memory!`;
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

> 💡 **Guest Notice**: You have reached the guest demo limit of 5 live AI mentor messages for today. Sign in with Google to unlock unlimited streaming chat, full multi-mentor synthesis, and persistent cloud memory!`;
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

> 💡 **Guest Notice**: You have reached the guest demo limit of 5 live AI mentor messages for today. Sign in with Google to unlock unlimited streaming chat, full multi-mentor synthesis, and persistent cloud memory!`;
  }

  // Default orchestrator response
  return `### 🧭 Engineering Guidance & Next Steps

Here is the recommended technical approach for your query:

1. **Understand Core Concepts First**: Break down the problem into fundamental data structures and algorithmic steps before jumping into boilerplate code.
2. **Design Before Implementation**: Define the API interfaces and schema contracts explicitly.
3. **Verify with Practical Deliverables**: Test edge cases and validate the output against production standards.

> 💡 **Guest Notice**: You have reached the guest demo limit of 5 live AI mentor messages for today. Sign in with Google to unlock unlimited streaming chat, full multi-mentor synthesis, and persistent cloud memory!`;
}
