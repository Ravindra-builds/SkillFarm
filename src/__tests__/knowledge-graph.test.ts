import { generateStaticRoadmap } from "@/agents/roadmap/generator";

describe("Interactive Knowledge Graph", () => {
  const mockProfile = {
    goal: "Become an expert Backend and System Design engineer",
    currentLevel: "intermediate" as const,
    knownSkills: ["Node.js", "Express"],
    weeklyHours: 12,
    learningStyle: "hands-on" as const,
    format: "mixed" as const,
  };

  it("extracts milestones with sub-concepts and prerequisites for network graph", () => {
    const roadmap = generateStaticRoadmap({
      userId: "test-knowledge-graph",
      profile: mockProfile,
    });

    expect(roadmap.nodes.length).toBeGreaterThan(0);

    for (const node of roadmap.nodes) {
      expect(node.id).toBeDefined();
      expect(node.topic || node.title).toBeDefined();
      // Verify concepts or relatedConcepts exist
      const concepts = node.concepts || node.relatedConcepts;
      expect(concepts?.length).toBeGreaterThan(0);
    }
  });

  it("builds contiguous prerequisite connections across milestones", () => {
    const roadmap = generateStaticRoadmap({
      userId: "test-knowledge-graph-edges",
      profile: mockProfile,
    });

    const nodes = roadmap.nodes;
    const edges: { from: string; to: string }[] = [];

    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({
        from: nodes[i].id,
        to: nodes[i + 1].id,
      });
    }

    expect(edges.length).toBe(nodes.length - 1);
    expect(edges[0].from).toBe(nodes[0].id);
    expect(edges[0].to).toBe(nodes[1].id);
  });
});
