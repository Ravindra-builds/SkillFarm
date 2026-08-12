"use server";

import { auth } from "@/lib/auth";
import { saveLearningProfile, type LearningProfileInput } from "@/lib/learning-profile";

/**
 * Server action for the learning profile form (Phase 2).
 * We resolve the userId from the session; if no session (preview mode),
 * we fallback to a stable guest id so the demo still works.
 */
export async function saveProfileAction(
  data: LearningProfileInput
): Promise<{ ok: boolean; isMock: boolean; error?: string }> {
  try {
    const session = await auth();
    // In preview without Google, session is null → use guest id so the form still demos save.
    // Once auth is wired, this will be session.user.email.
    const userId =
      (session?.user?.email as string | undefined) ??
      (session?.user as unknown as { id?: string } | undefined)?.id ??
      "guest-preview-user";

    const result = await saveLearningProfile(userId, data);
    return { ok: true, isMock: result.isMock };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    // Zod validation errors bubble as string
    return { ok: false, isMock: false, error: msg };
  }
}
