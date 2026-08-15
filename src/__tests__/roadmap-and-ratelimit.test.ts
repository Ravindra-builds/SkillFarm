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

    // Verify first node starts as current and second starts as next
    expect(roadmap.nodes[0].status).toBe("current");
    expect(roadmap.nodes[1].status).toBe("next");
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

  it("synchronizes projects with roadmap milestones and preserves user repo URLs", async () => {
    const { generateProjectsFromRoadmap } = await import("@/agents/projects/generator");
    const { saveProjects, getProjects, updateProject } = await import("@/lib/project-store");

    const userId = `proj-user-${Date.now()}`;
    const roadmap = generateStaticRoadmap({
      userId,
      profile: mockProfile,
    });

    // Generate initial projects from roadmap
    const initialProjects = generateProjectsFromRoadmap(userId, roadmap.nodes);
    expect(initialProjects.length).toBe(roadmap.nodes.length);
    expect(initialProjects[0].week).toBeDefined();

    await saveProjects(userId, initialProjects);

    // User adds GitHub repo URL
    const firstProj = initialProjects[0];
    await updateProject(userId, firstProj.id, {
      repoUrl: "https://github.com/developer/node-fundamentals-app",
      status: "in-progress",
    });

    const saved = await getProjects(userId);
    const updated = saved.find((p) => p.id === firstProj.id);
    expect(updated?.repoUrl).toBe("https://github.com/developer/node-fundamentals-app");
    expect(updated?.status).toBe("in-progress");

    // Re-sync with roadmap (should preserve repoUrl)
    const reSynced = generateProjectsFromRoadmap(userId, roadmap.nodes, saved);
    const reSyncedFirst = reSynced.find((p) => p.id === firstProj.id);
    expect(reSyncedFirst?.repoUrl).toBe("https://github.com/developer/node-fundamentals-app");
    expect(reSyncedFirst?.status).toBe("in-progress");
  });

  it("generates ONE unified capstone project and manages weekly task checklists with unlock logic", async () => {
    const { syncCapstoneFromRoadmap, toggleCapstoneTask, updateCapstoneRepo } = await import("@/lib/project-store");

    const userId = `capstone-user-${Date.now()}`;
    const roadmap = generateStaticRoadmap({
      userId,
      profile: mockProfile,
    });

    // 1. Verify Capstone metadata
    expect(roadmap.capstoneProject).toBeDefined();
    expect(roadmap.capstoneProject?.name).toBe("CloudScale API Engine");
    expect(roadmap.capstoneProject?.stack.length).toBeGreaterThan(0);
    expect(roadmap.capstoneProject?.features.length).toBeGreaterThan(0);

    // 2. Synchronize Capstone state
    const capstoneState = syncCapstoneFromRoadmap(userId, roadmap);
    expect(capstoneState.name).toBe("CloudScale API Engine");
    expect(capstoneState.tasks.length).toBeGreaterThan(0);
    expect(capstoneState.unlockedWeeks).toContain(1);

    // 3. Complete all tasks for Week 1 to verify auto-unlock of Week 2
    const week1Tasks = capstoneState.tasks.filter((t) => t.week === 1);
    expect(week1Tasks.length).toBeGreaterThan(0);

    const { saveCapstoneProject, getCapstoneProject } = await import("@/lib/project-store");
    await saveCapstoneProject(userId, capstoneState);

    for (const t of week1Tasks) {
      await toggleCapstoneTask(userId, t.id, true);
    }

    const updatedCapstone = await getCapstoneProject(userId);
    expect(updatedCapstone?.unlockedWeeks).toContain(2);

    // 4. Update Repo URL and verify persistence
    await updateCapstoneRepo(userId, "https://github.com/test-user/cloudscale-api");
    const withRepo = await getCapstoneProject(userId);
    expect(withRepo?.repoUrl).toBe("https://github.com/test-user/cloudscale-api");
  });

  it("produces Concept-First weekly modules with mental models, drills, and Main-Project application", () => {
    const userId = `concept-first-${Date.now()}`;
    const roadmap = generateStaticRoadmap({
      userId,
      profile: mockProfile,
    });

    const firstNode = roadmap.nodes[0];
    // Concept-first fields
    expect(firstNode.topic).toBeDefined();
    expect(firstNode.learningObjectives?.length).toBeGreaterThan(0);
    expect(firstNode.concepts?.length).toBeGreaterThan(0);
    expect(firstNode.mentalModels?.length).toBeGreaterThan(0);
    expect(firstNode.practicalTask).toBeDefined();
    expect(firstNode.capstoneApplication?.length).toBeGreaterThan(0);
    expect(firstNode.featureCompleted).toBeDefined();
  });
});
