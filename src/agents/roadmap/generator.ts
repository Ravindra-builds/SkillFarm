/**
 * Personalized Roadmap Generator
 *
 * Dynamically constructs a structured, week-by-week learning roadmap based on the user's
 * learning profile (goal, current level, known skills, weekly hours, style) and Mem0 long-term memory.
 * Uses LLM structured output (`generateObject`) when active, with deterministic fallback for mock mode.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { randomUUID } from "crypto";
import type { LearningProfileInput } from "@/lib/learning-profile";
import type { Roadmap, RoadmapNode } from "@/lib/roadmap-store";
import { getLlmModel, isLlmConfigured } from "@/lib/llm";
import { isMockModeForced } from "@/lib/env";
import { getMemories } from "@/lib/memory/mem0";

type GenerateOpts = {
  userId: string;
  profile: LearningProfileInput;
  provider?: string;
  model?: string;
};

// Zod Schema for structured LLM generation
const roadmapSchema = z.object({
  title: z.string().describe("Concise title of the customized engineering roadmap"),
  description: z.string().describe("Two-sentence overview of the learning journey tailored to the user's pace"),
  totalWeeks: z.number().int().min(2).max(12).describe("Total number of structured weeks"),
  nodes: z.array(
    z.object({
      slug: z.string().describe("URL-friendly unique identifier like 'docker-multi-stage'"),
      title: z.string().describe("Clear topic or milestone title"),
      description: z.string().describe("Specific concepts, tools, and technical focus covered"),
      whyItMatters: z.string().describe("Real-world production rationale and engineering trade-offs"),
      difficulty: z.enum(["beginner", "intermediate", "advanced"]),
      prerequisites: z.array(z.string()).default([]),
      relatedConcepts: z.array(z.string()).default([]),
      mentorId: z.enum(["backend", "frontend", "ai-engineer", "devops", "security", "system-design"]),
      week: z.number().int().min(1).max(12).describe("Week number (1, 2, 3...)"),
      estimatedHours: z.number().min(1).max(30).describe("Estimated hours for this milestone based on weekly pace"),
      practicalTask: z.string().describe("Concrete coding exercise or hands-on task"),
      projectBrief: z.string().describe("Deliverable micro-project or verifiable artifact"),
      commonMistakes: z.array(z.string()).default([]),
    })
  ).min(4).max(20),
});

const TEMPLATES: Record<string, Omit<RoadmapNode, "id" | "status" | "order">[]> = {
  backend: [
    {
      slug: "node-fundamentals",
      title: "Node.js Fundamentals",
      description: "Event loop, modules, streams, error handling, and modern ESM.",
      whyItMatters: "Everything in backend runs on Node — you need the mental model before frameworks.",
      difficulty: "beginner",
      prerequisites: [],
      relatedConcepts: ["JavaScript", "Node.js", "HTTP"],
      mentorId: "backend",
      practicalTask: "Write a tiny HTTP server with only node:http and handle backpressure on a stream.",
      projectBrief: "CLI that streams a 100MB file with progress and proper error handling",
      commonMistakes: ["Blocking the event loop with sync fs", "Ignoring stream errors"],
      week: 1,
      estimatedHours: 4,
    },
    {
      slug: "http-rest",
      title: "HTTP & REST APIs",
      description: "Methods, status codes, headers, and REST design principles.",
      whyItMatters: "APIs are your product — correct HTTP semantics makes them predictable and debuggable.",
      difficulty: "beginner",
      prerequisites: ["node-fundamentals"],
      relatedConcepts: ["REST", "HTTP", "APIs"],
      mentorId: "backend",
      practicalTask: "Design a REST resource for /users with correct codes (201, 400, 404, 409).",
      projectBrief: "Spec a Todo API with OpenAPI and mock it",
      commonMistakes: ["200 for errors", "No validation"],
      week: 1,
      estimatedHours: 4,
    },
    {
      slug: "express-fastify",
      title: "Express & Fastify Web Frameworks",
      description: "Routing, middleware pipelines, Zod schema validation, and centralized error handling.",
      whyItMatters: "Frameworks are where validation and auth live — get this right and the rest is easier.",
      difficulty: "beginner",
      prerequisites: ["http-rest"],
      relatedConcepts: ["Express", "Fastify", "Middleware", "Zod"],
      mentorId: "backend",
      practicalTask: "Add Zod validation to POST /users and return flattened errors.",
      projectBrief: "Build a validated CRUD API with middleware logging",
      commonMistakes: ["Putting logic in route handlers", "No error middleware"],
      week: 2,
      estimatedHours: 5,
    },
    {
      slug: "postgres-drizzle",
      title: "PostgreSQL & Drizzle ORM",
      description: "Schema design, relational indexes, transactions, connection pooling, and migrations.",
      whyItMatters: "Your data model outlives your code — schema and indexes decide scale.",
      difficulty: "intermediate",
      prerequisites: ["express-fastify"],
      relatedConcepts: ["PostgreSQL", "SQL", "Drizzle", "ORM", "Indexes"],
      mentorId: "backend",
      practicalTask: "Add a unique index on email and handle 409 correctly.",
      projectBrief: "Design a SaaS schema with users, orgs, and audit logs",
      commonMistakes: ["Missing indexes on FKs", "Giant transactions"],
      week: 2,
      estimatedHours: 6,
    },
    {
      slug: "auth-sessions-jwt",
      title: "Authentication & Security",
      description: "JWT, sessions, OAuth2, refresh token rotation, httpOnly cookies, and password hashing.",
      whyItMatters: "Auth is where security fails — do it once, do it right.",
      difficulty: "intermediate",
      prerequisites: ["postgres-drizzle"],
      relatedConcepts: ["Auth", "JWT", "OAuth", "Cookies", "Security"],
      mentorId: "security",
      practicalTask: "Implement httpOnly refresh + short-lived access JWT with rotation.",
      projectBrief: "Auth service with login, refresh, and logout",
      commonMistakes: ["JWT in localStorage", "No refresh rotation", "No rate limiting"],
      week: 3,
      estimatedHours: 5,
    },
    {
      slug: "caching-redis",
      title: "Caching & Rate Limiting with Redis",
      description: "TTL strategies, cache invalidation, and sliding window rate limiters.",
      whyItMatters: "Cache is a trade-off — speed vs staleness. Learn when NOT to cache.",
      difficulty: "intermediate",
      prerequisites: ["auth-sessions-jwt"],
      relatedConcepts: ["Redis", "Caching", "TTL", "Rate Limit"],
      mentorId: "backend",
      practicalTask: "Cache GET /users/:id with 60s TTL and invalidate on update.",
      projectBrief: "Rate-limited API with Redis (100 req/min)",
      commonMistakes: ["Caching everything", "No invalidation"],
      week: 3,
      estimatedHours: 5,
    },
    {
      slug: "testing-integration",
      title: "Testing & Reliability",
      description: "Unit testing, integration testing with Vitest / Supertest, and test isolation.",
      whyItMatters: "Tests are how you ship with confidence — not an afterthought.",
      difficulty: "intermediate",
      prerequisites: ["caching-redis"],
      relatedConcepts: ["Testing", "Vitest", "Jest", "Supertest"],
      mentorId: "backend",
      practicalTask: "Write an integration test asserting 400 on bad POST payload.",
      projectBrief: "Add 80% coverage to your API with integration tests",
      commonMistakes: ["Only unit tests", "No integration for DB"],
      week: 4,
      estimatedHours: 4,
    },
    {
      slug: "docker-deploy",
      title: "Docker & Cloud Deployment",
      description: "Multi-stage Docker builds, CI/CD pipelines, Neon PostgreSQL, Vercel, and logs.",
      whyItMatters: "If you can’t ship it, it doesn’t exist. Learn to deploy simply and observe.",
      difficulty: "advanced",
      prerequisites: ["testing-integration"],
      relatedConcepts: ["Docker", "Deploy", "CI/CD", "DevOps"],
      mentorId: "devops",
      practicalTask: "Dockerize API with multi-stage build and health check.",
      projectBrief: "Deploy to Vercel + Neon with preview envs and logs",
      commonMistakes: ["Leaking secrets", "No health check", "No logs"],
      week: 4,
      estimatedHours: 6,
    },
    {
      slug: "system-design-saas",
      title: "System Design & Architecture",
      description: "Trade-offs, database indexing, horizontal scaling, queues, and SaaS architecture.",
      whyItMatters: "Design is about 'it depends' — learn to make and defend engineering trade-offs.",
      difficulty: "advanced",
      prerequisites: ["docker-deploy"],
      relatedConcepts: ["System Design", "Architecture", "Scalability"],
      mentorId: "system-design",
      practicalTask: "Sketch your SaaS architecture: client → API → DB → cache, mark bottlenecks.",
      projectBrief: "Design review: is your SaaS production ready? Present to the team",
      commonMistakes: ["Premature microservices", "Caching everything"],
      week: 5,
      estimatedHours: 6,
    },
  ],
  frontend: [
    {
      slug: "react-fundamentals",
      title: "React Fundamentals & State",
      description: "Components, hooks (useState, useEffect, useMemo), state lifting, and JSX patterns.",
      whyItMatters: "React is your UI runtime — master component mental models first.",
      difficulty: "beginner",
      prerequisites: [],
      relatedConcepts: ["React", "JavaScript", "JSX", "TypeScript"],
      mentorId: "frontend",
      practicalTask: "Build a form with controlled inputs and Zod validation.",
      projectBrief: "Interactive UI component library with state management",
      commonMistakes: ["Prop drilling without context", "Effects for derived state"],
      week: 1,
      estimatedHours: 4,
    },
    {
      slug: "nextjs-app-router",
      title: "Next.js App Router & Server Components",
      description: "Server vs Client Components, streaming, layouts, Server Actions, and dynamic routing.",
      whyItMatters: "App Router is how modern production web applications are built.",
      difficulty: "intermediate",
      prerequisites: ["react-fundamentals"],
      relatedConcepts: ["Next.js", "React", "RSC", "SSR"],
      mentorId: "frontend",
      practicalTask: "Convert a page to a Server Component with dynamic data fetching.",
      projectBrief: "Dashboard UI with Server Actions and optimistic UI updates",
      commonMistakes: ["Marking everything 'use client'", "No loading/error boundaries"],
      week: 2,
      estimatedHours: 6,
    },
    {
      slug: "tailwind-design-system",
      title: "Tailwind CSS & Modern Styling",
      description: "Utility-first CSS, dark mode design tokens, glassmorphism, and responsive layouts.",
      whyItMatters: "A polished design system creates a premium impression and speeds up development.",
      difficulty: "beginner",
      prerequisites: ["react-fundamentals"],
      relatedConcepts: ["Tailwind", "CSS", "Design System", "UI"],
      mentorId: "frontend",
      practicalTask: "Build a responsive dark-mode hero component using CSS variable tokens.",
      projectBrief: "Themeable component library with shadcn/ui primitives",
      commonMistakes: ["Hardcoded hex colors everywhere", "Ignoring mobile breakpoints"],
      week: 2,
      estimatedHours: 4,
    },
    {
      slug: "state-form-validation",
      title: "Form Handling & Zod Validation",
      description: "React Hook Form, Zod schema validation, server-side validation, and accessible fields.",
      whyItMatters: "Forms are where users give you data — client + server validation must match.",
      difficulty: "intermediate",
      prerequisites: ["nextjs-app-router"],
      relatedConcepts: ["Zod", "Forms", "Validation", "TypeScript"],
      mentorId: "frontend",
      practicalTask: "Build a multi-step onboarding wizard with full Zod error feedback.",
      projectBrief: "Production settings panel with client and server validation",
      commonMistakes: ["Client-only validation", "Uninformative error messages"],
      week: 3,
      estimatedHours: 5,
    },
    {
      slug: "frontend-performance",
      title: "Frontend Performance & Web Vitals",
      description: "Core Web Vitals (LCP, CLS, INP), code splitting, image optimization, and bundle audits.",
      whyItMatters: "Fast loading directly improves conversion rates and user retention.",
      difficulty: "advanced",
      prerequisites: ["state-form-validation"],
      relatedConcepts: ["Performance", "Web Vitals", "Optimization"],
      mentorId: "frontend",
      practicalTask: "Audit Next.js bundle sizes and implement dynamic imports for heavy dialogs.",
      projectBrief: "Optimize lighthouse score to 95+ on a media-heavy dashboard",
      commonMistakes: ["Unoptimized images", "Large third-party script bundles"],
      week: 4,
      estimatedHours: 6,
    },
  ],
  ai: [
    {
      slug: "llm-apis-prompting",
      title: "LLM APIs & Structured Output",
      description: "Model parameters (temperature, top_p), system prompts, Zod structured output, and streaming.",
      whyItMatters: "Prompt engineering with structured schemas makes LLMs reliable building blocks.",
      difficulty: "beginner",
      prerequisites: [],
      relatedConcepts: ["LLM", "AI", "Prompting", "Zod", "OpenAI"],
      mentorId: "ai-engineer",
      practicalTask: "Implement structured object generation with Vercel AI SDK generateObject.",
      projectBrief: "Structured resume analyzer producing JSON feedback and scores",
      commonMistakes: ["Free-text parsing without schema", "No error fallbacks"],
      week: 1,
      estimatedHours: 4,
    },
    {
      slug: "rag-vector-search",
      title: "RAG & Vector Databases",
      description: "Text embeddings, chunking strategies, pgvector, similarity search, and context injection.",
      whyItMatters: "RAG connects custom data to LLMs accurately without fine-tuning cost.",
      difficulty: "intermediate",
      prerequisites: ["llm-apis-prompting"],
      relatedConcepts: ["RAG", "Embeddings", "pgvector", "Vector DB"],
      mentorId: "ai-engineer",
      practicalTask: "Write a document chunking script and query vectors using cosine similarity.",
      projectBrief: "Knowledge base Q&A tool with source citations and confidence scores",
      commonMistakes: ["Naïve character chunking", "No similarity threshold filtering"],
      week: 2,
      estimatedHours: 6,
    },
    {
      slug: "ai-agents-tools",
      title: "AI Agents & Tool Calling",
      description: "Agent execution loops, multi-tool binding, tool allowlists, memory state, and planning.",
      whyItMatters: "Agents transform passive LLMs into active tools that run workflows.",
      difficulty: "advanced",
      prerequisites: ["rag-vector-search"],
      relatedConcepts: ["Agents", "Tools", "Orchestration", "AI"],
      mentorId: "ai-engineer",
      practicalTask: "Build an autonomous agent with 3 restricted tools and input safety validation.",
      projectBrief: "Autonomous web research agent with multi-step synthesis",
      commonMistakes: ["Infinite agent execution loops", "Unsanitized tool inputs"],
      week: 3,
      estimatedHours: 6,
    },
    {
      slug: "evals-observability",
      title: "LLM Evals & Tracing",
      description: "Evaluation metrics, synthetic benchmarks, prompt versioning, and latency tracing.",
      whyItMatters: "Without evaluations, prompt changes are guesswork. Measure before shipping.",
      difficulty: "advanced",
      prerequisites: ["ai-agents-tools"],
      relatedConcepts: ["Evals", "Observability", "Telemetry"],
      mentorId: "ai-engineer",
      practicalTask: "Build an assertion pipeline testing LLM outputs against 10 test cases.",
      projectBrief: "LLM telemetry dashboard tracking latency, token cost, and quality scores",
      commonMistakes: ["No automated evals", "Ignoring token cost accumulation"],
      week: 4,
      estimatedHours: 5,
    },
  ],
  security: [
    {
      slug: "appsec-owasp",
      title: "Application Security & OWASP Top 10",
      description: "Threat modeling, input sanitization, XSS, CSRF, SQL Injection, and SSRF defenses.",
      whyItMatters: "Security is foundational — prevention is far cheaper than breach recovery.",
      difficulty: "beginner",
      prerequisites: [],
      relatedConcepts: ["Security", "OWASP", "XSS", "Sanitization"],
      mentorId: "security",
      practicalTask: "Audit an API route for prompt injection and SSRF vulnerabilities.",
      projectBrief: "Security scanner CLI that audits HTTP headers and input payloads",
      commonMistakes: ["Trusting client inputs", "Ignoring CORS policies"],
      week: 1,
      estimatedHours: 4,
    },
    {
      slug: "authz-secrets",
      title: "Authorization & Secrets Management",
      description: "RBAC/ABAC, secret rotation, httpOnly cookie sessions, and rate limiting.",
      whyItMatters: "Authentication verifies identity; authorization strictly controls resource access.",
      difficulty: "intermediate",
      prerequisites: ["appsec-owasp"],
      relatedConcepts: ["RBAC", "Auth", "Rate Limit", "Secrets"],
      mentorId: "security",
      practicalTask: "Implement sliding window rate limiting with Upstash Redis.",
      projectBrief: "Multi-tenant API auth system with audit logs and rate limits",
      commonMistakes: ["Hardcoded secrets in git", "Missing tenant isolation"],
      week: 2,
      estimatedHours: 5,
    },
  ],
};

function pickTemplate(goal: string): typeof TEMPLATES.backend {
  const g = goal.toLowerCase();
  if (g.includes("ai") || g.includes("llm") || g.includes("rag") || g.includes("agent")) return TEMPLATES.ai;
  if (g.includes("security") || g.includes("owasp") || g.includes("auth")) return TEMPLATES.security;
  if (g.includes("frontend") || g.includes("react") || g.includes("ui") || g.includes("next")) return TEMPLATES.frontend;
  return TEMPLATES.backend;
}

/**
 * Deterministic template-based fallback generator for offline or mock mode.
 */
