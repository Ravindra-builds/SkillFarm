"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, User, Brain, FileText, Download, Plus, CheckCircle2, Sparkles, AlertCircle, RefreshCw, Upload } from "lucide-react";
import type { MemoryItem } from "@/lib/memory/mem0";

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

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-5 w-5 text-violet-600" /> Settings & Context Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account profile, plan limits, long-term AI memories, and upload resume for deep personalization.
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

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full sm:w-[400px]">
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

        {/* Tab 1: Account & Quota */}
        <TabsContent value="account" className="space-y-4">
          <Card>
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
          <Card>
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
          <Card>
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
