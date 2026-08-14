import { auth } from "@/lib/auth";
import { getConversations } from "@/lib/chat-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = (await auth().catch(() => null)) as unknown as {
      user?: { email?: string; id?: string };
    } | null;
    const userId =
      session?.user?.email ?? session?.user?.id ?? "guest-preview-user";
    const convs = await getConversations(userId);
    return Response.json({ conversations: convs });
  } catch (err) {
    console.error("[api/conversations] GET failed:", err);
    return Response.json({ conversations: [] });
  }
}
