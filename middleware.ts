/**
 * Next.js Edge Middleware — Route Protection
 *
 * Protects app routes from unauthenticated access.
 *
 * Strategy:
 * - If auth is NOT configured (no Google OAuth keys) → allow all requests
 *   through (preview / mock mode — app works without credentials).
 * - If auth IS configured → require either a NextAuth session OR a valid
 *   custom cookie session (OTP / guest). Redirect to /login otherwise.
 *
 * The custom cookie session is checked by looking for the `skillfarm_session`
 * cookie. We cannot run jose.jwtVerify in edge middleware easily without
 * the full jose import, so we do a lightweight cookie-presence check here
 * and leave full signature verification to the server-side getCustomSession().
 *
 * Guest users are allowed through (the custom cookie is set for them too).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "skillfarm_session";
const LEGACY_COOKIE = "SkillFarm_session";

// Routes that require authentication when auth is configured
const PROTECTED_PATTERNS = [
  "/dashboard",
  "/chat",
  "/roadmap",
  "/projects",
  "/resources",
  "/knowledge",
  "/settings",
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PATTERNS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isAuthConfigured(): boolean {
  // Check if Google OAuth is configured (same logic as auth.ts, duplicated here
  // because middleware runs at the edge and can't import server-only modules)
  const googleId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;
  if (!googleId || !googleSecret) return false;
  const isPlaceholder = (v: string) =>
    v.includes("your-google") || v.includes("replace-with") || v.length < 8;
  return !isPlaceholder(googleId) && !isPlaceholder(googleSecret);
}

function hasAnySession(req: NextRequest): boolean {
  // Custom cookie (OTP login or guest) — presence is enough here;
  // full signature verification happens server-side
  const customCookie =
    req.cookies.get(SESSION_COOKIE)?.value ||
    req.cookies.get(LEGACY_COOKIE)?.value;
  if (customCookie && customCookie.length > 10) return true;

  // NextAuth session cookie (next-auth.session-token or __Secure-next-auth.session-token)
  const nextAuthCookie =
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value ||
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;
  if (nextAuthCookie) return true;

  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only act on protected routes
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // If auth is not configured, allow everyone through (preview/mock mode)
  if (!isAuthConfigured()) {
    return NextResponse.next();
  }

  // If user has any session (custom or NextAuth), allow through
  if (hasAnySession(req)) {
    return NextResponse.next();
  }

  // No session + auth is configured → redirect to login
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, apple-icon, manifest, icons, logo.png
     * - /api/* (API routes handle their own auth)
     * - /login, /signup, /forgot-password, /reset-password, /verify-email, /terms, /privacy, / (landing)
     */
    "/((?!_next/static|_next/image|favicon.ico|apple-icon|manifest|icon|logo.png|login|signup|forgot-password|reset-password|verify-email|terms|privacy|api/).*)",
  ],
};
