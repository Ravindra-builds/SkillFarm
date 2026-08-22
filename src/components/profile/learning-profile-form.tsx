"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Sparkles,
  Pencil,
  CheckCircle2,
  Target,
  Clock,
  Brain,
  BookOpen,
  Code2,
  Plus,
  X,
  Save,
  TrendingUp,
  Check,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { LearningProfileInput } from "@/lib/learning-profile";
import { ResumeUploader } from "@/components/resume/resume-uploader";

type Props = {
  initial?: Partial<LearningProfileInput>;
  action: (
    data: LearningProfileInput,
    regenerateRoadmap?: boolean
  ) => Promise<{ ok: boolean; isMock: boolean; error?: string }>;
  userName?: string | null;
};

const LEVELS: Array<{
  value: LearningProfileInput["currentLevel"];
  label: string;
  desc: string;
  badgeColor: string;
}> = [
  {
    value: "beginner",
    label: "Beginner",
    desc: "Learning core fundamentals & basic syntax",
    badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    desc: "Built full projects & understand system flow",
    badgeColor: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  },
  {
    value: "advanced",
    label: "Advanced",
    desc: "Production experience & system architecture",
    badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
];

const STYLES: Array<{ value: LearningProfileInput["learningStyle"]; label: string; desc: string }> = [
  { value: "hands-on", label: "Hands-on", desc: "Build projects first, learn theory as needed" },
  { value: "visual", label: "Visual", desc: "Diagrams, flowcharts, and architecture maps" },
  { value: "reading", label: "Reading", desc: "In-depth documentation and engineering RFCs" },
  { value: "mixed", label: "Balanced", desc: "Combination of projects, docs, and mentorship" },
];

const FORMATS: Array<{ value: LearningProfileInput["format"]; label: string }> = [
  { value: "projects", label: "Real-world Projects" },
  { value: "docs", label: "Official Docs & RFCs" },
  { value: "videos", label: "Interactive Walkthroughs" },
  { value: "mixed", label: "Comprehensive Mix" },
];

const GOAL_PRESETS = [
  "Become a production-ready backend engineer building scalable SaaS",
  "Master full-stack Next.js, AI integration, and TypeScript architecture",
  "Transition into AI Engineering with LLMs, RAG pipelines, and evals",
  "Learn DevOps, Docker multi-stage builds, CI/CD, and Cloud deployment",
];

export function LearningProfileForm({ initial, action, userName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Check if profile is already configured with real content
  const hasExistingProfile = Boolean(
    initial?.goal &&
    initial?.knownSkills &&
    initial.knownSkills.length > 0
  );

  const [isEditing, setIsEditing] = useState(!hasExistingProfile);
  const [showResumeUploader, setShowResumeUploader] = useState(false);
  const uploaderRef = useRef<HTMLDivElement>(null);

  // Form State
  const [goal, setGoal] = useState(initial?.goal ?? "Become a production-ready software engineer building modern web applications");
  const [level, setLevel] = useState<LearningProfileInput["currentLevel"]>(initial?.currentLevel ?? "intermediate");
  const [skills, setSkills] = useState<string[]>(initial?.knownSkills ?? ["JavaScript", "TypeScript", "React"]);
  const [skillInput, setSkillInput] = useState("");
  const [weeklyHours, setWeeklyHours] = useState(initial?.weeklyHours ?? 10);
  const [style, setStyle] = useState<LearningProfileInput["learningStyle"]>(initial?.learningStyle ?? "mixed");
  const [format, setFormat] = useState<LearningProfileInput["format"]>(initial?.format ?? "mixed");
  const [msg, setMsg] = useState<{ type: "success" | "error" | "mock"; text: string } | null>(null);

  // 2-Step Roadmap Regeneration Confirmation Modal State
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenStep, setRegenStep] = useState<1 | 2>(1);
  const [pendingPayload, setPendingPayload] = useState<LearningProfileInput | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  function toggleResumeUploader() {
    const next = !showResumeUploader;
    setShowResumeUploader(next);
    if (next) {
      setTimeout(() => {
        uploaderRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    }
  }

  function addSkill() {
    const s = skillInput.trim();
    if (!s || skills.some((k) => k.toLowerCase() === s.toLowerCase()) || skills.length >= 20) return;
    setSkills([...skills, s]);
    setSkillInput("");
  }

  function removeSkill(s: string) {
    setSkills(skills.filter((x) => x !== s));
  }

  function handleCancelEdit() {
    if (initial) {
      setGoal(initial.goal ?? "");
      setLevel(initial.currentLevel ?? "intermediate");
      setSkills(initial.knownSkills ?? []);
      setWeeklyHours(initial.weeklyHours ?? 10);
      setStyle(initial.learningStyle ?? "mixed");
      setFormat(initial.format ?? "mixed");
    }
    setIsEditing(false);
    setShowResumeUploader(false);
    setShowRegenModal(false);
    setMsg(null);
  }

  function handleResumeExtracted(extracted: {
    skills: string[];
    level: "beginner" | "intermediate" | "advanced";
    goal?: string;
  }) {
    if (extracted.skills && extracted.skills.length > 0) {
      // Merge unique skills, capped at 20
      const merged = Array.from(new Set([...skills, ...extracted.skills])).slice(0, 20);
      setSkills(merged);
    }
    if (extracted.level) {
      setLevel(extracted.level);
    }
    if (extracted.goal && !goal) {
      setGoal(extracted.goal);
    }
    setMsg({
      type: "success",
      text: `Resume profile extracted! Added ${extracted.skills.length} skills and updated experience level to ${extracted.level}.`,
    });
    setIsEditing(true); // switch to edit form so user can review and save

    // Smoothly scroll to the skills section where data was applied
    setTimeout(() => {
      const el = document.getElementById("skills-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
  }

  function submit() {
    if (!goal.trim()) {
      setMsg({ type: "error", text: "Please enter your target engineering goal." });
      return;
    }
    if (skills.length === 0) {
      setMsg({ type: "error", text: "Please add at least one known skill or technology." });
      return;
    }

    setMsg(null);
    const payload: LearningProfileInput = {
      goal: goal.trim(),
      currentLevel: level,
      knownSkills: skills.slice(0, 20),
      weeklyHours,
      learningStyle: style,
      format,
    };

    // Check if core learning profile attributes changed
    const isGoalChanged = initial?.goal ? initial.goal.trim() !== payload.goal : true;
    const isLevelChanged = initial?.currentLevel ? initial.currentLevel !== payload.currentLevel : false;
    const isHoursChanged = initial?.weeklyHours ? initial.weeklyHours !== payload.weeklyHours : false;
    const areSkillsChanged =
      initial?.knownSkills
        ? JSON.stringify([...initial.knownSkills].sort()) !== JSON.stringify([...payload.knownSkills].sort())
        : true;

    const hasCoreChanges = hasExistingProfile && (isGoalChanged || isLevelChanged || isHoursChanged || areSkillsChanged);

    if (hasCoreChanges) {
      setPendingPayload(payload);
      setRegenStep(1);
      setShowRegenModal(true);
      return;
    }

    // Save directly without wiping roadmap
    performSave(payload, !hasExistingProfile);
  }

  function performSave(payload: LearningProfileInput, regenerateRoadmap: boolean) {
    setMsg(null);
    setShowRegenModal(false);
    if (regenerateRoadmap) {
      setIsRegenerating(true);
    }

    startTransition(async () => {
      try {
        const res = await action(payload, regenerateRoadmap);
        if (!res.ok) {
          setMsg({ type: "error", text: res.error ?? "Failed to save profile. Please check your inputs." });
          setIsRegenerating(false);
          return;
        }

        setMsg({
          type: "success",
          text: regenerateRoadmap
            ? "Learning profile & customized roadmap regenerated successfully!"
            : "Learning profile updated! Your existing roadmap progress has been preserved.",
        });
        setIsEditing(false);
        setShowResumeUploader(false);
        router.refresh();
      } catch (err) {
        setMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to update profile." });
      } finally {
        setIsRegenerating(false);
      }
    });
  }

  const currentLevelConfig = LEVELS.find((l) => l.value === level) ?? LEVELS[1];

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW MODE: Modular 3-Card Architecture with Distinct Palettes & Borders
  // ══════════════════════════════════════════════════════════════════════════
  if (!isEditing) {
    return (
      <div className="space-y-4">
        {/* Card 1: Primary Target Goal & Profile Header */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <h2 className="font-heading text-base sm:text-lg font-bold tracking-tight text-foreground">
                  Personalized Learning Profile
                </h2>
                <Badge variant="outline" className={`text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.2 sm:py-0.5 font-medium ${currentLevelConfig.badgeColor}`}>
                  <TrendingUp className="h-3 w-3 mr-1" /> {currentLevelConfig.label}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleResumeUploader}
                className="h-8 px-3 rounded-xl border-border/80 bg-background text-xs font-medium gap-1.5 transition-all text-foreground hover:bg-muted cursor-pointer shadow-2xs"
                title="Upload resume to parse context"
              >
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>Upload Resume</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8 px-3 sm:px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold gap-1.5 transition-all shadow-2xs cursor-pointer border-0"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Profile
              </Button>
            </div>
          </div>

          {/* Goal Statement Callout */}
          <div className="rounded-xl border border-primary/30 bg-primary/[0.06] p-3 sm:p-3.5 space-y-1 shadow-2xs">
            <span className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Core Target Goal
            </span>
            <p className="font-heading text-sm sm:text-base font-bold text-foreground leading-snug">
              “{goal}”
            </p>
          </div>
        </div>

        {/* Card 2: Learning Cadence & Architecture Strategy */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" /> Learning Cadence & Study Preferences
            </span>
            <span className="text-[11px] text-muted-foreground">Adjustable at any time</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Level */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-0.5 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-primary font-semibold">
                <TrendingUp className="h-3 w-3" /> Experience Level
              </div>
              <p className="font-bold text-xs sm:text-sm text-foreground capitalize">{level}</p>
            </div>

            {/* Weekly Pace */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-0.5 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-primary font-semibold">
                <Clock className="h-3 w-3" /> Weekly Commitment
              </div>
              <p className="font-bold text-xs sm:text-sm text-foreground">{weeklyHours} Hours / Week</p>
            </div>

            {/* Learning Style */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-0.5 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-primary font-semibold">
                <Brain className="h-3 w-3" /> Learning Style
              </div>
              <p className="font-bold text-xs sm:text-sm text-foreground capitalize">{style}</p>
            </div>

            {/* Preferred Format */}
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-0.5 shadow-2xs">
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-primary font-semibold">
                <BookOpen className="h-3 w-3" /> Preferred Format
              </div>
              <p className="font-bold text-xs sm:text-sm text-foreground capitalize">{format}</p>
            </div>
          </div>
        </div>

        {/* Card 3: Technical Skills Inventory & Stack */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5 text-primary" /> Known Stack & Skills ({skills.length})
            </span>
            <span className="text-[11px] text-muted-foreground">Used for AI prerequisite mapping</span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {skills.map((s) => (
              <span
                key={s}
                className="rounded-lg sm:rounded-xl border border-border/80 bg-muted/40 px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-foreground shadow-2xs"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Expandable Resume Uploader with Scroll Ref */}
        {showResumeUploader && (
          <div ref={uploaderRef} className="animate-in fade-in slide-in-from-top-2 duration-200">
            <ResumeUploader userName={userName} onProfileExtracted={handleResumeExtracted} />
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EDIT MODE: Streamlined & compact on mobile with clear presets
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <Card className="rounded-2xl sm:rounded-3xl border border-border/80 bg-card shadow-2xs overflow-hidden animate-in fade-in zoom-in-98 duration-200">
      <CardHeader className="p-4 sm:p-6 lg:p-7 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-2xs shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <CardTitle className="font-heading text-base sm:text-lg lg:text-xl font-bold tracking-tight text-foreground">
                {hasExistingProfile ? "Edit Learning Profile" : "Create Your Learning Profile"}
              </CardTitle>
              <CardDescription className="text-[11px] sm:text-xs mt-0.5">
                Configure your engineering target, known skills, and learning preferences.
              </CardDescription>
            </div>
          </div>
          {hasExistingProfile && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
              className="text-xs h-8 px-3 rounded-xl border-border/80"
            >
              Cancel Edit
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 lg:p-7 space-y-6">
        {/* Quick Resume Uploader Drawer */}
        <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-3.5 sm:p-4 flex items-center justify-between flex-wrap gap-2.5 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Have a Resume or CV (.PDF / Text)?</p>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Auto-extract your skills, work history, and experience directly into your learning profile.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleResumeUploader}
            className="h-8 px-3 text-xs rounded-xl border-primary/30 text-primary hover:bg-primary/10 gap-1.5 font-semibold shrink-0 cursor-pointer shadow-2xs"
          >
            {showResumeUploader ? "Hide Uploader" : "Upload Resume (.PDF / Text)"}
            {showResumeUploader ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {showResumeUploader && (
          <div ref={uploaderRef} className="animate-in fade-in slide-in-from-top-1 duration-150">
            <ResumeUploader userName={userName} onProfileExtracted={handleResumeExtracted} />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* SUB-SECTION 1: Target Goal & Engineering Domain                        */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl border-2 border-border bg-card/60 p-4 sm:p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between pb-2.5 border-b border-border/70">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xs font-bold font-mono shadow-2xs">
                01
              </span>
              <div>
                <Label htmlFor="goal" className="font-heading font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-primary" /> Target Engineering Goal
                </Label>
                <p className="text-[11px] text-muted-foreground">What specific role or project milestone are you aiming to master?</p>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded-md border border-border/80 font-bold">
              {goal.length}/500
            </span>
          </div>

          <Textarea
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Become a production-ready Backend Engineer building distributed systems with Go, Docker, and PostgreSQL"
            rows={2}
            className="text-xs sm:text-sm rounded-xl resize-none border-2 border-border/80 bg-background focus:border-primary leading-relaxed shadow-2xs font-medium"
          />

          {/* Quick preset chips */}
          <div className="space-y-1.5 pt-0.5">
            <p className="text-[10px] sm:text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Quick Role Presets:</p>
            <div className="flex flex-wrap gap-1.5">
              {GOAL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setGoal(preset)}
                  className={`text-left rounded-lg border px-2.5 py-1 text-[11px] transition-all cursor-pointer ${
                    goal === preset
                      ? "border-primary bg-primary text-primary-foreground font-bold shadow-2xs ring-1 ring-primary/40"
                      : "border-border/80 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* SUB-SECTION 2: Experience Level & Study Bandwidth                      */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl border-2 border-border bg-card/60 p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/70">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xs font-bold font-mono shadow-2xs">
              02
            </span>
            <div>
              <p className="font-heading font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" /> Experience Level & Velocity
              </p>
              <p className="text-[11px] text-muted-foreground">Calibrate curriculum difficulty and weekly milestone pacing.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Level Cards */}
            <div className="space-y-2">
              <Label className="font-bold text-xs text-foreground">Current Experience Level</Label>
              <div className="space-y-2">
                {LEVELS.map((l) => {
                  const isSelected = level === l.value;
                  return (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => setLevel(l.value)}
                      className={`w-full rounded-xl border-2 p-2.5 sm:p-3 text-left transition-all flex items-start justify-between cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-2xs font-bold ring-1 ring-primary/40"
                          : "border-border/80 bg-background hover:bg-muted/40 text-card-foreground"
                      }`}
                    >
                      <div>
                        <p className={`text-xs font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {l.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                          {l.desc}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Weekly Hours Input & Presets */}
            <div className="space-y-2">
              <Label htmlFor="hours" className="font-bold text-xs text-foreground flex items-center justify-between">
                <span>Weekly Study Hours</span>
                <span className="text-[11px] text-primary font-bold">{weeklyHours}h / week</span>
              </Label>
              <div className="rounded-xl border-2 border-border/80 bg-background p-3 sm:p-3.5 space-y-3">
                <div className="flex items-center gap-3">
                  <Input
                    id="hours"
                    type="number"
                    min={1}
                    max={80}
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(parseInt(e.target.value || "0", 10))}
                    className="w-20 text-sm sm:text-base font-bold text-center h-9 sm:h-10 rounded-xl border-2 border-border/80"
                  />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">{weeklyHours} Hours / Week</p>
                    <p className="text-[10px] text-muted-foreground">Controls roadmap module pacing & hours</p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1.5 border-t border-border/60">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Quick Presets:</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[5, 10, 15, 20].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setWeeklyHours(h)}
                        className={`rounded-lg border-2 py-1 text-xs font-bold transition-all cursor-pointer ${
                          weeklyHours === h
                            ? "border-primary bg-primary text-primary-foreground shadow-2xs ring-1 ring-primary/40"
                            : "border-border/70 bg-muted/40 text-foreground hover:bg-muted"
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* SUB-SECTION 3: Known Skills Tag Manager                                */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div id="skills-section" className="rounded-2xl border-2 border-border bg-card/60 p-4 sm:p-5 space-y-3.5 shadow-sm scroll-mt-6">
          <div className="flex items-center justify-between pb-2.5 border-b border-border/70 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xs font-bold font-mono shadow-2xs">
                03
              </span>
              <div>
                <Label className="font-heading font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                  <Code2 className="h-4 w-4 text-primary" /> Known Technical Skills & Tools
                </Label>
                <p className="text-[11px] text-muted-foreground">List technologies you already know to prevent redundant roadmap beginner modules.</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/30">
              {skills.length} / 20 skills added
            </span>
          </div>

          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="Type a skill (e.g. Docker, TypeScript, PostgreSQL) and press Enter"
              className="text-xs sm:text-sm rounded-xl h-9 border-2 border-border/80 bg-background focus:border-primary font-medium"
              disabled={skills.length >= 20}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addSkill}
              disabled={!skillInput.trim() || skills.length >= 20}
              className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 shrink-0 border-2 border-border/80 cursor-pointer shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add Skill
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-[44px] p-3 rounded-xl border-2 border-dashed border-border/80 bg-background">
            {skills.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-foreground transition-all hover:bg-primary/15 shadow-2xs"
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  className="rounded-full p-0.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                  aria-label={`Remove ${s}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {skills.length === 0 && (
              <span className="text-xs text-muted-foreground py-1">
                No skills added yet. Add known technologies above or use the Resume Uploader to extract them automatically.
              </span>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* SUB-SECTION 4: Learning Style & Output Format                          */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl border-2 border-border bg-card/60 p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-border/70">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xs font-bold font-mono shadow-2xs">
              04
            </span>
            <div>
              <p className="font-heading font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-primary" /> Learning Style & Resource Preferences
              </p>
              <p className="text-[11px] text-muted-foreground">Tailors mentor explanations, research recommendations, and practical drills.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Style */}
            <div className="space-y-2">
              <Label className="font-bold text-xs text-foreground">Preferred Learning Style</Label>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map((s) => {
                  const isSelected = style === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStyle(s.value)}
                      className={`rounded-xl border-2 p-2.5 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs ring-1 ring-primary/40"
                          : "border-border/80 bg-background hover:bg-muted/40 text-foreground"
                      }`}
                    >
                      <p className="text-xs font-bold capitalize">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{s.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Format */}
            <div className="space-y-2">
              <Label className="font-bold text-xs text-foreground">Preferred Resource Format</Label>
              <div className="grid grid-cols-2 gap-2">
                {FORMATS.map((f) => {
                  const isSelected = format === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFormat(f.value)}
                      className={`rounded-xl border-2 p-2.5 text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs ring-1 ring-primary/40"
                          : "border-border/80 bg-background hover:bg-muted/40 text-foreground"
                      }`}
                    >
                      <p className="text-xs font-bold">{f.label}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">Prioritize {f.label.toLowerCase()}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Status / Error Message */}
        {msg && (
          <div
            className={`rounded-xl border p-3.5 flex items-center gap-2.5 text-xs font-medium ${
              msg.type === "error"
                ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            {msg.type === "error" ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            )}
            <span>{msg.text}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
          {hasExistingProfile && (
            <Button
              variant="outline"
              type="button"
              onClick={handleCancelEdit}
              disabled={isPending}
              className="rounded-xl h-9 px-4 text-xs font-medium border-border/80 cursor-pointer"
            >
              Cancel
            </Button>
          )}

          <Button
            onClick={submit}
            disabled={isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 h-9 sm:h-10 text-xs sm:text-sm font-bold gap-2 shadow-2xs cursor-pointer"
          >
            {isPending ? (
              "Saving Profile..."
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Learning Profile
              </>
            )}
          </Button>
        </div>
      </CardContent>

      {/* 2-Step Roadmap Regeneration Confirmation Modal */}
      {showRegenModal && pendingPayload && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {regenStep === 1 ? (
              /* STEP 1: Regeneration Prompt */
              <>
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0 shadow-inner">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      Profile Updated — Regenerate Roadmap?
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      You updated your target goal, skill set, or experience level. Would you like to generate a new customized roadmap and project milestones to match, or preserve your current learning progress?
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/20 p-3.5 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    <span>Target Goal:</span>
                    <span className="text-primary truncate">“{pendingPayload.goal}”</span>
                  </div>
                  <p>Level: <strong className="capitalize text-foreground">{pendingPayload.currentLevel}</strong> • {pendingPayload.knownSkills.length} Skills Added</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-border/50">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => performSave(pendingPayload, false)}
                    disabled={isPending}
                    className="w-full sm:w-auto text-xs h-9 rounded-xl font-medium order-2 sm:order-1 border-border/80"
                  >
                    Keep Current Roadmap
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setRegenStep(2)}
                    disabled={isPending}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9 px-4 rounded-xl font-semibold gap-1.5 shadow-2xs order-1 sm:order-2"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Regenerate Roadmap & Projects
                  </Button>
                </div>
              </>
            ) : (
              /* STEP 2: Caution / Confirmation Reset */
              <>
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                      ⚠️ Confirm Roadmap Reset
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Regenerating your roadmap will replace your current roadmap nodes, completed topic progress, and capstone project checklist with a brand-new curriculum.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  <strong>Warning:</strong> Existing checked tasks and module badges in your current roadmap will be reset and rebuilt around your new profile.
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t border-border/50">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setRegenStep(1)}
                    disabled={isPending}
                    className="w-full sm:w-auto text-xs h-9 rounded-xl font-medium"
                  >
                    Go Back
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => performSave(pendingPayload, false)}
                    disabled={isPending}
                    className="w-full sm:w-auto text-xs h-9 rounded-xl font-medium border-border/80"
                  >
                    Cancel & Keep Progress
                  </Button>
                  <Button
                    type="button"
                    onClick={() => performSave(pendingPayload, true)}
                    disabled={isPending || isRegenerating}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9 px-4 rounded-xl font-semibold gap-1.5 shadow-2xs"
                  >
                    {isRegenerating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5" /> Confirm & Regenerate
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </Card>
  );
}
