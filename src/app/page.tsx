import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MentorTeamGrid } from "@/components/dashboard/mentor-team";
import {
  Sparkles,
  ArrowRight,
  Bot,
  Server,
  ShieldCheck,
  Network,
  Search,
  Star,
  GitBranch,
  Users,
  Zap,
  BookOpen,
  Hammer,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex h-[64px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-card shadow-sm">
              <Image
                src="/logo.png"
                alt="SkillFarm Logo"
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <span className="font-heading text-base font-extrabold leading-none text-white">
                Skill
              </span>
              <span className="font-heading text-base font-extrabold leading-none bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Farm
              </span>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Plant knowledge. Grow skills. Ship real things.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Dashboard
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Sign in <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 sm:pt-20 pb-12">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 items-center">
          <div>
            <Badge className="bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20 gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />{" "}
              Orchestrator live • 6 mentors online
            </Badge>
            <h1 className="mt-6 font-heading text-4xl sm:text-5xl lg:text-[52px] font-bold leading-[1.02] tracking-tight text-balance">
              Plant knowledge.{" "}
              <span className="text-primary">Grow skills.</span> Ship real
              things.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground max-w-xl">
              Your AI Engineering Team — learn what matters, get guidance from
              specialized experts, build real projects, and ship them into the
              real world.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="h-11 px-6 bg-primary hover:bg-primary/90"
                >
                  Open Dashboard <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#team">
                <Button size="lg" variant="outline" className="h-11 px-6">
                  Meet the team
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1">
                <Zap className="h-3 w-3 text-amber-500" /> Streaming
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1">
                <GitBranch className="h-3 w-3 text-violet-500" /> Handoffs
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1">
                <Search className="h-3 w-3 text-blue-500" /> Research
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1">
                <BookOpen className="h-3 w-3 text-emerald-500" /> Roadmaps
              </span>
            </div>

            <div className="mt-6 flex items-center gap-3 text-sm">
              <div className="flex -space-x-2">
                <img
                  src="https://i.pravatar.cc/100?img=14"
                  alt=""
                  className="h-7 w-7 rounded-full border-2 border-background"
                />
                <img
                  src="https://i.pravatar.cc/100?img=33"
                  alt=""
                  className="h-7 w-7 rounded-full border-2 border-background"
                />
                <img
                  src="https://i.pravatar.cc/100?img=22"
                  alt=""
                  className="h-7 w-7 rounded-full border-2 border-background"
                />
              </div>
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">1,200+</span>{" "}
                engineers growing skills on SkillFarm
              </p>
            </div>
          </div>

          {/* Visual mock — orchestrator flow */}
          <Card className="overflow-hidden border-muted/50 shadow-xl">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-[#0F1117] to-[#1a1d29] p-6 text-white">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center">
                    <Network className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-none">
                      Orchestrator
                    </p>
                    <p className="text-xs text-zinc-400">
                      Tech Lead • auto-routes to specialists
                    </p>
                  </div>
                  <Badge className="ml-auto bg-emerald-500 text-white border-0 text-xs">
                    Routing…
                  </Badge>
                </div>

                <div className="mt-6 rounded-xl bg-white/[0.06] border border-white/10 p-4">
                  <p className="text-xs text-zinc-400">User</p>
                  <p className="text-sm font-medium text-white mt-1">
                    “I’m building a SaaS app with AI. How do I handle auth,
                    database schema and deployment?”
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { name: "Backend", icon: Server, color: "bg-[#4F9CF9]" },
                    { name: "AI Mentor", icon: Bot, color: "bg-[#7C5CFC]" },
                    {
                      name: "Security",
                      icon: ShieldCheck,
                      color: "bg-red-500",
                    },
                  ].map((m) => (
                    <div
                      key={m.name}
                      className="rounded-lg bg-white/[0.06] border border-white/10 p-3 text-center"
                    >
                      <div
                        className={`mx-auto h-8 w-8 rounded-md ${m.color} flex items-center justify-center`}
                      >
                        <m.icon className="h-4 w-4 text-white" />
                      </div>
                      <p className="mt-2 text-xs font-medium">{m.name}</p>
                      <p className="text-[11px] text-zinc-400">consulted</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                  Parallel execution • 2.1s synthesized
                </div>
              </div>

              <div className="p-6 bg-card">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  <Star className="h-3 w-3 text-amber-500" /> Why this matters
                </div>
                <p className="mt-2 text-sm leading-relaxed">
                  You don’t pick a mentor manually. The orchestrator understands
                  your intent, gathers only the experts you need, and
                  synthesizes actionable solutions.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Badge variant="secondary">Handoff visualized</Badge>
                  <Badge variant="secondary">Intent detection</Badge>
                  <Badge variant="secondary">Parallel research</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trust / features */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div className="flex gap-3">
              <div className="h-9 w-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="font-semibold">Team, not a chatbot</p>
                <p className="text-muted-foreground leading-relaxed">
                  Specialist mentors + handoffs + deep memory of your goals and
                  progress.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Search className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold">Research, evaluated</p>
                <p className="text-muted-foreground leading-relaxed">
                  Every URL scored for authority, freshness, and practical value
                  — with plain reasoning.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Hammer className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold">Ship real things</p>
                <p className="text-muted-foreground leading-relaxed">
                  Each roadmap node ships with a practical task and real-world
                  project brief.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mentor team */}
      <section
        id="team"
        className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16"
      >
        <div className="max-w-2xl">
          <Badge variant="outline" className="text-xs">
            Meet your team
          </Badge>
          <h2 className="mt-3 font-heading text-2xl sm:text-3xl font-bold tracking-tight">
            Six specialists. One tech lead.
          </h2>
          <p className="mt-2 text-muted-foreground">
            Each mentor has a distinct system prompt, expertise, tool allowlist,
            and handoff rules. The orchestrator decides who you need — you just
            ask.
          </p>
        </div>
        <div className="mt-8">
          <MentorTeamGrid />
        </div>

        <Card className="mt-8 border-dashed bg-muted/30">
          <CardContent className="p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <p className="font-semibold flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-violet-600" /> Mentor handoff
                — how it feels
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Backend Mentor → “Auth needs security expertise.” →{" "}
                <span className="font-medium text-foreground">
                  🔄 Handed off to Cybersecurity Mentor
                </span>{" "}
                → synthesized back.
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                See live demo in dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row gap-4 items-center justify-between text-sm">
          <p className="text-muted-foreground">
            © {new Date().getFullYear()} SkillFarm — Plant knowledge. Grow
            skills. Ship real things.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <a href="https://github.com" className="hover:underline">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
