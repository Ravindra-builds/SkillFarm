/**
 * Concept-First Learning Roadmap & Main-Project Generator
 *
 * Constructs a structured, learning-first engineering curriculum where every week
 * prioritizes deep conceptual understanding, mental models, and practical drills,
 * followed by applying those principles to ONE unified Main-Project.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { randomUUID } from "crypto";
import type { LearningProfileInput } from "@/lib/learning-profile";
import type { Roadmap, RoadmapNode, CapstoneProject } from "@/lib/roadmap-store";
import { getLlmModel, isLlmConfigured } from "@/lib/llm";
import { isMockModeForced } from "@/lib/env";
import { getMemories } from "@/lib/memory/mem0";

type GenerateOpts = {
  userId: string;
  profile: LearningProfileInput;
  provider?: string;
  model?: string;
};

// Zod Schema for Concept-First Weekly Roadmap & Main-Project generation
const roadmapSchema = z.object({
  title: z.string().describe("Concise title of the customized engineering learning roadmap"),
  description: z.string().describe("Two-sentence overview of the learning journey and target outcome"),
  capstoneProject: z.object({
    name: z.string().describe("Engaging, professional portfolio Main-Project name"),
    description: z.string().describe("High-level description of what the single Main-Project application does"),
    goalAlignment: z.string().describe("How this Main-Project directly proves mastery of the user's career goal"),
    stack: z.array(z.string()).describe("Core technologies and libraries used in this project"),
    features: z.array(z.string()).describe("Chronological list of major features to build into this single Main-Project"),
  }),
  totalWeeks: z.number().int().min(2).max(12).describe("Total number of structured weeks"),
  nodes: z.array(
    z.object({
      week: z.number().int().min(1).max(12).describe("Chronological week number (1, 2, 3...)"),
      slug: z.string().describe("Unique identifier like 'relational-database-design'"),
      topic: z.string().describe("The main concept/subject learned this week (e.g. 'Relational Database Design', NOT 'Build DB')"),
      description: z.string().describe("A short explanation of what the learner will understand by the end of the week"),
      learningObjectives: z.array(z.string()).describe("2-4 conceptual outcomes the learner should be able to explain"),
      concepts: z.array(z.string()).describe("Concrete sub-topics to study (e.g. ['Tables', 'Foreign keys', 'Normalization'])"),
      mentalModels: z.array(z.string()).describe("Conceptual understanding, architectural trade-offs, and 'why' behind the topic"),
      practicalTask: z.string().describe("A small independent 20-30 min practice exercise/drill"),
      capstoneApplication: z.array(z.string()).describe("3-4 concrete tasks that apply this week's concept directly to the Main-Project"),
      featureCompleted: z.string().describe("The practical result produced by applying the week's learning (e.g. 'Persistent Project Data')"),
      difficulty: z.enum(["beginner", "intermediate", "advanced"]),
      estimatedHours: z.number().min(1).max(40).describe("Total estimated hours for this week"),
      mentorId: z.enum(["backend", "frontend", "ai-engineer", "devops", "security", "system-design"]),
      prerequisites: z.array(z.string()).default([]),
      commonMistakes: z.array(z.string()).default([]),
    })
  ).min(4).max(16),
});

const STATIC_TRACKS: Record<
  string,
  {
    capstone: CapstoneProject;
    nodes: (Omit<RoadmapNode, "id" | "status" | "order" | "relatedConcepts"> & { relatedConcepts?: string[] })[];
  }
> = {
  backend: {
    capstone: {
      name: "CloudScale API Engine",
      description: "A production-grade distributed backend service with authentication, caching, rate limiting, and multi-tenant persistence.",
      goalAlignment: "Proves enterprise backend mastery with Node.js/TypeScript, PostgreSQL, Redis, and cloud architectures.",
      stack: ["Node.js", "TypeScript", "Fastify", "PostgreSQL", "Drizzle ORM", "Redis", "Docker", "Vitest"],
      features: [
        "Base HTTP Server & Request Pipeline",
        "Persistent Database Layer with PostgreSQL & Drizzle",
        "JWT & httpOnly Cookie Authentication with Refresh Rotation",
        "Redis Sliding-Window Rate Limiting & Distributed Caching",
        "End-to-End Integration Test Suite & Docker Containerization",
      ],
    },
    nodes: [
      {
        week: 1,
        slug: "node-fundamentals",
        topic: "Runtime Mental Models & HTTP Protocols",
        title: "Node.js Core & REST API Architecture",
        description: "Understand the non-blocking event loop, stream backpressure, error propagation pipelines, and REST semantics.",
        whyItMatters: "Solid runtime mental models prevent blocking bugs and performance bottlenecks under production load.",
        difficulty: "beginner",
        learningObjectives: [
          "Understand how the Node.js event loop executes asynchronous I/O",
          "Understand HTTP request/response lifecycles and status code standards",
          "Understand stream backpressure and memory-efficient data processing",
        ],
        concepts: ["Event Loop", "Call Stack & Microtask Queue", "HTTP Methods & Headers", "Streams & Buffers"],
        mentalModels: [
          "Non-blocking I/O delegates work to libuv worker threads",
          "Streams process data in chunks to keep memory usage flat",
          "Centralized error pipelines decouple business logic from failure responses",
        ],
        practicalTask: "Write a tiny HTTP stream handler that pipes large files without buffer overflow.",
        capstoneApplication: [
          "Scaffold TypeScript project structure with strict compiler options",
          "Create modular HTTP router using Fastify / Node.js",
          "Implement centralized error handling and request logging middleware",
        ],
        projectWork: [
          "Scaffold TypeScript project structure with strict compiler options",
          "Create modular HTTP router using Fastify / Node.js",
          "Implement centralized error handling and request logging middleware",
        ],
        featureCompleted: "Base HTTP Server & Request Pipeline",
        projectBrief: "Initialize CloudScale API repo with standard routing and error middleware",
        commonMistakes: ["Blocking the event loop with synchronous operations", "Ignoring error pipelines"],
        prerequisites: [],
        estimatedHours: 6,
        mentorId: "backend",
      },
      {
        week: 2,
        slug: "database-drizzle-postgres",
        topic: "Relational Database Design & Persistence",
        title: "PostgreSQL Modeling, Indexes & Drizzle ORM",
        description: "Understand entity relational modeling, foreign keys, index structures, connection pooling, and atomic transactions.",
        whyItMatters: "Your data model outlives your application code — indexing and schema choices determine scalability.",
        difficulty: "beginner",
        learningObjectives: [
          "Understand how relational databases structure and normalize data",
          "Understand how B-Tree indexes accelerate queries and when to use composite indexes",
          "Understand ACID transactions and connection pool sizing",
        ],
        concepts: ["Relational Schemas", "Primary & Foreign Keys", "B-Tree Indexes", "ACID Transactions", "Connection Pooling"],
        mentalModels: [
          "Why relational modeling enforces data integrity at the database layer",
          "How indexes trade write latency for read velocity",
          "When normalization prevents anomalies vs when to denormalize for read scale",
        ],
        practicalTask: "Design a relational schema for a task management system and analyze EXPLAIN query plans.",
        capstoneApplication: [
          "Define User, Organization, and Resource schema models with Drizzle",
          "Configure connection pooling with Neon PostgreSQL",
          "Write migration scripts and seed initial test data",
          "Build validated CRUD endpoints with Zod schema validation",
        ],
        projectWork: [
          "Define User, Organization, and Resource schema models with Drizzle",
          "Configure connection pooling with Neon PostgreSQL",
          "Write migration scripts and seed initial test data",
          "Build validated CRUD endpoints with Zod schema validation",
        ],
        featureCompleted: "Persistent Database Layer & Validated CRUD",
        projectBrief: "Connect CloudScale API to PostgreSQL and implement CRUD with migrations",
        commonMistakes: ["Missing foreign key indexes", "Giant long-running transactions"],
        prerequisites: ["node-fundamentals"],
        estimatedHours: 8,
        mentorId: "backend",
      },
      {
        week: 3,
        slug: "auth-security-sessions",
        topic: "Authentication & Cryptographic Authorization",
        title: "JWT, Session Tokens & RBAC Authorization",
        description: "Understand password hashing algorithms, stateless vs stateful tokens, httpOnly cookie security, and role-based access control.",
        whyItMatters: "Authentication is where web applications fail — doing it properly protects customer data and prevents account takeovers.",
        difficulty: "intermediate",
        learningObjectives: [
          "Understand cryptographic hashing (Argon2 / bcrypt) vs symmetric encryption",
          "Understand the trade-offs between stateless JWTs and stateful database sessions",
          "Understand role-based access control (RBAC) permission modeling",
        ],
        concepts: ["Argon2 / bcrypt", "JWT Structure & Claims", "Refresh Token Rotation", "httpOnly Cookies", "RBAC"],
        mentalModels: [
          "Never store sensitive tokens in localStorage due to XSS vulnerability",
          "Short-lived access tokens paired with rotating refresh tokens balance security and performance",
          "Authorization must be enforced on every resource query, not just at route entry",
        ],
        practicalTask: "Write a token verification middleware that validates claims and rejects expired signatures.",
        capstoneApplication: [
          "Implement password hashing and secure user registration endpoint",
          "Build access JWT + httpOnly refresh cookie rotation logic",
          "Create authentication middleware and RBAC permission checks for API routes",
        ],
        projectWork: [
          "Implement password hashing and secure user registration endpoint",
          "Build access JWT + httpOnly refresh cookie rotation logic",
          "Create authentication middleware and RBAC permission checks for API routes",
        ],
        featureCompleted: "Production-Grade Authentication & RBAC",
        projectBrief: "Secure CloudScale API endpoints with JWT session rotation and role checks",
        commonMistakes: ["Storing JWTs in localStorage", "No token rotation", "Unsalted password hashes"],
        prerequisites: ["database-drizzle-postgres"],
        estimatedHours: 8,
        mentorId: "security",
      },
      {
        week: 4,
        slug: "caching-redis-rate-limit",
        topic: "Distributed Caching & API Rate Limiting",
        title: "Redis Caching Strategies & Sliding-Window Rate Limiting",
        description: "Understand in-memory caching patterns, TTL eviction, cache stampede mitigation, and sliding-window rate limiters.",
        whyItMatters: "Caching reduces latency by 10x, while rate limiting protects infrastructure against denial-of-service abuse.",
        difficulty: "intermediate",
        learningObjectives: [
          "Understand cache-aside, read-through, and write-through caching patterns",
          "Understand cache invalidation strategies and TTL expiration",
          "Understand sliding-window rate limiting algorithms using Redis sorted sets",
        ],
        concepts: ["In-Memory Data Structures", "Cache Eviction Policies", "Cache Invalidation", "Sliding Window Algorithm", "Token Bucket"],
        mentalModels: [
          "Cache is an optimization trade-off between speed and data freshness",
          "Invalidating cache on write prevents stale data anomalies",
          "Rate limiting throttles abusive traffic before database resources are exhausted",
        ],
        practicalTask: "Implement a sliding-window rate limiter using Redis sorted sets.",
        capstoneApplication: [
          "Integrate Redis client with connection retry and fallback logic",
          "Implement read-through caching for high-frequency resource queries",
          "Build sliding-window rate limiting middleware with Upstash Redis",
        ],
        projectWork: [
          "Integrate Redis client with connection retry and fallback logic",
          "Implement read-through caching for high-frequency resource queries",
          "Build sliding-window rate limiting middleware with Upstash Redis",
        ],
        featureCompleted: "Distributed Caching & API Abuse Protection",
        projectBrief: "Add Redis caching and rate limiting to CloudScale API",
        commonMistakes: ["Caching everything without TTLs", "No invalidation strategy"],
        prerequisites: ["auth-security-sessions"],
        estimatedHours: 8,
        mentorId: "backend",
      },
      {
        week: 5,
        slug: "testing-docker-deployment",
        topic: "Production Reliability, Containerization & CI/CD",
        title: "Integration Testing, Multi-Stage Docker & Cloud Launch",
        description: "Understand automated test pyramids, isolated container environments, multi-stage builds, and continuous deployment workflows.",
        whyItMatters: "Code only delivers value when tested and deployed reliably into a production environment.",
        difficulty: "advanced",
        learningObjectives: [
          "Understand the testing pyramid: unit vs integration vs end-to-end assertions",
          "Understand Docker layers, build caching, and multi-stage container optimization",
          "Understand automated CI/CD deployment pipelines with environment secret injection",
        ],
        concepts: ["Vitest / Jest", "Integration Testing", "Docker Layers", "Multi-Stage Builds", "GitHub Actions CI/CD"],
        mentalModels: [
          "Tests are living documentation and guardrails against regression",
          "Multi-stage Docker builds separate build dependencies from minimal production runtimes",
          "Continuous integration ensures every commit is verified before hitting production",
        ],
        practicalTask: "Write a multi-stage Dockerfile that drops build tools and executes as a non-root user.",
        capstoneApplication: [
          "Write comprehensive integration tests covering auth and CRUD flows",
          "Create optimized multi-stage Dockerfile with non-root security",
          "Configure GitHub Actions CI workflow to run linter and test suite",
          "Deploy CloudScale API to production cloud with automated health checks",
        ],
        projectWork: [
          "Write comprehensive integration tests covering auth and CRUD flows",
          "Create optimized multi-stage Dockerfile with non-root security",
          "Configure GitHub Actions CI workflow to run linter and test suite",
          "Deploy CloudScale API to production cloud with automated health checks",
        ],
        featureCompleted: "Production Deployment & Automated CI/CD",
        projectBrief: "Containerize and deploy CloudScale API with 85%+ test coverage",
        commonMistakes: ["Leaking environment secrets", "No health checks in production"],
        prerequisites: ["caching-redis-rate-limit"],
        estimatedHours: 10,
        mentorId: "devops",
      },
    ],
  },
  frontend: {
    capstone: {
      name: "PulseSync Workspace UI",
      description: "A high-performance modern web application dashboard with interactive analytics, optimistic state management, and dark mode design system.",
      goalAlignment: "Demonstrates production frontend mastery with Next.js App Router, React Server Components, Tailwind CSS, and Web Vitals.",
      stack: ["Next.js", "React 19", "TypeScript", "Tailwind CSS", "shadcn/ui", "Zod", "React Hook Form"],
      features: [
        "Accessible Component Library & Dark-Mode Theme",
        "Streaming Dashboard Layout & Server-Rendered Views",
        "Interactive Form Engine & Workspace Onboarding",
        "Production Performance Optimization & 95+ Web Vitals",
      ],
    },
    nodes: [
      {
        week: 1,
        slug: "react-components-design-system",
        topic: "Design Systems & Component Architecture",
        title: "Tailwind Design System & Component Primitives",
        description: "Understand component composition, design tokens, accessible primitives, and responsive styling hierarchies.",
        whyItMatters: "A polished, accessible design system sets the foundation for high-velocity UI development.",
        difficulty: "beginner",
        learningObjectives: [
          "Understand component composition and property delegation",
          "Understand Tailwind CSS variable tokens for flexible theme switching",
          "Understand ARIA accessible primitives and focus states",
        ],
        concepts: ["Component Composition", "CSS Variables & Tokens", "Tailwind Utilities", "Accessible ARIA Roles"],
        mentalModels: [
          "Components should have single responsibilities and compose cleanly",
          "Tokens decouple visual themes from hardcoded styles",
          "Accessibility is built into primitives, not patched on later",
        ],
        practicalTask: "Build a responsive dark-mode hero component using CSS variable tokens.",
        capstoneApplication: [
          "Initialize Next.js project with Tailwind CSS and theme tokens",
          "Build reusable button, input, badge, and dialog primitives",
          "Implement fluid dark/light theme switcher with persistent storage",
        ],
        projectWork: [
          "Initialize Next.js project with Tailwind CSS and theme tokens",
          "Build reusable button, input, badge, and dialog primitives",
          "Implement fluid dark/light theme switcher with persistent storage",
        ],
        featureCompleted: "Accessible Component Library & Dark-Mode Theme",
        projectBrief: "Build design system token foundations for PulseSync Workspace",
        commonMistakes: ["Hardcoded hex colors", "Ignoring mobile breakpoints"],
        prerequisites: [],
        estimatedHours: 6,
        mentorId: "frontend",
      },
      {
        week: 2,
        slug: "nextjs-app-router-data",
        topic: "Server Component Architecture & Streaming",
        title: "Next.js App Router, Streaming & Layouts",
        description: "Understand React Server Components vs Client Components, Suspense streaming boundaries, nested layouts, and Server Actions.",
        whyItMatters: "App Router is how modern production web applications fetch data with minimal client bundle sizes.",
        difficulty: "intermediate",
        learningObjectives: [
          "Understand the server/client component boundary and serialization rules",
          "Understand Suspense streaming to render UI skeletons while data fetches",
          "Understand Server Actions for secure form mutations without client API routes",
        ],
        concepts: ["React Server Components (RSC)", "Suspense Streaming", "Nested Layouts", "Server Actions"],
        mentalModels: [
          "Keep data fetching on the server to eliminate waterfall requests",
          "Client components should only be used for interactive leaves of the tree",
          "Streaming Suspense boundaries unblock Fast First Contentful Paint",
        ],
        practicalTask: "Convert a slow page into a Server Component with streaming Suspense skeleton.",
        capstoneApplication: [
          "Implement App Router nested layouts for dashboard navigation",
          "Fetch server-side data using React Server Components with Suspense fallbacks",
          "Build active workspace selector and route breadcrumbs",
        ],
        projectWork: [
          "Implement App Router nested layouts for dashboard navigation",
          "Fetch server-side data using React Server Components with Suspense fallbacks",
          "Build active workspace selector and route breadcrumbs",
        ],
        featureCompleted: "Streaming Dashboard Layout & Server-Rendered Views",
        projectBrief: "Build App Router dashboard shell for PulseSync Workspace",
        commonMistakes: ["Marking everything 'use client'", "Missing error boundaries"],
        prerequisites: ["react-components-design-system"],
        estimatedHours: 8,
        mentorId: "frontend",
      },
      {
        week: 3,
        slug: "forms-zod-validation",
        topic: "Form State Management & Schema Validation",
        title: "Multi-Step Form Wizard & Zod Validation",
        description: "Understand controlled vs uncontrolled forms, schema validation with Zod, accessible error states, and optimistic UI.",
        whyItMatters: "Forms are where users input critical data — unified validation prevents data corruption and improves user trust.",
        difficulty: "intermediate",
        learningObjectives: [
          "Understand shared schema validation between client and server",
          "Understand accessible form error states and field focus management",
          "Understand optimistic UI updates for instant user feedback",
        ],
        concepts: ["React Hook Form", "Zod Validation", "Optimistic State", "Field Error Accessibility"],
        mentalModels: [
          "Validate early on the client for UX, validate authoritatively on the server for security",
          "Optimistic UI updates state immediately and rolls back only on server error",
          "Form schemas should be single sources of truth shared across client and server",
        ],
        practicalTask: "Build a multi-step form with shared Zod schema between client and server.",
        capstoneApplication: [
          "Build multi-step onboarding wizard with React Hook Form and Zod",
          "Implement inline field-level validation and clear error states",
          "Connect form submissions to Server Actions with optimistic UI updates",
        ],
        projectWork: [
          "Build multi-step onboarding wizard with React Hook Form and Zod",
          "Implement inline field-level validation and clear error states",
          "Connect form submissions to Server Actions with optimistic UI updates",
        ],
        featureCompleted: "Interactive Form Engine & Workspace Onboarding",
        projectBrief: "Implement onboarding form wizard in PulseSync Workspace",
        commonMistakes: ["Client-only validation", "Uninformative error messages"],
        prerequisites: ["nextjs-app-router-data"],
        estimatedHours: 8,
        mentorId: "frontend",
      },
      {
        week: 4,
        slug: "frontend-performance-vitals",
        topic: "Web Vitals & Performance Optimization",
        title: "Core Web Vitals, Code Splitting & Performance",
        description: "Understand Core Web Vitals (LCP, CLS, INP), dynamic code splitting, image optimization, and bundle audits.",
        whyItMatters: "Fast loading directly improves user retention, conversion rates, and search rankings.",
        difficulty: "advanced",
        learningObjectives: [
          "Understand how Largest Contentful Paint (LCP) and Cumulative Layout Shift (CLS) are measured",
          "Understand dynamic imports and code splitting for heavy interactive components",
          "Understand Next.js image and font optimization pipelines",
        ],
        concepts: ["Core Web Vitals", "Dynamic Imports (next/dynamic)", "Bundle Analysis", "Font & Image Optimization"],
        mentalModels: [
          "Every kilobyte of JavaScript delayed is rendering speed gained",
          "Reserve aspect-ratio dimensions to prevent layout shifts",
          "Profile performance with real user metrics rather than synthetic benchmarks",
        ],
        practicalTask: "Audit a Next.js page and reduce JavaScript bundle size by 40% with dynamic imports.",
        capstoneApplication: [
          "Perform Lighthouse and Web Vitals audit on dashboard views",
          "Implement dynamic imports (`next/dynamic`) for heavy chart dialogs",
          "Optimize Next.js images and responsive typography to achieve 95+ score",
        ],
        projectWork: [
          "Perform Lighthouse and Web Vitals audit on dashboard views",
          "Implement dynamic imports (`next/dynamic`) for heavy chart dialogs",
          "Optimize Next.js images and responsive typography to achieve 95+ score",
        ],
        featureCompleted: "Production Performance Optimization & 95+ Web Vitals",
        projectBrief: "Profile and optimize PulseSync Workspace for Lighthouse 95+",
        commonMistakes: ["Unoptimized images", "Large third-party script bundles"],
        prerequisites: ["forms-zod-validation"],
        estimatedHours: 8,
        mentorId: "frontend",
      },
    ],
  },
  ai: {
    capstone: {
      name: "NexusAI Copilot Engine",
      description: "An autonomous AI orchestration assistant with vector semantic memory, tool calling, and multi-agent synthesis.",
      goalAlignment: "Demonstrates production AI engineering with LLM SDKs, embeddings, RAG, pgvector, and evals.",
      stack: ["TypeScript", "Vercel AI SDK", "OpenAI / Gemini", "pgvector", "PostgreSQL", "Fastify"],
      features: [
        "Streaming LLM Chat & Structured Extraction Engine",
        "Semantic Knowledge Base & RAG Retrieval Pipeline",
        "Autonomous Agent Tool Calling & Action Engine",
        "Automated Evaluation Pipeline & Telemetry Dashboard",
      ],
    },
    nodes: [
      {
        week: 1,
        slug: "llm-apis-structured-output",
        topic: "LLM Prompt Architecture & Structured Output",
        title: "LLM APIs, Structured Output & Streaming",
        description: "Understand model parameters (temperature, top_p), system prompts, schema-guided generation with Zod, and HTTP streaming.",
        whyItMatters: "Structured generation turns unpredictable LLM responses into type-safe, reliable software components.",
        difficulty: "beginner",
        learningObjectives: [
          "Understand tokenization and sampling parameters (temperature, top_p)",
          "Understand how schema-guided generation forces LLMs to emit strict JSON",
          "Understand streaming text protocols for low time-to-first-token UX",
        ],
        concepts: ["Tokens & Sampling", "System Prompts", "Zod Schema Generation", "Server-Sent Events (SSE)"],
        mentalModels: [
          "LLMs are probabilistic token predictors; structured schemas constrain the probability space",
          "Streaming text improves perceived latency even on long generations",
          "System prompts establish behavioral constraints and persona guardrails",
        ],
        practicalTask: "Implement structured object generation with Vercel AI SDK generateObject.",
        capstoneApplication: [
          "Initialize NexusAI Copilot service with Vercel AI SDK",
          "Implement streaming chat completion endpoint with markdown support",
          "Build structured JSON extraction endpoint with strict Zod schema validation",
        ],
        projectWork: [
          "Initialize NexusAI Copilot service with Vercel AI SDK",
          "Implement streaming chat completion endpoint with markdown support",
          "Build structured JSON extraction endpoint with strict Zod schema validation",
        ],
        featureCompleted: "Streaming LLM Chat & Structured Extraction Engine",
        projectBrief: "Build streaming and structured generation endpoints for NexusAI",
        commonMistakes: ["Free-text parsing without schema", "No fallback when LLM fails"],
        prerequisites: [],
        estimatedHours: 6,
        mentorId: "ai-engineer",
      },
      {
        week: 2,
        slug: "rag-embeddings-vector-search",
        topic: "Vector Embeddings & Semantic Retrieval (RAG)",
        title: "Embeddings, pgvector & RAG Pipeline",
        description: "Understand high-dimensional vector embeddings, chunking strategies with overlap, cosine similarity search, and context injection.",
        whyItMatters: "RAG connects private data to LLMs accurately without the expense and latency of fine-tuning.",
        difficulty: "intermediate",
        learningObjectives: [
          "Understand how dense vector embeddings represent semantic meaning",
          "Understand text chunking strategies, windowing, and overlap trade-offs",
          "Understand vector indexing (HNSW / IVFFlat) and similarity ranking with pgvector",
        ],
        concepts: ["Vector Embeddings", "Chunking & Tokenization", "Cosine Similarity", "pgvector (HNSW)", "Context Injection"],
        mentalModels: [
          "Embeddings convert semantic concepts into geometric distances in high-dimensional space",
          "Chunk size is a trade-off: large chunks provide context but dilute specificity",
          "RAG grounds LLM responses with verified factual retrieval to eliminate hallucination",
        ],
        practicalTask: "Write a document chunking script and query vectors using cosine similarity.",
        capstoneApplication: [
          "Build document chunking pipeline with configurable overlap",
          "Generate text embeddings and store vectors in PostgreSQL with pgvector",
          "Implement hybrid semantic search endpoint with top-k context retrieval",
        ],
        projectWork: [
          "Build document chunking pipeline with configurable overlap",
          "Generate text embeddings and store vectors in PostgreSQL with pgvector",
          "Implement hybrid semantic search endpoint with top-k context retrieval",
        ],
        featureCompleted: "Semantic Knowledge Base & RAG Retrieval Pipeline",
        projectBrief: "Integrate vector embeddings and knowledge retrieval into NexusAI",
        commonMistakes: ["Naïve character chunking", "No similarity threshold filtering"],
        prerequisites: ["llm-apis-structured-output"],
        estimatedHours: 8,
        mentorId: "ai-engineer",
      },
      {
        week: 3,
        slug: "autonomous-agents-tool-calling",
        topic: "Autonomous Agent Execution Loops & Tool Calling",
        title: "Agent Execution Loops & Tool Calling",
        description: "Understand iterative agent execution loops, multi-tool binding, tool argument validation, and safety guardrails.",
        whyItMatters: "Agents transform passive language models into active software that queries databases, browses data, and automates workflows.",
        difficulty: "advanced",
        learningObjectives: [
          "Understand how LLMs decide when and which tools to call",
          "Understand iterative agent execution loops (Thought -> Action -> Observation)",
          "Understand safety bounds (maximum iterations, permission validation, timeout)",
        ],
        concepts: ["Tool Calling", "ReAct Framework", "Execution Loops", "Guardrails & Timeouts"],
        mentalModels: [
          "Tools give LLMs deterministic hands in a non-deterministic world",
          "The agent loop is a state machine that runs until termination or answer generation",
          "Tool inputs must be validated with Zod schemas exactly like user inputs",
        ],
        practicalTask: "Build an autonomous agent with 3 restricted tools and input safety validation.",
        capstoneApplication: [
          "Define tools for web search, calculator, and database querying with Zod schemas",
          "Build agentic execution loop that calls tools dynamically based on user questions",
          "Implement safety guardrails to prevent infinite loops and unauthorized actions",
        ],
        projectWork: [
          "Define tools for web search, calculator, and database querying with Zod schemas",
          "Build agentic execution loop that calls tools dynamically based on user questions",
          "Implement safety guardrails to prevent infinite loops and unauthorized actions",
        ],
        featureCompleted: "Autonomous Agent Tool Calling & Action Engine",
        projectBrief: "Add multi-tool autonomous agent capabilities to NexusAI",
        commonMistakes: ["Infinite agent execution loops", "Unsanitized tool inputs"],
        prerequisites: ["rag-embeddings-vector-search"],
        estimatedHours: 10,
        mentorId: "ai-engineer",
      },
      {
        week: 4,
        slug: "ai-evals-tracing-telemetry",
        topic: "LLM Evaluations, Observability & Telemetry",
        title: "LLM Evaluations, Benchmarks & Tracing",
        description: "Understand deterministic vs model-graded evaluations, synthetic benchmarks, prompt regression testing, and token latency tracing.",
        whyItMatters: "Without automated evaluations, prompt changes are guesswork. Measure precision and latency before shipping.",
        difficulty: "advanced",
        learningObjectives: [
          "Understand automated assertion testing for LLM outputs",
          "Understand token usage, latency telemetry, and cost monitoring",
          "Understand automated regression pipelines for prompt iterations",
        ],
        concepts: ["Evals & Assertions", "Synthetic Benchmarks", "Latency Tracing", "Prompt Regression Testing"],
        mentalModels: [
          "If you cannot measure prompt performance, you cannot improve it reliably",
          "Telemetry traces reveal where latency and token costs accumulate in multi-step pipelines",
          "Automated evals give teams confidence to refactor models and prompts",
        ],
        practicalTask: "Build an assertion pipeline testing LLM outputs against 10 test cases.",
        capstoneApplication: [
          "Create test benchmark suite with 15 synthetic test cases evaluating precision",
          "Add token usage and latency telemetry logging to all LLM requests",
          "Implement automated regression testing pipeline for prompt updates",
        ],
        projectWork: [
          "Create test benchmark suite with 15 synthetic test cases evaluating precision",
          "Add token usage and latency telemetry logging to all LLM requests",
          "Implement automated regression testing pipeline for prompt updates",
        ],
        featureCompleted: "Automated Evaluation Pipeline & Telemetry Dashboard",
        projectBrief: "Build evaluation suite and observability telemetry for NexusAI",
        commonMistakes: ["No automated evals", "Ignoring token cost accumulation"],
        prerequisites: ["autonomous-agents-tool-calling"],
        estimatedHours: 8,
        mentorId: "ai-engineer",
      },
    ],
  },
  security: {
    capstone: {
      name: "FortressGuard Security Platform",
      description: "An enterprise API security gateway with automated vulnerability auditing, rate limiting, OAuth/JWT authentication, and audit telemetry.",
      goalAlignment: "Proves security engineering competence across OWASP Top 10, authz/authn, rate limiting, and defensive system design.",
      stack: ["TypeScript", "Node.js", "Redis", "PostgreSQL", "OAuth2", "Docker"],
      features: [
        "Input Sanitization & Secure Header Gateway",
        "RBAC Authorization & Distributed Rate Limiter",
      ],
    },
    nodes: [
      {
        week: 1,
        slug: "appsec-owasp-top-10",
        topic: "Application Security & Threat Defenses",
        title: "OWASP Top 10 Defenses & Input Sanitization",
        description: "Understand threat modeling, input validation, SQL injection, XSS, CSRF, and secure response headers.",
        whyItMatters: "Security is foundational — proactive defense is far cheaper than incident remediation.",
        difficulty: "beginner",
        learningObjectives: [
          "Understand OWASP Top 10 vulnerability vectors and exploit mechanics",
          "Understand strict schema-based input sanitization and parameterized queries",
          "Understand security headers: CSP, HSTS, and X-Frame-Options",
        ],
        concepts: ["OWASP Top 10", "SQL Injection", "XSS & CSRF", "Content Security Policy (CSP)", "Input Sanitization"],
        mentalModels: [
          "Never trust input from the client regardless of source",
          "Defense in depth provides overlapping layers of protection",
          "Parameterized queries neutralize SQL injection by separating code from data",
        ],
        practicalTask: "Audit an API route for prompt injection and SSRF vulnerabilities.",
        capstoneApplication: [
          "Scaffold FortressGuard security gateway project",
          "Implement strict input sanitization middleware with Zod",
          "Configure secure HTTP response headers (CSP, HSTS, X-Frame-Options)",
        ],
        projectWork: [
          "Scaffold FortressGuard security gateway project",
          "Implement strict input sanitization middleware with Zod",
          "Configure secure HTTP response headers (CSP, HSTS, X-Frame-Options)",
        ],
        featureCompleted: "Input Sanitization & Secure Header Gateway",
        projectBrief: "Build input sanitization and security header middleware for FortressGuard",
        commonMistakes: ["Trusting client inputs", "Ignoring CORS policies"],
        prerequisites: [],
        estimatedHours: 6,
        mentorId: "security",
      },
      {
        week: 2,
        slug: "authz-secrets-rbac",
        topic: "Authorization, Rate Limiting & Secrets Management",
        title: "RBAC, Secrets Management & Rate Limiting",
        description: "Understand role-based and attribute-based access control, secret rotation, and distributed sliding-window rate limiting.",
        whyItMatters: "Authentication verifies identity; authorization strictly controls resource permissions and prevents privilege escalation.",
        difficulty: "intermediate",
        learningObjectives: [
          "Understand multi-tenant Role-Based Access Control (RBAC) schemas",
          "Understand sliding-window rate limiting to prevent brute-force attacks",
          "Understand secret management, environment isolation, and audit logging",
        ],
        concepts: ["RBAC", "Secrets Management", "Sliding Window Rate Limiting", "Audit Logging", "Least Privilege"],
        mentalModels: [
          "Principle of Least Privilege: users and services should only have access to what they need",
          "Rate limiting throttles credential stuffing attacks before they compromise accounts",
          "Audit logs must be immutable and record who changed what resource and when",
        ],
        practicalTask: "Implement sliding window rate limiting with Upstash Redis.",
        capstoneApplication: [
          "Implement multi-tenant RBAC authorization middleware",
          "Integrate sliding-window rate limiting with Redis to prevent brute-force attacks",
          "Build encrypted audit logger tracking all privilege changes and access events",
        ],
        projectWork: [
          "Implement multi-tenant RBAC authorization middleware",
          "Integrate sliding-window rate limiting with Redis to prevent brute-force attacks",
          "Build encrypted audit logger tracking all privilege changes and access events",
        ],
        featureCompleted: "RBAC Authorization & Distributed Rate Limiter",
        projectBrief: "Add multi-tenant RBAC and Redis rate limiting to FortressGuard",
        commonMistakes: ["Hardcoded secrets in git", "Missing tenant isolation"],
        prerequisites: ["appsec-owasp-top-10"],
        estimatedHours: 8,
        mentorId: "security",
      },
    ],
  },
};

function pickTemplate(goal: string): typeof STATIC_TRACKS.backend {
  const g = goal.toLowerCase();
  if (g.includes("ai") || g.includes("llm") || g.includes("rag") || g.includes("agent")) return STATIC_TRACKS.ai;
  if (g.includes("security") || g.includes("owasp") || g.includes("auth")) return STATIC_TRACKS.security;
  if (g.includes("frontend") || g.includes("react") || g.includes("ui") || g.includes("next")) return STATIC_TRACKS.frontend;
  return STATIC_TRACKS.backend;
}

/**
 * Deterministic template-based fallback generator for offline or mock mode.
 */
