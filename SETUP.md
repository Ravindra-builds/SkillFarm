# SETUP.md — SkillFarm local setup guide

This is the **single source of truth** for running SkillFarm locally. It covers every environment variable, where to get each key (with clicks), and how to run/verify each phase.

> **You are on Phase 0 — Foundation.** The app already renders with mock data and no secrets required. As you unlock later phases, fill the env vars listed for that phase.

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Clone & install](#2-clone--install)
3. [Env file — the 3-minute version](#3-env-file--the-3-minute-version)
4. [Env — where each key comes from (step-by-step)](#4-env--where-each-key-comes-from-step-by-step)
5. [Database (Neon + Drizzle)](#5-database-neon--drizzle)
6. [Run the app](#6-run-the-app)
7. [Verify Phase 0](#7-verify-phase-0)
8. [What changes in each future phase](#8-what-changes-in-each-future-phase)
9. [Troubleshooting](#9-troubleshooting)
10. [Production / deploy notes](#10-production--deploy-notes)

---

## 1. Prerequisites

| Requirement | Version / notes | Check |
|---|---|---|
| **Node.js** | `>= 20.9` (LTS 20.x recommended; we tested with 20.20.2) | `node -v` |
| **npm** | `>= 10` (comes with Node) | `npm -v` |
| **Git** | any recent | `git --version` |
| **Browser** | Chrome / Edge / Firefox (for preview) | — |
| **Accounts (as needed)** | Neon, Google Cloud (OAuth + YouTube), Tavily/Exa, Upstash, OpenAI — all free tiers exist | — |

> **No Docker or Postgres locally required** — we use **Neon** (managed Postgres over HTTP) and Drizzle’s HTTP driver. You can run the Phase 0 shell with **zero env**; DB/auth only matter from Phase 2.

---

## 2. Clone & install

```bash
# clone (replace with your repo URL / or copy the skillfarm folder)
git clone https://github.com/Ravindra-builds/SkillFarm
cd skillfarm

# install
npm install
```

Expected: no errors, `365+ packages` installed.

---

## 3. Env file — the 3-minute version

```bash
# copy the template
cp sample.env .env.local

# open in your editor
code .env.local
# or
nano .env.local
```

**Minimum for Phase 0 (nothing):** you can leave `.env.local` as-is and `npm run dev` will still render the landing + dashboard with mock data.

**Minimum for Phase 2 (auth + DB):**

```env
DATABASE_URL="postgresql://..."
AUTH_SECRET="..."                 # 32+ chars
AUTH_GOOGLE_ID="....apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**For later phases**, add as you go (all documented below). The validator is in `src/lib/env.ts` and fails fast with a *field-level* error if you forget a required var.

> **Never commit `.env.local`** — it’s in `.gitignore`. Only `sample.env` is committed.

---

## 4. Env — where each key comes from (step-by-step)

### 4.1 `DATABASE_URL` — Neon PostgreSQL

We use **Neon** (`@neondatabase/serverless`) — it’s serverless Postgres with an HTTP driver, perfect for Vercel/Neon/sandbox.

1. Go to **https://neon.tech** → **Sign up** (GitHub/Google).
2. **Create project** → name it `skillfarm` → choose region closest to you (e.g. `AWS ap-south-1 Singapore` for India, or `US East`).
3. On the project dashboard → **Connection string** → copy the **pooled** or **direct** URL. It looks like:
   ```
   postgresql://alex:AbC123…@ep-xxx-123.aws.neon.tech/neondb?sslmode=require
   ```
4. In Neon, also grab the **Connection details** → verify `sslmode=require` is present (Neon needs it).
5. Paste into `.env.local`:
   ```env
   DATABASE_URL="postgresql://...@ep-xxx.neon.tech/neondb?sslmode=require"
   ```
6. (Optional) create a **branch** for dev vs prod inside Neon — not needed for MVP.

**Test** (after Phase 2 schema exists):

```bash
# from skillfarm/
npm run db:push   # or npm run db:migrate after generating
```

If this fails with `DATABASE_URL is not set`, your `.env.local` wasn’t loaded — restart the dev server.

**Alternatives if you don’t want Neon:** any Postgres works if you swap the driver (`postgres`/`pg` instead of `@neondatabase/serverless`), but Neon’s HTTP driver is already wired. Vercel Postgres and Supabase URLs also work — just put the full `postgresql://…` string in `DATABASE_URL`.

---

### 4.2 `AUTH_SECRET` — Auth.js secret

Auth.js needs a 32+ character random secret to sign sessions.

**Option A — recommended (1 command):**

```bash
npx auth secret
# copies AUTH_SECRET=... to your clipboard / prints it
```

Paste the printed line into `.env.local`.

**Option B — openssl:**

```bash
openssl rand -base64 32
# copy the output, then in .env.local:
# AUTH_SECRET="your-32+random-string-here"
```

**Option C — manual:** generate any 32+ char string (mix upper/lower/digits/symbols). Example length:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> Don’t reuse a short word. If `AUTH_SECRET` is < 32 chars, `src/lib/env.ts` throws at startup.

---

### 4.3 `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` (or `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`)

Only needed from **Phase 2**. The app already accepts both naming conventions (`AUTH_GOOGLE_ID` preferred; `GOOGLE_CLIENT_ID` is an alias).

1. Go to **https://console.cloud.google.com/** → create or select a project (e.g. `skillfarm`).
2. Left nav → **APIs & Services → Credentials** → **Create Credentials → OAuth client ID**.
   - If prompted, **Configure consent screen** first:
     - User Type: **External**
     - App name: `SkillFarm`
     - Support email: your email
     - Authorized domains: (leave blank for localhost)
     - Scopes: add `email`, `profile`, `openid` (usually pre-selected)
     - Test users: add your own Gmail (so you can sign in before publishing).
3. **Application type:** `Web application` → **Name:** `SkillFarm Local`
4. **Authorized redirect URIs** → add **both**:
   ```
   http://localhost:3000/api/auth/callback/google
   https://<preview-host>/api/auth/callback/google
   ```
   The second is for the sandbox preview (e.g. `https://3000-xxxx.e2b.app/api/auth/callback/google`). Add it after you know your preview host, or add later and re-save.
5. Click **Create** → you’ll see **Client ID** and **Client Secret** → copy them.
6. Paste into `.env.local`:
   ```env
   AUTH_GOOGLE_ID="1234567890-xxxx.apps.googleusercontent.com"
   AUTH_GOOGLE_SECRET="GOCSPX-...."
   # or the alias form
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   ```

**Common gotchas**

- “Access blocked: verification” → you didn’t add yourself as a **Test user** on the consent screen.
- “Redirect URI mismatch” → the URI in Google Cloud must *exactly* match `http://localhost:3000/api/auth/callback/google` (no trailing slash). Add the preview host as well.
- After changing credentials, **restart** `npm run dev`.

---

### 4.4 `OPENAI_API_KEY` (Phase 3+ — mentors & orchestrator)

Pick **at least one** LLM provider. The mentor system currently expects OpenAI, but `src/lib/env.ts` accepts Anthropic/Google too for later wiring.

1. Go to **https://platform.openai.com/** → sign up / sign in → **API keys** (left nav) → **Create new secret key**.
2. Name it `skillfarm-dev` → **Copy** (starts with `sk-proj-...` or `sk-...`). You only see it once.
3. Paste:
   ```env
   OPENAI_API_KEY="sk-proj-..."
   ```
4. **Billing:** add a payment method under **Billing** if you hit rate limits; the free trial has low quotas but enough for dev.

**Anthropic alternative:** `https://console.anthropic.com/` → **API Keys** → `ANTHROPIC_API_KEY="sk-ant-..."`  
**Google Gemini alternative:** `https://aistudio.google.com/app/apikey` → `GOOGLE_GENERATIVE_AI_API_KEY="AIza..."`

You only need one for Phase 3; the orchestrator’s model routing will let you swap later.

---

### 4.5 `TAVILY_API_KEY` (Phase 7+ — Research Engine)

We start with **one** search provider; add the second incrementally.

**Tavily:**

1. **https://tavily.com** → **Sign up** → **API Keys** → **Create key**.
2. Copy (`tvly-...`) → `.env.local`:
   ```env
   TAVILY_API_KEY="tvly-..."
   ```

**Exa alternative:**

1. **https://exa.ai** → **Dashboard → API Keys** → `EXA_API_KEY="..."`.

Only one search key is needed to pass Phase 7. The resource evaluator will work with dummy URLs until this is set — it just won’t be able to fetch live results.

---

### 4.6 `GITHUB_TOKEN` (Phase 8)

For higher rate limits + private-repo-aware resource discovery.

1. **https://github.com/settings/tokens** → **Fine-grained tokens** (recommended) or **Tokens (classic)** → **Generate new token**.
   - Fine-grained: repo access → “Public repositories (read-only)” is enough for MVP.
   - Classic: scopes → `public_repo`, `read:user`.
2. Expiry: 30–90 days → **Generate** → copy (`github_pat_...` or `ghp_...`).
3. Paste:
   ```env
   GITHUB_TOKEN="github_pat_..."
   ```

Without it, unauthenticated requests still work (60 req/hour) — enough to preview, but you’ll hit limits quickly.

---

### 4.7 `YOUTUBE_API_KEY` (Phase 8)

For YouTube resource discovery.

1. In the **same Google Cloud project** you used for OAuth (or a new one) → **APIs & Services → Library** → search **YouTube Data API v3** → **Enable**.
2. **Credentials → Create Credentials → API key** → copy (starts with `AIza...`) → optionally **Restrict key → YouTube Data API v3** only.
3. Paste:
   ```env
   YOUTUBE_API_KEY="AIza..."
   ```

Quota is generous for dev; failures are handled gracefully (the UI falls back to cached/web results).

---

### 4.8 `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (Phase 12 — Cache)

1. **https://upstash.com** → sign up → **Create Database** → name `skillfarm-cache` → region near your Neon DB.
2. Choose **Global** or **Regional**, enable **TLS** (default).
3. Dashboard → **REST API** tab → copy **UPSTASH_REDIS_REST_URL** (`https://xxx.upstash.io`) and **UPSTASH_REDIS_REST_TOKEN**.
4. Paste:
   ```env
   UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="AXXX..."
   ```

Without this, caching is simply skipped (no crash) — search/research just runs fresh every time.

---

### 4.9 `NEXT_PUBLIC_APP_URL`

Public URL of the app. Used for OAuth redirects and absolute links.

```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
# In production (Vercel/preview):
# NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
# or for the sandbox preview:
# NEXT_PUBLIC_APP_URL="https://3000-xxxx.e2b.app"
```

No secret — it’s `NEXT_PUBLIC_` so it’s exposed to the browser, but that’s expected.

---

### 4.10 Checklist — copy/paste ready

For **local dev right now** (Phase 0–1), this is the minimal `.env.local` that lets you reach Phase 2 without warnings:

```env
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"
AUTH_SECRET="replace-with-openssl-rand-base64-32-output"
AUTH_GOOGLE_ID="xxxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxxx"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

For **full features** (end of MVP), you’ll eventually have:

```env
DATABASE_URL="..."
AUTH_SECRET="..."
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
OPENAI_API_KEY="sk-..."
TAVILY_API_KEY="tvly-..."
GITHUB_TOKEN="github_pat_..."
YOUTUBE_API_KEY="AIza..."
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 5. Database (Neon + Drizzle)

We use **Drizzle ORM** with **Drizzle Kit** for migrations.

### 5.1 Install (already done if you ran `npm install`)

```bash
npm install drizzle-orm @neondatabase/serverless drizzle-kit
```

### 5.2 Configure

`drizzle.config.ts` is already set to:

```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/db/schema/*",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

Schemas live in `src/db/schema/` (`users.ts`, `learning.ts`, `conversations.ts`, `resources.ts`).

### 5.3 Create & apply migrations

**Dev — fast iteration (no SQL file, pushes directly):**

```bash
npm run db:push
```

This is ideal while iterating on Phase 2; it diffs your TS schema against the DB.

**Prod / team — versioned migrations:**

```bash
npm run db:generate   # creates ./drizzle/0000_*.sql from your schema
npm run db:migrate    # applies them (needs DATABASE_URL)
# or: npx drizzle-kit migrate
```

**GUI — inspect data:**

```bash
npm run db:studio
# opens https://local.drizzle.studio
```

If you haven’t set `DATABASE_URL`, these commands will fail with the env validator message — that’s expected. Fix `.env.local` and retry.

### 5.4 npm scripts to add (if missing)

Ensure `package.json` has:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

---

## 6. Run the app

```bash
# from skillfarm/
npm run dev
```

You should see:

```
✓ Ready in 2s
○ Local:   http://localhost:3000
○ Network: http://192.168.1.x:3000
```

Open **http://localhost:3000**:

- `/` — marketing landing with orchestrator visual and mentor grid.
- `/dashboard` — Phase 0 dashboard (mock data, open access).
- `/chat`, `/roadmap`, `/knowledge`, `/resources`, `/projects`, `/team` — placeholders with phase badges.
- `/login` — mock sign-in (wired in Phase 2).

**Preview host** (sandbox): the dev server is bound to `0.0.0.0`, so it’s also live at `https://3000-{sandboxId}.e2b.app` (the banner in your editor). Use that host plus `/api/auth/callback/google` in your Google OAuth config if you want real sign-in in the preview.

---

## 7. Verify Phase 0

Checklist to confirm Foundation is healthy:

- [ ] `npm run dev` starts without env errors (a warning about `DATABASE_URL` during build is OK).
- [ ] Landing (`/`) renders with violet `#7C5CFC` buttons, dark background `#0F1117`, Inter/Manrope/JetBrains fonts.
- [ ] Dashboard (`/dashboard`) shows:
  - Progress 72% • “Become a production-ready backend developer” • 12-day streak
  - “Build a REST API with authentication” next action
  - Roadmap preview (7 nodes: HTTP → Deploy, with statuses)
  - Knowledge graph teaser
  - Mentor handoff demo (Backend → Security)
  - 3 Resource Cards with ⭐ scores + “Why this was selected”
  - Sidebar + Header + search + team avatars
- [ ] App is responsive — sidebar hides on mobile, sheet menu works.
- [ ] No console errors; `npm run build` succeeds (warnings OK, errors not).
- [ ] `npm run lint` passes (fix with `npm run lint`).

If any card looks unstyled, verify `src/app/globals.css` was updated (Phase 0’s custom palette) and restart the dev server.

---

## 8. What changes in each future phase

| Phase | What you’ll need to set up | Env added |
|---|---|---|
| **2 — Auth + Profile** | Create `learning_profiles` flow; protect `/dashboard` with `auth()` | `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_*` |
| **3 — Single Mentor** | Backend Mentor chat API, Vercel AI SDK streaming, persist `conversations`/`messages` | `OPENAI_API_KEY` (or Anthropic) |
| **4 — Mentor Abstraction** | Move prompts to `agents/mentors/<id>/prompt.ts`; all 6 mentors via `src/config/mentors.ts` | — |
| **5 — Orchestrator** | Router (fast model) + synthesis (strong model) | model keys already set |
| **6 — Handoff** | `mentor_handoffs` table + handoff UI | — |
| **7 — Research Engine** | Tavily/Exa search + evaluator scoring | `TAVILY_API_KEY` or `EXA_API_KEY` |
| **8 — Integrations** | GitHub + YouTube | `GITHUB_TOKEN`, `YOUTUBE_API_KEY` |
| **9 — Roadmap** | Goal collection → skill gap → roadmap generation → `roadmaps`/`roadmap_nodes` + React Flow | — |
| **10 — Knowledge Graph** | `knowledge_nodes` + React Flow viz | — |
| **11 — Memory** | Use `learning_profiles` + `user_progress` as context | — |
| **12 — Cache** | Upstash Redis — deterministic, then semantic | `UPSTASH_REDIS_*` |
| **13–17** | Hardening, observability, polish, testing, prod | — |

At each phase we update this file and `README.md`.

---

## 9. Troubleshooting

**`DATABASE_URL is not set` on `npm run dev` or `db:push`**

- You imported `src/lib/env.ts` or `src/db` somewhere. For Phase 0 that shouldn’t happen; check you didn’t add an eager import. In phases 2+ you *must* have `.env.local` → restart after editing it.

**`AUTH_SECRET must be at least 32 characters`**

- Run `npx auth secret` again and paste the full line. Don’t truncate.

**Google OAuth: `redirect_uri_mismatch`**

- In **Google Cloud → Credentials → OAuth client**, ensure **Authorized redirect URIs** contains exactly:
  ```
  http://localhost:3000/api/auth/callback/google
  ```
  and if you’re testing in the sandbox preview, also add:
  ```
  https://3000-xxxx.e2b.app/api/auth/callback/google
  ```
  No trailing slash. Save → wait 1–2 minutes → retry.

**Google OAuth: `Access blocked — This app’s request is invalid`**

- Add your Google account as a **Test user** under **OAuth consent screen → Test users**.

**`Invalid environment variables` at build (`next build` fails in CI without secrets)**

- `src/lib/env.ts` intentionally skips hard failure during `phase-production-build` without DB. If CI still fails, set dummy `DATABASE_URL` in the build env (e.g. `DATABASE_URL="postgresql://user:pass@localhost/db"`), then provide the real one at runtime.

**Styles look broken / colors wrong**

- Verify `src/app/globals.css` matches the spec palette (deep charcoal `#0F1117`, violet `#7C5CFC`). Check `tailwindcss` is v4 and `postcss.config.mjs` is `{ plugins: { "@tailwindcss/postcss": {} } }`.

**Port 3000 in use**

```bash
lsof -i :3000
# or
npm run dev -- -p 3001
```

**ESLint / TypeScript errors**

```bash
npm run lint
npx tsc --noEmit
```

Fix before committing; CI will catch them.

---

## 10. Production / deploy notes

- **Vercel:** push to GitHub → **Import Project** → add the same env vars in **Settings → Environment Variables** (at least `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_*`, `NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"`). Redeploy.
- **Trust host:** `src/lib/auth.ts` already sets `trustHost: true` so `https://{port}-{sandbox}.e2b.app` previews work.
- **Migrations:** run `npm run db:migrate` against the *production* `DATABASE_URL` before first deploy, or use `db:push` only in dev.
- **Security:** never expose `AUTH_SECRET` or API keys to the client (no `NEXT_PUBLIC_` prefix). All `src/lib/env.ts` secrets are server-only.
- **Build:** `npm run build` must pass without `DATABASE_URL` (it logs a warning but doesn’t throw). Runtime still requires it.

---

## Need help?

- Read the spec: `./uploads/Mentor Team — AI-Powered Engineering Mentorship Platform.md` (full product + phases)
- Check `README.md` for architecture and roadmap
- Open an issue with: your Node/npm versions, the full error log, and which phase you’re on

Happy building — see you in Phase 1! 🚀
