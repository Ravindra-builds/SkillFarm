import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { auth, isAuthConfigured } from "@/lib/auth";
import { ResearchPanel } from "@/components/resources/research-panel";
import { getRoadmap } from "@/lib/roadmap-store";
import { getLearningProfile } from "@/lib/learning-profile";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
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
  const isMockUser = !configured && !user;

  const userId = (user?.email as string) ?? (user as unknown as { id?: string })?.id ?? "guest-preview-user";

  let initialQuery = "Best resources to learn Node.js, PostgreSQL and AI Engineering";
  try {
    const roadmap = await getRoadmap(userId);
    const currentNode = roadmap?.nodes.find((n) => n.status === "current") ?? roadmap?.nodes.find((n) => n.status === "next");
    if (currentNode) {
      initialQuery = `Learn ${currentNode.title}: ${currentNode.description}`;
    } else {
      const profile = await getLearningProfile(userId);
      if (profile?.goal) {
        initialQuery = `Best resources to learn ${profile.goal}`;
      }
    }
  } catch (err) {
    console.error("[resources/page] failed to build dynamic query:", err);
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={user} authConfigured={configured} isMockUser={isMockUser} />
      <div className="flex flex-1 flex-col min-w-0">
        <Header user={user} authConfigured={configured} />
        <main className="flex-1 bg-muted/30 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <ResearchPanel initialQuery={initialQuery} />
          </div>
        </main>
      </div>
    </div>
  );
}
