"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, Sparkles, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

type GuestModeToastProps = {
  isGuest: boolean;
};

export function GuestModeToast({ isGuest }: GuestModeToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isGuest) return;

    // Check if the user has already seen the guest toast in this browser session
    const seen = sessionStorage.getItem("skillfarm_guest_demo_toast_shown");
    if (!seen) {
      // Delay slightly for smooth entrance after page hydration
      const timer = setTimeout(() => {
        setVisible(true);
        sessionStorage.setItem("skillfarm_guest_demo_toast_shown", "true");
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isGuest]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl border border-violet-500/30 bg-card/95 text-card-foreground p-4 shadow-2xl backdrop-blur-xl space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-6.5 w-6.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Info className="h-3.5 w-3.5" />
            </div>
            <p className="text-xs font-bold text-foreground">Guest Demo Mode</p>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          You are exploring in guest mode. Your roadmap progress and notes are kept locally in your browser for demonstration.
        </p>

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <Link href="/login" className="flex-1">
            <Button size="sm" className="w-full h-7 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-xs">
              <LogIn className="h-3 w-3 mr-1" /> Sign in with Google
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setVisible(false)}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl"
          >
            Continue Demo
          </Button>
        </div>
      </div>
    </div>
  );
}
