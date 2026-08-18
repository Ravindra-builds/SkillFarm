"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquarePlus,
  Pin,
  PinOff,
  Trash2,
  Pencil,
  Check,
  X,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Lock,
} from "lucide-react";

type Conversation = {
  id: string;
  title: string | null;
  activeMentorId: string | null;
  updatedAt: Date | string;
  pinned?: boolean; // client-side only (localStorage)
};

type ToastItem = {
  id: string;
  message: string;
  type: "success" | "error" | "info";
};

// ──────────────────────────────────────────────────────────────────────────────
// Tiny inline toast system — no external dep needed
// ──────────────────────────────────────────────────────────────────────────────
function Toast({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-sm animate-in slide-in-from-bottom-3 duration-300",
            t.type === "success" && "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
            t.type === "error" && "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300",
            t.type === "info" && "bg-card border-border text-foreground"
          )}
        >
          <span className="flex-1 text-xs font-medium">{t.message}</span>
          <button
            onClick={() => onRemove(t.id)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Mentor colour map
// ──────────────────────────────────────────────────────────────────────────────
const mentorColors: Record<string, string> = {
  backend: "#4F9CF9",
  "ai-engineer": "#7C5CFC",
  frontend: "#F97316",
  devops: "#10B981",
  security: "#EF4444",
  "system-design": "#F59E0B",
};

function mentorDot(mentorId: string | null) {
  const color = mentorId ? (mentorColors[mentorId] ?? "#7C5CFC") : "#7C5CFC";
  return (
    <span
      className="h-2 w-2 rounded-full shrink-0 mt-1"
      style={{ background: color }}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Conversation row
// ──────────────────────────────────────────────────────────────────────────────
function ConvRow({
  conv,
  isActive,
  onPin,
  onDelete,
  onRename,
  onSelect,
}: {
  conv: Conversation;
  isActive: boolean;
  onPin: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onSelect?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conv.title ?? "Untitled");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDraft(conv.title ?? "Untitled");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== conv.title) onRename(conv.id, trimmed);
    setEditing(false);
  }

  function cancelEdit() {
    setDraft(conv.title ?? "Untitled");
    setEditing(false);
  }

  const displayTitle = conv.title ?? "New conversation";
  const date = new Date(conv.updatedAt);
  const relDate = formatRelative(date);

  return (
    <Link
      href={`/chat?conversationId=${conv.id}`}
      className={cn(
        "group relative flex flex-col gap-0.5 rounded-lg px-2.5 py-2 text-sm transition-colors cursor-pointer select-none",
        isActive
          ? "bg-primary/10 text-foreground font-medium"
          : "hover:bg-accent text-muted-foreground hover:text-foreground"
      )}
      onClick={(e) => {
        if (editing) {
          e.preventDefault();
        } else if (onSelect) {
          onSelect();
        }
      }}
    >
      <div className="flex items-start gap-2">
        {mentorDot(conv.activeMentorId)}
        <div className="flex-1 min-w-0 pr-6 group-hover:pr-14 transition-all">
          {editing ? (
            <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
              <Input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit();
                  if (e.key === "Escape") cancelEdit();
                }}
                className="h-6 text-xs px-1.5 py-0 rounded-md border-primary/50 focus-visible:ring-1"
                maxLength={100}
              />
              <button
                onClick={(e) => { e.preventDefault(); commitEdit(); }}
                className="text-emerald-500 hover:text-emerald-400 transition-colors"
                aria-label="Save"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => { e.preventDefault(); cancelEdit(); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <p className="truncate text-xs leading-snug">{displayTitle}</p>
          )}
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{relDate}</p>
        </div>
        {conv.pinned && !editing && (
          <Pin className="h-3 w-3 text-violet-400 shrink-0 mt-0.5 group-hover:hidden" />
        )}
      </div>

      {/* Action buttons — appear on hover */}
      {!editing && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-card/90 backdrop-blur-sm rounded-md border border-border/60 p-0.5 shadow-sm">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEdit(e); }}
            className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors hover:bg-accent"
            title="Rename"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPin(conv.id); }}
            className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-violet-400 transition-colors hover:bg-accent"
            title={conv.pinned ? "Unpin" : "Pin"}
          >
            {conv.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3 text-muted-foreground" />}
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(conv.id, displayTitle);
            }}
            className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-red-400 transition-colors hover:bg-accent"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </Link>
  );
}

