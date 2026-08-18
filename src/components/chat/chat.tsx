"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Send, Sparkles, Loader2, AlertCircle, RefreshCw, Lightbulb, Network, GitBranch, Bot, History, MessageSquarePlus, Cpu, Lock, X } from "lucide-react";
import { mentorRegistry, DEFAULT_MENTOR_ID, type MentorId } from "@/agents/mentors";
import { mentors } from "@/config/mentors";
import { ConversationHistory } from "@/components/chat/conversation-history";
import { FormattedMessage } from "@/components/chat/markdown";
import { ModelSelector } from "@/components/chat/model-selector";
import {
  getStoredLlmPreference,
  getModelById,
  type ModelOption,
} from "@/lib/llm-client-store";

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

/** User-friendly error message */
type FriendlyError = {
  title: string;
  message: string;
  suggestion?: string;
  retryable?: boolean;
  lastQuery?: string;
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
  ],
  devops: [
    "Show me a multi-stage Dockerfile for Next.js",
    "How to set up GitHub Actions CI/CD for a Node API?",
    "Best practices for secrets and environment variables",
  ],
  security: [
    "Review my JWT refresh token rotation pattern",
    "How to prevent CSRF and XSS in Next.js?",
    "What are the OWASP Top 10 risks for my SaaS?",
  ],
  "system-design": [
    "How to design a scalable notification system?",
    "Monolith vs microservices for an early-stage startup?",
    "How to handle rate limiting at scale with Redis?",
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

/** Calm, user-friendly card shown on server/model errors instead of raw technical dumps */
function FriendlyServiceErrorCard({
  error,
  onRetry,
  onDismiss,
}: {
  error: FriendlyError;
  onRetry?: () => void;
  onDismiss: () => void;
}) {
  return (
    <Card className="border-border/80 bg-card/90 shadow-sm max-w-2xl mx-auto rounded-2xl backdrop-blur animate-in fade-in zoom-in-95">
      <CardContent className="p-4 flex gap-3.5 items-start">
        <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">{error.title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{error.message}</p>
          {error.suggestion && (
            <div className="mt-2 rounded-lg bg-muted/60 border border-border/50 px-3 py-2">
              <p className="text-xs text-muted-foreground leading-relaxed">{error.suggestion}</p>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            {error.retryable && onRetry && (
              <Button
                size="sm"
                className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-lg gap-1.5 font-medium shadow-xs"
                onClick={onRetry}
              >
                <RefreshCw className="h-3 w-3" /> Try Again
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-lg border-border/70 font-medium"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MentorChat({ initialMessages, conversationId: initialConv, userName, isMockUser, initialMentorId, initialHandoffs }: Props) {
  const router = useRouter();
  const [mentorId, setMentorId] = useState<MentorId | "auto">(initialMentorId ?? "auto");
  const isAuto = mentorId === "auto";
  const mentor = !isAuto ? (mentorRegistry as Record<MentorId, (typeof mentorRegistry)[MentorId]>)[mentorId as MentorId] : null;
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [friendlyError, setFriendlyError] = useState<FriendlyError | null>(null);
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState<string>("");
  const [scopeError, setScopeError] = useState<ScopeError | null>(null);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

  // Active AI Model selection state (syncs with Settings)
  const [selectedLlm, setSelectedLlm] = useState<ModelOption>(() => {
    const pref = getStoredLlmPreference();
    return getModelById(pref.selectedModel);
  });

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

  const [guestLimitModalOpen, setGuestLimitModalOpen] = useState(false);
  const [guestMessageLimitReached, setGuestMessageLimitReached] = useState(false);
  const [guestNoticeText, setGuestNoticeText] = useState<string | null>(null);

  useEffect(() => {
    if (initialConv) {
      setConvId(initialConv);
    }
  }, [initialConv]);

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

  // Sync preference changes in real-time across tabs/settings
  useEffect(() => {
    const handlePrefChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.selectedModel) {
        setSelectedLlm(getModelById(customEvent.detail.selectedModel));
      }
    };
    window.addEventListener("skillfarm:llm-preference-changed", handlePrefChange);
    return () => {
      window.removeEventListener("skillfarm:llm-preference-changed", handlePrefChange);
    };
  }, []);

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
    setFriendlyError(null);
    setScopeError(null);
    setDecision(null);
    setActiveMentorHeader(null);
    setLastHandoff(null);
    setLastSubmittedQuery(content);

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
        provider: selectedLlm.provider,
        model: selectedLlm.id,
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
        // Handle scope guard (HTTP 422) separately — show friendly card
        if (res.status === 422 && j.error === "scope_too_broad") {
          setScopeError({ message: j.message ?? "", suggestion: j.suggestion ?? "" });
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          return;
        }

        // Clean user-friendly error response from server
        setFriendlyError({
          title: j.title || "Service Interruption",
          message: j.message || "We encountered a temporary issue while connecting with your mentor.",
          suggestion: j.suggestion || "Please try submitting your question again.",
          retryable: j.retryable ?? true,
          lastQuery: content,
        });
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }

      if (res.headers.get("X-Is-Mock") === "1") setIsMock(true);
      const returnedConvId = res.headers.get("X-Conversation-Id");
      if (returnedConvId && returnedConvId !== convId) {
        setConvId(returnedConvId);
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", `/chat?conversationId=${returnedConvId}`);
        }
      }

      const isGuestLimit = res.headers.get("X-Guest-Limit-Reached") === "1";
      const guestNotice = res.headers.get("X-Guest-Conversion-Notice");
      if (isGuestLimit) {
        setGuestMessageLimitReached(true);
        if (guestNotice) {
          try {
            setGuestNoticeText(decodeURIComponent(guestNotice));
          } catch {
            setGuestNoticeText(guestNotice);
          }
        }
      }

      const decisionHeader = res.headers.get("X-Decision");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("skillfarm:conversation-updated"));
      }
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
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setFriendlyError({
          title: "No Response Generated",
          message: "The mentor was unable to generate a response. This may occur if the selected model is busy or temporarily unavailable.",
          suggestion: "Please try submitting your question again or choose another model from the selector.",
          retryable: true,
          lastQuery: content,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send";
      setFriendlyError({
        title: "Service Interruption",
        message: msg.includes("fetch") || msg.includes("network")
          ? "The connection to the mentor was interrupted."
          : "We encountered an issue while processing your message.",
        suggestion: "Please try submitting your question again.",
        retryable: true,
        lastQuery: content,
      });
      setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content.trim().length > 0));
    } finally {
      setIsStreaming(false);
    }
  }

  const [isCreatingChat, setIsCreatingChat] = useState(false);

  async function handleNewChat() {
    if (isCreatingChat) return;
    setIsCreatingChat(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New conversation", mentorId: isAuto ? "backend" : mentorId }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 403 || data?.isGuestLimitReached) {
        setGuestLimitModalOpen(true);
        return;
      }

      if (res.ok && data?.conversation?.id) {
        setMobileHistoryOpen(false);
        router.push(`/chat?conversationId=${data.conversation.id}`);
        return;
      }
    } catch (err) {
      console.error("Failed to start new chat:", err);
    } finally {
      setIsCreatingChat(false);
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
      {/* Subtle Guest Top Conversion Banner */}
      {isMockUser && (
        <div className="border-b bg-violet-500/10 border-violet-500/20 px-3 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs text-violet-900 dark:text-violet-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
            <span className="font-medium">Create a free account to continue this conversation.</span>
          </div>
          <Link href="/login" className="shrink-0 font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1">
            Sign in →
          </Link>
        </div>
      )}

      <div className="border-b bg-card/50 backdrop-blur px-3 sm:px-6 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
        {/* Mobile: history drawer trigger */}
        <Sheet open={mobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
          <SheetTrigger
            className="md:hidden h-8 w-8 inline-flex items-center justify-center shrink-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Conversation history"
            aria-label="Open conversation history"
          >
            <History className="h-4 w-4" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px] flex flex-col">
            <ConversationHistory
              activeConversationId={convId}
              onSelect={() => setMobileHistoryOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Mobile: quick new chat button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 shrink-0 text-primary hover:bg-primary/10"
          onClick={handleNewChat}
          disabled={isCreatingChat}
          title="New chat"
        >
          {isCreatingChat ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MessageSquarePlus className="h-4 w-4" />
          )}
        </Button>

        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl text-white flex items-center justify-center text-xs font-bold shrink-0" style={{ background: headerColor }}>
          {isAuto ? <Network className="h-4 w-4" /> : (mentor?.config.shortName[0] ?? "M")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <p className="font-heading font-semibold leading-none text-xs sm:text-sm">{headerTitle}</p>
            {isAuto ? (
              <Badge className="bg-[#7C5CFC] text-white border-0 text-[10px] sm:text-[11px] py-0">Auto Router</Badge>
            ) : (
              <Badge className="text-white border-0 text-[10px] sm:text-[11px] py-0" style={{ background: mentor?.config.color }}>
                {mentor?.config.role}
              </Badge>
            )}
            {isMock && <Badge variant="outline" className="text-[10px] sm:text-[11px] bg-amber-500/10 text-amber-700 border-amber-500/20 py-0">Mock</Badge>}
            {isStreaming && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{headerSubtitle}</p>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewChat}
            disabled={isCreatingChat}
            className="h-8 gap-1.5 text-xs border-border/60 bg-background/60 hover:bg-accent font-medium text-foreground"
            title="Start a new chat"
          >
            {isCreatingChat ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MessageSquarePlus className="h-3.5 w-3.5 text-primary" />
            )}
            <span>New Chat</span>
          </Button>

          <select
            value={mentorId}
            onChange={(e) => switchMentor(e.target.value as MentorId | "auto")}
            className="h-8 rounded-lg border bg-background px-2 text-xs min-w-[130px]"
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

      {/* Mobile: Mentor Pills */}
      <div className="sm:hidden border-b bg-card px-3 py-2 flex gap-1.5 overflow-x-auto">
        <button
          onClick={() => switchMentor("auto")}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition ${isAuto ? "text-white border-transparent" : "bg-muted hover:bg-muted/80"}`}
          style={isAuto ? { background: "#7C5CFC" } : undefined}
        >
          Auto
        </button>
        {allMentors.map((m) => (
          <button
            key={m.id}
            onClick={() => switchMentor(m.id as MentorId)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition ${mentorId === m.id ? "text-white border-transparent" : "bg-muted hover:bg-muted/80"}`}
            style={mentorId === m.id ? { background: m.color } : undefined}
          >
            {m.shortName}
          </button>
        ))}
      </div>

      {/* Compact Orchestrator Decision Bar */}
      {decision && (
        <div className="border-b bg-violet-500/5 px-3 sm:px-6 py-1.5 flex items-center justify-between gap-2 text-xs text-violet-900 dark:text-violet-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 min-w-0">
            <Network className="h-3.5 w-3.5 text-[#7C5CFC] shrink-0" />
            <span className="font-semibold shrink-0">Routed to:</span>
            <span className="font-mono bg-[#7C5CFC] text-white px-1.5 py-0.5 rounded text-[10px]">
              {decision.requiredMentors.join(" + ")}
            </span>
            <span className="text-muted-foreground hidden sm:inline truncate text-[11px]">
              • {Math.round(decision.confidence * 100)}% • {decision.reasoning}
            </span>
          </div>
          <button
            onClick={() => setDecision(null)}
            className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 cursor-pointer"
            title="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Compact Active Mentor / Mock Notice */}
      {activeMentorHeader && !decision && isAuto && (
        <div className="border-b bg-muted/40 px-3 sm:px-6 py-1 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>Consulted: <span className="font-medium text-foreground">{activeMentorHeader}</span> {isMock ? "(mock)" : ""}</span>
        </div>
      )}

      {/* Ultra-Compact Handoff Banner (Low-profile, non-intrusive) */}
      {lastHandoff && (
        <div className="border-b bg-amber-500/10 border-amber-500/20 px-3 sm:px-6 py-1.5 flex items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 min-w-0">
            <GitBranch className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="font-semibold shrink-0">
              🔄 Handoff: <span className="capitalize">{lastHandoff.from}</span> → <span className="capitalize">{lastHandoff.to}</span>
            </span>
            {lastHandoff.reason && (
              <span className="text-muted-foreground hidden md:inline truncate text-[11px]">
                • {lastHandoff.reason}
              </span>
            )}
          </div>
          <button
            onClick={() => setLastHandoff(null)}
            className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 cursor-pointer"
            title="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
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

        {friendlyError && (
          <FriendlyServiceErrorCard
            error={friendlyError}
            onRetry={() => {
              const q = friendlyError.lastQuery || lastSubmittedQuery;
              setFriendlyError(null);
              if (q) send(q);
            }}
            onDismiss={() => setFriendlyError(null)}
          />
        )}

        {scopeError && (
          <ScopeErrorCard error={scopeError} onDismiss={() => setScopeError(null)} />
        )}
      </div>

      <Separator />

      <div className="p-3 sm:p-4 bg-card/60 backdrop-blur-md border-t">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Guest Message Limit Inline Notice */}
          {guestMessageLimitReached && (
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-violet-900 dark:text-violet-200 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                <span className="font-medium leading-relaxed">
                  {guestNoticeText || "Mentor: Create a free account to continue this conversation."}
                </span>
              </div>
              <Link href="/login" className="shrink-0 w-full sm:w-auto">
                <Button size="sm" className="w-full sm:w-auto h-7 px-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold shadow-xs">
                  <Sparkles className="h-3 w-3 mr-1" /> Sign in with Google
                </Button>
              </Link>
            </div>
          )}

          {/* Integrated prompt card */}
          <div className="relative rounded-2xl border border-border/80 bg-background/90 shadow-xs transition-all focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/15">
            {/* Expanding Textarea */}
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isAuto
                  ? "Ask anything — orchestrator will route to the right specialist…"
                  : `Ask ${mentor?.config.shortName}…`
              }
              rows={2}
              className="min-h-[56px] max-h-[160px] resize-none border-0 shadow-none bg-transparent px-3.5 pt-3 pb-2 text-sm focus-visible:ring-0 placeholder:text-muted-foreground/60"
              disabled={isStreaming}
            />

            {/* Bottom Toolbar inside the prompt box */}
            <div className="flex items-center justify-between px-3 pb-2.5 pt-1 border-t border-border/30">
              {/* Left: Model Selector (claude, gpt, gemini style) */}
              <div className="flex items-center gap-2">
                <ModelSelector
                  placement="top"
                  currentModelId={selectedLlm.id}
                  onModelSelect={(m) => setSelectedLlm(m)}
                />
              </div>

              {/* Right: Character count & Send button */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground/70 font-mono">
                  {input.length}/4000
                </span>
                <Button
                  onClick={() => send()}
                  disabled={!input.trim() || isStreaming}
                  className="h-8 w-8 rounded-xl text-white transition-transform active:scale-95 shrink-0"
                  style={{ background: headerColor }}
                  size="icon"
                  title="Send message (Enter)"
                >
                  {isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground flex-wrap gap-1.5">
            <p>
              {isAuto
                ? "Auto Orchestrator routes questions across mentors."
                : `Direct chat with ${mentor?.config.name}.`}{" "}
              Press <kbd className="rounded border px-1 text-[10px] bg-muted/60">Enter</kbd> to send, <kbd className="rounded border px-1 text-[10px] bg-muted/60">Shift+Enter</kbd> for newline.
            </p>
            {isMock && (
              <Badge
                variant="outline"
                className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/20"
              >
                Mock Mode
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Guest conversation limit reached modal */}
      {guestLimitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-violet-500/40 bg-card shadow-2xl p-6 text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-violet-600/15 border border-violet-500/30 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-heading text-base font-bold text-foreground">
                Conversation Limit Reached
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You have reached the guest sandbox limit of 3 conversations. Create a free account to unlock unlimited conversations with your specialist mentors and save your chat history to the cloud.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <Link href="/login" className="w-full">
                <Button className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-xs h-9 shadow-xs">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Sign in with Google
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGuestLimitModalOpen(false)}
                className="rounded-xl text-xs h-8 text-muted-foreground hover:text-foreground"
              >
                Stay in Current Chat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
