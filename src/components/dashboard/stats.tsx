import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowUpRight, Clock, Target, Flame, BookOpen } from "lucide-react";
import Link from "next/link";
import { MOCK_DASHBOARD_STATS, MOCK_NEXT_ACTION } from "@/data/mock/dashboard";
import { isMockModeForced } from "@/lib/env";

export type DashboardStatsProps = {
  progressPercent?: number;
  progressLabel?: string;
  nodesCompleted?: number;
  nodesTotal?: number;
  nextNodeLabel?: string;
  nextNodeEta?: string;
  goal?: string;
  weeklyHours?: number;
  activeLabel?: string;
  streakDays?: number;
  streakPercentile?: number;
  streakHistory?: boolean[];
};

export type NextActionProps = {
  mentorLabel?: string;
  title?: string;
  description?: string;
  tags?: string[];
  estimatedTime?: string;
  projectHref?: string;
};

/**
 * DashboardStats — shows learning progress, goal, and streak with responsive grid.
 */
export function DashboardStats(props: DashboardStatsProps) {
  const useMock = isMockModeForced();
  const defaults = useMock ? MOCK_DASHBOARD_STATS : null;

  const progressPercent = props.progressPercent ?? defaults?.progressPercent ?? 0;
  const progressLabel = props.progressLabel ?? defaults?.progressLabel ?? "No active track";
  const nodesCompleted = props.nodesCompleted ?? defaults?.nodesCompleted ?? 0;
  const nodesTotal = props.nodesTotal ?? defaults?.nodesTotal ?? 0;
  const nextNodeLabel = props.nextNodeLabel ?? defaults?.nextNodeLabel ?? "—";
  const nextNodeEta = props.nextNodeEta ?? defaults?.nextNodeEta ?? "";
  const goal = props.goal ?? defaults?.goal ?? "Set your goal on the dashboard";
  const weeklyHours = props.weeklyHours ?? defaults?.weeklyHours ?? 0;
  const activeLabel = props.activeLabel ?? defaults?.activeLabel ?? "";
  const streakDays = props.streakDays ?? defaults?.streakDays ?? 0;
  const streakPercentile = props.streakPercentile ?? defaults?.streakPercentile ?? 0;
  const streakHistory = props.streakHistory ?? defaults?.streakHistory ?? Array(7).fill(false);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Progress Card */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-3.5 shadow-2xs hover:border-border transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Curriculum Progress</span>
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold px-2 py-0.5 rounded-md">
            {progressPercent}% Mastered
          </Badge>
        </div>
        <div>
          <p className="font-heading text-2xl font-bold tracking-tight text-foreground">{progressLabel}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {nodesTotal > 0 ? `${nodesCompleted} of ${nodesTotal} milestones completed` : "No active curriculum yet"}
          </p>
        </div>
        <Progress value={progressPercent} className="h-1.5 rounded-full bg-muted" />
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5 truncate">
          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">{nodesTotal > 0 ? `Next: ${nextNodeLabel} • ${nextNodeEta}` : "Configure profile to start"}</span>
        </p>
      </div>

      {/* Goals Card */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-3.5 shadow-2xs hover:border-border transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Target Direction</span>
          {weeklyHours > 0 && (
            <Badge variant="secondary" className="text-[10.5px] px-2 py-0.5 font-medium rounded-md">
              {weeklyHours}h / week
            </Badge>
          )}
        </div>
        <div>
          <p className="font-heading text-base sm:text-lg font-bold leading-snug line-clamp-2 text-foreground">{goal}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <Badge variant="secondary" className="text-[10.5px] px-2 py-0.5 font-medium rounded-md">
            <Target className="h-3 w-3 mr-1 text-primary" /> Engineering Track
          </Badge>
        </div>
        {activeLabel && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5 truncate">
            <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" /> <span className="truncate">{activeLabel}</span>
          </div>
        )}
      </div>

      {/* Streak Card */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-3.5 shadow-2xs sm:col-span-2 lg:col-span-1 hover:border-border transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Practice Rhythm</span>
          <div className="flex items-center gap-1 text-amber-500 font-semibold text-xs">
            <Flame className="h-4 w-4 fill-amber-500/20" /> Active
          </div>
        </div>
        <div>
          <p className="font-heading text-2xl font-bold tracking-tight text-foreground">
            {streakDays > 0 ? `${streakDays} Days Momentum` : "Build Momentum"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {streakDays > 0
              ? `Top ${streakPercentile}% consistency among engineering learners.`
              : "Review milestones and engage with mentors daily to build your streak."}
          </p>
        </div>
        <div className="flex gap-1.5 pt-1">
          {streakHistory.map((active, i) => (
            <div
              key={i}
              className={`h-3.5 flex-1 rounded-md transition-all ${
                active ? "bg-primary shadow-2xs" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * NextActionCard — shows the recommended next learning action with responsive layout.
 */
export function NextActionCard(props: NextActionProps) {
  const useMock = isMockModeForced();
  const defaults = useMock ? MOCK_NEXT_ACTION : null;

  const mentorLabel = props.mentorLabel ?? defaults?.mentorLabel ?? "Mentor";
  const title = props.title ?? defaults?.title ?? "Complete your learning profile";
  const description =
    props.description ??
    defaults?.description ??
    "Set your goal, skill level, and weekly hours on the dashboard to get a personalized roadmap.";
  const tags = props.tags ?? defaults?.tags ?? [];
  const estimatedTime = props.estimatedTime ?? defaults?.estimatedTime ?? "";
  const projectHref = props.projectHref ?? defaults?.projectHref ?? "/dashboard";

  return (
    <div className="rounded-2xl border border-border/80 shadow-xs overflow-hidden bg-card transition-all">
      <div className="p-5 sm:p-6 space-y-3 border-b border-border/60 bg-muted/20">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 rounded-lg bg-primary/10 text-primary items-center justify-center">
              <BookOpen className="h-3.5 w-3.5" />
            </span>
            <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Current Recommended Focus</p>
          </div>
          <Badge className="bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-md">{mentorLabel}</Badge>
        </div>
        <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground leading-snug">{title}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">{description}</p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.slice(0, 5).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5 rounded-md font-mono">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card">
        <div className="text-xs space-y-0.5">
          <p className="font-semibold text-foreground">Main-Project Deliverable{estimatedTime ? ` • ${estimatedTime}` : ""}</p>
          <p className="text-muted-foreground text-[11px]">Includes conceptual breakdown & code checkpoint</p>
        </div>
        <Link
          href={projectHref}
          className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline shrink-0"
        >
          Open Project Hub <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
