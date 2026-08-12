# SkillFarm — Plant knowledge. Grow skills. Ship real things.

> **Your AI Engineering Team — learn what matters, get guidance from specialized experts, build real projects, and ship them into the real world.**

SkillFarm is an AI-powered mentorship platform where a user interacts with a **team of specialized engineering mentors** — not a generic chatbot. A central **Orchestrator / Tech Lead Agent** understands intent, delegates to the right specialist(s), runs parallel consultations, handles handoffs, and synthesizes a single, actionable answer backed by **evaluated, up-to-date learning resources**.

**Local:** `http://localhost:3000` → `/login` → `/dashboard` → `/chat` → `/settings`

---

## ✨ What makes it different

- **Orchestrator routing** — you ask; the tech lead decides who answers. You never pick a mentor manually unless you choose to.
- **Mentor handoffs** — e.g. `Backend Mentor → "needs security expertise" → 🔄 Cybersecurity Mentor → synthesis`. Visualized in the UI.
- **Parallel consultation** — multiple mentors can be consulted simultaneously for architecture / production-readiness questions.
- **Deep Research + scoring** — every URL is scored across 6 metrics (authority, freshness, accuracy, practical, beginner-friendly, community) with human rationale.
- **Personalized roadmaps & knowledge graph** — built from your goal, current level, stack, and weekly time — with interactive DAG visualization and progress completion API.
- **Practical projects hub** — hands-on project briefs with core requirements, stretch goals, and GitHub repository URL submission.
- **Mem0 AI Long-Term Memory & Resume Extractor** — remembers known skills, weak areas, and architectural decisions across sessions. Upload your resume to automatically extract context into Mem0 memory!
- **Semantic Caching & Rate Limiting** — Upstash Redis query normalization and 30 req/min sliding window rate protection.

---

## 🧱 Tech Stack

| Layer | Tech |
|---|---|
| **Frontend** | Next.js 16 (App Router) • TypeScript • Tailwind CSS 4 • shadcn/ui • Lucide |
| **Auth** | Auth.js / NextAuth v5 (Google OAuth) — database sessions when `DATABASE_URL` real, guest fallback when unconfigured |
| **DB** | Neon PostgreSQL • Drizzle ORM • Drizzle Kit (`learning_profiles`, `conversations`, `messages`, `projects`, `user_memories`) |
| **Cache & Limits** | Upstash Redis (semantic cache + sliding window rate limiter) |
| **AI & Memory** | Vercel AI SDK 6 + `@ai-sdk/openai` (`gpt-4o-mini` router / `gpt-4o` synthesizer) + **Mem0 AI Memory** |
| **Research** | Tavily / Exa • GitHub API • YouTube Data API |
| **Graph** | React Flow (knowledge graph & roadmap) |
| **Validation** | Zod everywhere (env, API, tools, agent outputs) |

Design system: **dark-first** (`#0F1117` / `#171A23` / `#7C5CFC`), Linear + Notion aesthetic.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx                 # Landing — hero + team showcase
│   ├── login/page.tsx           # Sleek elevated card sign-in (Google OAuth + guest fallback)
│   ├── dashboard/               # Dashboard — profile + stats
│   ├── chat/                    # Orchestrated streaming chat UI
│   ├── roadmap/                 # Multi-domain personalized roadmap
│   ├── knowledge/               # Interactive DAG knowledge graph
│   ├── resources/               # Research engine & resource card UI
│   ├── projects/                # Practical projects hub with GitHub repo input
│   ├── settings/                # Settings — profile, quota, Mem0 memories, resume parser
│   └── api/
│       ├── auth/                # Auth.js handlers
│       ├── chat/                # Orchestrated streaming chat route with rate limits & quota check
│       ├── research/            # Parallel research & weighted scoring route
│       ├── roadmap/progress/    # Node progress update API
│       ├── projects/            # Practical projects API
│       └── settings/            # Resume parser and memory management routes
├── agents/
│   ├── mentors/                 # 6 specialized mentors (prompt + meta + allowlist tools)
│   ├── orchestrator/            # Tech lead router, synthesizer, and handoff engine
│   └── research/                # Tavily + GitHub + YouTube parallel search & scorer
├── components/
│   ├── layout/                  # Header (Home/Back buttons, green streak pill), Sidebar
│   ├── chat/                    # MentorChat with telemetry trace badge & handoff history
│   ├── projects/                # ProjectsHub component
│   ├── settings/                # SettingsView (Account, Mem0 Store, Resume Parser)
│   └── knowledge/               # KnowledgeGraph DAG viewer
├── config/mentors.ts            # 6 specialized mentors configuration
├── db/schema/                   # Drizzle schema definitions
└── lib/
    ├── memory/                  # Mem0 integration (mem0.ts), ingestion.ts, resume-parser.ts
    ├── cache.ts                 # Upstash Redis semantic caching & normalization
    ├── rate-limit.ts            # Sliding window rate limiter
    ├── observability.ts         # Agent telemetry tracing logger
    ├── subscription.ts          # Subscription plan feature gates (free vs pro)
    └── project-store.ts         # Hands-on project store
```

---

## 🗺️ Completed Phase Roadmap

| Phase | Name | Goal | Status |
|---|---|---|---|
| **0** | **Foundation** | Next.js + Tailwind + shadcn + theme + app shell | **✓ Done** |
| **1** | **Design System** | Linear + Notion dark theme aesthetic | **✓ Done** |
| **2** | **Auth + Profile** | Auth.js Google OAuth, protected routes, `learning_profiles` | **✓ Done** |
| **3** | **Single Mentor** | Backend Mentor chat UI, streaming, persistence | **✓ Done** |
| **4** | **Mentor Abstraction**| 6 specialized AI engineering mentor personas | **✓ Done** |
| **5** | **Orchestrator** | Intent router (`gpt-4o-mini`) + parallel synthesis (`gpt-4o`) | **✓ Done** |
| **6** | **Mentor Handoff** | Explicit tokens, context transfer, `🔄 Handed off` UI, history | **✓ Done** |
| **7** | **Research Engine** | Tavily + GitHub + YouTube parallel search & 6-metric scoring | **✓ Done** |
| **8** | **Personalized Roadmap**| Multi-domain roadmap generator & DAG Knowledge Graph | **✓ Done** |
| **9** | **Practical Projects** | Projects brief generator & GitHub repo submission hub | **✓ Done** |
| **10**| **Deep Memory (Mem0)**| Mem0 long-term memory & deep context ingestion engine | **✓ Done** |
| **11 & 12**| **Caching & Security**| Upstash Redis semantic caching & 30 req/min rate limiter | **✓ Done** |
| **13, 14 & 15**| **Observability & Polish**| Agent telemetry tracing, feature gates, Settings & UI polish | **✓ Done** |

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (copy and fill)
cp sample.env .env.local

# 3. Push Database Schema (Neon PostgreSQL)
npm run db:push

# 4. Start Development Server
npm run dev

# 5. Test Production Build
npm run build
```

---

## 📄 License

MIT
