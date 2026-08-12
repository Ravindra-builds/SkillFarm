/**
 * GitHub Search — Phase 8
 *
 * Searches repositories for a query. Uses GITHUB_TOKEN for higher rate limits,
 * falls back to mock when no token or on error.
 */

type GithubResult = {
  title: string;
  url: string;
  content: string;
  stars: number;
  updated_at?: string;
};

function isPlaceholder(v?: string | null) {
  if (!v) return true;
  const s = v.trim().toLowerCase();
  return s.includes("github_pat") && s.includes("...") || s.length < 20 || s === "github_pat_...";
}

export async function searchGithub(query: string, maxResults = 3): Promise<GithubResult[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token || isPlaceholder(token)) {
    return mockGithub(query, maxResults);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const q = encodeURIComponent(`${query} in:name,description`);
    const res = await fetch(`https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=${maxResults}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[github] search failed ${res.status}: ${text.slice(0, 200)}`);
      if (res.status === 429 || res.status === 403) {
        // Rate limited — fallback to mock, don't throw
        return mockGithub(query, maxResults);
      }
      return mockGithub(query, maxResults);
    }

    const data = await res.json();
    const items: GithubResult[] = (data.items ?? []).slice(0, maxResults).map((r: Record<string, unknown>) => ({
      title: String(r.full_name ?? r.name ?? "Untitled"),
      url: String(r.html_url ?? ""),
      content: String(r.description ?? `GitHub repo for ${query}`),
      stars: typeof r.stargazers_count === "number" ? r.stargazers_count : 0,
      updated_at: r.updated_at ? String(r.updated_at) : undefined,
    }));

    return items.filter((r) => r.url);
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      console.error("[github] timeout for", query);
      return mockGithub(query, maxResults);
    }
    console.error("[github] error:", err);
    return mockGithub(query, maxResults);
  } finally {
    clearTimeout(timeout);
  }
}

function mockGithub(query: string, n: number): GithubResult[] {
  const base = query.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 15);
  return [
    {
      title: `example/${base}-starter`,
      url: `https://github.com/example/${base}-starter`,
      content: `Starter repo for ${query} — includes tests, Docker, and CI.`,
      stars: 3420,
      updated_at: new Date().toISOString(),
    },
    {
      title: `vercel/${base}-example`,
      url: `https://github.com/vercel/${base}-example`,
      content: `Vercel example for ${query} — Next.js, edge, streaming.`,
      stars: 1890,
    },
  ].slice(0, n);
}
