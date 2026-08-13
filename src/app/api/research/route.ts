import { z } from "zod";
import { research } from "@/agents/research/research";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  query: z.string().min(3).max(200),
  maxResults: z.number().min(1).max(10).optional(),
});

/**
 * POST /api/research
 *
 * Body: { query: string, maxResults?: number }
 * Returns: { query, resources: ScoredResource[], cached, sourcesUsed, durationMs }
 *
 * Auth: optional — guest preview works, but we still check auth for logging.
 * Rate limiting: enabled (15 requests per 60 seconds).
 */
export async function POST(req: Request) {
  try {
    const session = (await auth().catch(() => null)) as unknown as { user?: { email?: string } } | null;
    const userId = session?.user?.email ?? "guest";

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid query", details: parsed.error.flatten() }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { query, maxResults } = parsed.data;

      // Rate-limit: 15 research requests per 60 seconds (expensive paid API call)
    const rateCheck = await checkRateLimit(`research:${userId}`, 15, 60);
    if (!rateCheck.success) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait before running more research.", retryAfter: rateCheck.resetSec }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rateCheck.resetSec) } }
      );
    }

    const result = await research(query, { maxResults });

    // Add user context to logs (don't expose)
    console.log(`[api/research] user=${userId} query="${query.slice(0, 40)}" → ${result.resources.length}`);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
    });
  } catch (err) {
    console.error("[api/research] fatal:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: "Research failed", message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// GET for simple testing: /api/research?query=hello
// Note: rate-limited by IP to prevent abuse of paid API calls
export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("query");
  if (!query) {
    return new Response(JSON.stringify({ error: "Missing query param ?query=" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate-limit GET by IP (no auth on this endpoint)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const rateCheck = await checkRateLimit(`research-get:${ip}`, 10, 60);
  if (!rateCheck.success) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded.", retryAfter: rateCheck.resetSec }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rateCheck.resetSec) } }
    );
  }

  const maxResults = parseInt(url.searchParams.get("maxResults") ?? "6", 10);
  const result = await research(query, { maxResults: Math.min(Math.max(maxResults, 1), 10) });
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
}
