import { addMemory } from "./mem0";

export type ParsedResume = {
  extractedSkills: string[];
  experienceSummary: string;
  keyProjects: string[];
  suggestedLevel: "beginner" | "intermediate" | "advanced";
};

export async function parseAndStoreResume(userId: string, resumeText: string): Promise<ParsedResume> {
  const text = resumeText.trim();
  if (!text) {
    throw new Error("Resume content is empty");
  }

  // Extract skills via keyword heuristic
  const knownKeywords = [
    "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Express",
    "PostgreSQL", "MongoDB", "Docker", "Kubernetes", "AWS", "Python",
    "Tailwind", "Git", "REST", "GraphQL", "Redis", "Security", "CI/CD"
  ];

  const extractedSkills = knownKeywords.filter((kw) =>
    new RegExp(`\\b${kw}\\b`, "i").test(text)
  );

  // Derive suggested level
  let suggestedLevel: "beginner" | "intermediate" | "advanced" = "intermediate";
  if (text.toLowerCase().includes("senior") || text.toLowerCase().includes("lead") || text.toLowerCase().includes("principal") || text.toLowerCase().includes("architect")) {
    suggestedLevel = "advanced";
  } else if (text.toLowerCase().includes("junior") || text.toLowerCase().includes("intern") || text.toLowerCase().includes("student")) {
    suggestedLevel = "beginner";
  }

  const experienceSummary = `Parsed resume profile: ${extractedSkills.length} core technologies detected (${extractedSkills.join(", ") || "General Engineering"}). Level: ${suggestedLevel}.`;
  
  // Extract key project lines (lines with bullet points or project keywords)
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const keyProjects = lines
    .filter((l) => l.toLowerCase().includes("project") || l.toLowerCase().includes("built") || l.toLowerCase().includes("developed"))
    .slice(0, 4);

  // Automatically store into Mem0 Long-Term Memory
  await addMemory(userId, `User Resume Summary: ${experienceSummary}`, "resume");
  if (keyProjects.length > 0) {
    await addMemory(userId, `User Past Projects & Background: ${keyProjects.join(" | ")}`, "resume");
  }

  return {
    extractedSkills: extractedSkills.length > 0 ? extractedSkills : ["Software Engineering"],
    experienceSummary,
    keyProjects,
    suggestedLevel,
  };
}
