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
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(true);
  const [newMemory, setNewMemory] = useState("");
  const [addingMemory, setAddingMemory] = useState(false);
  const [memoryFilter, setMemoryFilter] = useState<string>("all");
  const [memorySearch, setMemorySearch] = useState<string>("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // LLM Setup state
  const [llmPref, setLlmPref] = useState<LlmPreference>(() => getStoredLlmPreference());
  const [savedLlmNotice, setSavedLlmNotice] = useState(false);

  async function loadMemories() {
    setLoadingMemories(true);
    try {
      const res = await fetch("/api/settings/memory");
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories ?? []);
      }
    } catch (e) {
      console.error("Failed to load memories", e);
    } finally {
      setLoadingMemories(false);
    }
  }

  useEffect(() => {
    loadMemories();
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
        loadMemories();
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

  // Filter memories
  const filteredMemories = memories.filter((m) => {
    const matchesCategory =
      memoryFilter === "all"
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

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-5 w-5 text-violet-600" /> Settings & Context Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure AI LLM models, provider credentials, personal profile, plan limits, and resume memory.
        </p>
      </div>

      {message && (
        <Card className={message.type === "success" ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"}>
          <CardContent className="p-4 flex items-center gap-2 text-sm font-medium">
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <span>{message.text}</span>
          </CardContent>
        </Card>
      )}

      {savedLlmNotice && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-emerald-500/40 bg-card/95 backdrop-blur-sm p-4 shadow-xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="h-7 w-7 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-xs text-foreground">Preferences Saved</p>
            <p className="text-[11px] text-muted-foreground">Model configuration updated for chat & mentors.</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="models" className="space-y-6">
        <TabsList className="bg-muted/40 p-1 rounded-2xl border flex-wrap h-auto gap-1">
          <TabsTrigger value="models" className="rounded-xl text-xs flex items-center gap-1.5 py-2 px-3">
            <Cpu className="h-3.5 w-3.5" /> AI & Models
          </TabsTrigger>
          <TabsTrigger value="resume" className="rounded-xl text-xs flex items-center gap-1.5 py-2 px-3">
            <FileText className="h-3.5 w-3.5" /> Resume Context
          </TabsTrigger>
          <TabsTrigger value="memories" className="rounded-xl text-xs flex items-center gap-1.5 py-2 px-3">
            <Brain className="h-3.5 w-3.5" /> Mem0 Memories ({memories.length})
          </TabsTrigger>
          <TabsTrigger value="account" className="rounded-xl text-xs flex items-center gap-1.5 py-2 px-3">
            <User className="h-3.5 w-3.5" /> Account & Plan
          </TabsTrigger>
        </TabsList>

        {/* Tab 0: AI Providers & Model Selection */}
        <TabsContent value="models" className="space-y-6">
          {/* Provider Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Google Gemini Card */}
            <div
              className={`rounded-2xl border p-4 transition-all ${
                llmPref.activeProviders.includes("gemini")
                  ? "border-blue-500/40 bg-blue-500/5 dark:bg-blue-500/10 shadow-sm"
                  : "border-border/60 bg-card/40 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Google Gemini</h3>
                    <p className="text-[11px] text-muted-foreground">Ultra fast multimodal models</p>
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
                <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600">
                  {geminiModels.length} models available
                </Badge>
                {llmPref.provider === "gemini" && (
                  <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-0.5">
                    <Check className="h-3 w-3" /> Default Provider
                  </span>
                )}
              </div>
            </div>

            {/* OpenAI Card */}
            <div
              className={`rounded-2xl border p-4 transition-all ${
                llmPref.activeProviders.includes("openai")
                  ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm"
                  : "border-border/60 bg-card/40 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">OpenAI</h3>
                    <p className="text-[11px] text-muted-foreground">GPT-4o & Omni models</p>
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
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600">
                  {openAiModels.length} models available
                </Badge>
                {llmPref.provider === "openai" && (
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                    <Check className="h-3 w-3" /> Default Provider
                  </span>
                )}
              </div>
            </div>

            {/* Anthropic Claude Card */}
            <div
              className={`rounded-2xl border p-4 transition-all ${
                llmPref.activeProviders.includes("anthropic")
                  ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10 shadow-sm"
                  : "border-border/60 bg-card/40 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Anthropic Claude</h3>
                    <p className="text-[11px] text-muted-foreground">Sonnet 3.5 & deep reasoning</p>
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
                <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600">
                  {anthropicModels.length} models available
                </Badge>
                {llmPref.provider === "anthropic" && (
                  <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5">
                    <Check className="h-3 w-3" /> Default Provider
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Model Catalog Selection */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-violet-600" /> Active Model Catalog for Chat
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Select which models should appear in the Chat model selector dropdown. Click &ldquo;Set Default&rdquo; to make a model the primary default.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {llmPref.enabledModels.length} models active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Gemini Models Section */}
              {llmPref.activeProviders.includes("gemini") && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider">
                    <Sparkles className="h-3.5 w-3.5" /> Google Gemini Models
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {geminiModels.map((model) => {
                      const isEnabled = llmPref.enabledModels.includes(model.id);
                      const isDefault = llmPref.selectedModel === model.id;
                      return (
                        <div
                          key={model.id}
                          className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                            isEnabled
                              ? "border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10"
                              : "border-border/60 bg-card opacity-60"
                          }`}
                        >
                          <div className="space-y-1.5">
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
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{model.description}</p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between">
                            {isDefault ? (
                              <Badge className="bg-blue-600 text-white text-[10px] py-0 px-2">Default Model</Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetDefaultModel(model)}
                                className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                              >
                                Set as default
                              </Button>
                            )}
                            <span className="text-[10px] font-mono text-muted-foreground">{model.id}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* OpenAI Models Section */}
              {llmPref.activeProviders.includes("openai") && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                    <Zap className="h-3.5 w-3.5" /> OpenAI Models
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {openAiModels.map((model) => {
                      const isEnabled = llmPref.enabledModels.includes(model.id);
                      const isDefault = llmPref.selectedModel === model.id;
                      return (
                        <div
                          key={model.id}
                          className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                            isEnabled
                              ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
                              : "border-border/60 bg-card opacity-60"
                          }`}
                        >
                          <div className="space-y-1.5">
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
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{model.description}</p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between">
                            {isDefault ? (
                              <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-2">Default Model</Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetDefaultModel(model)}
                                className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                              >
                                Set as default
                              </Button>
                            )}
                            <span className="text-[10px] font-mono text-muted-foreground">{model.id}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Anthropic Models Section */}
              {llmPref.activeProviders.includes("anthropic") && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 uppercase tracking-wider">
                    <Brain className="h-3.5 w-3.5" /> Anthropic Claude Models
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {anthropicModels.map((model) => {
                      const isEnabled = llmPref.enabledModels.includes(model.id);
                      const isDefault = llmPref.selectedModel === model.id;
                      return (
                        <div
                          key={model.id}
                          className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                            isEnabled
                              ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10"
                              : "border-border/60 bg-card opacity-60"
                          }`}
                        >
                          <div className="space-y-1.5">
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
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{model.description}</p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between">
                            {isDefault ? (
                              <Badge className="bg-amber-600 text-white text-[10px] py-0 px-2">Default Model</Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetDefaultModel(model)}
                                className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                              >
                                Set as default
                              </Button>
                            )}
                            <span className="text-[10px] font-mono text-muted-foreground">{model.id}</span>
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
          <ResumeUploader onProfileExtracted={() => loadMemories()} />
        </TabsContent>

        {/* Tab 2: Mem0 Memory Manager */}
        <TabsContent value="memories" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 flex-wrap gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-violet-600" /> Mem0 Long-Term Memory Store
                </CardTitle>
                <CardDescription className="text-xs">
                  Key background facts, skills, work history, and engineering preferences stored across sessions.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={loadMemories} disabled={loadingMemories}>
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingMemories ? "animate-spin" : ""}`} /> Refresh
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={handleExportMemories} disabled={memories.length === 0}>
                  <Download className="h-3.5 w-3.5" /> Export JSON
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Add Custom Fact */}
              <form onSubmit={handleAddMemory} className="flex gap-2">
                <Input
                  placeholder="Add a custom long-term fact (e.g. 'Prefer microservices with Go and PostgreSQL')"
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  className="text-xs h-9 rounded-xl"
                />
                <Button size="sm" type="submit" className="text-xs h-9 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 shrink-0" disabled={addingMemory || !newMemory.trim()}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Fact
                </Button>
              </form>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                {/* Category Chips */}
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: "all", label: "All" },
                    { id: "resume_summary", label: "Summary" },
                    { id: "skills", label: "Skills" },
                    { id: "projects", label: "Projects" },
                    { id: "experience", label: "Experience" },
                    { id: "interests", label: "Interests" },
                    { id: "user-defined", label: "Custom" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setMemoryFilter(cat.id)}
                      className={`text-[11px] rounded-lg px-2.5 py-1 font-medium transition-all ${
                        memoryFilter === cat.id
                          ? "bg-violet-600 text-white"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-48">
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
                  {filteredMemories.map((m) => {
                    const cat = m.category || "general";
                    const isResume = cat.includes("resume") || cat === "skills" || cat === "projects" || cat === "experience";

                    return (
                      <div
                        key={m.id}
                        className="rounded-xl border bg-card/60 p-3.5 text-xs flex items-start justify-between gap-3 hover:border-violet-500/30 transition-colors shadow-2xs"
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
                          <p className="text-xs text-foreground leading-relaxed font-normal">{m.memory}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 pt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "Saved"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteMemory(m.id)}
                            className="rounded-lg p-1 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-colors"
                            title="Delete memory"
                            aria-label="Delete memory"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Account & Plan Tier */}
        <TabsContent value="account" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-violet-600" /> Account Profile & Plan Limits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 rounded-xl border p-4 bg-muted/30">
                {user?.image ? (
                  <img src={user.image} alt="User" className="h-12 w-12 rounded-full object-cover ring-2 ring-violet-500/20" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-lg">
                    {user?.name?.[0] ?? user?.email?.[0]?.toUpperCase() ?? "G"}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm">{user?.name ?? "Guest Preview User"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email ?? "guest@skillfarm.local"}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/20">
                      {authConfigured ? "Authenticated" : "Guest Mode"}
                    </Badge>
                    <Badge className="text-[10px] bg-emerald-600 text-white">Free Plan Tier</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border p-4 bg-card">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">Daily Mentor Messages Usage</span>
                  <span className="text-muted-foreground">3 / 20 messages used</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-violet-600 w-[15%]" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Free tier includes 20 messages/day. Upgrade to Pro for unlimited messages & research.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
