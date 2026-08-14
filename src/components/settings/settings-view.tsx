"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Upload,
  Cpu,
  Zap,
  Check,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import type { MemoryItem } from "@/lib/memory/mem0";
import {
  ALL_MODELS,
  ModelOption,
  getStoredLlmPreference,
  saveStoredLlmPreference,
  LlmPreference,
} from "@/lib/llm-client-store";

type SettingsProps = {
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
  authConfigured?: boolean;
};

export function SettingsView({ user, authConfigured }: SettingsProps) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(true);
  const [newMemory, setNewMemory] = useState("");
  const [addingMemory, setAddingMemory] = useState(false);

  const [resumeText, setResumeText] = useState("");
  const [parsingResume, setParsingResume] = useState(false);
  const [parsedResult, setParsedResult] = useState<{
    extractedSkills: string[];
    experienceSummary: string;
    keyProjects: string[];
    suggestedLevel: string;
  } | null>(null);
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

  function handleExportMemories() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(memories, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `skillfarm-memories-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  async function handleParseResume(e: React.FormEvent) {
    e.preventDefault();
    if (!resumeText.trim()) return;
    setParsingResume(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText }),
      });
      if (res.ok) {
        const data = await res.json();
        setParsedResult(data.parsed);
        setMessage({ type: "success", text: "Resume context extracted and saved to Mem0 long-term memory!" });
        loadMemories();
      } else {
        throw new Error("Failed to parse resume");
      }
    } catch (e) {
      setMessage({ type: "error", text: "Failed to process resume context." });
    } finally {
      setParsingResume(false);
    }
  }

  function handleToggleModel(modelId: string) {
    const next = llmPref.enabledModels.includes(modelId)
      ? llmPref.enabledModels.filter((id) => id !== modelId)
      : [...llmPref.enabledModels, modelId];

    // Ensure at least one model remains enabled
    if (next.length === 0) return;

    const updated = {
      ...llmPref,
      enabledModels: next,
      // If current default was disabled, switch default to first enabled
      selectedModel: next.includes(llmPref.selectedModel) ? llmPref.selectedModel : next[0],
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

    if (next.length === 0) return; // keep at least 1 provider

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
            <span className={message.type === "success" ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}>
              {message.text}
            </span>
          </CardContent>
        </Card>
      )}

      {savedLlmNotice && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            AI Provider & Model preferences updated! Available immediately in your chat selector.
          </span>
        </div>
      )}

      <Tabs defaultValue="models" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full sm:w-[540px]">
          <TabsTrigger value="models" className="text-xs flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5" /> AI & Models
          </TabsTrigger>
          <TabsTrigger value="account" className="text-xs flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" /> Account & Quota
          </TabsTrigger>
          <TabsTrigger value="memories" className="text-xs flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5" /> Mem0 Store
          </TabsTrigger>
          <TabsTrigger value="resume" className="text-xs flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Resume Context
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

            {/* Anthropic Card */}
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
                    <p className="text-[11px] text-muted-foreground">Deep reasoning & code analysis</p>
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

          {/* Model Catalog & Chat Selector Preferences */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-violet-600" /> Chat Models Catalog
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  Check models to include them in your Chat Model switcher
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Select which models you want active in the chat interface. You can set a default model and switch dynamically at any point during a conversation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Google Gemini Models */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" /> Google Gemini Models
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {geminiModels.map((m) => {
                    const isEnabled = llmPref.enabledModels.includes(m.id);
                    const isDefault = llmPref.selectedModel === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-start justify-between rounded-xl border p-3 transition-all ${
                          isDefault
                            ? "border-violet-500 bg-violet-500/5 shadow-xs"
                            : isEnabled
                            ? "border-border bg-card"
                            : "border-border/40 bg-muted/20 opacity-60"
                        }`}
                      >
                        <div className="space-y-1 pr-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground">{m.name}</span>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-500/5 text-blue-600 border-blue-500/20">
                              {m.badge}
                            </Badge>
                            {isDefault && (
                              <Badge className="text-[9px] px-1.5 py-0 bg-violet-600 text-white">
                                Active Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {m.description}
                          </p>
                          <div className="pt-1 flex items-center gap-2">
                            {!isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultModel(m)}
                                className="text-[10px] text-violet-600 dark:text-violet-400 hover:underline font-medium"
                              >
                                Set as default
                              </button>
                            )}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => handleToggleModel(m.id)}
                          className="h-4 w-4 rounded text-violet-600 focus:ring-violet-500 mt-1 cursor-pointer"
                          aria-label={`Enable ${m.name}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* OpenAI Models */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  <Zap className="h-3.5 w-3.5" /> OpenAI Models
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {openAiModels.map((m) => {
                    const isEnabled = llmPref.enabledModels.includes(m.id);
                    const isDefault = llmPref.selectedModel === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-start justify-between rounded-xl border p-3 transition-all ${
                          isDefault
                            ? "border-violet-500 bg-violet-500/5 shadow-xs"
                            : isEnabled
                            ? "border-border bg-card"
                            : "border-border/40 bg-muted/20 opacity-60"
                        }`}
                      >
                        <div className="space-y-1 pr-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground">{m.name}</span>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/5 text-emerald-600 border-emerald-500/20">
                              {m.badge}
                            </Badge>
                            {isDefault && (
                              <Badge className="text-[9px] px-1.5 py-0 bg-violet-600 text-white">
                                Active Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {m.description}
                          </p>
                          <div className="pt-1 flex items-center gap-2">
                            {!isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultModel(m)}
                                className="text-[10px] text-violet-600 dark:text-violet-400 hover:underline font-medium"
                              >
                                Set as default
                              </button>
                            )}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => handleToggleModel(m.id)}
                          className="h-4 w-4 rounded text-violet-600 focus:ring-violet-500 mt-1 cursor-pointer"
                          aria-label={`Enable ${m.name}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Anthropic Models */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 uppercase tracking-wider">
                  <Brain className="h-3.5 w-3.5" /> Anthropic Claude Models
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {anthropicModels.map((m) => {
                    const isEnabled = llmPref.enabledModels.includes(m.id);
                    const isDefault = llmPref.selectedModel === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-start justify-between rounded-xl border p-3 transition-all ${
                          isDefault
                            ? "border-violet-500 bg-violet-500/5 shadow-xs"
                            : isEnabled
                            ? "border-border bg-card"
                            : "border-border/40 bg-muted/20 opacity-60"
                        }`}
                      >
                        <div className="space-y-1 pr-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground">{m.name}</span>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-500/5 text-amber-600 border-amber-500/20">
                              {m.badge}
                            </Badge>
                            {isDefault && (
                              <Badge className="text-[9px] px-1.5 py-0 bg-violet-600 text-white">
                                Active Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {m.description}
                          </p>
                          <div className="pt-1 flex items-center gap-2">
                            {!isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultModel(m)}
                                className="text-[10px] text-violet-600 dark:text-violet-400 hover:underline font-medium"
                              >
                                Set as default
                              </button>
                            )}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => handleToggleModel(m.id)}
                          className="h-4 w-4 rounded text-violet-600 focus:ring-violet-500 mt-1 cursor-pointer"
                          aria-label={`Enable ${m.name}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 1: Account & Quota */}
        <TabsContent value="account" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Profile & Plan Tier</CardTitle>
              <CardDescription className="text-xs">Your current active user session and subscription status.</CardDescription>
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

        {/* Tab 2: Mem0 Memory Manager */}
        <TabsContent value="memories" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-violet-600" /> Mem0 Long-Term Memory Store
                </CardTitle>
                <CardDescription className="text-xs">
                  Key facts, known weak areas, and architectural decisions stored across chat turns.
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={handleExportMemories} disabled={memories.length === 0}>
                <Download className="h-3.5 w-3.5" /> Export JSON
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              <form onSubmit={handleAddMemory} className="flex gap-2">
                <Input
                  placeholder="Add a custom long-term fact (e.g. 'Prefer TypeScript with strict mode')"
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  className="text-xs h-9"
                />
                <Button size="sm" type="submit" className="text-xs h-9 bg-violet-600 hover:bg-violet-500" disabled={addingMemory}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </form>

              {loadingMemories ? (
                <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Loading memory store...
                </div>
              ) : memories.length === 0 ? (
                <div className="py-8 text-center border border-dashed rounded-xl bg-muted/20">
                  <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">No long-term memories stored yet</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Start chatting with mentors or add a memory above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {memories.map((m) => (
                    <div key={m.id} className="rounded-lg border bg-muted/40 p-3 text-xs flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{m.memory}</p>
                        {m.category && (
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {m.category}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "Saved"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Resume Context Extractor */}
        <TabsContent value="resume" className="space-y-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-violet-600" /> Resume & Background Context Extractor
              </CardTitle>
              <CardDescription className="text-xs">
                Upload or paste your resume text. Our background worker extracts your skills, experience, and past projects directly into Mem0 long-term memory for hyper-personalized responses.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <form onSubmit={handleParseResume} className="space-y-3">
                <Textarea
                  placeholder="Paste your resume text here (skills, experience, past projects)..."
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  rows={6}
                  className="text-xs font-mono"
                />
                <Button size="sm" type="submit" className="text-xs h-9 bg-violet-600 hover:bg-violet-500" disabled={parsingResume || !resumeText.trim()}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Parse & Extract Context
                </Button>
              </form>

              {parsedResult && (
                <div className="rounded-xl border bg-violet-500/5 p-4 space-y-3 border-violet-500/20">
                  <p className="text-xs font-semibold flex items-center gap-1.5 text-violet-600">
                    <Sparkles className="h-4 w-4" /> Extracted Background Profile
                  </p>
                  <p className="text-xs leading-relaxed">{parsedResult.experienceSummary}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {parsedResult.extractedSkills.map((sk) => (
                      <Badge key={sk} variant="secondary" className="text-[11px]">
                        {sk}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
