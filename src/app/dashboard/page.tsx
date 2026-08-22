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
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8 space-y-8 sm:space-y-10">
      {/* Level 1: Page Header & Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Good day, {greetingName} 👋
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs px-2.5 py-0.5 font-semibold rounded-md">
              <Flame className="h-3.5 w-3.5 mr-1 fill-emerald-500/20" /> {streak.streakDays} Day Momentum
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {profile
              ? `Target: “${goalText}” • ${weeklyHours}h/week • ${profile.currentLevel}`
              : "Your dedicated AI engineering team is ready to guide your journey."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap w-full sm:w-auto">
          <Link href="/chat" className="flex-1 sm:flex-initial">
            <Button className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs rounded-xl text-xs sm:text-sm font-semibold h-9 px-4">
              <MessageSquare className="h-4 w-4 mr-1.5" /> Ask Mentors
            </Button>
          </Link>
          <Link href="/roadmap" className="flex-1 sm:flex-initial">
            <Button variant="outline" className="w-full sm:w-auto rounded-xl text-xs sm:text-sm font-semibold h-9 px-4 border-border/80">
              Roadmap <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Level 2: Learning Profile Context Card */}
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

      {/* Level 2: Real Progress Metrics Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your Progress & Cadence</h2>
        </div>
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
      </section>

      {/* Level 2: Primary Content Section (Active Track + Team & Resources) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6 sm:gap-8 items-start">
        {/* Left Column: Recommended Step + Interactive Roadmap Track */}
        <section className="space-y-6">
          <NextActionCard
            mentorLabel={currentNode?.mentorId ? `${currentNode.mentorId} Mentor` : "Tech Lead"}
            title={currentNode ? `Current Focus: ${currentNode.topic || currentNode.title}` : "Complete your learning profile"}
            description={currentNode?.description ?? "Set your goal and skills to generate your roadmap."}
            tags={currentConcepts}
            estimatedTime={currentNode ? `${currentNode.difficulty}` : ""}
            projectHref={currentNode ? `/projects` : "/dashboard"}
          />

          {/* Active Roadmap Track */}
          <div className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
            <div className="p-4 sm:p-5 pb-3 border-b border-border/60 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary shrink-0" /> Active Roadmap Track
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Concept-first curriculum for “{goalText}”
                </p>
              </div>
              <Link href="/roadmap">
                <Badge variant="secondary" className="text-[11px] px-2 py-0.5 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer rounded-md">
                  {nodesTotal} Milestones →
                </Badge>
              </Link>
            </div>

            <div className="p-4 sm:p-5 space-y-2.5">
              {nodes.length > 0 ? (
                nodes.slice(0, 6).map((n) => {
                  const nodeTopic = n.topic || n.title;
                  return (
                    <Link
                      key={n.id}
                      href="/roadmap"
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3 transition-all shadow-2xs group cursor-pointer ${
                        n.status === "current"
                          ? "border-2 border-l-4 border-l-primary border-primary/50 bg-primary/[0.06] shadow-xs"
                          : n.status === "completed"
                          ? "border-emerald-500/30 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05] hover:bg-emerald-500/[0.08]"
                          : n.status === "next"
                          ? "border-primary/30 border-dashed bg-card hover:bg-primary/[0.03]"
                          : "border-border/60 bg-muted/20 hover:bg-muted/40 opacity-75"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="shrink-0 mt-0.5">
                          {n.status === "completed" && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />}
                          {n.status === "current" && (
                            <div className="h-4.5 w-4.5 rounded-full border-2 border-primary flex items-center justify-center">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                            </div>
                          )}
                          {n.status === "next" && <Circle className="h-4.5 w-4.5 text-primary" />}
                          {n.status === "locked" && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded-md">
                              Week {n.week ?? 1}
                            </span>
                            <p className={`text-xs sm:text-sm font-semibold leading-snug group-hover:text-primary transition-colors ${
                              n.status === "current" ? "text-primary font-bold" : "text-foreground"
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
                        {n.status === "current" && <Badge className="bg-primary text-primary-foreground text-[10px] font-bold rounded-md">⚡ Active</Badge>}
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

              <div className="pt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs border-t border-border/50">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Pace: {weeklyHours}h / week
                </span>
                <Link href="/roadmap" className="font-semibold text-primary hover:underline flex items-center gap-1">
                  Manage & Edit Full Roadmap <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: AI Mentors & Ongoing Resources */}
        <section className="space-y-6">
          {/* AI Engineering Team Card */}
          <div className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
            <div className="p-4 sm:p-5 pb-3 border-b border-border/60">
              <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary shrink-0" /> AI Engineering Team
              </h3>
            </div>
            <div className="p-4 sm:p-5 space-y-3">
              <MentorTeamCompact />
              <div className="rounded-xl border border-border/80 p-3 bg-muted/30 text-xs space-y-1">
                <p className="font-semibold flex items-center gap-1 text-foreground text-xs">
                  <Zap className="h-3.5 w-3.5 text-amber-500" /> Tech Lead Orchestrator
                </p>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  Automatically routes queries, consults specialists in parallel, and synthesizes unified engineering answers.
                </p>
              </div>
            </div>
          </div>

          {/* Recommended Resources for Current Topic */}
          <div className="rounded-2xl border border-border/80 shadow-xs bg-card overflow-hidden">
            <div className="p-4 sm:p-5 pb-3 border-b border-border/60 flex items-center justify-between flex-wrap gap-2">
              <div className="space-y-0.5">
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary shrink-0" /> Topic Resources
                </h3>
                {currentNode && (
                  <p className="text-xs text-muted-foreground">
                    Week {currentNode.week ?? 1}: <strong className="text-foreground">{currentTopic}</strong>
                  </p>
                )}
              </div>

              {currentNode && (
                <Link
                  href={`/resources?topic=${encodeURIComponent(currentTopic || "")}&week=${currentNode.week ?? 1}&concepts=${encodeURIComponent(currentConcepts.join(","))}`}
                >
                  <Button size="sm" variant="outline" className="h-6.5 text-[11px] px-2 rounded-lg border-border text-primary hover:bg-muted cursor-pointer">
                    View All →
                  </Button>
                </Link>
              )}
            </div>

            <div className="p-4 sm:p-5 space-y-2.5">
              {currentTopicPack && currentTopicPack.allResources.length > 0 ? (
                <div className="space-y-2.5">
                  {currentTopicPack.allResources.slice(0, 3).map((r) => (
                    <ResourceCard key={r.url} r={r} compact />
                  ))}

                  <Link
                    href={`/resources?topic=${encodeURIComponent(currentTopic || "")}&week=${currentNode?.week ?? 1}&concepts=${encodeURIComponent(currentConcepts.join(","))}`}
                    className="block pt-1"
                  >
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold h-8 rounded-xl gap-1.5 shadow-2xs border-border/80">
                      <Sparkles className="h-3 w-3 text-primary" /> Explore All {currentTopicPack.allResources.length} Resources
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-6 text-center space-y-2">
                  <p className="text-xs sm:text-sm font-semibold text-foreground">Resources are being prepared...</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Evaluated guides, videos, and GitHub starter projects for <strong className="text-foreground">{currentTopic}</strong> are ready for discovery.
                  </p>
                  <Link href="/resources" className="inline-block pt-1">
                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-8 border-border">
                      Open Resource Discovery
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
