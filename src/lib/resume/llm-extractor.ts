import { z } from "zod";
import { generateObject } from "ai";
import { getLlmModel, isLlmConfigured } from "@/lib/llm";
import type { StructuredResumeData } from "./types";

const resumeExtractionSchema = z.object({
  name: z.string().describe("Candidate full name if present").optional(),
  summary: z.string().describe("Concise 2-3 sentence executive summary of the candidate's technical profile, core specialties, and experience level"),
  targetRole: z.string().describe("Inferred or desired engineering role (e.g. Full-Stack Engineer, Backend Developer, AI Engineer)").optional(),
  suggestedLevel: z.enum(["beginner", "intermediate", "advanced"]).describe("Inferred engineering proficiency based on years of experience, leadership, and architecture scope"),
  skills: z.array(z.string()).max(20).describe("Top 15-20 most relevant technical skills, languages, databases, cloud tools, frameworks, and devops practices"),
  experience: z.array(
    z.object({
      role: z.string(),
      company: z.string().optional(),
      duration: z.string().optional(),
      highlights: z.array(z.string()).optional(),
    })
  ).describe("Key professional work history or internships"),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string().optional(),
      year: z.string().optional(),
    })
  ).describe("Educational degrees, university, or certifications"),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      techStack: z.array(z.string()).optional(),
    })
  ).describe("Key software projects, open source contributions, or SaaS applications built"),
  interests: z.array(z.string()).describe("Technical interests, engineering domains, or hobbies (e.g. Distributed Systems, Generative AI, Robotics)").default([]),
});

/**
 * Fallback heuristic extractor when no LLM API key is present
 */
function heuristicExtract(text: string): StructuredResumeData {
  const lower = text.toLowerCase();

  const knownTech = [
    "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Express",
    "Python", "Django", "FastAPI", "Go", "Golang", "Java", "Spring Boot",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Drizzle ORM", "Prisma",
    "Docker", "Kubernetes", "AWS", "GCP", "CI/CD", "GitHub Actions", "Linux",
    "Tailwind CSS", "REST API", "GraphQL", "WebSockets", "Kafka", "RabbitMQ",
    "Machine Learning", "PyTorch", "TensorFlow", "OpenAI", "LangChain", "RAG"
  ];

  const matchedSkills = knownTech.filter((t) =>
    new RegExp(`\\b${t.replace(".", "\\.")}\\b`, "i").test(text)
  );

  let level: "beginner" | "intermediate" | "advanced" = "intermediate";
  if (lower.includes("lead") || lower.includes("senior") || lower.includes("principal") || lower.includes("staff") || lower.includes("architect")) {
    level = "advanced";
  } else if (lower.includes("intern") || lower.includes("junior") || lower.includes("student") || lower.includes("graduate")) {
    level = "beginner";
  }

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const projectLines = lines.filter((l) =>
    l.toLowerCase().includes("project") || l.toLowerCase().includes("built") || l.toLowerCase().includes("developed")
  ).slice(0, 3);

  return {
    name: lines[0]?.length < 40 ? lines[0] : undefined,
    summary: `Candidate profile with background in ${matchedSkills.slice(0, 4).join(", ") || "software engineering"}. Assessed level: ${level}.`,
    targetRole: "Software Engineer",
    suggestedLevel: level,
    skills: matchedSkills.slice(0, 20).length > 0 ? matchedSkills.slice(0, 20) : ["JavaScript", "TypeScript", "React"],
    experience: [
      {
        role: "Software Developer",
        company: "Industry Experience",
        highlights: lines.slice(1, 4),
      },
    ],
    education: [
      {
        degree: "Computer Science / Engineering Degree",
      },
    ],
    projects: projectLines.map((p, i) => ({
      name: `Project ${i + 1}`,
      description: p,
      techStack: matchedSkills.slice(i * 2, (i + 1) * 2),
    })),
    interests: ["System Architecture", "Modern Web Development", "AI Integration"],
  };
}

/**
 * Extracts structured engineering profile data from raw resume text using LLM.
 */
export async function extractStructuredResume(
  resumeText: string,
  options?: { provider?: string; model?: string }
): Promise<StructuredResumeData> {
  const text = resumeText.trim();
  if (!text) {
    throw new Error("Resume content is empty");
  }

  if (!isLlmConfigured(options?.provider, options?.model)) {
    return heuristicExtract(text);
  }

  try {
    const { object } = await generateObject({
      model: getLlmModel({ provider: options?.provider, model: options?.model, role: "fast" }),
      system: `You are an expert technical talent assessor and engineering resume parser for SkillFarm.
Analyze the provided resume text thoroughly and extract high-precision structured profile data.
Extract at most the top 20 most important technical skills as concise names (e.g. "TypeScript", "PostgreSQL", "Docker").
Identify key projects, work highlights, and provide an accurate suggested proficiency level.`,
      prompt: `Candidate Resume Text:\n"""\n${text.slice(0, 10000)}\n"""\n\nExtract the structured candidate profile into JSON:`,
      schema: resumeExtractionSchema,
      temperature: 0.2,
    });

    return {
      name: object.name,
      summary: object.summary,
      targetRole: object.targetRole ?? "Software Engineer",
      suggestedLevel: object.suggestedLevel,
      skills: object.skills.slice(0, 20).length > 0 ? object.skills.slice(0, 20) : ["Software Engineering"],
      experience: object.experience ?? [],
      education: object.education ?? [],
      projects: object.projects ?? [],
      interests: object.interests ?? [],
    };
  } catch (err) {
    console.error("[resume/llm-extractor] LLM extraction failed, falling back to heuristic:", err);
    return heuristicExtract(text);
  }
}
