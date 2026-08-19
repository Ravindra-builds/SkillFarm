import { auth } from "@/lib/auth";
import { z } from "zod";
import { deleteConversation, updateConversationTitle } from "@/lib/chat-store";
import { createSafeErrorResponse } from "@/lib/friendly-errors";

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
    return createSafeErrorResponse(err, { endpoint: "api/conversations/[id] [PATCH]" });
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
    return createSafeErrorResponse(err, { endpoint: "api/conversations/[id] [DELETE]" });
  }
}
