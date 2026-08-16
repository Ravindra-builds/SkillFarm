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
      <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Progress</p>
            <Badge className="bg-emerald-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-md">
              {progressPercent}% Complete
            </Badge>
          </div>
          <div>
            <p className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">{progressLabel}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {nodesTotal > 0 ? `${nodesCompleted} of ${nodesTotal} modules mastered` : "No roadmap yet"}
            </p>
          </div>
          <Progress value={progressPercent} className="h-2 rounded-full" />
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
            <Clock className="h-3 w-3 text-violet-500" />
            {nodesTotal > 0 ? `Next: ${nextNodeLabel} • ${nextNodeEta}` : "Complete your profile to start"}
          </p>
        </CardContent>
      </Card>

      {/* Goals Card */}
      <Card className="rounded-2xl border border-border/80 shadow-xs bg-card">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">Target Goal</p>
          <div>
            <p className="font-heading text-base sm:text-lg font-bold leading-snug line-clamp-2 text-foreground">{goal}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <Badge variant="secondary" className="text-[11px] px-2 py-0.5 font-medium rounded-md">
              <Target className="h-3 w-3 mr-1 text-violet-500" /> Career Focus
            </Badge>
            {weeklyHours > 0 && (
              <Badge variant="secondary" className="text-[11px] px-2 py-0.5 font-medium rounded-md">
                {weeklyHours}h / week
              </Badge>
            )}
          </div>
          {activeLabel && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 truncate">
              <span className="h-2 w-2 rounded-full bg-violet-500 shrink-0" /> <span className="truncate">{activeLabel}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Streak Card */}
      <Card className="rounded-2xl border-0 shadow-xs bg-gradient-to-br from-violet-600 to-indigo-600 text-white sm:col-span-2 lg:col-span-1">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold tracking-widest text-violet-200 uppercase">Learning Streak</p>
            <Flame className="h-4 w-4 text-orange-300" />
          </div>
          <div>
            <p className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
              {streakDays > 0 ? `${streakDays} Days` : "Start Today!"}
            </p>
            <p className="text-xs text-violet-100 mt-0.5 leading-relaxed">
              {streakDays > 0
                ? `Consistent practice! Top ${streakPercentile}% of active learners.`
                : "Log in and master modules daily to build momentum."}
            </p>
          </div>
          <div className="flex gap-1.5 pt-1">
            {streakHistory.map((active, i) => (
              <div key={i} className={`h-4.5 flex-1 rounded-md transition-all ${active ? "bg-white" : "bg-white/30"}`} />
            ))}
          </div>
        </CardContent>
      </Card>
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
    <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden bg-card">
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-900 dark:to-[#1a1d29] p-4 sm:p-5 border-b space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-violet-400 shrink-0" />
              <p className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase">Recommended Next Step</p>
            </div>
            <Badge className="bg-violet-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">{mentorLabel}</Badge>
          </div>
          <h3 className="font-heading text-base sm:text-lg font-bold text-white leading-snug">{title}</h3>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">{description}</p>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.slice(0, 5).map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-white/10 text-zinc-200 border-white/10 text-[10px] px-2 py-0.5 rounded-md">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card">
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-foreground">Main-Project Deliverable{estimatedTime ? ` • ${estimatedTime}` : ""}</p>
            <p className="text-muted-foreground text-[11px]">Includes conceptual practice + mentor assistance</p>
          </div>
          <Link
            href={projectHref}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline shrink-0"
          >
            Open Project Hub <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
