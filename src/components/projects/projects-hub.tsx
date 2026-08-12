"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Hammer, CheckCircle2, Clock, GitBranch, ExternalLink, Sparkles, AlertCircle } from "lucide-react";
import type { Project, ProjectStatus } from "@/lib/project-store";

export function ProjectsHub() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingRepo, setEditingRepo] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to load projects");
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(projectId: string, newStatus: ProjectStatus) {
    try {
      const repoUrl = editingRepo[projectId];
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, status: newStatus, repoUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setProjects((prev) => prev.map((p) => (p.id === projectId ? data.project : p)));
      }
    } catch (e) {
      console.error("[projects] update failed:", e);
    }
  }

  async function saveRepo(projectId: string) {
    const repoUrl = editingRepo[projectId];
    if (repoUrl === undefined) return;
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, repoUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setProjects((prev) => prev.map((p) => (p.id === projectId ? data.project : p)));
      }
    } catch (e) {
      console.error("[projects] save repo failed:", e);
    }
  }

  const filtered = projects.filter((p) => {
    if (domainFilter !== "all" && p.mentorId !== domainFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  const completedCount = projects.filter((p) => p.status === "completed").length;
  const inProgressCount = projects.filter((p) => p.status === "in-progress").length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/10">
        <CardContent className="p-6">
          <p className="font-semibold text-amber-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
          <Button onClick={load} variant="outline" size="sm" className="mt-3">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight flex items-center gap-2">
            <Hammer className="h-5 w-5 text-violet-600" /> Practical Projects Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build production-grade deliverables for your roadmap nodes. Link your GitHub repos to showcase completed work.
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {projects.length} total projects
            </Badge>
            <span className="text-emerald-600 font-medium">✓ {completedCount} completed</span>
            <span className="text-violet-600 font-medium">⚡ {inProgressCount} in progress</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="in-progress" className="text-xs">In Progress</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">Completed</TabsTrigger>
            <TabsTrigger value="not-started" className="text-xs">Not Started</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-1.5 flex-wrap">
          {["all", "backend", "ai-engineer", "frontend", "devops", "security", "system-design"].map((d) => (
            <Badge
              key={d}
              variant={domainFilter === d ? "default" : "outline"}
              className="cursor-pointer text-xs capitalize"
              onClick={() => setDomainFilter(d)}
            >
              {d.replace("-", " ")}
            </Badge>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="p-8 text-center">
            <Hammer className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No projects match the selected filter</p>
            <p className="text-xs text-muted-foreground mt-1">Try switching domain or status filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <Card key={p.id} className="border-muted/50 flex flex-col justify-between hover:shadow-sm transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {p.mentorId}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {p.difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="text-base mt-2 leading-snug">{p.title}</CardTitle>
                  </div>
                  <Badge
                    className={
                      p.status === "completed"
                        ? "bg-emerald-600 text-white"
                        : p.status === "in-progress"
                        ? "bg-violet-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {p.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                <div className="space-y-1.5 rounded-lg bg-muted/40 p-3 text-xs border">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-violet-600" /> Core Requirements
                  </p>
                  <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                    {p.requirements.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>

                {p.stretchGoals && p.stretchGoals.length > 0 && (
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-500" /> Stretch Goals
                    </p>
                    <p className="text-muted-foreground italic pl-4">{p.stretchGoals.join(" • ")}</p>
                  </div>
                )}

                <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <GitBranch className="h-3.5 w-3.5 text-violet-600" /> GitHub Repository URL
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://github.com/username/repository"
                      className="text-xs h-8"
                      value={editingRepo[p.id] ?? p.repoUrl ?? ""}
                      onChange={(e) => setEditingRepo({ ...editingRepo, [p.id]: e.target.value })}
                    />
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => saveRepo(p.id)}>
                      Save
                    </Button>
                  </div>
                  {p.repoUrl && (
                    <a
                      href={p.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-violet-600 hover:underline gap-1 mt-1"
                    >
                      View GitHub Repository <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  {p.status !== "completed" && (
                    <Button size="sm" className="w-full text-xs" onClick={() => updateStatus(p.id, "completed")}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Complete
                    </Button>
                  )}
                  {p.status === "not-started" && (
                    <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => updateStatus(p.id, "in-progress")}>
                      Start Building
                    </Button>
                  )}
                  {p.status === "completed" && (
                    <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => updateStatus(p.id, "in-progress")}>
                      Reopen
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
