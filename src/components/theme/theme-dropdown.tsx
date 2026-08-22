"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useTheme, type ThemeId } from "./theme-provider";
import { Moon, Sun, CircleDot, Flame, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const THEME_ICONS: Record<ThemeId, React.ComponentType<{ className?: string }>> = {
  skillfarm: Moon,
  canvas: Sun,
  resend: CircleDot,
  aurora: Flame,
};

export function ThemeDropdown({
  className,
  align = "right",
}: {
  className?: string;
  align?: "left" | "right";
}) {
  const { theme, setTheme, currentTheme, themes } = useTheme();
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

  const ActiveIcon = THEME_ICONS[theme] ?? Moon;

  return (
    <div ref={dropdownRef} className={cn("relative inline-block text-left", className)}>
      {/* Desktop Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="hidden sm:inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/40 hover:bg-muted/80 px-3 py-1.5 text-xs font-semibold text-foreground transition-all shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-haspopup="true"
        aria-expanded={open}
        title="Switch theme"
      >
        <span className="flex h-4 w-4 items-center justify-center text-primary">
          <ActiveIcon className="h-3.5 w-3.5" />
        </span>
        <span className="text-xs font-medium truncate max-w-[110px]">{currentTheme.name}</span>
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>

      {/* Mobile Trigger (Icon format) */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="sm:hidden flex h-8 w-8 items-center justify-center rounded-xl border border-border/80 bg-muted/40 hover:bg-muted text-foreground transition-colors shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-haspopup="true"
        aria-expanded={open}
        title={`Theme: ${currentTheme.name}`}
      >
        <ActiveIcon className="h-4 w-4 text-primary" />
      </button>

      {/* Dropdown Menu - Screen Boundary Safe */}
      {open && (
        <div
          className={cn(
            "absolute top-full mt-2 z-50 w-60 sm:w-64 max-w-[calc(100vw-24px)] rounded-2xl border border-border/80 bg-card p-1.5 text-foreground shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 focus:outline-none",
            align === "left" ? "left-0 origin-top-left" : "right-0 origin-top-right"
          )}
        >
          <div className="px-3 py-2 border-b border-border/60 mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Select Theme</span>
            <span className="text-[10px] font-medium text-primary">4 Presets</span>
          </div>

          <div className="space-y-0.5">
            {themes.map((t) => {
              const Icon = THEME_ICONS[t.id] ?? Moon;
              const isSelected = t.id === theme;

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-all cursor-pointer group",
                    isSelected
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-muted/70 text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Swatch Indicator */}
                    <div
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border shadow-2xs"
                      style={{
                        backgroundColor: t.preview.bg,
                        borderColor: t.preview.border,
                      }}
                    >
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: t.preview.primary }}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight truncate flex items-center gap-1.5">
                        {t.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Icon className={cn("h-3.5 w-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary stroke-[2.5]" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-1.5 pt-1.5 border-t border-border/60 px-2 pb-1">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors py-1 px-1 rounded-lg"
            >
              <span>Custom preview in Settings</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
