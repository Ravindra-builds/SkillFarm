import { redirect } from "next/navigation";
import { auth, isAuthConfigured } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MentorChat } from "@/components/chat/chat";
import { ensureConversation, getMessages } from "@/lib/chat-store";
import { getHandoffs } from "@/lib/handoff-store";
import { isValidMentorId, DEFAULT_MENTOR_ID, type MentorId } from "@/agents/mentors";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ conversationId?: string; mentor?: string }>;
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
  const isMockUser = !configured && !user;

  if (configured && !user) {
    redirect("/login?callbackUrl=/chat");
  }

  const userId = (user?.email as string | undefined) ?? (user as unknown as { id?: string } | undefined)?.id ?? "guest-preview-user";
  const sp = searchParams ? await searchParams : {};
  let conversationId: string | undefined = sp?.conversationId ?? undefined;
  const mentorParam = sp?.mentor as string | undefined;
  const initialMentorId: MentorId | "auto" =
    mentorParam === "auto" || !mentorParam
      ? "auto"
      : isValidMentorId(mentorParam)
        ? (mentorParam as MentorId)
        : "auto";

  let initialMessages: { id: string; role: "user" | "assistant"; content: string; mentorId?: string }[] = [];
  let initialHandoffs: { id: string; fromMentorId: string; toMentorId: string; reason: string | null; createdAt: Date }[] = [];

  try {
    // For auto, don't set activeMentorId yet — orchestrator will decide per message
    const convo = await ensureConversation(userId, conversationId, initialMentorId === "auto" ? undefined : initialMentorId);
    conversationId = convo.id;
    const [msgs, handoffs] = await Promise.all([getMessages(conversationId), getHandoffs(conversationId)]);
    initialMessages = msgs.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      mentorId: m.mentorId ?? undefined,
    }));
    initialHandoffs = handoffs;
  } catch (err) {
    console.error("[chat/page] conversation ensure failed:", err);
    initialMessages = [];
    initialHandoffs = [];
  }

  const userName = user?.name ?? (isMockUser ? "Alex" : null);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={user} authConfigured={configured} isMockUser={isMockUser} />
      <div className="flex flex-1 flex-col min-w-0">
        <Header user={user} authConfigured={configured} />
        <main className="flex-1 bg-background flex flex-col">
          <MentorChat
            initialMessages={initialMessages}
            conversationId={conversationId ?? null}
            userName={userName}
            isMockUser={isMockUser}
            initialMentorId={initialMentorId}
            initialHandoffs={initialHandoffs}
          />
        </main>
      </div>
    </div>
  );
}
