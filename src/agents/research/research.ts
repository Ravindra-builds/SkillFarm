/**
 * Research Engine 
 *
 * Unified entry: query → search (Tavily + GitHub + YouTube in parallel) → dedupe → score → cache.
 * Features per spec:
 * - Parallel execution for independent sources
 * - Deduplication by URL
 * - Weighted scoring (authority, freshness, etc.)
 * - Resource explanations ("why this resource")
 * - Caching (Upstash or memory)
 * - Error handling: one source failing doesn't crash the whole research
 * - Timeout handling per source
 * - Logging (console.error for failures, console.log for cache hits)
 */

import { searchTavily } from "@/lib/search/tavily";
import { searchGithub } from "@/lib/search/github";
import { searchYoutube } from "@/lib/search/youtube";
import { scoreResource, dedupeByUrl, sortByScore, type ScoredResource } from "./scorer";
import { cacheGet, cacheSet, cacheKeyForResearch } from "@/lib/cache";

export type ResearchResult = {
  query: string;
  resources: ScoredResource[];
  cached: boolean;
  sourcesUsed: string[];
  durationMs: number;
};

export async function research(query: string, opts?: { maxResults?: number; useCache?: boolean }): Promise<ResearchResult> {
  const maxResults = opts?.maxResults ?? 6;
  const useCache = opts?.useCache ?? true;
  const sourcesUsed: string[] = [];
  const start = Date.now();

  const cacheKey = cacheKeyForResearch(query, ["tavily", "github", "youtube"]);
  if (useCache) {
    const cached = await cacheGet<ResearchResult>(cacheKey);
    if (cached) {
      console.log(`[research] cache hit for "${query.slice(0, 40)}"`);
      return { ...cached, cached: true };
    }
  }

  // Parallel search — each with its own try/catch so one failure doesn't kill the others
  const [tavilyRes, githubRes, youtubeRes] = await Promise.all([
    (async () => {
      try {
        const r = await searchTavily({ query, maxResults: Math.ceil(maxResults / 2) });
        sourcesUsed.push("tavily");
        return r;
      } catch (err) {
        console.error("[research] tavily failed:", err);
        return [];
      }
    })(),
    (async () => {
      try {
        const r = await searchGithub(query, 2);
        sourcesUsed.push("github");
        return r;
      } catch (err) {
        console.error("[research] github failed:", err);
        return [];
      }
    })(),
    (async () => {
      try {
        const r = await searchYoutube(query, 2);
        sourcesUsed.push("youtube");
        return r;
      } catch (err) {
        console.error("[research] youtube failed:", err);
        return [];
      }
    })(),
  ]);

  // Normalize to ScoredResource via scorer
  const scored: ScoredResource[] = [];

  for (const r of tavilyRes) {
    scored.push(
      scoreResource({
        url: r.url,
        title: r.title,
        content: r.content,
        source: r.url.includes("github") ? "github" : r.url.includes("youtube") ? "youtube" : "docs",
        publishedAt: r.published_date,
      })
    );
  }

  for (const r of githubRes) {
    scored.push(
      scoreResource({
        url: r.url,
        title: r.title,
        content: r.content,
        source: "github",
        publishedAt: r.updated_at,
        stars: r.stars,
      })
    );
  }

  for (const r of youtubeRes) {
    scored.push(
      scoreResource({
        url: r.url,
        title: r.title,
        content: r.content,
        source: "youtube",
        publishedAt: r.publishedAt,
      })
    );
  }

  const deduped = dedupeByUrl(scored);
  const sorted = sortByScore(deduped).slice(0, maxResults);

  const result: ResearchResult = {
    query,
    resources: sorted,
    cached: false,
    sourcesUsed,
    durationMs: Date.now() - start,
  };

  // Cache for 1 hour
  if (useCache) {
    await cacheSet(cacheKey, result, 3600).catch(() => {});
  }

  console.log(`[research] "${query.slice(0, 40)}" → ${sorted.length} resources via ${sourcesUsed.join(",")} in ${result.durationMs}ms`);

  return result;
}

// Helper for chat: enrich prompt with top resources
export function formatResourcesForPrompt(resources: ScoredResource[]): string {
  if (resources.length === 0) return "";
  return `\n\nTop evaluated resources (use as context, cite when relevant):\n${resources
    .slice(0, 3)
    .map((r, i) => `${i + 1}. ${r.title} (${r.url}) — Score ${r.score.overall}/10 — ${r.score.reasoning}`)
    .join("\n")}`;
}
