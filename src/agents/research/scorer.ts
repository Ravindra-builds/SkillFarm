/**
 * Resource Scorer
 *
 * Implements the weighted scoring from spec:
 * Authority 25%, Freshness 20%, Accuracy 20%, Practical 15%, BeginnerFriendly 10%, Community 10%
 *
 * Each dimension 0-10, overall weighted.
 */

export type ResourceScore = {
  overall: number;
  authority: number;
  freshness: number;
  accuracy: number;
  practicalValue: number;
  beginnerFriendly: number;
  communitySignal: number;
  reasoning: string;
};

export type ScoredResource = {
  url: string;
  title: string;
  source: "docs" | "github" | "youtube" | "article" | "tutorial";
  description?: string;
  thumbnail?: string;
  author?: string;
  publishedAt?: string;
  score: ResourceScore;
};

const WEIGHTS = {
  authority: 0.25,
  freshness: 0.2,
  accuracy: 0.2,
  practicalValue: 0.15,
  beginnerFriendly: 0.1,
  communitySignal: 0.1,
} as const;

function scoreAuthority(url: string, source: string): number {
  const u = url.toLowerCase();
  if (u.includes("nodejs.org") || u.includes("react.dev") || u.includes("nextjs.org") || u.includes("developer.mozilla.org") || u.includes("docs.")) return 9.5;
  if (u.includes("github.com")) return 8.5;
  if (u.includes("youtube.com")) return 7.0;
  if (source === "docs") return 9.0;
  if (source === "github") return 8.0;
  if (u.includes("vercel.com") || u.includes("prisma.io") || u.includes("drizzle.team")) return 8.8;
  return 6.5;
}

function scoreFreshness(publishedAt?: string): number {
  if (!publishedAt) return 6.0;
  const d = new Date(publishedAt);
  if (isNaN(d.getTime())) return 6.0;
  const days = (Date.now() - d.getTime()) / 86400000;
  if (days < 30) return 9.5;
  if (days < 90) return 8.5;
  if (days < 180) return 7.5;
  if (days < 365) return 6.5;
  if (days < 730) return 5.5;
  return 4.5;
}

function scoreAccuracy(title: string, source: string): number {
  // Heuristic: official docs + github score higher
  if (source === "docs") return 9.0;
  if (source === "github") return 8.5;
  if (title.toLowerCase().includes("official")) return 9.0;
  return 7.5;
}

function scorePractical(content?: string): number {
  const c = (content ?? "").toLowerCase();
  if (c.includes("practical") || c.includes("example") || c.includes("project") || c.includes("tutorial")) return 8.5;
  if (c.includes("code") || c.includes("snippet")) return 8.0;
  return 6.5;
}

function scoreBeginnerFriendly(content?: string): number {
  const c = (content ?? "").toLowerCase();
  if (c.includes("beginner") || c.includes("friendly") || c.includes("step-by-step")) return 8.5;
  if (c.includes("crash course") || c.includes("100 seconds")) return 8.0;
  return 6.5;
}

function scoreCommunity(url: string, stars?: number): number {
  if (stars !== undefined) {
    if (stars > 5000) return 9.5;
    if (stars > 1000) return 8.5;
    if (stars > 100) return 7.5;
    return 6.5;
  }
  const u = url.toLowerCase();
  if (u.includes("github.com")) return 7.5;
  if (u.includes("youtube.com")) return 7.0;
  return 6.0;
}

function inferSource(url: string): ScoredResource["source"] {
  const u = url.toLowerCase();
  if (u.includes("github.com")) return "github";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("docs.") || u.includes("nodejs.org") || u.includes("developer.mozilla.org")) return "docs";
  if (u.includes("tutorial")) return "tutorial";
  return "article";
}

export function scoreResource(input: {
  url: string;
  title: string;
  content?: string;
  source?: string;
  publishedAt?: string;
  stars?: number;
}): ScoredResource {
  const source = (input.source as ScoredResource["source"]) ?? inferSource(input.url);
  const authority = scoreAuthority(input.url, source);
  const freshness = scoreFreshness(input.publishedAt);
  const accuracy = scoreAccuracy(input.title, source);
  const practicalValue = scorePractical(input.content);
  const beginnerFriendly = scoreBeginnerFriendly(input.content);
  const communitySignal = scoreCommunity(input.url, input.stars);

  const overall =
    authority * WEIGHTS.authority +
    freshness * WEIGHTS.freshness +
    accuracy * WEIGHTS.accuracy +
    practicalValue * WEIGHTS.practicalValue +
    beginnerFriendly * WEIGHTS.beginnerFriendly +
    communitySignal * WEIGHTS.communitySignal;

  const reasoning = [
    authority >= 8.5 ? "✓ Official/high-authority source" : "• Community source",
    freshness >= 8 ? "✓ Updated recently" : freshness >= 6 ? "• Moderately fresh" : "• Older content",
    practicalValue >= 8 ? "✓ Strong practical examples" : "• Conceptual",
    beginnerFriendly >= 8 ? "✓ Beginner friendly" : "• Intermediate",
    communitySignal >= 8 ? "✓ Strong community signal" : "• Niche",
  ].join(" • ");

  return {
    url: input.url,
    title: input.title,
    source,
    description: input.content?.slice(0, 200),
    score: {
      overall: Math.round(overall * 10) / 10,
      authority: Math.round(authority * 10) / 10,
      freshness: Math.round(freshness * 10) / 10,
      accuracy: Math.round(accuracy * 10) / 10,
      practicalValue: Math.round(practicalValue * 10) / 10,
      beginnerFriendly: Math.round(beginnerFriendly * 10) / 10,
      communitySignal: Math.round(communitySignal * 10) / 10,
      reasoning,
    },
  };
}

export function dedupeByUrl(resources: ScoredResource[]): ScoredResource[] {
  const seen = new Set<string>();
  const out: ScoredResource[] = [];
  for (const r of resources) {
    const key = r.url.toLowerCase().replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export function sortByScore(resources: ScoredResource[]): ScoredResource[] {
  return [...resources].sort((a, b) => b.score.overall - a.score.overall);
}
