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
  AlertOctagon,
  ChevronRight,
} from "lucide-react";
import type { Roadmap, RoadmapNode } from "@/lib/roadmap-store";

export function RoadmapView() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<{ limit?: number; remaining?: number } | null>(null);
  const [selected, setSelected] = useState<RoadmapNode | null>(null);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenStep, setRegenStep] = useState<1 | 2>(1);

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

    let targetToSelectId = nodeId;

    // Optimistic local update
    const updatedNodes = roadmap.nodes.map((n, idx, arr) => {
      if (n.id === nodeId) return { ...n, status: newStatus };
      if (newStatus === "completed") {
        if (idx > 0 && arr[idx - 1].id === nodeId && (n.status === "locked" || n.status === "next")) {
          targetToSelectId = n.id;
          return { ...n, status: "current" as const };
        }
        if (idx > 1 && arr[idx - 2].id === nodeId && n.status === "locked") {
          return { ...n, status: "next" as const };
        }
      }
      return n;
    });

    const updatedRoadmap: Roadmap = {
      ...roadmap,
      nodes: updatedNodes,
      updatedAt: new Date(),
    };
    setRoadmap(updatedRoadmap);
    const newSelected = updatedNodes.find((n) => n.id === targetToSelectId) ?? updatedNodes.find((n) => n.id === nodeId) ?? selected;
    if (newSelected) setSelected(newSelected);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("skillfarm:roadmap-updated"));
    }

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
          const serverSelected = updated.nodes.find((n: RoadmapNode) => n.id === targetToSelectId) ?? updated.nodes.find((n: RoadmapNode) => n.id === nodeId) ?? newSelected;
          setSelected(serverSelected);
        }
      }
    } catch (e) {
      console.error("[roadmap] updateStatus failed:", e);
    }
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
            <Button onClick={load} variant="outline" size="sm" className="rounded-xl h-9 px-3.5 text-xs sm:text-sm font-medium border-border/80">
              Retry Loading
            </Button>
            <Link href="/dashboard">
              <Button size="sm" className="rounded-xl h-9 px-3.5 text-xs sm:text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs cursor-pointer">
                Go to Dashboard
              </Button>
            </Link>
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

      {/* Subtle Guest Top Banner */}
      {isGuest && (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-medium">Create a free account to save your complete learning roadmap.</span>
          </div>
          <Link href="/login" className="shrink-0 font-semibold text-primary hover:underline flex items-center gap-1">
            Sign in <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 sm:gap-5 border-b pb-5">
        <div className="space-y-2.5 flex-1 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5 text-foreground">
              <Sparkles className="h-6 w-6 text-primary shrink-0" /> {roadmap.title}
            </h1>
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20 font-semibold rounded-md">
              Concept-First Curriculum • {weekGroups.length} Weeks
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground w-full max-w-3xl leading-relaxed">{roadmap.description}</p>
          <div className="flex items-center gap-2.5 sm:gap-3.5 text-xs text-muted-foreground pt-0.5 flex-wrap">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <Layers className="h-3.5 w-3.5 text-primary" /> {totalCount} Modules
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
            onClick={() => {
              if (roadmap && roadmap.nodes.length > 0) {
                setRegenStep(1);
                setShowRegenModal(true);
              } else {
                regenerate();
              }
            }}
            disabled={regenerating}
            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-2xs cursor-pointer text-xs sm:text-sm font-semibold h-9 px-4 flex items-center justify-center gap-2"
          >
            <Sparkles className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
            {regenerating ? "Architecting Roadmap..." : "Regenerate AI Roadmap"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            {rateLimitInfo?.remaining !== undefined
              ? `${rateLimitInfo.remaining} generations left today`
              : "Daily generation quota applies"}
          </p>
        </div>
      </div>

      {/* Main-Project Application Showcase Hero */}
      {mainProject && (
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.2 uppercase tracking-wider rounded-md">
                  Portfolio Capstone
                </Badge>
                <span className="text-xs text-muted-foreground">{mainProject.goalAlignment}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2 text-foreground">
                <Hammer className="h-4.5 w-4.5 text-primary shrink-0" /> {mainProject.name}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl line-clamp-2">
                {mainProject.description}
              </p>
            </div>

            <Link href="/projects" className="shrink-0 self-start md:self-center">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-semibold h-8.5 px-3.5 gap-1.5 shadow-2xs cursor-pointer">
                <FolderGit2 className="h-3.5 w-3.5" /> Project Hub <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>

          {mainProject.stack && mainProject.stack.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-border/60">
              <span className="text-[11px] font-bold text-muted-foreground mr-1 uppercase tracking-wider">Stack:</span>
              {mainProject.stack.map((tech, idx) => (
                <Badge key={idx} variant="outline" className="text-[11px] font-medium px-2 py-0 bg-background/90 border-border/80 shadow-2xs rounded-md">
                  {tech}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-2.5 sm:p-3 rounded-2xl border border-border/80 shadow-2xs">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search topics, concepts, mental models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8.5 text-xs sm:text-sm rounded-xl bg-background"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 flex-nowrap md:flex-wrap">
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
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent hover:border-border/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Week-by-Week Milestones List + Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-4 sm:gap-5 items-start w-full min-w-0">
        {/* Left Column: Week-by-Week Milestone Timeline */}
        <div className="space-y-4 sm:space-y-5 w-full min-w-0">
          {displayWeekGroups.map((group) => {
            const visibleNodesInWeek = group.nodes.filter((n) => filteredNodes.some((fn) => fn.id === n.id));
            if (visibleNodesInWeek.length === 0) return null;

            return (
              <div key={group.weekNumber} className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4.5 space-y-3 shadow-2xs w-full min-w-0 overflow-hidden">
                {/* Week Header */}
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5 flex-wrap gap-2 w-full min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="flex items-center justify-center h-5.5 w-5.5 sm:h-6 sm:w-6 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] sm:text-xs shrink-0 shadow-2xs">
                      W{group.weekNumber}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-heading text-xs sm:text-sm md:text-base font-bold text-foreground truncate">
                        Week {group.weekNumber}: {group.nodes[0]?.topic || group.nodes[0]?.title}
                      </h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:inline">({group.totalHours}h estimated)</span>
                    <Badge variant="outline" className="text-[10px] sm:text-[11px] px-2 py-0.5 font-semibold bg-background border-border/70 rounded-md">
                      {group.doneCount}/{group.nodes.length} Done
                    </Badge>
                  </div>
                </div>

                {/* Week Milestone Cards */}
                <div className="space-y-2.5 w-full min-w-0">
                  {visibleNodesInWeek.map((node) => {
                    const isSelected = selected?.id === node.id;
                    const nodeTopic = node.topic || node.title;
                    const conceptsList = node.concepts && node.concepts.length > 0 ? node.concepts : node.relatedConcepts;
                    const visibleConcepts = conceptsList?.slice(0, 3) ?? [];
                    const remainingConceptsCount = (conceptsList?.length ?? 0) - visibleConcepts.length;
                    const capstoneFeature = node.featureCompleted || node.capstoneApplication?.[0] || node.projectWork?.[0];

                    return (
                      <div
                        key={node.id}
                        onClick={() => {
                          setSelected(node);
                          setIsEditing(false);
                        }}
                        className={`rounded-xl border p-3 sm:p-3.5 transition-all cursor-pointer flex flex-col justify-between gap-2.5 w-full min-w-0 overflow-hidden ${
                          isSelected
                            ? "border-2 border-primary bg-primary/[0.08] shadow-xs ring-2 ring-primary/30"
                            : node.status === "current"
                            ? "border-2 border-l-4 border-l-primary border-primary/50 bg-primary/[0.05] shadow-2xs"
                            : node.status === "completed"
                            ? "border-emerald-500/30 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05] hover:bg-emerald-500/[0.08] opacity-90"
                            : node.status === "next"
                            ? "border border-dashed border-primary/40 bg-card hover:bg-primary/[0.03]"
                            : "border border-border/60 bg-muted/20 hover:bg-muted/40 opacity-75"
                        }`}
                      >
                        {/* Topic Header: Title, Icon, and High-Contrast Status Badge */}
                        <div className="space-y-1 w-full min-w-0">
                          <div className="flex items-start justify-between gap-2 w-full min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                              <div className="shrink-0 mt-0.5">
                                {node.status === "completed" && <CheckCircle2 className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-emerald-500" />}
                                {node.status === "current" && (
                                  <div className="h-4 w-4 sm:h-4.5 sm:w-4.5 rounded-full border-2 border-primary flex items-center justify-center">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                  </div>
                                )}
                                {node.status === "next" && <Circle className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-primary" />}
                                {node.status === "locked" && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                              </div>
                              <p className={`text-xs sm:text-sm font-bold tracking-tight leading-snug truncate ${
                                node.status === "current" || isSelected ? "text-primary" : "text-foreground"
                              }`}>
                                {nodeTopic}
                              </p>
                            </div>

                            <div className="shrink-0">
                              {node.status === "completed" ? (
                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md">
                                  ✓ Mastered
                                </Badge>
                              ) : node.status === "current" ? (
                                <Badge className="bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md shadow-2xs">
                                  ⚡ Active
                                </Badge>
                              ) : node.status === "next" ? (
                                <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-md">
                                  Up Next
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] sm:text-xs text-muted-foreground font-medium px-2 py-0.5 rounded-md">
                                  Upcoming
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Concise Description */}
                          <p className="text-xs text-muted-foreground leading-relaxed pl-0 sm:pl-6 line-clamp-2">
                            {node.description}
                          </p>
                        </div>

                        {/* Streamlined Concept Chips & Project Link */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 pl-0 sm:pl-6 flex-wrap w-full min-w-0">
                          {visibleConcepts.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Concepts:</span>
                              {visibleConcepts.map((concept, idx) => (
                                <Badge key={idx} variant="secondary" className="text-[10px] font-medium px-1.5 py-0 bg-muted/60 text-foreground border border-border/50 rounded-md">
                                  {concept}
                                </Badge>
                              ))}
                              {remainingConceptsCount > 0 && (
                                <span className="text-[10px] text-muted-foreground font-medium">+{remainingConceptsCount}</span>
                              )}
                            </div>
                          )}

                          {capstoneFeature && (
                            <div className="flex items-center gap-1 text-[11px] text-primary font-medium truncate max-w-full sm:max-w-xs">
                              <Hammer className="h-3 w-3 shrink-0" />
                              <span className="truncate">{capstoneFeature}</span>
                            </div>
                          )}
                        </div>

                        {/* Meta Row: Badges & Quick Action */}
                        <div className="flex items-center justify-between pt-1.5 text-xs text-muted-foreground border-t border-border/30 flex-wrap gap-1.5 pl-0 sm:pl-6 w-full min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 capitalize rounded-md">
                              {node.difficulty}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 capitalize rounded-md">
                              {node.mentorId}
                            </Badge>
                            {node.estimatedHours && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                <Clock className="h-2.5 w-2.5" /> ~{node.estimatedHours}h
                              </span>
                            )}
                          </div>

                          <span className="text-[11px] text-primary font-semibold group-hover:underline flex items-center gap-0.5">
                            Inspect <ChevronRight className="h-3 w-3" />
                          </span>
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
            <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-to-b from-primary/10 via-card to-card p-6 sm:p-8 text-center space-y-4 shadow-2xs relative overflow-hidden animate-in fade-in duration-300">
              <div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center mx-auto shadow-inner">
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
                  <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs sm:text-sm h-10 px-5 shadow-2xs">
                    <Sparkles className="h-4 w-4 mr-2" /> Create Free Account
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto rounded-xl text-xs sm:text-sm h-10 px-4 border-border/80">
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
              <Button size="sm" variant="outline" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }} className="rounded-xl text-xs mt-2 h-8 px-3 border-border/80">
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Detail Inspector & Editor */}
        <div className="space-y-3 lg:sticky lg:top-6">
          {selected ? (
            <Card className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden">
              <CardHeader className="p-3.5 sm:p-4 border-b border-border/60 bg-muted/20 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.2 rounded-md">
                        Week {selected.week ?? 1}
                      </span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 capitalize">
                        {selected.difficulty}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 capitalize">
                        {selected.mentorId}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm sm:text-base font-bold tracking-tight">{selected.topic || selected.title}</CardTitle>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEditing(selected)}
                    className="h-6.5 text-[11px] font-medium gap-1 rounded-lg shrink-0 cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3" /> Edit
                  </Button>
                </div>
                <CardDescription className="text-xs leading-relaxed line-clamp-2">{selected.description}</CardDescription>
              </CardHeader>

              <CardContent className="p-3.5 sm:p-4 space-y-3 text-xs">
                {isEditing ? (
                  /* Edit Form */
                  <form onSubmit={saveNodeEdit} className="space-y-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-foreground">Topic Title</label>
                      <Input
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="text-xs h-7.5 rounded-lg mt-0.5"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-foreground">Description</label>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="text-xs rounded-lg mt-0.5 min-h-[50px] leading-relaxed"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-foreground">30-Min Practice Drill</label>
                      <Textarea
                        value={editForm.practicalTask}
                        onChange={(e) => setEditForm({ ...editForm, practicalTask: e.target.value })}
                        className="text-xs rounded-lg mt-0.5 min-h-[40px] leading-relaxed"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-foreground">Est. Hours</label>
                        <Input
                          type="number"
                          min={1}
                          max={40}
                          value={editForm.estimatedHours}
                          onChange={(e) => setEditForm({ ...editForm, estimatedHours: Number(e.target.value) })}
                          className="text-xs h-7.5 rounded-lg mt-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-foreground">Difficulty</label>
                        <select
                          value={editForm.difficulty}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              difficulty: e.target.value as "beginner" | "intermediate" | "advanced",
                            })
                          }
                          className="w-full h-7.5 rounded-lg border border-input bg-background px-2 text-xs mt-0.5"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button type="submit" size="sm" disabled={savingEdit} className="h-7.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg flex-1 shadow-2xs">
                        <Check className="h-3 w-3 mr-1" /> {savingEdit ? "Saving..." : "Save"}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7.5 text-xs rounded-lg">
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  /* Display Concept-First Unified Sub-Cards */
                  <>
                    {/* Sub-Card 1: Core Learning Objectives & Mental Models */}
                    <div className="rounded-xl border-2 border-border/80 bg-muted/30 p-3 space-y-2 shadow-2xs">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                        <BookOpen className="h-3 w-3 text-primary" /> Core Concepts & Objectives
                      </p>
                      
                      {selected.learningObjectives && selected.learningObjectives.length > 0 && (
                        <ul className="space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                          {selected.learningObjectives.map((obj, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-primary font-bold leading-none mt-0.5">•</span>
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {selected.mentalModels && selected.mentalModels.length > 0 && (
                        <div className="flex items-start gap-1.5 bg-amber-500/10 p-2 rounded-lg border border-amber-500/30 text-foreground/90 text-[11px] leading-relaxed">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span>{selected.mentalModels[0]}</span>
                        </div>
                      )}
                    </div>

                    {/* Sub-Card 2: Practical Drill & Main-Project Application */}
                    <div className="rounded-xl border-2 border-border/80 bg-muted/30 p-3 space-y-2 shadow-2xs">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                        <Hammer className="h-3 w-3 text-primary" /> Apply to Main-Project: {selected.featureCompleted}
                      </p>

                      {selected.practicalTask && (
                        <div className="flex items-start gap-1.5 text-muted-foreground text-[11px] bg-background p-2 rounded-lg border border-border/70">
                          <Target className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span><strong className="text-foreground">Drill:</strong> {selected.practicalTask}</span>
                        </div>
                      )}

                      <ul className="space-y-1">
                        {(selected.capstoneApplication || selected.projectWork || []).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-[11px] text-foreground/90 font-medium leading-relaxed">
                            <span className="text-primary font-bold">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Milestone Actions */}
                    <div className="pt-2 border-t border-border/60 space-y-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        {selected.status !== "completed" ? (
                          <Button
                            onClick={() => updateStatus(selected.id, "completed")}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold h-7.5 cursor-pointer shadow-2xs"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Mastered
                          </Button>
                        ) : (
                          <Button
                            onClick={() => updateStatus(selected.id, "current")}
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs font-semibold h-7.5 text-amber-600 hover:text-amber-500 cursor-pointer"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" /> In Progress
                          </Button>
                        )}

                        {selected.status !== "current" ? (
                          <Button
                            onClick={() => updateStatus(selected.id, "current")}
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs font-semibold h-7.5 cursor-pointer text-primary border-primary/30"
                          >
                            <PlayCircle className="h-3 w-3 mr-1 text-primary" /> Set Active
                          </Button>
                        ) : (
                          <Button
                            onClick={() => updateStatus(selected.id, "locked")}
                            size="sm"
                            variant="ghost"
                            className="rounded-xl text-xs font-semibold h-7.5 text-muted-foreground cursor-pointer"
                          >
                            <Lock className="h-3 w-3 mr-1" /> Upcoming
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        <Link
                          href={`/resources?topic=${encodeURIComponent(selected.topic || selected.title)}&week=${selected.week ?? 1}&concepts=${encodeURIComponent((selected.concepts || selected.relatedConcepts || []).join(","))}`}
                          className="block"
                        >
                          <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-7.5 rounded-xl gap-1 shadow-2xs cursor-pointer">
                            <BookOpen className="h-3 w-3" /> Resources
                          </Button>
                        </Link>

                        <Link href="/projects" className="block">
                          <Button variant="outline" size="sm" className="w-full text-xs font-semibold h-7.5 rounded-xl gap-1 cursor-pointer border-border/80">
                            <FolderGit2 className="h-3 w-3" /> Tasks
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

      {/* 2-Step Roadmap Regeneration Confirmation Modal */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-card p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            {regenStep === 1 ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-heading text-base font-bold text-foreground">
                      Regenerate Engineering Roadmap?
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You are about to regenerate your AI roadmap. This will recreate all modules and milestones according to your latest profile.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-1.5 text-xs text-amber-950 dark:text-amber-200">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    Impact of this action:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] pl-1">
                    <li>Current node completion statuses ({completedCount}/{totalCount} milestones) will be reset</li>
                    <li>Replaces active topic nodes, tasks, and project linkages</li>
                    <li>Consumes 1 daily roadmap generation credit</li>
                  </ul>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRegenModal(false)}
                    className="text-xs rounded-xl font-medium cursor-pointer"
                  >
                    Keep Current Roadmap
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setRegenStep(2)}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl px-4 gap-1.5 shadow-xs cursor-pointer"
                  >
                    Next Step <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                    <AlertOctagon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-heading text-base font-bold text-foreground">
                      Final Confirmation: Overwrite Roadmap?
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Please confirm that you want to wipe your current progress and generate a fresh engineering roadmap.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-900 dark:text-red-200">
                  <p className="font-semibold text-[11px] leading-relaxed">
                    ⚠️ This action is permanent and cannot be undone.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRegenStep(1)}
                    className="text-xs rounded-xl font-medium cursor-pointer"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setShowRegenModal(false);
                      regenerate();
                    }}
                    className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl px-4 gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Yes, Overwrite & Regenerate
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