export function generateStaticRoadmap(opts: GenerateOpts): Roadmap {
  const { userId, profile } = opts;
  const template = pickTemplate(profile.goal);
  const known = profile.knownSkills.map((s) => s.toLowerCase().trim());

  const rawNodes: RoadmapNode[] = template.map((t, idx) => {
    const matchesKnown = known.some((k) =>
      k.length > 1 && (
        t.title.toLowerCase().includes(k) ||
        t.slug.toLowerCase().includes(k.replace(/\s+/g, "-")) ||
        t.relatedConcepts.some((rc) => rc.toLowerCase() === k || k.includes(rc.toLowerCase()))
      )
    );

    const isCompleted = matchesKnown || (profile.currentLevel === "advanced" && idx < 2);

    return {
      id: randomUUID(),
      slug: t.slug,
      title: t.title,
      description: t.description,
      whyItMatters: matchesKnown
        ? `Prerequisite topic matching your profile skill (${t.relatedConcepts.slice(0, 2).join(", ")}) — baseline marked as mastered.`
        : t.whyItMatters,
      difficulty: t.difficulty,
      prerequisites: t.prerequisites,
      relatedConcepts: t.relatedConcepts,
      mentorId: t.mentorId,
      order: idx,
      status: isCompleted ? "completed" : "locked",
      practicalTask: t.practicalTask,
      projectBrief: t.projectBrief,
      commonMistakes: t.commonMistakes,
      week: t.week ?? Math.floor(idx / 2) + 1,
      estimatedHours: t.estimatedHours ?? 4,
    };
  });

  // Find first uncompleted node
  const firstUncompletedIdx = rawNodes.findIndex((n) => n.status !== "completed");
  if (firstUncompletedIdx !== -1) {
    rawNodes[firstUncompletedIdx].status = "current";
    if (firstUncompletedIdx + 1 < rawNodes.length) {
      rawNodes[firstUncompletedIdx + 1].status = "next";
    }
  } else if (rawNodes.length > 0) {
    rawNodes[rawNodes.length - 1].status = "current";
  }

  const title = profile.goal.length > 60 ? profile.goal.slice(0, 60) + "…" : profile.goal;

  return {
    id: randomUUID(),
    userId,
    title: `Roadmap — ${title}`,
    description: `Personalized for ${profile.currentLevel} level • ${profile.knownSkills.join(", ")} • ${profile.weeklyHours}h/week`,
    nodes: rawNodes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Dynamic LLM-Powered Roadmap Generator
 * Batches learning curriculum into consecutive weeks based on user pace and background.
 */
export async function generateDynamicRoadmap(opts: GenerateOpts): Promise<Roadmap> {
  const { userId, profile, provider, model } = opts;

  // Retrieve user memories for context (resume stack, projects, prior background)
  let memoriesSummary = "";
  try {
    const mems = await getMemories(userId);
    if (mems.length > 0) {
      memoriesSummary = `\n- Stored Background & Resume Facts: ${mems.slice(0, 8).map((m) => m.memory).join("; ")}`;
    }
  } catch {}

  const targetHours = profile.weeklyHours || 10;
  const userLevel = profile.currentLevel || "intermediate";

  const systemPrompt = `You are the Lead Curriculum Architect for SkillFarm, an elite software engineering mentorship platform.
Your job is to generate a comprehensive, highly personalized, week-by-week engineering roadmap for a developer based on their specific profile, skill level, and background.

CRITICAL PEDAGOGICAL SEQUENCING RULES:
1. PROGRESSIVE DIFFICULTY (FOUNDATIONS & BEGINNER TOPICS FIRST):
   - Week 1 MUST ALWAYS start with Beginner Foundations and fundamental mental models:
     * Core syntax, basic runtime execution, directory structures, fundamental tools, essential HTTP/DOM protocols, and development setup.
     * DO NOT jump straight into advanced topics (such as distributed caching, complex microservices, RAG pipelines, or multi-cloud Kubernetes) in Week 1.
   - Weeks 2-3: Transition smoothly into Intermediate Applied Engineering:
     * Practical API/UI development, database CRUD & relational modeling, schema validation, state management, and foundational unit/integration testing.
   - Week 4+: Advance into Production-Grade Engineering (Advanced):
     * Security hardening, performance profiling, auth flows, caching strategies, CI/CD pipelines, and high-scale system design trade-offs.

2. USER PROFILE LEVEL ADAPTATION:
   - If User Level is "beginner":
     * Weeks 1 to 3 MUST BE strictly beginner-friendly, accessible, and grounded in core coding principles with zero unnecessary complexity.
     * Break down tasks into small, approachable steps.
   - If User Level is "intermediate":
     * Week 1 reinforces core fundamentals & architecture mental models.
     * Weeks 2 to 4 dive deep into intermediate production engineering.
     * Subsequent weeks introduce advanced scale and reliability.
   - If User Level is "advanced":
     * Week 1 bridges architectural fundamentals and deep internals before rapidly advancing to distributed systems and optimizations.

3. PACING & WEEKLY HOURS:
   - Divide into consecutive chronological weeks (Week 1, Week 2, Week 3, etc.).
   - Ensure the total estimated hours per week sum up to approximately the user's weekly study budget (~${targetHours} hours/week).

4. SPECIALIST MENTOR ASSIGNMENT:
   - "backend": Node, Go, APIs, databases, query optimization, caching.
   - "frontend": React, Next.js, CSS architecture, web vitals, state.
   - "ai-engineer": LLM prompt engineering, embeddings, vector stores, agents, evals.
   - "devops": Containers, Docker, CI/CD, deployment, logging.
   - "security": OWASP Top 10, Auth/JWT, RBAC, input sanitization.
   - "system-design": Architectural trade-offs, scaling, queues, data pipelines.

5. ACTIONABLE DELIVERABLES:
   - 'practicalTask': A concrete 30-minute coding task.
   - 'projectBrief': A realistic mini-project or portfolio deliverable.`;

  const userPrompt = `User Profile:
- Target Goal: "${profile.goal}"
- Current Self-Assessed Level: "${userLevel}" (Follow rule: Start with beginner foundations first!)
- Known Skills: ${profile.knownSkills.join(", ") || "None specified"}
- Weekly Study/Build Time: ${targetHours} hours/week
- Preferred Learning Style: "${profile.learningStyle}"${memoriesSummary}

Generate a clear, step-by-step roadmap batched into consecutive chronological weeks. Start with beginner-friendly core foundations in Week 1, and progress systematically to mastery.`;

  const { object } = await generateObject({
    model: getLlmModel({
      provider,
      model,
      role: "roadmap",
    }),
    schema: roadmapSchema,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.4,
  });

  const known = profile.knownSkills.map((s) => s.toLowerCase().trim());

  const rawNodes: RoadmapNode[] = object.nodes.map((n, idx) => {
    const matchesKnown = known.some((k) =>
      k.length > 1 && (
        n.title.toLowerCase().includes(k) ||
        n.slug.toLowerCase().includes(k.replace(/\s+/g, "-")) ||
        n.relatedConcepts.some((rc) => rc.toLowerCase() === k || k.includes(rc.toLowerCase()))
      )
    );

    const isCompleted = matchesKnown || (profile.currentLevel === "advanced" && idx === 0);

    return {
      id: randomUUID(),
      slug: n.slug,
      title: n.title,
      description: n.description,
      whyItMatters: matchesKnown
        ? `Prerequisite matching your verified background (${n.relatedConcepts.slice(0, 2).join(", ")}) — baseline marked as mastered.`
        : n.whyItMatters,
      difficulty: n.difficulty,
      prerequisites: n.prerequisites,
      relatedConcepts: n.relatedConcepts,
      mentorId: n.mentorId,
      order: idx,
      status: isCompleted ? "completed" : "locked",
      practicalTask: n.practicalTask,
      projectBrief: n.projectBrief,
      commonMistakes: n.commonMistakes,
      week: n.week,
      estimatedHours: n.estimatedHours,
    };
  });

  // Activate first uncompleted node
  const firstUncompletedIdx = rawNodes.findIndex((n) => n.status !== "completed");
  if (firstUncompletedIdx !== -1) {
    rawNodes[firstUncompletedIdx].status = "current";
    if (firstUncompletedIdx + 1 < rawNodes.length) {
      rawNodes[firstUncompletedIdx + 1].status = "next";
    }
  } else if (rawNodes.length > 0) {
    rawNodes[rawNodes.length - 1].status = "current";
  }

  return {
    id: randomUUID(),
    userId,
    title: object.title,
    description: object.description,
    nodes: rawNodes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Main entry point: Generates a dynamic LLM roadmap when configured,
 * or gracefully falls back to the deterministic static template in mock mode.
 */
export async function generateRoadmap(opts: GenerateOpts): Promise<Roadmap> {
  const hasKey = isLlmConfigured(opts.provider, opts.model);
  const isMock = isMockModeForced();

  if (!isMock && hasKey) {
    try {
      return await generateDynamicRoadmap(opts);
    } catch (err) {
      console.error("[roadmap/generator] LLM dynamic generation failed, using static fallback:", err);
    }
  }

  return generateStaticRoadmap(opts);
}
