"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Send, Sparkles, Loader2, AlertTriangle, RefreshCw, Lightbulb, Network, GitBranch, Bot } from "lucide-react";
import { mentorRegistry, DEFAULT_MENTOR_ID, type MentorId } from "@/agents/mentors";
import { mentors } from "@/config/mentors";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mentorId?: string;
};

/** Scope-violation error returned by the API (HTTP 422) */
type ScopeError = {
  message: string;
  suggestion: string;
};

type Props = {
  initialMessages?: ChatMsg[];
  conversationId?: string | null;
  userName?: string | null;
  isMockUser?: boolean;
  initialMentorId?: MentorId | "auto";
  initialHandoffs?: Array<{ id: string; fromMentorId: string; toMentorId: string; reason: string | null }>;
};

const SUGGESTIONS: Record<MentorId | "auto", string[]> = {
  auto: [
    "I'm building a chat app with AI — how should I handle auth, WebSockets and streaming?",
    "Is my SaaS architecture production ready? Review it as a team.",
    "I want to learn backend and ship a SaaS — where do I start?",
    "How do I secure my JWT auth flow and deploy with Docker?",
  ],
  backend: [
    "How do I design a REST API for a SaaS with auth?",
    "Explain JWT vs sessions for my Express app",
    "How to handle DB transactions with Drizzle?",
    "Show me a Zod validation pattern for POST /users",
  ],
  "ai-engineer": [
    "How do I build a RAG pipeline with citations?",
    "When should I use RAG vs fine-tuning?",
    "Show me a streaming AI endpoint with Vercel AI SDK",
    "How to eval an LLM app in production?",
  ],
  frontend: [
    "Server Components vs Client Components — when to use which?",
    "How to make this card accessible and responsive?",
    "How to optimize Next.js images and fonts?",
    "Show me a shadcn form with Zod validation",
  ],
  devops: [
    "How do I Dockerize a Next.js app for production?",
    "Set up GitHub Actions CI for my API",
    "How to manage secrets in Vercel/Neon?",
    "How to add health checks and monitoring?",
  ],
  security: [
    "How do I secure a JWT auth flow?",
    "What are the top OWASP risks for my API?",
    "How to rate-limit login and prevent brute force?",
    "Should I store tokens in localStorage or cookies?",
  ],
  "system-design": [
    "Is my SaaS architecture production ready?",
    "Monolith vs microservices for my MVP?",
    "How to design a caching layer with Redis?",
    "How to handle 10k concurrent users?",
  ],
};

let idCounter = 0;
function createId(prefix: string): string {
  idCounter = (idCounter + 1) % 1000000;
  return `${prefix}_${idCounter}`;
}

export function BackendChat(props: Props) {
  return <MentorChat {...props} initialMentorId="backend" />;
}

function FormattedMessage({ content }: { content: string }) {
  const cleanText = content.replace(/\[\[HANDOFF:[^\]]+\]\]/g, "");
  const parts = cleanText.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {parts.map((part, idx) => {
        if (part.startsWith("```")) {
          const firstLineEnd = part.indexOf("\n");
          const lang = part.slice(3, firstLineEnd).trim() || "code";
          const code = part.slice(firstLineEnd + 1, -3).trim();

          return (
            <div key={idx} className="my-2.5 overflow-hidden rounded-xl border border-white/10 bg-[#0D1117] shadow-inner">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground font-mono">
                <span>{lang}</span>
                <span className="text-[10px] text-violet-400 font-sans">Formatted Code</span>
              </div>
              <pre className="overflow-x-auto p-3.5 text-xs font-mono text-zinc-200 leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        return (
          <div key={idx} className="whitespace-pre-wrap">
            {part}
          </div>
        );
      })}
    </div>
  );
}

/**
 * AI-generated content disclosure line.
 * Two variants: code responses get the "review before using" copy;
 * all other responses get the general guidance copy.
 * Only shown on completed (non-streaming) assistant messages.
 * Not shown on mock responses (already labeled "Mock").
 */
function AiDisclosure({ content, isMock }: { content: string; isMock: boolean }) {
  if (isMock || !content.trim()) return null;
  const hasCode = content.includes("```");
  return (
    <div className="mt-1.5 pt-1.5 border-t border-dashed border-muted-foreground/20 flex items-start gap-1.5">
      <Bot className="h-3 w-3 text-muted-foreground/50 shrink-0 mt-px" />
      <p className="text-[10px] text-muted-foreground/60 leading-tight">
        {hasCode
          ? "AI-generated code — review and test before using in production. Never blindly execute commands you don't understand."
          : "AI-generated guidance — SkillFarm mentors can make mistakes. Verify important information before applying it in real systems."}
      </p>
    </div>
  );
}

