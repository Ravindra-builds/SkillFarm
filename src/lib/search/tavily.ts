/**
 * Tavily Search — Phase 7
 *
 * Simple wrapper with timeout, error handling, and mock fallback.
 * Docs: https://docs.tavily.com
 */

type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
};

type SearchOptions = {
  query: string;
  maxResults?: number;
  searchDepth?: "basic" | "advanced";
  includeAnswer?: boolean;
};

function isPlaceholder(v?: string | null) {
  if (!v) return true;
  const s = v.trim().toLowerCase();
  return s.includes("tvly-...") || s.includes("replace-with") || s.length < 10 || !s.startsWith("tvly-");
}

export async function searchTavily(opts: SearchOptions): Promise<TavilyResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key || isPlaceholder(key)) {
    // Mock fallback — deterministic, no network
    return mockResults(opts.query, opts.maxResults ?? 5);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query: opts.query,
        search_depth: opts.searchDepth ?? "advanced",
        include_answer: opts.includeAnswer ?? false,
        include_raw_content: false,
        max_results: Math.min(opts.maxResults ?? 5, 10),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[tavily] search failed ${res.status}: ${text.slice(0, 200)}`);
      // Fallback to mock on rate limit / error
      if (res.status === 429 || res.status >= 500) return mockResults(opts.query, opts.maxResults ?? 5);
      throw new Error(`Tavily ${res.status}: ${text.slice(0, 100)}`);
    }

    const data = await res.json();
    const results: TavilyResult[] = (data.results ?? []).map((r: Record<string, unknown>) => ({
      title: String(r.title ?? "Untitled"),
      url: String(r.url ?? ""),
      content: String(r.content ?? ""),
      score: typeof r.score === "number" ? r.score : 0.5,
      published_date: r.published_date ? String(r.published_date) : undefined,
    }));

    return results.filter((r) => r.url && r.title);
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      console.error("[tavily] timeout for query:", opts.query);
      return mockResults(opts.query, opts.maxResults ?? 5);
    }
    console.error("[tavily] error:", err);
    return mockResults(opts.query, opts.maxResults ?? 5);
  } finally {
    clearTimeout(timeout);
  }
}

function mockResults(query: string, n: number): TavilyResult[] {
  const base = query.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 20);
  const mocks: TavilyResult[] = [
    {
      title: `Official docs — ${query.slice(0, 40)}`,
      url: `https://example.com/docs/${base}`,
      content: `Official documentation covering ${query}. Updated recently with practical examples and modern implementation.`,
      score: 0.92,
      published_date: new Date().toISOString(),
    },
    {
      title: `GitHub — ${query.slice(0, 30)} best practices`,
      url: `https://github.com/example/${base}`,
      content: `Highly starred GitHub repo demonstrating ${query} with production patterns, tests, and deployment.`,
      score: 0.87,
    },
    {
      title: `${query.slice(0, 35)} — in-depth tutorial`,
      url: `https://example.com/tutorial/${base}`,
      content: `Step-by-step tutorial for ${query} with code, common mistakes, and project ideas. Beginner friendly.`,
      score: 0.82,
    },
    {
      title: `YouTube — ${query.slice(0, 30)} crash course`,
      url: `https://youtube.com/watch?v=mock-${base}`,
      content: `Video walkthrough of ${query} — visual, 20-30 min, covers fundamentals and pitfalls.`,
      score: 0.78,
    },
    {
      title: `Blog — Production ${query.slice(0, 30)}`,
      url: `https://example.com/blog/${base}-prod`,
      content: `Opinionated blog on ${query} in production — what tutorials skip, scaling, monitoring, and trade-offs.`,
      score: 0.75,
      published_date: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
  ];
  return mocks.slice(0, n);
}
