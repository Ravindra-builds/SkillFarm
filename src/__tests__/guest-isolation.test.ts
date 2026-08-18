import {
  isGuestSession,
  checkGuestQuota,
  recordGuestAction,
  getGuestTemplateChatResponse,
  GUEST_CONFIG,
  getGuestState,
  setGuestState,
  guestKeys,
  checkGuestIpAbuse,
} from "@/lib/guest";
import { addMemory, getMemories, deleteMemory } from "@/lib/memory/mem0";
import { getRoadmap, saveRoadmap } from "@/lib/roadmap-store";
import { getCapstoneProject, saveCapstoneProject } from "@/lib/project-store";
import { getLearningProfile, saveLearningProfile } from "@/lib/learning-profile";
import { migrateGuestStateToUser } from "@/lib/migration";

describe("Guest Mode & Temporary Storage Architecture", () => {
  it("correctly identifies guest sessions", () => {
    expect(isGuestSession(null)).toBe(true);
    expect(isGuestSession(undefined)).toBe(true);
    expect(isGuestSession("")).toBe(true);
    expect(isGuestSession("guest-preview-user")).toBe(true);
    expect(isGuestSession("alex@skillfarm.local")).toBe(true);
    expect(isGuestSession("guest_abc123")).toBe(true);
    expect(isGuestSession("alex.developer@gmail.com")).toBe(false);
    expect(isGuestSession("engineer@company.org")).toBe(false);
  });

  it("enforces session-based guest quotas for roadmap, resources, resume, and chat", async () => {
    const testGuestId = `guest_test_${Date.now()}`;

    // 1. Roadmap Quota (1 per session)
    const rmQuota1 = await checkGuestQuota(testGuestId, "roadmap");
    expect(rmQuota1.allowed).toBe(true);
    expect(rmQuota1.remaining).toBe(GUEST_CONFIG.ROADMAP_LIMIT);
    await recordGuestAction(testGuestId, "roadmap");
    const rmQuota2 = await checkGuestQuota(testGuestId, "roadmap");
    expect(rmQuota2.allowed).toBe(false);
    expect(rmQuota2.remaining).toBe(0);

    // 2. Resource Quota (2 per session)
    const resQuota1 = await checkGuestQuota(testGuestId, "resource");
    expect(resQuota1.allowed).toBe(true);
    expect(resQuota1.remaining).toBe(GUEST_CONFIG.RESOURCE_SEARCH_LIMIT);
    await recordGuestAction(testGuestId, "resource");
    await recordGuestAction(testGuestId, "resource");
    const resQuota2 = await checkGuestQuota(testGuestId, "resource");
    expect(resQuota2.allowed).toBe(false);

    // 3. Resume Upload Quota (1 per session)
    const resumeQuota1 = await checkGuestQuota(testGuestId, "resume");
    expect(resumeQuota1.allowed).toBe(true);
    await recordGuestAction(testGuestId, "resume");
    const resumeQuota2 = await checkGuestQuota(testGuestId, "resume");
    expect(resumeQuota2.allowed).toBe(false);

    // 4. Per-conversation Message Limit (10 per conversation)
    const convoId = "test-convo-1";
    for (let i = 0; i < GUEST_CONFIG.MESSAGES_PER_CONVERSATION; i++) {
      const q = await checkGuestQuota(testGuestId, "chat", { conversationId: convoId });
      expect(q.allowed).toBe(true);
      await recordGuestAction(testGuestId, "chat", { conversationId: convoId });
    }
    const qBlocked = await checkGuestQuota(testGuestId, "chat", { conversationId: convoId });
    expect(qBlocked.allowed).toBe(false);
    expect(qBlocked.conversionNotice).toBeDefined();
  });

  it("safely stores and retrieves temporary guest state in Redis/memory with TTL", async () => {
    const guestId = `guest_store_${Date.now()}`;
    const testProfile = {
      id: `guest_${guestId}`,
      userId: guestId,
      goal: "Master Distributed Systems",
      currentLevel: "intermediate" as const,
      knownSkills: ["Go", "Docker"],
      weeklyHours: 12,
      learningStyle: "hands-on" as const,
      format: "projects" as const,
      updatedAt: new Date(),
    };

    await setGuestState(guestKeys.profile(guestId), testProfile, 3600);
    const retrieved = await getGuestState<typeof testProfile>(guestKeys.profile(guestId));
    expect(retrieved).not.toBeNull();
    expect(retrieved?.goal).toBe("Master Distributed Systems");
    expect(retrieved?.knownSkills).toContain("Go");
  });

  it("stores roadmap and projects in temporary sandbox for guest sessions", async () => {
    const guestId = `guest_sandbox_${Date.now()}`;

    const profileRes = await saveLearningProfile(guestId, {
      goal: "Full-Stack Engineer",
      currentLevel: "beginner",
      knownSkills: ["JavaScript"],
      weeklyHours: 10,
      learningStyle: "mixed",
      format: "mixed",
    });
    expect(profileRes.ok).toBe(true);

    const retrievedProfile = await getLearningProfile(guestId);
    expect(retrievedProfile?.goal).toBe("Full-Stack Engineer");

    const savedRoadmap = await saveRoadmap(guestId, {
      id: `rm_${guestId}`,
      userId: guestId,
      title: "Full-Stack Track",
      description: "Starter Track",
      nodes: [
        {
          id: "node_1",
          slug: "js-foundations",
          title: "JavaScript Foundations",
          description: "Learn JS runtime",
          whyItMatters: "Core language",
          difficulty: "beginner",
          prerequisites: [],
          relatedConcepts: [],
          practicalTask: "Build counter",
          projectBrief: "Build counter",
          commonMistakes: [],
          mentorId: "backend",
          order: 0,
          status: "current",
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(savedRoadmap.title).toBe("Full-Stack Track");
    const loadedRoadmap = await getRoadmap(guestId);
    expect(loadedRoadmap?.title).toBe("Full-Stack Track");
  });

  it("protects against IP abuse burst creations", async () => {
    const testIp = "198.51.100.42";
    const ipCheck = await checkGuestIpAbuse(testIp);
    expect(ipCheck.allowed).toBe(true);
    expect(ipCheck.remaining).toBeGreaterThan(0);
  });

  it("successfully extracts and cleans up guest state during migration to authenticated account", async () => {
    const guestId = `guest_migrate_${Date.now()}`;
    const authUserId = "real-user@company.com";

    // Setup temporary guest profile and roadmap
    await saveLearningProfile(guestId, {
      goal: "Senior Backend Architect",
      currentLevel: "advanced",
      knownSkills: ["Rust", "PostgreSQL", "Kafka"],
      weeklyHours: 15,
      learningStyle: "hands-on",
      format: "projects",
    });

    await saveRoadmap(guestId, {
      id: `rm_mig_${Date.now()}`,
      userId: guestId,
      title: "Rust Architecture",
      description: "Production Rust",
      nodes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const migration = await migrateGuestStateToUser(guestId, authUserId);
    expect(migration.success).toBe(true);
    expect(migration.migrated.profile).toBe(true);
    expect(migration.migrated.roadmap).toBe(true);
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

  it("safely persists mentor handoffs in memory/Redis for guests without DB foreign key errors", async () => {
    const { saveHandoff, getHandoffs } = await import("@/lib/handoff-store");
    const { createConversation } = await import("@/lib/chat-store");

    const guestId = `guest_handoff_${Date.now()}`;
    const conv = await createConversation(guestId, "Architecture discussion", "backend");

    const handoff = await saveHandoff(
      conv.id,
      "backend",
      "system-design",
      "User requested high-scale distributed system review"
    );

    expect(handoff.id).toBeDefined();
    expect(handoff.toMentorId).toBe("system-design");

    const history = await getHandoffs(conv.id);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].toMentorId).toBe("system-design");
  });

  it("strictly restricts capstone week unlocks to max Week 2 for guest demo sessions", async () => {
    const { toggleCapstoneTask, getCapstoneProject, saveCapstoneProject } = await import("@/lib/project-store");
    const guestId = `guest_capstone_${Date.now()}`;

    const initialState = {
      id: `cp_${guestId}`,
      userId: guestId,
      name: "Portfolio Microservices",
      description: "Demo project",
      goalAlignment: "Backend skills",
      stack: ["Node.js", "PostgreSQL"],
      features: ["Week 1: Core", "Week 2: Auth", "Week 3: Kafka", "Week 4: K8s"],
      currentWeek: 1,
      unlockedWeeks: [1],
      tasks: [
        { id: "t1", week: 1, title: "Task 1", completed: false },
        { id: "t2", week: 2, title: "Task 2", completed: false },
        { id: "t3", week: 3, title: "Task 3", completed: false },
      ],
      updatedAt: new Date(),
    };

    await saveCapstoneProject(guestId, initialState);

    // Complete Week 1 -> Unlocks Week 2
    const afterW1 = await toggleCapstoneTask(guestId, "t1", true);
    expect(afterW1?.unlockedWeeks).toContain(2);

    // Complete Week 2 -> Must NOT unlock Week 3 for guest sessions
    const afterW2 = await toggleCapstoneTask(guestId, "t2", true);
    expect(afterW2?.unlockedWeeks).not.toContain(3);
    expect(Math.max(...(afterW2?.unlockedWeeks || [1]))).toBeLessThanOrEqual(2);
  });
});
