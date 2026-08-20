import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { auth, isAuthConfigured } from "@/lib/auth";
import { SettingsView } from "@/components/settings/settings-view";
import { getUserAccountQuotaStats } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
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
    redirect("/login?callbackUrl=/settings");
  }

  const userId = user.email ?? (user as unknown as { id?: string }).id ?? "guest";
  const initialQuotaStats = await getUserAccountQuotaStats(userId).catch(() => null);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={user} authConfigured={configured} isMockUser={false} />
      <div className="flex flex-1 flex-col min-w-0">
        <Header user={user} authConfigured={configured} />
        <main className="flex-1 bg-muted/30 p-4 sm:p-6 lg:p-8">
          <SettingsView user={user} authConfigured={configured} initialQuotaStats={initialQuotaStats} />
        </main>
      </div>
    </div>
  );
}
