import { getTopicResourcePack } from "@/agents/research/topic-research";
import { auth } from "@/lib/auth";
import { checkFeatureRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/resources/topic?topic=Relational%20Database%20Design&concepts=Tables,Foreign%20Keys&level=intermediate&week=2
 *
 * Returns: { topic, week, pack: TopicResourcePack }
 */
export async function GET(req: Request) {
  try {
    const session = await auth().catch(() => null);
    const userId = session?.user?.email ?? (session?.user as unknown as { id?: string })?.id ?? "guest-preview-user";

    // Rate-limit check using centralized config
    const rateCheck = await checkFeatureRateLimit(userId, "topicResources");
    if (!rateCheck.success) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please wait a moment before requesting more resources.",
          retryAfter: rateCheck.resetSec,
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

    const url = new URL(req.url);
    const topic = url.searchParams.get("topic");

    if (!topic || topic.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Missing required query parameter: topic" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rawConcepts = url.searchParams.get("concepts");
    const concepts = rawConcepts
      ? rawConcepts.split(",").map((c) => c.trim()).filter(Boolean)
      : [];
    const level = url.searchParams.get("level") || "intermediate";
    const week = url.searchParams.get("week") ? parseInt(url.searchParams.get("week")!, 10) : undefined;
    const forceRefresh = url.searchParams.get("refresh") === "true";

    const pack = await getTopicResourcePack({
      topic,
      concepts,
      level,
      useCache: !forceRefresh,
    });

    return new Response(
      JSON.stringify({
        topic,
        week,
        pack,
        cached: pack.cached,
        sourcesUsed: pack.sourcesUsed,
        durationMs: pack.durationMs,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    console.error("[api/resources/topic] failed:", err);
    return new Response(
      JSON.stringify({
        error: "Failed to retrieve topic resources",
        message: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
