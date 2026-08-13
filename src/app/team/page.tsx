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
  const isMockUser = !configured && !user;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={user} authConfigured={configured} isMockUser={isMockUser} />
      <div className="flex flex-1 flex-col min-w-0">
        <Header user={user} authConfigured={configured} />
        <main className="flex-1 bg-muted/30 p-6">
          <div className="mx-auto max-w-4xl space-y-6">

            {/* Page header */}
            <div>
              <h1 className="text-2xl font-bold font-heading tracking-tight">My Mentor Team</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Your personal team of 6 specialized AI engineering mentors, coordinated by a Tech Lead Orchestrator.
                Ask anything in the chat — the orchestrator picks the right expert(s) automatically.
              </p>
            </div>

            {/* Orchestrator card */}
            <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-background">
              <CardContent className="p-5 flex gap-4 items-start">
                <div className="h-12 w-12 rounded-xl bg-[#7C5CFC] text-white flex items-center justify-center shrink-0">
                  <Network className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold">{orchestratorConfig.name}</h2>
                    <Badge className="bg-[#7C5CFC] text-white border-0 text-[11px]">Auto Router</Badge>
                    <Badge variant="outline" className="text-[11px]">gpt-4o-mini → gpt-4o</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{orchestratorConfig.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-violet-500" /> Classifies intent in &lt;1s</span>
                    <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-violet-500" /> Parallel multi-mentor consultation</span>
                    <span className="flex items-center gap-1"><ArrowRight className="h-3 w-3 text-violet-500" /> Automated mentor handoffs</span>
                  </div>
                </div>
                <Link
                  href="/chat?mentor=auto"
                  className="shrink-0 text-xs bg-[#7C5CFC] text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition"
                >
                  Chat
                </Link>
              </CardContent>
            </Card>

            {/* Mentor grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mentorList.map((mentor) => (
                <Card key={mentor.id} className="border-muted/50 hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="h-10 w-10 rounded-xl text-white flex items-center justify-center shrink-0"
                        style={{ background: mentor.color }}
                      >
                        {MENTOR_ICONS[mentor.icon] ?? <Bot className="h-5 w-5" />}
                      </div>
                      <Link
                        href={`/chat?mentor=${mentor.id}`}
                        className="text-xs border rounded-lg px-2.5 py-1 hover:bg-muted transition shrink-0"
                      >
                        Chat
                      </Link>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{mentor.name}</h3>
                      </div>
                      <Badge
                        className="mt-1 text-white border-0 text-[10px]"
                        style={{ background: mentor.color }}
                      >
                        {mentor.role}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">{mentor.description}</p>

                    <div className="flex flex-wrap gap-1">
                      {mentor.expertise.slice(0, 4).map((e) => (
                        <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>
                      ))}
                      {mentor.expertise.length > 4 && (
                        <Badge variant="outline" className="text-[10px]">+{mentor.expertise.length - 4}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* How orchestration works */}
            <Card className="border-dashed bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" /> How the orchestrator works
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside leading-relaxed">
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
