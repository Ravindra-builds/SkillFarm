/**
 * Roadmap Generator — Phase 9
 *
 * Takes the learning profile and produces a personalized, ordered list of nodes.
 * For MVP we use a deterministic template per goal, not an LLM, so it works
 * without OPENAI_API_KEY and is fast. Phase 9 later can swap to LLM generation.
 */

import type { LearningProfileInput } from "@/lib/learning-profile";
import type { Roadmap, RoadmapNode } from "@/lib/roadmap-store";
import { randomUUID } from "crypto";

type GenerateOpts = {
  userId: string;
  profile: LearningProfileInput;
};

const TEMPLATES: Record<string, Omit<RoadmapNode, "id" | "status" | "order">[]> = {
  backend: [
    {
      slug: "node-fundamentals",
      title: "Node.js Fundamentals",
      description: "Event loop, modules, streams, error handling, and modern ESM.",
      whyItMatters: "Everything in backend runs on Node — you need the mental model before frameworks.",
      difficulty: "beginner",
      prerequisites: [],
      relatedConcepts: ["JavaScript", "HTTP"],
      mentorId: "backend",
      practicalTask: "Write a tiny HTTP server with only node:http and handle backpressure on a stream.",
      projectBrief: "CLI that streams a 100MB file with progress and proper error handling",
      commonMistakes: ["Blocking the event loop with sync fs", "Ignoring stream errors"],
    },
    {
      slug: "http-rest",
      title: "HTTP & REST APIs",
      description: "Methods, status codes, headers, and REST design principles.",
      whyItMatters: "APIs are your product — correct HTTP semantics makes them predictable and debuggable.",
      difficulty: "beginner",
      prerequisites: ["node-fundamentals"],
      relatedConcepts: ["REST", "HTTP"],
      mentorId: "backend",
      practicalTask: "Design a REST resource for /users with correct codes (201, 400, 404, 409).",
      projectBrief: "Spec a Todo API with OpenAPI and mock it",
      commonMistakes: ["200 for errors", "No validation"],
    },
    {
      slug: "express-fastify",
      title: "Express / Fastify",
      description: "Routing, middleware, validation, and error handling.",
      whyItMatters: "Frameworks are where validation and auth live — get this right and the rest is easier.",
      difficulty: "beginner",
      prerequisites: ["http-rest"],
      relatedConcepts: ["Express", "Fastify", "Middleware"],
      mentorId: "backend",
      practicalTask: "Add Zod validation to POST /users and return flattened errors.",
      projectBrief: "Build a validated CRUD API with middleware logging",
      commonMistakes: ["Putting logic in route handlers", "No error middleware"],
    },
    {
      slug: "postgres",
      title: "PostgreSQL",
      description: "Schema, indexes, transactions, and migrations.",
      whyItMatters: "Your data model outlives your code — schema and indexes decide scale.",
      difficulty: "intermediate",
      prerequisites: ["express-fastify"],
      relatedConcepts: ["SQL", "Indexes", "Transactions"],
      mentorId: "backend",
      practicalTask: "Add a unique index on email and handle 409 correctly.",
      projectBrief: "Design a SaaS schema with users, orgs, and audit logs",
      commonMistakes: ["Missing indexes on FKs", "Giant transactions"],
    },
    {
      slug: "auth",
      title: "Authentication",
      description: "JWT, sessions, OAuth, refresh rotation, httpOnly cookies.",
      whyItMatters: "Auth is where security fails — do it once, do it right.",
      difficulty: "intermediate",
      prerequisites: ["postgres"],
      relatedConcepts: ["JWT", "OAuth", "Cookies"],
      mentorId: "security",
      practicalTask: "Implement httpOnly refresh + short-lived access JWT with rotation.",
      projectBrief: "Auth service with login, refresh, and logout",
      commonMistakes: ["JWT in localStorage", "No refresh rotation", "No rate limiting"],
    },
    {
      slug: "caching-redis",
      title: "Caching with Redis",
      description: "TTL, invalidation, and rate limiting.",
      whyItMatters: "Cache is a trade-off — speed vs staleness. Learn when NOT to cache.",
      difficulty: "intermediate",
      prerequisites: ["auth"],
      relatedConcepts: ["Redis", "TTL", "Rate Limit"],
      mentorId: "backend",
      practicalTask: "Cache GET /users/:id with 60s TTL and invalidate on update.",
      projectBrief: "Rate-limited API with Redis (100 req/min)",
      commonMistakes: ["Caching everything", "No invalidation"],
    },
    {
      slug: "testing",
      title: "Testing",
      description: "Unit, integration, and why each matters.",
      whyItMatters: "Tests are how you ship with confidence — not an afterthought.",
      difficulty: "intermediate",
      prerequisites: ["caching-redis"],
      relatedConcepts: ["Jest", "Vitest", "Supertest"],
      mentorId: "backend",
      practicalTask: "Write a test that asserts 400 on bad POST /users.",
      projectBrief: "Add 80% coverage to your API with integration tests",
      commonMistakes: ["Only unit tests", "No integration for DB"],
    },
    {
      slug: "docker-deploy",
      title: "Docker & Deployment",
      description: "Containers, CI/CD, Neon, Vercel, observability.",
      whyItMatters: "If you can’t ship it, it doesn’t exist. Learn to deploy simply and observe.",
      difficulty: "advanced",
      prerequisites: ["testing"],
      relatedConcepts: ["Docker", "CI/CD", "Observability"],
      mentorId: "devops",
      practicalTask: "Dockerize API with multi-stage build and health check.",
      projectBrief: "Deploy to Vercel + Neon with preview envs and logs",
      commonMistakes: ["Leaking secrets", "No health check", "No logs"],
    },
    {
      slug: "system-design",
      title: "System Design",
      description: "Trade-offs, scalability, and production readiness.",
      whyItMatters: "Design is about “it depends” — learn to make and defend trade-offs.",
      difficulty: "advanced",
      prerequisites: ["docker-deploy"],
      relatedConcepts: ["Scalability", "Trade-offs"],
      mentorId: "system-design",
      practicalTask: "Sketch your SaaS: client → API → DB → cache, mark one bottleneck.",
      projectBrief: "Design review: is your SaaS production ready? Present to the team",
      commonMistakes: ["Premature microservices", "Caching everything"],
    },
  ],
  frontend: [
    {
      slug: "react-fundamentals",
      title: "React Fundamentals",
      description: "Components, hooks, state, and data flow.",
      whyItMatters: "React is your UI runtime — get the fundamentals before Next.js.",
      difficulty: "beginner",
      prerequisites: [],
      relatedConcepts: ["React", "JSX"],
      mentorId: "frontend",
      practicalTask: "Build a form with controlled inputs and Zod validation.",
      projectBrief: "Todo UI with filters and optimistic updates",
      commonMistakes: ["Prop drilling without context", "Effects for derived state"],
    },
    {
      slug: "nextjs",
      title: "Next.js App Router",
      description: "Server vs Client Components, data fetching, routing.",
      whyItMatters: "App Router is how you ship fast and accessible UIs.",
      difficulty: "intermediate",
      prerequisites: ["react-fundamentals"],
      relatedConcepts: ["Next.js", "RSC"],
      mentorId: "frontend",
      practicalTask: "Convert a page to Server Component with async fetch.",
      projectBrief: "Blog with MDX, skeletons, and error boundaries",
      commonMistakes: ["All Client Components", "No loading states"],
    },
  ],
  ai: [
    {
      slug: "llm-apis-prompting",
      title: "LLM APIs & Prompting Patterns",
      description: "Model selection, system instructions, structured output with Zod, streaming responses.",
      whyItMatters: "Prompt engineering is programming for probabilistic models — strict structure is key.",
      difficulty: "beginner",
      prerequisites: [],
      relatedConcepts: ["LLM", "Prompting", "Zod"],
      mentorId: "ai-engineer",
      practicalTask: "Implement structured object generation with Vercel AI SDK generateObject and Zod schema.",
      projectBrief: "Structured resume analyzer producing JSON scores and feedback",
      commonMistakes: ["Free-text parsing without schema", "No fallback for model errors"],
    },
    {
      slug: "rag-embeddings",
      title: "RAG & Vector Search",
      description: "Embeddings, vector databases, chunking strategies, search retrieval.",
      whyItMatters: "RAG connects domain data to LLMs without fine-tuning cost.",
      difficulty: "intermediate",
      prerequisites: ["llm-apis-prompting"],
      relatedConcepts: ["RAG", "Embeddings", "pgvector"],
      mentorId: "ai-engineer",
      practicalTask: "Build chunking script and store embeddings in pgvector.",
      projectBrief: "Chat-with-your-docs tool with citations and source ranking",
      commonMistakes: ["Naïve character chunking", "Ignoring similarity score thresholds"],
    },
    {
      slug: "ai-agents-tools",
      title: "Autonomous Agents & Tool Calling",
      description: "Agent execution loops, multi-tool binding, tool allowlists, memory state.",
      whyItMatters: "Agents transform passive LLMs into active systems that interact with APIs.",
      difficulty: "advanced",
      prerequisites: ["rag-embeddings"],
      relatedConcepts: ["Agents", "Tools", "Orchestration"],
      mentorId: "ai-engineer",
      practicalTask: "Build an agent with 3 restricted tools and permission validation.",
      projectBrief: "Autonomous web research agent with multi-step synthesis",
      commonMistakes: ["Unbounded agent loops", "Arbitrary code execution risks"],
    },
  ],
  security: [
    {
      slug: "appsec-owasp",
      title: "Application Security & OWASP Top 10",
      description: "Threat modeling, input sanitization, XSS, CSRF, SQL Injection, SSRF defenses.",
      whyItMatters: "Security is non-negotiable — prevention is much cheaper than breach recovery.",
      difficulty: "beginner",
      prerequisites: [],
      relatedConcepts: ["OWASP", "XSS", "Sanitization"],
      mentorId: "security",
      practicalTask: "Audit an API route for prompt injection and SSRF vulnerabilities.",
      projectBrief: "Security scanner CLI that audits HTTP headers and inputs",
      commonMistakes: ["Trusting client inputs", "Ignoring CORS policies"],
    },
    {
      slug: "authz-secrets",
      title: "Authorization & Secrets Management",
      description: "RBAC/ABAC, secret rotation, httpOnly cookies, rate limiting.",
      whyItMatters: "Authentication checks who you are; authorization checks what you can touch.",
      difficulty: "intermediate",
      prerequisites: ["appsec-owasp"],
      relatedConcepts: ["RBAC", "Rate Limiting", "Secrets"],
      mentorId: "security",
      practicalTask: "Implement sliding window rate limiting with Upstash Redis.",
      projectBrief: "Multi-tenant API auth system with audit logs and rate limits",
      commonMistakes: ["Hardcoded secrets in git", "Missing tenant isolation"],
    },
  ],
};

