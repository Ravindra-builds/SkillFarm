"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
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
  Search,
  Check,
  X,
  PlayCircle,
  HelpCircle,
  FolderGit2,
  ArrowRight,
  BookOpen,
  Layers,
  Target,
  BrainCircuit,
  Lightbulb,
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
      title: node.topic || node.title,
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

  const isGuest = Boolean(
    roadmap?.userId && (
      roadmap.userId === "guest-preview-user" ||
      roadmap.userId.startsWith("guest") ||
      roadmap.userId.includes("guest") ||
      roadmap.userId.endsWith("@skillfarm.local")
    )
  );

  const displayWeekGroups = useMemo(() => {
    if (isGuest) {
      return weekGroups.filter((g) => g.weekNumber <= 2);
    }
    return weekGroups;
  }, [weekGroups, isGuest]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (!roadmap) return [];
    return roadmap.nodes.filter((n) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery.trim() === "" ||
        n.title.toLowerCase().includes(q) ||
        (n.topic && n.topic.toLowerCase().includes(q)) ||
        n.description.toLowerCase().includes(q) ||
        (n.concepts && n.concepts.some((c) => c.toLowerCase().includes(q))) ||
        (n.relatedConcepts && n.relatedConcepts.some((c) => c.toLowerCase().includes(q)));

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted animate-pulse rounded-lg" />
            <div className="h-4 w-96 max-w-full bg-muted animate-pulse rounded" />
          </div>
          <div className="h-9 w-32 bg-muted animate-pulse rounded-xl" />
        </div>
        <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-6">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted/60 animate-pulse rounded-2xl" />
            ))}
          </div>
          <div className="h-[420px] bg-muted/60 animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error && !roadmap) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/10 rounded-2xl p-2 sm:p-3">
        <CardContent className="p-5 sm:p-6 space-y-3">
          <p className="font-bold text-base flex items-center gap-2.5 text-foreground">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" /> {error}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Save your learning profile on the dashboard to build your tailored roadmap.
          </p>
          <div className="pt-1 flex flex-wrap gap-2.5">
            <Button onClick={load} variant="outline" size="sm" className="rounded-xl h-9 px-3.5 text-xs sm:text-sm font-medium">
              Retry Loading
            </Button>
            <Button onClick={() => (window.location.href = "/dashboard")} size="sm" className="rounded-xl h-9 px-3.5 text-xs sm:text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white">
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
  const mainProject = roadmap.capstoneProject;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Rate Limit Alert or Notification if present */}
      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 sm:p-4 flex items-center justify-between text-xs sm:text-sm text-amber-900 dark:text-amber-200 gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="leading-relaxed">{error}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="h-6 w-6 p-0 text-muted-foreground shrink-0">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 sm:gap-5 border-b pb-5">
        <div className="space-y-2.5 flex-1 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
              <Sparkles className="h-6 w-6 text-violet-600 shrink-0" /> {roadmap.title}
            </h1>
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 font-semibold rounded-md">
              Concept-First Curriculum • {weekGroups.length} Weeks
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground w-full max-w-3xl leading-relaxed">{roadmap.description}</p>
          <div className="flex items-center gap-2.5 sm:gap-3.5 text-xs text-muted-foreground pt-0.5 flex-wrap">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <Layers className="h-3.5 w-3.5 text-violet-500" /> {totalCount} Modules
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" /> {completedCount} Mastered ({progressPercent}%)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> ~{totalHours} Total Hours
            </span>
            <span>•</span>
            <span>Updated {new Date(roadmap.updatedAt).toLocaleDateString()}</span>
          </div>
          <div className="pt-1 max-w-md">
            <Progress value={progressPercent} className="h-2 rounded-full" />
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0 w-full md:w-auto">
          <Button
            onClick={regenerate}
            disabled={regenerating}
            className="w-full md:w-auto bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-xs cursor-pointer text-xs sm:text-sm font-semibold h-9 px-4 flex items-center justify-center gap-2"
          >
            <Sparkles className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
            {regenerating ? "Architecting Roadmap..." : "Regenerate AI Roadmap"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            {rateLimitInfo?.remaining !== undefined
              ? `${rateLimitInfo.remaining} regenerations left today`
              : "Rate limited to 2/day (20 in dev)"}
          </p>
        </div>
      </div>

      {/* Main-Project Application Showcase Hero */}
      {mainProject && (
        <div className="rounded-2xl border-2 border-violet-500/30 bg-violet-500/5 dark:bg-violet-500/10 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 w-full">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-violet-600 text-white text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 uppercase tracking-wider rounded-md">
                  Primary Main-Project
                </Badge>
                <span className="text-xs text-muted-foreground">{mainProject.goalAlignment}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                <Hammer className="h-5 w-5 text-violet-600 shrink-0" /> {mainProject.name}
              </h2>
              <p className="text-xs sm:text-sm text-foreground/80 leading-relaxed max-w-3xl">
                {mainProject.description}
              </p>
            </div>

            <Link href="/projects" className="shrink-0 self-start md:self-center">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold h-8.5 px-3.5 gap-1.5 shadow-xs">
                <FolderGit2 className="h-3.5 w-3.5" /> Open Main-Project Hub <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          {mainProject.stack && mainProject.stack.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5 border-t border-violet-500/20">
              <span className="text-xs font-bold text-foreground mr-1">Tech Stack:</span>
              {mainProject.stack.map((tech, idx) => (
                <Badge key={idx} variant="outline" className="text-xs font-medium px-2.5 py-0.5 bg-background/90 border shadow-xs rounded-md">
                  {tech}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/80 shadow-xs">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search topics, concepts, mental models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm rounded-xl"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 md:pb-0 flex-wrap">
          {(
            [
              { id: "all", label: "All Modules" },
              { id: "current", label: "In Progress / Next" },
              { id: "completed", label: "Mastered" },
              { id: "locked", label: "Upcoming" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-violet-600 text-white shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Week-by-Week Milestones List + Detail Inspector */}
      <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-5 sm:gap-6 items-start">
        {/* Left Column: Week-by-Week Milestone Timeline */}
        <div className="space-y-5 sm:space-y-6">
          {displayWeekGroups.map((group) => {
            const visibleNodesInWeek = group.nodes.filter((n) => filteredNodes.some((fn) => fn.id === n.id));
            if (visibleNodesInWeek.length === 0) return null;

            return (
              <div key={group.weekNumber} className="space-y-3">
                {/* Week Header */}
                <div className="flex items-center justify-between px-1 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center h-6 w-6 rounded-lg bg-violet-600/10 text-violet-600 dark:text-violet-400 font-bold text-xs">
                      W{group.weekNumber}
                    </span>
                    <div>
                      <h2 className="font-heading text-sm sm:text-base font-bold text-foreground">
                        Week {group.weekNumber}: {group.nodes[0]?.topic || group.nodes[0]?.title}
                      </h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">({group.totalHours}h estimated)</span>
                    <Badge variant="outline" className="text-[11px] px-2 py-0.5 font-medium rounded-md">
                      {group.doneCount}/{group.nodes.length} Completed
                    </Badge>
                  </div>
                </div>

                {/* Week Milestone Cards */}
                <div className="space-y-3">
                  {visibleNodesInWeek.map((node) => {
                    const isSelected = selected?.id === node.id;
                    const nodeTopic = node.topic || node.title;
                    const conceptsList = node.concepts && node.concepts.length > 0 ? node.concepts : node.relatedConcepts;

                    return (
                      <div
                        key={node.id}
                        onClick={() => {
                          setSelected(node);
                          setIsEditing(false);
                        }}
                        className={`rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                          isSelected
                            ? "border-violet-600 bg-violet-500/5 dark:bg-violet-500/10 shadow-xs ring-1.5 ring-violet-500/30"
                            : node.status === "completed"
                            ? "border-emerald-500/20 bg-card hover:bg-emerald-500/5"
                            : node.status === "current"
                            ? "border-violet-500/40 bg-card hover:bg-violet-500/5"
                            : "border-border/60 bg-card hover:bg-muted/40"
                        }`}
                      >
                        {/* Topic Header: Title, Icon, and Status Badge */}
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="shrink-0">
                                {node.status === "completed" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                                {node.status === "current" && (
                                  <div className="h-5 w-5 rounded-full border-2 border-violet-600 flex items-center justify-center">
                                    <div className="h-2 w-2 rounded-full bg-violet-600 animate-pulse" />
                                  </div>
                                )}
                                {node.status === "next" && <Circle className="h-5 w-5 text-violet-500" />}
                                {node.status === "locked" && <Lock className="h-4 w-4 text-muted-foreground" />}
                              </div>
                              <p className={`text-sm sm:text-base font-bold tracking-tight leading-snug ${isSelected ? "text-violet-600 dark:text-violet-400" : "text-foreground"}`}>
                                {nodeTopic}
                              </p>
                            </div>

                            <div className="shrink-0">
                              {node.status === "completed" ? (
                                <Badge className="bg-emerald-600 text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md">Mastered</Badge>
                              ) : node.status === "current" ? (
                                <Badge className="bg-violet-600 text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md">In Progress</Badge>
                              ) : node.status === "next" ? (
                                <Badge variant="secondary" className="text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-md">Up Next</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] sm:text-xs text-muted-foreground font-medium px-2 py-0.5 rounded-md">Upcoming</Badge>
                              )}
                            </div>
                          </div>

                          {/* Full-width responsive description */}
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed w-full pl-7.5">
                            {node.description}
                          </p>
                        </div>

                        {/* Concept-First Hierarchy: Learn -> Understand -> Practice -> Apply */}
                        <div className="space-y-2.5 pt-2.5 border-t border-border/50 text-xs sm:text-sm">
                          {/* 1. Learn Concepts */}
                          {conceptsList && conceptsList.length > 0 && (
                            <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-2">
                              <span className="font-bold text-foreground flex items-center gap-1.5 shrink-0 text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                <BookOpen className="h-3.5 w-3.5 text-blue-500" /> Learn Concepts:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {conceptsList.map((concept, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs font-medium px-2 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 rounded-md">
                                    {concept}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 2. Understand / Mental Model */}
                          {node.mentalModels && node.mentalModels.length > 0 && (
                            <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-2">
                              <span className="font-bold text-foreground flex items-center gap-1.5 shrink-0 text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                <BrainCircuit className="h-3.5 w-3.5 text-amber-500" /> Understand:
                              </span>
                              <p className="text-foreground/85 text-xs sm:text-sm leading-relaxed">
                                {node.mentalModels[0]}
                              </p>
                            </div>
                          )}

                          {/* 3. Apply to Main-Project */}
                          <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-2">
                            <span className="font-bold text-foreground flex items-center gap-1.5 shrink-0 text-xs uppercase tracking-wider text-violet-600 dark:text-violet-400">
                              <Hammer className="h-3.5 w-3.5 text-violet-500" /> Apply to Main-Project:
                            </span>
                            <p className="text-foreground/90 font-medium text-xs sm:text-sm leading-relaxed">
                              {node.featureCompleted || node.capstoneApplication?.[0] || node.projectWork?.[0]}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 text-xs text-muted-foreground border-t border-border/40 flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[11px] py-0.5 px-2 capitalize rounded-md">
                              {node.difficulty}
                            </Badge>
                            <Badge variant="secondary" className="text-[11px] py-0.5 px-2 capitalize rounded-md">
                              {node.mentorId} Mentor
                            </Badge>
                            {node.estimatedHours && (
                              <span className="flex items-center gap-1 font-medium text-[11px]">
                                <Clock className="h-3 w-3" /> {node.estimatedHours}h study
                              </span>
                            )}
                          </div>

                          <Link
                            href={`/resources?topic=${encodeURIComponent(node.topic || node.title)}&week=${node.week ?? 1}&concepts=${encodeURIComponent((node.concepts || node.relatedConcepts || []).join(","))}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs font-semibold rounded-lg gap-1 border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 cursor-pointer shadow-xs">
                              <BookOpen className="h-3 w-3" /> Learn from Resources
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Guest Locked Multi-Week Progression Teaser Card */}
          {isGuest && (
            <div className="rounded-2xl border-2 border-dashed border-violet-500/40 bg-gradient-to-b from-violet-500/10 via-card to-card p-6 sm:p-8 text-center space-y-4 shadow-lg relative overflow-hidden animate-in fade-in duration-300">
              <div className="h-12 w-12 rounded-2xl bg-violet-600/15 border border-violet-500/30 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="h-6 w-6" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="font-heading text-base sm:text-lg font-bold text-foreground flex items-center justify-center gap-2">
                  🔒 Continue Your Full Multi-Week Roadmap
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  You are exploring the 2-week guest sandbox. Create a free account to customize all 8–12 milestone weeks, unlock production capstone reviews, and save your progress to the cloud.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link href="/login" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-xs sm:text-sm h-10 px-5 shadow-xs">
                    <Sparkles className="h-4 w-4 mr-2" /> Create Free Account
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto rounded-xl text-xs sm:text-sm h-10 px-4">
                    Sign in with Google
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {filteredNodes.length === 0 && (
            <div className="rounded-2xl border border-dashed p-10 text-center space-y-2">
              <HelpCircle className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-bold text-foreground">No modules match your search</p>
              <p className="text-xs text-muted-foreground">Try clearing the search query or changing your status filter.</p>
              <Button size="sm" variant="outline" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }} className="rounded-xl text-xs mt-2 h-8 px-3">
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Detail Inspector & Editor */}
        <div className="space-y-3 lg:sticky lg:top-6">
          {selected ? (
            <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
              <CardHeader className="p-4 sm:p-5 border-b bg-muted/20 space-y-1.5">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md">
                        Week {selected.week ?? 1}
                      </span>
                      <Badge variant="outline" className="text-[11px] capitalize">
                        {selected.difficulty}
                      </Badge>
                      <Badge variant="secondary" className="text-[11px] capitalize">
                        {selected.mentorId} Mentor
                      </Badge>
                    </div>
                    <CardTitle className="text-base sm:text-lg font-bold tracking-tight">{selected.topic || selected.title}</CardTitle>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEditing(selected)}
                    className="h-7 text-xs font-medium gap-1 rounded-lg shrink-0 cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3" /> Edit
                  </Button>
                </div>
                <CardDescription className="text-xs sm:text-sm leading-relaxed">{selected.description}</CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
                {isEditing ? (
                  /* Edit Form */
                  <form onSubmit={saveNodeEdit} className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-foreground">Topic Title</label>
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="text-xs sm:text-sm h-8 rounded-lg mt-1"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-foreground">Description</label>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="text-xs sm:text-sm rounded-lg mt-1 min-h-[60px] leading-relaxed"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-foreground">30-Min Practice Drill</label>
                      <Textarea
                        value={editForm.practicalTask}
                        onChange={(e) => setEditForm({ ...editForm, practicalTask: e.target.value })}
                        className="text-xs sm:text-sm rounded-lg mt-1 min-h-[50px] leading-relaxed"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-xs font-bold text-foreground">Estimated Hours</label>
                        <Input
                          type="number"
                          min={1}
                          max={40}
                          value={editForm.estimatedHours}
                          onChange={(e) => setEditForm({ ...editForm, estimatedHours: Number(e.target.value) })}
                          className="text-xs sm:text-sm h-8 rounded-lg mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-foreground">Difficulty</label>
                        <select
                          value={editForm.difficulty}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              difficulty: e.target.value as "beginner" | "intermediate" | "advanced",
                            })
                          }
                          className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs sm:text-sm mt-1"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button type="submit" size="sm" disabled={savingEdit} className="h-8 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-lg flex-1">
                        <Check className="h-3 w-3 mr-1" /> {savingEdit ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-8 text-xs rounded-lg">
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  /* Display Concept-First Details */
                  <>
                    {/* 1. Learning Objectives */}
                    {selected.learningObjectives && selected.learningObjectives.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" /> Learning Objectives
                        </p>
                        <ul className="space-y-1.5 bg-card p-3 rounded-xl border border-border/80">
                          {selected.learningObjectives.map((obj, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-muted-foreground text-xs leading-relaxed">
                              <span className="text-blue-500 font-bold text-sm leading-none mt-0.5">•</span>
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 2. Mental Models & Architectural Trade-offs */}
                    {selected.mentalModels && selected.mentalModels.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <BrainCircuit className="h-3.5 w-3.5" /> Understand & Mental Models
                        </p>
                        <ul className="space-y-2 bg-amber-500/5 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                          {selected.mentalModels.map((mm, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-foreground/85 text-xs leading-relaxed">
                              <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <span>{mm}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 3. 30-Min Practice Drill */}
                    {selected.practicalTask && (
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                          <Target className="h-3 w-3 text-emerald-500" /> 30-Min Practice Drill
                        </p>
                        <p className="text-muted-foreground leading-relaxed bg-card p-3 rounded-xl border border-border/80 text-xs">
                          {selected.practicalTask}
                        </p>
                      </div>
                    )}

                    {/* 4. Apply to Main-Project */}
                    <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3.5 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                        <Hammer className="h-3.5 w-3.5" /> Apply to Main-Project: {selected.featureCompleted}
                      </p>
                      <ul className="space-y-1.5">
                        {(selected.capstoneApplication || selected.projectWork || []).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-foreground/90 font-medium leading-relaxed">
                            <span className="text-violet-600 font-bold">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Milestone State Actions */}
                    <div className="pt-3 border-t space-y-2">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Module Status
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selected.status !== "completed" ? (
                          <Button
                            onClick={() => updateStatus(selected.id, "completed")}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold h-8.5 cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Mastered
                          </Button>
                        ) : (
                          <Button
                            onClick={() => updateStatus(selected.id, "current")}
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs font-semibold h-8.5 text-amber-600 hover:text-amber-500 cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Mark In Progress
                          </Button>
                        )}

                        {selected.status !== "current" ? (
                          <Button
                            onClick={() => updateStatus(selected.id, "current")}
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs font-semibold h-8.5 cursor-pointer"
                          >
                            <PlayCircle className="h-3.5 w-3.5 mr-1 text-violet-600" /> Set Active
                          </Button>
                        ) : (
                          <Button
                            onClick={() => updateStatus(selected.id, "locked")}
                            size="sm"
                            variant="ghost"
                            className="rounded-xl text-xs font-semibold h-8.5 text-muted-foreground cursor-pointer"
                          >
                            <Lock className="h-3.5 w-3.5 mr-1" /> Reset to Upcoming
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <Link
                          href={`/resources?topic=${encodeURIComponent(selected.topic || selected.title)}&week=${selected.week ?? 1}&concepts=${encodeURIComponent((selected.concepts || selected.relatedConcepts || []).join(","))}`}
                          className="block"
                        >
                          <Button size="sm" className="w-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold h-8.5 rounded-xl gap-1.5 shadow-xs cursor-pointer">
                            <BookOpen className="h-3.5 w-3.5" /> Learn Resources
                          </Button>
                        </Link>

                        <Link href="/projects" className="block">
                          <Button variant="outline" size="sm" className="w-full text-xs font-semibold h-8.5 rounded-xl gap-1.5 cursor-pointer">
                            <FolderGit2 className="h-3.5 w-3.5" /> Project Tasks
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border border-dashed p-6 text-center text-xs text-muted-foreground">
              Select a module from the timeline to view learning objectives, mental models, and project tasks.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
