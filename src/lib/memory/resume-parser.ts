import { processAndStoreResume } from "@/lib/resume";

export type ParsedResume = {
  extractedSkills: string[];
  experienceSummary: string;
  keyProjects: string[];
  suggestedLevel: "beginner" | "intermediate" | "advanced";
};

export async function parseAndStoreResume(userId: string, resumeText: string): Promise<ParsedResume> {
  const result = await processAndStoreResume(userId, { text: resumeText });
  return {
    extractedSkills: result.structured.skills,
    experienceSummary: result.structured.summary,
    keyProjects: result.structured.projects.map((p) => `${p.name}: ${p.description}`),
    suggestedLevel: result.structured.suggestedLevel,
  };
}
