"use client";

import { useState, useEffect, useRef } from "react";
import {
  ALL_MODELS,
  ModelOption,
  getStoredLlmPreference,
  saveStoredLlmPreference,
  getModelById,
} from "@/lib/llm-client-store";
import { Sparkles, Zap, Brain, Check, ChevronDown, Settings, Cpu } from "lucide-react";
import Link from "next/link";

type ModelSelectorProps = {
  currentModelId?: string;
  onModelSelect?: (model: ModelOption) => void;
  placement?: "top" | "bottom";
  className?: string;
};

export function ModelSelector({
  currentModelId,
  onModelSelect,
  placement = "top",
  className = "",
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [preference, setPreference] = useState(() => getStoredLlmPreference());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync preference changes in real-time
  useEffect(() => {
    const handlePrefChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setPreference(customEvent.detail);
      }
    };
    window.addEventListener("skillfarm:llm-preference-changed", handlePrefChange);
    return () => {
      window.removeEventListener("skillfarm:llm-preference-changed", handlePrefChange);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const activeModel = getModelById(currentModelId || preference.selectedModel);

  // Filter models that are enabled in user settings
  const visibleModels = ALL_MODELS.filter(
    (m) =>
      preference.enabledModels.includes(m.id) ||
      m.id === activeModel.id
  );

  // Group visible models by provider
  const geminiModels = visibleModels.filter((m) => m.provider === "gemini");
  const openAiModels = visibleModels.filter((m) => m.provider === "openai");
  const anthropicModels = visibleModels.filter((m) => m.provider === "anthropic");

  function handleSelect(model: ModelOption) {
    saveStoredLlmPreference({
      provider: model.provider,
      selectedModel: model.id,
    });
    if (onModelSelect) {
      onModelSelect(model);
    }
    setIsOpen(false);
  }

  function getProviderIcon(provider: string) {
    if (provider === "gemini") return <Sparkles className="h-3.5 w-3.5 text-blue-500" />;
    if (provider === "openai") return <Zap className="h-3.5 w-3.5 text-emerald-500" />;
    return <Brain className="h-3.5 w-3.5 text-amber-500" />;
  }

  const dropdownPositionClasses =
    placement === "top"
      ? "bottom-full mb-2 left-0 origin-bottom-left"
      : "top-full mt-2 right-0 origin-top-right";

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button - Ultra-sleek Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="group flex items-center gap-1.5 rounded-lg border border-border/70 bg-muted/40 hover:bg-muted px-2 py-1 text-[11px] font-medium text-foreground transition-all focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer shadow-2xs"
        title="Switch AI model"
      >
        <span className="flex items-center gap-1">
          {getProviderIcon(activeModel.provider)}
          <span className="font-semibold">{activeModel.name}</span>
        </span>
        <ChevronDown
          className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${
            isOpen ? (placement === "top" ? "rotate-180" : "rotate-180") : ""
          }`}
        />
      </button>

      {/* Floating Minimal Dropdown (Antigravity/Cursor/Claude Style) */}
      {isOpen && (
        <div
          className={`absolute z-50 w-64 rounded-xl border border-border/80 bg-popover p-1 text-popover-foreground shadow-xl backdrop-blur-md transition-all duration-150 animate-in fade-in zoom-in-98 ${dropdownPositionClasses}`}
        >
          <div className="px-2 py-1.5 border-b border-border/40 flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Cpu className="h-3 w-3" /> Select Model
            </span>
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-medium"
            >
              <Settings className="h-2.5 w-2.5" /> Manage
            </Link>
          </div>

          <div className="max-h-60 overflow-y-auto py-1 space-y-0.5">
            {visibleModels.map((m) => {
              const isSelected = m.id === activeModel.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelect(m)}
                  className={`w-full text-left flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-muted text-foreground/90 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getProviderIcon(m.provider)}
                    <span className="truncate">{m.name}</span>
                  </div>
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : (
                    <span className="text-[9px] font-mono text-muted-foreground uppercase">
                      {m.provider === "gemini" ? "Google" : m.provider === "openai" ? "OpenAI" : "Anthropic"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
