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
          <span className="flex-1">{t.message}</span>
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
      className="h-2 w-2 rounded-full shrink-0 mt-0.5"
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
}: {
  conv: Conversation;
  isActive: boolean;
  onPin: (id: string) => void;
  onDelete: (id: string, title: string) => void;
  onRename: (id: string, newTitle: string) => void;
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
        "group relative flex flex-col gap-0.5 rounded-lg px-3 py-2.5 text-sm transition-colors cursor-pointer select-none",
        isActive
          ? "bg-primary/10 text-foreground"
          : "hover:bg-accent text-muted-foreground hover:text-foreground"
      )}
      onClick={(e) => editing && e.preventDefault()}
    >
      <div className="flex items-start gap-2">
        {mentorDot(conv.activeMentorId)}
        <div className="flex-1 min-w-0">
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
            <p className="truncate text-xs font-medium leading-snug">{displayTitle}</p>
          )}
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{relDate}</p>
        </div>
        {conv.pinned && (
          <Pin className="h-3 w-3 text-violet-400 shrink-0 mt-0.5" />
        )}
      </div>

      {/* Action buttons — appear on hover */}
      {!editing && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-card/80 backdrop-blur-sm rounded-md border border-border/60 p-0.5 shadow-sm">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEdit(e); }}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors hover:bg-accent"
            title="Rename"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPin(conv.id); }}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-violet-400 transition-colors hover:bg-accent"
            title={conv.pinned ? "Unpin" : "Pin"}
          >
            {conv.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(conv.id, displayTitle);
            }}
            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-red-400 transition-colors hover:bg-accent"
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
};

export function ConversationHistory({ activeConversationId }: ConversationHistoryProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);

  // Pin state lives in localStorage — it's a UI preference, not server data
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem("skillfarm:pinned");
      if (stored) setPinnedIds(new Set(JSON.parse(stored) as string[]));
    } catch {}
  }, []);

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

  async function fetchConversations() {
    try {
      const res = await fetch("/api/conversations", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    fetchConversations();
  }, [activeConversationId]); // refetch when active changes (new message → new convo title update)

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
        // Also remove from pins
        const next = new Set(pinnedIds);
        next.delete(id);
        savePins(next);
        addToast(`"${title.slice(0, 40)}" deleted`, "success");
        // Navigate away if this was the active conversation
        if (id === activeConversationId) router.push("/chat");
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

  function handleNewChat() {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
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

      {/* Toast notifications */}
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Panel */}
      <div
        className={cn(
          "flex flex-col border-r bg-card/40 transition-all duration-300 shrink-0",
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
                className="h-7 w-7"
                onClick={handleNewChat}
                title="New chat"
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
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
              className="h-8 w-8"
              onClick={handleNewChat}
              title="New chat"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
            {sorted.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                href={`/chat?conversationId=${c.id}`}
                title={c.title ?? "Conversation"}
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                  c.id === activeConversationId
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        ) : (
          /* Expanded state — full list */
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-0.5">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-8 px-3 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-xs text-muted-foreground">No conversations yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs h-7"
                  onClick={handleNewChat}
                >
                  Start one
                </Button>
              </div>
            ) : (
              <>
                {pinned.length > 0 && (
                  <>
                    <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold tracking-widest text-muted-foreground/50 uppercase flex items-center gap-1">
                      <Pin className="h-2.5 w-2.5" /> Pinned
                    </p>
                    {pinned.map((c) => (
                      <ConvRow
                        key={c.id}
                        conv={c}
                        isActive={c.id === activeConversationId}
                        onPin={handlePin}
                        onDelete={handleDeleteRequest}
                        onRename={handleRename}
                      />
                    ))}
                    {recent.length > 0 && (
                      <p className="px-3 pt-2 pb-0.5 text-[10px] font-semibold tracking-widest text-muted-foreground/50 uppercase">
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
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* New chat button at bottom when expanded */}
        {!collapsed && (
          <div className="border-t p-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8 gap-1.5"
              onClick={handleNewChat}
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              New chat
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
