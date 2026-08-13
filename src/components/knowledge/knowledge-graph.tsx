"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, Sparkles, ArrowRight } from "lucide-react";
import type { Roadmap } from "@/lib/roadmap-store";

export function KnowledgeGraph() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/roadmap")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.nodes) setRoadmap(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-64 bg-muted animate-pulse rounded-xl" />;
  }

  if (!roadmap) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">No roadmap yet — complete your profile and generate a roadmap first.</p>
          <Button size="sm" className="mt-3" onClick={() => (window.location.href = "/roadmap")}>
            Go to Roadmap
          </Button>
        </CardContent>
      </Card>
    );
  }

  const nodes = roadmap.nodes;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Network className="h-5 w-5 text-violet-600" />
        <h2 className="font-heading font-semibold">Knowledge Graph — {roadmap.title}</h2>
        <Badge variant="secondary" className="ml-auto text-xs">
          {nodes.length} nodes
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">Generated from your roadmap — prerequisites and related concepts. Click a node to see details. Pan/zoom is simulated for MVP.</p>

      <Card className="overflow-hidden border-muted/50">
        <CardContent className="p-0">
          <div className="bg-[#0F1117] p-6 overflow-auto">
            <div className="min-w-[700px]">
              {/* Simple vertical graph with branching */}
              <div className="flex flex-col items-center gap-3 text-xs">
                {nodes.map((n, idx) => {
                  const isSelected = selected === n.id;
                  const statusColor =
                    n.status === "completed" ? "bg-emerald-600" : n.status === "current" ? "bg-violet-600 animate-pulse" : n.status === "next" ? "bg-amber-500" : "bg-zinc-700";
                  const isBranch = n.slug === "postgres" || n.slug === "caching-redis";
                  return (
                    <div key={n.id} className="flex flex-col items-center gap-2 w-full">
                      {idx > 0 && <div className="h-6 w-px bg-zinc-700" />}
                      <button
                        onClick={() => setSelected(isSelected ? null : n.id)}
                        className={`rounded-xl border px-4 py-3 text-center min-w-[280px] max-w-[360px] transition ${isSelected ? "bg-white text-black border-white shadow-lg scale-[1.02]" : "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"}`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                          <span className="font-semibold text-sm">{n.title}</span>
                          <Badge variant="secondary" className="ml-1 text-[10px] bg-white/10 text-zinc-300 border-white/10">
                            {n.difficulty}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{n.description}</p>
                        {n.prerequisites.length > 0 && <p className="text-[10px] text-zinc-500 mt-1">Needs: {n.prerequisites.join(", ")}</p>}
                      </button>
                      {isSelected && (
                        <div className="rounded-lg bg-white text-black p-3 text-xs max-w-[360px] w-full border shadow">
                          <p className="font-medium">{n.whyItMatters}</p>
                          <p className="text-muted-foreground mt-1">Mentor: {n.mentorId} • Related: {n.relatedConcepts.join(", ")}</p>
                          <div className="mt-2 flex gap-1.5">
                            <Badge variant="outline" className="text-[11px]">
                              {n.status}
                            </Badge>
                            <Badge variant="secondary" className="text-[11px]">
                              {n.mentorId}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="p-4 bg-card flex items-center justify-between border-t">
            <p className="text-xs text-muted-foreground">Graph generated from your roadmap nodes. Pan and zoom with scroll. Open your roadmap to add or complete nodes — the graph updates automatically.</p>
            <Button variant="outline" size="sm" onClick={() => (window.location.href = "/roadmap")}>
              Open Roadmap <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" /> How to read this
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground leading-relaxed">
          Green = completed, violet = current, amber = next, gray = locked. Edges are prerequisites. Click any node for why it matters and related concepts. This graph changes when you update your profile and regenerate.
        </CardContent>
      </Card>
    </div>
  );
}
