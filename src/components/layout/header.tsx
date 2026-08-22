"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
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
  Settings,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { ThemeDropdown } from "@/components/theme/theme-dropdown";
import { UserNavDropdown } from "@/components/layout/user-nav-dropdown";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
  keywords: string[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", description: "Learning overview, goal & streak progress", icon: LayoutDashboard, keywords: ["home", "stats", "overview", "progress", "goals", "summary"] },
  { href: "/roadmap", label: "Roadmap", description: "Concept-First weekly milestones & curriculum", icon: Map, keywords: ["curriculum", "weeks", "topics", "milestones", "tracks", "schedule"] },
  { href: "/chat", label: "Mentor Chat", description: "AI engineering team & specialist mentors", icon: MessageSquare, badge: "Live", keywords: ["ai", "mentor", "orchestrator", "security", "backend", "frontend", "devops", "ask"] },
  { href: "/knowledge", label: "Knowledge Graph", description: "2D interactive canvas & synapse matrix", icon: Network, keywords: ["graph", "network", "synapse", "concepts", "canvas", "prerequisites"] },
  { href: "/resources", label: "Resources", description: "Evaluated docs, videos & starter repos", icon: BookOpen, keywords: ["docs", "youtube", "github", "practice", "tutorials", "articles", "search"] },
  { href: "/projects", label: "Projects", description: "Portfolio Main-Project tasks & deliverables", icon: FolderKanban, keywords: ["capstone", "main-project", "tasks", "codebase", "deliverables", "portfolio"] },
  { href: "/team", label: "My Team", description: "Specialist AI engineering mentor overview", icon: Users, badge: "6 mentors", keywords: ["mentors", "specialists", "experts", "orchestration"] },
  { href: "/settings", label: "Settings", description: "Profile preferences, keys & account", icon: Settings, keywords: ["config", "profile", "account", "preferences", "api keys"] },
];

type HeaderProps = {
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
  authConfigured?: boolean;
};

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Mobile drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered search results
  const searchResults = useMemo<NavItem[]>(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return NAV_ITEMS;
    return NAV_ITEMS.filter((item) => {
      const matchLabel = item.label.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some((k) => k.includes(q));
      return matchLabel || matchDesc || matchKeywords;
    });
  }, [searchQuery]);

  const handleSelectNav = (href: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(href);
  };

  return (
    <header className="sticky top-0 z-30 flex h-[64px] items-center justify-between border-b bg-background/80 backdrop-blur-xl px-4 lg:px-6">
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile menu drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 rounded-lg shrink-0">
                <Menu className="h-4 w-4" />
              </Button>
            }
          />
          <SheetContent side="left" className="p-0 w-[280px] bg-card text-foreground border-r border-border shadow-2xl flex flex-col justify-between">
            <div>
              {/* Brand Header - Clickable Link to Home Page */}
              <Link
                href="/"
                onClick={() => setDrawerOpen(false)}
                className="flex h-[64px] items-center gap-3 px-5 border-b border-border/80 group cursor-pointer hover:bg-muted/40 transition-colors"
                title="Go to SkillFarm Home"
              >
                <div className="relative flex h-9.5 w-9.5 shrink-0 items-center justify-center group-hover:scale-105 transition-transform">
                  <Image src="/logo.png" alt="SkillFarm Logo" width={38} height={38} className="h-full w-full object-contain" />
                </div>
                <div>
                  <span className="font-heading text-base font-extrabold leading-none text-foreground">
                    Skill
                  </span>
                  <span className="font-heading text-base font-extrabold leading-none bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                    Farm
                  </span>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                    Plant knowledge. Grow skills.
                  </p>
                </div>
              </Link>

              {/* Drawer Links */}
              <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-170px)]">
                {NAV_ITEMS.map((i) => {
                  const Icon = i.icon;
                  const isActive = pathname === i.href || (i.href !== "/dashboard" && pathname.startsWith(i.href));
                  return (
                    <Link
                      key={i.href}
                      href={i.href}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                        <span className="truncate">{i.label}</span>
                      </div>
                      {i.badge && (
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${
                            isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {i.badge}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Workspace Profile Footer */}
            <div className="border-t border-border/80 p-3 bg-muted/20">
              {user ? (
                <div className="flex items-center justify-between gap-2.5 rounded-lg p-2 bg-card border border-border/60">
                  <div className="flex items-center gap-2 min-w-0">
                    {user.image ? (
                      <img src={user.image} alt={user.name ?? "User"} className="h-7.5 w-7.5 rounded-full object-cover ring-1 ring-primary/30 shrink-0" />
                    ) : (
                      <div className="h-7.5 w-7.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        {user.name?.[0] ?? user.email?.[0]?.toUpperCase() ?? "U"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold leading-tight truncate text-foreground">{user.name ?? "Engineer"}</p>
                      <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{user.email}</p>
                    </div>
                  </div>
                  <Link href="/login">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" title="Account">
                      <LogOut className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <Link href="/login" className="block">
                  <Button size="sm" className="w-full h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-2xs">
                    <LogIn className="h-3.5 w-3.5 mr-1.5" /> Sign In
                  </Button>
                </Link>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Responsive Search Bar */}
        <div className="relative">
          <div
            onClick={() => {
              setSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className="flex items-center gap-1.5 sm:gap-2 h-8 w-28 xs:w-36 sm:w-64 md:w-80 lg:w-96 rounded-full border border-border/80 bg-muted/40 hover:bg-muted/70 px-2.5 sm:px-3 text-xs text-muted-foreground cursor-pointer transition-colors shadow-2xs"
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate flex-1 text-xs">Search sections…</span>
            <kbd className="hidden sm:inline-flex h-4.5 items-center gap-0.5 rounded border border-border/80 bg-background px-1 font-mono text-[9px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </div>

          {/* Interactive Search Dropdown Palette */}
          {searchOpen && (
            <div
              ref={searchDropdownRef}
              className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:left-0 sm:top-10 z-50 w-auto sm:w-80 md:w-96 rounded-2xl border border-border/80 bg-card p-2 text-foreground shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95"
            >
              <div className="relative flex items-center border-b border-border/60 pb-2 mb-2 px-2">
                <Search className="h-4 w-4 text-primary shrink-0 mr-2" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Jump to section or topic..."
                  className="w-full bg-transparent text-xs sm:text-sm font-medium outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-[11px] text-muted-foreground hover:text-foreground font-semibold px-1 shrink-0 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {searchResults.length > 0 ? (
                  searchResults.map((item: NavItem) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        onClick={() => handleSelectNav(item.href)}
                        className="w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left hover:bg-muted transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                              {item.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    );
                  })
                ) : (
                  <div className="py-5 text-center text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground">No matches for “{searchQuery}”</p>
                    <p className="text-[11px]">Try searching for “Roadmap”, “Chat”, or “Projects”.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Header Navigation */}
      <div className="flex items-center gap-2.5 sm:gap-2 shrink-0">
        <ThemeDropdown />

        <Link href="/settings" className="hidden sm:inline-flex">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg" title="Settings">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>

        {user ? (
          <UserNavDropdown user={user} />
        ) : (
          <Link href="/login">
            <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-2xs">
              <LogIn className="h-3.5 w-3.5 mr-1" /> Sign in
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
