# 🛠️ SkillFarm — Production Setup & Deployment Guide

This guide provides complete, step-by-step instructions for configuring, deploying, and running **SkillFarm** in local development and production environments.

---

## 📑 Table of Contents

1. [System Prerequisites](#1-system-prerequisites)
2. [Quick Local Setup](#2-quick-local-setup)
3. [Environment Variables Reference](#3-environment-variables-reference)
4. [Database Provisioning (Neon PostgreSQL)](#4-database-provisioning-neon-postgresql)
5. [Object Storage Setup (Cloudflare R2)](#5-object-storage-setup-cloudflare-r2)
6. [Caching & Sandbox Engine (Upstash Redis)](#6-caching--sandbox-engine-upstash-redis)
7. [Authentication Setup (Google OAuth & Resend OTP)](#7-authentication-setup-google-oauth--resend-otp)
8. [AI Models & LLM Providers](#8-ai-models--llm-providers)
9. [Research & Evaluation API Keys](#9-research--evaluation-api-keys)
10. [Deploying to Vercel (Production)](#10-deploying-to-vercel-production)
11. [Troubleshooting & Common Pitfalls](#11-troubleshooting--common-pitfalls)

---

## 1. System Prerequisites

| Requirement | Minimum Version | Verification Command |
|---|---|---|
| **Node.js** | `v20.9.0` (LTS) | `node -v` |
| **npm** | `v10.0.0` | `npm -v` |
| **Git** | Any modern version | `git --version` |

### External Accounts (All Free-Tier Compatible):
* **[Neon](https://neon.tech)** — Serverless PostgreSQL database.
* **[Upstash](https://upstash.com)** — Serverless Redis (rate limiting, OTP, guest sandbox).
* **[Cloudflare](https://dash.cloudflare.com)** — R2 Object Storage for resume files.
* **[Google Cloud Console](https://console.cloud.google.com)** — Google OAuth 2.0 & YouTube Data API.
* **[OpenAI Platform](https://platform.openai.com)** or **[Google AI Studio](https://aistudio.google.com)** — AI models.
* **[Resend](https://resend.com)** (Optional) — Email OTP authentication.
* **[Tavily](https://tavily.com)** (Optional) — Real-time engineering web research.

---

## 2. Quick Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/Ravindra-builds/SkillFarm.git
cd SkillFarm

# 2. Install all dependencies
npm install

# 3. Create your local environment file
cp sample.env .env.local

# 4. Push your PostgreSQL schema to Neon
npm run db:push

# 5. Start the local Next.js development server
npm run dev
```

Visit [`http://localhost:3000`](http://localhost:3000) to view the application.

---

## 3. Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** (in prod) | — | Neon PostgreSQL connection string (`postgresql://...`) |
| `AUTH_SECRET` | **Yes** (in prod) | dev-fallback | 32+ character random string for signing JWT session cookies |
| `AUTH_GOOGLE_ID` | For OAuth | — | Google OAuth 2.0 Client ID |
| `AUTH_GOOGLE_SECRET` | For OAuth | — | Google OAuth 2.0 Client Secret |
| `NEXT_PUBLIC_APP_URL` | **Yes** | `http://localhost:3000` | Canonical public URL of your deployment |
| `UPSTASH_REDIS_REST_URL` | **Yes** (in prod) | — | Upstash Redis REST HTTP endpoint |
| `UPSTASH_REDIS_REST_TOKEN`| **Yes** (in prod) | — | Upstash Redis REST authentication token |
| `CLOUDFLARE_ACCOUNT_ID` | For R2 | — | Cloudflare Account ID from dashboard |
| `R2_ACCESS_KEY_ID` | For R2 | — | Cloudflare R2 API Token Access Key |
| `R2_SECRET_ACCESS_KEY` | For R2 | — | Cloudflare R2 API Token Secret Key |
| `R2_BUCKET_NAME` | For R2 | `skillfarm-resumes` | Cloudflare R2 Bucket name |
| `R2_PUBLIC_URL` | Optional | — | Public CDN domain (leave empty if using in-app DB viewer) |
| `OPENAI_API_KEY` | If using OpenAI | — | OpenAI API Key (`sk-...`) |
| `GEMINI_API_KEY` | If using Gemini | — | Google Gemini API Key from Google AI Studio |
| `ANTHROPIC_API_KEY` | If using Claude | — | Anthropic Claude API Key |
| `RESEND_API_KEY` | For Email OTP | — | Resend API Key (`re_...`) |
| `EMAIL_FROM` | For Email OTP | `SkillFarm <noreply@skillfarm.in>` | Verified sending identity in Resend |
| `TAVILY_API_KEY` | For Research | — | Tavily search API key for resource evaluation |
| `YOUTUBE_API_KEY` | For Research | — | YouTube Data API v3 Key |
| `GITHUB_TOKEN` | For Research | — | GitHub Personal Access Token (for increased rate limits) |
| `MEM0_API_KEY` | For Memory | — | Mem0 AI Long-Term Memory Platform key |
| `ENABLE_MOCK_MODE` | Dev only | `"false"` | Forces mock data fallback. **Always "false" in production.** |

---

## 4. Database Provisioning (Neon PostgreSQL)

SkillFarm uses **Neon Serverless PostgreSQL** paired with **Drizzle ORM**.

### Step 1: Create a Neon Database
1. Sign in to [neon.tech](https://neon.tech) and click **Create Project**.
2. Name your project (e.g. `skillfarm-prod`).
3. Select your primary region (e.g. `US East (N. Virginia)` or region closest to your Vercel deployment).
4. Copy the connection string under **Connection Details** (select **Pooled Connection**):
   ```text
   postgresql://username:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Step 2: Apply Database Schema
Add `DATABASE_URL` to `.env.local` and apply the schema:
```bash
npm run db:push
```

### Database Management Commands
```bash
# Push schema updates directly to the database
npm run db:push

# Launch visual database management GUI in your browser
npm run db:studio
```

---

## 5. Object Storage Setup (Cloudflare R2)

SkillFarm stores raw uploaded resumes (`.pdf` / `.txt`) in **Cloudflare R2** with deterministic in-place overwriting (`resumes/{userId}/active-resume.ext`) to eliminate storage bloat and unnecessary costs.

### Step 1: Create an R2 Bucket
1. Open the [Cloudflare Dashboard](https://dash.cloudflare.com) and navigate to **R2**.
2. Click **Create Bucket**.
3. Name your bucket: `skillfarm-resumes`.
4. Leave Location as **Automatic** or select your preferred region.

### Step 2: Generate R2 API Credentials
1. Under the R2 section on Cloudflare, click **Manage R2 API Tokens** (right sidebar).
2. Click **Create API Token**.
3. Permissions: **Object Read & Write**.
4. Specify Bucket: Apply to `skillfarm-resumes` (or all buckets).
5. Click **Create API Token**.
6. Copy:
   * **Access Key ID** $\rightarrow$ `R2_ACCESS_KEY_ID`
   * **Secret Access Key** $\rightarrow$ `R2_SECRET_ACCESS_KEY`
   * **Account ID** (found in your Cloudflare dashboard URL / right sidebar) $\rightarrow$ `CLOUDFLARE_ACCOUNT_ID`

```env
CLOUDFLARE_ACCOUNT_ID="your_cloudflare_account_id"
R2_ACCESS_KEY_ID="your_r2_access_key_id"
R2_SECRET_ACCESS_KEY="your_r2_secret_access_key"
R2_BUCKET_NAME="skillfarm-resumes"
```

> **Note**: `R2_PUBLIC_URL` is optional. SkillFarm's built-in **Formatted Resume Viewer** retrieves structured profile data directly from PostgreSQL, so public bucket exposure is not required.

---

## 6. Caching & Sandbox Engine (Upstash Redis)

SkillFarm relies on **Upstash Redis** for:
* **Guest Mode Sandboxing**: Isolated sessions with automatic TTL expiration.
* **Sliding-Window Rate Limiting**: Distributed rate-limiting across serverless workers.
* **OTP Verification**: 10-minute resilient expiration windows.
* **Semantic Cache**: Fast cached responses for repeated queries.

### Step 1: Create a Redis Database
1. Go to [console.upstash.com](https://console.upstash.com) $\rightarrow$ **Create Database**.
2. Name: `skillfarm-cache`.
3. Type: **Regional** (recommended) or **Global**.
4. Scroll down to the **REST API** section and copy:
   * `UPSTASH_REDIS_REST_URL`
   * `UPSTASH_REDIS_REST_TOKEN`

```env
UPSTASH_REDIS_REST_URL="https://your-database.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXxxxx..."
```

---

## 7. Authentication Setup (Google OAuth & Resend OTP)

### Google OAuth 2.0 Setup
1. Open [Google Cloud Console](https://console.cloud.google.com).
2. Navigate to **APIs & Services** $\rightarrow$ **Credentials**.
3. Click **Create Credentials** $\rightarrow$ **OAuth client ID**.
4. Application type: **Web application**.
5. Add **Authorized redirect URIs**:
   * For Local Dev: `http://localhost:3000/api/auth/callback/google`
   * For Production: `https://your-domain.vercel.app/api/auth/callback/google`
6. Copy Client ID and Client Secret:

```env
AUTH_GOOGLE_ID="xxxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxxx"
```

### Resend OTP Email Setup (Optional)
1. Sign up at [resend.com](https://resend.com) and generate an API key.
2. Verify your sending domain (e.g. `skillfarm.in`).

```env
RESEND_API_KEY="re_xxxxxxxxx"
EMAIL_FROM="SkillFarm <noreply@skillfarm.in>"
```

### Generate `AUTH_SECRET`
Generate a cryptographically secure 32-byte string:
```bash
openssl rand -base64 32
# or
npx auth secret
```

---

## 8. AI Models & LLM Providers

SkillFarm supports **Google Gemini**, **OpenAI**, and **Anthropic Claude**. You can configure one or multiple providers.

### Google Gemini (Recommended for Roadmaps & Speed)
1. Get an API key from [Google AI Studio](https://aistudio.google.com).
```env
GEMINI_API_KEY="AIzaSy..."
GEMINI_MODEL="gemini-2.5-flash"
```

### OpenAI
1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys).
```env
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o-mini"
```

### Anthropic Claude (Optional)
```env
ANTHROPIC_API_KEY="sk-ant-..."
ANTHROPIC_MODEL="claude-3-5-sonnet-latest"
```

---

## 9. Research & Evaluation API Keys

### Tavily Search API
1. Create a key at [tavily.com](https://tavily.com).
```env
TAVILY_API_KEY="tvly-..."
```

### YouTube Data API v3 (for Video Recommendations)
1. In Google Cloud Console $\rightarrow$ **APIs & Services** $\rightarrow$ **Library**.
2. Search for **YouTube Data API v3** and click **Enable**.
3. Create an API Key and restrict it to the YouTube API.
```env
YOUTUBE_API_KEY="AIzaSy..."
```

### GitHub API Token (for Repository Recommendations)
Generate a fine-grained token on GitHub with public read access:
```env
GITHUB_TOKEN="github_pat_..."
```

---

## 10. Deploying to Vercel (Production)

### Step 1: Connect GitHub Repository
1. Push your code to a private or public GitHub repository.
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.

### Step 2: Configure Environment Variables
In Vercel **Project Settings** $\rightarrow$ **Environment Variables**, add all production keys:
* `DATABASE_URL` (Neon pooled connection string)
* `AUTH_SECRET`
* `AUTH_GOOGLE_ID`
* `AUTH_GOOGLE_SECRET`
* `NEXT_PUBLIC_APP_URL` (`https://your-production-domain.com`)
* `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`
* `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
* `GEMINI_API_KEY` or `OPENAI_API_KEY`
* `TAVILY_API_KEY` & `YOUTUBE_API_KEY`
* `ENABLE_MOCK_MODE="false"`

### Step 3: Deploy & Verify
Click **Deploy**. Once the build finishes:
```bash
# Verify TypeScript build
npx tsc --noEmit

# Verify Test Suites
npm test
```

---

## 11. Troubleshooting & Common Pitfalls

### Issue 1: `NeonDbError: insert on table violates foreign key constraint`
* **Cause**: Session user identifier was not resolved to the primary `users.id` key.
* **Resolution**: SkillFarm uses `ensureDbUser({ id: userId, email: userId })` to guarantee users exist in the PostgreSQL `users` table before referencing them in `user_resumes` or `learning_profiles`.

### Issue 2: `Calling setState synchronously within an effect`
* **Resolution**: Ensure all async data loaders within `useEffect` are contained in dedicated async closures guarded by an `isMounted` ref flag.

### Issue 3: `Google OAuth redirect_uri_mismatch`
* **Cause**: Authorized Redirect URI in Google Cloud Console does not match your exact domain.
* **Resolution**: Verify that `https://<your-domain>/api/auth/callback/google` is listed under Authorized Redirect URIs in Google Cloud Console.

### Issue 4: R2 Upload Fails with `CredentialsProviderError`
* **Cause**: R2 API token was created without Object Read & Write permissions or Account ID is incorrect.
* **Resolution**: Confirm your Account ID (found on your Cloudflare dashboard overview) and re-generate an R2 API token with **Object Read & Write** permissions.

---

<div align="center">
Need help? Open an issue on <a href="https://github.com/Ravindra-builds/SkillFarm/issues">GitHub Issues</a>.
</div>
