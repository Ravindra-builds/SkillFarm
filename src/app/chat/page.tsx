import { redirect } from "next/navigation";
import { auth, isAuthConfigured } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MentorChat } from "@/components/chat/chat";
import { ConversationHistory } from "@/components/chat/conversation-history";
import { ensureConversation, getMessages, createConversation, getConversations } from "@/lib/chat-store";
import { getHandoffs } from "@/lib/handoff-store";
import { isValidMentorId, DEFAULT_MENTOR_ID, type MentorId } from "@/agents/mentors";
import { isGuestSession } from "@/lib/guest";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ conversationId?: string; mentor?: string; new?: string }>;
};

export default async function ChatPage({ searchParams }: Props) {
  let session: unknown = null;
  try {
    session = await (auth as unknown as () => Promise<unknown>)();
  } catch (err) {
    console.error("[chat/page] auth() failed:", err);
    session = null;
  }
  const configured = (() => {
    try {
      return isAuthConfigured();
    } catch {
      return false;
    }
  })();

  const user = (session as unknown as { user?: { name?: string | null; email?: string | null; image?: string | null } } | null)?.user ?? null;

  if (!user) {
    redirect("/login?callbackUrl=/chat");
  }

  const userId = user.email ?? (user as unknown as { id?: string }).id ?? "guest";
  const isGuest = isGuestSession(userId);
  const sp = searchParams ? await searchParams : {};
  let conversationId: string | undefined = sp?.conversationId ?? undefined;
  const isNew = sp?.new === "true" || sp?.new === "1";
  const mentorParam = sp?.mentor as string | undefined;
  const initialMentorId: MentorId | "auto" =
    mentorParam === "auto" || !mentorParam
      ? "auto"
      : isValidMentorId(mentorParam)
        ? (mentorParam as MentorId)
        : "auto";

  let initialMessages: { id: string; role: "user" | "assistant"; content: string; mentorId?: string }[] = [];
  let initialHandoffs: { id: string; fromMentorId: string; toMentorId: string; reason: string | null; createdAt: Date }[] = [];
  let initialConversations: { id: string; title: string | null; activeMentorId: string | null; updatedAt: Date }[] = [];

  try {
    let convo;
    if (isGuest && !conversationId && !isNew) {
      // For guest users, reuse their active conversation so we don't accidentally exceed the 3-convo limit
      const existingConvs = await getConversations(userId);
      if (existingConvs.length > 0) {
        convo = existingConvs[0];
      }
    }

    if (!convo) {
      if (isNew && !conversationId) {
        convo = await createConversation(userId, undefined, initialMentorId === "auto" ? undefined : initialMentorId);
      } else {
        convo = await ensureConversation(userId, conversationId, initialMentorId === "auto" ? undefined : initialMentorId);
      }
    }
    conversationId = convo.id;
    const [msgs, handoffs, convs] = await Promise.all([
      getMessages(conversationId),
      getHandoffs(conversationId),
      getConversations(userId),
    ]);
    initialMessages = msgs.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      mentorId: m.mentorId ?? undefined,
    }));
    initialHandoffs = handoffs;
    initialConversations = convs.map((c) => ({
      id: c.id,
      title: c.title,
      activeMentorId: c.activeMentorId,
      updatedAt: c.updatedAt,
    }));
  } catch (err) {
    console.error("[chat/page] conversation ensure failed:", err);
    initialMessages = [];
    initialHandoffs = [];
    initialConversations = [];
  }

  const userName = user?.name ?? null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* App sidebar — navigation */}
      <Sidebar user={user} authConfigured={configured} isMockUser={false} />

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0">
        <Header user={user} authConfigured={configured} />

        <main className="flex-1 min-h-0 flex overflow-hidden">
          {/* Conversation history panel — only shown on md+ */}
          <div className="hidden md:flex shrink-0">
            <ConversationHistory
              activeConversationId={conversationId ?? null}
              initialConversations={initialConversations}
            />
          </div>

          {/* Chat interface */}
          <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
            <MentorChat
              key={conversationId ?? "new"}
              initialMessages={initialMessages}
              conversationId={conversationId ?? null}
              userName={userName}
              isMockUser={false}
              initialMentorId={initialMentorId}
              initialHandoffs={initialHandoffs}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
