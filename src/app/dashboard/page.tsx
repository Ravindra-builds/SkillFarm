import Link from "next/link";
import { auth, isAuthConfigured, isDatabaseConfigured } from "@/lib/auth";
import { getLearningProfile } from "@/lib/learning-profile";
import { getRoadmap, saveRoadmap } from "@/lib/roadmap-store";
import { generateRoadmap } from "@/agents/roadmap/generator";
import { saveProfileAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardStats, NextActionCard } from "@/components/dashboard/stats";
import { MentorTeamCompact } from "@/components/dashboard/mentor-team";
import { ResourceCard } from "@/components/resources/resource-card";
import { LearningProfileForm } from "@/components/profile/learning-profile-form";
import { getTopicResourcePack, type TopicResourcePack } from "@/agents/research/topic-research";
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
  BookOpen,
  Sparkles,
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

  // Load or auto-generate initial roadmap if none exists
  let roadmap = await getRoadmap(userId);
  if (!roadmap && profile) {
    roadmap = await generateRoadmap({ userId, profile });
    await saveRoadmap(userId, roadmap);
  }

  // Load real user activity streak
  const streak = await getUserStreak(userId);

  const nodes = roadmap?.nodes ?? [];
  const nodesTotal = nodes.length;
  const nodesCompleted = nodes.filter((n) => n.status === "completed").length;
  const progressPercent = nodesTotal > 0 ? Math.round((nodesCompleted / nodesTotal) * 100) : 0;
  const currentNode = nodes.find((n) => n.status === "current") ?? nodes.find((n) => n.status === "next") ?? nodes[0];

  // Fetch evaluated resources for the current ongoing topic
  const currentTopic = currentNode?.topic || currentNode?.title;
  const currentConcepts = currentNode?.concepts && currentNode.concepts.length > 0 ? currentNode.concepts : currentNode?.relatedConcepts ?? [];
  let currentTopicPack: TopicResourcePack | null = null;

  if (currentTopic) {
    try {
      currentTopicPack = await getTopicResourcePack({
        topic: currentTopic,
        concepts: currentConcepts,
        level: profile?.currentLevel || "intermediate",
        useCache: true,
      });
    } catch (err) {
      console.error("[dashboard/page] getTopicResourcePack failed:", err);
    }
  }

  const greetingName = user?.name?.split(" ")[0] ?? (user ? "there" : "Developer");
  const goalText = profile?.goal ?? "Become a production-ready software engineer";
  const weeklyHours = profile?.weeklyHours ?? 10;

  return (
    <div className="mx-auto max-w-6xl p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-5">
      {/* Header Greeting & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight">
              Good day, {greetingName} 👋
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs px-2.5 py-0.5 font-medium rounded-md">
              <Flame className="h-3.5 w-3.5 mr-1 fill-emerald-500/30" /> {streak.streakDays} Day Streak
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {profile
              ? `Goal: “${goalText}” • ${weeklyHours}h/week • ${profile.currentLevel}`
              : "Your AI engineering team is ready to guide your learning journey."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap w-full sm:w-auto">
          <Link href="/chat" className="flex-1 sm:flex-initial">
            <Button className="w-full sm:w-auto bg-violet-600 hover:bg-violet-500 text-white shadow-xs rounded-xl text-xs sm:text-sm font-semibold h-8.5 px-3.5">
              <MessageSquare className="h-4 w-4 mr-1.5" /> Ask Mentors
            </Button>
          </Link>
          <Link href="/roadmap" className="flex-1 sm:flex-initial">
            <Button variant="outline" className="w-full sm:w-auto rounded-xl text-xs sm:text-sm font-semibold h-8.5 px-3.5">
              Roadmap <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
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

      {/* Main Grid: Left (Roadmap & Actions) + Right (Mentors & Ongoing Topic Resources) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 sm:gap-5 items-start">
        {/* Left Column */}
        <div className="space-y-4 sm:space-y-5">
          <NextActionCard
            mentorLabel={currentNode?.mentorId ? `${currentNode.mentorId} Mentor` : "Tech Lead"}
            title={currentNode ? `Current Topic: ${currentNode.topic || currentNode.title}` : "Complete your learning profile"}
            description={currentNode?.description ?? "Set your goal and skills to generate your roadmap."}
            tags={currentConcepts}
            estimatedTime={currentNode ? `${currentNode.difficulty}` : ""}
            projectHref={currentNode ? `/projects` : "/dashboard"}
          />

          {/* Active Roadmap Progress — Clickable Interactive Track */}
          <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
            <CardHeader className="p-3.5 sm:p-4 pb-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-violet-500 shrink-0" /> Active Roadmap Track
                </CardTitle>
                <Link href="/roadmap">
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 hover:bg-violet-500/20 hover:text-violet-600 transition-colors cursor-pointer rounded-md">
                    {nodesTotal} Milestones →
                  </Badge>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Personalized curriculum based on “{goalText}” • Click milestone to open
              </p>
            </CardHeader>

            <CardContent className="p-3.5 sm:p-4 pt-0 space-y-2">
              {nodes.length > 0 ? (
                nodes.slice(0, 6).map((n) => {
                  const nodeTopic = n.topic || n.title;
                  return (
                    <Link
                      key={n.id}
                      href="/roadmap"
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border p-2.5 sm:p-3 transition-all shadow-xs group cursor-pointer ${
                        n.status === "current"
                          ? "border-l-4 border-l-violet-600 dark:border-l-violet-400 border-violet-500/40 bg-violet-500/[0.08] dark:bg-violet-500/12 shadow-2xs"
                          : n.status === "completed"
                          ? "border-emerald-500/25 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.05] opacity-90"
                          : n.status === "next"
                          ? "border-violet-500/30 border-dashed bg-card hover:bg-violet-500/[0.03]"
                          : "border-border/40 bg-muted/20 hover:bg-muted/40 opacity-75"
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="shrink-0 mt-0.5">
                          {n.status === "completed" && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />}
                          {n.status === "current" && (
                            <div className="h-4.5 w-4.5 rounded-full border-2 border-violet-500 flex items-center justify-center">
                              <div className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                            </div>
                          )}
                          {n.status === "next" && <Circle className="h-4.5 w-4.5 text-violet-500" />}
                          {n.status === "locked" && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-1.5 py-0.2 rounded-md">
                              Week {n.week ?? 1}
                            </span>
                            <p className={`text-xs sm:text-sm font-semibold leading-snug group-hover:text-violet-600 transition-colors ${
                              n.status === "current" ? "text-violet-600 dark:text-violet-400 font-bold" : "text-foreground"
                            }`}>
                              {nodeTopic}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">{n.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <Badge variant="outline" className="text-[10px] capitalize rounded-md">
                          {n.mentorId}
                        </Badge>
                        {n.status === "completed" && <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] rounded-md">✓ Done</Badge>}
                        {n.status === "current" && <Badge className="bg-violet-600 text-white text-[10px] font-bold rounded-md">⚡ Active</Badge>}
                        {n.status === "next" && <Badge variant="secondary" className="text-[10px] rounded-md">Next</Badge>}
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center">
                  <p className="text-sm font-medium text-foreground">No active roadmap track yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Save your learning profile above to generate your dynamic roadmap.
                  </p>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border-t border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-violet-500" /> Pace: {weeklyHours}h / week
                </span>
                <Link href="/roadmap" className="font-semibold text-violet-600 hover:underline flex items-center gap-1">
                  Manage & Edit Full Roadmap <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4 sm:space-y-5">
          {/* Active AI Mentors */}
          <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
            <CardHeader className="p-3.5 sm:p-4 pb-2.5">
              <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                <Brain className="h-4 w-4 text-violet-500 shrink-0" /> Your AI Engineering Team
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-4 pt-0 space-y-2.5">
              <MentorTeamCompact />
              <div className="rounded-xl border border-amber-500/20 p-2.5 bg-amber-500/5 text-xs space-y-1">
                <p className="font-semibold flex items-center gap-1 text-foreground text-xs">
                  <Zap className="h-3.5 w-3.5 text-amber-500" /> Tech Lead Orchestrator
                </p>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  Automatically routes queries, consults specialists in parallel, and synthesizes unified engineering answers.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Recommended Resources for Current Ongoing Topic */}
          <Card className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
            <CardHeader className="p-3.5 sm:p-4 pb-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-0.5">
                  <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" /> Topic Resources
                  </CardTitle>
                  {currentNode && (
                    <CardDescription className="text-xs text-muted-foreground">
                      Week {currentNode.week ?? 1}: <strong className="text-foreground">{currentTopic}</strong>
                    </CardDescription>
                  )}
                </div>

                {currentNode && (
                  <Link
                    href={`/resources?topic=${encodeURIComponent(currentTopic || "")}&week=${currentNode.week ?? 1}&concepts=${encodeURIComponent(currentConcepts.join(","))}`}
                  >
                    <Button size="sm" variant="outline" className="h-6.5 text-[11px] px-2 rounded-lg border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 cursor-pointer">
                      View All →
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-3.5 sm:p-4 pt-0 space-y-2">
              {currentTopicPack && currentTopicPack.allResources.length > 0 ? (
                <div className="space-y-2">
                  {currentTopicPack.allResources.slice(0, 3).map((r) => (
                    <ResourceCard key={r.url} r={r} compact />
                  ))}

                  <Link
                    href={`/resources?topic=${encodeURIComponent(currentTopic || "")}&week=${currentNode?.week ?? 1}&concepts=${encodeURIComponent(currentConcepts.join(","))}`}
                    className="block pt-0.5"
                  >
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold h-7.5 rounded-xl gap-1.5 shadow-xs">
                      <Sparkles className="h-3 w-3 text-violet-600" /> Explore All {currentTopicPack.allResources.length} Resources
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center space-y-2">
                  <p className="text-xs sm:text-sm font-semibold text-foreground">Resources are being prepared...</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Evaluated guides, videos, and GitHub starter projects for <strong className="text-foreground">{currentTopic}</strong> are being synced.
                  </p>
                  <Link href="/resources" className="inline-block pt-1">
                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-8">
                      Open Resource Discovery
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
