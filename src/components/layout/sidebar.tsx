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
  LogOut,
  LogIn,
  AlertTriangle,
  Settings,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, badge: null },
  { href: "/roadmap", label: "Roadmap", icon: Map, badge: null },
  { href: "/chat", label: "Mentor Chat", icon: MessageSquare, badge: "Live" },
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
  const displayName = user?.name ?? "Guest";
  const displayEmail = user?.email ?? "Sign in to save";

  return (
    <aside className="hidden lg:flex w-[272px] shrink-0 flex-col border-r border-border/70 bg-sidebar backdrop-blur-xl supports-[backdrop-filter]:bg-sidebar/80">
      {/* Brand Header */}
      <div className="flex h-[64px] items-center gap-3 px-5 border-b border-border/70">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center group-hover:scale-105 transition-transform">
            <Image src="/logo.png" alt="SkillFarm Logo" width={38} height={38} className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center">
              <span className="font-heading text-base font-extrabold leading-none text-sidebar-foreground">
                Skill
              </span>
              <span className="font-heading text-base font-extrabold leading-none bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Farm
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
              Plant knowledge. Grow skills.
            </span>
          </div>
        </Link>
        <Badge variant="secondary" className="ml-auto text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
          v1.0
        </Badge>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-auto py-5 px-3 space-y-4">
        <div>
          <p className="px-3 text-[10.5px] font-bold tracking-widest text-muted-foreground/80 uppercase">Workspace</p>
          <nav className="mt-2 space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150",
                    active
                      ? "bg-primary text-primary-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] font-medium px-1.5 py-0 rounded-md",
                        active ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/20" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <Separator className="bg-border/60" />

        {!authConfigured ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-1.5">
            <p className="text-xs font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Auth not configured
            </p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300/80 leading-relaxed">
              Set Google OAuth in <code className="font-mono bg-amber-500/20 px-1 rounded">.env.local</code> to enable persistent data.
            </p>
            <Link href="/login" className="block pt-1">
              <Button size="sm" variant="outline" className="w-full text-xs h-7.5 border-amber-500/30 font-semibold rounded-xl">
                Go to login
              </Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border/70 p-3.5 space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">AI Engineering Team</p>
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] px-1.5 py-0 rounded-md">Live</Badge>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {user ? `Active for ${user.email}` : "Sign in to persist your learning profile & roadmap."}
            </p>
            {!user && (
              <Link href="/login" className="block pt-1">
                <Button size="sm" variant="outline" className="w-full text-xs font-semibold h-7.5 rounded-xl border-border">
                  Sign in with Google
                </Button>
              </Link>
            )}
          </div>
        )}

        <div className="px-3">
          <p className="text-[10.5px] font-bold tracking-widest text-muted-foreground/80 uppercase">Specialist Mentors</p>
          <div className="mt-2.5 space-y-2">
            {[
              { name: "Backend Architect", dot: "bg-[#4F9CF9]" },
              { name: "AI Engineer", dot: "bg-[#7C5CFC]" },
              { name: "Security Specialist", dot: "bg-red-500" },
              { name: "DevOps Engineer", dot: "bg-emerald-500" },
            ].map((m) => (
              <div key={m.name} className="flex items-center gap-2 text-xs">
                <span className={cn("h-2 w-2 rounded-full", m.dot)} />
                <span className="text-muted-foreground text-[11px] font-medium">{m.name}</span>
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Workspace Footer */}
      <div className="border-t border-border/70 p-3 bg-muted/20">
        {user ? (
          <div className="flex items-center gap-2.5 rounded-2xl p-2 bg-card border border-border/70 shadow-2xs">
            {user.image ? (
              <img src={user.image} alt={user.name ?? "user"} className="h-8 w-8 rounded-full object-cover ring-1 ring-border shrink-0" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                {user.name?.[0] ?? user.email?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold leading-tight truncate text-foreground">{user.name ?? "Engineer"}</p>
              <p className="text-[10.5px] text-muted-foreground truncate leading-tight mt-0.5">{user.email}</p>
            </div>
            <Link href="/login">
              <Button variant="ghost" size="icon" className="h-7.5 w-7.5 rounded-xl text-muted-foreground hover:text-foreground" title="Account">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-2xl p-2 bg-card border border-border/70 shadow-2xs">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
              G
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold leading-tight truncate text-foreground">{displayName}</p>
              <p className="text-[10.5px] text-muted-foreground truncate leading-tight mt-0.5">{displayEmail}</p>
            </div>
            <Link href="/login">
              <Button variant="ghost" size="icon" className="h-7.5 w-7.5 rounded-xl">
                <LogIn className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}
        {isMockUser && <p className="px-2 pt-1 text-[10px] text-muted-foreground">Guest preview — sign in to persist</p>}
      </div>
    </aside>
  );
}
