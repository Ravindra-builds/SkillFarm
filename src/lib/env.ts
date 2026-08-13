import { z } from "zod";

/**
 * Centralized environment validation.
 *
 * We validate on the server at import time so misconfiguration
 * fails fast with a clear message rather than a cryptic runtime error.
 *
 * Why separate server/client:
 * - Secrets must never leak to the browser.
 * - Client vars must be prefixed with NEXT_PUBLIC_.
 */
const serverSchema = z.object({
  // ── Database (Neon Postgres) ──────────────────────────────
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required (Neon Postgres connection string)")
    .url("DATABASE_URL must be a valid URL"),

  // ── Auth.js ───────────────────────────────────────────────
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters — generate with `npx auth secret` or `openssl rand -base64 32`"),
  AUTH_GOOGLE_ID: z.string().min(1, "AUTH_GOOGLE_ID is required").optional(),
  AUTH_GOOGLE_SECRET: z
    .string()
    .min(1, "AUTH_GOOGLE_SECRET is required")
    .optional(),
  // Legacy aliases (so .env from some tutorials still works)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // ── AI Providers ──────────────────────────────────────────
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),

  // ── Research / Search ─────────────────────────────────────
  TAVILY_API_KEY: z.string().optional(),
  EXA_API_KEY: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),

  // ── Cache (Upstash Redis) ─────────────────────────────────
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // ── Misc & Mock Toggle ────────────────────────────────────
  ENABLE_MOCK_MODE: z.enum(["true", "false", "1", "0"]).optional(),
  MEM0_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_ENABLE_MOCK_MODE: z.enum(["true", "false", "1", "0"]).optional(),
});

// We allow missing env in build/lint without crashing, but warn clearly.
// At runtime (dev / prod) validation is strict.
function validateEnv() {
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";

  const server = {
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID,
    AUTH_GOOGLE_SECRET:
      process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    EXA_API_KEY: process.env.EXA_API_KEY,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    ENABLE_MOCK_MODE: process.env.ENABLE_MOCK_MODE,
    MEM0_API_KEY: process.env.MEM0_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
  };

  const client = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ENABLE_MOCK_MODE: process.env.NEXT_PUBLIC_ENABLE_MOCK_MODE,
  };

  // During next build without env, skip hard failure but log.
  if (isBuild && !server.DATABASE_URL) {
    console.warn(
      "[env] Skipping strict validation during build — DATABASE_URL not set. This is OK for CI/build, but the app will not run without it."
    );
    return { ...server, ...client } as z.infer<typeof serverSchema> &
      z.infer<typeof clientSchema>;
  }

  const parsedServer = serverSchema.safeParse(server);
  const parsedClient = clientSchema.safeParse(client);

  if (!parsedServer.success) {
    console.error("❌ Invalid server environment variables:");
    console.error(parsedServer.error.flatten().fieldErrors);
    if (!isBuild) throw new Error("Invalid server environment variables");
  }

  if (!parsedClient.success) {
    console.error("❌ Invalid client environment variables:");
    console.error(parsedClient.error.flatten().fieldErrors);
    if (!isBuild) throw new Error("Invalid client environment variables");
  }

  return {
    ...(parsedServer.success ? parsedServer.data : server),
    ...(parsedClient.success ? parsedClient.data : client),
  };
}

export const env = validateEnv();

export function isMockModeForced(): boolean {
  const flag = process.env.ENABLE_MOCK_MODE ?? process.env.NEXT_PUBLIC_ENABLE_MOCK_MODE;
  return flag === "true" || flag === "1";
}

// Helper to check if a provider is configured
export const isProviderConfigured = {
  github: () => !isMockModeForced() && !!process.env.GITHUB_TOKEN,
  youtube: () => !isMockModeForced() && !!process.env.YOUTUBE_API_KEY,
  tavily: () => !isMockModeForced() && !!process.env.TAVILY_API_KEY,
  exa: () => !isMockModeForced() && !!process.env.EXA_API_KEY,
  redis: () =>
    !isMockModeForced() &&
    !!process.env.UPSTASH_REDIS_REST_URL &&
    !!process.env.UPSTASH_REDIS_REST_TOKEN,
  googleAuth: () =>
    !isMockModeForced() &&
    (!!process.env.AUTH_GOOGLE_ID || !!process.env.GOOGLE_CLIENT_ID),
  openai: () => !isMockModeForced() && !!process.env.OPENAI_API_KEY,
};

/**
 * Shared placeholder detector.
 *
 * Returns true when a string is missing or looks like a sample/placeholder value
 * (e.g. "sk-...", "replace-with-...", "ep-xxx"). Used across search clients, auth,
 * and the chat route to decide whether to fall back to mock mode.
 *
 * Previously duplicated in auth.ts, api/chat/route.ts, search/tavily.ts,
 * agents/orchestrator/router.ts, handoff.ts, synthesizer.ts. Use this instead.
 */
export function isPlaceholder(v?: string | null): boolean {
  if (!v) return true;
  const s = v.trim().toLowerCase();
  if (s.length < 8) return true;
  const placeholderPatterns = [
    "sk-...",
    "replace-with",
    "ep-xxx",
    "user:password@ep-xxx",
    "your-google",
    "changeme",
    "tvly-...",
    "aiза...",   // common typo in sample envs
  ];
  return placeholderPatterns.some((p) => s.includes(p));
}

/**
 * Shared database availability check.
 *
 * Returns true only when DATABASE_URL is set, looks like a real Postgres URL,
 * and mock mode is not forced. Previously duplicated in chat-store.ts,
 * learning-profile.ts, roadmap-store.ts, project-store.ts, users.ts,
 * handoff-store.ts. Use this instead.
 */
export function isDbAvailable(): boolean {
  if (isMockModeForced()) return false;
  const v = process.env.DATABASE_URL;
  if (!v) return false;
  if (isPlaceholder(v)) return false;
  return v.trim().toLowerCase().startsWith("postgresql");
}

/**
 * Shared userId resolver for API routes.
 *
 * Avoids copy-pasting the same fallback chain across every API route.
 * Always returns a string (never null/undefined).
 *
 * @param session - the session object from auth()
 * @param fallback - userId to use when not authenticated (default: "guest-preview-user")
 */
export function resolveUserId(
  session: { user?: { email?: string | null; id?: string } } | null | undefined,
  fallback = "guest-preview-user"
): string {
  return session?.user?.email ?? (session?.user as { id?: string } | undefined)?.id ?? fallback;
}