function pickTemplate(goal: string): typeof TEMPLATES.backend {
  const g = goal.toLowerCase();
  if (g.includes("ai") || g.includes("llm") || g.includes("rag")) return TEMPLATES.ai;
  if (g.includes("security") || g.includes("owasp") || g.includes("auth")) return TEMPLATES.security;
  if (g.includes("frontend") || g.includes("react") || g.includes("ui")) return TEMPLATES.frontend;
  return TEMPLATES.backend;
}

export function generateRoadmap(opts: GenerateOpts): Roadmap {
  const { userId, profile } = opts;
  const template = pickTemplate(profile.goal);
  const nodes: RoadmapNode[] = template.map((t, idx) => {
    // Prune based on known skills — if user already knows it, mark completed
    const known = profile.knownSkills.map((s) => s.toLowerCase());
    const isKnown = known.some((k) => t.title.toLowerCase().includes(k) || t.slug.includes(k.replace(/\s+/g, "-")));
    // Also adjust difficulty based on level
    let status: RoadmapNode["status"] = "locked";
    if (idx === 0) status = "current";
    if (isKnown && idx < 2) status = "completed";
    if (idx === 1 && nodes?.[0]?.status === "completed") status = "current";

    return {
      id: randomUUID(),
      slug: t.slug,
      title: t.title,
      description: t.description,
      whyItMatters: t.whyItMatters,
      difficulty: t.difficulty,
      prerequisites: t.prerequisites,
      relatedConcepts: t.relatedConcepts,
      mentorId: t.mentorId,
      order: idx,
      status,
      practicalTask: t.practicalTask,
      projectBrief: t.projectBrief,
      commonMistakes: t.commonMistakes,
    };
  });

  // Ensure exactly one current
  const hasCurrent = nodes.some((n) => n.status === "current");
  if (!hasCurrent) {
    const firstLocked = nodes.find((n) => n.status === "locked");
    if (firstLocked) firstLocked.status = "current";
  }

  // If level is advanced, mark first 2 as completed
  if (profile.currentLevel === "advanced") {
    nodes.slice(0, 2).forEach((n) => (n.status = "completed"));
    const next = nodes.find((n) => n.status === "locked");
    if (next) next.status = "current";
  }

  // Adjust timeline based on weeklyHours
  const title = profile.goal.length > 60 ? profile.goal.slice(0, 60) + "…" : profile.goal;

  return {
    id: randomUUID(),
    userId,
    title: `Roadmap — ${title}`,
    description: `Personalized for ${profile.currentLevel} • ${profile.knownSkills.join(", ")} • ${profile.weeklyHours}h/week • ${profile.learningStyle}`,
    nodes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
