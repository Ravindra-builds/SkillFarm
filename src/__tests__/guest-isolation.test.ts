import {
  isGuestSession,
  checkGuestQuota,
  recordGuestAction,
  getGuestTemplateChatResponse,
  GUEST_LIMITS,
} from "@/lib/guest";
import { addMemory, getMemories, deleteMemory } from "@/lib/memory/mem0";

describe("Guest Mode & Storage Isolation Engine", () => {
  it("correctly identifies guest sessions", () => {
    expect(isGuestSession(null)).toBe(true);
    expect(isGuestSession(undefined)).toBe(true);
    expect(isGuestSession("")).toBe(true);
    expect(isGuestSession("guest-preview-user")).toBe(true);
    expect(isGuestSession("alex@skillfarm.local")).toBe(true);
    expect(isGuestSession("guest-12345")).toBe(true);
    expect(isGuestSession("alex.developer@gmail.com")).toBe(false);
    expect(isGuestSession("engineer@company.org")).toBe(false);
  });

  it("enforces strict guest quotas for chat, roadmap, and resources", () => {
    const testGuestId = `test-guest-${Date.now()}`;

    // 1. Roadmap Quota (1/day)
    expect(checkGuestQuota(testGuestId, "roadmap").allowed).toBe(true);
    recordGuestAction(testGuestId, "roadmap");
    expect(checkGuestQuota(testGuestId, "roadmap").allowed).toBe(false);
    expect(checkGuestQuota(testGuestId, "roadmap").remaining).toBe(0);

    // 2. Resource Quota (2/day)
    expect(checkGuestQuota(testGuestId, "resource").remaining).toBe(GUEST_LIMITS.RESOURCE_SEARCHES_PER_DAY);
    recordGuestAction(testGuestId, "resource");
    recordGuestAction(testGuestId, "resource");
    expect(checkGuestQuota(testGuestId, "resource").allowed).toBe(false);

    // 3. Chat Quota (5/day)
    expect(checkGuestQuota(testGuestId, "chat").remaining).toBe(GUEST_LIMITS.CHAT_MESSAGES_PER_DAY);
    for (let i = 0; i < GUEST_LIMITS.CHAT_MESSAGES_PER_DAY; i++) {
      expect(checkGuestQuota(testGuestId, "chat").allowed).toBe(true);
      recordGuestAction(testGuestId, "chat");
    }
    expect(checkGuestQuota(testGuestId, "chat").allowed).toBe(false);
    expect(checkGuestQuota(testGuestId, "chat").remaining).toBe(0);
  });

  it("provides rich educational fallback templates without external LLMs when quota is exhausted", () => {
    const backendReply = getGuestTemplateChatResponse("backend", "How to design database schema?");
    expect(backendReply).toContain("Backend Architectural Principles");
    expect(backendReply).toContain("Guest Notice");

    const aiReply = getGuestTemplateChatResponse("ai-engineer", "How to build a RAG system?");
    expect(aiReply).toContain("Production RAG");
    expect(aiReply).toContain("Guest Notice");

    const secReply = getGuestTemplateChatResponse("security", "How to secure JWT tokens?");
    expect(secReply).toContain("Cybersecurity");
    expect(secReply).toContain("Defense in Depth");
  });

  it("isolates guest memories to local in-memory store without external DB or Mem0 errors", async () => {
    const guestUser = "guest-preview-user";
    const addRes = await addMemory(guestUser, "User loves TypeScript and Next.js", "skills");
    expect(addRes.success).toBe(true);
    expect(addRes.memory?.memory).toContain("TypeScript");

    const memories = await getMemories(guestUser);
    expect(memories.length).toBeGreaterThan(0);
    expect(memories[0].memory).toContain("TypeScript");

    const deleteRes = await deleteMemory(guestUser, addRes.memory!.id);
    expect(deleteRes).toBe(true);
  });
});
