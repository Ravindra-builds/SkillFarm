/**
 * Mentor definitions — single source of truth.
 * Adding a new mentor should be config, not rewriting chat infrastructure.
 */

export type MentorId =
  | "ai-engineer"
  | "backend"
  | "frontend"
  | "devops"
  | "security"
  | "system-design";

export interface MentorConfig {
  id: MentorId;
  name: string;
  shortName: string;
  role: string;
  description: string;
  // System prompt is intentionally not inlined here for MVP — we keep it in agents/mentors/<id>/prompt.ts
  // so prompts stay versionable and testable.
  expertise: string[];
  tools: string[]; // allowlist per Agent Security section
  color: string; // hex for avatar / border
  accent: string; // tailwind-like accent name
  icon: string; // lucide icon name
  handoffTriggers: string[]; // keywords that suggest this mentor
}

export const mentors: Record<MentorId, MentorConfig> = {
  "ai-engineer": {
    id: "ai-engineer",
    name: "AI Engineer Mentor",
    shortName: "AI Mentor",
    role: "LLMs, RAG & Agents",
    description: "Build production AI — prompting, RAG, agents, evals and streaming.",
    expertise: ["LLM APIs", "RAG", "Agents", "Embeddings", "Evaluation", "Streaming"],
    tools: ["web_search", "github_search", "documentation_search"],
    color: "#7C5CFC",
    accent: "violet",
    icon: "Bot",
    handoffTriggers: ["llm", "rag", "agent", "vector", "embedding", "prompt"],
  },
  backend: {
    id: "backend",
    name: "Backend Engineer Mentor",
    shortName: "Backend",
    role: "APIs, DBs & Auth",
    description: "Production backends — Node.js, HTTP, databases, auth, testing & scaling.",
    expertise: ["Node.js", "HTTP/REST", "Databases", "Auth", "Caching", "Testing"],
    tools: ["web_search", "github_search", "documentation_search"],
    color: "#4F9CF9",
    accent: "blue",
    icon: "Server",
    handoffTriggers: ["api", "database", "postgres", "auth", "jwt", "express", "fastify"],
  },
  frontend: {
    id: "frontend",
    name: "Frontend Engineer Mentor",
    shortName: "Frontend",
    role: "React & UI",
    description: "Modern frontends — React, Next.js, performance, a11y and delightful UX.",
    expertise: ["React", "Next.js", "TypeScript", "Styling", "Performance", "Accessibility"],
    tools: ["web_search", "github_search", "documentation_search"],
    color: "#EC4899",
    accent: "pink",
    icon: "Palette",
    handoffTriggers: ["react", "nextjs", "tailwind", "frontend", "css", "accessibility"],
  },
  devops: {
    id: "devops",
    name: "DevOps / Cloud Mentor",
    shortName: "DevOps",
    role: "Infra & Deploy",
    description: "Ship confidently — Docker, CI/CD, cloud, secrets, monitoring.",
    expertise: ["Docker", "CI/CD", "Cloud", "Monitoring", "Secrets", "Infrastructure"],
    tools: ["web_search", "github_search", "documentation_search"],
    color: "#35C98B",
    accent: "emerald",
    icon: "Cloud",
    handoffTriggers: ["docker", "kubernetes", "ci/cd", "aws", "deploy", "infra"],
  },
  security: {
    id: "security",
    name: "Cybersecurity Mentor",
    shortName: "Security",
    role: "AppSec & OWASP",
    description: "Secure by default — OWASP, authZ, API security, secrets & vulns.",
    expertise: ["OWASP", "AuthZ", "API Security", "Secrets", "Vulnerabilities"],
    tools: ["web_search", "security_documentation_search"],
    color: "#EF4444",
    accent: "red",
    icon: "ShieldCheck",
    handoffTriggers: ["security", "owasp", "xss", "csrf", "sql injection", "secrets"],
  },
  "system-design": {
    id: "system-design",
    name: "System Design Mentor",
    shortName: "Architect",
    role: "Architecture",
    description: "Think in systems — trade-offs, scalability, data flow, and production readiness.",
    expertise: ["Architecture", "Scalability", "Data Modeling", "Trade-offs", "Production"],
    tools: ["web_search", "github_search"],
    color: "#F59E0B",
    accent: "amber",
    icon: "Network",
    handoffTriggers: ["architecture", "system design", "scalability", "microservice", "trade-off"],
  },
};

export const mentorList = Object.values(mentors);

export const orchestratorConfig = {
  name: "Tech Lead Orchestrator",
  description:
    "Senior technical lead that understands intent, picks the right specialist(s), and synthesizes.",
  modelRouting: {
    // Per Latency Strategy — cheap/fast for classification, strong for synthesis
    router: "gpt-4o-mini or claude-3.5-haiku class",
    synthesis: "gpt-4o or claude-3.5-sonnet class",
  },
} as const;
