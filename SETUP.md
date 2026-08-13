# SkillFarm — Setup & Deployment Guide

Everything you need to get SkillFarm running — locally or in production on Vercel.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Deploy to Vercel](#2-deploy-to-vercel)
3. [Local Development](#3-local-development)
4. [Environment Variables Reference](#4-environment-variables-reference)
5. [Database Setup (Neon)](#5-database-setup-neon)
6. [Google OAuth Setup](#6-google-oauth-setup)
7. [Upstash Redis Setup](#7-upstash-redis-setup)
8. [OpenAI & Research Keys](#8-openai--research-keys)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

| Requirement | Version | Check |
|---|---|---|
| Node.js | ≥ 20.9 (LTS) | `node -v` |
| npm | ≥ 10 | `npm -v` |
| Git | any | `git --version` |

Accounts you'll need (all have free tiers):

- [Neon](https://neon.tech) — PostgreSQL database
- [Google Cloud](https://console.cloud.google.com) — OAuth + YouTube API
- [Upstash](https://upstash.com) — Redis for rate limiting & OTP
- [OpenAI](https://platform.openai.com) — AI mentor chat
- [Tavily](https://app.tavily.com) — Web research (optional)

> **No accounts?** The app runs in mock mode with zero configuration — add keys incrementally.

---

## 2. Deploy to Vercel

The fastest path to production.

### Step 1 — Fork and deploy

Click the deploy button in the README or go to:

```
https://vercel.com/new/clone?repository-url=https://github.com/Ravindra-builds/SkillFarm
```

### Step 2 — Set environment variables

In the Vercel dashboard → Project → Settings → Environment Variables, add:

```
DATABASE_URL          postgresql://...          (Neon connection string)
AUTH_SECRET           <32+ random chars>        (run: openssl rand -base64 32)
AUTH_GOOGLE_ID        <your OAuth client ID>
AUTH_GOOGLE_SECRET    <your OAuth client secret>
OPENAI_API_KEY        sk-...
UPSTASH_REDIS_REST_URL    https://...upstash.io
UPSTASH_REDIS_REST_TOKEN  <token>
NEXT_PUBLIC_APP_URL   https://your-app.vercel.app
```

### Step 3 — Push database schema

After the first deployment, open the Vercel terminal or run locally with the production `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://..." npm run db:push
```

### Step 4 — Redeploy

Trigger a redeploy — the app is now fully live.

---

## 3. Local Development

```bash
# Clone
git clone https://github.com/Ravindra-builds/SkillFarm
cd SkillFarm

# Install
npm install

# Configure env
cp sample.env .env.local
# → Edit .env.local with your values (see Section 4)

# Push DB schema (only needed when DATABASE_URL is set)
npm run db:push

# Start dev server
npm run dev
# → http://localhost:3000
```

### Minimum configuration levels

**Level 0 — Zero config (mock/preview mode)**

Leave `.env.local` as-is. The app renders with mock data — useful for UI development.

```env
ENABLE_MOCK_MODE="false"   # leave as false; mock kicks in automatically when keys are absent
```

**Level 1 — Auth + Database**

```env
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
AUTH_SECRET="<32+ char random string>"
AUTH_GOOGLE_ID="<oauth client id>.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="<oauth client secret>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Level 2 — Full AI features**

Add to Level 1:

```env
OPENAI_API_KEY="sk-..."
UPSTASH_REDIS_REST_URL="https://...upstash.io"
UPSTASH_REDIS_REST_TOKEN="..."
TAVILY_API_KEY="tvly-..."
GITHUB_TOKEN="github_pat_..."
YOUTUBE_API_KEY="AIza..."
```

---

## 4. Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Recommended | — | Neon PostgreSQL connection string. Without it, all data is in-memory (lost on restart). |
| `AUTH_SECRET` | **Required in prod** | dev fallback (insecure) | 32+ char secret for JWT signing. Generate: `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | For Google login | — | Google OAuth 2.0 Client ID |
| `AUTH_GOOGLE_SECRET` | For Google login | — | Google OAuth 2.0 Client Secret |
| `NEXT_PUBLIC_APP_URL` | For OAuth redirects | `http://localhost:3000` | The public URL of your deployment |
| `OPENAI_API_KEY` | For AI chat | — | Powers all 6 mentor chats + orchestrator. Without it, mock responses are shown. |
| `UPSTASH_REDIS_REST_URL` | For rate limiting & OTP | — | Upstash Redis HTTP endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | For rate limiting & OTP | — | Upstash Redis auth token |
| `TAVILY_API_KEY` | For research | — | Web search API. Without it, mock resources shown. |
| `EXA_API_KEY` | For research | — | Alternative to Tavily (optional) |
| `GITHUB_TOKEN` | For research | — | GitHub API token for higher rate limits |
| `YOUTUBE_API_KEY` | For research | — | YouTube Data API v3 key |
| `MEM0_API_KEY` | For memory | — | Mem0 AI long-term memory |
| `ENABLE_MOCK_MODE` | Dev only | `"false"` | Set `"true"` to force mock data even when keys are present. **Never use in production.** |

> **Never commit `.env.local`** — it is in `.gitignore`. Only `sample.env` (with placeholder values) is committed.

---

## 5. Database Setup (Neon)

### Create a Neon project

1. Go to [neon.tech](https://neon.tech) → **New Project**
2. Choose a region close to your Vercel deployment
3. Copy the connection string from **Dashboard → Connection Details**
4. Select **Pooled connection** (recommended for serverless)

Connection string format:
```
postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
```

### Push the schema

```bash
# With DATABASE_URL in .env.local:
npm run db:push

# Or pass directly:
DATABASE_URL="postgresql://..." npm run db:push
```

This creates all tables: `users`, `learning_profiles`, `roadmaps`, `roadmap_nodes`, `conversations`, `messages`, `mentor_handoffs`, `projects`, `user_memories`, `knowledge_nodes`, `user_progress`.

### Available scripts

```bash
npm run db:push      # Push schema changes to DB (no migration files generated)
npm run db:studio    # Open Drizzle Studio (visual DB browser)
```

---

## 6. Google OAuth Setup

### Create OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Application type: **Web application**
4. Add Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://your-app.vercel.app/api/auth/callback/google` (production)
5. Copy **Client ID** and **Client Secret**

```env
AUTH_GOOGLE_ID="xxxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxxx"
```

### Enable YouTube Data API (for research)

In the same Google Cloud project:

1. Go to **APIs & Services** → **Library**
2. Search for **YouTube Data API v3** → **Enable**
3. Go to **Credentials** → **Create Credentials** → **API Key**
4. Restrict the key to **YouTube Data API v3**

```env
YOUTUBE_API_KEY="AIzaSy..."
```

---

## 7. Upstash Redis Setup

Redis is used for:
- OTP code storage (10-minute TTL, survives serverless cold starts)
- Rate limiting (sliding window, 30 req/min per user)
- Subscription usage counters (daily rolling window)
- Semantic response cache

### Create a Redis database

1. Go to [console.upstash.com](https://console.upstash.com) → **Create Database**
2. Choose **Regional** (cheaper) or **Global** (lower latency worldwide)
3. Copy **REST URL** and **REST Token** from the database page

```env
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXxx..."
```

> Without Redis, OTPs fall back to in-memory (breaks on multi-worker deployments), rate limiting falls back to in-memory (ineffective on Vercel), and subscription counters reset on cold starts.

---

## 8. OpenAI & Research Keys

### OpenAI

1. Go to [platform.openai.com](https://platform.openai.com) → **API Keys** → **Create new**
2. The app uses `gpt-4o-mini` for routing and `gpt-4o` for synthesis

```env
OPENAI_API_KEY="sk-..."
```

### Tavily (web research)

1. Go to [app.tavily.com](https://app.tavily.com) → Sign up → **API Keys**

```env
TAVILY_API_KEY="tvly-..."
```

### GitHub Token (higher rate limits for research)

1. Go to GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
2. No special scopes needed — public repo access only

```env
GITHUB_TOKEN="github_pat_..."
```

### Mem0 AI (long-term memory)

1. Go to [app.mem0.ai](https://app.mem0.ai) → **API Keys**

```env
MEM0_API_KEY="m0-..."
```

---

## 9. Troubleshooting

### "OTP sent but verify fails"

Usually caused by Redis not being configured — OTPs stored in memory are lost when the serverless function cold-starts between send and verify.

**Fix:** Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to your environment.

---

### "Database save not working / data lost on refresh"

The DB is only used when `DATABASE_URL` is set to a real Neon URL (not a placeholder).

**Check:**
```bash
# Should print "postgresql://..." not "ep-xxx"
echo $DATABASE_URL
```

Also verify the schema is pushed:
```bash
npm run db:push
```

---

### "Rate limit errors immediately"

If you see 429s on the first request, Redis might be misconfigured — the in-memory fallback can't be shared across workers.

**Check:** Make sure `UPSTASH_REDIS_REST_URL` starts with `https://` (not HTTP).

---

### "Google OAuth redirect_uri_mismatch"

The redirect URI in Google Cloud Console must exactly match your app URL.

**Fix:** Add `https://your-exact-domain.vercel.app/api/auth/callback/google` to the authorized redirect URIs list.

---

### "AUTH_SECRET is not set" error in production

Generate a secret and add it to your environment:

```bash
openssl rand -base64 32
# or
npx auth secret
```

---

### Build fails with TypeScript errors

```bash
npx tsc --noEmit
```

Run this locally — errors are shown with file + line numbers.

---

### Mock data showing in production

Check `ENABLE_MOCK_MODE` is not set to `"true"` in your production environment. It should be `"false"` or absent entirely.
