"use server";

import { auth } from "@/lib/auth";
import { saveLearningProfile, type LearningProfileInput } from "@/lib/learning-profile";
import { generateRoadmap } from "@/agents/roadmap/generator";
import { saveRoadmap } from "@/lib/roadmap-store";
import { generateProjectsFromRoadmap } from "@/agents/projects/generator";
import { saveProjects } from "@/lib/project-store";

/**
 * Server action for the learning profile form.
 * Resolves the userId from session, saves the profile, and automatically
 * synchronizes the personalized roadmap and practical projects.
 */
export async function saveProfileAction(
  data: LearningProfileInput
): Promise<{ ok: boolean; isMock: boolean; error?: string }> {
  try {
    const session = await auth();
    const userId =
      (session?.user?.email as string | undefined) ??
      (session?.user as unknown as { id?: string } | undefined)?.id ??
      "guest-preview-user";

    const result = await saveLearningProfile(userId, data);

    if (result.ok && result.profile) {
      // Regenerate personalized roadmap based on updated profile
      const newRoadmap = await generateRoadmap({ userId, profile: result.profile });
      await saveRoadmap(userId, newRoadmap);

      // Regenerate practical projects based on updated roadmap
      if (newRoadmap.nodes.length > 0) {
        const newProjects = generateProjectsFromRoadmap(userId, newRoadmap.nodes);
        await saveProjects(userId, newProjects);
      }
    }

    return { ok: true, isMock: result.isMock };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, isMock: false, error: msg };
  }
}
