"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  User,
  Brain,
  FileText,
  Download,
  Plus,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Cpu,
  Zap,
  Check,
  ToggleLeft,
  ToggleRight,
  Trash2,
  FolderGit2,
  Briefcase,
  Code2,
  Search,
  ShieldCheck,
  CreditCard,
  Layers,
  ChevronDown,
  ChevronUp,
  Copy,
  Flame,
  Clock,
} from "lucide-react";
import type { MemoryItem } from "@/lib/memory/mem0";
import {
  ALL_MODELS,
  ModelOption,
  getStoredLlmPreference,
  saveStoredLlmPreference,
  LlmPreference,
} from "@/lib/llm-client-store";
import { ResumeUploader } from "@/components/resume/resume-uploader";

type SettingsProps = {
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
  authConfigured?: boolean;
};

export function SettingsView({ user, authConfigured }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<string>("models");
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(true);
  const [newMemory, setNewMemory] = useState("");
  const [addingMemory, setAddingMemory] = useState(false);
  const [memoryFilter, setMemoryFilter] = useState<string>("recent");
  const [memorySearch, setMemorySearch] = useState<string>("");
  const [showAllMemories, setShowAllMemories] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [memoryToDelete, setMemoryToDelete] = useState<{ id: string; text: string } | null>(null);

  // LLM Setup state
  const [llmPref, setLlmPref] = useState<LlmPreference>(() => getStoredLlmPreference());
  const [savedLlmNotice, setSavedLlmNotice] = useState(false);

  async function refreshMemories() {
    setLoadingMemories(true);
    try {
      const res = await fetch("/api/settings/memory");
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories ?? []);
      }
    } catch (e) {
      console.error("Failed to refresh memories", e);
    } finally {
      setLoadingMemories(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    async function fetchInitial() {
      try {
        const res = await fetch("/api/settings/memory");
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setMemories(data.memories ?? []);
          }
        }
      } catch (e) {
        console.error("Failed to load initial memories", e);
      } finally {
        if (!ignore) {
          setLoadingMemories(false);
        }
      }
    }
    fetchInitial();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleAddMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!newMemory.trim()) return;
    setAddingMemory(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newMemory, category: "user-defined" }),
      });
      if (res.ok) {
        setNewMemory("");
        setMessage({ type: "success", text: "Memory added successfully to long-term store!" });
        refreshMemories();
      } else {
        throw new Error("Failed to add memory");
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to add memory. Please try again." });
    } finally {
      setAddingMemory(false);
    }
  }

  async function handleDeleteMemory(id: string) {
    try {
      const res = await fetch(`/api/settings/memory?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
        setMessage({ type: "success", text: "Memory deleted from store." });
      }
    } catch (e) {
      console.error("Failed to delete memory", e);
      setMessage({ type: "error", text: "Failed to delete memory." });
    }
  }

  function handleExportMemories() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(memories, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `skillfarm-memories-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function handleCopyUserId() {
    const id = user?.email ?? "guest-preview-user";
    navigator.clipboard?.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  function handleToggleModel(modelId: string) {
    const isCurrentlyEnabled = llmPref.enabledModels.includes(modelId);
    let nextEnabled: string[];

    if (isCurrentlyEnabled) {
      if (llmPref.enabledModels.length <= 1) return;
      nextEnabled = llmPref.enabledModels.filter((id) => id !== modelId);
    } else {
      nextEnabled = [...llmPref.enabledModels, modelId];
    }

    let nextSelected = llmPref.selectedModel;
    if (!nextEnabled.includes(nextSelected)) {
      nextSelected = nextEnabled[0];
    }

    const updated = {
      ...llmPref,
      enabledModels: nextEnabled,
      selectedModel: nextSelected,
    };
    setLlmPref(updated);
    saveStoredLlmPreference(updated);
    showSavedFeedback();
  }

  function handleSetDefaultModel(model: ModelOption) {
    const updated = {
      ...llmPref,
      provider: model.provider,
      selectedModel: model.id,
      enabledModels: llmPref.enabledModels.includes(model.id)
        ? llmPref.enabledModels
        : [...llmPref.enabledModels, model.id],
    };
    setLlmPref(updated);
    saveStoredLlmPreference(updated);
    showSavedFeedback();
  }

  function handleToggleProvider(provider: "gemini" | "openai" | "anthropic") {
    const isCurrentlyActive = llmPref.activeProviders.includes(provider);
    const next = isCurrentlyActive
      ? llmPref.activeProviders.filter((p) => p !== provider)
      : [...llmPref.activeProviders, provider];

    if (next.length === 0) return;

    const updated = {
      ...llmPref,
      activeProviders: next,
    };
    setLlmPref(updated);
    saveStoredLlmPreference(updated);
    showSavedFeedback();
  }

  function showSavedFeedback() {
    setSavedLlmNotice(true);
    setTimeout(() => setSavedLlmNotice(false), 3000);
  }

  const geminiModels = ALL_MODELS.filter((m) => m.provider === "gemini");
  const openAiModels = ALL_MODELS.filter((m) => m.provider === "openai");
  const anthropicModels = ALL_MODELS.filter((m) => m.provider === "anthropic");

  // Filter & sort memories by recent creation date
  const sortedMemories = [...memories].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const filteredMemories = sortedMemories.filter((m) => {
    const matchesCategory =
      memoryFilter === "recent"
        ? true
        : memoryFilter === "resume"
        ? m.category?.startsWith("resume")
        : m.category === memoryFilter;

    const matchesSearch =
      !memorySearch.trim() ||
      m.memory.toLowerCase().includes(memorySearch.toLowerCase()) ||
      (m.category && m.category.toLowerCase().includes(memorySearch.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Strict Capping: If "recent" is active, strictly display top 10 most recently added items
  const maxDisplayLimit =
    memoryFilter === "recent"
      ? 10
      : memoryFilter === "resume_summary"
      ? 3
      : memoryFilter === "skills"
      ? 2
      : memoryFilter === "projects"
      ? 5
      : memoryFilter === "experience"
      ? 5
      : memoryFilter === "interests"
      ? 3
      : 5;

  const displayedMemories =
    memoryFilter === "recent"
      ? filteredMemories.slice(0, 10)
      : showAllMemories
      ? filteredMemories
      : filteredMemories.slice(0, maxDisplayLimit);

  const hasHiddenMemories = memoryFilter !== "recent" && filteredMemories.length > maxDisplayLimit;

  // Tab definitions
  const tabsList = [
    {
      id: "models",
      title: "AI & Models",
      badge: `${llmPref.enabledModels.length} Active`,
      icon: Cpu,
    },
    {
      id: "resume",
      title: "Resume Context",
      badge: "PDF / TXT",
      icon: FileText,
    },
    {
      id: "memories",
      title: "AI Memory",
      badge: `${memories.length} Facts`,
      icon: Brain,
    },
    {
      id: "account",
      title: "Account & Plan",
      badge: "Free Tier",
      icon: User,
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2 px-1 sm:px-4">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-5 w-5 text-violet-600 shrink-0" /> Settings & Configuration
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Manage AI LLM models, resume background, personalized long-term memory, and subscription quotas.
        </p>
      </div>

      {message && (
        <Card className={`rounded-xl ${message.type === "success" ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"}`}>
          <CardContent className="p-3.5 flex items-center gap-2 text-xs sm:text-sm font-medium">
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </CardContent>
        </Card>
      )}

      {savedLlmNotice && (
        <div className="fixed bottom-4 right-4 z-50 rounded-2xl border border-emerald-500/40 bg-card/95 backdrop-blur-sm p-3.5 shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
            <Check className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Preferences Saved</p>
            <p className="text-[11px] text-muted-foreground">Model configuration updated for chat & mentors.</p>
          </div>
        </div>
      )}

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        {/* Mobile: Compact 2 rows x 2 columns badge cards (< sm) */}
        <div className="grid grid-cols-2 gap-2 sm:hidden">
          {tabsList.map((tab) => {
            const isSelected = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl border p-2.5 text-left transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "border-violet-600 bg-violet-600 text-white shadow-sm ring-2 ring-violet-500/20"
                    : "border-border/70 bg-card hover:bg-muted/40 text-card-foreground shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <div
                    className={`h-6 w-6 rounded-lg flex items-center justify-center ${
                      isSelected ? "bg-white/20 text-white" : "bg-muted text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    {tab.badge}
                  </span>
                </div>

                <div className="mt-2">
                  <p className={`text-xs font-semibold tracking-tight ${isSelected ? "text-white" : "text-foreground"}`}>
                    {tab.title}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Desktop: Standard sleek 1-row TabsList (>= sm) */}
        <TabsList className="hidden sm:flex bg-muted/40 p-1 rounded-2xl border w-full h-auto gap-1">
          {tabsList.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-xl text-xs flex items-center gap-1.5 py-2 px-3 flex-1 justify-center cursor-pointer"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{tab.title}</span>
                <span className="text-[10px] text-muted-foreground ml-1">({tab.badge})</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Tab 0: AI Providers & Model Selection */}
        <TabsContent value="models" className="space-y-5">
          {/* Provider Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Google Gemini Card */}
            <div
              className={`rounded-2xl border p-3.5 sm:p-4 transition-all ${
                llmPref.activeProviders.includes("gemini")
                  ? "border-blue-500/40 bg-blue-500/5 dark:bg-blue-500/10 shadow-2xs"
                  : "border-border/60 bg-card/40 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs sm:text-sm">Google Gemini</h3>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">Ultra-fast multimodal models</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleProvider("gemini")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {llmPref.activeProviders.includes("gemini") ? (
                    <ToggleRight className="h-6 w-6 text-blue-600" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                  )}
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px]">
                <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                  {geminiModels.length} models
                </Badge>
                {llmPref.provider === "gemini" && (
                  <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-0.5">
                    <Check className="h-3 w-3" /> Default
                  </span>
                )}
              </div>
            </div>

            {/* OpenAI Card */}
            <div
              className={`rounded-2xl border p-3.5 sm:p-4 transition-all ${
                llmPref.activeProviders.includes("openai")
                  ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-2xs"
                  : "border-border/60 bg-card/40 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs sm:text-sm">OpenAI</h3>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">GPT-4o & Omni models</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleProvider("openai")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {llmPref.activeProviders.includes("openai") ? (
                    <ToggleRight className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                  )}
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px]">
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  {openAiModels.length} models
                </Badge>
                {llmPref.provider === "openai" && (
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                    <Check className="h-3 w-3" /> Default
                  </span>
                )}
              </div>
            </div>

            {/* Anthropic Claude Card */}
            <div
              className={`rounded-2xl border p-3.5 sm:p-4 transition-all ${
                llmPref.activeProviders.includes("anthropic")
                  ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 shadow-2xs"
                  : "border-border/60 bg-card/40 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs sm:text-sm">Anthropic Claude</h3>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">Sonnet 3.5 & reasoning</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleProvider("anthropic")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {llmPref.activeProviders.includes("anthropic") ? (
                    <ToggleRight className="h-6 w-6 text-amber-600" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                  )}
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px]">
                <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                  {anthropicModels.length} models
                </Badge>
                {llmPref.provider === "anthropic" && (
                  <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5">
                    <Check className="h-3 w-3" /> Default
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Model Catalog Selection */}
          <Card className="rounded-2xl border border-border/80">
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-violet-600" /> Active Model Catalog for Chat
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Toggle which models appear in the Chat input dropdown. Click &ldquo;Set Default&rdquo; to choose your primary model.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {llmPref.enabledModels.length} models active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-6">
              {/* Gemini Models Section */}
              {llmPref.activeProviders.includes("gemini") && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5" /> Google Gemini Models
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {geminiModels.map((model) => {
                      const isEnabled = llmPref.enabledModels.includes(model.id);
                      const isDefault = llmPref.selectedModel === model.id;
                      return (
                        <div
                          key={model.id}
                          className={`rounded-xl border p-3 sm:p-3.5 transition-all flex flex-col justify-between ${
                            isEnabled
                              ? "border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10"
                              : "border-border/60 bg-card opacity-60"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-foreground">{model.name}</span>
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={() => handleToggleModel(model.id)}
                                className="h-4 w-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                                aria-label={`Enable ${model.name}`}
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-snug">{model.description}</p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px]">
                            {isDefault ? (
                              <Badge className="bg-blue-600 text-white text-[10px] py-0 px-2">Default</Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetDefaultModel(model)}
                                className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                Set default
                              </Button>
                            )}
                            <span className="font-mono text-muted-foreground truncate max-w-[110px]">{model.id}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* OpenAI Models Section */}
              {llmPref.activeProviders.includes("openai") && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                    <Zap className="h-3.5 w-3.5" /> OpenAI Models
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {openAiModels.map((model) => {
                      const isEnabled = llmPref.enabledModels.includes(model.id);
                      const isDefault = llmPref.selectedModel === model.id;
                      return (
                        <div
                          key={model.id}
                          className={`rounded-xl border p-3 sm:p-3.5 transition-all flex flex-col justify-between ${
                            isEnabled
                              ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
                              : "border-border/60 bg-card opacity-60"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-foreground">{model.name}</span>
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={() => handleToggleModel(model.id)}
                                className="h-4 w-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                                aria-label={`Enable ${model.name}`}
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-snug">{model.description}</p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px]">
                            {isDefault ? (
                              <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-2">Default</Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetDefaultModel(model)}
                                className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                Set default
                              </Button>
                            )}
                            <span className="font-mono text-muted-foreground truncate max-w-[110px]">{model.id}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Anthropic Models Section */}
              {llmPref.activeProviders.includes("anthropic") && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 uppercase tracking-wider">
                    <Brain className="h-3.5 w-3.5" /> Anthropic Claude Models
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {anthropicModels.map((model) => {
                      const isEnabled = llmPref.enabledModels.includes(model.id);
                      const isDefault = llmPref.selectedModel === model.id;
                      return (
                        <div
                          key={model.id}
                          className={`rounded-xl border p-3 sm:p-3.5 transition-all flex flex-col justify-between ${
                            isEnabled
                              ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10"
                              : "border-border/60 bg-card opacity-60"
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-foreground">{model.name}</span>
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={() => handleToggleModel(model.id)}
                                className="h-4 w-4 rounded text-amber-600 accent-amber-600 cursor-pointer"
                                aria-label={`Enable ${model.name}`}
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-snug">{model.description}</p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px]">
                            {isDefault ? (
                              <Badge className="bg-amber-600 text-white text-[10px] py-0 px-2">Default</Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetDefaultModel(model)}
                                className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                Set default
                              </Button>
                            )}
                            <span className="font-mono text-muted-foreground truncate max-w-[110px]">{model.id}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 1: Resume Context Extractor */}
        <TabsContent value="resume" className="space-y-4">
          <ResumeUploader userName={user?.name} onProfileExtracted={() => refreshMemories()} />
        </TabsContent>

        {/* Tab 2: Mem0 Memory Manager */}
        <TabsContent value="memories" className="space-y-4">
          <Card className="rounded-2xl border border-border/80">
            <CardHeader className="p-4 sm:p-6 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-violet-600 shrink-0" /> Personalized Long-Term Memory Store
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Key background facts, skills, work history, and engineering preferences stored across sessions.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button size="sm" variant="outline" className="text-xs h-8 gap-1 rounded-xl cursor-pointer" onClick={refreshMemories} disabled={loadingMemories}>
                  <RefreshCw className={`h-3 w-3 ${loadingMemories ? "animate-spin" : ""}`} /> Refresh
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-8 gap-1 rounded-xl cursor-pointer" onClick={handleExportMemories} disabled={memories.length === 0}>
                  <Download className="h-3 w-3" /> Export JSON
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Add Custom Fact */}
              <form onSubmit={handleAddMemory} className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Add a custom long-term fact (e.g. 'Prefer microservices with Go and PostgreSQL')"
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  className="text-xs h-9 rounded-xl flex-1"
                />
                <Button size="sm" type="submit" className="text-xs h-9 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 shrink-0 cursor-pointer" disabled={addingMemory || !newMemory.trim()}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Fact
                </Button>
              </form>

              {/* Filters & Search with 'recent' as top 10 */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                {/* Category Chips */}
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: "recent", label: "Recent (Top 10)", icon: Clock },
                    { id: "resume_summary", label: "Summary", icon: FileText },
                    { id: "skills", label: "Skills", icon: Code2 },
                    { id: "projects", label: "Projects", icon: FolderGit2 },
                    { id: "experience", label: "Experience", icon: Briefcase },
                    { id: "interests", label: "Interests", icon: Sparkles },
                    { id: "user-defined", label: "Custom", icon: Brain },
                  ].map((cat) => {
                    const ChipIcon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setMemoryFilter(cat.id);
                          setShowAllMemories(false);
                        }}
                        className={`text-[11px] rounded-lg px-2.5 py-1 font-medium transition-all flex items-center gap-1 cursor-pointer ${
                          memoryFilter === cat.id
                            ? "bg-violet-600 text-white shadow-2xs"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <ChipIcon className="h-3 w-3" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-56">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search memories..."
                    value={memorySearch}
                    onChange={(e) => setMemorySearch(e.target.value)}
                    className="h-8 pl-8 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Memory List */}
              {loadingMemories ? (
                <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Loading memory store...
                </div>
              ) : filteredMemories.length === 0 ? (
                <div className="py-8 text-center border border-dashed rounded-xl bg-muted/20">
                  <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">No memories found</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Upload a resume in the &ldquo;Resume Context&rdquo; tab or add a fact above.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {displayedMemories.map((m) => {
                    const cat = m.category || "general";
                    const isResume = cat.includes("resume") || cat === "skills" || cat === "projects" || cat === "experience";

                    return (
                      <div
                        key={m.id}
                        className="rounded-xl border bg-card/60 p-3 sm:p-3.5 text-xs flex items-start justify-between gap-2.5 hover:border-violet-500/30 transition-colors shadow-2xs overflow-hidden"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-2 py-0 font-medium capitalize ${
                                cat === "skills"
                                  ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20"
                                  : cat === "projects"
                                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                                  : cat === "experience"
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                                  : cat.includes("resume")
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                  : "bg-muted text-foreground"
                              }`}
                            >
                              {cat === "resume_summary" ? (
                                <FileText className="h-2.5 w-2.5 mr-1 inline" />
                              ) : cat === "skills" ? (
                                <Code2 className="h-2.5 w-2.5 mr-1 inline" />
                              ) : cat === "projects" ? (
                                <FolderGit2 className="h-2.5 w-2.5 mr-1 inline" />
                              ) : cat === "experience" ? (
                                <Briefcase className="h-2.5 w-2.5 mr-1 inline" />
                              ) : (
                                <Brain className="h-2.5 w-2.5 mr-1 inline" />
                              )}
                              {cat.replace("_", " ")}
                            </Badge>

                            {isResume && (
                              <span className="text-[10px] text-emerald-600 font-medium">● AI Synced</span>
                            )}
                          </div>
                          <p className="text-xs text-foreground leading-relaxed font-normal break-words">{m.memory}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                          <span className="text-[10px] text-muted-foreground hidden sm:inline">
                            {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "Saved"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setMemoryToDelete({ id: m.id, text: m.memory })}
                            className="rounded-lg p-1 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Delete memory"
                            aria-label="Delete memory"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Clean Capping Footer */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2 border-t border-border/40">
                    <span>
                      {memoryFilter === "recent"
                        ? `Showing top ${displayedMemories.length} recently added memories`
                        : `Showing top ${displayedMemories.length} of ${filteredMemories.length} memories`}
                    </span>
                    {hasHiddenMemories && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllMemories(!showAllMemories)}
                        className="h-7 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-500 gap-1 cursor-pointer"
                      >
                        {showAllMemories ? (
                          <>
                            Show Less <ChevronUp className="h-3 w-3" />
                          </>
                        ) : (
                          <>
                            View All ({filteredMemories.length}) <ChevronDown className="h-3 w-3" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Account & Plan Tier */}
        <TabsContent value="account" className="space-y-5">
          {/* User Profile Card */}
          <Card className="rounded-2xl border border-border/80 overflow-hidden">
            <CardHeader className="p-4 sm:p-6 pb-4 bg-muted/20 border-b border-border/40">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {user?.image ? (
                    <img src={user.image} alt="User" className="h-12 w-12 rounded-2xl object-cover ring-2 ring-violet-500/30 shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                      {user?.name?.[0] ?? user?.email?.[0]?.toUpperCase() ?? "D"}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm sm:text-base text-foreground">{user?.name ?? "Developer User"}</h3>
                      <Badge className="text-[10px] bg-emerald-600 text-white">Free Developer Tier</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{user?.email ?? "developer@skillfarm.local"}</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUserId}
                  className="h-8 px-3 rounded-xl text-xs gap-1.5 border-border/80 cursor-pointer"
                >
                  {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span>{copiedId ? "Copied ID" : "Copy User ID"}</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-6">
              {/* Account Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                  <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Auth Status
                  </span>
                  <p className="font-semibold text-xs sm:text-sm text-foreground">
                    {authConfigured ? "Authenticated Session" : "Guest Sandbox"}
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                  <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-violet-500" /> Active Plan
                  </span>
                  <p className="font-semibold text-xs sm:text-sm text-foreground">Developer (Free)</p>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                  <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5 text-amber-500" /> Long-Term Memories
                  </span>
                  <p className="font-semibold text-xs sm:text-sm text-foreground">{memories.length} Active Records</p>
                </div>
              </div>

              {/* Subscription Usage & Quotas */}
              <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-violet-600" /> Daily Feature Quotas
                  </h4>
                  <span className="text-[11px] text-muted-foreground">Rolling 24-hour cycle</span>
                </div>

                <div className="space-y-3">
                  {/* Quota 1 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">Mentor Chat Messages</span>
                      <span className="text-muted-foreground font-mono">Unlimited (Dev Mode)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-violet-600 w-[12%]" />
                    </div>
                  </div>

                  {/* Quota 2 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">Deep Web Research Runs</span>
                      <span className="text-muted-foreground font-mono">Included</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-blue-600 w-[8%]" />
                    </div>
                  </div>

                  {/* Quota 3 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">Multi-Mentor Parallel Synthesis</span>
                      <span className="text-emerald-600 font-medium">Active</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-emerald-600 w-[100%]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Plan Comparison Table */}
              <div className="space-y-3">
                <h4 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-violet-600" /> Plan Features & Entitlements
                </h4>
                <div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/40 text-xs">
                  <div className="p-3 bg-muted/20 flex items-center justify-between font-semibold">
                    <span>Feature</span>
                    <span>Free vs Pro</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-muted-foreground">AI Engineering Mentors</span>
                    <span className="font-medium text-foreground">All 6 Specialists (Full Access)</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-muted-foreground">Multi-Mentor Parallel Synthesis</span>
                    <span className="font-medium text-foreground">Included</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-muted-foreground">Personalized Long-Term Memory</span>
                    <span className="font-medium text-foreground">PostgreSQL & Semantic Sync</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-muted-foreground">Resume PDF & Text Extraction</span>
                    <span className="font-medium text-foreground">Included (1MB limit)</span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-muted-foreground">Interactive Roadmap & Graph</span>
                    <span className="font-medium text-foreground">Dynamic & Real-time</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Memory Confirmation Modal */}
      {memoryToDelete && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md rounded-3xl border border-red-500/30 bg-card p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-heading text-base font-bold text-foreground">
                  Delete AI Mentor Memory?
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This memory will be permanently removed from your long-term AI context across mentor chats.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/20 p-3.5 text-xs text-foreground/90 italic break-words">
              “{memoryToDelete.text.slice(0, 150)}{memoryToDelete.text.length > 150 ? "..." : ""}”
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMemoryToDelete(null)}
                className="text-xs rounded-xl font-medium cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const id = memoryToDelete.id;
                  setMemoryToDelete(null);
                  handleDeleteMemory(id);
                }}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl px-4 gap-1.5 shadow-xs cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Confirm Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
