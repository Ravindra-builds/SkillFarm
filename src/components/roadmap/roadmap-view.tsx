"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Circle,
  Lock,
  Clock,
  Sparkles,
  Hammer,
  AlertTriangle,
  RotateCcw,
  Edit3,
  Calendar,
  Layers,
  Search,
  Check,
  X,
  PlayCircle,
  HelpCircle,
} from "lucide-react";
import type { Roadmap, RoadmapNode } from "@/lib/roadmap-store";

export function RoadmapView() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ limit?: number; remaining?: number } | null>(null);
  const [selected, setSelected] = useState<RoadmapNode | null>(null);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "current" | "completed" | "locked">("all");

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    practicalTask: string;
    projectBrief: string;
    estimatedHours: number;
    difficulty: "beginner" | "intermediate" | "advanced";
  }>({
    title: "",
    description: "",
    practicalTask: "",
    projectBrief: "",
    estimatedHours: 4,
    difficulty: "intermediate",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/roadmap");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Failed ${res.status}`);
      }
      const data: Roadmap = await res.json();
      setRoadmap(data);
      const active = data.nodes.find((n) => n.status === "current") ?? data.nodes.find((n) => n.status === "next") ?? data.nodes[0] ?? null;
      setSelected(active);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load roadmap");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    async function fetchInitial() {
      try {
        const res = await fetch("/api/roadmap");
        if (res.ok) {
          const data: Roadmap = await res.json();
          if (!ignore) {
            setRoadmap(data);
            const active = data.nodes.find((n) => n.status === "current") ?? data.nodes.find((n) => n.status === "next") ?? data.nodes[0] ?? null;
            setSelected(active);
          }
        }
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : "Failed to load roadmap");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchInitial();
    return () => {
      ignore = true;
    };
  }, []);

  async function regenerate() {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          setError(data.message ?? "Daily roadmap generation limit reached. Please try again tomorrow.");
          return;
        }
        throw new Error(data.error ?? "Failed to regenerate roadmap");
      }
      setRoadmap(data);
      if (data.rateLimit) {
        setRateLimitInfo(data.rateLimit);
      }
      const active = data.nodes.find((n: RoadmapNode) => n.status === "current") ?? data.nodes[0] ?? null;
      setSelected(active);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regeneration failed");
    } finally {
      setRegenerating(false);
    }
  }

  async function updateStatus(nodeId: string, newStatus: RoadmapNode["status"]) {
    if (!roadmap) return;
    try {
      const res = await fetch("/api/roadmap/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId, status: newStatus }),
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
      console.error("[roadmap] updateStatus failed:", e);
    }

    // Optimistic local update
    const updatedNodes = roadmap.nodes.map((n) => {
      if (n.id === nodeId) return { ...n, status: newStatus };
      return n;
    });
    const updatedRoadmap: Roadmap = {
      ...roadmap,
      nodes: updatedNodes,
      updatedAt: new Date(),
    };
    setRoadmap(updatedRoadmap);
    const newSelected = updatedNodes.find((n) => n.id === nodeId) ?? null;
    setSelected(newSelected);
  }

  function startEditing(node: RoadmapNode) {
    setEditForm({
      title: node.title,
      description: node.description,
      practicalTask: node.practicalTask,
      projectBrief: node.projectBrief,
      estimatedHours: node.estimatedHours ?? 4,
      difficulty: node.difficulty,
    });
    setIsEditing(true);
  }

  async function saveNodeEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !roadmap) return;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/roadmap/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: selected.id,
          ...editForm,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        if (updated && updated.nodes) {
          setRoadmap(updated);
          const updatedSelected = updated.nodes.find((n: RoadmapNode) => n.id === selected.id) ?? selected;
          setSelected(updatedSelected);
          setIsEditing(false);
        }
      }
    } catch (err) {
      console.error("Failed to save node edits", err);
    } finally {
      setSavingEdit(false);
    }
  }

  // Group nodes into sequential weeks
  const weekGroups = useMemo(() => {
    if (!roadmap) return [];
    const groups: { weekNumber: number; nodes: RoadmapNode[]; totalHours: number; doneCount: number }[] = [];
    const map = new Map<number, RoadmapNode[]>();

    for (const node of roadmap.nodes) {
      const w = node.week ?? 1;
      const list = map.get(w) ?? [];
      list.push(node);
      map.set(w, list);
    }

    const sortedWeeks = Array.from(map.keys()).sort((a, b) => a - b);
    for (const w of sortedWeeks) {
      const list = map.get(w)!;
      const totalHours = list.reduce((acc, curr) => acc + (curr.estimatedHours ?? 4), 0);
      const doneCount = list.filter((n) => n.status === "completed").length;
      groups.push({
        weekNumber: w,
        nodes: list,
        totalHours,
        doneCount,
      });
    }
    return groups;
  }, [roadmap]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (!roadmap) return [];
    return roadmap.nodes.filter((n) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.relatedConcepts.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "current" && (n.status === "current" || n.status === "next")) ||
        (statusFilter === "completed" && n.status === "completed") ||
        (statusFilter === "locked" && n.status === "locked");

      return matchesSearch && matchesStatus;
    });
  }, [roadmap, searchQuery, statusFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted animate-pulse rounded-lg" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-9 w-32 bg-muted animate-pulse rounded-xl" />
        </div>
        <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-6">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-muted/60 animate-pulse rounded-2xl" />
            ))}
          </div>
          <div className="h-96 bg-muted/60 animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error && !roadmap) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/10 rounded-2xl">
        <CardContent className="p-6">
          <p className="font-semibold flex items-center gap-2 text-foreground">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" /> {error}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Save your learning profile on the dashboard to build your tailored roadmap.
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={load} variant="outline" size="sm" className="rounded-xl">
              Retry Loading
            </Button>
            <Button onClick={() => (window.location.href = "/dashboard")} size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white">
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!roadmap) return null;

  const completedCount = roadmap.nodes.filter((n) => n.status === "completed").length;
  const totalCount = roadmap.nodes.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalHours = roadmap.nodes.reduce((acc, curr) => acc + (curr.estimatedHours ?? 4), 0);

  return (
    <div className="space-y-6">
      {/* Rate Limit Alert or Notification if present */}
      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="h-6 w-6 p-0 text-muted-foreground">
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-violet-600 shrink-0" /> {roadmap.title}
            </h1>
            <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20">
              {weekGroups.length} Weeks Curriculum
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">{roadmap.description}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Layers className="h-3.5 w-3.5 text-violet-500" /> {totalCount} Total Milestones
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" /> {completedCount} Done ({progressPercent}%)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> ~{totalHours} Total Hours
            </span>
            <span>•</span>
            <span>Updated {new Date(roadmap.updatedAt).toLocaleDateString()}</span>
          </div>
          <div className="pt-2 max-w-md">
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 self-start sm:self-auto">
          <Button
            onClick={regenerate}
            disabled={regenerating}
            className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-sm cursor-pointer text-xs h-9 px-4 flex items-center gap-2"
          >
            <Sparkles className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
            {regenerating ? "Architecting Roadmap..." : "Regenerate AI Roadmap"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            {rateLimitInfo?.remaining !== undefined
              ? `${rateLimitInfo.remaining} regenerations left today`
              : "Rate limited to 2/day (10 in dev)"}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/80">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search topics, skills, tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: "all", label: "All Milestones" },
              { id: "current", label: "In Progress / Next" },
              { id: "completed", label: "Completed" },
              { id: "locked", label: "Upcoming / Locked" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-violet-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Week-by-Week Milestones List + Detail Inspector */}
      <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-6 items-start">
        {/* Left Column: Week-by-Week Milestone Timeline */}
        <div className="space-y-6">
          {weekGroups.map((group) => {
            const visibleNodesInWeek = group.nodes.filter((n) => filteredNodes.some((fn) => fn.id === n.id));
            if (visibleNodesInWeek.length === 0) return null;

            return (
              <div key={group.weekNumber} className="space-y-3">
                {/* Week Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center h-6 w-6 rounded-lg bg-violet-600/10 text-violet-600 dark:text-violet-400 font-bold text-xs">
                      W{group.weekNumber}
                    </span>
                    <h2 className="font-heading text-sm sm:text-base font-semibold text-foreground">
                      Week {group.weekNumber}
                    </h2>
                    <span className="text-xs text-muted-foreground">({group.totalHours}h estimated)</span>
                  </div>
                  <Badge variant="outline" className="text-[11px] font-normal">
                    {group.doneCount}/{group.nodes.length} Completed
                  </Badge>
                </div>

                {/* Week Milestone Cards */}
                <div className="space-y-2.5">
                  {visibleNodesInWeek.map((node) => {
                    const isSelected = selected?.id === node.id;
                    return (
                      <div
                        key={node.id}
                        onClick={() => {
                          setSelected(node);
                          setIsEditing(false);
                        }}
                        className={`rounded-2xl border p-4 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected
                            ? "border-violet-600 bg-violet-500/5 dark:bg-violet-500/10 shadow-sm ring-1 ring-violet-500/30"
                            : node.status === "completed"
                            ? "border-emerald-500/20 bg-card hover:bg-emerald-500/5"
                            : node.status === "current"
                            ? "border-violet-500/40 bg-card hover:bg-violet-500/5"
                            : "border-border/60 bg-card hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div className="shrink-0 mt-0.5">
                            {node.status === "completed" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                            {node.status === "current" && (
                              <div className="h-5 w-5 rounded-full border-2 border-violet-600 flex items-center justify-center">
                                <div className="h-2 w-2 rounded-full bg-violet-600 animate-pulse" />
                              </div>
                            )}
                            {node.status === "next" && <Circle className="h-5 w-5 text-violet-500" />}
                            {node.status === "locked" && <Lock className="h-4 w-4 text-muted-foreground" />}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm font-semibold leading-tight ${isSelected ? "text-violet-600 dark:text-violet-400" : "text-foreground"}`}>
                                {node.title}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {node.description}
                            </p>
                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                              <Badge variant="outline" className="text-[10px] py-0 px-2 capitalize">
                                {node.difficulty}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] py-0 px-2 capitalize">
                                {node.mentorId}
                              </Badge>
                              {node.estimatedHours && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {node.estimatedHours}h
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {node.status === "completed" ? (
                            <Badge className="bg-emerald-600 text-white text-xs">Done</Badge>
                          ) : node.status === "current" ? (
                            <Badge className="bg-violet-600 text-white text-xs">In Progress</Badge>
                          ) : node.status === "next" ? (
                            <Badge variant="secondary" className="text-xs">Up Next</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Locked</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredNodes.length === 0 && (
            <div className="rounded-2xl border border-dashed p-10 text-center space-y-2">
              <HelpCircle className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium text-foreground">No milestones match your search</p>
              <p className="text-xs text-muted-foreground">Try clearing the search query or changing your status filter.</p>
              <Button size="sm" variant="outline" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }} className="rounded-xl text-xs mt-2">
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Detail Inspector & Editor */}
        <div className="space-y-4 lg:sticky lg:top-6">
          {selected ? (
            <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
              <CardHeader className="p-4 sm:p-5 border-b bg-muted/20">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-sm">
                        Week {selected.week ?? 1}
                      </span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {selected.difficulty}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {selected.mentorId} Mentor
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold">{selected.title}</CardTitle>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEditing(selected)}
                    className="h-7 text-xs gap-1 rounded-lg shrink-0 cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3" /> Edit
                  </Button>
                </div>
                <CardDescription className="text-xs mt-1 leading-relaxed">{selected.description}</CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4 text-xs">
                {isEditing ? (
                  /* Edit Form */
                  <form onSubmit={saveNodeEdit} className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-foreground">Milestone Title</label>
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="text-xs h-8 rounded-lg mt-1"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-foreground">Description</label>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="text-xs rounded-lg mt-1 min-h-[60px]"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-foreground">Practical Task</label>
                      <Textarea
                        value={editForm.practicalTask}
                        onChange={(e) => setEditForm({ ...editForm, practicalTask: e.target.value })}
                        className="text-xs rounded-lg mt-1 min-h-[50px]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-foreground">Project Brief</label>
                      <Input
                        value={editForm.projectBrief}
                        onChange={(e) => setEditForm({ ...editForm, projectBrief: e.target.value })}
                        className="text-xs h-8 rounded-lg mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-foreground">Estimated Hours</label>
                        <Input
                          type="number"
                          min={1}
                          max={40}
                          value={editForm.estimatedHours}
                          onChange={(e) => setEditForm({ ...editForm, estimatedHours: Number(e.target.value) })}
                          className="text-xs h-8 rounded-lg mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-foreground">Difficulty</label>
                        <select
                          value={editForm.difficulty}
                          onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value as any })}
                          className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs mt-1"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button type="submit" size="sm" disabled={savingEdit} className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-lg flex-1">
                        <Check className="h-3 w-3 mr-1" /> {savingEdit ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-8 text-xs rounded-lg">
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  /* Display Details */
                  <>
                    {selected.whyItMatters && (
                      <div className="rounded-xl border p-3 bg-muted/20 space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                          Why This Matters
                        </p>
                        <p className="text-muted-foreground leading-relaxed">{selected.whyItMatters}</p>
                      </div>
                    )}

                    {selected.practicalTask && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                          Practical Task
                        </p>
                        <p className="text-muted-foreground leading-relaxed bg-card p-2.5 rounded-xl border">
                          {selected.practicalTask}
                        </p>
                      </div>
                    )}

                    {selected.projectBrief && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                          Deliverable Project
                        </p>
                        <p className="text-muted-foreground leading-relaxed flex items-start gap-2 bg-card p-2.5 rounded-xl border">
                          <Hammer className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
                          <span>{selected.projectBrief}</span>
                        </p>
                      </div>
                    )}

                    {selected.commonMistakes && selected.commonMistakes.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Common Pitfalls
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                          {selected.commonMistakes.map((m, idx) => (
                            <li key={idx}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selected.relatedConcepts && selected.relatedConcepts.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Related Skills & Tools
                        </p>
                        <div className="flex gap-1.5 flex-wrap">
                          {selected.relatedConcepts.map((rc, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px] py-0 px-2">
                              {rc}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Milestone State Actions */}
                    <div className="pt-3 border-t space-y-2">
                      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Milestone Status
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {selected.status !== "completed" ? (
                          <Button
                            onClick={() => updateStatus(selected.id, "completed")}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs h-8 cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Done
                          </Button>
                        ) : (
                          <Button
                            onClick={() => updateStatus(selected.id, "current")}
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs h-8 text-amber-600 hover:text-amber-500 cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Mark In Progress
                          </Button>
                        )}

                        {selected.status !== "current" ? (
                          <Button
                            onClick={() => updateStatus(selected.id, "current")}
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs h-8 cursor-pointer"
                          >
                            <PlayCircle className="h-3.5 w-3.5 mr-1 text-violet-600" /> Set Current
                          </Button>
                        ) : (
                          <Button
                            onClick={() => updateStatus(selected.id, "locked")}
                            size="sm"
                            variant="ghost"
                            className="rounded-xl text-xs h-8 text-muted-foreground cursor-pointer"
                          >
                            <Lock className="h-3.5 w-3.5 mr-1" /> Reset to Todo
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border border-dashed p-6 text-center text-xs text-muted-foreground">
              Select a milestone from the list to view tasks, deliverables, and engineering rationale.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
