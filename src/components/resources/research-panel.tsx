"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Star, ExternalLink, Clock, ShieldCheck } from "lucide-react";
import type { ScoredResource } from "@/agents/research/scorer";

export function ResearchPanel({ initialQuery }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery ?? "Learn Node.js backend development");
  const [results, setResults] = useState<ScoredResource[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ cached: boolean; sourcesUsed: string[]; durationMs: number } | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, maxResults: 6 }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Failed ${res.status}`);
      }
      const data = await res.json();
      setResults(data.resources);
      setMeta({ cached: data.cached, sourcesUsed: data.sourcesUsed, durationMs: data.durationMs });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-muted/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-violet-600" /> Research Engine — Phase 7/8
          </CardTitle>
          <p className="text-sm text-muted-foreground">Tavily + GitHub + YouTube in parallel, deduped and scored (authority 25%, freshness 20%, accuracy 20%, practical 15%, beginner 10%, community 10%). Cached via Upstash or memory.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g., Best resources to learn Docker" onKeyDown={(e) => e.key === "Enter" && run()} />
            <Button onClick={run} disabled={loading || !query.trim()}>
              {loading ? "Searching…" : "Search"}
            </Button>
          </div>
          {meta && (
            <p className="text-xs text-muted-foreground">
              {meta.cached ? "Cached" : "Fresh"} • {meta.sourcesUsed.join(", ")} • {meta.durationMs}ms • {results?.length ?? 0} resources
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {results && (
        <div className="grid md:grid-cols-2 gap-4">
          {results.map((r) => (
            <Card key={r.url} className="border-muted/50 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {r.source}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">{new URL(r.url).hostname}</span>
                    </div>
                    <h4 className="mt-2 text-sm font-semibold leading-tight line-clamp-2">{r.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description ?? ""}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 border border-amber-500/20">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> {r.score.overall.toFixed(1)} / 10
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-muted/50 p-3 border">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-violet-600" /> Why this was selected
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.score.reasoning}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="bg-emerald-500/10 text-emerald-700 px-2 py-1 rounded-full border border-emerald-500/20">Auth {r.score.authority}</span>
                    <span className="bg-blue-500/10 text-blue-700 px-2 py-1 rounded-full border border-blue-500/20">Fresh {r.score.freshness}</span>
                    <span className="bg-violet-500/10 text-violet-700 px-2 py-1 rounded-full border border-violet-500/20">Practical {r.score.practicalValue}</span>
                  </div>
                </div>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex h-7 w-full items-center justify-center gap-1 rounded-lg border bg-background px-2.5 text-xs font-medium hover:bg-muted"
                >
                  Open resource <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!results && !loading && (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="p-6">
            <p className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Try a search
            </p>
            <p className="text-xs text-muted-foreground mt-1">We’ll search Tavily + GitHub + YouTube in parallel, dedupe by URL, score, and explain why. Works with no keys (mock) and real when you add <code className="font-mono bg-muted px-1 rounded">TAVILY_API_KEY</code>, <code className="font-mono bg-muted px-1 rounded">GITHUB_TOKEN</code>, <code className="font-mono bg-muted px-1 rounded">YOUTUBE_API_KEY</code> — see SETUP.md §4.5-4.7.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
