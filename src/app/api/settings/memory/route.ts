import { z } from "zod";
import { auth } from "@/lib/auth";
import { getMemories, addMemory } from "@/lib/memory/mem0";

export const dynamic = "force-dynamic";

const addSchema = z.object({
  text: z.string().min(3).max(500),
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
    console.error("[api/settings/memory GET] error:", err);
    return new Response(JSON.stringify({ error: "Failed to load memories" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
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
    console.error("[api/settings/memory POST] error:", err);
    return new Response(JSON.stringify({ error: "Failed to add memory" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
