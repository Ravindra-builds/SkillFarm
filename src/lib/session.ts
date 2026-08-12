import { cookies } from "next/headers";
import { ensureDbUser } from "@/lib/users";

export type CustomUserSession = {
  id: string;
  email: string;
  name: string;
  isGuest: boolean;
};

const SESSION_COOKIE_NAME = "skillfarm_session";
const LEGACY_COOKIE_NAME = "SkillFarm_session";

export async function createCustomSession(email: string, name?: string, isGuest = false): Promise<CustomUserSession> {
  const normalizedEmail = email.toLowerCase().trim();
  const sessionUser: CustomUserSession = {
    id: normalizedEmail,
    email: normalizedEmail,
    name: name || normalizedEmail.split("@")[0] || "User",
    isGuest,
  };

  // Auto-provision user row in Neon database if available
  await ensureDbUser({ id: normalizedEmail, email: normalizedEmail, name: sessionUser.name }).catch(() => null);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(sessionUser), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return sessionUser;
}

export async function getCustomSession(): Promise<CustomUserSession | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME) || cookieStore.get(LEGACY_COOKIE_NAME);
    if (!cookie?.value) return null;
    const parsed = JSON.parse(cookie.value) as CustomUserSession;
    if (parsed && parsed.email) return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function clearCustomSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    cookieStore.delete(LEGACY_COOKIE_NAME);
  } catch {}
}
