import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { isMockModeForced } from "@/lib/env";

function isDbAvailable(): boolean {
  if (isMockModeForced()) return false;
  const v = process.env.DATABASE_URL;
  if (!v) return false;
  const s = v.trim().toLowerCase();
  if (s.includes("ep-xxx") || s.length < 20) return false;
  return s.startsWith("postgresql");
}

export async function ensureDbUser(user: { id?: string; email: string; name?: string }): Promise<void> {
  if (!isDbAvailable()) return;

  const normalizedEmail = user.email.toLowerCase().trim();
  const userId = user.id || normalizedEmail;
  const userName = user.name || normalizedEmail.split("@")[0] || "User";

  try {
    const db = getDb();
    if (!db) return;

    const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) {
      await db.insert(users).values({
        id: userId,
        email: normalizedEmail,
        name: userName,
      }).onConflictDoNothing();
      console.log(`[db/users] Provisioned user in database: ${userId}`);
    }
  } catch (err) {
    console.error("[db/users] Failed to provision user in database:", err);
  }
}