/** Friendly card shown when the user's request was too broad (HTTP 422 scope_too_broad) */
function ScopeErrorCard({ error, onDismiss }: { error: ScopeError; onDismiss: () => void }) {
  return (
    <Card className="border-amber-500/30 bg-amber-500/5 max-w-2xl mx-auto">
      <CardContent className="p-4 flex gap-3 items-start">
        <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">Question is too broad</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{error.message}</p>
          {error.suggestion && (
            <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Try instead:</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{error.suggestion}</p>
            </div>
          )}
          <Button variant="outline" size="sm" className="mt-3" onClick={onDismiss}>
            <RefreshCw className="h-3 w-3 mr-1.5" /> Got it
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function MentorChat({ initialMessages, conversationId: initialConv, userName, isMockUser, initialMentorId, initialHandoffs }: Props) {
  const [mentorId, setMentorId] = useState<MentorId | "auto">(initialMentorId ?? "auto");
  const isAuto = mentorId === "auto";
  const mentor = !isAuto ? (mentorRegistry as Record<MentorId, (typeof mentorRegistry)[MentorId]>)[mentorId as MentorId] : null;
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopeError, setScopeError] = useState<ScopeError | null>(null);
  const [convId, setConvId] = useState<string | undefined>(() => {
    if (initialConv) return initialConv;
    if (typeof window === "undefined") return undefined;
    try {
      const target = initialMentorId ?? "auto";
      return localStorage.getItem(`skillfarm:${target}:convId`) || localStorage.getItem(`skillfarm:${target}:convId`) || undefined;
    } catch {
      return undefined;
    }
  });
  const [isMock, setIsMock] = useState(false);
  const [decision, setDecision] = useState<{ requiredMentors: string[]; reasoning: string; confidence: number } | null>(null);
  const [activeMentorHeader, setActiveMentorHeader] = useState<string | null>(null);
  const [lastHandoff, setLastHandoff] = useState<{ from: string; to: string; reason: string } | null>(null);
  const [handoffHistory, setHandoffHistory] = useState<Array<{ id: string; fromMentorId: string; toMentorId: string; reason: string | null }>>(
    initialHandoffs ?? []
  );
  const listRef = useRef<HTMLDivElement>(null);
  const streamTextRef = useRef("");

  const allMentors = Object.values(mentors);

  // Sync prop changes during rendering (React 19 pattern)
  const [prevPropMentorId, setPrevPropMentorId] = useState(initialMentorId);
  if (initialMentorId !== prevPropMentorId) {
    setPrevPropMentorId(initialMentorId);
    if (initialMentorId) {
      setMentorId(initialMentorId);
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem(`skillfarm:${initialMentorId}:convId`) || localStorage.getItem(`skillfarm:${initialMentorId}:convId`);
          if (saved) setConvId(saved);
        } catch {}
      }
    }
  }

  // Switch mentor helper
  const switchMentor = (newId: MentorId | "auto") => {
    setMentorId(newId);
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`skillfarm:${newId}:convId`) || localStorage.getItem(`skillfarm:${newId}:convId`);
        if (saved) setConvId(saved);
      } catch {}
    }
  };

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, isStreaming]);

  useEffect(() => {
    if (convId && typeof window !== "undefined") {
      try {
        localStorage.setItem(`skillfarm:${mentorId}:convId`, convId);
      } catch {}
    }
  }, [convId, mentorId]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || isStreaming) return;
    setError(null);
    setScopeError(null);
    setDecision(null);
    setActiveMentorHeader(null);
    setLastHandoff(null);
    const userMsg: ChatMsg = { id: createId("u"), role: "user", content };
    const assistantId = createId("a");
    const assistantMsg: ChatMsg = { id: assistantId, role: "assistant", content: "", mentorId: isAuto ? undefined : (mentorId as string) };
    setMessages((m) => [...m, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);
    setIsMock(false);

    try {
      const payload: Record<string, unknown> = {
        messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        conversationId: convId,
      };
      // Phase 5: auto mode sends no mentorId or "auto" → orchestrator; manual sends explicit MentorId
      if (!isAuto) payload.mentorId = mentorId;
      else payload.mentorId = "auto";

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        // Handle scope guard (HTTP 422) separately — show friendly card, not red error
        if (res.status === 422 && j.error === "scope_too_broad") {
          setScopeError({ message: j.message ?? "", suggestion: j.suggestion ?? "" });
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          return;
        }
        throw new Error(j.message ?? j.error ?? `Request failed (${res.status})`);
      }

      if (res.headers.get("X-Is-Mock") === "1") setIsMock(true);
      const decisionHeader = res.headers.get("X-Decision");
      if (decisionHeader) {
        try {
          const d = JSON.parse(decodeURIComponent(decisionHeader));
          setDecision({ requiredMentors: d.requiredMentors ?? [], reasoning: d.reasoning ?? "", confidence: d.confidence ?? 0 });
          if (d.requiredMentors?.length) setActiveMentorHeader(d.requiredMentors.join(" + "));
        } catch {}
      }
      const returnedMentor = res.headers.get("X-Mentor-Id");
      if (returnedMentor) setActiveMentorHeader(returnedMentor);
      const isOrchestrator = res.headers.get("X-Orchestrator") === "1";
      if (isOrchestrator && !decisionHeader) setActiveMentorHeader(returnedMentor);

      const handoffFrom = res.headers.get("X-Handoff-From");
      const handoffTo = res.headers.get("X-Handoff-To");
      const handoffReason = res.headers.get("X-Handoff-Reason");
      const isHandoff = res.headers.get("X-Handoff") === "1";
      if (isHandoff && handoffFrom && handoffTo) {
        const reason = handoffReason ? decodeURIComponent(handoffReason) : "";
        setLastHandoff({ from: handoffFrom, to: handoffTo, reason });
        setHandoffHistory((prev) => [...prev, { id: createId("h"), fromMentorId: handoffFrom, toMentorId: handoffTo, reason }]);
        // Switch UI to the new mentor
        switchMentor(handoffTo as MentorId);
        setActiveMentorHeader(`${handoffFrom} → ${handoffTo}`);
      } else {
        // Keep previous handoff visible for context, don't clear — only clear if you want to show only latest
        // setLastHandoff(null) — keep it so user sees last handoff until next message
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";
      streamTextRef.current = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const raw of parts) {
          const line = raw.trim();
          if (!line || line === "data: [DONE]") continue;
          if (!line.startsWith("data:")) {
            streamTextRef.current += line;
            const textSoFar = streamTextRef.current;
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: textSoFar } : m)));
            continue;
          }
          const dataStr = line.slice(5).trim();
          if (!dataStr) continue;
          try {
            const data = JSON.parse(dataStr);
            let delta: string | undefined;
            if (typeof data.delta === "string") delta = data.delta;
            else if (typeof data.text === "string" && data.type === "text") delta = data.text;
            else if (typeof data.text === "string" && data.type?.includes("delta")) delta = data.text;
            else if (typeof data === "string") delta = data;
            if (delta) {
              streamTextRef.current += delta;
              const textSoFar = streamTextRef.current;
              setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: textSoFar } : m)));
            } else if (data.content || data.message) {
              streamTextRef.current += (data.content ?? data.message);
              const textSoFar = streamTextRef.current;
              setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: textSoFar } : m)));
            }
          } catch {
            streamTextRef.current += dataStr;
            const textSoFar = streamTextRef.current;
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: textSoFar } : m)));
          }
        }
      }

      if (!streamTextRef.current.trim()) {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: "_No content. Check `OPENAI_API_KEY` or try mock mode._" } : m))
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send";
      setError(msg);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content.trim().length > 0));
    } finally {
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const suggestions = SUGGESTIONS[mentorId] ?? SUGGESTIONS.auto;
  const headerColor = isAuto ? "#7C5CFC" : mentor?.config.color ?? "#7C5CFC";
  const headerTitle = isAuto ? "Orchestrator — Auto" : mentor?.config.name ?? "Mentor";
  const headerSubtitle = isAuto
    ? "Tech Lead • routes to the right specialist(s) automatically"
    : mentor?.config.expertise.slice(0, 4).join(" • ") ?? "";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="border-b bg-card/50 backdrop-blur px-4 sm:px-6 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl text-white flex items-center justify-center text-xs font-bold" style={{ background: headerColor }}>
          {isAuto ? <Network className="h-4 w-4" /> : (mentor?.config.shortName[0] ?? "M")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-heading font-semibold leading-none">{headerTitle}</p>
            {isAuto ? (
              <Badge className="bg-[#7C5CFC] text-white border-0 text-[11px]">Auto Router</Badge>
            ) : (
              <Badge className="text-white border-0 text-[11px]" style={{ background: mentor?.config.color }}>
                {mentor?.config.role}
              </Badge>
            )}
            {isMock && <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-700 border-amber-500/20">Mock</Badge>}
            {isStreaming && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
          </div>
          <p className="text-xs text-muted-foreground truncate">{headerSubtitle}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <select
            value={mentorId}
            onChange={(e) => switchMentor(e.target.value as MentorId | "auto")}
            className="h-8 rounded-lg border bg-background px-2 text-sm min-w-[140px]"
            aria-label="Select mentor"
          >
            <option value="auto">Auto (Orchestrator)</option>
            {allMentors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.shortName} — {m.role}
              </option>
            ))}
          </select>
          {isMockUser && <Badge variant="outline" className="text-xs">Guest</Badge>}
        </div>
      </div>

      <div className="sm:hidden border-b bg-card px-3 py-2 flex gap-1.5 overflow-x-auto">
        <button
          onClick={() => switchMentor("auto")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition ${isAuto ? "text-white border-transparent" : "bg-muted hover:bg-muted/80"}`}
          style={isAuto ? { background: "#7C5CFC" } : undefined}
        >
          Auto
        </button>
        {allMentors.map((m) => (
          <button
            key={m.id}
            onClick={() => switchMentor(m.id as MentorId)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition ${mentorId === m.id ? "text-white border-transparent" : "bg-muted hover:bg-muted/80"}`}
            style={mentorId === m.id ? { background: m.color } : undefined}
          >
            {m.shortName}
          </button>
        ))}
      </div>

      {decision && (
        <div className="border-b bg-violet-500/5 px-4 sm:px-6 py-2.5 flex flex-wrap gap-2 items-center text-xs">
          <span className="font-semibold flex items-center gap-1.5">
            <Network className="h-3.5 w-3.5 text-[#7C5CFC]" /> Orchestrator routed to:
          </span>
          <span className="font-mono bg-[#7C5CFC] text-white px-2 py-1 rounded-full text-[11px]">{decision.requiredMentors.join(" + ")}</span>
          <span className="text-muted-foreground">• {Math.round(decision.confidence * 100)}% • {decision.reasoning.slice(0, 120)}</span>
        </div>
      )}
      {activeMentorHeader && !decision && isAuto && (
        <div className="border-b bg-muted/50 px-4 sm:px-6 py-1.5 text-xs text-muted-foreground">
          Consulted: <span className="font-medium text-foreground">{activeMentorHeader}</span> {isMock ? "(mock)" : ""}
        </div>
      )}

      {lastHandoff && (
        <div className="border-b bg-amber-500/10 border-amber-500/20 px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-2 text-xs">
          <GitBranch className="h-3.5 w-3.5 text-amber-600" />
          <span className="font-semibold">🔄 Handed off from {lastHandoff.from} to {lastHandoff.to}</span>
          <span className="text-muted-foreground hidden sm:inline">• {lastHandoff.reason}</span>
          <Badge variant="outline" className="ml-auto text-[11px] bg-amber-500/10 text-amber-700 border-amber-500/20 hidden sm:inline-flex">
            Handoff • {lastHandoff.from} → {lastHandoff.to}
          </Badge>
        </div>
      )}

      {handoffHistory.length > 0 && (
        <div className="border-b bg-card px-4 sm:px-6 py-2">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <GitBranch className="h-3.5 w-3.5 text-amber-600" /> Handoff history ({handoffHistory.length})
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {handoffHistory.map((h) => (
              <Badge key={h.id} variant="outline" className="text-[11px] gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> {h.fromMentorId} → {h.toMentorId}
                {h.reason ? ` • ${h.reason.slice(0, 40)}` : ""}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 bg-muted/30">
        {messages.length === 0 && (
          <Card className="border-dashed bg-card max-w-2xl mx-auto">
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: headerColor }} />
                <p className="font-semibold text-sm">{isAuto ? "Orchestrator — You don’t pick a mentor" : `${mentor?.config.name} — how I can help`}</p>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {isAuto ? "Auto Routing" : `${allMentors.length} Active Mentors`}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {isAuto
                  ? `Ask anything — the orchestrator reads intent, picks the smallest set of specialists, runs them in parallel when needed, and synthesizes. No manual picker. Try: “Is my architecture production ready?”`
                  : mentor?.config.description ?? ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs text-left border rounded-full px-3 py-1.5 hover:bg-muted bg-card transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-lg border bg-muted/50 p-3 flex gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isAuto
                    ? "Example: “chat app with AI + auth + WebSockets” → Backend + AI + Security (parallel) → orchestrator synthesis. Manual picker still works — choose a mentor above to bypass."
                    : `Ask about ${mentor?.config.expertise.slice(0, 2).join(" or ")} — I’ll stream. Switch to Auto to see orchestrator.`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {messages.map((m) => {
          const msgMentor = m.mentorId
            ? (mentorRegistry as Record<string, (typeof mentorRegistry)[MentorId]>)[m.mentorId] ?? mentor
            : m.role === "assistant"
              ? mentor
              : null;
          const isOrchestrated = m.mentorId?.includes(",") || m.mentorId?.includes("+");
          return (
            <div key={m.id} className={`flex gap-3 max-w-3xl mx-auto ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div
                  className="h-7 w-7 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1"
                  style={{ background: msgMentor?.config.color ?? headerColor }}
                >
                  {isOrchestrated ? <Network className="h-3 w-3" /> : (msgMentor?.config.shortName ?? mentor?.config.shortName ?? "O")[0]}
                </div>
              )}
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${
                  m.role === "user" ? "bg-primary text-primary-foreground max-w-[80%]" : "bg-card border shadow-sm max-w-[85%] w-full"
                }`}
              >
                {m.content ? (
                  m.role === "user" ? (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  ) : (
                    <FormattedMessage content={m.content} />
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking...
                  </span>
                )}
                {m.role === "assistant" && (
                  <div className="mt-3 text-[11px] text-muted-foreground border-t pt-2 flex items-center justify-between gap-2">
                    <span className="font-medium flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-violet-500" />
                      {isOrchestrated ? `Orchestrated: ${m.mentorId}` : `via ${msgMentor?.config.shortName ?? m.mentorId ?? "Mentor"}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground/80 font-mono bg-muted/60 px-1.5 py-0.5 rounded">
                      Trace: ~{Math.min(950, Math.max(300, m.content.length * 3))}ms • ~{Math.ceil(m.content.length / 4)} tokens
                    </span>
                  </div>
                )}
                {/* AI disclosure — shown only on completed assistant messages, never on streaming or mock */}
                {m.role === "assistant" && m.content && !isStreaming && (
                  <AiDisclosure content={m.content} isMock={isMock} />
                )}
              </div>
              {m.role === "user" && (
                <div className="h-7 w-7 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                  {userName?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}
            </div>
          );
        })}

        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3 max-w-3xl mx-auto">
            <div className="h-7 w-7 rounded-full text-white flex items-center justify-center text-xs font-bold" style={{ background: headerColor }}>
              {isAuto ? <Network className="h-3 w-3" /> : (mentor?.config.shortName[0] ?? "M")}
            </div>
            <div className="rounded-2xl border bg-card px-4 py-3 text-sm flex items-center gap-1.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> {isAuto ? "Orchestrator routing & synthesizing…" : `Streaming from ${mentor?.config.shortName}…`}
            </div>
          </div>
        )}

        {error && (
          <Card className="border-red-500/30 bg-red-500/10 max-w-2xl mx-auto">
            <CardContent className="p-3 flex gap-2 items-start">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-700 dark:text-red-300">Failed</p>
                <p className="text-xs font-mono bg-white/50 dark:bg-black/20 p-2 rounded border mt-1">{error}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setError(null)}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {scopeError && (
          <ScopeErrorCard error={scopeError} onDismiss={() => setScopeError(null)} />
        )}
      </div>

      <Separator />

      <div className="p-3 sm:p-4 bg-card border-t">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isAuto ? "Ask anything — orchestrator will route…" : `Ask the ${mentor?.config.shortName}…`}
                rows={1}
                className="min-h-[48px] max-h-[120px] resize-none pr-12"
                disabled={isStreaming}
              />
              <div className="absolute right-2 bottom-2 text-[11px] text-muted-foreground">{input.length}/4000</div>
            </div>
            <Button
              onClick={() => send()}
              disabled={!input.trim() || isStreaming}
              className="h-12 w-12 rounded-xl text-white"
              style={{ background: headerColor }}
              size="icon"
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between flex-wrap gap-1.5">
            <p className="text-xs text-muted-foreground">
              {isAuto ? "Orchestrator mode — automatically routes to the best mentor(s) for your question." : "Direct mentor mode — talking directly to your selected mentor. Switch to Auto for orchestrator routing."} Press Enter to send.
            </p>
            {isMock && <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-700 border-amber-500/20">Mock</Badge>}
          </div>
        </div>
      </div>
    </div>
  );
}
