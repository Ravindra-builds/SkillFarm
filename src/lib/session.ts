import { cookies } from "next/headers";
import { ensureDbUser } from "@/lib/users";
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "crypto";

export type CustomUserSession = {
  id: string;
  email: string;
  name: string;
  isGuest: boolean;
};

const SESSION_COOKIE_NAME = "skillfarm_session";
const LEGACY_COOKIE_NAME = "SkillFarm_session";
const GUEST_ID_COOKIE_NAME = "skillfarm_guest_id";

/**
 * Returns the signing key as a Uint8Array derived from AUTH_SECRET.
 * Falls back to a dev-only insecure key when the env var is missing.
 */
function getSigningKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ?? "dev-secret-not-for-production-change-me-32chars!!";
  return new TextEncoder().encode(secret);
}

/**
 * Sign a session payload and return a compact JWS token (signed JWT).
 * Algorithm: HS256 (HMAC-SHA256) — symmetric, no public key needed.
 */
async function signSession(payload: CustomUserSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSigningKey());
}

/**
 * Verify and decode a compact JWS token.
 * Returns null if the signature is invalid, expired, or the token is malformed.
 */
async function verifySession(token: string): Promise<CustomUserSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      algorithms: ["HS256"],
    });
    const { id, email, name, isGuest } = payload as Record<string, unknown>;
    if (typeof email !== "string" || !email) return null;
    return {
      id: typeof id === "string" ? id : email,
      email,
      name: typeof name === "string" ? name : email.split("@")[0],
      isGuest: isGuest === true,
    };
  } catch {
    return null;
  }
}

export async function createCustomSession(
  email: string,
  name?: string,
  isGuest = false
): Promise<CustomUserSession> {
  const normalizedEmail = email.toLowerCase().trim();
  const sessionUser: CustomUserSession = {
    id: normalizedEmail,
    email: normalizedEmail,
    name: name || normalizedEmail.split("@")[0] || "User",
    isGuest,
  };

  // Auto-provision user row in Neon database if available (authenticated only)
  if (!isGuest) {
    await ensureDbUser({
      id: normalizedEmail,
      email: normalizedEmail,
      name: sessionUser.name,
    }).catch(() => null);
  }

  const token = await signSession(sessionUser);

  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  } catch {}

  return sessionUser;
}

export async function getCustomSession(): Promise<CustomUserSession | null> {
  try {
    const cookieStore = await cookies();
    const cookie =
      cookieStore.get(SESSION_COOKIE_NAME) || cookieStore.get(LEGACY_COOKIE_NAME);
    if (!cookie?.value) return null;

    // Try signed JWT first (new format)
    const verified = await verifySession(cookie.value);
    if (verified) return verified;

    // Backward compat: try unsigned JSON
    try {
      const parsed = JSON.parse(cookie.value) as CustomUserSession;
      if (parsed && parsed.email) return parsed;
    } catch {
      // Not JSON either
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Generates or retrieves a unique guest ID per browser instance.
 * Ensures Brave, Edge, Chrome, and private tabs maintain their own isolated session.
 */
export async function getGuestUserId(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const existing = cookieStore.get(GUEST_ID_COOKIE_NAME)?.value;
    if (existing && existing.startsWith("guest_") && existing.length >= 10) {
      return existing;
    }
    const freshId = `guest_${randomUUID().slice(0, 12)}`;
    try {
      cookieStore.set(GUEST_ID_COOKIE_NAME, freshId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    } catch {}
    return freshId;
  } catch {
    return `guest_${Date.now().toString(36)}`;
  }
}

export async function clearCustomSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete(LEGACY_COOKIE_NAME);
  } catch {}
}
