"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, X, Plus, Save, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { LearningProfileInput } from "@/lib/learning-profile";

type Props = {
  initial?: Partial<LearningProfileInput>;
  action: (data: LearningProfileInput) => Promise<{ ok: boolean; isMock: boolean; error?: string }>;
  userName?: string | null;
};

const LEVELS: Array<{ value: LearningProfileInput["currentLevel"]; label: string; desc: string }> = [
  { value: "beginner", label: "Beginner", desc: "Just starting" },
  { value: "intermediate", label: "Intermediate", desc: "Built projects" },
  { value: "advanced", label: "Advanced", desc: "Production exp." },
];

const STYLES: LearningProfileInput["learningStyle"][] = ["hands-on", "visual", "reading", "mixed"];
const FORMATS: LearningProfileInput["format"][] = ["docs", "videos", "projects", "mixed"];

export function LearningProfileForm({ initial, action, userName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [goal, setGoal] = useState(initial?.goal ?? "Become a production-ready backend developer building a SaaS");
  const [level, setLevel] = useState<LearningProfileInput["currentLevel"]>(initial?.currentLevel ?? "intermediate");
  const [skills, setSkills] = useState<string[]>(initial?.knownSkills ?? ["JavaScript", "React"]);
  const [skillInput, setSkillInput] = useState("");
  const [weeklyHours, setWeeklyHours] = useState(initial?.weeklyHours ?? 10);
  const [style, setStyle] = useState<LearningProfileInput["learningStyle"]>(initial?.learningStyle ?? "mixed");
  const [format, setFormat] = useState<LearningProfileInput["format"]>(initial?.format ?? "mixed");
  const [msg, setMsg] = useState<{ type: "success" | "error" | "mock"; text: string } | null>(null);

  function addSkill() {
    const s = skillInput.trim();
    if (!s || skills.includes(s) || skills.length >= 20) return;
    setSkills([...skills, s]);
    setSkillInput("");
  }

  function removeSkill(s: string) {
    setSkills(skills.filter((x) => x !== s));
  }

  function submit() {
    setMsg(null);
    const payload: LearningProfileInput = {
      goal: goal.trim(),
      currentLevel: level,
      knownSkills: skills,
      weeklyHours,
      learningStyle: style,
      format,
    };
    startTransition(async () => {
      const res = await action(payload);
      if (!res.ok) {
        setMsg({ type: "error", text: res.error ?? "Failed to save. Check your inputs." });
        return;
      }
      if (res.isMock) {
        setMsg({
          type: "mock",
          text: "Saved in preview mode (no DB). Add DATABASE_URL to persist across restarts — see SETUP.md §4.1.",
        });
      } else {
        setMsg({ type: "success", text: "Profile saved — your roadmap will personalize next (Phase 9)." });
      }
      router.refresh();
      // small delay to show toast before potential navigation
      setTimeout(() => router.refresh(), 300);
    });
  }

  return (
    <Card className="border-muted/50 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base leading-none">Your learning profile</CardTitle>
            <p className="text-xs text-muted-foreground">
              {userName ? `Hi ${userName} — ` : ""}This drives your personalized roadmap, graph, and mentor context.
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto text-xs">Phase 2</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="goal">Goal <span className="text-muted-foreground font-normal">— what do you want to become?</span></Label>
          <Textarea
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g., Become a production-ready backend engineer and ship a SaaS"
            rows={2}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">{goal.length}/500 • Be specific — the roadmap parses this.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Current level</Label>
            <div className="grid grid-cols-3 gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLevel(l.value)}
                  className={`rounded-xl border p-3 text-left transition ${
                    level === l.value ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted/50"
                  }`}
                >
                  <p className="text-sm font-medium">{l.label}</p>
                  <p className={`text-xs ${level === l.value ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{l.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">Weekly time (hours)</Label>
            <div className="flex items-center gap-3">
              <Input
                id="hours"
                type="number"
                min={1}
                max={80}
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(parseInt(e.target.value || "0", 10))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">{weeklyHours}h/week • Estimated roadmap adapts</span>
            </div>
            <div className="flex gap-1.5 pt-1">
              {[5, 10, 15, 20].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setWeeklyHours(h)}
                  className={`text-xs px-2 py-1 rounded-full border ${weeklyHours === h ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Known skills <span className="text-muted-foreground font-normal">— add what you already know</span></Label>
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
              placeholder="e.g., TypeScript"
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={addSkill} disabled={!skillInput.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <Badge key={s} variant="secondary" className="gap-1.5 pr-1">
                {s}
                <button type="button" onClick={() => removeSkill(s)} className="h-4 w-4 rounded-full hover:bg-muted flex items-center justify-center">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {skills.length === 0 && <span className="text-xs text-muted-foreground">No skills yet — add at least one.</span>}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Learning style</Label>
            <div className="flex flex-wrap gap-1.5">
              {STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border capitalize ${style === s ? "bg-primary text-primary-foreground border-primary" : "bg-muted hover:bg-muted/80"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Preferred format</Label>
            <div className="flex flex-wrap gap-1.5">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`text-xs px-3 py-1.5 rounded-full border capitalize ${format === f ? "bg-primary text-primary-foreground border-primary" : "bg-muted hover:bg-muted/80"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {msg && (
          <div
            className={`rounded-lg border p-3 flex gap-2 text-sm ${
              msg.type === "error"
                ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
                : msg.type === "mock"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
            }`}
          >
            {msg.type === "error" ? (
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            ) : msg.type === "mock" ? (
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={submit} disabled={isPending} className="flex-1 bg-primary hover:bg-primary/90">
            {isPending ? (
              "Saving…"
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" /> Save profile
              </>
            )}
          </Button>
          <Button variant="outline" type="button" onClick={() => router.refresh()} disabled={isPending}>
            Refresh
          </Button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Stored in <code className="font-mono bg-muted px-1 rounded">learning_profiles</code> (Neon + Drizzle). Used for roadmap generation (Phase 9), weak-area detection, and mentor context. You can update anytime.
        </p>
      </CardContent>
    </Card>
  );
}
