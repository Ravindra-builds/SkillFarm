import { getRateLimitRule, RATE_LIMITS } from "@/config/rate-limits";
import { checkFeatureRateLimit } from "@/lib/rate-limit";
import { generateStaticRoadmap } from "@/agents/roadmap/generator";
import { updateNodeStatus, updateNodeDetails, saveRoadmap, getRoadmap } from "@/lib/roadmap-store";

describe("Centralized Rate Limiting Configuration", () => {
  it("defines rules for all key features", () => {
    expect(RATE_LIMITS.roadmap).toBeDefined();
    expect(RATE_LIMITS.resume).toBeDefined();
    expect(RATE_LIMITS.chat).toBeDefined();
    expect(RATE_LIMITS.research).toBeDefined();

    expect(RATE_LIMITS.roadmap.prod.limit).toBe(2);
    expect(RATE_LIMITS.resume.prod.limit).toBe(2);
    expect(RATE_LIMITS.roadmap.dev.limit).toBe(10);
    expect(RATE_LIMITS.resume.dev.limit).toBe(10);
  });

  it("returns effective rule based on environment", () => {
    const rule = getRateLimitRule("roadmap");
    expect(rule.limit).toBeGreaterThan(0);
    expect(rule.windowSec).toBe(86400);
  });

  it("enforces sliding window limits on feature check", async () => {
    const testUserId = `test-user-${Date.now()}`;
    const result1 = await checkFeatureRateLimit(testUserId, "roadmap");
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBeLessThan(result1.limit);
  });
});

describe("Roadmap Generation & Milestone Management", () => {
  const mockProfile = {
    goal: "Become an expert Backend and System Design engineer",
    currentLevel: "intermediate" as const,
    knownSkills: ["Node.js", "Express"],
    weeklyHours: 12,
    learningStyle: "hands-on" as const,
    format: "mixed" as const,
  };

  it("generates a structured roadmap batched into consecutive weeks", () => {
    const roadmap = generateStaticRoadmap({
      userId: "test-user-backend",
      profile: mockProfile,
    });

    expect(roadmap.nodes.length).toBeGreaterThan(0);
    expect(roadmap.nodes[0].week).toBeDefined();
    expect(roadmap.nodes[0].estimatedHours).toBeGreaterThan(0);

    // Verify matching known skill marks as completed
    const nodeFundamentals = roadmap.nodes.find((n) => n.slug === "node-fundamentals");
    expect(nodeFundamentals?.status).toBe("completed");

    // Verify first non-known skill is set to current or next
    const currentOrNext = roadmap.nodes.some((n) => n.status === "current" || n.status === "next");
    expect(currentOrNext).toBe(true);
  });

  it("allows updating milestone status and node details", async () => {
    const userId = `edit-user-${Date.now()}`;
    const roadmap = generateStaticRoadmap({
      userId,
      profile: mockProfile,
    });

    await saveRoadmap(userId, roadmap);
    const targetNode = roadmap.nodes[roadmap.nodes.length - 1];

    // Update status
    const statusUpdated = await updateNodeStatus(userId, targetNode.id, "completed");
    expect(statusUpdated).not.toBeNull();
    const updatedNode = statusUpdated?.nodes.find((n) => n.id === targetNode.id);
    expect(updatedNode?.status).toBe("completed");

    // Update details (edit milestone)
    const detailsUpdated = await updateNodeDetails(userId, targetNode.id, {
      title: "Customized System Design Milestone",
      practicalTask: "Build a distributed rate limiter in Redis",
      estimatedHours: 8,
    });

    expect(detailsUpdated).not.toBeNull();
    const editedNode = detailsUpdated?.nodes.find((n) => n.id === targetNode.id);
    expect(editedNode?.title).toBe("Customized System Design Milestone");
    expect(editedNode?.practicalTask).toBe("Build a distributed rate limiter in Redis");
    expect(editedNode?.estimatedHours).toBe(8);
  });
});
