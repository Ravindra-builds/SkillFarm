"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Lock, Clock, Sparkles, Hammer, AlertTriangle } from "lucide-react";
import type { Roadmap, RoadmapNode } from "@/lib/roadmap-store";

export function RoadmapView() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RoadmapNode | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/roadmap");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Failed ${res.status}`);
      }
      const data = await res.json();
      setRoadmap(data);
      setSelected(data.nodes.find((n: RoadmapNode) => n.status === "current") ?? data.nodes[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function regenerate() {
    setLoading(true);
    try {
      const res = await fetch("/api/roadmap", { method: "POST" });
      if (!res.ok) throw new Error("Regenerate failed");
      const data = await res.json();
      setRoadmap(data);
      setSelected(data.nodes.find((n: RoadmapNode) => n.status === "current") ?? data.nodes[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function markCompleted(nodeId: string) {
    if (!roadmap) return;
    try {
      const res = await fetch("/api/roadmap/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId, status: "completed" }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (updated && updated.nodes) {
          setRoadmap(updated);
          const newSelected = updated.nodes.find((n: RoadmapNode) => n.id === nodeId) ?? selected;
          setSelected(newSelected);
          return;
        }
      }
    } catch (e) {
      console.error("[roadmap] markCompleted failed:", e);
    }
    // Optimistic fallback if API offline
    const updated = {
      ...roadmap,
      nodes: roadmap.nodes.map((n) => {
        if (n.id === nodeId) return { ...n, status: "completed" as const };
        return n;
      }),
    };
    const idx = updated.nodes.findIndex((n) => n.id === nodeId);
    const next = updated.nodes[idx + 1];
    if (next && (next.status === "locked" || next.status === "next")) next.status = "current";
    updated.updatedAt = new Date();
    setRoadmap(updated as Roadmap);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded" />
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/10">
        <CardContent className="p-6">
          <p className="font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Complete your learning profile on the dashboard first, then regenerate.</p>
          <div className="mt-3 flex gap-2">
            <Button onClick={load} variant="outline" size="sm">
              Retry
            </Button>
            <Button onClick={() => (window.location.href = "/dashboard")} size="sm">
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!roadmap) return null;

  const completed = roadmap.nodes.filter((n) => n.status === "completed").length;
  const progress = Math.round((completed / roadmap.nodes.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" /> {roadmap.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{roadmap.description}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> {roadmap.nodes.length} nodes • {completed} completed • {progress}% • Updated {new Date(roadmap.updatedAt).toLocaleDateString()}
          </div>
          <Progress value={progress} className="mt-3 h-2 max-w-md" />
        </div>
        <Button onClick={regenerate} variant="outline" size="sm">
          Regenerate
        </Button>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="space-y-3">
          {roadmap.nodes.map((n) => (
            <div
              key={n.id}
              onClick={() => setSelected(n)}
              className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition ${selected?.id === n.id ? "bg-primary text-primary-foreground border-primary shadow" : n.status === "completed" ? "bg-emerald-500/5 border-emerald-500/20" : n.status === "current" ? "bg-violet-500/5 border-violet-500/20" : "bg-card hover:bg-muted/50"}`}
            >
              <div className="shrink-0">
                {n.status === "completed" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                {n.status === "current" && <div className="h-5 w-5 rounded-full border-2 border-violet-600 flex items-center justify-center"><div className="h-2 w-2 rounded-full bg-violet-600 animate-pulse" /></div>}
                {n.status === "next" && <Circle className="h-5 w-5 text-violet-600" />}
                {n.status === "locked" && <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium leading-none ${selected?.id === n.id ? "text-primary-foreground" : ""}`}>{n.title}</p>
                <p className={`text-xs ${selected?.id === n.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{n.description}</p>
                <div className="mt-1.5 flex gap-1.5">
                  <Badge variant={selected?.id === n.id ? "secondary" : "outline"} className="text-[11px]">
                    {n.difficulty}
                  </Badge>
                  <Badge variant={selected?.id === n.id ? "secondary" : "outline"} className="text-[11px]">
                    {n.mentorId}
                  </Badge>
                </div>
              </div>
              {n.status === "completed" && <Badge className="bg-emerald-500 text-white">Done</Badge>}
              {n.status === "current" && <Badge className="bg-violet-600 text-white">Current</Badge>}
              {n.status === "next" && <Badge variant="secondary">Up next</Badge>}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {selected ? (
            <Card className="border-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{selected.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{selected.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-medium">Why it matters:</span> {selected.whyItMatters}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Practical task</p>
                  <p className="text-sm mt-1">{selected.practicalTask}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Project</p>
                  <p className="text-sm mt-1 flex gap-2">
                    <Hammer className="h-4 w-4 text-violet-600 shrink-0" /> {selected.projectBrief}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Common mistakes</p>
                  <ul className="text-xs text-muted-foreground list-disc pl-4 mt-1 space-y-1">
                    {selected.commonMistakes.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    Prerequisites: {selected.prerequisites.length ? selected.prerequisites.join(", ") : "None"}
                  </Badge>
                </div>
                {selected.status !== "completed" && (
                  <Button onClick={() => markCompleted(selected.id)} className="w-full" size="sm">
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Mark as completed
                  </Button>
                )}
                {selected.status === "completed" && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Completed — next node unlocked</p>}
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-dashed bg-muted/30">
            <CardContent className="p-4">
              <p className="text-xs font-semibold">How this roadmap was made</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Generated from your learning profile (goal, level, known skills, hours). Pruned for what you already know, ordered by prerequisites, and mapped to mentors. Regenerate anytime after updating your profile.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
