"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Menu,
  Sparkles,
  LayoutDashboard,
  MessageSquare,
  Map,
  Network,
  BookOpen,
  FolderKanban,
  Users,
  Search,
  LogIn,
  LogOut,
  ArrowLeft,
  Home,
  Settings,
  Flame,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Mentor Chat", icon: MessageSquare },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/knowledge", label: "Knowledge Graph", icon: Network },
  { href: "/resources", label: "Resources", icon: BookOpen },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/team", label: "My Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

type HeaderProps = {
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
  authConfigured?: boolean;
};

export function Header({ user, authConfigured }: HeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between border-b bg-background/80 backdrop-blur-xl px-4 lg:px-6">
      <div className="flex items-center gap-2">
        {/* Navigation Buttons: Back & Home */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          onClick={() => router.push("/")}
          title="Go Back"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Back</span>
        </Button>

        {/* <Link href="/dashboard" onClick={() => router.push("/")}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            title="Dashboard Home"
            onClick={() => router.push("/")}
          >
            <Home className="h-3.5 w-3.5 text-violet-500" /> <span className="hidden sm:inline">Home</span>
          </Button>
        </Link> */}

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            }
          />
          <SheetContent side="left" className="p-0 w-[280px]">
            <div className="flex h-[64px] items-center gap-3 px-6 border-b">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-card">
                <Image src="/logo.png" alt="SkillFarm Logo" width={32} height={32} className="h-full w-full object-cover" />
              </div>
              <span className="font-heading font-extrabold bg-gradient-to-r from-violet-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">SkillFarm</span>
            </div>
            <nav className="p-3 space-y-1">
              {nav.map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <i.icon className="h-4 w-4" /> {i.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Search bar */}
        <div className="hidden md:flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="Ask your engineering team… (⌘K)"
              className="h-8 w-[280px] rounded-full border bg-muted/40 pl-8 pr-4 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Compact Green Streak Badge */}
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs px-2.5 py-1 flex items-center gap-1.5 font-medium">
          <Flame className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/30" /> 7 Day Streak
        </Badge>

        <Separator orientation="vertical" className="h-5 hidden sm:block" />

        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Settings">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>

        {user ? (
          <div className="flex items-center gap-2">
            {user.image ? (
              <img src={user.image} alt={user.name ?? "user"} className="h-7 w-7 rounded-full object-cover ring-2 ring-primary/20" />
            ) : (
              <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold ring-2 ring-primary/20">
                {user.name?.[0] ?? user.email?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <Link href="/login">
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        ) : (
          <Link href="/login">
            <Button size="sm" className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white">
              <LogIn className="h-3.5 w-3.5 mr-1" /> Sign in
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
