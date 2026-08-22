"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Map,
  MessageSquare,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type UserNavDropdownProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  showNameOnDesktop?: boolean;
  className?: string;
};

export function UserNavDropdown({
  user,
  showNameOnDesktop = false,
  className,
}: UserNavDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [open]);

  const initials = user.name?.[0] ?? user.email?.[0]?.toUpperCase() ?? "U";
  const firstName = user.name?.split(" ")[0] ?? "Profile";

  return (
    <div ref={dropdownRef} className={cn("relative inline-block text-left", className)}>
      {/* Clickable Profile Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full p-0.5 sm:px-1.5 sm:py-1 hover:bg-muted/60 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
        title="Account & Quick Access"
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name ?? "User"}
            className="h-7.5 w-7.5 rounded-full object-cover ring-2 ring-primary/30 shrink-0 shadow-2xs"
          />
        ) : (
          <div className="h-7.5 w-7.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold ring-2 ring-primary/30 shadow-2xs shrink-0">
            {initials}
          </div>
        )}

        {showNameOnDesktop && (
          <span className="text-xs font-bold text-foreground hidden md:inline truncate max-w-[100px]">
            {firstName}
          </span>
        )}

        <ChevronDown
          className={cn(
            "h-3 w-3 text-muted-foreground transition-transform duration-200 hidden sm:inline-block",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Floating Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-56 sm:w-60 max-w-[calc(100vw-24px)] rounded-2xl border border-border/80 bg-card p-1.5 text-foreground shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 focus:outline-none">
          {/* User Details Header */}
          <div className="px-3 py-2 border-b border-border/60 mb-1">
            <p className="text-xs font-bold text-foreground truncate">{user.name ?? "Engineer"}</p>
            <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
              {user.email ?? "Signed in"}
            </p>
          </div>

          {/* Quick Access Navigation */}
          <div className="space-y-0.5 py-0.5">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/roadmap"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Map className="h-3.5 w-3.5 text-primary" />
              <span>Roadmap</span>
            </Link>

            <Link
              href="/chat"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              <span className="flex-1">Mentor Chat</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </Link>

            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Settings className="h-3.5 w-3.5 text-primary" />
              <span>Settings</span>
            </Link>
          </div>

          {/* Sign Out Action (Reddish / Alert Accent) */}
          <div className="mt-1 pt-1 border-t border-border/60">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
