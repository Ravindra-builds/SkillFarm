"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Sparkles,
  Star,
  ExternalLink,
  BookOpen,
  Video,
  Code2,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FolderGit2,
  Clock,
  Compass,
} from "lucide-react";
import type { ScoredResource } from "@/agents/research/scorer";
import type { TopicResourcePack } from "@/agents/research/topic-research";

type Props = {
  initialTopic?: string;
  initialWeek?: number;
  initialConcepts?: string[];
  initialQuery?: string;
};

export function ResearchPanel({ initialTopic, initialWeek, initialConcepts, initialQuery }: Props) {
  // Topic-based Roadmap Research State
  const [topic, setTopic] = useState<string | undefined>(initialTopic);
  const [week, setWeek] = useState<number | undefined>(initialWeek);
  const [concepts, setConcepts] = useState<string[] | undefined>(initialConcepts);
  const [topicPack, setTopicPack] = useState<TopicResourcePack | null>(null);
  const [activeCategory, setActiveCategory] = useState<"all" | "learn" | "watch" | "practice">("all");

  // Manual Search State
  const [manualQuery, setManualQuery] = useState(initialQuery ?? "");
  const [manualResults, setManualResults] = useState<ScoredResource[] | null>(null);
  const [manualMeta, setManualMeta] = useState<{ cached: boolean; sourcesUsed: string[]; durationMs: number } | null>(null);

  // Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTopic) {
      setTopic(initialTopic);
      setWeek(initialWeek);
      setConcepts(initialConcepts);
      loadTopicResources(initialTopic, initialConcepts, initialWeek);
    } else if (initialQuery) {
      setManualQuery(initialQuery);
      runManualSearch(initialQuery);
    }
  }, [initialTopic, initialWeek, initialConcepts, initialQuery]);

  async function loadTopicResources(t: string, c?: string[], w?: number, forceRefresh = false) {
    if (!t.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const conceptsParam = c && c.length > 0 ? `&concepts=${encodeURIComponent(c.join(","))}` : "";
      const weekParam = w ? `&week=${w}` : "";
      const refreshParam = forceRefresh ? "&refresh=true" : "";
      const res = await fetch(`/api/resources/topic?topic=${encodeURIComponent(t)}${conceptsParam}${weekParam}${refreshParam}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Failed to load resources (${res.status})`);
      }
      const data = await res.json();
      if (data.pack) {
        setTopicPack(data.pack);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load topic resources");
    } finally {
      setLoading(false);
    }
  }

  async function runManualSearch(qToRun?: string) {
    const targetQuery = qToRun ?? manualQuery;
    if (!targetQuery.trim()) return;
    setLoading(true);
    setError(null);
    setTopicPack(null); // Switch to manual search mode view
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: targetQuery, maxResults: 6 }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Failed (${res.status})`);
      }
      const data = await res.json();
      setManualResults(data.resources);
      setManualMeta({ cached: data.cached, sourcesUsed: data.sourcesUsed, durationMs: data.durationMs });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to execute manual research");
    } finally {
      setLoading(false);
    }
  }

  // Render a single scored resource card
  function renderResourceCard(r: ScoredResource) {
    const isDoc = r.source === "docs" || r.source === "article" || r.source === "tutorial";
    const isYt = r.source === "youtube";
    const isGh = r.source === "github";

    let hostname = "";
    try {
      hostname = new URL(r.url).hostname.replace("www.", "");
    } catch {}

    return (
      <Card key={r.url} className="rounded-2xl border border-border/80 hover:shadow-sm transition-shadow flex flex-col justify-between overflow-hidden bg-card">
        <CardContent className="p-3.5 sm:p-4 space-y-2.5 flex-1 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {isDoc && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.2 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 font-semibold rounded-md">
                    <BookOpen className="h-3 w-3 mr-1" /> Learn
                  </Badge>
                )}
                {isYt && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.2 bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20 font-semibold rounded-md">
                    <Video className="h-3 w-3 mr-1" /> Video
                  </Badge>
                )}
                {isGh && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.2 bg-zinc-500/10 text-zinc-800 dark:text-zinc-200 border border-zinc-500/20 font-semibold rounded-md">
                    <Code2 className="h-3 w-3 mr-1" /> Repo
                  </Badge>
                )}
                {hostname && <span className="text-[11px] text-muted-foreground truncate">{hostname}</span>}
              </div>

              <div className="shrink-0">
                <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.2 text-[11px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> {r.score.overall.toFixed(1)}
                </div>
              </div>
            </div>

            <h4 className="text-xs sm:text-sm font-bold leading-snug line-clamp-2 text-foreground">{r.title}</h4>
            {r.description && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{r.description}</p>}
          </div>

          <div className="space-y-2 pt-1">
            <div className="rounded-xl bg-muted/40 p-2.5 border border-border/60 text-xs space-y-1">
              <p className="text-[11px] font-semibold flex items-center gap-1.5 text-foreground">
                <Sparkles className="h-3 w-3 text-violet-600 shrink-0" /> Why this was selected
              </p>
              <p className="text-muted-foreground text-[10px] leading-relaxed line-clamp-2">{r.score.reasoning}</p>
              <div className="flex flex-wrap gap-1 pt-0.5 text-[9px]">
                <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded-md border border-emerald-500/20 font-medium">
                  Auth {r.score.authority}
                </span>
                <span className="bg-blue-500/10 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded-md border border-blue-500/20 font-medium">
                  Fresh {r.score.freshness}
                </span>
                <span className="bg-violet-500/10 text-violet-700 dark:text-violet-300 px-1.5 py-0.2 rounded-md border border-violet-500/20 font-medium">
                  Practical {r.score.practicalValue}
                </span>
              </div>
            </div>

            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7.5 w-full items-center justify-center gap-1.5 rounded-xl border bg-background px-3 text-xs font-semibold hover:bg-muted transition-colors shadow-2xs"
            >
              Open Resource <ExternalLink className="h-3 w-3 ml-0.5" />
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Search Header Banner & Manual Search Input */}
      <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
        <CardHeader className="p-3.5 sm:p-5 pb-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
                <Compass className="h-5 w-5 text-violet-600 shrink-0" /> Resource Discovery Engine
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-0.5">
                Tavily, YouTube & GitHub resources automatically discovered for your roadmap topics, evaluated and deduplicated.
              </CardDescription>
            </div>
            <Link href="/roadmap">
              <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold h-8 gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Back to Roadmap
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder="Search any topic manually (e.g. WebAuthn, Redis Cluster, Docker Compose)..."
                className="pl-10 h-9.5 text-xs sm:text-sm rounded-xl"
                onKeyDown={(e) => e.key === "Enter" && runManualSearch()}
              />
            </div>
            <Button
              onClick={() => runManualSearch()}
              disabled={loading || !manualQuery.trim()}
              className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs sm:text-sm font-semibold h-9.5 px-4 cursor-pointer shrink-0"
            >
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>

          {manualMeta && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-2">
              <span className="font-semibold text-foreground">{manualMeta.cached ? "⚡ Cached" : "🌐 Live Search"}</span> • Sources: {manualMeta.sourcesUsed.join(", ")} • {manualMeta.durationMs}ms • {manualResults?.length ?? 0} resources evaluated
            </p>
          )}

          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center justify-between">
              <span>{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Topic Resource Pack View (from Roadmap) */}
      {topicPack && (
        <div className="space-y-4">
          {/* Topic Pack Banner */}
          <div className="rounded-3xl border-2 border-violet-500/30 bg-violet-500/5 dark:bg-violet-500/10 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {week && (
                  <span className="flex items-center justify-center h-6 w-6 rounded-lg bg-violet-600 text-white font-bold text-xs">
                    W{week}
                  </span>
                )}
                <Badge variant="outline" className="text-xs px-2.5 py-0.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 font-semibold rounded-md">
                  Roadmap Topic Resource Pack
                </Badge>
                {topicPack.cached && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    ⚡ Cached & Evaluated
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {topicPack.topic}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Curated learning materials organized into official documentation, video walkthroughs, and code examples.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => topic && loadTopicResources(topic, concepts, week, true)}
              disabled={loading}
              className="rounded-xl text-xs font-semibold h-8.5 px-3 gap-1.5 shrink-0 self-start sm:self-center"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Resources
            </Button>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-wrap">
            {(
              [
                { id: "all", label: `All Resources (${topicPack.allResources.length})`, icon: Layers },
                { id: "learn", label: `📖 Learn & Docs (${topicPack.categories.learn.length})`, icon: BookOpen },
                { id: "watch", label: `🎬 Watch (${topicPack.categories.watch.length})`, icon: Video },
                { id: "practice", label: `🛠️ Practice & Code (${topicPack.categories.practice.length})`, icon: Code2 },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === tab.id
                    ? "bg-violet-600 text-white shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60 bg-card border border-border/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Grouped or Filtered Resource Cards */}
          {activeCategory === "all" ? (
            <div className="space-y-6">
              {/* 1. Learn Section */}
              {topicPack.categories.learn.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-bold text-sm sm:text-base text-foreground">Official Documentation & In-Depth Guides</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {topicPack.categories.learn.map(renderResourceCard)}
                  </div>
                </div>
              )}

              {/* 2. Watch Section */}
              {topicPack.categories.watch.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Video className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <h3 className="font-bold text-sm sm:text-base text-foreground">Video Explanations & Walkthroughs</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {topicPack.categories.watch.map(renderResourceCard)}
                  </div>
                </div>
              )}

              {/* 3. Practice Section */}
              {topicPack.categories.practice.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Code2 className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                    <h3 className="font-bold text-sm sm:text-base text-foreground">GitHub Code Repositories & Real Implementations</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {topicPack.categories.practice.map(renderResourceCard)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {activeCategory === "learn" && topicPack.categories.learn.map(renderResourceCard)}
              {activeCategory === "watch" && topicPack.categories.watch.map(renderResourceCard)}
              {activeCategory === "practice" && topicPack.categories.practice.map(renderResourceCard)}
            </div>
          )}
        </div>
      )}

      {/* Manual Search Results View */}
      {manualResults && !topicPack && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
              <Search className="h-4 w-4 text-violet-600" /> Search Results for &quot;{manualQuery}&quot;
            </h3>
            <span className="text-xs text-muted-foreground">{manualResults.length} resources found</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {manualResults.map(renderResourceCard)}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!topicPack && !manualResults && !loading && (
        <Card className="border-dashed bg-muted/30 rounded-3xl p-6 text-center">
          <CardContent className="space-y-2 p-4">
            <ShieldCheck className="h-8 w-8 text-emerald-600 mx-auto" />
            <p className="text-sm font-bold text-foreground">Explore Curated Learning Resources</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Open your roadmap and click &quot;Learn from Resources&quot; on any weekly milestone, or enter a query above to run a multi-source evaluated research search.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
