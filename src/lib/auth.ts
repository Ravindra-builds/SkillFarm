import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "@/db";

/**
 * Auth.js (NextAuth v5) — Phase 2
 *
 * Strategy:
 * - If DATABASE_URL is set → use DrizzleAdapter + database sessions (production)
 * - Otherwise → JWT sessions + no adapter (preview / dev without DB)
 *   This lets the Phase 0/1 shell keep working without any env, while still
 *   demonstrating the full auth flow once the developer adds secrets.
 *
 * Google provider is only enabled when credentials are present; otherwise
 * the login page shows a helpful setup message instead of crashing.
 */
function getAdapter() {
  try {
    const db = getDb();
    if (!db) return undefined as unknown as ReturnType<typeof DrizzleAdapter>;
    return DrizzleAdapter(db as never);
  } catch {
    // No DB → no adapter (JWT mode). This is expected in preview mode.
    return undefined as unknown as ReturnType<typeof DrizzleAdapter>;
  }
}

const googleId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleSecret =
  process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

function isPlaceholder(v?: string | null) {
  if (!v) return true;
  const s = v.trim().toLowerCase();
  return (
    s === "" ||
    s.includes("your-google") ||
    s.includes("replace-with") ||
    s.includes("ep-xxx") ||
    s.includes("sk-...") ||
    s === "tvly-..." ||
    s === "changeme" ||
    s.length < 8
  );
}

const hasGoogle = Boolean(
  googleId && googleSecret && !isPlaceholder(googleId) && !isPlaceholder(googleSecret)
);
// Treat placeholder DATABASE_URL (ep-xxx) as not configured so preview uses JWT + memory fallback
const rawDbUrl = process.env.DATABASE_URL;
const hasDatabase = Boolean(rawDbUrl && !isPlaceholder(rawDbUrl) && rawDbUrl.startsWith("postgresql"));

if (!hasGoogle) {
  console.warn(
    "[auth] Google OAuth not configured — set AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET in .env.local. Login will show setup guidance until configured."
  );
}

import { getCustomSession } from "./session";

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[auth] AUTH_SECRET is not set. This is required in production. " +
        "Generate one with `npx auth secret` or `openssl rand -base64 32`."
      );
    }
    // Development-only fallback — logged so it's hard to miss
    console.warn(
      "[auth] ⚠️  AUTH_SECRET not set — using insecure dev fallback. " +
      "Add AUTH_SECRET to .env.local before testing auth flows."
    );
    return "dev-secret-not-for-production-change-me-32chars!!";
  }
  return secret;
}

const nextAuth = NextAuth({
  // Use database sessions when DB exists, otherwise JWT (no DB required)
  adapter: hasDatabase ? getAdapter() : undefined,
  secret: getAuthSecret(),
  session: { strategy: hasDatabase ? "database" : "jwt" },
  providers: hasGoogle
    ? [
        Google({
          clientId: googleId!,
          clientSecret: googleSecret!,
        }),
      ]
    : [],
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: async ({ auth: session }) => {
      // Allow if a session exists. Route-level redirect logic lives in middleware.ts.
      // Returning false here would block NextAuth's own middleware — we leave
      // the redirect logic to our custom middleware.ts instead for full control.
      return !!session;
    },
    jwt: async ({ token, user }) => {
      if (user) token.sub = user.id;
      return token;
    },
    session: async ({ session, token, user }) => {
      if (session.user) {
        (session.user as unknown as { id: string }).id =
          user?.id ?? (token?.sub as string) ?? session.user.email ?? "unknown";
      }
      return session;
    },
  },
});

export const { handlers, signIn, signOut } = nextAuth;

export const auth = (async () => {
  const nextAuthSession = await nextAuth.auth().catch(() => null);
  if (nextAuthSession?.user) return nextAuthSession;

  const custom = await getCustomSession();
  if (custom) {
    return {
      user: {
        id: custom.id,
        name: custom.name,
        email: custom.email,
        image: null,
      },
    };
  }

  return nextAuthSession;
}) as unknown as typeof nextAuth.auth;

/** Convenience helper — use in server components / API routes */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/** Whether auth is fully wired (Google + DB or JWT) */
export function isAuthConfigured() {
  return hasGoogle;
}

export function isDatabaseConfigured() {
  return hasDatabase;
}
