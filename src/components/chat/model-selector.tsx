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
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="group flex items-center gap-1.5 rounded-xl border border-border/70 bg-background/80 px-2.5 py-1 text-xs font-medium text-foreground/90 shadow-2xs backdrop-blur-sm transition-all hover:border-violet-500/50 hover:bg-accent/80 hover:text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500"
        title="Switch AI model (Gemini, GPT-4o, Claude)"
      >
        <span className="flex items-center gap-1.5">
          {getProviderIcon(activeModel.provider)}
          <span className="font-semibold text-foreground">{activeModel.name}</span>
        </span>
        <span className="rounded-md bg-muted/80 px-1.5 py-0.2 text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
          {activeModel.provider}
        </span>
        <ChevronDown
          className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${
            isOpen ? (placement === "top" ? "rotate-0" : "rotate-180") : ""
          }`}
        />
      </button>

      {/* Floating Dropdown */}
      {isOpen && (
        <div
          className={`absolute z-50 w-72 rounded-2xl border border-border/80 bg-popover/95 p-1.5 text-popover-foreground shadow-2xl backdrop-blur-xl transition-all duration-150 animate-in fade-in zoom-in-95 ${dropdownPositionClasses}`}
        >
          <div className="px-2.5 py-1.5 border-b border-border/50 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Cpu className="h-3 w-3" /> Select AI Model
            </span>
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-0.5"
            >
              <Settings className="h-3 w-3" /> Config
            </Link>
          </div>

          <div className="max-h-72 overflow-y-auto py-1 space-y-2">
            {/* Google Gemini Group */}
            {geminiModels.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Google Gemini
                </div>
                <div className="space-y-0.5">
                  {geminiModels.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelect(m)}
                      className={`w-full text-left flex items-start justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors ${
                        m.id === activeModel.id
                          ? "bg-violet-500/10 text-violet-900 dark:text-violet-100 font-semibold"
                          : "hover:bg-accent text-foreground/80"
                      }`}
                    >
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span>{m.name}</span>
                          <span className="rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] px-1.5 py-0.2 font-medium">
                            {m.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 font-normal">
                          {m.description}
                        </p>
                      </div>
                      {m.id === activeModel.id && (
                        <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* OpenAI Group */}
            {openAiModels.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="h-3 w-3" /> OpenAI
                </div>
                <div className="space-y-0.5">
                  {openAiModels.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelect(m)}
                      className={`w-full text-left flex items-start justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors ${
                        m.id === activeModel.id
                          ? "bg-violet-500/10 text-violet-900 dark:text-violet-100 font-semibold"
                          : "hover:bg-accent text-foreground/80"
                      }`}
                    >
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span>{m.name}</span>
                          <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] px-1.5 py-0.2 font-medium">
                            {m.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 font-normal">
                          {m.description}
                        </p>
                      </div>
                      {m.id === activeModel.id && (
                        <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Anthropic Group */}
            {anthropicModels.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Brain className="h-3 w-3" /> Anthropic Claude
                </div>
                <div className="space-y-0.5">
                  {anthropicModels.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelect(m)}
                      className={`w-full text-left flex items-start justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors ${
                        m.id === activeModel.id
                          ? "bg-violet-500/10 text-violet-900 dark:text-violet-100 font-semibold"
                          : "hover:bg-accent text-foreground/80"
                      }`}
                    >
                      <div className="flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span>{m.name}</span>
                          <span className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] px-1.5 py-0.2 font-medium">
                            {m.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5 font-normal">
                          {m.description}
                        </p>
                      </div>
                      {m.id === activeModel.id && (
                        <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
