"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  MessageSquare,
  Map,
  Network,
  BookOpen,
  FolderKanban,
  Users,
  Sparkles,
  LogOut,
  LogIn,
  AlertTriangle,
  Settings,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badge: null },
  { href: "/chat", label: "Mentor Chat", icon: MessageSquare, badge: "Live" },
  { href: "/roadmap", label: "Roadmap", icon: Map, badge: "72%" },
  { href: "/knowledge", label: "Knowledge Graph", icon: Network, badge: null },
  { href: "/resources", label: "Resources", icon: BookOpen, badge: null },
  { href: "/projects", label: "Projects", icon: FolderKanban, badge: null },
  { href: "/team", label: "My Team", icon: Users, badge: "6 mentors" },
  { href: "/settings", label: "Settings", icon: Settings, badge: null },
] as const;

type SidebarProps = {
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
  authConfigured?: boolean;
  isMockUser?: boolean;
};

export function Sidebar({ user, authConfigured, isMockUser }: SidebarProps) {
  const pathname = usePathname();
  const displayName = user?.name ?? (isMockUser ? "Alex (guest)" : "Guest");
  const displayEmail = user?.email ?? (isMockUser ? "guest preview" : "Sign in to save");

  return (
    <aside className="hidden lg:flex w-[280px] shrink-0 flex-col border-r bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
      <div className="flex h-[64px] items-center gap-3 px-6 border-b">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-card shadow-sm">
          <Image src="/logo.png" alt="SkillFarm Logo" width={36} height={36} className="h-full w-full object-cover" />
        </div>
        <div className="flex flex-col">
          <span className="font-heading text-[16px] font-extrabold leading-none tracking-tight bg-gradient-to-r from-violet-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">SkillFarm</span>
          <span className="text-xs text-muted-foreground">Plant knowledge. Grow skills.</span>
        </div>
        <Badge variant="secondary" className="ml-auto text-[10px] font-medium bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
          v1.0
        </Badge>
      </div>

      <div className="flex-1 overflow-auto py-6 px-3">
        <div className="mb-4 px-3">
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground/70 uppercase">Workspace</p>
        </div>
        <nav className="space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <Badge
                    variant={active ? "secondary" : "outline"}
                    className={cn(
                      "text-[11px] font-medium px-1.5 py-0",
                      active ? "bg-white/20 text-white border-white/20" : ""
                    )}
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        <Separator className="my-6" />

        {!authConfigured ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-xs font-semibold flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5" /> Auth not configured
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-1 leading-relaxed">
              Set Google OAuth in <code className="font-mono bg-amber-500/20 px-1 rounded">.env.local</code> to enable protected dashboard.
            </p>
            <Link href="/login">
              <Button size="sm" variant="outline" className="mt-2 w-full text-xs border-amber-500/30">
                Go to login
              </Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 p-4 text-white">
            <p className="text-sm font-semibold leading-tight">Personalized AI Mentors ✓</p>
            <p className="mt-1 text-xs leading-relaxed text-violet-100">
              {user ? `Signed in as ${user.email}` : "Sign in to persist your learning profile and roadmap progress."}
            </p>
            {!user ? (
              <Link href="/login">
                <Button size="sm" variant="secondary" className="mt-3 w-full bg-white text-violet-700 hover:bg-violet-50 text-xs">
                  Sign in with Google
                </Button>
              </Link>
            ) : (
              <Badge className="mt-3 bg-white text-violet-700 hover:bg-white text-xs">Protected ✓</Badge>
            )}
          </div>
        )}

        <div className="mt-6 px-3">
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground/70 uppercase">Mentor Team</p>
          <div className="mt-3 space-y-2">
            {[
              { name: "Backend", dot: "bg-[#4F9CF9]" },
              { name: "AI Engineer", dot: "bg-[#7C5CFC]" },
              { name: "Security", dot: "bg-red-500" },
              { name: "DevOps", dot: "bg-emerald-500" },
            ].map((m) => (
              <div key={m.name} className="flex items-center gap-2 text-xs">
                <span className={cn("h-2 w-2 rounded-full", m.dot)} />
                <span className="text-muted-foreground">{m.name}</span>
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t p-3">
        {user ? (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            {user.image ? (
              <img src={user.image} alt={user.name ?? "user"} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                {user.name?.[0] ?? user.email?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-none truncate">{user.name ?? "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <form
              action={async () => {
                // Server action would be ideal, but sidebar is client — use link to /login which has signOut
                window.location.href = "/login";
              }}
            >
              <Link href="/login">
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Account">
                  <LogOut className="h-4 w-4" />
                </Button>
              </Link>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 bg-muted/50">
            <img src="https://i.pravatar.cc/100?img=33" alt="Alex" className="h-8 w-8 rounded-full object-cover opacity-60" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
            </div>
            <Link href="/login">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <LogIn className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
        {isMockUser && <p className="px-3 pt-1 text-[11px] text-muted-foreground">Guest preview — sign in to persist</p>}
      </div>
    </aside>
  );
}
