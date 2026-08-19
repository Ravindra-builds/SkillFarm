import { z } from "zod";
import { auth } from "@/lib/auth";
import { updateNodeStatus, updateNodeDetails, getRoadmap } from "@/lib/roadmap-store";
import { scheduleRoadmapResearch } from "@/agents/research/roadmap-research-scheduler";
import { createSafeErrorResponse } from "@/lib/friendly-errors";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  nodeId: z.string().min(1),
  status: z.enum(["locked", "current", "completed", "next"]).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  practicalTask: z.string().optional(),
  projectBrief: z.string().optional(),
  estimatedHours: z.number().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
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

    const { nodeId, status, title, description, practicalTask, projectBrief, estimatedHours, difficulty } = parsed.data;

    let updated = null;

    // If editing metadata
    if (title !== undefined || description !== undefined || practicalTask !== undefined || projectBrief !== undefined || estimatedHours !== undefined || difficulty !== undefined) {
      updated = await updateNodeDetails(userId, nodeId, {
        title,
        description,
        practicalTask,
        projectBrief,
        estimatedHours,
        difficulty,
        status,
      });
    } else if (status) {
      // Just updating status
      updated = await updateNodeStatus(userId, nodeId, status);
    }

    if (!updated) {
      const existing = await getRoadmap(userId);
      return new Response(JSON.stringify(existing ?? { error: "Roadmap node not found" }), {
        status: existing ? 200 : 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (updated) {
      scheduleRoadmapResearch(updated).catch(() => {});
    }

    return new Response(JSON.stringify(updated), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return createSafeErrorResponse(err, { endpoint: "api/roadmap/progress" });
  }
}
