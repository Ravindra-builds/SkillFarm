/**
 * Secure Password Authentication & Credential Storage
 *
 * Implements:
 * - Scrypt password hashing with cryptographically random salt per user
 * - Constant-time comparison to prevent timing attacks
 * - Reset token & verification token generation with TTL
 * - Resilient storage (Neon DB + Redis / In-memory fallback)
 */

import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { getRedis } from "@/lib/redis";
import { ensureDbUser, isDbAvailable } from "@/lib/users";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);
const IS_DEV = process.env.NODE_ENV !== "production";
const RESET_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
const VERIFY_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours

// In-memory credential fallback when Redis / DB are in mock mode
export type CredentialRecord = {
  email: string;
  name: string;
  passwordHash: string;
  emailVerified?: boolean;
  createdAt: number;
};

type TokenRecord = {
  email: string;
  token: string;
  expiresAt: number;
  type: "reset" | "verify";
};

const memCredentials = new Map<string, CredentialRecord>();
const memTokens = new Map<string, TokenRecord>();

/**
 * Hash a plain text password using scrypt with a unique random salt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verify a plain text password against a stored salt:hash string in constant time
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, "hex");
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    return timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Save user credentials
 */
export async function saveUserCredential(
  email: string,
  name: string,
  passwordHash: string,
  emailVerified = false
): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Provision user in Neon DB if available
  if (isDbAvailable()) {
    try {
      await ensureDbUser({
        id: normalizedEmail,
        email: normalizedEmail,
        name,
      });
      if (emailVerified) {
        const db = getDb();
        if (db) {
          await db
            .update(users)
            .set({ emailVerified: new Date() })
            .where(eq(users.email, normalizedEmail));
        }
      }
    } catch (err) {
      console.error("[password-auth] ensureDbUser failed:", err);
    }
  }

  // 2. Save credential hash in Redis or In-Memory
  const redis = await getRedis();
  const record: CredentialRecord = {
    email: normalizedEmail,
    name,
    passwordHash,
    emailVerified,
    createdAt: Date.now(),
  };

  if (redis) {
    await redis.set(`auth:cred:${normalizedEmail}`, JSON.stringify(record));
  } else {
    memCredentials.set(normalizedEmail, record);
  }
}

/**
 * Retrieve user credential record
 */
export async function getUserCredential(email: string): Promise<CredentialRecord | null> {
  const normalizedEmail = email.toLowerCase().trim();

  const redis = await getRedis();
  if (redis) {
    const raw = await redis.get<string | CredentialRecord>(`auth:cred:${normalizedEmail}`);
    if (!raw) return null;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw) as CredentialRecord;
      } catch {
        return null;
      }
    }
    return raw as CredentialRecord;
  }

  const mem = memCredentials.get(normalizedEmail);
  if (mem) return mem;

  return null;
}

/**
 * Mark a user's email as verified
 */
export async function markUserEmailVerified(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const cred = await getUserCredential(normalizedEmail);
  if (cred) {
    await saveUserCredential(normalizedEmail, cred.name, cred.passwordHash, true);
  } else if (isDbAvailable()) {
    try {
      const db = getDb();
      if (db) {
        await db
          .update(users)
          .set({ emailVerified: new Date() })
          .where(eq(users.email, normalizedEmail));
      }
    } catch {}
  }
  return true;
}

/**
 * Check if a user account exists
 */
export async function checkUserExists(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const cred = await getUserCredential(normalizedEmail);
  if (cred) return true;

  if (isDbAvailable()) {
    try {
      const db = getDb();
      if (db) {
        const [row] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .limit(1);
        if (row) return true;
      }
    } catch {}
  }

  return false;
}

/**
 * Create a password reset token
 */
