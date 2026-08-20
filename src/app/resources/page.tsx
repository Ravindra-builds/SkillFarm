import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { auth, isAuthConfigured } from "@/lib/auth";
import { ResearchPanel } from "@/components/resources/research-panel";
import { getRoadmap } from "@/lib/roadmap-store";
import { getLearningProfile } from "@/lib/learning-profile";

export const dynamic = "force-dynamic";

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams?: Promise<{ topic?: string; week?: string; concepts?: string; query?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  let session: unknown = null;
  try {
    session = await (auth as unknown as () => Promise<unknown>)();
  } catch {}
  const configured = (() => {
    try {
      return isAuthConfigured();
    } catch {
      return false;
    }
  })();
  const user = (session as unknown as { user?: { name?: string | null; email?: string | null; image?: string | null } } | null)?.user ?? null;

  if (!user) {
    redirect("/login?callbackUrl=/resources");
  }

  const userId = user.email ?? (user as unknown as { id?: string }).id ?? "guest";

  let initialTopic = resolvedParams.topic;
  let initialWeek = resolvedParams.week ? parseInt(resolvedParams.week, 10) : undefined;
  let initialConcepts = resolvedParams.concepts ? resolvedParams.concepts.split(",").map((c) => c.trim()).filter(Boolean) : undefined;
  let fallbackQuery = resolvedParams.query || "Best resources to learn Node.js, PostgreSQL and AI Engineering";

  if (!initialTopic) {
    try {
      const roadmap = await getRoadmap(userId);
      const currentNode = roadmap?.nodes.find((n) => n.status === "current") ?? roadmap?.nodes.find((n) => n.status === "next") ?? roadmap?.nodes[0];
      if (currentNode) {
        initialTopic = currentNode.topic || currentNode.theme || currentNode.title;
        initialWeek = currentNode.week ?? 1;
        initialConcepts = currentNode.concepts && currentNode.concepts.length > 0 ? currentNode.concepts : currentNode.relatedConcepts;
      } else {
        const profile = await getLearningProfile(userId);
        if (profile?.goal) {
          fallbackQuery = `Best resources to learn ${profile.goal}`;
        }
      }
    } catch (err) {
      console.error("[resources/page] failed to build dynamic topic/query:", err);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={user} authConfigured={configured} isMockUser={false} />
      <div className="flex flex-1 flex-col min-w-0">
        <Header user={user} authConfigured={configured} />
        <main className="flex-1 bg-muted/30 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <ResearchPanel
              initialTopic={initialTopic}
              initialWeek={initialWeek}
              initialConcepts={initialConcepts}
              initialQuery={fallbackQuery}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