function formatRelative(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ──────────────────────────────────────────────────────────────────────────────
// Main ConversationHistory panel
// ──────────────────────────────────────────────────────────────────────────────
export type ConversationHistoryProps = {
  activeConversationId?: string | null;
  initialConversations?: Conversation[];
  onSelect?: () => void;
};

export function ConversationHistory({
  activeConversationId,
  initialConversations,
  onSelect,
}: ConversationHistoryProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>(
    initialConversations ?? []
  );
  const [loading, setLoading] = useState(!initialConversations);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [guestLimitModalOpen, setGuestLimitModalOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);

  // Pin state lives in localStorage — initialized with lazy initializer function to avoid cascading renders
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("skillfarm:pinned");
      if (stored) return new Set(JSON.parse(stored) as string[]);
    } catch {}
    return new Set();
  });

  function savePins(pins: Set<string>) {
    setPinnedIds(pins);
    try {
      localStorage.setItem("skillfarm:pinned", JSON.stringify([...pins]));
    } catch {}
  }

  const addToast = useCallback((message: string, type: ToastItem["type"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const res = await fetch("/api/conversations", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setConversations(data.conversations ?? []);
          }
        }
      } catch {}
      if (!ignore) {
        setLoading(false);
      }
    }

    load();

    const handleUpdate = () => {
      load();
    };
    window.addEventListener("skillfarm:conversation-updated", handleUpdate);

    return () => {
      ignore = true;
      window.removeEventListener("skillfarm:conversation-updated", handleUpdate);
    };
  }, [activeConversationId]);

  function handlePin(id: string) {
    const next = new Set(pinnedIds);
    const wasPinned = next.has(id);
    if (wasPinned) {
      next.delete(id);
      addToast("Conversation unpinned", "info");
    } else {
      next.add(id);
      addToast("Conversation pinned ✓", "success");
    }
    savePins(next);
  }

  function handleDeleteRequest(id: string, title: string) {
    setPendingDelete({ id, title });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const { id, title } = pendingDelete;
    setPendingDelete(null);
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        const next = new Set(pinnedIds);
        next.delete(id);
        savePins(next);
        addToast(`"${title.slice(0, 30)}" deleted`, "success");
        if (id === activeConversationId) {
          router.push("/chat?new=true");
        }
      } else {
        addToast("Failed to delete conversation", "error");
      }
    } catch {
      addToast("Failed to delete conversation", "error");
    }
  }

  async function handleRename(id: string, newTitle: string) {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
        );
        addToast("Renamed ✓", "success");
      } else {
        addToast("Failed to rename conversation", "error");
      }
    } catch {
      addToast("Failed to rename conversation", "error");
    }
  }

  async function handleNewChat() {
    if (isCreatingNew) return;
    setIsCreatingNew(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New conversation", mentorId: "backend" }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 403 || data?.isGuestLimitReached) {
        setGuestLimitModalOpen(true);
        addToast("Guest limit reached: Max 3 conversations in demo mode", "info");
        return;
      }

      if (res.ok && data?.conversation?.id) {
        if (data.alreadyExists) {
          addToast("You already have an empty chat — switched to it", "info");
        } else {
          addToast("New chat started ✨", "success");
        }
        await fetchConversations();
        if (onSelect) onSelect();
        router.push(`/chat?conversationId=${data.conversation.id}`);
        return;
      }
    } catch (err) {
      console.error("[conversation-history] Create new chat error:", err);
    } finally {
      setIsCreatingNew(false);
    }

    if (onSelect) onSelect();
    router.push("/chat");
  }

  // Sort: pinned first, then by updatedAt desc
  const sorted = [...conversations]
    .map((c) => ({ ...c, pinned: pinnedIds.has(c.id) }))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const pinned = sorted.filter((c) => c.pinned);
  const recent = sorted.filter((c) => !c.pinned);

  return (
    <>
      {/* Delete confirmation overlay */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border bg-card shadow-2xl p-6">
            <h3 className="font-semibold text-base">Delete conversation?</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">
                &ldquo;{pendingDelete.title.slice(0, 50)}&rdquo;
              </span>{" "}
              will be permanently deleted. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={confirmDelete}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

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

      {/* Toast notifications */}
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Panel */}
      <div
        className={cn(
          "flex flex-col border-r bg-card/40 transition-all duration-300 shrink-0 h-full",
          collapsed ? "w-[48px]" : "w-[260px]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-[57px] px-3 border-b shrink-0">
          {!collapsed && (
            <span className="text-xs font-semibold tracking-widest text-muted-foreground/70 uppercase">
              Conversations
            </span>
          )}
          <div className="flex items-center gap-1 ml-auto">
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                onClick={handleNewChat}
                disabled={isCreatingNew}
                title="New chat"
              >
                {isCreatingNew ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MessageSquarePlus className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Collapsed state — show icons only */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5 pt-3 px-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
              onClick={handleNewChat}
              disabled={isCreatingNew}
              title="New chat"
            >
              {isCreatingNew ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquarePlus className="h-4 w-4" />
              )}
            </Button>
            {sorted.slice(0, 8).map((c) => (
              <Link
                key={c.id}
                href={`/chat?conversationId=${c.id}`}
                title={c.title ?? "Conversation"}
                onClick={onSelect}
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center transition-colors relative group",
                  c.id === activeConversationId
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {c.pinned && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-violet-500" />
                )}
              </Link>
            ))}
          </div>
        ) : (
          /* Expanded state — full list */
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5 scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-8 px-3 text-center">
                <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                  <MessageSquare className="h-5 w-5 opacity-60" />
                </div>
                <p className="text-xs font-medium text-foreground">No conversations yet</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Start chatting with your AI mentor team.</p>
                <Button
                  size="sm"
                  className="mt-3 text-xs h-7 gap-1.5 bg-primary/90 hover:bg-primary"
                  onClick={handleNewChat}
                  disabled={isCreatingNew}
                >
                  <Sparkles className="h-3 w-3" />
                  New Chat
                </Button>
              </div>
            ) : (
              <>
                {pinned.length > 0 && (
                  <>
                    <p className="px-2.5 pt-1 pb-0.5 text-[10px] font-semibold tracking-widest text-muted-foreground/50 uppercase flex items-center gap-1">
                      <Pin className="h-2.5 w-2.5 text-violet-400" /> Pinned
                    </p>
                    {pinned.map((c) => (
                      <ConvRow
                        key={c.id}
                        conv={c}
                        isActive={c.id === activeConversationId}
                        onPin={handlePin}
                        onDelete={handleDeleteRequest}
                        onRename={handleRename}
                        onSelect={onSelect}
                      />
                    ))}
                    {recent.length > 0 && (
                      <p className="px-2.5 pt-2 pb-0.5 text-[10px] font-semibold tracking-widest text-muted-foreground/50 uppercase">
                        Recent
                      </p>
                    )}
                  </>
                )}
                {recent.map((c) => (
                  <ConvRow
                    key={c.id}
                    conv={c}
                    isActive={c.id === activeConversationId}
                    onPin={handlePin}
                    onDelete={handleDeleteRequest}
                    onRename={handleRename}
                    onSelect={onSelect}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* New chat button at bottom when expanded */}
        {!collapsed && (
          <div className="border-t p-2 shrink-0 bg-card/20">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8 gap-1.5 bg-background/50 hover:bg-accent border-border/60 font-medium"
              onClick={handleNewChat}
              disabled={isCreatingNew}
            >
              {isCreatingNew ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <MessageSquarePlus className="h-3.5 w-3.5 text-primary" />
                  New chat
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
