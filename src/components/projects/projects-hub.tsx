"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Hammer,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  MessageSquare,
  Check,
  Edit2,
  FolderGit2,
  Lock,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  ShieldCheck,
  Target,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import type { CapstoneProjectState, CapstoneTask, CapstoneWeekContext } from "@/lib/project-store";

export function ProjectsHub() {
  const [capstone, setCapstone] = useState<CapstoneProjectState | null>(null);
  const [roadmapTitle, setRoadmapTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active view week
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [showGuestLockedModal, setShowGuestLockedModal] = useState(false);

  // GitHub repo editing
  const [isEditingRepo, setIsEditingRepo] = useState(false);
  const [repoInput, setRepoInput] = useState("");
  const [savingRepo, setSavingRepo] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to load Main-Project");
      const data = await res.json();
      if (data.capstone) {
        setCapstone(data.capstone);
        setSelectedWeek(data.capstone.currentWeek || 1);
        setRepoInput(data.capstone.repoUrl || "");
      }
      if (data.roadmapTitle) setRoadmapTitle(data.roadmapTitle);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Main-Project");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    async function fetchInitial() {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data.capstone) {
            setCapstone(data.capstone);
            setSelectedWeek(data.capstone.currentWeek || 1);
            setRepoInput(data.capstone.repoUrl || "");
            if (data.roadmapTitle) setRoadmapTitle(data.roadmapTitle);
          }
        }
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : "Failed to load Main-Project");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchInitial();
    return () => {
      ignore = true;
    };
  }, []);

  async function syncFromRoadmap() {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to sync Main-Project");
      }
      const data = await res.json();
      if (data.capstone) {
        setCapstone(data.capstone);
        setSelectedWeek(data.capstone.currentWeek || 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function toggleTask(task: CapstoneTask) {
    if (!capstone) return;
    const newCompleted = !task.completed;

    // Optimistic UI update
    const updatedTasks = capstone.tasks.map((t) =>
      t.id === task.id ? { ...t, completed: newCompleted } : t
    );

    // Auto-unlock check
    const weekTasks = updatedTasks.filter((t) => t.week === task.week);
    const weekAllDone = weekTasks.length > 0 && weekTasks.every((t) => t.completed);
    const unlocked = [...capstone.unlockedWeeks];
    let nextCurrent = capstone.currentWeek;

    if (weekAllDone && !unlocked.includes(task.week + 1)) {
      unlocked.push(task.week + 1);
      unlocked.sort((a, b) => a - b);
      nextCurrent = task.week + 1;
    }

    setCapstone({
      ...capstone,
      tasks: updatedTasks,
      unlockedWeeks: unlocked,
      currentWeek: nextCurrent,
    });

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle-task",
          taskId: task.id,
          completed: newCompleted,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.capstone) setCapstone(data.capstone);
      }
    } catch (e) {
      console.error("[projects] toggle task failed:", e);
    }
  }

  async function saveRepo() {
    setSavingRepo(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-repo",
          repoUrl: repoInput.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.capstone) setCapstone(data.capstone);
        setIsEditingRepo(false);
      }
    } catch (e) {
      console.error("[projects] save repo failed:", e);
    } finally {
      setSavingRepo(false);
    }
  }

  // Calculate distinct weeks present in tasks
  const weekNumbers = useMemo(() => {
    if (!capstone || !capstone.tasks) return [];
    return Array.from(new Set(capstone.tasks.map((t) => t.week))).sort((a, b) => a - b);
  }, [capstone]);

  const activeWeekTasks = useMemo(() => {
    if (!capstone) return [];
    return capstone.tasks.filter((t) => t.week === selectedWeek);
  }, [capstone, selectedWeek]);

  const activeWeekContext = useMemo<CapstoneWeekContext | undefined>(() => {
    if (!capstone?.weekContexts) return undefined;
    return capstone.weekContexts.find((c) => c.week === selectedWeek);
  }, [capstone, selectedWeek]);

  const activeWeekDoneCount = activeWeekTasks.filter((t) => t.completed).length;
  const activeWeekTotal = activeWeekTasks.length;
  const activeWeekProgress = activeWeekTotal > 0 ? Math.round((activeWeekDoneCount / activeWeekTotal) * 100) : 0;

  // Overall Main-Project progress
  const totalTasksCount = capstone?.tasks?.length ?? 0;
  const totalTasksDone = capstone?.tasks?.filter((t) => t.completed).length ?? 0;
  const overallProgress = totalTasksCount > 0 ? Math.round((totalTasksDone / totalTasksCount) * 100) : 0;

  const currentTopic = activeWeekContext?.topic || capstone?.features?.[selectedWeek - 1] || `Week ${selectedWeek} Module`;
  const currentFeature = activeWeekContext?.featureCompleted || capstone?.features?.[selectedWeek - 1] || `Week ${selectedWeek} Feature`;

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
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 bg-muted/60 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !capstone) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/10 rounded-2xl p-2 sm:p-3">
        <CardContent className="p-5 sm:p-6 space-y-3">
          <p className="font-bold text-base text-amber-600 flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0" /> {error}
          </p>
          <div className="pt-1 flex flex-wrap gap-2.5">
            <Button onClick={load} variant="outline" size="sm" className="rounded-xl h-9 px-3.5 text-xs sm:text-sm font-medium">
              Retry
            </Button>
            <Link href="/roadmap">
              <Button size="sm" className="rounded-xl h-9 px-3.5 text-xs sm:text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs cursor-pointer">
                Go to Roadmap
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isGuest = Boolean(
    capstone?.userId && (
      capstone.userId === "guest-preview-user" ||
      capstone.userId.startsWith("guest") ||
      capstone.userId.includes("guest") ||
      capstone.userId.endsWith("@skillfarm.local")
    )
  );

  if (!capstone) return null;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Subtle Guest Top Banner */}
      {isGuest && (
        <div className="flex items-center justify-between gap-3 px-3.5 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-900 dark:text-violet-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
            <span className="font-medium">Create an account to save your projects and progress.</span>
          </div>
          <Link href="/login" className="shrink-0 font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1">
            Sign in <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 sm:gap-4 border-b border-border/70 pb-4">
        <div className="space-y-1.5 flex-1 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
              <Hammer className="h-5 w-5 text-primary shrink-0" /> Main-Project Application Hub
            </h1>
            <Badge variant="outline" className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20 font-semibold rounded-md">
              Portfolio Track
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground w-full max-w-3xl leading-relaxed">
            Apply roadmap concepts directly to build your production-grade portfolio project.
          </p>
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground pt-0.5 flex-wrap">
            <span className="font-semibold text-foreground">{totalTasksCount} Implementation Tasks</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ {totalTasksDone} Done ({overallProgress}%)</span>
            <span>•</span>
            <span className="text-primary font-semibold">Week {selectedWeek} Active</span>
          </div>
          <div className="pt-0.5 max-w-md">
            <Progress value={overallProgress} className="h-1.5 rounded-full" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
          <Button
            onClick={syncFromRoadmap}
            disabled={syncing}
            variant="outline"
            className="rounded-xl text-xs font-semibold h-8.5 px-3 gap-1.5 cursor-pointer border-border/80"
          >
            <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Roadmap"}
          </Button>
          <Link href="/roadmap">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold h-8.5 px-3.5 shadow-2xs cursor-pointer">
              View Roadmap
            </Button>
          </Link>
        </div>
      </div>

      {/* Main-Project Overview Hero Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div className="space-y-1 w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.2 uppercase tracking-wider rounded-md">
                Primary Project
              </Badge>
              <span className="text-xs text-muted-foreground">{capstone.goalAlignment}</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2 text-foreground">
              <FolderGit2 className="h-4.5 w-4.5 text-primary shrink-0" /> {capstone.name}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl line-clamp-2">
              {capstone.description}
            </p>
          </div>

          {/* GitHub Repo Link / Input */}
          <div className="shrink-0 self-start md:self-center w-full md:w-auto">
            {isEditingRepo ? (
              <div className="flex items-center gap-2 bg-background p-1.5 rounded-xl border border-border/80 shadow-2xs w-full md:w-auto">
                <Input
                  placeholder="https://github.com/username/repo"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  className="text-xs h-7.5 w-full md:w-56 rounded-lg"
                  autoFocus
                />
                <Button
                  size="sm"
                  disabled={savingRepo}
                  onClick={saveRepo}
                  className="h-7.5 px-2.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingRepo(false)}
                  className="h-7.5 px-2 text-xs rounded-lg"
                >
                  Cancel
                </Button>
              </div>
            ) : capstone.repoUrl ? (
              <div className="flex items-center gap-2 bg-background p-2 rounded-xl border border-border/80 shadow-2xs">
                <a
                  href={capstone.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <FolderGit2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{capstone.repoUrl.replace("https://github.com/", "")}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingRepo(true)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground rounded-md"
                  title="Edit Repo URL"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingRepo(true)}
                className="w-full md:w-auto rounded-xl text-xs font-semibold h-8 px-3.5 gap-1.5 bg-background hover:bg-muted cursor-pointer border-border/80"
              >
                <FolderGit2 className="h-3.5 w-3.5 text-primary" /> Link GitHub Repo
              </Button>
            )}
          </div>
        </div>

        {capstone.stack && capstone.stack.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-border/60">
            <span className="text-xs font-bold text-muted-foreground mr-1 uppercase tracking-wider">Tech Stack:</span>
            {capstone.stack.map((tech, idx) => (
              <Badge key={idx} variant="outline" className="text-xs font-medium px-2.5 py-0.5 bg-background border-border/80 shadow-2xs rounded-md">
                {tech}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Week Timeline Navigation Bar - Responsive Mobile Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1 flex-wrap gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Main-Project Development Timeline
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">Click any unlocked week to view learning context and tasks</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-2.5">
          {weekNumbers.map((w) => {
            const isGuestLocked = isGuest && w > 2;
            const isUnlocked = !isGuestLocked && capstone.unlockedWeeks.includes(w);
            const isSelected = selectedWeek === w;
            const wTasks = capstone.tasks.filter((t) => t.week === w);
            const wDone = wTasks.filter((t) => t.completed).length;
            const isWeekCompleted = !isGuestLocked && wTasks.length > 0 && wDone === wTasks.length;
            const wCtx = capstone.weekContexts?.find((c) => c.week === w);
            const wLabel = wCtx?.topic || capstone.features?.[w - 1] || `Week ${w}`;

            return (
              <button
                key={w}
                onClick={() => {
                  if (isGuestLocked) {
                    setShowGuestLockedModal(true);
                    return;
                  }
                  if (!isUnlocked) return;
                  setSelectedWeek(w);
                }}
                className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-1.5 min-h-[70px] sm:min-h-[74px] cursor-pointer ${
                  isSelected
                    ? "border-2 border-primary bg-primary text-primary-foreground shadow-2xs ring-2 ring-primary/30 font-bold"
                    : isWeekCompleted
                    ? "border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-950 dark:text-emerald-200"
                    : isGuestLocked
                    ? "border border-border/60 bg-muted/20 hover:bg-muted/30 text-muted-foreground"
                    : isUnlocked
                    ? "border-2 border-border/80 bg-card hover:bg-muted/60 text-foreground"
                    : "border border-border/40 bg-muted/20 opacity-60 cursor-not-allowed text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    Week {w}
                  </span>
                  {isWeekCompleted ? (
                    <CheckCircle2 className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isSelected ? "text-primary-foreground" : "text-emerald-500"}`} />
                  ) : isGuestLocked ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                      <Lock className="h-3 w-3" /> Locked
                    </span>
                  ) : !isUnlocked ? (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <span className={`text-[10px] sm:text-[11px] font-bold ${isSelected ? "text-primary-foreground" : "text-primary"}`}>
                      {wDone}/{wTasks.length}
                    </span>
                  )}
                </div>
                <p className={`text-xs font-semibold line-clamp-2 leading-snug ${isSelected ? "text-primary-foreground font-bold" : "text-foreground"}`}>
                  {wLabel}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Week: Concept Context + Implementation Task Board */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden">
        <CardHeader className="p-3.5 sm:p-4 border-b border-border/60 bg-muted/20 space-y-2.5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-2.5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center justify-center h-5.5 w-5.5 rounded-md bg-primary text-primary-foreground font-bold text-[10px] shadow-2xs">
                  W{selectedWeek}
                </span>
                <span className="text-xs font-bold text-primary">
                  {currentTopic}
                </span>
              </div>
              <CardTitle className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                Deliverable: <span className="text-primary">{currentFeature}</span>
              </CardTitle>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
              <div className="text-left md:text-right">
                <div className="text-xs font-bold text-foreground">
                  {activeWeekDoneCount} / {activeWeekTotal} Tasks
                </div>
                <div className="text-[10px] text-muted-foreground">{activeWeekProgress}% Complete</div>
              </div>
              <Link
                href={`/chat?mentor=${activeWeekContext?.mentorId || "backend"}&query=${encodeURIComponent(
                  `I am working on Week ${selectedWeek} of my Main-Project "${capstone.name}". The topic is "${currentTopic}" and deliverable is "${currentFeature}". Can you review my implementation plan and guide me on architectural best practices?`
                )}`}
              >
                <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold h-7.5 px-2.5 gap-1.5 cursor-pointer border-border/80">
                  <MessageSquare className="h-3 w-3 text-primary" /> Ask Mentor
                </Button>
              </Link>
            </div>
          </div>

          {/* Context Banner: Compact What You Learned & Mental Model Strip */}
          {activeWeekContext && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-0.5">
              {activeWeekContext.concepts && activeWeekContext.concepts.length > 0 && (
                <div className="rounded-xl border border-border/80 bg-muted/40 p-2.5 space-y-1 shadow-2xs">
                  <span className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                    <BookOpen className="h-3 w-3" /> Core Concepts
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {activeWeekContext.concepts.map((c, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px] font-medium px-1.5 py-0 bg-background border border-border/60 rounded-md">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {activeWeekContext.mentalModels && activeWeekContext.mentalModels.length > 0 && (
                <div className="rounded-xl border border-border/80 bg-muted/40 p-2.5 space-y-1 shadow-2xs">
                  <span className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                    <BrainCircuit className="h-3 w-3" /> Mental Model
                  </span>
                  <p className="text-foreground/85 text-[10px] leading-relaxed line-clamp-1">
                    {activeWeekContext.mentalModels[0]}
                  </p>
                </div>
              )}
            </div>
          )}

          <Progress value={activeWeekProgress} className="h-1.5 mt-0.5 rounded-full" />
        </CardHeader>

        <CardContent className="p-3.5 sm:p-4 pt-3 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-primary" /> Implementation Checklist
            </span>
            <span className="text-[10px] text-muted-foreground">Click task or checkmark to toggle</span>
          </div>

          {activeWeekTasks.length > 0 ? (
            <div className="space-y-2">
              {activeWeekTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                    task.completed
                      ? "border-emerald-500/30 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05] text-muted-foreground opacity-85"
                      : "border-2 border-l-4 border-l-primary border-border/80 bg-background hover:bg-primary/[0.02] text-foreground shadow-2xs"
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTask(task);
                    }}
                    className="shrink-0 rounded flex items-center justify-center p-0.5 focus:outline-hidden cursor-pointer"
                    aria-label={`Toggle task: ${task.title}`}
                  >
                    <div
                      className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-colors ${
                        task.completed
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-border bg-background hover:border-primary"
                      }`}
                    >
                      {task.completed && <Check className="h-3 w-3 text-white stroke-[3]" />}
                    </div>
                  </button>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTask(task);
                    }}
                    className="min-w-0 flex-1 cursor-pointer select-none"
                  >
                    <p
                      className={`text-xs sm:text-sm font-medium leading-snug ${
                        task.completed
                          ? "line-through text-muted-foreground"
                          : "text-foreground font-semibold"
                      }`}
                    >
                      {task.title}
                    </p>
                  </div>
                  {task.completed && (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold px-2 py-0.5 shrink-0 rounded-md">
                      Done
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
              No tasks listed for Week {selectedWeek}. Click &quot;Sync Roadmap&quot; to generate.
            </div>
          )}

          {/* Week Completion Feedback */}
          {activeWeekProgress === 100 && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                <span className="leading-relaxed">
                  <strong className="font-bold">Week {selectedWeek} Deliverable Complete!</strong> All tasks applied to Main-Project. Next week&apos;s module is now unlocked in your timeline.
                </span>
              </div>
              {selectedWeek < weekNumbers.length && (
                <Button
                  size="sm"
                  onClick={() => setSelectedWeek(selectedWeek + 1)}
                  className="h-8 px-3.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shrink-0"
                >
                  Proceed to Week {selectedWeek + 1} <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}
            </div>
          )}

          {/* Guest Locked Multi-Week Deliverables Teaser Card */}
          {isGuest && (
            <div className="mt-4 rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-b from-primary/10 via-card to-card p-5 sm:p-7 text-center space-y-3.5 shadow-md animate-in fade-in duration-300">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-inner">
                <Lock className="h-5 w-5" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="font-heading text-sm sm:text-base font-bold text-foreground">
                  🔒 Unlock Advanced Capstone Deliverables (Weeks 3+)
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Weeks 1–2 project tasks are unlocked for this demo session. Create a free account to unlock all advanced production deliverables, automated code reviews, and persistent repository tracking.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                <Link href="/login" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs h-9 px-4 shadow-2xs">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Create Free Account
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto rounded-xl text-xs h-9 px-3.5 border-border/80">
                    Sign in with Google
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guest Locked Deliverables Modal */}
      {showGuestLockedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-primary/30 bg-card shadow-2xl p-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-inner">
              <Lock className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-heading text-base font-bold text-foreground">
                Advanced Deliverable Locked
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Weeks 1–2 project deliverables are unlocked for this guest sandbox. Create a free account to unlock all remaining multi-week milestones, test suites, and cloud syncing.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <Link href="/login" className="w-full">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs h-9 shadow-2xs">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Sign in with Google
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGuestLockedModal(false)}
                className="rounded-xl text-xs h-8 text-muted-foreground hover:text-foreground"
              >
                Back to Week 1–2
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
