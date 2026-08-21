import { auth } from "@/lib/auth";
import { getLearningProfile } from "@/lib/learning-profile";
import { generateRoadmap, generateStaticRoadmap } from "@/agents/roadmap/generator";
import { getRoadmap, saveRoadmap } from "@/lib/roadmap-store";
import { checkFeatureRateLimit } from "@/lib/rate-limit";
import { scheduleRoadmapResearch } from "@/agents/research/roadmap-research-scheduler";
import { isGuestSession, checkGuestQuota, recordGuestAction } from "@/lib/guest";
import { createSafeErrorResponse } from "@/lib/friendly-errors";
import { isAllowedModel } from "@/config/models";
import { acquireLock, releaseLock } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();

    // Return 401 if no session exists (no guest or authenticated session).
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = session?.user?.email ?? (session?.user as unknown as { id?: string })?.id ?? "guest-preview-user";

    let roadmap = await getRoadmap(userId);
    const profile = await getLearningProfile(userId);

    const activeProfile = profile ?? {
      goal: "Become a production-ready software engineer",
      currentLevel: "intermediate" as const,
      knownSkills: ["JavaScript", "TypeScript"],
      weeklyHours: 10,
      learningStyle: "mixed" as const,
      format: "mixed" as const,
    };

    // Auto-generate only if no roadmap exists at all for this user
    if (!roadmap) {
      roadmap = await generateRoadmap({ userId, profile: activeProfile });
      await saveRoadmap(userId, roadmap);
    }

    if (roadmap) {
      // Non-blocking rolling 2-week resource discovery
      scheduleRoadmapResearch(roadmap, activeProfile.currentLevel).catch(() => {});
    }

    return new Response(JSON.stringify(roadmap), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return createSafeErrorResponse(err, { endpoint: "api/roadmap [GET]" });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.email ?? (session?.user as unknown as { id?: string })?.id ?? "guest-preview-user";

    const isGuest = isGuestSession(userId);

    // ── Centralized Rate Limiting (2/day prod, 10/day dev) ─────────────────────
    const rateCheck = await checkFeatureRateLimit(userId, "roadmap");
    if (!rateCheck.success) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: `Daily roadmap generation limit reached (${rateCheck.limit} per 24h). Please try again later.`,
          retryAfter: rateCheck.resetSec,
          limit: rateCheck.limit,
          remaining: rateCheck.remaining,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateCheck.resetSec),
          },
        }
      );
    }

    const body = await req.json().catch(() => ({}));

    // ── Server-Side Model Allowlist Validation ─────────────────────────────
    if (body.provider || body.model) {
      if (!isAllowedModel(body.model, body.provider)) {
        return new Response(
          JSON.stringify({ error: "Invalid or unsupported model selection. Please choose an active production model." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const profile = await getLearningProfile(userId);
    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Please complete your learning profile on the dashboard before generating a roadmap." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Guest Mode Quota Enforcement (1 Live Generation / Session) ───────────
    if (isGuest) {
      const quota = await checkGuestQuota(userId, "roadmap");
      if (!quota.allowed) {
        // Return structured static template roadmap without invoking external LLM
        const templateRoadmap = generateStaticRoadmap({ userId, profile });
        await saveRoadmap(userId, templateRoadmap);
        return new Response(
          JSON.stringify({
            ...templateRoadmap,
            _guestNotice: "Guest mode limit reached. Curated engineering track loaded. Create a free account to save customized roadmaps.",
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }
      await recordGuestAction(userId, "roadmap");
    }

    const lockKey = `roadmap:${userId}`;
    const acquired = await acquireLock(lockKey, 45);
    if (!acquired) {
      return new Response(
        JSON.stringify({ error: "Roadmap generation is currently in progress. Please wait a moment." }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const roadmap = await generateRoadmap({
        userId,
        profile,
        provider: body.provider,
        model: body.model,
      });

      await saveRoadmap(userId, roadmap);

      // Non-blocking rolling 2-week resource discovery
      scheduleRoadmapResearch(roadmap, profile.currentLevel).catch(() => {});

      return new Response(
        JSON.stringify({
          ...roadmap,
          rateLimit: {
            remaining: rateCheck.remaining,
            limit: rateCheck.limit,
          },
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } finally {
      await releaseLock(lockKey);
    }
  } catch (err) {
    return createSafeErrorResponse(err, { endpoint: "api/roadmap [POST]" });
  }
}
