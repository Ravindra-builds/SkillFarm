import { auth } from "@/lib/auth";
import { getConversations, createConversation, getEmptyConversation } from "@/lib/chat-store";
import { isGuestSession, checkGuestQuota, recordGuestAction } from "@/lib/guest";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().max(100).optional(),
  mentorId: z.string().optional(),
});

export async function GET() {
  try {
    const session = (await auth().catch(() => null)) as unknown as {
      user?: { email?: string; id?: string };
    } | null;

    // Return 401 if there is no session at all (not even a guest session).
    // Guest users carry a session cookie and will have a userId from getGuestUserId().
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId =
      session?.user?.email ?? session?.user?.id ?? "guest-preview-user";
    const convs = await getConversations(userId);
    return Response.json({ conversations: convs });
  } catch (err) {
    console.error("[api/conversations] GET failed:", err);
    return Response.json({ conversations: [] });
  }
}

export async function POST(req: Request) {
  try {
    const session = (await auth().catch(() => null)) as unknown as {
      user?: { email?: string; id?: string };
    } | null;
    const userId =
      session?.user?.email ?? session?.user?.id ?? "guest-preview-user";

    const isGuest = isGuestSession(userId);

    const json = await req.json().catch(() => ({}));
    const parsed = createSchema.safeParse(json);
    const mentorId = (parsed.success ? parsed.data.mentorId : undefined) ?? "backend";
    const title = (parsed.success ? parsed.data.title : undefined) ?? "New conversation";

    // If an empty conversation already exists, return it with alreadyExists: true
    const empty = await getEmptyConversation(userId);
    if (empty) {
      return Response.json(
        { conversation: empty, alreadyExists: true },
        { status: 200 }
      );
    }

    // ── Guest Mode Quota Enforcement (Max 3 Conversations) ───────────────────
    if (isGuest) {
      const quota = await checkGuestQuota(userId, "conversation");
      if (!quota.allowed) {
        return Response.json(
          {
            error: "Guest conversation limit reached",
            message:
              "You have reached the limit of 3 conversations in guest sandbox mode. Create a free account to start unlimited conversations and save your mentor chat history.",
            isGuestLimitReached: true,
            conversionNotice: quota.conversionNotice,
          },
          { status: 403 }
        );
      }
    }

    const conv = await createConversation(userId, title, mentorId);
    if (isGuest) {
      await recordGuestAction(userId, "conversation");
    }

    return Response.json(
      { conversation: conv, alreadyExists: false },
      { status: 201 }
    );
  } catch (err) {
    console.error("[api/conversations] POST failed:", err);
    return Response.json({ error: "Failed to create conversation" }, { status: 500 });
  }
}