export async function createPasswordResetToken(email: string): Promise<string> {
  const normalizedEmail = email.toLowerCase().trim();
  const token = randomBytes(32).toString("hex");

  const redis = await getRedis();
  if (redis) {
    await redis.set(
      `auth:reset:${token}`,
      JSON.stringify({ email: normalizedEmail, expiresAt: Date.now() + RESET_TOKEN_TTL_SECONDS * 1000 }),
      { ex: RESET_TOKEN_TTL_SECONDS }
    );
  } else {
    memTokens.set(token, {
      email: normalizedEmail,
      token,
      expiresAt: Date.now() + RESET_TOKEN_TTL_SECONDS * 1000,
      type: "reset",
    });
  }

  return token;
}

/**
 * Verify and consume a password reset token (Single-use)
 */
export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const trimmedToken = token.trim();
  if (!trimmedToken) return null;

  const redis = await getRedis();
  if (redis) {
    const raw = await redis.get<string | { email: string; expiresAt: number }>(`auth:reset:${trimmedToken}`);
    if (!raw) return null;
    let payload: { email: string; expiresAt: number };
    if (typeof raw === "string") {
      try {
        payload = JSON.parse(raw);
      } catch {
        return null;
      }
    } else {
      payload = raw;
    }

    if (Date.now() > payload.expiresAt) {
      await redis.del(`auth:reset:${trimmedToken}`);
      return null;
    }

    // Invalidate immediately (single-use)
    await redis.del(`auth:reset:${trimmedToken}`);
    return payload.email;
  }

  const mem = memTokens.get(trimmedToken);
  if (!mem || mem.type !== "reset") return null;
  if (Date.now() > mem.expiresAt) {
    memTokens.delete(trimmedToken);
    return null;
  }

  memTokens.delete(trimmedToken);
  return mem.email;
}

/**
 * Create an email verification token
 */
export async function createEmailVerificationToken(email: string): Promise<string> {
  const normalizedEmail = email.toLowerCase().trim();
  const token = randomBytes(32).toString("hex");

  const redis = await getRedis();
  if (redis) {
    await redis.set(
      `auth:verify:${token}`,
      JSON.stringify({ email: normalizedEmail, expiresAt: Date.now() + VERIFY_TOKEN_TTL_SECONDS * 1000 }),
      { ex: VERIFY_TOKEN_TTL_SECONDS }
    );
  } else {
    memTokens.set(token, {
      email: normalizedEmail,
      token,
      expiresAt: Date.now() + VERIFY_TOKEN_TTL_SECONDS * 1000,
      type: "verify",
    });
  }

  return token;
}

/**
 * Verify and consume an email verification token
 */
export async function consumeEmailVerificationToken(token: string): Promise<string | null> {
  const trimmedToken = token.trim();
  if (!trimmedToken) return null;

  const redis = await getRedis();
  if (redis) {
    const raw = await redis.get<string | { email: string; expiresAt: number }>(`auth:verify:${trimmedToken}`);
    if (!raw) return null;
    let payload: { email: string; expiresAt: number };
    if (typeof raw === "string") {
      try {
        payload = JSON.parse(raw);
      } catch {
        return null;
      }
    } else {
      payload = raw;
    }

    if (Date.now() > payload.expiresAt) {
      await redis.del(`auth:verify:${trimmedToken}`);
      return null;
    }

    await redis.del(`auth:verify:${trimmedToken}`);
    await markUserEmailVerified(payload.email);
    return payload.email;
  }

  const mem = memTokens.get(trimmedToken);
  if (!mem || mem.type !== "verify") return null;
  if (Date.now() > mem.expiresAt) {
    memTokens.delete(trimmedToken);
    return null;
  }

  memTokens.delete(trimmedToken);
  await markUserEmailVerified(mem.email);
  return mem.email;
}

/**
 * Update user password
 */
export async function updateUserPassword(email: string, newPassword: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await getUserCredential(normalizedEmail);
  const newHash = await hashPassword(newPassword);
  const name = existing?.name || normalizedEmail.split("@")[0];
  const emailVerified = existing?.emailVerified ?? false;

  await saveUserCredential(normalizedEmail, name, newHash, emailVerified);
  return true;
}
