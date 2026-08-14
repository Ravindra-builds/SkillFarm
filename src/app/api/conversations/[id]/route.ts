import { auth } from "@/lib/auth";
import { z } from "zod";
import { deleteConversation, updateConversationTitle } from "@/lib/chat-store";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().min(1).max(100).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await auth().catch(() => null)) as unknown as {
      user?: { email?: string; id?: string };
    } | null;
    const userId =
      session?.user?.email ?? session?.user?.id ?? "guest-preview-user";
    const { id } = await params;
    const json = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }
    if (parsed.data.title !== undefined) {
      await updateConversationTitle(id, parsed.data.title, userId);
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/conversations/[id]] PATCH failed:", err);
    return Response.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await auth().catch(() => null)) as unknown as {
      user?: { email?: string; id?: string };
    } | null;
    const userId =
      session?.user?.email ?? session?.user?.id ?? "guest-preview-user";
    const { id } = await params;
    await deleteConversation(id, userId);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[api/conversations/[id]] DELETE failed:", err);
    return Response.json({ error: "Delete failed" }, { status: 500 });
  }
}
