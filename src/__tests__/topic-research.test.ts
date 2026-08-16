import { buildTopicQueries, normalizeTopicKey, getTopicResourcePack } from "@/agents/research/topic-research";
import { scheduleRoadmapResearch } from "@/agents/research/roadmap-research-scheduler";
import { generateStaticRoadmap } from "@/agents/roadmap/generator";

describe("Roadmap-Driven Research & Resource Discovery", () => {
  it("builds deterministic search queries for Web, YouTube, and GitHub without LLM", () => {
    const topic = "Relational Database Design";
    const concepts = ["Tables", "Primary Keys", "Normalization"];
    const level = "intermediate";

    const queries = buildTopicQueries(topic, concepts, level);

    expect(queries.web).toContain("Relational Database Design");
    expect(queries.web).toContain("Tables Primary Keys Normalization");
    expect(queries.web).toContain("tutorial guide documentation");

    expect(queries.youtube).toContain("Relational Database Design");
    expect(queries.youtube).toContain("Tables Primary Keys");
    expect(queries.youtube).toContain("tutorial");

    expect(queries.github).toContain("Relational Database Design");
    expect(queries.github).toContain("Tables");
    expect(queries.github).toContain("example project");
  });

  it("normalizes topic keys consistently for cache sharing across users", () => {
    const key1 = normalizeTopicKey("Relational Database Design");
    const key2 = normalizeTopicKey("relational database design");
    const key3 = normalizeTopicKey("  Relational Database   Design! ");

    expect(key1).toBe(key2);
    expect(key1).toBe(key3);
  });

  it("retrieves and categorizes resources into Learn, Watch, and Practice", async () => {
    const pack = await getTopicResourcePack({
      topic: "Relational Database Design",
      concepts: ["PostgreSQL", "Drizzle ORM", "Indexes"],
      level: "intermediate",
      useCache: false,
    });

    expect(pack.topic).toBe("Relational Database Design");
    expect(pack.categories).toBeDefined();
    expect(pack.categories.learn.length).toBeGreaterThan(0);
    expect(pack.categories.watch.length).toBeGreaterThan(0);
    expect(pack.categories.practice.length).toBeGreaterThan(0);

    // Verify all resources have valid scores and URLs
    for (const r of pack.allResources) {
      expect(r.url).toBeDefined();
      expect(r.score.overall).toBeGreaterThanOrEqual(0);
      expect(r.score.overall).toBeLessThanOrEqual(10);
      expect(r.score.reasoning).toBeDefined();
    }
  });

  it("schedules rolling 2-week lookahead research for current and next upcoming weeks", async () => {
    const mockRoadmap = generateStaticRoadmap({
      userId: "test-scheduler-user",
      profile: {
        goal: "Become a Backend Engineer",
        currentLevel: "intermediate",
        knownSkills: ["JavaScript", "TypeScript"],
        weeklyHours: 10,
        learningStyle: "mixed",
        format: "mixed",
      },
    });

    const result = await scheduleRoadmapResearch(mockRoadmap);

    // Week 1 and Week 2 topics should be scheduled
    expect(result.scheduledTopics.length).toBe(2);
    expect(result.scheduledTopics[0]).toBe(mockRoadmap.nodes[0].topic);
    expect(result.scheduledTopics[1]).toBe(mockRoadmap.nodes[1].topic);
  });
});
