import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowUpRight, Clock, Target, Flame, BookOpen } from "lucide-react";

export function DashboardStats() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-muted/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Progress</p>
            <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 text-[11px]">72% complete</Badge>
          </div>
          <p className="mt-3 font-heading text-2xl font-bold">HTTP & APIs</p>
          <p className="text-sm text-muted-foreground">8 of 11 nodes completed</p>
          <Progress value={72} className="mt-4 h-2" />
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Next: Auth • ~2h</p>
        </CardContent>
      </Card>

      <Card className="border-muted/50">
        <CardContent className="p-5">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Goals</p>
          <p className="mt-3 font-heading text-lg font-bold leading-tight">Become a production-ready backend developer</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs"><Target className="h-3 w-3 mr-1" /> SaaS</Badge>
            <Badge variant="secondary" className="text-xs">10h / week</Badge>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-violet-500" /> Active since Aug 2026
          </div>
        </CardContent>
      </Card>

      <Card className="border-muted/50 bg-gradient-to-br from-violet-600 to-indigo-600 text-white border-0">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-widest text-violet-100 uppercase">Streak</p>
            <Flame className="h-4 w-4 text-orange-200" />
          </div>
          <p className="mt-3 font-heading text-3xl font-bold">12 days</p>
          <p className="text-sm text-violet-100">Keep it up! You&apos;re in the top 8%.</p>
          <div className="mt-4 flex gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={`h-6 flex-1 rounded-md ${i < 5 ? "bg-white" : "bg-white/30"}`} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function NextActionCard() {
  return (
    <Card className="border-muted/50 overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-900 dark:to-[#1a1d29] p-5 border-b">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-violet-400" />
            <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">Recommended next step</p>
            <Badge className="ml-auto bg-violet-600 text-white hover:bg-violet-700 text-[11px]">Backend Mentor</Badge>
          </div>
          <h3 className="mt-3 font-heading text-lg font-semibold text-white">Build a REST API with authentication</h3>
          <p className="mt-1 text-sm text-zinc-400">You&apos;ve mastered HTTP + Express. Now wire up JWT, refresh tokens, and protected routes — then hand off to Security for a review.</p>
          <div className="mt-4 flex gap-2">
            <Badge variant="secondary" className="bg-white/10 text-zinc-200 border-white/10">JWT</Badge>
            <Badge variant="secondary" className="bg-white/10 text-zinc-200 border-white/10">Prisma</Badge>
            <Badge variant="secondary" className="bg-white/10 text-zinc-200 border-white/10">Testing</Badge>
          </div>
        </div>
        <div className="p-5 flex items-center justify-between bg-card">
          <div className="text-sm">
            <p className="font-medium">Practical project • ~4 hours</p>
            <p className="text-xs text-muted-foreground">Includes starter repo + checklist + mentor review</p>
          </div>
          <a href="#" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Start project <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
