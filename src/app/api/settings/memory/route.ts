import { z } from "zod";
import { auth } from "@/lib/auth";
import { getMemories, addMemory, deleteMemory } from "@/lib/memory/mem0";
import { createSafeErrorResponse } from "@/lib/friendly-errors";

export const dynamic = "force-dynamic";

const addSchema = z.object({
  text: z.string().min(3).max(1000),
  category: z.string().optional(),
});

export async function GET() {
  try {
    const session = (await (auth as unknown as () => Promise<unknown>)().catch(() => null)) as unknown as { user?: { email?: string; id?: string } } | null;
    const userId = session?.user?.email ?? (session?.user as unknown as { id?: string })?.id ?? "guest-preview-user";

    const memories = await getMemories(userId);
    return new Response(JSON.stringify({ memories }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return createSafeErrorResponse(err, { endpoint: "api/settings/memory [GET]" });
  }
}

export async function POST(req: Request) {
  try {
    const session = (await (auth as unknown as () => Promise<unknown>)().catch(() => null)) as unknown as { user?: { email?: string; id?: string } } | null;
    const userId = session?.user?.email ?? (session?.user as unknown as { id?: string })?.id ?? "guest-preview-user";

    const json = await req.json().catch(() => ({}));
    const parsed = addSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid payload", details: parsed.error.flatten() }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { text, category } = parsed.data;
    const result = await addMemory(userId, text, category || "custom");

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return createSafeErrorResponse(err, { endpoint: "api/settings/memory [POST]" });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = (await (auth as unknown as () => Promise<unknown>)().catch(() => null)) as unknown as { user?: { email?: string; id?: string } } | null;
    const userId = session?.user?.email ?? (session?.user as unknown as { id?: string })?.id ?? "guest-preview-user";

    const { searchParams } = new URL(req.url);
    const memoryId = searchParams.get("id");

    if (!memoryId) {
      return new Response(JSON.stringify({ error: "Missing memory ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await deleteMemory(userId, memoryId);
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return createSafeErrorResponse(err, { endpoint: "api/settings/memory [DELETE]" });
  }
}
