/**
 * Topic Research Engine
 *
 * Roadmap-driven resource discovery:
 * - Deterministic query generation (Web/Docs, YouTube, GitHub)
 * - Parallel execution with error isolation
 * - Deduplication and weighted scoring
 * - Structured categorization: Learn (Docs/Guides), Watch (YouTube), Practice (GitHub)
 * - Cache reuse across users for identical topics
 * - Safe atomic upsert to resources and resource_scores tables when database is available
 */

import { searchTavily } from "@/lib/search/tavily";
import { searchGithub } from "@/lib/search/github";
import { searchYoutube } from "@/lib/search/youtube";
import { scoreResource, dedupeByUrl, sortByScore, type ScoredResource } from "./scorer";
import { cacheGet, cacheSet, normalizeQuery } from "@/lib/cache";
import { CACHE_TTL } from "@/config/rate-limits";
import { isDbAvailable } from "@/lib/env";
import { getDb } from "@/db";
import { resources as resourcesTable, resourceScores as resourceScoresTable } from "@/db/schema";

export type TopicResourceCategories = {
  learn: ScoredResource[]; // Docs, articles, tutorials
  watch: ScoredResource[]; // YouTube visual explanations & walkthroughs
  practice: ScoredResource[]; // GitHub repositories & practical code examples
};

export type TopicResourcePack = {
  topic: string;
  normalizedTopic: string;
  categories: TopicResourceCategories;
  allResources: ScoredResource[];
  cached: boolean;
  sourcesUsed: string[];
  durationMs: number;
};

export type TopicResearchOptions = {
  topic: string;
  concepts?: string[];
  level?: string;
  useCache?: boolean;
};

/**
 * Builds deterministic, provider-tailored search queries without LLM overhead.
 */
export function buildTopicQueries(topic: string, concepts: string[] = [], level = "intermediate") {
  const cleanTopic = topic.trim();
  const topConcepts = concepts.slice(0, 3).map((c) => c.trim()).filter(Boolean);
  const conceptsStr = topConcepts.join(" ");

  // 1. Tavily (Web): official documentation, tutorials, comprehensive technical articles
  const webQuery = conceptsStr
    ? `${cleanTopic} ${conceptsStr} ${level} tutorial guide documentation`
    : `${cleanTopic} ${level} tutorial guide documentation`;

  // 2. YouTube: visual explanations, architectural mental models, lectures
  const youtubeQuery = topConcepts.length > 0
    ? `${cleanTopic} ${topConcepts.slice(0, 2).join(" ")} ${level} tutorial`
    : `${cleanTopic} ${level} tutorial crash course`;

  // 3. GitHub: real-world implementations, boilerplates, example repositories
  const githubQuery = topConcepts[0]
    ? `${cleanTopic} ${topConcepts[0]} example project`
    : `${cleanTopic} example project starter`;

  return {
    web: webQuery.slice(0, 150),
    youtube: youtubeQuery.slice(0, 120),
    github: githubQuery.slice(0, 120),
  };
}

/**
 * Normalizes a topic string into a stable cache key.
 * Example: "Relational Database Design" -> "relational-database-design"
 */
export function normalizeTopicKey(topic: string): string {
  return normalizeQuery(topic) || topic.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").slice(0, 80);
}

/**
 * Asynchronously and atomically persists evaluated resources to PostgreSQL tables (resources + resource_scores).
 * Uses onConflictDoUpdate to prevent race-condition unique constraint violations.
 */
async function persistResourcesToDb(resources: ScoredResource[]): Promise<void> {
  if (!isDbAvailable()) return;

  try {
    const db = getDb();
    for (const r of resources) {
      // Atomic upsert for resource row
      const [upsertedResource] = await db
        .insert(resourcesTable)
        .values({
          url: r.url,
          title: r.title,
          description: r.description ?? null,
          source: r.source,
          publishedAt: r.publishedAt ? new Date(r.publishedAt) : null,
          fetchedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: resourcesTable.url,
          set: {
            title: r.title,
            description: r.description ?? null,
            source: r.source,
            publishedAt: r.publishedAt ? new Date(r.publishedAt) : null,
            fetchedAt: new Date(),
          },
        })
        .returning({ id: resourcesTable.id });

      if (!upsertedResource?.id) continue;
      const resourceId = upsertedResource.id;

      // Atomic upsert for resource score row
      await db
        .insert(resourceScoresTable)
        .values({
          resourceId,
          overall: r.score.overall,
          authority: r.score.authority,
          freshness: r.score.freshness,
          accuracy: r.score.accuracy,
          practicalValue: r.score.practicalValue,
          beginnerFriendly: r.score.beginnerFriendly,
          communitySignal: r.score.communitySignal,
          reasoning: r.score.reasoning,
        })
        .onConflictDoUpdate({
          target: resourceScoresTable.resourceId,
          set: {
            overall: r.score.overall,
            authority: r.score.authority,
            freshness: r.score.freshness,
            accuracy: r.score.accuracy,
            practicalValue: r.score.practicalValue,
            beginnerFriendly: r.score.beginnerFriendly,
            communitySignal: r.score.communitySignal,
            reasoning: r.score.reasoning,
          },
        });
    }
  } catch (err) {
    console.error("[topic-research] DB persistence warning (non-fatal):", err);
  }
}

