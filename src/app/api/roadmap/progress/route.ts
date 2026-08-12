import { z } from "zod";
import { auth } from "@/lib/auth";
import { updateNodeStatus, getRoadmap } from "@/lib/roadmap-store";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  nodeId: z.string().min(1),
  status: z.enum(["locked", "current", "completed", "next"]).optional().default("completed"),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.email ?? (session?.user as unknown as { id?: string })?.id ?? "guest-preview-user";

    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid payload", details: parsed.error.flatten() }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { nodeId, status } = parsed.data;
    const updated = await updateNodeStatus(userId, nodeId, status);
    if (!updated) {
      const existing = await getRoadmap(userId);
      return new Response(JSON.stringify(existing ?? { error: "Roadmap node not found" }), {
        status: existing ? 200 : 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(updated), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[api/roadmap/progress] error:", err);
    return new Response(JSON.stringify({ error: "Failed to update node progress" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
