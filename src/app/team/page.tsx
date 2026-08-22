import { redirect } from "next/navigation";
import { auth, isAuthConfigured } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mentorList, orchestratorConfig } from "@/config/mentors";
import {
  Bot, Server, Palette, Cloud, ShieldCheck, Network,
  Sparkles, Zap, ArrowRight
} from "lucide-react";
import Link from "next/link";

const MENTOR_ICONS: Record<string, React.ReactNode> = {
  Bot: <Bot className="h-5 w-5" />,
  Server: <Server className="h-5 w-5" />,
  Palette: <Palette className="h-5 w-5" />,
  Cloud: <Cloud className="h-5 w-5" />,
  ShieldCheck: <ShieldCheck className="h-5 w-5" />,
  Network: <Network className="h-5 w-5" />,
};

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  let session: unknown = null;
  try {
    session = await (auth as unknown as () => Promise<unknown>)();
  } catch {}

  const configured = (() => {
    try { return isAuthConfigured(); } catch { return false; }
  })();

  const user = (session as { user?: { name?: string | null; email?: string | null; image?: string | null } } | null)?.user ?? null;

  if (!user) {
    redirect("/login?callbackUrl=/team");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={user} authConfigured={configured} isMockUser={false} />
      <div className="flex flex-1 flex-col min-w-0">
        <Header user={user} authConfigured={configured} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="mx-auto max-w-5xl space-y-6">

            {/* Page header */}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight text-foreground">
                My Mentor Team
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed max-w-3xl">
                Your personal team of 6 specialized AI engineering mentors, coordinated by a Tech Lead Orchestrator.
                Ask anything in the chat — the orchestrator picks the right expert(s) automatically.
              </p>
            </div>

            {/* Orchestrator card */}
            <Card className="border-2 border-primary/30 bg-primary/5 rounded-3xl overflow-hidden shadow-2xs">
              <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4 items-start justify-between">
                <div className="flex gap-4 items-start">
                  <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-2xs">
                    <Network className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-base text-foreground">{orchestratorConfig.name}</h2>
                      <Badge className="bg-primary text-primary-foreground border-0 text-[11px] font-semibold">Auto Router</Badge>
                      <Badge variant="outline" className="text-[11px] border-border/80">gpt-4o-mini → gpt-4o</Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">{orchestratorConfig.description}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500" /> Classifies intent in &lt;1s</span>
                      <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Parallel multi-mentor consultation</span>
                      <span className="flex items-center gap-1.5"><ArrowRight className="h-3.5 w-3.5 text-primary" /> Automated mentor handoffs</span>
                    </div>
                  </div>
                </div>
                <Link
                  href="/chat?mentor=auto"
                  className="shrink-0 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl transition shadow-2xs"
                >
                  Chat with Team
                </Link>
              </CardContent>
            </Card>

            {/* Mentor grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mentorList.map((mentor) => (
                <Card key={mentor.id} className="border border-border/80 hover:border-primary/40 bg-card rounded-2xl shadow-2xs hover:shadow-md transition-all">
                  <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-3 h-full">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="h-10 w-10 rounded-xl text-white flex items-center justify-center shrink-0 shadow-2xs"
                          style={{ background: mentor.color }}
                        >
                          {MENTOR_ICONS[mentor.icon] ?? <Bot className="h-5 w-5" />}
                        </div>
                        <Link
                          href={`/chat?mentor=${mentor.id}`}
                          className="text-xs font-semibold border border-border/80 rounded-xl px-3 py-1 bg-background hover:bg-muted transition-colors shrink-0 shadow-2xs"
                        >
                          Chat
                        </Link>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-foreground">{mentor.name}</h3>
                        </div>
                        <Badge
                          className="mt-1 text-white border-0 text-[10px] font-semibold"
                          style={{ background: mentor.color }}
                        >
                          {mentor.role}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{mentor.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-2 border-t border-border/60">
                      {mentor.expertise.slice(0, 4).map((e) => (
                        <Badge key={e} variant="secondary" className="text-[10px] px-1.5 py-0.2 rounded-md bg-muted/60 text-foreground border border-border/60">{e}</Badge>
                      ))}
                      {mentor.expertise.length > 4 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.2 rounded-md">+{mentor.expertise.length - 4}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* How orchestration works */}
            <Card className="border border-dashed border-border/80 bg-card rounded-3xl">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" /> How the orchestrator works
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <ol className="text-xs sm:text-sm text-muted-foreground space-y-2 list-decimal list-inside leading-relaxed">
                  <li>You send a message in the Chat — no need to pick a mentor manually.</li>
                  <li>The orchestrator classifies intent and picks the best specialist(s) for your query.</li>
                  <li>For cross-domain questions, multiple mentors are consulted in parallel and their answers are synthesized.</li>
                  <li>Mentors can hand off to each other mid-conversation (e.g. Backend → Security for auth threat review).</li>
                  <li>You can also bypass the orchestrator and talk directly to any mentor using the dropdown in the chat header.</li>
                </ol>
              </CardContent>
            </Card>

          </div>
        </main>
      </div>
    </div>
  );
}
