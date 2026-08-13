<div align="center">

# SkillFarm

**An AI-powered engineering mentorship platform — learn what matters, get guidance from specialized experts, build real projects.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## What is SkillFarm?

SkillFarm replaces generic AI chat with a **team of specialized engineering mentors** orchestrated by a central Tech Lead agent. Instead of picking a mentor yourself, you ask a question — the orchestrator reads intent, delegates to the right specialist(s), runs parallel consultations when needed, handles handoffs between mentors, and synthesizes a single actionable answer backed by scored, up-to-date learning resources.

### Key Features

- **Orchestrator routing** — ask anything; the Tech Lead decides who answers
- **Mentor handoffs** — e.g. Backend → *"needs security review"* → 🔄 Security → synthesis, visualized in the UI
- **Parallel consultation** — multiple mentors consulted simultaneously for architecture questions
- **Research engine** — every resource URL scored across 6 metrics (authority, freshness, accuracy, practical value, beginner-friendliness, community signal)
- **Personalized roadmaps** — generated from your goal, current level, stack, and weekly hours — interactive DAG + progress tracking
- **Practical projects hub** — AI-generated project briefs with requirements, stretch goals, and GitHub repo submission
- **Long-term memory** — Mem0 AI remembers known skills, weak areas, and decisions across sessions; resume parser auto-extracts context
- **Rate limiting & caching** — Upstash Redis sliding-window rate limiter + semantic cache

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui |
| **Auth** | Auth.js v5 (Google OAuth) · Signed session cookies (jose HMAC-SHA256) |
| **Database** | Neon PostgreSQL · Drizzle ORM · Drizzle Kit |
| **Cache & Rate Limiting** | Upstash Redis (singleton client) |
| **AI** | Vercel AI SDK 6 · OpenAI `gpt-4o-mini` (router) · `gpt-4o` (synthesizer) |
| **Memory** | Mem0 AI long-term memory |
| **Research** | Tavily · Exa · GitHub API · YouTube Data API v3 |
| **Graph** | React Flow (knowledge graph & roadmap DAG) |
| **Validation** | Zod (env, API inputs, agent outputs) |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                # Landing page
│   ├── login/                  # Google OAuth + OTP + guest login
│   ├── dashboard/              # User dashboard with profile & stats
│   ├── chat/                   # Orchestrated streaming chat
│   ├── roadmap/                # Personalized roadmap + progress
│   ├── knowledge/              # Interactive knowledge graph (DAG)
│   ├── resources/              # AI-evaluated resource discovery
│   ├── projects/               # Practical projects hub
│   ├── settings/               # Profile, memory, resume parser
│   └── api/                    # API routes (chat, research, roadmap, projects, auth)
├── agents/
│   ├── mentors/                # 6 specialized mentor personas
│   ├── orchestrator/           # Router, synthesizer, handoff engine
│   └── research/               # Parallel search & 6-metric scorer
├── components/                 # UI components (layout, chat, dashboard, etc.)
├── config/mentors.ts           # Mentor configuration registry
├── data/mock/                  # Mock data (only used when ENABLE_MOCK_MODE=true)
├── db/schema/                  # Drizzle schema definitions
└── lib/
    ├── auth.ts                 # Auth.js config + custom session wrapper
    ├── session.ts              # Signed session cookie (jose JWS)
    ├── otp-store.ts            # Redis-backed OTP store (10-min TTL)
    ├── subscription.ts         # Redis-backed plan usage counters
    ├── redis.ts                # Singleton Upstash Redis client
    ├── cache.ts                # Semantic cache
    ├── rate-limit.ts           # Sliding window rate limiter
    ├── roadmap-store.ts        # DB-backed roadmap persistence
    ├── project-store.ts        # DB-backed project persistence
    ├── chat-store.ts           # DB-backed conversation persistence
    ├── env.ts                  # Zod env validation + shared helpers
    └── memory/                 # Mem0 integration & resume parser
```

---

## Quick Start

### Deploy to Vercel (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Ravindra-builds/SkillFarm)

Set the required environment variables in the Vercel dashboard — see [`SETUP.md`](SETUP.md) for the full reference.

### Local Development

```bash
# 1. Clone and install
git clone https://github.com/Ravindra-builds/SkillFarm
cd SkillFarm
npm install

# 2. Configure environment
cp sample.env .env.local
# Edit .env.local — minimum required vars are in SETUP.md

# 3. Push database schema (requires DATABASE_URL in .env.local)
npm run db:push

# 4. Start dev server
npm run dev
# → http://localhost:3000
```

> **No API keys?** The app runs in mock/preview mode with zero configuration — you'll see a working UI with sample data. Add keys incrementally as needed.

---

## Environment Variables

See [`SETUP.md`](SETUP.md) for a full reference with step-by-step instructions on where to get each key.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | For persistence | Neon PostgreSQL connection string |
| `AUTH_SECRET` | **Required in prod** | JWT signing secret (32+ chars) |
| `AUTH_GOOGLE_ID` | For Google login | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | For Google login | Google OAuth Client Secret |
| `OPENAI_API_KEY` | For AI features | Powers all mentor chat |
| `UPSTASH_REDIS_REST_URL` | For rate limiting | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | For rate limiting | Upstash Redis token |
| `TAVILY_API_KEY` | For research | Web search |
| `ENABLE_MOCK_MODE` | Dev only | Force mock data (`false` in prod) |

---

## License

[MIT](LICENSE) © 2025 Ravindra
