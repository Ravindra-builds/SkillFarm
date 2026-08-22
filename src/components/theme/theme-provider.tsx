"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";

export type ThemeId = "skillfarm" | "canvas" | "resend" | "aurora";

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  description: string;
  mode: "dark" | "light";
  preview: {
    bg: string;
    card: string;
    border: string;
    primary: string;
    text: string;
  };
};

export const THEMES: ThemeDefinition[] = [
  {
    id: "skillfarm",
    name: "SkillFarm Default",
    description: "Deep charcoal with refined violet and emerald accents (Default).",
    mode: "dark",
    preview: {
      bg: "#0f1117",
      card: "#171a23",
      border: "#252a3a",
      primary: "#7c5cfc",
      text: "#f8f8fa",
    },
  },
  {
    id: "canvas",
    name: "Light Canvas",
    description: "Clean, daylight productivity light theme with crisp layered surfaces.",
    mode: "light",
    preview: {
      bg: "#f8f8fa",
      card: "#ffffff",
      border: "#e5e7eb",
      primary: "#10b981",
      text: "#0f1117",
    },
  },
  {
    id: "resend",
    name: "Minimal Dark",
    description: "Clean monochrome developer dark theme with pitch-black base and fine borders.",
    mode: "dark",
    preview: {
      bg: "#000000",
      card: "#0d0d0d",
      border: "#1f1f1f",
      primary: "#ffffff",
      text: "#ededed",
    },
  },
  {
    id: "aurora",
    name: "Obsidian Ember",
    description: "Smoked obsidian dark with rich burnt orange, warm honey cream, and moss sage accents.",
    mode: "dark",
    preview: {
      bg: "#0a0908",
      card: "#13110f",
      border: "#28221c",
      primary: "#cd5c08",
      text: "#f5ede0",
    },
  },
];

const THEME_STORAGE_KEY = "skillfarm-theme";

type ThemeContextType = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  currentTheme: ThemeDefinition;
  themes: ThemeDefinition[];
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getThemeSnapshot(): ThemeId {
  if (typeof window === "undefined") return "skillfarm";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    if (stored && THEMES.some((t) => t.id === stored)) {
      return stored;
    }
  } catch {}
  return "skillfarm";
}

function getThemeServerSnapshot(): ThemeId {
  return "skillfarm";
}

function subscribeToTheme(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("skillfarm-theme-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("skillfarm-theme-change", callback);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getThemeServerSnapshot);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeId) => {
    if (!THEMES.some((t) => t.id === newTheme)) return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {}
    applyThemeToDocument(newTheme);
    window.dispatchEvent(new Event("skillfarm-theme-change"));
  };

  const currentTheme = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, currentTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

function applyThemeToDocument(themeId: ThemeId) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const target = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  // Set data-theme attribute
  root.setAttribute("data-theme", target.id);

  // Manage .dark vs .light class for Tailwind compatibility
  if (target.mode === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }
}