export function generateStaticRoadmap(opts: GenerateOpts): Roadmap {
  const { userId, profile } = opts;
  const track = pickTemplate(profile.goal);

  const rawNodes: RoadmapNode[] = track.nodes.map((t, idx) => {
    return {
      id: randomUUID(),
      slug: t.slug,
      topic: t.topic || t.theme || t.title,
      theme: t.theme || t.topic || t.title,
      title: t.title,
      description: t.description,
      whyItMatters: t.whyItMatters,
      difficulty: t.difficulty,
      learningObjectives: t.learningObjectives,
      concepts: t.concepts || t.relatedConcepts || [],
      mentalModels: t.mentalModels || [t.whyItMatters],
      prerequisites: t.prerequisites,
      relatedConcepts: t.relatedConcepts || t.concepts || [],
      mentorId: t.mentorId,
      order: idx,
      status: idx === 0 ? "current" : idx === 1 ? "next" : "locked",
      practicalTask: t.practicalTask,
      capstoneApplication: t.capstoneApplication || t.projectWork || [],
      projectWork: t.projectWork || t.capstoneApplication || [],
      featureCompleted: t.featureCompleted,
      projectBrief: t.projectBrief,
      commonMistakes: t.commonMistakes,
      week: t.week ?? idx + 1,
      estimatedHours: t.estimatedHours ?? 6,
    };
  });

  const title = profile.goal.length > 60 ? profile.goal.slice(0, 60) + "…" : profile.goal;

  return {
    id: randomUUID(),
    userId,
    title: `Roadmap — ${title}`,
    description: `Personalized for ${profile.currentLevel} level • Main-Project: ${track.capstone.name} • ${profile.weeklyHours}h/week`,
    capstoneProject: track.capstone,
    nodes: rawNodes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Dynamic LLM-Powered Roadmap Generator
 * Follows the LEARNING-FIRST philosophy: Concept & Mental Models first -> Practical Drill -> Main-Project Application.
 */
export async function generateDynamicRoadmap(opts: GenerateOpts): Promise<Roadmap> {
  const { userId, profile, provider, model } = opts;

  let memoriesSummary = "";
  try {
    const mems = await getMemories(userId);
    if (mems.length > 0) {
      memoriesSummary = `\n- Stored Background & Resume Facts: ${mems.slice(0, 8).map((m) => m.memory).join("; ")}`;
    }
  } catch {}

  const targetHours = profile.weeklyHours || 10;
  const userLevel = profile.currentLevel || "intermediate";

  const systemPrompt = `You are the Lead Curriculum & Engineering Architect for SkillFarm.
Your mission is to generate a comprehensive, highly personalized CONCEPT-FIRST learning roadmap paired with ONE unified Main-Project where the learner applies their knowledge.

CRITICAL LEARNING-FIRST ROADMAP RULES:
1. THE ROADMAP IS PRIMARILY A LEARNING CURRICULUM, NOT A PROJECT TASK LIST:
   - The primary unit of every week MUST be a conceptual learning topic (e.g. 'Relational Database Design', NOT 'Build Database Feature').
   - Theory, understanding, and mental models come FIRST; project implementation is how knowledge is reinforced.

2. WEEKLY PEDAGOGICAL HIERARCHY:
   - 'topic': Main concept learned (e.g. 'Relational Database Design').
   - 'description': What the learner will understand by the end of the week.
   - 'learningObjectives': 2-4 key conceptual principles the learner can explain.
   - 'concepts': Concrete topics to study (e.g. ['Tables', 'Primary/Foreign Keys', 'Normalization']).
   - 'mentalModels': Important architectural trade-offs, principles, and the "why" behind the topic.
   - 'practicalTask': A small independent 20-30 min practice exercise/drill.
   - 'capstoneApplication': 3-4 concrete tasks applying this week's lesson to the single Main-Project.
   - 'featureCompleted': The tangible outcome delivered for the Main-Project (e.g. 'Persistent Project Data').

3. SINGLE UNIFIED MAIN-PROJECT:
   - Generate ONE primary, portfolio-worthy Main-Project for the entire curriculum.
   - Every week's 'capstoneApplication' tasks modify and expand THIS SAME Main-Project.
   - The Main-Project is the vehicle for applying lessons, not the lesson itself.

4. PEDAGOGICAL PROGRESSION:
   - Week 1: Foundations, runtime mental models, project scaffolding, and primitives.
   - Weeks 2-3: Core APIs, database modeling, schema validation, and essential features.
   - Week 4+: Authentication, security hardening, caching, testing, CI/CD, and deployment.

5. SPECIALIST MENTORS:
   - Assign each week to the most appropriate mentor: 'backend', 'frontend', 'ai-engineer', 'devops', 'security', 'system-design'.`;

  const userPrompt = `User Profile:
- Target Career Goal: "${profile.goal}"
- Current Self-Assessed Level: "${userLevel}"
- Known Skills: ${profile.knownSkills.join(", ") || "None specified"}
- Weekly Study/Build Time: ${targetHours} hours/week
- Preferred Learning Style: "${profile.learningStyle}"${memoriesSummary}

Generate the Concept-First learning curriculum and the single Main-Project application plan that takes this engineer to mastery.`;

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

  const rawNodes: RoadmapNode[] = object.nodes.map((n, idx) => {
    const appTasks = n.capstoneApplication && n.capstoneApplication.length > 0
      ? n.capstoneApplication
      : [`Implement ${n.topic} for ${object.capstoneProject.name}`];

    return {
      id: randomUUID(),
      slug: n.slug,
      topic: n.topic,
      theme: n.topic,
      title: n.topic,
      description: n.description,
      whyItMatters: n.mentalModels?.[0] || n.description,
      difficulty: n.difficulty,
      learningObjectives: n.learningObjectives,
      concepts: n.concepts,
      relatedConcepts: n.concepts,
      mentalModels: n.mentalModels,
      prerequisites: n.prerequisites,
      mentorId: n.mentorId,
      order: idx,
      status: idx === 0 ? "current" : idx === 1 ? "next" : "locked",
      practicalTask: n.practicalTask,
      capstoneApplication: appTasks,
      projectWork: appTasks,
      featureCompleted: n.featureCompleted,
      projectBrief: `Build feature: ${n.featureCompleted} for ${object.capstoneProject.name}`,
      commonMistakes: n.commonMistakes,
      week: n.week,
      estimatedHours: n.estimatedHours,
    };
  });

  return {
    id: randomUUID(),
    userId,
    title: object.title,
    description: object.description,
    capstoneProject: object.capstoneProject,
    nodes: rawNodes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Main entry point: Generates a dynamic LLM roadmap with single Main-Project when configured,
 * or gracefully falls back to deterministic template in mock mode.
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
