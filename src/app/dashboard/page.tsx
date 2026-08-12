import Link from "next/link";
import { auth, isAuthConfigured, isDatabaseConfigured } from "@/lib/auth";
import { getLearningProfile } from "@/lib/learning-profile";
import { saveProfileAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats, NextActionCard } from "@/components/dashboard/stats";
import { MentorTeamCompact } from "@/components/dashboard/mentor-team";
import { ResourceCard, mockResources } from "@/components/resources/resource-card";
import { LearningProfileForm } from "@/components/profile/learning-profile-form";
import {
  MessageSquare,
  ArrowRight,
  Sparkles,
  GitBranch,
  Clock,
  CheckCircle2,
  Circle,
  Lock,
  ShieldCheck,
  Flame,
  Brain,
  Zap,
} from "lucide-react";

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
  const greetingName = user?.name?.split(" ")[0] ?? (user ? "there" : "Alex");
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
              <Flame className="h-3.5 w-3.5 mr-1 fill-emerald-500/30" /> 7 Day Streak
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

      {/* Learning Profile Setup */}
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

      {profile && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Learning Profile Active</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Known: {profile.knownSkills.join(", ")} • Level: {profile.currentLevel} • {profile.weeklyHours}h/week • Style: {profile.learningStyle}
                </p>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white text-xs">Active Context</Badge>
          </CardContent>
        </Card>
      )}

      {/* Metrics Row */}
      <DashboardStats />

      {/* Main Grid with Spacing */}
      <div className="grid lg:grid-cols-[1.7fr_1fr] gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          <NextActionCard />

          {/* Active Roadmap Progress */}
          <Card className="border-muted/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-violet-500" /> Active Roadmap Track
                </CardTitle>
                <Badge variant="secondary" className="text-xs">7 Active Nodes</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Personalized path based on goal: “{goalText}”
              </p>
            </CardHeader>

            <CardContent className="space-y-3">
              {[
                { title: "Node.js Fundamentals & ESM", desc: "Event loop, streams, ESM modules", status: "completed", mentor: "Backend" },
                { title: "HTTP & REST API Design", desc: "Verbs, status codes, OpenAPI specs", status: "completed", mentor: "Backend" },
                { title: "Express / Fastify & Zod", desc: "Routing, middleware, edge validation", status: "completed", mentor: "Backend" },
                { title: "PostgreSQL & Drizzle ORM", desc: "Schema, indexing, migrations", status: "current", mentor: "Backend" },
                { title: "Authentication & Security", desc: "JWT, httpOnly cookies, OAuth 2.0", status: "next", mentor: "Security" },
                { title: "Caching with Upstash Redis", desc: "TTL, cache keys, rate limiting", status: "locked", mentor: "Backend" },
                { title: "Docker Containerization", desc: "Multi-stage builds, deployment", status: "locked", mentor: "DevOps" },
              ].map((n) => (
                <div key={n.title} className="flex items-center gap-4 rounded-xl border p-4 bg-card hover:bg-muted/40 transition-colors">
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
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
                  </div>
                  <Badge variant="outline" className="hidden sm:inline-flex text-xs">{n.mentor}</Badge>
                  {n.status === "completed" && <Badge className="bg-emerald-600 text-white text-xs">Done</Badge>}
                  {n.status === "current" && <Badge className="bg-violet-600 text-white text-xs">Current</Badge>}
                  {n.status === "next" && <Badge variant="secondary" className="text-xs">Up next</Badge>}
                </div>
              ))}

              <div className="pt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Est: 6–8 weeks at {weeklyHours}h/week
                </span>
                <Link href="/roadmap" className="font-semibold text-violet-500 hover:underline">
                  Full Roadmap →
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

          {/* Evaluated Resources */}
          <Card className="border-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recommended Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockResources.slice(0, 3).map((r) => (
                <ResourceCard key={r.id} r={r} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
