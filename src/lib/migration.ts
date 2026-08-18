/**
 * SkillFarm Guest -> Authenticated Account Migration Engine
 *
 * Seamlessly transfers temporary Redis sandbox state (Learning Profile,
 * Roadmap, Main-Project deliverables) to persistent PostgreSQL upon sign-up or login.
 * Safely cleans up the ephemeral Redis guest keys post-migration.
 */

import { extractGuestDataForMigration, cleanupGuestData, isGuestSession } from "@/lib/guest";
import { saveLearningProfile, type LearningProfileInput } from "@/lib/learning-profile";
import { saveRoadmap, type Roadmap } from "@/lib/roadmap-store";
import { saveCapstoneProject, type CapstoneProjectState } from "@/lib/project-store";

export type MigrationResult = {
  success: boolean;
  migrated: {
    profile: boolean;
    roadmap: boolean;
    projects: boolean;
  };
};

/**
 * Migrates ephemeral Redis guest state to persistent PostgreSQL for an authenticated user.
 */
export async function migrateGuestStateToUser(
  guestId: string,
  authUserId: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migrated: {
      profile: false,
      roadmap: false,
      projects: false,
    },
  };

  if (!guestId || !authUserId || isGuestSession(authUserId) || !isGuestSession(guestId)) {
    return result;
  }

  try {
    const guestData = await extractGuestDataForMigration(guestId);

    // 1. Migrate Learning Profile
    if (guestData.profile) {
      const profile = guestData.profile as Partial<LearningProfileInput>;
      if (profile.goal && profile.currentLevel) {
        await saveLearningProfile(authUserId, {
          goal: profile.goal,
          currentLevel: profile.currentLevel,
          knownSkills: profile.knownSkills || [],
          weeklyHours: profile.weeklyHours || 10,
          learningStyle: profile.learningStyle || "mixed",
          format: profile.format || "mixed",
        }).catch((err) => {
          console.error("[migration] Failed to migrate learning profile:", err);
        });
        result.migrated.profile = true;
      }
    }

    // 2. Migrate Roadmap
    if (guestData.roadmap) {
      const rm = guestData.roadmap as Roadmap;
      if (rm.title && Array.isArray(rm.nodes)) {
        await saveRoadmap(authUserId, {
          ...rm,
          userId: authUserId,
          updatedAt: new Date(),
        }).catch((err) => {
          console.error("[migration] Failed to migrate roadmap:", err);
        });
        result.migrated.roadmap = true;
      }
    }

    // 3. Migrate Capstone Project
    if (guestData.projects) {
      const cp = guestData.projects as CapstoneProjectState;
      if (cp.name && Array.isArray(cp.tasks)) {
        await saveCapstoneProject(authUserId, {
          ...cp,
          userId: authUserId,
          updatedAt: new Date(),
        }).catch((err) => {
          console.error("[migration] Failed to migrate capstone project:", err);
        });
        result.migrated.projects = true;
      }
    }

    // 4. Clean up temporary Redis keys
    await cleanupGuestData(guestId).catch(() => {});
  } catch (err) {
    console.error("[migration] Error during guest state migration:", err);
    result.success = false;
  }

  return result;
}
