/**
 * Personalized Roadmap Generator
 *
 * Dynamically constructs a structured learning roadmap based on the user's
 * learning profile (goal, current level, known skills, and weekly hours).
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
      relatedConcepts: ["JavaScript", "Node.js", "HTTP"],
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
      relatedConcepts: ["REST", "HTTP", "APIs"],
      mentorId: "backend",
      practicalTask: "Design a REST resource for /users with correct codes (201, 400, 404, 409).",
      projectBrief: "Spec a Todo API with OpenAPI and mock it",
      commonMistakes: ["200 for errors", "No validation"],
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

export function generateRoadmap(opts: GenerateOpts): Roadmap {
  const { userId, profile } = opts;
  const template = pickTemplate(profile.goal);
  const known = profile.knownSkills.map((s) => s.toLowerCase().trim());

  const rawNodes: RoadmapNode[] = template.map((t, idx) => {
    // Check if user already knows this topic (or any related concept)
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
    };
  });

  // Find the first non-completed node and set it to 'current'
  const firstUncompletedIdx = rawNodes.findIndex((n) => n.status !== "completed");
  if (firstUncompletedIdx !== -1) {
    rawNodes[firstUncompletedIdx].status = "current";
    if (firstUncompletedIdx + 1 < rawNodes.length) {
      rawNodes[firstUncompletedIdx + 1].status = "next";
    }
  } else if (rawNodes.length > 0) {
    // All completed? Set last node as current for revision
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
