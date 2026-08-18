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
  // VIEW MODE: Compact on mobile, spacious on desktop, clear typography
  // ══════════════════════════════════════════════════════════════════════════
  if (!isEditing) {
    return (
      <div className="space-y-4">
        <Card className="rounded-2xl sm:rounded-3xl border border-border/80 bg-card/60 backdrop-blur-sm shadow-xs overflow-hidden transition-all">
          {/* Card Header with Responsive Padding */}
          <div className="p-4 sm:p-6 lg:p-7 border-b border-border/50 bg-gradient-to-r from-violet-500/5 via-background to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs shrink-0">
                  <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <h2 className="font-heading text-base sm:text-lg lg:text-xl font-bold tracking-tight text-foreground">
                  Personalized Learning Profile
                </h2>
                <Badge variant="outline" className={`text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.2 sm:py-0.5 font-medium ${currentLevelConfig.badgeColor}`}>
                  <TrendingUp className="h-3 w-3 mr-1" /> {currentLevelConfig.label}
                </Badge>
                <Badge className="bg-emerald-600 text-white text-[10px] sm:text-[11px] px-2 py-0.2">
                  Active Context
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">
                {userName ? `Tailored for ${userName}. ` : ""}
                Mentors tailor architectural guidance, code snippets, and roadmaps to this profile.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleResumeUploader}
                className="h-8 px-3 rounded-xl border-border/70 text-xs font-medium gap-1.5 transition-all text-muted-foreground hover:text-foreground"
                title="Upload resume to parse context"
              >
                <FileText className="h-3.5 w-3.5 text-violet-500" />
                <span>Upload Resume</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-8 px-3 sm:px-4 rounded-xl border-border/80 bg-background/80 hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-600 dark:hover:text-violet-400 text-xs font-semibold gap-1.5 transition-all shadow-2xs"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Profile
              </Button>
            </div>
          </div>

          <CardContent className="p-4 sm:p-6 lg:p-7 space-y-4 sm:space-y-6">
            {/* Goal Statement Banner */}
            <div className="rounded-xl sm:rounded-2xl border border-violet-500/20 bg-violet-500/5 dark:bg-violet-500/10 p-3.5 sm:p-4 space-y-1 sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Target Goal
                </span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">Roadmap Driver</span>
              </div>
              <p className="font-heading text-sm sm:text-base font-semibold text-foreground leading-snug">
                “{goal}”
              </p>
            </div>

            {/* Key Attributes Grid (Responsive: 2 columns on mobile, 4 on desktop with compact height) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
              {/* Level */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-3.5 space-y-0.5">
                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground font-medium">
                  <TrendingUp className="h-3 w-3 text-violet-500" /> Level
                </div>
                <p className="font-semibold text-xs sm:text-sm text-foreground capitalize">{level}</p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">{currentLevelConfig.desc}</p>
              </div>

              {/* Weekly Pace */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-3.5 space-y-0.5">
                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground font-medium">
                  <Clock className="h-3 w-3 text-blue-500" /> Pace
                </div>
                <p className="font-semibold text-xs sm:text-sm text-foreground">{weeklyHours}h / week</p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground">Milestone velocity</p>
              </div>

              {/* Learning Style */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-3.5 space-y-0.5">
                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground font-medium">
                  <Brain className="h-3 w-3 text-amber-500" /> Style
                </div>
                <p className="font-semibold text-xs sm:text-sm text-foreground capitalize">{style}</p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground">Adaptive mentoring</p>
              </div>

              {/* Preferred Format */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-3.5 space-y-0.5">
                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground font-medium">
                  <BookOpen className="h-3 w-3 text-emerald-500" /> Format
                </div>
                <p className="font-semibold text-xs sm:text-sm text-foreground capitalize">{format}</p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground">Curated materials</p>
              </div>
            </div>

            {/* Known Skills Pill Cloud */}
            <div className="space-y-1.5 sm:space-y-2 pt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Code2 className="h-3.5 w-3.5 text-violet-600" /> Known Stack & Skills ({skills.length})
                </span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground">Prerequisites active</span>
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-lg sm:rounded-xl border border-violet-500/20 bg-violet-500/5 dark:bg-violet-500/10 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-medium text-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

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
    <Card className="rounded-2xl sm:rounded-3xl border border-violet-500/40 bg-card shadow-md overflow-hidden animate-in fade-in zoom-in-98 duration-200">
      <CardHeader className="p-4 sm:p-6 lg:p-7 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <CardTitle className="font-heading text-base sm:text-lg lg:text-xl font-bold tracking-tight">
                {hasExistingProfile ? "Edit Learning Profile" : "Create Your Learning Profile"}
              </CardTitle>
              <CardDescription className="text-[11px] sm:text-xs mt-0.5">
                Configure your engineering target, known skills, and learning preferences.
              </CardDescription>
            </div>
          </div>
          {hasExistingProfile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEdit}
              className="text-xs h-7 sm:h-8 text-muted-foreground hover:text-foreground"
            >
              Cancel Edit
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 lg:p-7 space-y-5 sm:space-y-6">
        {/* Toggle Resume Uploader Banner */}
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-violet-600" />
            <span className="text-xs font-semibold text-foreground">
              Have a resume (.pdf or text)?
            </span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Auto-extract skills & experience into Personalized Long-Term Memory
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleResumeUploader}
            className="h-7 px-2.5 text-xs rounded-lg border-violet-500/30 text-violet-700 dark:text-violet-300 gap-1 font-medium"
          >
            {showResumeUploader ? "Hide Uploader" : "Upload Resume (.PDF / Text)"}
            {showResumeUploader ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>

        {showResumeUploader && (
          <div ref={uploaderRef} className="animate-in fade-in slide-in-from-top-1 duration-150">
            <ResumeUploader userName={userName} onProfileExtracted={handleResumeExtracted} />
          </div>
        )}

        {/* Section 1: Target Goal */}
        <div className="space-y-2 sm:space-y-2.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="goal" className="font-semibold text-xs sm:text-sm flex items-center gap-1.5 text-foreground">
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-600" /> Target Engineering Goal
            </Label>
            <span className="text-[10px] sm:text-xs text-muted-foreground font-mono">{goal.length}/500</span>
          </div>

          <Textarea
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Become a production-ready backend engineer building a SaaS with Docker and Microservices"
            rows={2}
            className="text-xs sm:text-sm rounded-xl resize-none border-border/80 focus:border-violet-500 leading-relaxed"
          />

          {/* Quick preset chips */}
          <div className="space-y-1 pt-0.5">
            <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">Quick suggestions:</p>
            <div className="flex flex-wrap gap-1">
              {GOAL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setGoal(preset)}
                  className={`text-left rounded-lg border px-2 py-0.5 text-[10px] sm:text-[11px] transition-colors ${
                    goal === preset
                      ? "border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300 font-medium"
                      : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Experience Level & Weekly Commitment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-1">
          {/* Level Cards */}
          <div className="space-y-2">
            <Label className="font-semibold text-xs sm:text-sm flex items-center gap-1.5 text-foreground">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-600" /> Current Level
            </Label>
            <div className="space-y-1.5">
              {LEVELS.map((l) => {
                const isSelected = level === l.value;
                return (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLevel(l.value)}
                    className={`w-full rounded-xl border p-2.5 sm:p-3 text-left transition-all flex items-start justify-between ${
                      isSelected
                        ? "border-violet-600 bg-violet-500/10 dark:bg-violet-500/15 shadow-2xs"
                        : "border-border/70 bg-card hover:bg-muted/30 hover:border-border"
                    }`}
                  >
                    <div>
                      <p className={`text-xs font-semibold ${isSelected ? "text-violet-700 dark:text-violet-300" : "text-foreground"}`}>
                        {l.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                        {l.desc}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weekly Hours Input & Presets */}
          <div className="space-y-2">
            <Label htmlFor="hours" className="font-semibold text-xs sm:text-sm flex items-center gap-1.5 text-foreground">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-600" /> Weekly Availability
            </Label>
            <div className="rounded-xl border border-border/70 bg-card p-3 sm:p-3.5 space-y-3">
              <div className="flex items-center gap-3">
                <Input
                  id="hours"
                  type="number"
                  min={1}
                  max={80}
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(parseInt(e.target.value || "0", 10))}
                  className="w-20 text-sm sm:text-base font-bold text-center h-9 sm:h-10 rounded-xl border-border/80"
                />
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">{weeklyHours} Hours / Week</p>
                  <p className="text-[10px] text-muted-foreground">Adjusts milestone velocity</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-medium">Presets:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[5, 10, 15, 20].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setWeeklyHours(h)}
                      className={`rounded-lg border py-1 text-xs font-semibold transition-all ${
                        weeklyHours === h
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-border/60 bg-muted/40 text-foreground hover:bg-muted"
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

        {/* Section 3: Known Skills Tag Manager */}
        <div id="skills-section" className="space-y-2 pt-1 scroll-mt-6">
          <div className="flex items-center justify-between">
            <Label className="font-semibold text-xs sm:text-sm flex items-center gap-1.5 text-foreground">
              <Code2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-600" /> Known Skills & Technologies ({skills.length}/20)
            </Label>
            <span className="text-[10px] sm:text-xs text-muted-foreground">{skills.length} / 20 skills added</span>
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
              placeholder="Type a skill (e.g. Docker, PostgreSQL, Go) and press Enter"
              className="text-xs sm:text-sm rounded-xl h-9 border-border/80 focus:border-violet-500"
              disabled={skills.length >= 20}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addSkill}
              disabled={!skillInput.trim() || skills.length >= 20}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold gap-1 shrink-0"
            >
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2.5 rounded-xl border border-dashed border-border/70 bg-muted/10">
            {skills.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-lg sm:rounded-xl border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-foreground transition-all hover:bg-violet-500/15"
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  className="rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-violet-500/20 transition-colors"
                  aria-label={`Remove ${s}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            {skills.length === 0 && (
              <span className="text-xs text-muted-foreground/80 py-0.5">
                No skills added yet. Add skills or upload your resume above to populate.
              </span>
            )}
          </div>
        </div>

        {/* Section 4: Learning Style & Preferred Format */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-1">
          {/* Style */}
          <div className="space-y-2">
            <Label className="font-semibold text-xs sm:text-sm flex items-center gap-1.5 text-foreground">
              <Brain className="h-3.5 w-3.5 text-violet-600" /> Learning Style
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              {STYLES.map((s) => {
                const isSelected = style === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStyle(s.value)}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      isSelected
                        ? "border-violet-600 bg-violet-500/10 text-violet-700 dark:text-violet-300 font-semibold"
                        : "border-border/70 bg-card hover:bg-muted/30 text-foreground"
                    }`}
                  >
                    <p className="text-xs font-semibold capitalize">{s.label}</p>
                    <p className="text-[9px] text-muted-foreground line-clamp-1">{s.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label className="font-semibold text-xs sm:text-sm flex items-center gap-1.5 text-foreground">
              <BookOpen className="h-3.5 w-3.5 text-violet-600" /> Preferred Format
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              {FORMATS.map((f) => {
                const isSelected = format === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFormat(f.value)}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      isSelected
                        ? "border-violet-600 bg-violet-500/10 text-violet-700 dark:text-violet-300 font-semibold"
                        : "border-border/70 bg-card hover:bg-muted/30 text-foreground"
                    }`}
                  >
                    <p className="text-xs font-semibold">{f.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status / Error Message */}
        {msg && (
          <div
            className={`rounded-xl border p-3 flex items-center gap-2.5 text-xs font-medium ${
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
        <div className="flex items-center gap-2.5 pt-2 border-t border-border/50">
          <Button
            onClick={submit}
            disabled={isPending}
            className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-5 h-9 text-xs sm:text-sm font-semibold gap-1.5 shadow-2xs"
          >
            {isPending ? (
              "Saving Profile..."
            ) : (
              <>
                <Save className="h-3.5 w-3.5" /> Save Learning Profile
              </>
            )}
          </Button>

          {hasExistingProfile && (
            <Button
              variant="outline"
              type="button"
              onClick={handleCancelEdit}
              disabled={isPending}
              className="rounded-xl h-9 px-3.5 text-xs font-medium border-border/80"
            >
              Cancel
            </Button>
          )}
        </div>
      </CardContent>

      {/* 2-Step Roadmap Regeneration Confirmation Modal */}
      {showRegenModal && pendingPayload && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg rounded-3xl border border-violet-500/30 bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {regenStep === 1 ? (
              /* STEP 1: Regeneration Prompt */
              <>
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-2xl bg-violet-600/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
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
                    <span className="text-violet-600 dark:text-violet-400 truncate">“{pendingPayload.goal}”</span>
                  </div>
                  <p>Level: <strong className="capitalize text-foreground">{pendingPayload.currentLevel}</strong> • {pendingPayload.knownSkills.length} Skills Added</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => performSave(pendingPayload, false)}
                    disabled={isPending}
                    className="w-full sm:w-auto text-xs h-9 rounded-xl font-medium order-2 sm:order-1"
                  >
                    Keep Current Roadmap
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setRegenStep(2)}
                    disabled={isPending}
                    className="w-full sm:w-auto bg-violet-600 hover:bg-violet-500 text-white text-xs h-9 px-4 rounded-xl font-semibold gap-1.5 shadow-xs order-1 sm:order-2"
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

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2 border-t">
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
                    className="w-full sm:w-auto text-xs h-9 rounded-xl font-medium"
                  >
                    Cancel & Keep Progress
                  </Button>
                  <Button
                    type="button"
                    onClick={() => performSave(pendingPayload, true)}
                    disabled={isPending || isRegenerating}
                    className="w-full sm:w-auto bg-violet-600 hover:bg-violet-500 text-white text-xs h-9 px-4 rounded-xl font-semibold gap-1.5 shadow-xs"
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
