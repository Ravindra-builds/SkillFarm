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
 * DashboardStats — shows learning progress, goal, and streak.
 *
 * In mock/preview mode (ENABLE_MOCK_MODE=true): hardcoded sample data from
 * src/data/mock/dashboard.ts is used as the default for all props.
 *
 * In production: pass real data as props from server components.
 */
export function DashboardStats(props: DashboardStatsProps) {
  // In mock mode, default all missing props to mock data.
  // In production with no props, show empty/zero state instead of fake data.
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
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-muted/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Progress</p>
            <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 text-[11px]">
              {progressPercent}% complete
            </Badge>
          </div>
          <p className="mt-3 font-heading text-2xl font-bold">{progressLabel}</p>
          <p className="text-sm text-muted-foreground">
            {nodesTotal > 0 ? `${nodesCompleted} of ${nodesTotal} nodes completed` : "No roadmap yet"}
          </p>
          <Progress value={progressPercent} className="mt-4 h-2" />
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {nodesTotal > 0 ? `Next: ${nextNodeLabel} • ${nextNodeEta}` : "Complete your profile to start"}
          </p>
        </CardContent>
      </Card>

      <Card className="border-muted/50">
        <CardContent className="p-5">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Goals</p>
          <p className="mt-3 font-heading text-lg font-bold leading-tight">{goal}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">
              <Target className="h-3 w-3 mr-1" /> SaaS
            </Badge>
            {weeklyHours > 0 && (
              <Badge variant="secondary" className="text-xs">{weeklyHours}h / week</Badge>
            )}
          </div>
          {activeLabel && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-violet-500" /> {activeLabel}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-muted/50 bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-0">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-widest text-violet-100 uppercase">Streak</p>
            <Flame className="h-4 w-4 text-orange-200" />
          </div>
          <p className="mt-3 font-heading text-3xl font-bold">
            {streakDays > 0 ? `${streakDays} days` : "Start today!"}
          </p>
          <p className="text-sm text-violet-100">
            {streakDays > 0
              ? `Keep it up! You're in the top ${streakPercentile}%.`
              : "Log in daily to build your streak."}
          </p>
          <div className="mt-4 flex gap-1.5">
            {streakHistory.map((active, i) => (
              <div key={i} className={`h-6 flex-1 rounded-md ${active ? "bg-white" : "bg-white/30"}`} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * NextActionCard — shows the recommended next learning action.
 *
 * In mock mode: uses MOCK_NEXT_ACTION defaults.
 * In production: pass real data as props.
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
    <Card className="border-muted/50 overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-900 dark:to-[#1a1d29] p-5 border-b">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-violet-400" />
            <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">Recommended next step</p>
            <Badge className="ml-auto bg-violet-600 text-white hover:bg-violet-700 text-[11px]">{mentorLabel}</Badge>
          </div>
          <h3 className="mt-3 font-heading text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
          {tags.length > 0 && (
            <div className="mt-4 flex gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-white/10 text-zinc-200 border-white/10">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="p-5 flex items-center justify-between bg-card">
          <div className="text-sm">
            <p className="font-medium">Practical project{estimatedTime ? ` • ${estimatedTime}` : ""}</p>
            <p className="text-xs text-muted-foreground">Includes starter repo + checklist + mentor review</p>
          </div>
          <Link
            href={projectHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Start project <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
