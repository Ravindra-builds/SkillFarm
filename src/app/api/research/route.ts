import { z } from "zod";
import { research } from "@/agents/research/research";
import { auth } from "@/lib/auth";
import { checkFeatureRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/ip";
import { createSafeErrorResponse } from "@/lib/friendly-errors";

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
 * Rate limiting: enabled (centralized rate rule).
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

    // Rate-limit using centralized rules (15/day in prod, 100/day in dev)
    const rateCheck = await checkFeatureRateLimit(userId, "research");
    if (!rateCheck.success) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: `Daily research run limit reached (${rateCheck.limit} per 24h). Please try again later.`,
          retryAfter: rateCheck.resetSec,
          remaining: rateCheck.remaining,
          limit: rateCheck.limit,
        }),
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
    return createSafeErrorResponse(err, { endpoint: "api/research [POST]" });
  }
}

// GET for simple testing: /api/research?query=hello
// Note: rate-limited by IP to prevent abuse of paid API calls
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("query");
    if (!query) {
      return new Response(JSON.stringify({ error: "Missing query param ?query=" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Rate-limit GET by IP (no auth on this endpoint)
    const ip = getClientIp(req);
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
  } catch (err) {
    return createSafeErrorResponse(err, { endpoint: "api/research [GET]" });
  }
}
