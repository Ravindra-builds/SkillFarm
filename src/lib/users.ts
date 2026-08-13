import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { isMockModeForced } from "@/lib/env";

export function isDbAvailable(): boolean {
  if (isMockModeForced()) return false;
  const v = process.env.DATABASE_URL;
  if (!v) return false;
  const s = v.trim().toLowerCase();
  if (s.includes("ep-xxx") || s.includes("user:password@ep-xxx") || s.length < 20) return false;
  return s.startsWith("postgresql");
}

export async function ensureDbUser(user: { id?: string; email: string; name?: string }): Promise<string> {
  const normalizedEmail = user.email ? user.email.toLowerCase().trim() : "";
  const defaultId = user.id || normalizedEmail || "guest-preview-user";

  if (!isDbAvailable()) return defaultId;
  if (!normalizedEmail && !user.id) return defaultId;

  try {
    const db = getDb();
    if (!db) return defaultId;

    // 1. Try finding existing user by email
    if (normalizedEmail) {
      const [byEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      if (byEmail) {
        return byEmail.id;
      }
    }

    // 2. Try finding existing user by id
    if (user.id) {
      const [byId] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      if (byId) {
        return byId.id;
      }
    }

    // 3. Provision a new user record if none exists
    const targetId = user.id || normalizedEmail;
    const userName = user.name || (normalizedEmail ? normalizedEmail.split("@")[0] : "User");

    await db
      .insert(users)
      .values({
        id: targetId,
        email: normalizedEmail || targetId,
        name: userName,
      })
      .onConflictDoNothing();

    console.log(`[db/users] Provisioned user in database: ${targetId}`);

    // Confirm and return the user ID from the database
    if (normalizedEmail) {
      const [inserted] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      if (inserted) return inserted.id;
    }

    return targetId;
  } catch (err) {
    console.error("[db/users] Failed to provision user in database:", err);
    return defaultId;
  }
}
