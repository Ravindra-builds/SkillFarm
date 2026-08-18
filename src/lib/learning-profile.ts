import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { learningProfiles } from "@/db/schema";
import { ensureDbUser } from "@/lib/users";
import {
  isGuestSession,
  getGuestState,
  setGuestState,
  guestKeys,
  GUEST_CONFIG,
} from "@/lib/guest";

/**
 * Learning Profile — structured memory that drives personalization.
 * Persisted in Neon (learning_profiles table) for authenticated users,
 * and isolated to Upstash Redis TTL / ephemeral memory for guest demo sessions.
 */

export const learningProfileSchema = z.object({
  goal: z.string().min(5, "Tell us your goal — e.g., 'Become a production-ready backend engineer'").max(500),
  currentLevel: z.enum(["beginner", "intermediate", "advanced"], {
    message: "Pick your current level",
  }),
  knownSkills: z
    .array(z.string().min(1).max(50))
    .min(1, "Add at least one skill you know — e.g., JavaScript")
    .transform((skills) => skills.slice(0, 20)),
  weeklyHours: z.coerce.number().min(1).max(80).default(10),
  learningStyle: z.enum(["hands-on", "visual", "reading", "mixed"]).default("mixed"),
  format: z.enum(["docs", "videos", "projects", "mixed"]).default("mixed"),
});

export type LearningProfileInput = z.infer<typeof learningProfileSchema>;

export type LearningProfile = LearningProfileInput & {
  id: string;
  userId: string;
  updatedAt: Date;
};

// In-memory fallback
const memoryFallback = new Map<string, LearningProfile>();

import { isMockModeForced } from "@/lib/env";

function isDbAvailable(): boolean {
  if (isMockModeForced()) return false;
  const v = process.env.DATABASE_URL;
  if (!v) return false;
  const s = v.trim().toLowerCase();
  if (s.includes("ep-xxx") || s.includes("user:password@ep-xxx") || s.length < 20) return false;
  return s.startsWith("postgresql");
}

export async function getLearningProfile(userId: string): Promise<LearningProfile | null> {
  const isGuest = isGuestSession(userId);

  if (isGuest) {
    const mem = memoryFallback.get(userId);
    if (mem) return mem;

    const fromRedis = await getGuestState<LearningProfile>(guestKeys.profile(userId));
    if (fromRedis) {
      memoryFallback.set(userId, fromRedis);
      return fromRedis;
    }
    return null;
  }

  if (!isDbAvailable()) {
    return memoryFallback.get(userId) ?? null;
  }

  try {
    const dbUserId = await ensureDbUser({ id: userId, email: userId });
    const db = getDb();
    const rows = await db
      .select()
      .from(learningProfiles)
      .where(eq(learningProfiles.userId, dbUserId))
      .limit(1);
    let row = rows[0];
    if (!row && dbUserId !== userId) {
      // Fallback check by raw userId if dbUserId was different
      const fallbackRows = await db
        .select()
        .from(learningProfiles)
        .where(eq(learningProfiles.userId, userId))
        .limit(1);
      row = fallbackRows[0];
    }
    if (!row) return memoryFallback.get(userId) ?? null;

    // Map DB row → typed profile
    const prefs = (row.preferences as { learningStyle?: string; weeklyHours?: number; format?: string } | null) ?? {};
    return {
      id: row.id,
      userId: row.userId,
      goal: row.goal ?? "",
      currentLevel: (row.currentLevel as LearningProfileInput["currentLevel"]) ?? "beginner",
      knownSkills: (row.knownSkills as string[]) ?? [],
      weeklyHours: prefs.weeklyHours ?? 10,
      learningStyle: (prefs.learningStyle as LearningProfileInput["learningStyle"]) ?? "mixed",
      format: (prefs.format as LearningProfileInput["format"]) ?? "mixed",
      updatedAt: row.updatedAt,
    };
  } catch (err) {
    console.error("[learningProfile] get failed, falling back to memory:", err);
    return memoryFallback.get(userId) ?? null;
  }
}

export async function saveLearningProfile(
  userId: string,
  input: LearningProfileInput
): Promise<{ ok: boolean; profile: LearningProfile; isMock: boolean }> {
  const parsed = learningProfileSchema.parse(input);
  const isGuest = isGuestSession(userId);

  if (isGuest) {
    const profile: LearningProfile = {
      id: `guest_${userId}`,
      userId,
      ...parsed,
      updatedAt: new Date(),
    };
    memoryFallback.set(userId, profile);
    await setGuestState(guestKeys.profile(userId), profile, GUEST_CONFIG.SESSION_TTL);
    return { ok: true, profile, isMock: false };
  }

  // Preview without DB → memory fallback
  if (!isDbAvailable()) {
    const profile: LearningProfile = {
      id: `mem_${userId}`,
      userId,
      ...parsed,
      updatedAt: new Date(),
    };
    memoryFallback.set(userId, profile);
    return { ok: true, profile, isMock: true };
  }

  try {
    // Ensure the user row exists and resolve the actual primary key id from `user` table.
    const dbUserId = await ensureDbUser({ id: userId, email: userId });

    const db = getDb();
    // Upsert: insert or update on userId unique
    const existing = await db
      .select({ id: learningProfiles.id })
      .from(learningProfiles)
      .where(eq(learningProfiles.userId, dbUserId))
      .limit(1);

    if (existing.length === 0) {
      const [inserted] = await db
        .insert(learningProfiles)
        .values({
          userId: dbUserId,
          goal: parsed.goal,
          currentLevel: parsed.currentLevel,
          knownSkills: parsed.knownSkills,
          preferences: {
            weeklyHours: parsed.weeklyHours,
            learningStyle: parsed.learningStyle,
            format: parsed.format,
          },
        })
        .returning();
      return {
        ok: true,
        profile: {
          id: inserted.id,
          userId: dbUserId,
          ...parsed,
          updatedAt: inserted.updatedAt,
        },
        isMock: false,
      };
    } else {
      const [updated] = await db
        .update(learningProfiles)
        .set({
          goal: parsed.goal,
          currentLevel: parsed.currentLevel,
          knownSkills: parsed.knownSkills,
          weakSkills: [],
          preferences: {
            weeklyHours: parsed.weeklyHours,
            learningStyle: parsed.learningStyle,
            format: parsed.format,
          },
          updatedAt: new Date(),
        })
        .where(eq(learningProfiles.userId, dbUserId))
        .returning();
      return {
        ok: true,
        profile: {
          id: updated.id,
          userId: dbUserId,
          ...parsed,
          updatedAt: updated.updatedAt,
        },
        isMock: false,
      };
    }
  } catch (err) {
    console.error("[learningProfile] save failed, using memory fallback:", err);
    const profile: LearningProfile = {
      id: `mem_${userId}`,
      userId,
      ...parsed,
      updatedAt: new Date(),
    };
    memoryFallback.set(userId, profile);
    return { ok: true, profile, isMock: true };
  }
}
