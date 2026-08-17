import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MentorTeamGrid } from "@/components/dashboard/mentor-team";
import {
  Sparkles,
  ArrowRight,
  GitBranch,
  Search,
  Zap,
  BookOpen,
  Hammer,
  Network,
  LogOut,
  Target,
  Brain,
  Cpu,
  Flame,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

function GithubIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function XIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedinIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

function InstagramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

export default async function LandingPage() {
  let session: unknown = null;
  try {
    session = await (auth as unknown as () => Promise<unknown>)();
  } catch (err) {
    console.error("[landing/page] auth() error:", err);
  }
  const user = (session as unknown as { user?: { name?: string | null; email?: string | null; image?: string | null } } | null)?.user ?? null;

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      {/* Header Navbar */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex h-[64px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 group">
            {/* Free borderless logo */}
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center group-hover:scale-105 transition-transform">
              <Image
                src="/logo.png"
                alt="SkillFarm Logo"
                width={42}
                height={42}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <span className="font-heading text-base font-extrabold leading-none text-foreground">
                Skill
              </span>
              <span className="font-heading text-base font-extrabold leading-none bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Farm
              </span>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Plant knowledge. Grow skills. Ship real things.
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-xs font-semibold rounded-xl">
                Dashboard
              </Button>
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                <Link href="/dashboard" className="flex items-center gap-2 group">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name ?? "User"}
                      className="h-8 w-8 rounded-full object-cover ring-2 ring-violet-500/30 group-hover:ring-violet-500 transition-all shadow-xs"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-violet-500/30 shadow-xs">
                      {user.name?.[0] ?? user.email?.[0]?.toUpperCase() ?? "U"}
                    </div>
                  )}
                  <span className="text-xs font-bold text-foreground hidden md:inline">
                    {user.name?.split(" ")[0] ?? "Profile"}
                  </span>
                </Link>
                <Link href="/login">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground" title="Sign Out">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <Link href="/login">
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl shadow-xs"
                >
                  Sign In <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-12 sm:pt-16 pb-12">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
            <div>
              <Badge className="bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20 gap-1.5 font-semibold text-xs px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />{" "}
                Orchestrator Live • 6 AI Mentors Online
              </Badge>
              <h1 className="mt-5 font-heading text-4xl sm:text-5xl lg:text-[50px] font-bold leading-[1.04] tracking-tight text-balance">
                Plant knowledge.{" "}
                <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">Grow skills.</span> Ship real things.
              </h1>
              <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-xl">
                Your autonomous AI Engineering Team — learn core mental models, receive guidance from specialized mentors, and apply concepts directly into a production portfolio Main-Project.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    className="h-11 px-6 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl shadow-xs"
                  >
                    Open Dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#team">
                  <Button size="lg" variant="outline" className="h-11 px-6 font-semibold rounded-xl">
                    Meet Your Team
                  </Button>
                </Link>
              </div>

              <div className="mt-7 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 bg-card">
                  <Zap className="h-3 w-3 text-amber-500" /> Streaming Orchestrator
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 bg-card">
                  <GitBranch className="h-3 w-3 text-violet-500" /> Mentor Handoffs
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 bg-card">
                  <Search className="h-3 w-3 text-blue-500" /> Scored Resources
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 bg-card">
                  <Brain className="h-3 w-3 text-purple-500" /> Personalized Long-Term Memory
                </span>
              </div>
            </div>

            {/* Complete SkillFarm End-to-End Learning Engine Flow */}
            <div className="rounded-3xl border border-border/80 bg-card/60 backdrop-blur p-5 sm:p-6 shadow-md space-y-3.5">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-violet-600" /> SkillFarm Learning Flow
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">How your personalized journey works</p>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/20 bg-emerald-500/10 font-semibold">
                  End-to-End
                </Badge>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* 1. Learning Profile */}
                <div className="rounded-2xl border bg-muted/20 p-2.5 sm:p-3 flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    1
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-blue-500" /> Learning Profile
                    </p>
                    <p className="text-muted-foreground leading-snug text-[11px] mt-0.5">
                      Set your career goal, existing skillset, weekly hours, and preferred learning pace.
                    </p>
                  </div>
                </div>

                {/* 2. Concept-First Roadmap */}
                <div className="rounded-2xl border bg-muted/20 p-2.5 sm:p-3 flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    2
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-violet-500" /> Concept-First Roadmap
                    </p>
                    <p className="text-muted-foreground leading-snug text-[11px] mt-0.5">
                      Structured weekly curriculum teaching foundational mental models before project implementation.
                    </p>
                  </div>
                </div>

                {/* 3. Main-Project Application */}
                <div className="rounded-2xl border bg-muted/20 p-2.5 sm:p-3 flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    3
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <Hammer className="h-3.5 w-3.5 text-emerald-500" /> Production Main-Project
                    </p>
                    <p className="text-muted-foreground leading-snug text-[11px] mt-0.5">
                      Apply every weekly concept directly into ONE unified portfolio codebase with step-by-step briefs.
                    </p>
                  </div>
                </div>

                {/* 4. Evaluated Resources */}
                <div className="rounded-2xl border bg-muted/20 p-2.5 sm:p-3 flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    4
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5 text-amber-500" /> Roadmap-Driven Resources
                    </p>
                    <p className="text-muted-foreground leading-snug text-[11px] mt-0.5">
                      Automatic search across documentation, YouTube, and GitHub—scored for quality, depth, and relevance.
                    </p>
                  </div>
                </div>

                {/* 5. Specialist Mentors */}
                <div className="rounded-2xl border bg-muted/20 p-2.5 sm:p-3 flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                    5
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-purple-500" /> Specialist AI Mentors
                    </p>
                    <p className="text-muted-foreground leading-snug text-[11px] mt-0.5">
                      Ask doubts anytime—Tech Lead orchestrates 6 specialist mentors with automated handoffs.
                    </p>
                  </div>
                </div>

                {/* 6. Personalized Long-Term Memory */}
                <div className="rounded-2xl border-2 border-violet-500/40 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 p-2.5 sm:p-3 flex items-start gap-2.5 shadow-2xs">
                  <div className="h-7 w-7 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs shadow-xs">
                    ★
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1">
                        <Brain className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" /> Personalized Long-Term Memory
                      </p>
                      <Badge className="bg-violet-600 text-white text-[9px] px-1.5 py-0">Adaptive</Badge>
                    </div>
                    <p className="text-muted-foreground leading-snug text-[11px] mt-0.5">
                      Mentors remember your past bottlenecks, preferred technologies, project architecture, and velocity across every conversation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mentor Team Section */}
        <section id="team" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 border-t">
          <div className="max-w-2xl">
            <Badge variant="outline" className="text-xs font-semibold">
              Meet Your Team
            </Badge>
            <h2 className="mt-3 font-heading text-2xl sm:text-3xl font-bold tracking-tight">
              Six Specialists. One Tech Lead.
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
              Each mentor possesses distinct domain expertise, system prompts, tool capabilities, and handoff protocols. The Tech Lead automatically consults specialists in parallel.
            </p>
          </div>

          <div className="mt-8">
            <MentorTeamGrid />
          </div>

          <Card className="mt-8 rounded-3xl border-dashed bg-muted/20">
            <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <p className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-violet-600" /> Dynamic Mentor Handoffs
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                  Backend Mentor → “Auth token architecture requires cryptography & threat modeling.” →{" "}
                  <span className="font-semibold text-foreground">
                    🔄 Seamless handoff to Cybersecurity Specialist
                  </span>{" "}
                  → unified technical answer.
                </p>
              </div>
              <Link href="/chat">
                <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold h-8.5 shrink-0">
                  Chat with Team <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Polish Structured Footer */}
      <footer className="border-t bg-card/60 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Block */}
            <div className="space-y-3 md:col-span-1">
              <Link href="/" className="flex items-center gap-2.5">
                {/* Free borderless footer logo */}
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="SkillFarm Logo"
                    width={36}
                    height={36}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex items-center">
                  <span className="font-heading text-base font-extrabold leading-none text-foreground">
                    Skill
                  </span>
                  <span className="font-heading text-base font-extrabold leading-none bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                    Farm
                  </span>
                </div>
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Plant knowledge. Grow skills. Ship real things. Autonomous AI-guided engineering learning with adaptive personalized guidance & long-term memory.
              </p>
            </div>

            {/* Product Links */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">Product</p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li><Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link></li>
                <li><Link href="/roadmap" className="hover:text-foreground transition-colors">Learning Roadmap</Link></li>
                <li><Link href="/chat" className="hover:text-foreground transition-colors">Mentor Chat</Link></li>
                <li><Link href="/knowledge" className="hover:text-foreground transition-colors">Knowledge Graph</Link></li>
                <li><Link href="/resources" className="hover:text-foreground transition-colors">Resource Discovery</Link></li>
              </ul>
            </div>

            {/* Platform / Specialists */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">AI Engineering Team</p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li><Link href="/chat?mentor=backend" className="hover:text-foreground transition-colors">Backend Architect</Link></li>
                <li><Link href="/chat?mentor=ai-engineer" className="hover:text-foreground transition-colors">AI & LLM Engineer</Link></li>
                <li><Link href="/chat?mentor=security" className="hover:text-foreground transition-colors">Cybersecurity Lead</Link></li>
                <li><Link href="/chat?mentor=devops" className="hover:text-foreground transition-colors">DevOps & Cloud Specialist</Link></li>
                <li><Link href="/team" className="hover:text-foreground transition-colors">Meet Full Team →</Link></li>
              </ul>
            </div>

            {/* Connect / Socials */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">Connect & Socials</p>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-xl border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-2xs"
                  title="GitHub"
                >
                  <GithubIcon className="h-4 w-4" />
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-xl border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-2xs"
                  title="X (Twitter)"
                >
                  <XIcon className="h-4 w-4" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-xl border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-2xs"
                  title="LinkedIn"
                >
                  <LinkedinIcon className="h-4 w-4" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-xl border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-2xs"
                  title="Instagram"
                >
                  <InstagramIcon className="h-4 w-4" />
                </a>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                Open ecosystem for modern software engineering mastery.
              </p>
            </div>
          </div>

          <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} SkillFarm. Plant knowledge. Grow skills. Ship real things.</p>
            <div className="flex items-center gap-4">
              <Link href="/settings" className="hover:underline">Settings</Link>
              <Link href="/roadmap" className="hover:underline">Roadmap</Link>
              <Link href="/dashboard" className="hover:underline">Dashboard</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
