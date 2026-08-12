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
    if (!roadmap) {
      const profile = await getLearningProfile(userId);
      if (!profile) {
        return new Response(JSON.stringify({ error: "No learning profile yet. Complete your profile on /dashboard first." }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      roadmap = generateRoadmap({ userId, profile });
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
