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
  Lightbulb,
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
    let unlocked = [...capstone.unlockedWeeks];
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
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-muted animate-pulse rounded-lg" />
            <div className="h-4 w-96 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-9 w-32 bg-muted animate-pulse rounded-xl" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted/60 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !capstone) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/10 rounded-2xl">
        <CardContent className="p-6">
          <p className="font-semibold text-amber-600 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> {error}
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={load} variant="outline" size="sm" className="rounded-xl">
              Retry
            </Button>
            <Button onClick={() => (window.location.href = "/roadmap")} size="sm" className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white">
              Go to Roadmap
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!capstone) return null;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Hammer className="h-6 w-6 text-violet-600 shrink-0" /> Main-Project Application Hub
            </h1>
            <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20">
              One Unified Portfolio Project
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Apply the concepts and mental models learned in your roadmap directly to build your single, production-grade Main-Project.
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 flex-wrap">
            <span className="font-medium text-foreground">{totalTasksCount} Total Implementation Tasks</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ {totalTasksDone} Completed ({overallProgress}%)</span>
            <span>•</span>
            <span className="text-violet-600 dark:text-violet-400 font-medium">⚡ Week {selectedWeek} Active</span>
          </div>
          <div className="pt-2 max-w-md">
            <Progress value={overallProgress} className="h-2" />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={syncFromRoadmap}
            disabled={syncing}
            variant="outline"
            className="rounded-xl text-xs h-9 gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync with Roadmap"}
          </Button>
          <Link href="/roadmap">
            <Button className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs h-9 shadow-sm cursor-pointer">
              View Learning Roadmap
            </Button>
          </Link>
        </div>
      </div>

      {/* Main-Project Overview Hero Card */}
      <Card className="rounded-2xl border-2 border-violet-500/30 bg-violet-500/5 dark:bg-violet-500/10 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-6 pb-3 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-violet-600 text-white text-[10px] uppercase tracking-wider">
                  Primary Main-Project
                </Badge>
                <span className="text-xs text-muted-foreground">{capstone.goalAlignment}</span>
              </div>
              <CardTitle className="text-lg sm:text-xl font-bold mt-1 flex items-center gap-2">
                <FolderGit2 className="h-5 w-5 text-violet-600 shrink-0" /> {capstone.name}
              </CardTitle>
              <CardDescription className="text-xs text-foreground/80 mt-1 leading-relaxed max-w-3xl">
                {capstone.description}
              </CardDescription>
            </div>

            {/* GitHub Repo Link / Input */}
            <div className="shrink-0 self-start sm:self-center">
              {isEditingRepo ? (
                <div className="flex items-center gap-1.5 bg-background p-1.5 rounded-xl border">
                  <Input
                    placeholder="https://github.com/username/repo"
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    className="text-xs h-7 w-60 rounded-lg"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    disabled={savingRepo}
                    onClick={saveRepo}
                    className="h-7 px-2.5 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-lg"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditingRepo(false)}
                    className="h-7 px-2 text-xs rounded-lg"
                  >
                    Cancel
                  </Button>
                </div>
              ) : capstone.repoUrl ? (
                <div className="flex items-center gap-2 bg-background/80 p-2 rounded-xl border">
                  <a
                    href={capstone.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    <FolderGit2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{capstone.repoUrl.replace("https://github.com/", "")}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingRepo(true)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
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
                  className="rounded-xl text-xs h-8 gap-1.5 bg-background hover:bg-muted cursor-pointer"
                >
                  <FolderGit2 className="h-3.5 w-3.5 text-violet-600" /> Link GitHub Repo
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
          {capstone.stack && capstone.stack.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-foreground mr-1">Tech Stack:</span>
              {capstone.stack.map((tech, idx) => (
                <Badge key={idx} variant="outline" className="text-[10px] bg-background/80 py-0.5 px-2">
                  {tech}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Week Timeline Navigation Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Main-Project Development Timeline
          </span>
          <span className="text-xs text-muted-foreground">Click any unlocked week to view learning context and tasks</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {weekNumbers.map((w) => {
            const isUnlocked = capstone.unlockedWeeks.includes(w);
            const isSelected = selectedWeek === w;
            const wTasks = capstone.tasks.filter((t) => t.week === w);
            const wDone = wTasks.filter((t) => t.completed).length;
            const isWeekCompleted = wTasks.length > 0 && wDone === wTasks.length;
            const wCtx = capstone.weekContexts?.find((c) => c.week === w);
            const wLabel = wCtx?.topic || capstone.features?.[w - 1] || `Week ${w}`;

            return (
              <button
                key={w}
                disabled={!isUnlocked}
                onClick={() => setSelectedWeek(w)}
                className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "border-violet-600 bg-violet-600 text-white shadow-sm ring-2 ring-violet-500/20"
                    : isWeekCompleted
                    ? "border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-foreground"
                    : isUnlocked
                    ? "border-border/80 bg-card hover:bg-muted/60 text-foreground"
                    : "border-border/40 bg-muted/20 opacity-60 cursor-not-allowed text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? "text-violet-200" : "text-muted-foreground"}`}>
                    Week {w}
                  </span>
                  {isWeekCompleted ? (
                    <CheckCircle2 className={`h-4 w-4 ${isSelected ? "text-white" : "text-emerald-500"}`} />
                  ) : !isUnlocked ? (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <span className={`text-[10px] font-semibold ${isSelected ? "text-violet-100" : "text-violet-600"}`}>
                      {wDone}/{wTasks.length}
                    </span>
                  )}
                </div>
                <p className={`text-xs font-semibold line-clamp-1 ${isSelected ? "text-white" : "text-foreground"}`}>
                  {wLabel}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Week: Concept Context + Implementation Task Board */}
      <Card className="rounded-2xl border border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-6 border-b bg-muted/20 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center justify-center h-6 w-6 rounded-lg bg-violet-600 text-white font-bold text-xs">
                  W{selectedWeek}
                </span>
                <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                  Topic: {currentTopic}
                </span>
              </div>
              <CardTitle className="text-lg font-bold mt-1.5">
                Week {selectedWeek} — Apply Learning to Main-Project
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Feature Deliverable: <strong className="text-foreground">{currentFeature}</strong>
              </CardDescription>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
              <div className="text-right">
                <div className="text-xs font-semibold text-foreground">
                  {activeWeekDoneCount} of {activeWeekTotal} Tasks Done
                </div>
                <div className="text-[10px] text-muted-foreground">{activeWeekProgress}% Complete</div>
              </div>
              <Link
                href={`/chat?mentor=${activeWeekContext?.mentorId || "backend"}&query=${encodeURIComponent(
                  `I am working on Week ${selectedWeek} of my Main-Project "${capstone.name}". The topic is "${currentTopic}" and deliverable is "${currentFeature}". Can you review my implementation plan and guide me on architectural best practices?`
                )}`}
              >
                <Button variant="outline" size="sm" className="rounded-xl text-xs h-8 gap-1.5 cursor-pointer">
                  <MessageSquare className="h-3.5 w-3.5 text-violet-600" /> Ask Mentor
                </Button>
              </Link>
            </div>
          </div>

          {/* Context Banner: What You Learned (Concepts & Mental Models) */}
          {activeWeekContext && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {activeWeekContext.concepts && activeWeekContext.concepts.length > 0 && (
                <div className="rounded-xl border bg-background/60 p-3 space-y-1">
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <BookOpen className="h-3.5 w-3.5" /> What You Learned
                  </span>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {activeWeekContext.concepts.map((c, idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px] py-0 px-1.5">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {activeWeekContext.mentalModels && activeWeekContext.mentalModels.length > 0 && (
                <div className="rounded-xl border bg-background/60 p-3 space-y-1">
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <BrainCircuit className="h-3.5 w-3.5" /> Mental Model to Apply
                  </span>
                  <p className="text-muted-foreground text-[11px] leading-snug line-clamp-2 pt-0.5">
                    {activeWeekContext.mentalModels[0]}
                  </p>
                </div>
              )}
            </div>
          )}

          <Progress value={activeWeekProgress} className="h-2 mt-2" />
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-violet-600" /> Implementation Checklist
            </span>
            <span className="text-xs text-muted-foreground">Click task or checkmark to update progress</span>
          </div>

          {activeWeekTasks.length > 0 ? (
            <div className="space-y-2.5">
              {activeWeekTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3.5 ${
                    task.completed
                      ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 text-muted-foreground"
                      : "border-border/80 bg-card hover:bg-muted/40 text-foreground"
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTask(task);
                    }}
                    className="mt-0.5 shrink-0 rounded flex items-center justify-center p-0.5 focus:outline-hidden cursor-pointer"
                    aria-label={`Toggle task: ${task.title}`}
                  >
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                        task.completed
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-border bg-background hover:border-violet-500"
                      }`}
                    >
                      {task.completed && <Check className="h-3 w-3 text-white" />}
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
                      className={`text-xs sm:text-sm font-medium leading-tight ${
                        task.completed
                          ? "line-through text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </p>
                  </div>
                  {task.completed && (
                    <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5 shrink-0">
                      Done
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground">
              No tasks listed for Week {selectedWeek}. Click &quot;Sync with Roadmap&quot; to generate.
            </div>
          )}

          {/* Week Completion Feedback */}
          {activeWeekProgress === 100 && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>
                  <strong>Week {selectedWeek} Deliverable Complete!</strong> All tasks applied to Main-Project. Next week's module is now unlocked in your timeline.
                </span>
              </div>
              {selectedWeek < weekNumbers.length && (
                <Button
                  size="sm"
                  onClick={() => setSelectedWeek(selectedWeek + 1)}
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shrink-0 ml-2"
                >
                  Proceed to Week {selectedWeek + 1} <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
