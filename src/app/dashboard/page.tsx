import Link from "next/link";
import { auth, isAuthConfigured, isDatabaseConfigured } from "@/lib/auth";
import { getLearningProfile } from "@/lib/learning-profile";
import { getRoadmap, saveRoadmap } from "@/lib/roadmap-store";
import { generateRoadmap } from "@/agents/roadmap/generator";
import { saveProfileAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats, NextActionCard } from "@/components/dashboard/stats";
import { MentorTeamCompact } from "@/components/dashboard/mentor-team";
import { ResourceCard } from "@/components/resources/resource-card";
import { LearningProfileForm } from "@/components/profile/learning-profile-form";
import { isMockModeForced } from "@/lib/env";
import { MOCK_RESOURCES } from "@/data/mock/resources";
import {
  MessageSquare,
  ArrowRight,
  GitBranch,
  Clock,
  CheckCircle2,
  Circle,
  Lock,
  Flame,
  Brain,
  Zap,
} from "lucide-react";

import { getUserStreak } from "@/lib/streak";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let session: unknown = null;
  let authConfigured = false;
  let dbConfigured = false;
  try {
    session = await (auth as unknown as () => Promise<unknown>)();
  } catch (err) {
    console.error("[dashboard/page] auth() failed:", err);
  }
  try {
    authConfigured = isAuthConfigured();
    dbConfigured = isDatabaseConfigured();
  } catch {
    authConfigured = false;
    dbConfigured = false;
  }
  const user = (session as unknown as { user?: { name?: string | null; email?: string | null; image?: string | null } } | null)?.user ?? null;

  const userId = (user?.email as string) ?? (user as unknown as { id?: string })?.id ?? "guest-preview-user";
  let profile: Awaited<ReturnType<typeof getLearningProfile>> = null;
  try {
    profile = await getLearningProfile(userId);
  } catch (err) {
    console.error("[dashboard/page] getLearningProfile failed:", err);
    profile = null;
  }

  // Load or auto-generate real roadmap from profile
  let roadmap = await getRoadmap(userId);
  const isStale = profile && roadmap && new Date(profile.updatedAt).getTime() > new Date(roadmap.updatedAt).getTime();
  if ((!roadmap || isStale) && profile) {
    roadmap = await generateRoadmap({ userId, profile });
    await saveRoadmap(userId, roadmap);
  }

  // Load real user activity streak
  const streak = await getUserStreak(userId);

  const nodes = roadmap?.nodes ?? [];
  const nodesTotal = nodes.length;
  const nodesCompleted = nodes.filter((n) => n.status === "completed").length;
  const progressPercent = nodesTotal > 0 ? Math.round((nodesCompleted / nodesTotal) * 100) : 0;
  const currentNode = nodes.find((n) => n.status === "current") ?? nodes.find((n) => n.status === "next");

  const greetingName = user?.name?.split(" ")[0] ?? (user ? "there" : "Developer");
  const goalText = profile?.goal ?? "Become a production-ready software engineer";
  const weeklyHours = profile?.weeklyHours ?? 10;

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8 space-y-8">
      {/* Header Greeting & Actions */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">
              Good day, {greetingName} 👋
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs px-2.5 py-0.5 font-medium">
              <Flame className="h-3.5 w-3.5 mr-1 fill-emerald-500/30" /> {streak.streakDays} Day Streak
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {profile
              ? `Goal: “${goalText}” • ${weeklyHours}h/week • ${profile.currentLevel}`
              : "Your AI engineering team is ready to guide your learning journey."}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/chat">
            <Button className="bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/20">
              <MessageSquare className="h-4 w-4 mr-2" /> Ask Mentors
            </Button>
          </Link>
          <Link href="/roadmap">
            <Button variant="outline" className="border-white/10">
              Roadmap <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Learning Profile Overview & Editor */}
      <LearningProfileForm
        initial={
          profile
            ? {
                goal: profile.goal,
                currentLevel: profile.currentLevel,
                knownSkills: profile.knownSkills,
                weeklyHours: profile.weeklyHours,
                learningStyle: profile.learningStyle,
                format: profile.format,
              }
            : undefined
        }
        action={saveProfileAction}
        userName={user?.name}
      />

      {/* Dynamic Real Metrics Row */}
      <DashboardStats
        progressPercent={progressPercent}
        progressLabel={roadmap ? `${nodesCompleted}/${nodesTotal} Nodes` : "No active track"}
        nodesCompleted={nodesCompleted}
        nodesTotal={nodesTotal}
        nextNodeLabel={currentNode?.title ?? "—"}
        nextNodeEta="1–2 weeks"
        goal={goalText}
        weeklyHours={weeklyHours}
        activeLabel={currentNode ? `Current: ${currentNode.title}` : undefined}
        streakDays={streak.streakDays}
        streakPercentile={streak.streakPercentile}
        streakHistory={streak.streakHistory}
      />

      {/* Main Grid with Spacing */}
      <div className="grid lg:grid-cols-[1.7fr_1fr] gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          <NextActionCard
            mentorLabel={currentNode?.mentorId ? `${currentNode.mentorId} Mentor` : "Tech Lead"}
            title={currentNode ? `Current Topic: ${currentNode.title}` : "Complete your learning profile"}
            description={currentNode?.description ?? "Set your goal and skills to generate your roadmap."}
            tags={currentNode?.relatedConcepts ?? []}
            estimatedTime={currentNode ? `${currentNode.difficulty}` : ""}
            projectHref={currentNode ? `/projects` : "/dashboard"}
          />

          {/* Active Roadmap Progress — Clickable Interactive Track */}
          <Card className="border-muted/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-violet-500" /> Active Roadmap Track
                </CardTitle>
                <Link href="/roadmap">
                  <Badge variant="secondary" className="text-xs hover:bg-violet-500/20 hover:text-violet-600 transition-colors cursor-pointer">
                    {nodesTotal} Milestones →
                  </Badge>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Personalized path based on goal: “{goalText}” • Click any track to open interactive roadmap
              </p>
            </CardHeader>

            <CardContent className="space-y-3">
              {nodes.length > 0 ? (
                nodes.slice(0, 6).map((n) => (
                  <Link
                    key={n.id}
                    href="/roadmap"
                    className="flex items-center gap-3.5 rounded-xl border p-3.5 bg-card hover:bg-muted/50 hover:border-violet-500/40 transition-all shadow-2xs group cursor-pointer"
                  >
                    <div className="shrink-0">
                      {n.status === "completed" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                      {n.status === "current" && (
                        <div className="h-5 w-5 rounded-full border-2 border-violet-500 flex items-center justify-center">
                          <div className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                        </div>
                      )}
                      {n.status === "next" && <Circle className="h-5 w-5 text-violet-500" />}
                      {n.status === "locked" && <Lock className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-1.5 py-0.2 rounded-sm">
                          Week {n.week ?? 1}
                        </span>
                        <p className="text-sm font-medium leading-tight group-hover:text-violet-500 transition-colors">{n.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.description}</p>
                    </div>
                    <Badge variant="outline" className="hidden sm:inline-flex text-xs capitalize">{n.mentorId}</Badge>
                    {n.status === "completed" && <Badge className="bg-emerald-600 text-white text-xs">Done</Badge>}
                    {n.status === "current" && <Badge className="bg-violet-600 text-white text-xs">Current</Badge>}
                    {n.status === "next" && <Badge variant="secondary" className="text-xs">Up next</Badge>}
                  </Link>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center">
                  <p className="text-sm font-medium text-foreground">No active roadmap track yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Save your learning profile above to generate your dynamic roadmap.
                  </p>
                </div>
              )}

              <div className="pt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Pace: {weeklyHours}h / week
                </span>
                <Link href="/roadmap" className="font-semibold text-violet-500 hover:underline flex items-center gap-1">
                  Manage & Edit Roadmap <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Active AI Mentors */}
          <Card className="border-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-violet-500" /> Your AI Engineering Team
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <MentorTeamCompact />
              <div className="rounded-xl border p-3 bg-muted/30 text-xs space-y-1">
                <p className="font-medium flex items-center gap-1 text-foreground">
                  <Zap className="h-3.5 w-3.5 text-amber-500" /> Tech Lead Orchestrator
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Automatically routes queries, consults specialists in parallel, and synthesizes unified engineering answers.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recommended Resources */}
          <Card className="border-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recommended Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isMockModeForced() ? (
                MOCK_RESOURCES.slice(0, 3).map((r) => (
                  <ResourceCard key={r.id} r={r} />
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center">
                  <p className="text-sm font-medium text-foreground">No resources yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Visit the <Link href="/resources" className="text-violet-500 hover:underline">Resources</Link> page to discover AI-evaluated learning materials.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
