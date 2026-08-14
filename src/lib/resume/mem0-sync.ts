import { addMemory } from "@/lib/memory/mem0";
import type { StructuredResumeData } from "./types";

/**
 * Stores structured resume facts into Mem0 Long-Term Memory under distinct categories.
 * These memories are automatically used across chat turns, roadmap generation, and resource curation.
 */
export async function syncResumeToMem0(userId: string, data: StructuredResumeData): Promise<number> {
  let count = 0;

  // 1. Store Executive Background Summary
  if (data.summary) {
    await addMemory(
      userId,
      `Background Profile: ${data.summary} (Level: ${data.suggestedLevel}, Target Role: ${data.targetRole || "Software Engineer"})`,
      "resume_summary"
    ).catch(() => {});
    count++;
  }

  // 2. Store Core Technical Stack & Skills
  if (data.skills && data.skills.length > 0) {
    await addMemory(
      userId,
      `Verified Technical Skills & Stack: ${data.skills.join(", ")}`,
      "skills"
    ).catch(() => {});
    count++;
  }

  // 3. Store Key Projects
  if (data.projects && data.projects.length > 0) {
    const projectSummaries = data.projects
      .map((p) => `${p.name}: ${p.description}${p.techStack?.length ? ` (Stack: ${p.techStack.join(", ")})` : ""}`)
      .join(" | ");

    await addMemory(
      userId,
      `Notable Projects & Applications: ${projectSummaries}`,
      "projects"
    ).catch(() => {});
    count++;
  }

  // 4. Store Professional Work Experience
  if (data.experience && data.experience.length > 0) {
    const expSummaries = data.experience
      .map((e) => `${e.role}${e.company ? ` at ${e.company}` : ""}${e.duration ? ` (${e.duration})` : ""}${e.highlights?.length ? `: ${e.highlights.slice(0, 2).join("; ")}` : ""}`)
      .join(" | ");

    await addMemory(
      userId,
      `Work Experience & History: ${expSummaries}`,
      "experience"
    ).catch(() => {});
    count++;
  }

  // 5. Store Technical Interests & Domains
  if (data.interests && data.interests.length > 0) {
    await addMemory(
      userId,
      `Technical Focus & Interests: ${data.interests.join(", ")}`,
      "interests"
    ).catch(() => {});
    count++;
  }

  return count;
}