/**
 * Retrieves or discovers a structured Topic Resource Pack for a given roadmap topic.
 */
export async function getTopicResourcePack(opts: TopicResearchOptions): Promise<TopicResourcePack> {
  const { topic, concepts = [], level = "intermediate", useCache = true } = opts;
  const start = Date.now();
  const normalized = normalizeTopicKey(topic);
  const cacheKey = `topic-pack:${normalized}`;

  // 1. Check cache first (Upstash Redis or in-memory)
  if (useCache) {
    const cachedPack = await cacheGet<TopicResourcePack>(cacheKey);
    if (cachedPack && cachedPack.allResources && cachedPack.allResources.length > 0) {
      return {
        ...cachedPack,
        cached: true,
        durationMs: Date.now() - start,
      };
    }
  }

  // 2. Build deterministic queries
  const queries = buildTopicQueries(topic, concepts, level);
  const sourcesUsed: string[] = [];

  // 3. Parallel external searches with graceful error isolation
  const [webRes, githubRes, youtubeRes] = await Promise.all([
    (async () => {
      try {
        const r = await searchTavily({ query: queries.web, maxResults: 5 });
        sourcesUsed.push("tavily");
        return r;
      } catch (err) {
        console.error(`[topic-research] web search failed for "${topic}":`, err);
        return [];
      }
    })(),
    (async () => {
      try {
        const r = await searchGithub(queries.github, 2);
        sourcesUsed.push("github");
        return r;
      } catch (err) {
        console.error(`[topic-research] github search failed for "${topic}":`, err);
        return [];
      }
    })(),
    (async () => {
      try {
        const r = await searchYoutube(queries.youtube, 2);
        sourcesUsed.push("youtube");
        return r;
      } catch (err) {
        console.error(`[topic-research] youtube search failed for "${topic}":`, err);
        return [];
      }
    })(),
  ]);

  // 4. Score and organize into categories
  const learnList: ScoredResource[] = [];
  const watchList: ScoredResource[] = [];
  const practiceList: ScoredResource[] = [];

  for (const r of webRes) {
    const isGh = r.url.includes("github.com");
    const isYt = r.url.includes("youtube.com") || r.url.includes("youtu.be");
    const src = isGh ? "github" : isYt ? "youtube" : r.url.includes("docs.") || r.url.includes("mozilla.org") ? "docs" : "article";

    const scored = scoreResource({
      url: r.url,
      title: r.title,
      content: r.content,
      source: src,
      publishedAt: r.published_date,
    });

    if (isGh) {
      practiceList.push(scored);
    } else if (isYt) {
      watchList.push(scored);
    } else {
      learnList.push(scored);
    }
  }

  for (const r of youtubeRes) {
    watchList.push(
      scoreResource({
        url: r.url,
        title: r.title,
        content: r.content,
        source: "youtube",
        publishedAt: r.publishedAt,
      })
    );
  }

  for (const r of githubRes) {
    practiceList.push(
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

  // Deduplicate and sort per category
  const dedupedLearn = sortByScore(dedupeByUrl(learnList)).slice(0, 4);
  const dedupedWatch = sortByScore(dedupeByUrl(watchList)).slice(0, 2);
  const dedupedPractice = sortByScore(dedupeByUrl(practiceList)).slice(0, 2);

  const allResources = dedupeByUrl([...dedupedLearn, ...dedupedWatch, ...dedupedPractice]);

  const pack: TopicResourcePack = {
    topic,
    normalizedTopic: normalized,
    categories: {
      learn: dedupedLearn,
      watch: dedupedWatch,
      practice: dedupedPractice,
    },
    allResources,
    cached: false,
    sourcesUsed,
    durationMs: Date.now() - start,
  };

  // 5. Cache with centralized TTL (7 days) so all users studying this topic reuse the results
  if (useCache && allResources.length > 0) {
    await cacheSet(cacheKey, pack, CACHE_TTL.TOPIC_RESOURCE_PACK_TTL).catch(() => {});
  }

  // 6. Asynchronously persist to DB without blocking
  if (allResources.length > 0) {
    persistResourcesToDb(allResources).catch(() => {});
  }

  return pack;
}
