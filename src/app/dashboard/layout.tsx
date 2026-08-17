import { redirect } from "next/navigation";
import { auth, isAuthConfigured } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { GuestModeToast } from "@/components/auth/guest-mode-toast";
import { isGuestSession } from "@/lib/guest";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session: unknown = null;
  let configured = false;
  try {
    session = await (auth as unknown as () => Promise<unknown>)();
  } catch (err) {
    console.error("[dashboard/layout] auth() failed — falling back to guest preview:", err);
    session = null;
  }
  try {
    configured = isAuthConfigured();
  } catch {
    configured = false;
  }
  const user = (session as unknown as { user?: { name?: string | null; email?: string | null; image?: string | null } } | null)?.user ?? null;

  // Protected dashboard: if Google is configured, require sign-in.
  // If not configured (preview mode) OR auth failed, allow guest access so the shell remains demonstrable.
  const isGuest = !user || isGuestSession(user.email);
  const isMockUser = !configured && !user;

  if (configured && !user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <Sidebar user={user} authConfigured={configured} isMockUser={isMockUser} />
        <div className="flex flex-1 flex-col min-w-0">
          <Header user={user} authConfigured={configured} />
          <main className="flex-1 bg-muted/30">{children}</main>
        </div>
      </div>
      <GuestModeToast isGuest={isGuest} />
    </div>
  );
}
