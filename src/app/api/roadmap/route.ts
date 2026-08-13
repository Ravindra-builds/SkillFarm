import { auth } from "@/lib/auth";
import { getLearningProfile } from "@/lib/learning-profile";
import { generateRoadmap } from "@/agents/roadmap/generator";
import { getRoadmap, saveRoadmap } from "@/lib/roadmap-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
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

    // Auto-regenerate if no roadmap exists OR if profile was updated after the roadmap
    const isStale = profile && roadmap && new Date(profile.updatedAt).getTime() > new Date(roadmap.updatedAt).getTime();
    if (!roadmap || isStale) {
      roadmap = generateRoadmap({ userId, profile: activeProfile });
      await saveRoadmap(userId, roadmap);
    }

    return new Response(JSON.stringify(roadmap), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[api/roadmap GET] fatal", err);
    return new Response(JSON.stringify({ error: "Failed to load roadmap" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function POST() {
  try {
    const session = await auth();
    const userId = session?.user?.email ?? (session?.user as unknown as { id?: string })?.id ?? "guest-preview-user";
    const profile = await getLearningProfile(userId);
    if (!profile) {
      return new Response(JSON.stringify({ error: "No profile" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const roadmap = generateRoadmap({ userId, profile });
    await saveRoadmap(userId, roadmap);
    return new Response(JSON.stringify(roadmap), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[api/roadmap POST] fatal", err);
    return new Response(JSON.stringify({ error: "Failed to generate" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
