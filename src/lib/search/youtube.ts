/**
 * YouTube Search — Phase 8
 *
 * Uses YouTube Data API v3 (YOUTUBE_API_KEY). Falls back to mock when no key.
 */

type YoutubeResult = {
  title: string;
  url: string;
  content: string;
  channel: string;
  publishedAt?: string;
  thumbnail?: string;
};

function isPlaceholder(v?: string | null) {
  if (!v) return true;
  const s = v.trim().toLowerCase();
  return s.includes("aiza") && s.includes("...") || s.length < 20 || s === "aiza...";
}

export async function searchYoutube(query: string, maxResults = 3): Promise<YoutubeResult[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || isPlaceholder(key)) {
    return mockYoutube(query, maxResults);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const q = encodeURIComponent(query);
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${q}&key=${key}`,
      { signal: controller.signal }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[youtube] search failed ${res.status}: ${text.slice(0, 200)}`);
      return mockYoutube(query, maxResults);
    }

    const data = await res.json();
    const items: YoutubeResult[] = (data.items ?? []).map((item: Record<string, unknown>) => {
      const snippet = item.snippet as Record<string, unknown> | undefined;
      const id = (item.id as Record<string, unknown> | undefined)?.videoId as string | undefined;
      return {
        title: String(snippet?.title ?? "Untitled"),
        url: id ? `https://youtube.com/watch?v=${id}` : "",
        content: String(snippet?.description ?? `YouTube video for ${query}`),
        channel: String((snippet?.channelTitle as string) ?? "YouTube"),
        publishedAt: snippet?.publishedAt ? String(snippet.publishedAt) : undefined,
        thumbnail: (snippet?.thumbnails as Record<string, unknown> | undefined)
          ? String(((snippet?.thumbnails as Record<string, Record<string, unknown>>).high as Record<string, unknown>)?.url ?? "")
          : undefined,
      };
    });

    return items.filter((r) => r.url);
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      console.error("[youtube] timeout for", query);
      return mockYoutube(query, maxResults);
    }
    console.error("[youtube] error:", err);
    return mockYoutube(query, maxResults);
  } finally {
    clearTimeout(timeout);
  }
}

function mockYoutube(query: string, n: number): YoutubeResult[] {
  const base = query.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 15);
  return [
    {
      title: `${query.slice(0, 40)} — Full Course (2h)`,
      url: `https://youtube.com/watch?v=mock-${base}`,
      content: `Complete walkthrough of ${query} — from basics to production, with timestamps.`,
      channel: "Fireship",
      publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      thumbnail: `https://i.ytimg.com/vi/mock-${base}/hqdefault.jpg`,
    },
    {
      title: `${query.slice(0, 35)} in 100 seconds`,
      url: `https://youtube.com/watch?v=mock2-${base}`,
      content: `Quick 100-second explainer for ${query} — perfect for review.`,
      channel: "Web Dev Simplified",
    },
  ].slice(0, n);
}
